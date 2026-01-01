// Условный импорт expo-sqlite с обработкой ошибок
let SQLite = null;
try {
  SQLite = require('expo-sqlite');
} catch (error) {
  // expo-sqlite недоступен в Expo Go - это нормально, SQLite функции будут отключены
  // Не показываем предупреждение, так как это ожидаемое поведение в режиме разработки
  if (__DEV__) {
    // Логируем только в DEV режиме для отладки
    console.log('ℹ️ expo-sqlite not available (normal in Expo Go), SQLite features disabled');
  }
}

const DB_NAME = 'chat_cache.db';

const TABLES = {
  messages: 'chat_messages',
  roomState: 'chat_room_state',
};

const isAsyncDb = (db) =>
  !!db &&
  (typeof db.getAllAsync === 'function' ||
    typeof db.execAsync === 'function' ||
    typeof db.runAsync === 'function');

let _dbPromise = null;
let _sqliteAvailable = false;

async function openDb() {
  if (!SQLite) {
    throw new Error('SQLite is not available. Please rebuild the app with development build.');
  }
  
  if (_dbPromise) return _dbPromise;
  
  _dbPromise = (async () => {
    try {
      if (typeof SQLite.openDatabaseAsync === 'function') {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        _sqliteAvailable = true;
        return db;
      }
      // Legacy API (transaction callbacks)
      if (typeof SQLite.openDatabase === 'function') {
        const db = SQLite.openDatabase(DB_NAME);
        _sqliteAvailable = true;
        return db;
      }
      throw new Error('SQLite API not available');
    } catch (error) {
      _sqliteAvailable = false;
      console.error('Failed to open SQLite database:', error);
      throw error;
    }
  })();
  return _dbPromise;
}

function execLegacy(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          sql,
          params,
          (_, result) => resolve(result),
          (_, err) => {
            reject(err);
            return false;
          }
        );
      },
      (err) => reject(err)
    );
  });
}

async function exec(db, sql, params = []) {
  if (isAsyncDb(db)) {
    if (typeof db.runAsync === 'function') {
      // runAsync returns { lastInsertRowId, changes }
      return await db.runAsync(sql, params);
    }
    if (typeof db.execAsync === 'function') {
      // execAsync doesn't support params; fallback to string interpolation not safe
      // so we use legacy path if no runAsync exists
      throw new Error('expo-sqlite async db without runAsync is not supported for parameterized queries');
    }
  }
  return await execLegacy(db, sql, params);
}

async function getAll(db, sql, params = []) {
  if (isAsyncDb(db) && typeof db.getAllAsync === 'function') {
    return await db.getAllAsync(sql, params);
  }
  const res = await execLegacy(db, sql, params);
  // res.rows.item(i)
  const out = [];
  const len = res?.rows?.length ?? 0;
  for (let i = 0; i < len; i++) out.push(res.rows.item(i));
  return out;
}

async function withTransaction(db, fn) {
  if (isAsyncDb(db) && typeof db.withTransactionAsync === 'function') {
    return await db.withTransactionAsync(fn);
  }
  // Legacy transaction
  return await new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        Promise.resolve(fn(tx))
          .then(resolve)
          .catch(reject);
      },
      (err) => reject(err)
    );
  });
}

async function execTx(tx, sql, params = []) {
  if (!tx) {
    const db = await openDb();
    return await exec(db, sql, params);
  }
  // Async transaction uses same db methods; easiest: if tx has executeSql -> legacy
  if (typeof tx.executeSql === 'function') {
    return await new Promise((resolve, reject) => {
      tx.executeSql(
        sql,
        params,
        (_, result) => resolve(result),
        (_, err) => {
          reject(err);
          return false;
        }
      );
    });
  }
  // Async transaction object (Expo SDK 52) uses same runAsync on tx in some versions
  if (typeof tx.runAsync === 'function') {
    return await tx.runAsync(sql, params);
  }
  throw new Error('Unknown transaction object for expo-sqlite');
}

function safeMs(iso) {
  if (!iso) return Date.now();
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}

export const chatMessagesDb = {
  async initialize() {
    if (!SQLite) {
      // SQLite недоступен в Expo Go - это нормально, кэш сообщений просто не будет работать
      // Предупреждение скрыто, так как это ожидаемое поведение в режиме разработки
      if (__DEV__) {
        // Логируем только в DEV режиме для отладки, но не показываем как warning
        console.log('ℹ️ SQLite not available (normal in Expo Go), chat cache disabled');
      }
      return;
    }
    
    try {
      const db = await openDb();

      // Create tables
      await exec(db, `CREATE TABLE IF NOT EXISTS ${TABLES.messages} (
        message_id TEXT PRIMARY KEY NOT NULL,
        room_id TEXT NOT NULL,
        created_at_ms INTEGER NOT NULL,
        created_at TEXT,
        json TEXT NOT NULL,
        updated_at_ms INTEGER NOT NULL
      );`);

      await exec(db, `CREATE INDEX IF NOT EXISTS idx_${TABLES.messages}_room_created
        ON ${TABLES.messages}(room_id, created_at_ms DESC);`);

      await exec(db, `CREATE TABLE IF NOT EXISTS ${TABLES.roomState} (
        room_id TEXT PRIMARY KEY NOT NULL,
        cached_at_ms INTEGER NOT NULL
      );`);
    } catch (error) {
      console.error('❌ Failed to initialize SQLite database:', error);
      // Не бросаем ошибку, чтобы приложение могло работать без SQLite
    }
  },

  async getRoomState(roomId) {
    if (!roomId) return null;
    const db = await openDb();
    const rows = await getAll(db, `SELECT room_id, cached_at_ms FROM ${TABLES.roomState} WHERE room_id = ? LIMIT 1;`, [String(roomId)]);
    return rows?.[0] || null;
  },

  async setRoomCachedAt(roomId, cachedAtMs) {
    if (!roomId) return;
    const db = await openDb();
    const now = cachedAtMs || Date.now();
    await exec(
      db,
      `INSERT INTO ${TABLES.roomState}(room_id, cached_at_ms)
       VALUES(?, ?)
       ON CONFLICT(room_id) DO UPDATE SET cached_at_ms=excluded.cached_at_ms;`,
      [String(roomId), now]
    );
  },

  async saveRoomMessages(roomId, messages, maxMessages = 5000) {
    if (!roomId || !Array.isArray(messages)) return;
    const db = await openDb();
    const rid = String(roomId);
    const now = Date.now();

    await withTransaction(db, async (tx) => {
      // Upsert messages
      for (const msg of messages) {
        const messageId = msg?.id;
        if (!messageId) continue;
        const createdAt = msg?.createdAt || null;
        const createdAtMs = safeMs(createdAt);
        let json;
        try {
          json = JSON.stringify(msg);
        } catch {
          continue;
        }

        await execTx(
          tx,
          `INSERT INTO ${TABLES.messages}(message_id, room_id, created_at_ms, created_at, json, updated_at_ms)
           VALUES(?, ?, ?, ?, ?, ?)
           ON CONFLICT(message_id) DO UPDATE SET
             room_id=excluded.room_id,
             created_at_ms=excluded.created_at_ms,
             created_at=excluded.created_at,
             json=excluded.json,
             updated_at_ms=excluded.updated_at_ms;`,
          [String(messageId), rid, createdAtMs, createdAt, json, now]
        );
      }

      await execTx(
        tx,
        `INSERT INTO ${TABLES.roomState}(room_id, cached_at_ms)
         VALUES(?, ?)
         ON CONFLICT(room_id) DO UPDATE SET cached_at_ms=excluded.cached_at_ms;`,
        [rid, now]
      );

      // Trim old messages beyond maxMessages
      if (maxMessages && maxMessages > 0) {
        await execTx(
          tx,
          `DELETE FROM ${TABLES.messages}
           WHERE room_id = ?
             AND message_id NOT IN (
               SELECT message_id FROM ${TABLES.messages}
               WHERE room_id = ?
               ORDER BY created_at_ms DESC
               LIMIT ?
             );`,
          [rid, rid, maxMessages]
        );
      }
    });
  },

  async loadRoomMessages(roomId, limit = 5000) {
    if (!roomId) return { messages: [], cachedAt: null };
    const db = await openDb();
    const rid = String(roomId);

    const rows = await getAll(
      db,
      `SELECT json FROM ${TABLES.messages}
       WHERE room_id = ?
       ORDER BY created_at_ms DESC
       LIMIT ?;`,
      [rid, limit]
    );

    const messages = [];
    for (const row of rows || []) {
      if (!row?.json) continue;
      try {
        messages.push(JSON.parse(row.json));
      } catch {
        // skip corrupted row
      }
    }

    const state = await this.getRoomState(rid);
    return { messages, cachedAt: state?.cached_at_ms || null };
  },

  async deleteMessage(roomId, messageId) {
    if (!roomId || !messageId) return;
    const db = await openDb();
    await exec(db, `DELETE FROM ${TABLES.messages} WHERE room_id = ? AND message_id = ?;`, [String(roomId), String(messageId)]);
  },

  async clearRoom(roomId) {
    if (!roomId) return;
    const db = await openDb();
    const rid = String(roomId);
    await exec(db, `DELETE FROM ${TABLES.messages} WHERE room_id = ?;`, [rid]);
    await exec(db, `DELETE FROM ${TABLES.roomState} WHERE room_id = ?;`, [rid]);
  },

  async cleanupOldMessages(maxAgeDays = 30) {
    const db = await openDb();
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    await exec(db, `DELETE FROM ${TABLES.messages} WHERE created_at_ms < ?;`, [cutoff]);
  },

  async clearAll() {
    const db = await openDb();
    await exec(db, `DELETE FROM ${TABLES.messages};`);
    await exec(db, `DELETE FROM ${TABLES.roomState};`);
  },
};

export default chatMessagesDb;





