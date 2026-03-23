import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ChatApi from '@entities/chat/api/chatApi';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from '@entities/user/api/userApi';
import { chatCacheService } from '../lib/chatCacheService';
import { waitForConnection } from '@shared/api/retryHelper';

const initialState = {
  rooms: {
    ids: [],
    byId: {},
    loading: false,
    error: null,
    page: 1,
    hasMore: true,
  },
  messages: {},
  unreadByRoomId: {},
  // Время последней загрузки комнат - используется для предотвращения дублирования счетчиков
  lastRoomsFetchTime: null,
  typingByRoomId: {}, // { [roomId]: { [userId]: { type: 'text' | 'voice', timestamp: number } } }
  lastActivityTypeByRoomId: {}, // { [roomId]: { [userId]: 'text' | 'voice' } } - последний известный тип активности
  activeRoomId: null,
  avatarFetchAttemptedByRoomId: {},
  participants: {
    byUserId: {},
  },
  connection: {
    isConnected: false,
    transport: null,
    lastConnected: null,
    lastDisconnected: null,
    reconnectAttempts: 0,
  },
  // Список удаленных комнат для предотвращения повторной загрузки
  deletedRoomIds: [],
  // Минутный тик для пересчёта истекших STOP-сообщений в селекторе
  timeTick: 0,
};

const upsertParticipant = (state, participant) => {
  if (!participant) return;
  const userId = participant?.userId ?? participant?.user?.id ?? participant?.id;
  if (!userId) return;

  const user = participant?.user || participant;
  const existing = state.participants.byUserId[userId] || {};

  const updatedUser = {
    ...existing,
    id: userId,
    name: user?.name || user?.profile?.name || user?.firstName || user?.profile?.firstName || user?.companyName || user?.profile?.companyName || existing.name,
    avatar: user?.avatar || user?.image || user?.profile?.avatar || existing.avatar,
    email: user?.email || existing.email,
    role: user?.role || existing.role,
    profile: user?.profile || existing.profile,
    ...user,
  };

  state.participants.byUserId[userId] = updatedUser;
};

const upsertRooms = (state, rooms) => {
  for (const room of rooms) {
    if (Array.isArray(room?.participants)) {
      for (const p of room.participants) {
        upsertParticipant(state, p);
      }
    }

    state.rooms.byId[room.id] = { ...(state.rooms.byId[room.id] || {}), ...room };
    if (!state.rooms.ids.includes(room.id)) state.rooms.ids.push(room.id);
  }

  state.rooms.ids.sort((a, b) => {
    const ra = state.rooms.byId[a];
    const rb = state.rooms.byId[b];
    const ta = (ra?.updatedAt || ra?.lastMessage?.createdAt || 0);
    const tb = (rb?.updatedAt || rb?.lastMessage?.createdAt || 0);
    return new Date(tb) - new Date(ta);
  });
};

const ensureRoomBucket = (state, roomId) => {
  if (!state.messages[roomId]) {
    state.messages[roomId] = {
      ids: [],
      byId: {},
      loading: false,
      error: null,
      cursorId: null,
      hasMore: true,
    };
  }
};

const upsertMessagesDesc = (bucket, messages) => {
  if (!messages || !Array.isArray(messages)) return;
  
  // Дедупликация входных сообщений по ID (только реальные ID, не temporaryId)
  const uniqueMessages = [];
  const seenIds = new Set();
  for (const msg of messages) {
    // Используем только реальный ID, игнорируем временные сообщения без ID
    const msgId = msg?.id;
    if (!msgId) {
      // Пропускаем сообщения без ID (только с temporaryId)
      continue;
    }
    if (seenIds.has(msgId)) continue;
    seenIds.add(msgId);
    uniqueMessages.push(msg);
  }
  
  for (const msg of uniqueMessages) {
    // Убеждаемся, что у сообщения есть createdAt
    if (!msg.createdAt) {
      msg.createdAt = new Date().toISOString();
    }
    // Инициализируем reactions как пустой массив если отсутствует
    if (!msg.reactions) {
      msg.reactions = [];
    }
    
    // Если это сообщение с реальным ID заменяет временное, удаляем временное
    if (msg.temporaryId && bucket.byId[msg.temporaryId]) {
      delete bucket.byId[msg.temporaryId];
      const tempIndex = bucket.ids.indexOf(msg.temporaryId);
      if (tempIndex >= 0) {
        bucket.ids.splice(tempIndex, 1);
      }
    }
    
    // Обновляем сообщение (слияние с существующим если есть)
    bucket.byId[msg.id] = { ...(bucket.byId[msg.id] || {}), ...msg };
    if (!bucket.ids.includes(msg.id)) bucket.ids.push(msg.id);
  }

  // Дедупликация bucket.ids перед сортировкой
  const uniqueIds = [...new Set(bucket.ids)];
  bucket.ids = uniqueIds;
  
  // Удаляем ID которые ссылаются на временные сообщения без ID
  bucket.ids = bucket.ids.filter(id => {
    const msg = bucket.byId[id];
    return msg && msg.id === id; // Оставляем только если ключ совпадает с msg.id
  });

  bucket.ids.sort((a, b) => {
    const ma = bucket.byId[a];
    const mb = bucket.byId[b];
    const maTime = ma?.createdAt ? new Date(ma.createdAt).getTime() : 0;
    const mbTime = mb?.createdAt ? new Date(mb.createdAt).getTime() : 0;
    return mbTime - maTime;
  });
};

const getParticipantDisplayName = (participant) => {
  if (!participant) return undefined;
  return (
      participant.companyName ||
      participant.name ||
      participant.firstName ||
      participant.user?.companyName ||
      participant.user?.name ||
      participant.user?.firstName
  );
};

const getParticipantAvatar = (participant) => {
  if (!participant) return null;
  return (
      participant.avatar ||
      participant.image ||
      participant.user?.avatar ||
      participant.user?.image ||
      null
  );
};

const enrichMessageWithSender = (message, room) => {
  if (!room || message?.sender) return message;
  const senderId = message?.senderId;
  const participants = Array.isArray(room.participants) ? room.participants : [];
  const matched = participants.find(
      (p) => (p?.id ?? p?.userId ?? p?.user?.id) === senderId
  );
  if (!matched) return message;
  const sender = {
    id: senderId,
    name: getParticipantDisplayName(matched),
    avatar: getParticipantAvatar(matched),
  };
  return { ...message, sender };
};

// Обновленная функция кэширования с использованием ChatCacheService
// Важно: делаем глубокую копию СРАЗУ для избежания ошибки "Proxy handler is null"
// Debounce для предотвращения частых записей
let cacheUpdateTimers = {};
let pendingCacheUpdates = {}; // Хранит готовые к сохранению данные

const updateMessageCache = (roomId, bucket) => {
  // КРИТИЧНО: Создаем копию данных СРАЗУ, пока Proxy еще валиден
  // Не делаем это внутри setTimeout, так как к тому времени Proxy может быть уже null
  try {
    const messagesToCache = bucket.ids.map(id => {
      const msg = bucket.byId[id];
      if (!msg) return null;
      
      // Пропускаем временные сообщения
      // Временные сообщения имеют temporaryId в качестве ключа или ID в виде строки "temp_..."
      const msgId = msg.id;
      if (!msgId) {
        // Нет ID - временное сообщение
        return null;
      }
      if (typeof msgId === 'string' && msgId.startsWith('temp_')) {
        // ID начинается с "temp_" - временное сообщение
        return null;
      }
      if (msgId === id && typeof id === 'string' && id.startsWith('temp_')) {
        // Ключ - временный ID - временное сообщение
        return null;
      }
      
      // Делаем копию через JSON для полного отделения от Proxy
      try {
        return JSON.parse(JSON.stringify(msg));
      } catch {
        return null;
      }
    }).filter(Boolean);
    
    if (messagesToCache.length === 0) return;
    
    // Сохраняем данные для последующей записи
    pendingCacheUpdates[roomId] = messagesToCache;
  } catch (e) {
    // Ошибка создания копии - игнорируем
    console.warn('updateMessageCache: Failed to create copy:', e?.message);
    return;
  }
  
  // Отменяем предыдущий таймер для этой комнаты
  if (cacheUpdateTimers[roomId]) {
    clearTimeout(cacheUpdateTimers[roomId]);
  }
  
  // Debounce - обновляем кэш через 300ms после последнего изменения (уменьшили с 500ms)
  cacheUpdateTimers[roomId] = setTimeout(async () => {
    try {
      const messagesToSave = pendingCacheUpdates[roomId];
      if (!messagesToSave || messagesToSave.length === 0) return;
      
      await chatCacheService.saveMessages(roomId, messagesToSave);
      
      // Фоновое кэширование медиа-файлов (только первые 20)
      const recentMessages = messagesToSave.slice(0, 20);
      recentMessages.forEach(msg => {
        if (msg.attachments?.length > 0) {
          msg.attachments.forEach(att => {
            if (att.path) {
              if (att.type === 'VOICE') {
                chatCacheService.cacheAudio(att.path).catch(() => {});
              } else if (att.type === 'IMAGE') {
                chatCacheService.cacheImage(att.path).catch(() => {});
              }
            }
          });
        }
      });
    } catch (e) {
      // Ошибка обновления кэша сообщений - игнорируем
      console.warn('updateMessageCache: Failed to save:', e?.message);
    }
    delete cacheUpdateTimers[roomId];
    delete pendingCacheUpdates[roomId];
  }, 300);
};

const CACHE_KEYS = {
  ROOMS: 'chat.rooms',
  roomMessages: (roomId) => `chat.messages.${roomId}`,
};

// Загрузка комнат из кэша с использованием ChatCacheService
export const loadRoomsCache = createAsyncThunk('chat/loadRoomsCache', async (_, { rejectWithValue }) => {
  try {
    // Сначала пробуем новый ChatCacheService
    const rooms = await chatCacheService.getRooms();
    if (rooms.length > 0) {
      return { rooms };
    }
    
    // Fallback на старый AsyncStorage
    const raw = await AsyncStorage.getItem(CACHE_KEYS.ROOMS);
    const oldRooms = raw ? JSON.parse(raw) : [];
    
    // Мигрируем в новый формат
    if (oldRooms.length > 0) {
      await chatCacheService.saveRooms(oldRooms);
    }
    
    return { rooms: oldRooms };
  } catch (e) {
    return rejectWithValue(e.message || 'Ошибка чтения кэша комнат');
  }
});

// Загрузка сообщений комнаты из кэша
export const loadRoomMessagesCache = createAsyncThunk('chat/loadRoomMessagesCache', async ({ roomId }, { rejectWithValue }) => {
  try {
    // Сначала пробуем новый ChatCacheService
    const messages = await chatCacheService.getMessages(roomId);
    if (messages.length > 0) {
      return { roomId, messages };
    }
    
    // Fallback на старый AsyncStorage
    const raw = await AsyncStorage.getItem(CACHE_KEYS.roomMessages(roomId));
    const oldMessages = raw ? JSON.parse(raw) : [];
    
    // Мигрируем в новый формат
    if (oldMessages.length > 0) {
      await chatCacheService.saveMessages(roomId, oldMessages);
    }
    
    return { roomId, messages: oldMessages };
  } catch (e) {
    return rejectWithValue(e.message || 'Ошибка чтения кэша сообщений');
  }
});

// Синхронизация данных с сервером (подгрузка новых сообщений)
export const syncChatData = createAsyncThunk('chat/syncChatData', async ({ roomId }, { rejectWithValue, getState }) => {
  try {
    const state = getState();
    const bucket = state.chat.messages[roomId];
    const lastMessage = bucket?.ids.length > 0 ? bucket.byId[bucket.ids[0]] : null;
    const lastSyncTime = lastMessage?.createdAt || null;
    
    // Загружаем новые сообщения с сервера
    const res = await ChatApi.getMessages(roomId, { 
      limit: 50,
      ...(lastSyncTime && { after: lastSyncTime })
    });
    
    const messages = res?.data?.messages || res?.data?.data || res?.data || [];
    
    // Сохраняем новые сообщения в кэш
    if (messages.length > 0) {
      const existingMessages = await chatCacheService.getMessages(roomId);
      const allMessages = [...messages, ...existingMessages];
      
      // Удаляем дубликаты по id
      const uniqueMessages = allMessages.filter((msg, index, self) => 
        index === self.findIndex(m => m.id === msg.id)
      );
      
      await chatCacheService.saveMessages(roomId, uniqueMessages);
    }
    
    return { roomId, messages, hasMore: messages.length >= 50 };
  } catch (e) {
    return rejectWithValue(e.message || 'Ошибка синхронизации');
  }
});

// Предзагрузка медиа-файлов для комнаты
export const preloadRoomMedia = createAsyncThunk('chat/preloadRoomMedia', async ({ roomId }, { getState }) => {
  try {
    const state = getState();
    const bucket = state.chat.messages[roomId];
    if (!bucket) return { roomId, cached: 0 };
    
    const messages = bucket.ids.map(id => bucket.byId[id]).filter(Boolean);
    let cachedCount = 0;
    
    for (const msg of messages) {
      if (msg.attachments?.length > 0) {
        for (const att of msg.attachments) {
          if (att.path) {
            try {
              if (att.type === 'VOICE') {
                await chatCacheService.cacheAudio(att.path);
                cachedCount++;
              } else if (att.type === 'IMAGE') {
                await chatCacheService.cacheImage(att.path);
                cachedCount++;
              }
            } catch (e) {
              // Продолжаем кэширование других файлов
            }
          }
        }
      }
    }
    
    return { roomId, cached: cachedCount };
  } catch (e) {
    return { roomId, cached: 0, error: e.message };
  }
});

export const fetchRooms = createAsyncThunk(
    'chat/fetchRooms',
    async ({ page = 1, limit = 20, forceRefresh = false } = {}, { rejectWithValue, dispatch, getState }) => {
        try {
            // Проверяем авторизацию перед загрузкой
            const state = getState();
            const isAuthenticated = state.auth?.isAuthenticated;
            const currentUserId = state.auth?.user?.id;
            
            if (!isAuthenticated || !currentUserId) {
                return rejectWithValue('Требуется авторизация для просмотра чатов');
            }
            
            const res = await ChatApi.getRooms({ page, limit });
            const root = (res && res.data) ? res.data : {};
            const dataNode = root?.data ?? root ?? {};
            let roomsRaw = Array.isArray(dataNode)
                ? dataNode
                : (dataNode.rooms ?? dataNode.items ?? dataNode.data ?? []);
            if (!Array.isArray(roomsRaw)) roomsRaw = [];

        const rooms = roomsRaw.map((it) => {
          if (it && it.room && typeof it.room === 'object') {
            const room = { ...it.room };
            if (!room.product && it.product) room.product = it.product;
            // Добавляем lastMessage если оно есть в room
            if (!room.lastMessage && it.room.lastMessage) room.lastMessage = it.room.lastMessage;

            // Копируем счетчик непрочитанных из внешнего объекта
            if (it.unreadCount !== undefined) room.unreadCount = it.unreadCount;
            if (it.unread !== undefined) room.unread = it.unread;

            return room;
          }
          return it;
        }).filter(r => r && r.id);

        // Загружаем последние сообщения для каждой комнаты, чтобы иметь актуальные статусы
        if (page === 1 && rooms.length > 0) {
          const loadMessagesPromises = rooms.map(async (room) => {
            try {
              // Всегда загружаем последнее сообщение, даже если room.lastMessage есть
              // Это гарантирует актуальные данные
              const messagesRes = await ChatApi.getMessages(room.id, { limit: 1 });
              const messagesData = messagesRes?.data?.data || messagesRes?.data || [];

              if (Array.isArray(messagesData) && messagesData.length > 0) {
                const lastMessage = messagesData[0];

                // Сохраняем сообщение в Redux store
                dispatch(receiveMessage({
                  roomId: room.id,
                  message: lastMessage
                }));
              }
            } catch (error) {
              // Ошибка загрузки сообщений для комнаты
            }
          });

          // Ждем загрузки всех сообщений
          await Promise.allSettled(loadMessagesPromises);
        }

        const pagination = root?.pagination ?? dataNode?.pagination ?? dataNode?.meta ?? null;

        if (page === 1) {
          try { 
            await chatCacheService.saveRooms(rooms);
          } catch {}
        }

        return { rooms, page, hasMore: pagination ? !!(pagination.hasMore ?? pagination.has_next) : (Array.isArray(rooms) && rooms.length >= limit) };
      } catch (e) {
        return rejectWithValue(e.message || 'Ошибка загрузки чатов');
      }
    }
);

export const fetchRoom = createAsyncThunk(
    'chat/fetchRoom',
    async (roomId, { rejectWithValue }) => {
      try {
        const res = await ChatApi.getRoom(roomId);
        const root = (res && res.data) ? res.data : {};
        const node = root?.data ?? root ?? {};
        const room = node?.room ?? node ?? {};
        return { room };
      } catch (e) {
        // Проверяем, является ли ошибка 404 (комната не найдена/удалена)
        const isNotFound = e?.response?.status === 404 || e?.status === 404 || 
                          e?.message?.includes('не найдена') || 
                          e?.message?.includes('not found');
        return rejectWithValue({ 
          message: e.message || 'Ошибка загрузки комнаты',
          roomId,
          isNotFound
        });
      }
    }
);

export const fetchRoomAvatar = createAsyncThunk(
    'chat/fetchRoomAvatar',
    async (roomId, { getState, rejectWithValue }) => {
      try {
        const state = getState();
        if (state?.chat?.avatarFetchAttemptedByRoomId?.[roomId]) {
          return rejectWithValue('already-attempted');
        }

        const room = state?.chat?.rooms?.byId?.[roomId]?.room || state?.chat?.rooms?.byId?.[roomId];
        const currentUserId = state?.auth?.user?.id;
        const participants = Array.isArray(room?.participants) ? room.participants : [];
        const other = currentUserId
            ? (participants.find(p => ((p?.userId ?? p?.user?.id)) !== currentUserId) || participants[0])
            : participants[0];
        const otherUserId = other?.userId ?? other?.user?.id ?? other?.id;

        if (!otherUserId) {
          return rejectWithValue('Нет собеседника для комнаты');
        }

        const res = await userApi.getUserById(otherUserId);
        const root = res?.data?.data || res?.data || {};
        const user = root?.user || root;
        const avatar = user?.avatar || user?.image || user?.profile?.avatar || null;
        return { roomId, user, avatar };
      } catch (e) {
        return rejectWithValue(e.message || 'Ошибка загрузки аватара собеседника');
      }
    }
);

export const fetchMessages = createAsyncThunk(
    'chat/fetchMessages',
    async ({ roomId, limit = 100, cursorId = null, direction = 'backward' }, { rejectWithValue }) => {
      try {
        const params = { limit };
        if (cursorId) params.cursorId = cursorId;
        if (direction) params.direction = direction;

        const res = await ChatApi.getMessages(roomId, params);
        let messages = res?.data?.messages || res?.data?.data || res?.data || [];
        const hasMore = (res?.data?.pagination?.hasMore ?? (messages.length >= limit));

        // Нормализуем waveform для голосовых сообщений
        messages = messages.map(message => {
          if (message.type === 'VOICE' && message.attachments?.length > 0) {
            const normalizedAttachments = message.attachments.map(attachment => {
              if (attachment.type === 'VOICE' && attachment.waveform !== undefined && attachment.waveform !== null) {
                // Нормализуем waveform: если это строка, пытаемся распарсить
                let normalizedWaveform = attachment.waveform;
                
                if (typeof normalizedWaveform === 'string') {
                  try {
                    const parsed = JSON.parse(normalizedWaveform);
                    if (Array.isArray(parsed)) {
                      normalizedWaveform = parsed;
                    }
                  } catch {
                    // Если не JSON, возможно это строка с числами через запятую
                    try {
                      const parsed = normalizedWaveform.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
                      if (parsed.length > 0) {
                        normalizedWaveform = parsed;
                      }
                    } catch {
                      // Игнорируем ошибки
                    }
                  }
                }
                // Если waveform - это массив, оставляем как есть
                
                return {
                  ...attachment,
                  waveform: normalizedWaveform
                };
              }
              return attachment;
            });
            
            return {
              ...message,
              attachments: normalizedAttachments
            };
          }
          return message;
        });

        if (!cursorId) {
          try {
            // Фильтруем временные сообщения перед сохранением в кэш
            const messagesToCache = messages.filter(msg => {
              // Сохраняем только сообщения с реальным ID (не temporaryId)
              return msg.id && typeof msg.id === 'number' && !msg.temporaryId;
            });
            
            if (messagesToCache.length > 0) {
              await chatCacheService.saveMessages(roomId, messagesToCache);
            }
            
            // Фоновое кэширование медиа-файлов
            messages.forEach(msg => {
              if (msg.attachments?.length > 0) {
                msg.attachments.forEach(att => {
                  if (att.path) {
                    if (att.type === 'VOICE') {
                      chatCacheService.cacheAudio(att.path).catch(() => {});
                    } else if (att.type === 'IMAGE') {
                      chatCacheService.cacheImage(att.path).catch(() => {});
                    }
                  }
                });
              }
            });
          } catch {}
        }

        return { roomId, messages, hasMore };
      } catch (e) {
        // Проверяем, является ли ошибка 404 (комната не найдена/удалена)
        const isNotFound = e?.response?.status === 404 || 
                          e?.status === 404 || 
                          e?.message?.includes('не найдена') || 
                          e?.message?.includes('not found') ||
                          e?.message?.includes('404');
        
        return rejectWithValue({ 
          message: e.message || 'Ошибка загрузки сообщений',
          roomId,
          isNotFound
        });
      }
    }
);

// Отправка голосового сообщения
// Вспомогательная функция для проверки сетевой ошибки
const isNetworkError = (error) => {
  if (!error) return false;
  
  const errorMessage = (error.message || '').toLowerCase();
  const errorCode = error.code || error.response?.status;
  
  // Проверка по коду ошибки
  if (errorCode === 'ECONNABORTED' || 
      errorCode === 'ERR_NETWORK' ||
      errorCode === 'ERR_INTERNET_DISCONNECTED' ||
      errorCode === 'ETIMEDOUT' ||
      errorCode === 'ENOTFOUND' ||
      errorCode === 'ECONNREFUSED') {
    return true;
  }
  
  // Проверка по статусу HTTP
  if (errorCode === 0 || // Network error
      errorCode === 408 || // Request Timeout
      errorCode === 502 || // Bad Gateway
      errorCode === 503 || // Service Unavailable
      errorCode === 504) { // Gateway Timeout
    return true;
  }
  
  // Проверка по тексту сообщения
  if (errorMessage.includes('network') ||
      errorMessage.includes('network request failed') ||
      errorMessage.includes('сетевым подключением') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('failed to fetch') ||
      errorMessage.includes('no internet') ||
      errorMessage.includes('интернет')) {
    return true;
  }
  
  // Проверка отсутствия ответа от сервера
  if (!error.response && errorMessage) {
    return true;
  }
  
  return false;
};

// Функция задержки для retry
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const waitForNetwork = async (timeoutMs = 20000) => {
  try {
    const connected = await waitForConnection(timeoutMs);
    if (__DEV__ && !connected) {
      console.log('⏳ waitForNetwork: timeout', { timeoutMs });
    }
    return connected;
  } catch (error) {
    return false;
  }
};

export const sendVoice = createAsyncThunk(
    'chat/sendVoice',
async ({ roomId, voice, temporaryId, replyToId, retryCount = 0 }, { rejectWithValue, dispatch, getState }) => {
      const MAX_RETRIES = 5;
      const RETRY_DELAYS = [1000, 2000, 3000, 5000, 10000]; // Прогрессивная задержка
      
      try {
        const form = new FormData();
        form.append('type', 'VOICE');
        form.append('duration', voice.duration.toString());
        if (replyToId) {
          form.append('replyToId', replyToId.toString());
        }
        
        // Добавляем waveform как JSON строку
        if (voice.waveform && Array.isArray(voice.waveform)) {
          form.append('waveform', JSON.stringify(voice.waveform));
        }

        // Добавляем аудио файл
        const audioFile = {
          uri: Platform.OS === 'android' 
            ? (voice.uri?.startsWith('file://') ? voice.uri : `file://${voice.uri}`)
            : voice.uri,
          type: voice.type || 'audio/aac',
          name: voice.name || `voice_${Date.now()}.aac`
        };

        form.append('voice', audioFile);

        if (__DEV__) {
          console.log('📤 sendVoice: Отправка голосового сообщения', {
            roomId,
            duration: voice.duration,
            durationString: voice.duration.toString(),
            uri: audioFile.uri,
            type: audioFile.type,
            hasTemporaryId: !!temporaryId,
            attempt: retryCount + 1,
            maxRetries: MAX_RETRIES,
            voiceData: voice // ✅ Полный объект voice для проверки
          });
        }

        // Обновляем счётчик попыток в UI
        if (temporaryId && retryCount > 0) {
          dispatch(updateMessageRetryCount({
            temporaryId,
            retryCount,
            maxRetries: MAX_RETRIES
          }));
        }

        const res = await ChatApi.sendMessage(roomId, form);
        const serverMessage = res?.data?.data?.message || res?.data?.message || res?.data?.data || res?.data;
        
        if (!serverMessage || !serverMessage.id) {
          throw new Error('Сервер не вернул сообщение');
        }
        
        // Убеждаемся, что у сообщения есть createdAt
        if (!serverMessage.createdAt) {
          serverMessage.createdAt = new Date().toISOString();
        }
        
        if (__DEV__) {
          console.log('✅ sendVoice.fulfilled:', { 
            serverMessage,
            messageId: serverMessage?.id,
            attemptNumber: retryCount + 1,
            hasAttachments: !!serverMessage?.attachments,
            attachmentsCount: serverMessage?.attachments?.length || 0
          });
        }

        // НЕ вызываем updateOptimisticMessage здесь - это будет сделано в fulfilled reducer
        // Это предотвращает проблемы с WebSocket перезаписью (как в sendText.fulfilled)

        return { message: serverMessage, temporaryId };
      } catch (error) {
        if (__DEV__) {
          console.error('❌ sendVoice error:', {
            error: error.message,
            attempt: retryCount + 1,
            maxRetries: MAX_RETRIES
          });
        }
        
        // Проверяем, является ли это сетевой ошибкой и есть ли ещё попытки
        if (isNetworkError(error) && retryCount < MAX_RETRIES - 1) {
          const nextRetryCount = retryCount + 1;
          const delayMs = RETRY_DELAYS[retryCount] || 10000;
          
          if (__DEV__) {
            console.log(`🔄 Повторная попытка ${nextRetryCount + 1}/${MAX_RETRIES} через ${delayMs}ms`);
          }
          
          await waitForNetwork(20000);
          
          // Ждём перед повторной попыткой
          await delay(delayMs);
          
          // Рекурсивно вызываем sendVoice с увеличенным счётчиком
          return dispatch(sendVoice({ 
            roomId, 
            voice, 
            temporaryId,
            replyToId,
            retryCount: nextRetryCount 
          })).unwrap();
        }
        
        // Если исчерпаны все попытки или это не сетевая ошибка
        if (temporaryId) {
          dispatch(markOptimisticMessageFailed({ 
            temporaryId, 
            error: error.message || 'Ошибка отправки голосового сообщения',
            retryCount,
            isRetryable: isNetworkError(error)
          }));
        }
        
        return rejectWithValue({
          message: error.response?.data?.message || 
                   error.message || 
                   'Ошибка отправки голосового сообщения',
          retryCount,
          isRetryable: isNetworkError(error)
        });
      }
    }
);

export const sendText = createAsyncThunk(
    'chat/sendText',
    async ({ roomId, content, temporaryId, replyToId, retryCount = 0 }, { rejectWithValue, dispatch, getState }) => {
      const MAX_RETRIES = 5;
      const RETRY_DELAYS = [1000, 2000, 3000, 5000, 10000]; // Прогрессивная задержка
      
      try {
        const form = new FormData();
        form.append('type', 'TEXT');
        form.append('content', content);
        if (replyToId) {
          form.append('replyToId', replyToId.toString());
        }
        
        if (__DEV__) {
          console.log('📤 sendText: Отправка текстового сообщения', {
            roomId,
            contentLength: content?.length,
            hasTemporaryId: !!temporaryId,
            attempt: retryCount + 1,
            maxRetries: MAX_RETRIES
          });
        }
        
        // Обновляем счётчик попыток в UI
        if (temporaryId && retryCount > 0) {
          dispatch(updateMessageRetryCount({
            temporaryId,
            retryCount,
            maxRetries: MAX_RETRIES
          }));
        }
        
        const res = await ChatApi.sendMessage(roomId, form);
        const serverMessage = res?.data?.data?.message || res?.data?.message || res?.data?.data || res?.data;
        
        if (!serverMessage || !serverMessage.id) {
          throw new Error('Сервер не вернул сообщение');
        }
        
        // Убеждаемся, что у сообщения есть createdAt
        if (!serverMessage.createdAt) {
          serverMessage.createdAt = new Date().toISOString();
        }
        
        if (__DEV__) {
          console.log('✅ sendText.fulfilled:', {
            serverMessage,
            messageId: serverMessage?.id,
            attemptNumber: retryCount + 1,
            messageHasReplyTo: !!serverMessage?.replyTo,
            replyToId: serverMessage?.replyToId
          });
        }
        
        return { message: serverMessage, temporaryId };
      } catch (error) {
        if (__DEV__) {
          console.error('❌ sendText error:', {
            error: error.message,
            attempt: retryCount + 1,
            maxRetries: MAX_RETRIES,
            isNetworkError: isNetworkError(error)
          });
        }
        
        // Проверяем, является ли это сетевой ошибкой и есть ли ещё попытки
        if (isNetworkError(error) && retryCount < MAX_RETRIES - 1) {
          const nextRetryCount = retryCount + 1;
          const delayMs = RETRY_DELAYS[retryCount] || 10000;
          
          if (__DEV__) {
            console.log(`🔄 Повторная попытка отправки текста ${nextRetryCount + 1}/${MAX_RETRIES} через ${delayMs}ms`);
          }
          
          await waitForNetwork(20000);
          
          // Ждём перед повторной попыткой
          await delay(delayMs);
          
          // Рекурсивно вызываем sendText с увеличенным счётчиком
          return dispatch(sendText({ 
            roomId, 
            content, 
            temporaryId, 
            replyToId,
            retryCount: nextRetryCount 
          })).unwrap();
        }
        
        // Если исчерпаны все попытки или это не сетевая ошибка
        if (temporaryId) {
          dispatch(markOptimisticMessageFailed({ 
            temporaryId, 
            error: error.message || 'Ошибка отправки сообщения',
            retryCount,
            isRetryable: isNetworkError(error)
          }));
        }
        
        return rejectWithValue({
          message: error.response?.data?.message || 
                   error.message || 
                   'Ошибка отправки сообщения',
          retryCount,
          isRetryable: isNetworkError(error)
        });
      }
    }
);

export const sendPoll = createAsyncThunk(
    'chat/sendPoll',
    async ({ roomId, pollData, temporaryId, replyToId, retryCount = 0 }, { rejectWithValue, dispatch, getState }) => {
      const MAX_RETRIES = 5;
      const RETRY_DELAYS = [1000, 2000, 3000, 5000, 10000]; // Прогрессивная задержка
      
      try {
        const form = new FormData();
        form.append('type', 'POLL');
        form.append('content', pollData.question);
        form.append('pollData', JSON.stringify({
          question: pollData.question,
          options: pollData.options,
          allowMultiple: pollData.allowMultiple,
        }));
        if (replyToId) {
          form.append('replyToId', replyToId.toString());
        }
        
        if (__DEV__) {
          console.log('📤 sendPoll: Отправка опроса', {
            roomId,
            question: pollData.question,
            optionsCount: pollData.options?.length || 0,
            hasTemporaryId: !!temporaryId,
            attempt: retryCount + 1,
            maxRetries: MAX_RETRIES
          });
        }
        
        // Обновляем счётчик попыток в UI
        if (temporaryId && retryCount > 0) {
          dispatch(updateMessageRetryCount({
            temporaryId,
            retryCount,
            maxRetries: MAX_RETRIES
          }));
        }
        
        const res = await ChatApi.sendMessage(roomId, form);
        const serverMessage = res?.data?.data?.message || res?.data?.message || res?.data?.data || res?.data;
        
        if (!serverMessage || !serverMessage.id) {
          throw new Error('Сервер не вернул сообщение');
        }
        
        // Убеждаемся, что у сообщения есть createdAt
        if (!serverMessage.createdAt) {
          serverMessage.createdAt = new Date().toISOString();
        }
        
        if (__DEV__) {
          console.log('✅ sendPoll.fulfilled:', {
            serverMessage,
            messageId: serverMessage?.id,
            attemptNumber: retryCount + 1
          });
        }
        
        return { message: serverMessage, temporaryId };
      } catch (error) {
        if (__DEV__) {
          console.error('❌ sendPoll error:', {
            error: error.message,
            attempt: retryCount + 1,
            maxRetries: MAX_RETRIES,
            isNetworkError: isNetworkError(error)
          });
        }
        
        // Проверяем, является ли это сетевой ошибкой и есть ли ещё попытки
        if (isNetworkError(error) && retryCount < MAX_RETRIES - 1) {
          const nextRetryCount = retryCount + 1;
          const delayMs = RETRY_DELAYS[retryCount] || 10000;
          
          if (__DEV__) {
            console.log(`🔄 Повторная попытка отправки опроса ${nextRetryCount + 1}/${MAX_RETRIES} через ${delayMs}ms`);
          }
          
          await waitForNetwork(20000);
          
          // Ждём перед повторной попыткой
          await delay(delayMs);
          
          // Рекурсивно вызываем sendPoll с увеличенным счётчиком
          return dispatch(sendPoll({ 
            roomId, 
            pollData, 
            temporaryId, 
            replyToId,
            retryCount: nextRetryCount 
          })).unwrap();
        }
        
        // Если исчерпаны все попытки или это не сетевая ошибка
        if (temporaryId) {
          dispatch(markOptimisticMessageFailed({ 
            temporaryId, 
            error: error.message || 'Ошибка отправки опроса',
            retryCount,
            isRetryable: isNetworkError(error)
          }));
        }
        
        return rejectWithValue({
          message: error.response?.data?.message || 
                   error.message || 
                   'Ошибка отправки опроса',
          retryCount,
          isRetryable: isNetworkError(error)
        });
      }
    }
);

export const sendImages = createAsyncThunk(
    'chat/sendImages',
    async ({ roomId, files = [], captions = [], temporaryId, replyToId, retryCount = 0 }, { rejectWithValue, dispatch, getState }) => {
      const MAX_RETRIES = 5;
      const RETRY_DELAYS = [1000, 2000, 3000, 5000, 10000]; // Прогрессивная задержка
      
      try {
        const form = new FormData();
        form.append('type', 'IMAGE');
        if (replyToId) {
          form.append('replyToId', replyToId.toString());
        }

        const preparedFiles = [];
        for (let i = 0; i < files.length; i += 1) {
          const f = files[i];
          try {
            const uriToProcess = Platform.OS === 'android'
                ? (f.uri?.startsWith('file://') ? f.uri : `file://${f.uri}`)
                : f.uri;
            const result = await ImageManipulator.manipulateAsync(
                uriToProcess,
                [{ resize: { width: 1200 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );
            preparedFiles.push({ uri: result.uri, name: f.name || `chat_${Date.now()}_${i}.jpg`, type: 'image/jpeg' });
          } catch {
            preparedFiles.push({ uri: f.uri, name: f.name || `chat_${Date.now()}_${i}.jpg`, type: f.type || 'image/jpeg' });
          }
        }

        preparedFiles.forEach((file, idx) => {
          form.append('images', file);
          const cap = captions[idx];
          if (cap) form.append('captions[]', cap);
        });

        if (__DEV__) {
          console.log('📤 sendImages: Отправка изображений', {
            roomId,
            filesCount: files.length,
            hasTemporaryId: !!temporaryId,
            attempt: retryCount + 1,
            maxRetries: MAX_RETRIES
          });
        }

        // Обновляем счётчик попыток в UI
        if (temporaryId && retryCount > 0) {
          dispatch(updateMessageRetryCount({
            temporaryId,
            retryCount,
            maxRetries: MAX_RETRIES
          }));
        }

        const res = await ChatApi.sendMessage(roomId, form);
        const serverMessage = res?.data?.data?.message || res?.data?.message || res?.data?.data || res?.data;
        
        if (!serverMessage || !serverMessage.id) {
          throw new Error('Сервер не вернул сообщение');
        }
        
        // Убеждаемся, что у сообщения есть createdAt
        if (!serverMessage.createdAt) {
          serverMessage.createdAt = new Date().toISOString();
        }
        
        if (__DEV__) {
          console.log('✅ sendImages.fulfilled:', { 
            serverMessage,
            messageId: serverMessage?.id,
            attemptNumber: retryCount + 1,
            hasAttachments: !!serverMessage?.attachments,
            attachmentsCount: serverMessage?.attachments?.length || 0
          });
        }

        return { message: serverMessage, temporaryId };
      } catch (error) {
        if (__DEV__) {
          console.error('❌ sendImages error:', {
            error: error.message,
            attempt: retryCount + 1,
            maxRetries: MAX_RETRIES
          });
        }
        
        // Проверяем, является ли это сетевой ошибкой и есть ли ещё попытки
        if (isNetworkError(error) && retryCount < MAX_RETRIES - 1) {
          const nextRetryCount = retryCount + 1;
          const delayMs = RETRY_DELAYS[retryCount] || 10000;
          
          if (__DEV__) {
            console.log(`🔄 Повторная попытка отправки изображений ${nextRetryCount + 1}/${MAX_RETRIES} через ${delayMs}ms`);
          }
          
          await waitForNetwork(20000);
          
          // Ждём перед повторной попыткой
          await delay(delayMs);
          
          // Рекурсивно вызываем sendImages с увеличенным счётчиком
          return dispatch(sendImages({ 
            roomId, 
            files, 
            captions,
            temporaryId,
            replyToId,
            retryCount: nextRetryCount 
          })).unwrap();
        }
        
        // Если исчерпаны все попытки или это не сетевая ошибка
        if (temporaryId) {
          dispatch(markOptimisticMessageFailed({ 
            temporaryId, 
            error: error.message || 'Ошибка отправки изображений',
            retryCount,
            isRetryable: isNetworkError(error)
          }));
        }
        
        return rejectWithValue({
          message: error.response?.data?.message || 
                   error.message || 
                   'Ошибка отправки изображений',
          retryCount,
          isRetryable: isNetworkError(error)
        });
      }
    }
);

export const sendProduct = createAsyncThunk(
    'chat/sendProduct',
    async ({ roomId, productId }, { rejectWithValue }) => {
      try {
        const form = new FormData();
        form.append('type', 'PRODUCT');
        form.append('productId', String(productId));
        const res = await ChatApi.sendMessage(roomId, form);
        return res?.data?.data || res?.data;
      } catch (e) {
        const apiMsg = e?.response?.data?.message;
        const firstErr = e?.response?.data?.errors?.[0];
        const msg =
          (typeof apiMsg === 'string' && apiMsg) ||
          (typeof firstErr === 'string' ? firstErr : firstErr?.msg) ||
          (typeof e?.message === 'string' ? e.message : '') ||
          'Ошибка отправки товара';
        return rejectWithValue(msg);
      }
    }
);

export const sendStop = createAsyncThunk(
    'chat/sendStop',
    async ({ roomId, stopId }, { rejectWithValue }) => {
      try {
        const form = new FormData();
        form.append('type', 'STOP');
        form.append('stopId', String(stopId));
        const res = await ChatApi.sendMessage(roomId, form);
        return res?.data?.data || res?.data;
      } catch (e) {
        return rejectWithValue(e.message || 'Ошибка отправки остановки');
      }
    }
);

export const sendWarehouse = createAsyncThunk(
    'chat/sendWarehouse',
    async ({ roomId, warehouseId }, { rejectWithValue }) => {
      try {
        const form = new FormData();
        form.append('type', 'WAREHOUSE');
        form.append('warehouseId', String(warehouseId));
        const res = await ChatApi.sendMessage(roomId, form);
        return res?.data?.data || res?.data;
      } catch (e) {
        return rejectWithValue(e.message || 'Ошибка отправки склада');
      }
    }
);

export const sendContact = createAsyncThunk(
    'chat/sendContact',
    async ({ roomId, contactUserId, temporaryId, replyToId }, { rejectWithValue }) => {
      try {
        const form = new FormData();
        form.append('type', 'CONTACT');
        form.append('contactUserId', String(contactUserId));
        if (replyToId) form.append('replyToId', String(replyToId));
        if (temporaryId) form.append('temporaryId', temporaryId);
        const res = await ChatApi.sendMessage(roomId, form);
        const serverMessage = res?.data?.data?.message || res?.data?.message || res?.data?.data || res?.data;
        return { message: serverMessage, temporaryId };
      } catch (e) {
        return rejectWithValue(e.message || 'Ошибка отправки контакта');
      }
    }
);

export const deleteMessage = createAsyncThunk(
    'chat/deleteMessage',
    async ({ messageId, forAll = false, currentUserId, roomId }, { rejectWithValue }) => {
        try {
            await ChatApi.deleteMessage(messageId, { forAll });
            return {
                messageId,
                roomId,
                deletedForAll: !!forAll,
                currentUserId
            };
        } catch (e) {
            const status = e?.response?.status;
            const isNotFound = status === 404 || /Сообщение не найдено/i.test(e?.response?.data?.message || e?.message || '');
            if (isNotFound) {
                return {
                    messageId,
                    roomId,
                    deletedForAll: true,
                    currentUserId,
                    notFound: true
                };
            }
            return rejectWithValue(e.message || 'Ошибка удаления сообщения');
        }
    }
);

export const hideMessage = createAsyncThunk(
    'chat/hideMessage',
    async ({ messageId }, { rejectWithValue }) => {
      try {
        const res = await ChatApi.hideMessage(messageId);
        return res?.data?.data || { messageId };
      } catch (e) {
        return rejectWithValue(e.message || 'Ошибка скрытия сообщения');
      }
    }
);

export const markAsRead = createAsyncThunk(
    'chat/markAsRead',
    async ({ roomId }, { rejectWithValue }) => {
      try {
        await ChatApi.markAsRead(roomId);
        return { roomId };
      } catch (e) {
        return rejectWithValue(e.message || 'Ошибка отметки прочтения');
      }
    }
);

export const createRoom = createAsyncThunk(
    'chat/createRoom',
    async (formData, { rejectWithValue }) => {
      try {
        const res = await ChatApi.createRoom(formData);
        // Исправляем извлечение комнаты из ответа сервера
        return res?.data?.data?.room || res?.data?.room || res?.data?.data || res?.data;
      } catch (e) {
        // Извлекаем сообщение об ошибке из ответа сервера
        const errorMessage = e?.response?.data?.message || 
                            e?.response?.data?.error || 
                            e?.message || 
                            'Ошибка создания комнаты';
        return rejectWithValue(errorMessage);
      }
    }
);

export const updateRoom = createAsyncThunk(
    'chat/updateRoom',
    async ({ roomId, formData }, { rejectWithValue }) => {
      try {
        const res = await ChatApi.updateRoom(roomId, formData);
        // Исправляем извлечение комнаты из ответа сервера
        return res?.data?.data?.room || res?.data?.room || res?.data?.data || res?.data;
      } catch (e) {
        return rejectWithValue(e.message || 'Ошибка обновления комнаты');
      }
    }
);

export const addMembers = createAsyncThunk(
    'chat/addMembers',
    async ({ roomId, userIds, makeAdmins = [] }, { rejectWithValue }) => {
      try {
        const res = await ChatApi.addMembers(roomId, { userIds, makeAdmins });
        return res?.data?.data || { roomId, userIds, makeAdmins };
      } catch (e) {
        // Извлекаем сообщение об ошибке из ответа сервера
        const errorMessage = e?.response?.data?.message || 
                            e?.response?.data?.error || 
                            e?.message || 
                            'Ошибка добавления участников';
        return rejectWithValue(errorMessage);
      }
    }
);

export const removeMember = createAsyncThunk(
    'chat/removeMember',
    async ({ roomId, userId }, { rejectWithValue }) => {
      try {
        const res = await ChatApi.removeMember(roomId, userId);
        return res?.data?.data || { roomId, userId };
      } catch (e) {
        return rejectWithValue(e.message || 'Ошибка удаления участника');
      }
    }
);

export const removeMembers = createAsyncThunk(
	'chat/removeMembers',
	async ({ roomId, userIds }, { rejectWithValue }) => {
		try {
			const res = await ChatApi.removeMembers(roomId, { userIds });
			return res?.data?.data || { roomId, userIds };
		} catch (e) {
			return rejectWithValue(e.message || 'Ошибка удаления участников');
		}
	}
);

export const deleteRoom = createAsyncThunk(
    'chat/deleteRoom',
    async ({ roomId }, { rejectWithValue }) => {
      try {
        const res = await ChatApi.deleteRoom(roomId);
        return { roomId, ...(res?.data?.data || res?.data || {}) };
      } catch (e) {
        return rejectWithValue(e.message || 'Ошибка удаления чата');
      }
    }
);

export const leaveRoom = createAsyncThunk(
    'chat/leaveRoom',
    async ({ roomId, deleteMessages = false }, { rejectWithValue }) => {
      try {
        const res = await ChatApi.leaveRoom(roomId, { deleteMessages });
        return { roomId, deleteMessages, ...(res?.data?.data || res?.data || {}) };
      } catch (e) {
        return rejectWithValue(e.message || 'Ошибка выхода из группы');
      }
    }
);

export const addReaction = createAsyncThunk(
    'chat/addReaction',
    async ({ messageId, emoji }, { rejectWithValue }) => {
      try {
        const res = await ChatApi.addReaction(messageId, emoji);
        return {
          messageId,
          reactions: res?.data?.data?.reactions || res?.data?.reactions || []
        };
      } catch (e) {
        return rejectWithValue(e.message || 'Ошибка добавления реакции');
      }
    }
);

export const removeReaction = createAsyncThunk(
    'chat/removeReaction',
    async ({ messageId, emoji }, { rejectWithValue }) => {
      try {
        const res = await ChatApi.removeReaction(messageId, emoji);
        return {
          messageId,
          reactions: res?.data?.data?.reactions || res?.data?.reactions || []
        };
      } catch (e) {
        return rejectWithValue(e.message || 'Ошибка удаления реакции');
      }
    }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveRoom(state, action) {
      state.activeRoomId = action.payload || null;
    },
    tickTime(state) {
      state.timeTick = Date.now();
    },
    setTyping(state, action) {
      const { roomId, userIds } = action.payload || {};
      if (!state.typingByRoomId[roomId]) {
        state.typingByRoomId[roomId] = {};
      }

      // Очищаем старые записи
      Object.keys(state.typingByRoomId[roomId]).forEach(userId => {
        if (!userIds || !userIds.includes(userId)) {
          delete state.typingByRoomId[roomId][userId];
        }
      });

      // Добавляем новые записи (по умолчанию тип 'text')
      if (Array.isArray(userIds)) {
        userIds.forEach(userId => {
          if (!state.typingByRoomId[roomId][userId]) {
            state.typingByRoomId[roomId][userId] = {
              type: 'text',
              timestamp: Date.now()
            };
          }
        });
      }
    },

    setTypingActivity(state, action) {
      const { roomId, userId, type } = action.payload || {};

      // Приведем к строкам для консистентности
      const roomKey = String(roomId);
      const userKey = String(userId);

      if (!roomKey || !userKey) return;

      // Инициализируем объект комнаты если его нет
      if (!state.typingByRoomId) {
        state.typingByRoomId = {};
      }

      if (!state.typingByRoomId[roomKey]) {
        state.typingByRoomId[roomKey] = {};
      }

      if (type) {
        // Добавляем активность
        state.typingByRoomId[roomKey][userKey] = {
          type,
          timestamp: Date.now()
        };
      } else {
        // Удаляем активность
        if (state.typingByRoomId[roomKey][userKey]) {
          delete state.typingByRoomId[roomKey][userKey];
        }
      }
    },
    setLastActivityType(state, action) {
      const { roomId, userId, type } = action.payload || {};
      const roomKey = String(roomId);
      const userKey = String(userId);

      if (!roomKey || !userKey) return;

      // Инициализируем объект комнаты если его нет
      if (!state.lastActivityTypeByRoomId) {
        state.lastActivityTypeByRoomId = {};
      }

      if (!state.lastActivityTypeByRoomId[roomKey]) {
        state.lastActivityTypeByRoomId[roomKey] = {};
      }

      if (type) {
        // Сохраняем последний тип активности
        state.lastActivityTypeByRoomId[roomKey][userKey] = type;
      } else {
        // Удаляем последний тип активности
        if (state.lastActivityTypeByRoomId[roomKey][userKey]) {
          delete state.lastActivityTypeByRoomId[roomKey][userKey];
        }
      }
    },
    // Добавляем optimistic сообщение немедленно в UI
    addOptimisticMessage(state, action) {
      const { roomId, message } = action.payload;
      if (!roomId || !message) return;
      
      ensureRoomBucket(state, roomId);
      
      // Добавляем сообщение с флагом isOptimistic для отслеживания статуса
      const optimisticMessage = {
        ...message,
        isOptimistic: true,
        status: 'SENDING',
        createdAt: new Date().toISOString(),
      };
      
      upsertMessagesDesc(state.messages[roomId], [optimisticMessage]);
      
      // Обновляем lastMessage комнаты
      const roomUpdate = { 
        id: roomId, 
        updatedAt: optimisticMessage?.createdAt || new Date().toISOString(), 
        lastMessage: optimisticMessage 
      };
      upsertRooms(state, [roomUpdate]);
      
      // Обновляем кэш
      updateMessageCache(roomId, state.messages[roomId]);
    },
    // Обновляем счётчик попыток отправки
    updateMessageRetryCount(state, action) {
      const { temporaryId, retryCount, maxRetries } = action.payload;
      if (!temporaryId) return;
      
      Object.keys(state.messages).forEach(roomId => {
        const bucket = state.messages[roomId];
        if (!bucket) return;
        
        Object.keys(bucket.byId).forEach(messageId => {
          const message = bucket.byId[messageId];
          if (message?.temporaryId === temporaryId) {
            message.retryCount = retryCount;
            message.maxRetries = maxRetries;
            message.status = 'SENDING';
          }
        });
      });
    },
    // Отмена отправки сообщения
    cancelFailedMessage(state, action) {
      const { temporaryId, roomId } = action.payload;
      if (!temporaryId || !roomId) return;
      
      const bucket = state.messages[roomId];
      if (!bucket) return;
      
      // Удаляем сообщение из хранилища
      Object.keys(bucket.byId).forEach(messageId => {
        const message = bucket.byId[messageId];
        if (message?.temporaryId === temporaryId) {
          delete bucket.byId[messageId];
          const index = bucket.ids.indexOf(messageId);
          if (index >= 0) {
            bucket.ids.splice(index, 1);
          }
          
          // Обновляем lastMessage если это было последнее сообщение
          if (state.rooms.byId[roomId]?.lastMessage?.temporaryId === temporaryId ||
              state.rooms.byId[roomId]?.lastMessage?.id === messageId) {
            // Находим новое последнее сообщение
            const lastMessageId = bucket.ids[bucket.ids.length - 1];
            const newLastMessage = lastMessageId ? bucket.byId[lastMessageId] : null;
            
            if (newLastMessage) {
              state.rooms.byId[roomId].lastMessage = newLastMessage;
            }
          }
          
          updateMessageCache(roomId, bucket);
        }
      });
    },
    // Помечаем сообщение как ошибочное при неудачной отправке
    markOptimisticMessageFailed(state, action) {
      const { temporaryId, error, retryCount = 0, isRetryable = false } = action.payload;
      if (!temporaryId) return;
      
      // Ищем сообщение во всех комнатах
      Object.keys(state.messages).forEach(roomId => {
        const bucket = state.messages[roomId];
        if (!bucket) return;
        
        Object.keys(bucket.byId).forEach(messageId => {
          const message = bucket.byId[messageId];
          if (message?.temporaryId === temporaryId) {
            message.status = 'FAILED';
            message.error = error;
            message.retryCount = retryCount;
            message.isRetryable = isRetryable;
            message.error = error;
            updateMessageCache(roomId, bucket);
          }
        });
      });
    },
    // Обновляем оптимистичное сообщение данными с сервера
    updateOptimisticMessage(state, action) {
      const { roomId, temporaryId, newMessage } = action.payload;
      if (!roomId || !temporaryId || !newMessage) {
        if (__DEV__) {
          console.warn('⚠️ updateOptimisticMessage: Missing required parameters', {
            hasRoomId: !!roomId,
            hasTemporaryId: !!temporaryId,
            hasNewMessage: !!newMessage
          });
        }
        return;
      }
      
      // Убеждаемся, что у сообщения есть обязательные поля
      if (!newMessage.id) {
        if (__DEV__) {
          console.warn('⚠️ updateOptimisticMessage: newMessage missing id', { newMessage });
        }
        return;
      }
      
      if (!newMessage.createdAt) {
        newMessage.createdAt = new Date().toISOString();
      }
      
      const bucket = state.messages[roomId];
      if (!bucket) return;
      
      // ✅ Ищем сообщение по temporaryId - оно может быть как ключом, так и полем
      let foundMessageKey = null;
      
      // Сначала проверяем, есть ли сообщение с ключом === temporaryId
      if (bucket.byId[temporaryId]) {
        foundMessageKey = temporaryId;
      } else {
        // Если нет, ищем по полю temporaryId
        for (const messageId of Object.keys(bucket.byId)) {
          const msg = bucket.byId[messageId];
          if (msg?.temporaryId === temporaryId) {
            foundMessageKey = messageId;
            break;
          }
        }
      }
      
      if (!foundMessageKey) {
        // Сообщение не найдено, возможно уже было обновлено
        if (__DEV__) {
          console.warn('⚠️ updateOptimisticMessage: Temporary message not found', { 
            temporaryId, 
            roomId,
            availableKeys: Object.keys(bucket.byId).slice(0, 5) 
          });
        }
        return;
      }
      
      // Проверяем, не существует ли уже серверное сообщение
      if (bucket.byId[newMessage.id]) {
        const existingServerMessage = bucket.byId[newMessage.id];
        const oldMessage = bucket.byId[foundMessageKey];
        
        // Для голосовых сообщений всегда сохраняем attachments из временного сообщения,
        // так как сервер может не вернуть их в HTTP ответе (они придут через WebSocket позже)
        const isVoiceMessage = newMessage.type === 'VOICE' || oldMessage?.type === 'VOICE';
        const hasTemporaryAttachments = oldMessage?.attachments && oldMessage.attachments.length > 0;
        // Для голосовых сообщений всегда обновляем attachments, если временное сообщение их имеет
        const needsAttachments = isVoiceMessage && hasTemporaryAttachments &&
          (!existingServerMessage.attachments || existingServerMessage.attachments.length === 0);
        // Также проверяем, нужно ли обновить сообщение в списке
        const needsListUpdate = !bucket.ids.includes(newMessage.id);
        
        if (needsAttachments) {
          // Обновляем серверное сообщение данными из временного
          bucket.byId[newMessage.id] = {
            ...existingServerMessage,
            ...newMessage,
            attachments: oldMessage.attachments, // Сохраняем attachments из временного
            id: newMessage.id,
            // Сохраняем temporaryId для стабильности keyExtractor
            temporaryId: oldMessage?.temporaryId,
            isOptimistic: false,
            status: newMessage.status || 'SENT'
          };
          
          // Убеждаемся, что серверное сообщение есть в списке ids
          if (!bucket.ids.includes(newMessage.id)) {
            bucket.ids.push(newMessage.id);
          }
          
          // Обновляем lastMessage если нужно
          if (state.rooms.byId[roomId]?.lastMessage?.id === newMessage.id ||
              state.rooms.byId[roomId]?.lastMessage?.temporaryId === temporaryId) {
            const createdAt = newMessage?.createdAt || existingServerMessage?.createdAt || new Date().toISOString();
            const roomUpdate = { 
              id: roomId, 
              updatedAt: createdAt, 
              lastMessage: bucket.byId[newMessage.id]
            };
            upsertRooms(state, [roomUpdate]);
          }
          
          // Сортируем сообщения после обновления
          bucket.ids.sort((a, b) => {
            const ma = bucket.byId[a];
            const mb = bucket.byId[b];
            const maTime = ma?.createdAt ? new Date(ma.createdAt).getTime() : 0;
            const mbTime = mb?.createdAt ? new Date(mb.createdAt).getTime() : 0;
            return mbTime - maTime;
          });
          
          updateMessageCache(roomId, bucket);
          
          if (__DEV__) {
            console.log('✅ updateOptimisticMessage: Updated server message with attachments from temporary', {
              temporaryId,
              serverId: newMessage.id,
              roomId,
              attachmentsCount: oldMessage.attachments?.length || 0
            });
          }
        } else {
          // Серверное сообщение уже есть, но нужно проверить attachments для голосовых
          // ВСЕГДА обновляем attachments для голосовых сообщений, если временное сообщение их имеет
          if (isVoiceMessage && hasTemporaryAttachments) {
            // Обновляем серверное сообщение attachments из временного
            bucket.byId[newMessage.id] = {
              ...existingServerMessage,
              ...newMessage,
              attachments: oldMessage.attachments, // ВСЕГДА используем attachments из временного
              temporaryId: oldMessage?.temporaryId, // Сохраняем для стабильности keyExtractor
              isOptimistic: false,
              status: newMessage.status || existingServerMessage.status || 'SENT'
            };
            
            if (__DEV__) {
              console.log('✅ updateOptimisticMessage: Updated server message attachments', {
                temporaryId,
                serverId: newMessage.id,
                roomId,
                attachmentsCount: oldMessage.attachments?.length || 0
              });
            }
          }
          
          // Убеждаемся, что серверное сообщение есть в списке
          if (!bucket.ids.includes(newMessage.id)) {
            bucket.ids.push(newMessage.id);
          }
          
          // Сортируем сообщения после обновления
          bucket.ids.sort((a, b) => {
            const ma = bucket.byId[a];
            const mb = bucket.byId[b];
            const maTime = ma?.createdAt ? new Date(ma.createdAt).getTime() : 0;
            const mbTime = mb?.createdAt ? new Date(mb.createdAt).getTime() : 0;
            return mbTime - maTime;
          });
          
          // Обновляем lastMessage для голосовых сообщений
          const currentLastMessage = state.rooms.byId[roomId]?.lastMessage;
          const shouldUpdateLastMessage = isVoiceMessage && (
            !currentLastMessage || 
            currentLastMessage?.id === newMessage.id ||
            currentLastMessage?.temporaryId === temporaryId ||
            new Date(newMessage.createdAt || 0) >= new Date(currentLastMessage.createdAt || 0)
          );
          
          if (shouldUpdateLastMessage) {
            const createdAt = newMessage?.createdAt || existingServerMessage?.createdAt || new Date().toISOString();
            const roomUpdate = { 
              id: roomId, 
              updatedAt: createdAt, 
              lastMessage: bucket.byId[newMessage.id]
            };
            upsertRooms(state, [roomUpdate]);
            
            if (__DEV__) {
              console.log('✅ updateOptimisticMessage: Updated lastMessage for voice', {
                roomId,
                messageId: newMessage.id
              });
            }
          }
          
          if (__DEV__) {
            console.log('✅ updateOptimisticMessage: Removed duplicate temporary message', {
              temporaryId,
              serverId: newMessage.id,
              roomId,
              isInIds: bucket.ids.includes(newMessage.id),
              hasAttachments: !!bucket.byId[newMessage.id]?.attachments?.length,
              updatedAttachments: isVoiceMessage && hasTemporaryAttachments
            });
          }
        }
        
        // Удаляем временное сообщение
        delete bucket.byId[foundMessageKey];
        const tempIndex = bucket.ids.indexOf(foundMessageKey);
        if (tempIndex >= 0) {
          bucket.ids.splice(tempIndex, 1);
        }
        
        // КРИТИЧНО: Убеждаемся, что серверное сообщение есть в списке после удаления временного
        if (!bucket.ids.includes(newMessage.id)) {
          bucket.ids.push(newMessage.id);
          // Сортируем сообщения
          bucket.ids.sort((a, b) => {
            const ma = bucket.byId[a];
            const mb = bucket.byId[b];
            const maTime = ma?.createdAt ? new Date(ma.createdAt).getTime() : 0;
            const mbTime = mb?.createdAt ? new Date(mb.createdAt).getTime() : 0;
            return mbTime - maTime;
          });
          
          if (__DEV__) {
            console.log('✅ updateOptimisticMessage: Added server message to ids after removing temporary', {
              messageId: newMessage.id,
              roomId,
              idsLength: bucket.ids.length
            });
          }
        }
        
        updateMessageCache(roomId, bucket);
        return;
      }
      
      const oldMessage = bucket.byId[foundMessageKey];
      
      // Для голосовых сообщений сохраняем attachments из временного сообщения,
      // если серверное сообщение не содержит attachments
      const shouldPreserveAttachments = newMessage.type === 'VOICE' && 
        (!newMessage.attachments || newMessage.attachments.length === 0) &&
        oldMessage.attachments && oldMessage.attachments.length > 0;
      
      const updatedMessage = {
        ...oldMessage,
        ...newMessage,
        id: newMessage.id,
        // Сохраняем attachments из временного сообщения, если серверное не содержит их
        attachments: shouldPreserveAttachments ? oldMessage.attachments : (newMessage.attachments || oldMessage.attachments),
        // Сохраняем temporaryId для стабильности keyExtractor в FlatList
        // Это позволит FlatList правильно обновить элемент при изменении ключа
        temporaryId: oldMessage.temporaryId,
        isOptimistic: false,
        status: newMessage.status || 'SENT'
      };
      
      if (__DEV__ && shouldPreserveAttachments) {
        console.log('✅ updateOptimisticMessage: Preserved attachments from temporary message', {
          temporaryId,
          newId: newMessage.id,
          attachmentsCount: oldMessage.attachments?.length || 0
        });
      }
      
      // ✅ Обновляем сообщение in-place для более плавного перехода
      // Если ключ изменился (temporaryId -> serverId), переносим данные
      if (foundMessageKey !== newMessage.id) {
        delete bucket.byId[foundMessageKey];
        bucket.byId[newMessage.id] = updatedMessage;
        
        // Заменяем ключ в массиве ids
        const tempIndex = bucket.ids.indexOf(foundMessageKey);
        if (tempIndex >= 0) {
          bucket.ids[tempIndex] = newMessage.id;
        } else {
          // Если временного сообщения не было в списке, добавляем серверное
          bucket.ids.push(newMessage.id);
        }
      } else {
        // Если ключ не изменился, просто обновляем данные
        bucket.byId[newMessage.id] = updatedMessage;
        // Убеждаемся, что сообщение есть в списке
        if (!bucket.ids.includes(newMessage.id)) {
          bucket.ids.push(newMessage.id);
        }
      }
      
      // КРИТИЧНО: Убеждаемся, что сообщение есть в списке ids
      if (!bucket.ids.includes(newMessage.id)) {
        bucket.ids.push(newMessage.id);
        if (__DEV__) {
          console.log('⚠️ updateOptimisticMessage: Message was not in ids, added it', {
            messageId: newMessage.id,
            roomId
          });
        }
      }
      
      // Сортируем сообщения после обновления
      bucket.ids.sort((a, b) => {
        const ma = bucket.byId[a];
        const mb = bucket.byId[b];
        const maTime = ma?.createdAt ? new Date(ma.createdAt).getTime() : 0;
        const mbTime = mb?.createdAt ? new Date(mb.createdAt).getTime() : 0;
        return mbTime - maTime;
      });
      
      if (__DEV__) {
        console.log('✅ updateOptimisticMessage: Message updated in list', {
          temporaryId,
          newId: newMessage.id,
          roomId,
          isInIds: bucket.ids.includes(newMessage.id),
          idsLength: bucket.ids.length,
          hasAttachments: !!updatedMessage.attachments?.length,
          messageIndex: bucket.ids.indexOf(newMessage.id)
        });
      }
      
      // Обновляем lastMessage - всегда обновляем для голосовых сообщений или если это последнее сообщение
      const currentLastMessage = state.rooms.byId[roomId]?.lastMessage;
      const shouldUpdateLastMessage = 
        currentLastMessage?.temporaryId === temporaryId || 
        currentLastMessage?.id === foundMessageKey ||
        currentLastMessage?.id === newMessage.id ||
        (newMessage.type === 'VOICE' && (!currentLastMessage || 
          new Date(updatedMessage.createdAt || newMessage.createdAt || 0) >= 
          new Date(currentLastMessage.createdAt || 0)));
      
      if (shouldUpdateLastMessage) {
        const createdAt = updatedMessage?.createdAt || newMessage?.createdAt || oldMessage?.createdAt || new Date().toISOString();
        const roomUpdate = { 
          id: roomId, 
          updatedAt: createdAt, 
          lastMessage: updatedMessage 
        };
        upsertRooms(state, [roomUpdate]);
        
        if (__DEV__) {
          console.log('✅ updateOptimisticMessage: Updated lastMessage', {
            roomId,
            messageId: newMessage.id,
            messageType: newMessage.type,
            hasAttachments: !!updatedMessage.attachments?.length
          });
        }
      }
      
      updateMessageCache(roomId, bucket);
      
      if (__DEV__) {
        console.log('✅ updateOptimisticMessage: Successfully updated', {
          temporaryId,
          newId: newMessage.id,
          roomId
        });
      }
    },
    receiveSocketMessage(state, action) {
      const { roomId, message, currentUserId } = action.payload || {};

      if (!roomId || !message) {
        return;
      }

      if (__DEV__) {
        console.log('📨 receiveSocketMessage:', {
          messageId: message.id,
          roomId,
          type: message.type,
          isOwnMessage: currentUserId && message.senderId === currentUserId,
          hasReplyTo: !!message.replyTo,
          replyToId: message.replyToId
        });
      }

      // Проверяем, не обрабатывали ли мы уже это сообщение
      const existingMessage = state.messages[roomId]?.byId?.[message.id];
      if (existingMessage) {
        // Сообщение уже существует - полностью игнорируем WebSocket сообщение
        // Это предотвращает перезапись сообщения, которое уже было обновлено через updateOptimisticMessage
        const bucket = state.messages[roomId];
        
        // КРИТИЧНО: Убеждаемся, что сообщение есть в списке ids
        if (bucket && !bucket.ids.includes(message.id)) {
          bucket.ids.push(message.id);
          bucket.ids.sort((a, b) => {
            const ma = bucket.byId[a];
            const mb = bucket.byId[b];
            const maTime = ma?.createdAt ? new Date(ma.createdAt).getTime() : 0;
            const mbTime = mb?.createdAt ? new Date(mb.createdAt).getTime() : 0;
            return mbTime - maTime;
          });
          
          if (__DEV__) {
            console.log('⚠️ receiveSocketMessage: Message was not in ids, added it', {
              messageId: message.id,
              roomId
            });
          }
        }
        
        if (__DEV__) {
          console.log('✅ receiveSocketMessage: Ignoring duplicate WebSocket message', {
            messageId: message.id,
            roomId,
            hasAttachments: !!existingMessage.attachments?.length,
            isInIds: bucket?.ids.includes(message.id) || false
          });
        }
        // Игнорируем дубликат
        return;
      }
      
      // Проверяем, не является ли это наше собственное сообщение, которое уже обработано через HTTP
      if (currentUserId && message.senderId === currentUserId) {
        const bucket = state.messages[roomId];
        if (!bucket) return;
        
        // Проверяем, есть ли уже сообщение с таким ID (обработанное через sendPoll.fulfilled, sendVoice.fulfilled или updateOptimisticMessage)
        const existingById = bucket.byId[message.id];
        if (existingById) {
          // Для собственных сообщений полностью игнорируем WebSocket, если сообщение уже существует
          // Это предотвращает перезапись сообщения, которое уже было обновлено через updateOptimisticMessage
          if (__DEV__) {
            console.log('✅ receiveSocketMessage: Ignoring WebSocket message for own message (already processed)', {
              messageId: message.id,
              roomId,
              type: message.type,
              hasPoll: !!existingById.poll,
              hasAttachments: !!existingById.attachments?.length,
              isOptimistic: existingById.isOptimistic,
              isInIds: bucket.ids.includes(message.id)
            });
          }
          return;
        }
        
        // КРИТИЧНО: Проверяем наличие оптимистичного (временного) сообщения
        // Если есть временное сообщение того же типа с похожим содержимым, НЕ добавляем WebSocket сообщение
        // Ждем пока sendText.fulfilled/sendImages.fulfilled/sendContact.fulfilled сами обработают замену
        const hasOptimisticMessage = bucket.ids.some(id => {
          const msg = bucket.byId[id];
          if (!msg?.isOptimistic) return false;
          
          // Проверяем соответствие по типу и контенту
          if (msg.type !== message.type) return false;
          
          // Для TEXT - проверяем content
          if (message.type === 'TEXT' && msg.content === message.content) {
            return true;
          }
          
          // Для CONTACT - проверяем по contactUserId
          if (message.type === 'CONTACT') {
            const msgContactUserId = msg.contactUserId || (msg.contact?.userId);
            const messageContactUserId = message.contactUserId || (message.contact?.userId);
            if (msgContactUserId && messageContactUserId && msgContactUserId === messageContactUserId) {
              return true;
            }
          }
          
          // Для других типов - проверяем совпадение по времени (в пределах 5 секунд)
          const msgTime = new Date(msg.createdAt).getTime();
          const receivedTime = new Date(message.createdAt).getTime();
          if (Math.abs(msgTime - receivedTime) < 5000) {
            return true;
          }
          
          return false;
        });
        
        if (hasOptimisticMessage) {
          if (__DEV__) {
            console.log('⏳ receiveSocketMessage: Waiting for fulfilled handler to process own message', {
              messageId: message.id,
              roomId,
              type: message.type
            });
          }
          return;
        }
        
        // Дополнительная проверка для опросов: ищем по temporaryId
        if (message.type === 'POLL' && message.temporaryId) {
          const foundByTemporaryId = bucket.ids.find(id => {
            const msg = bucket.byId[id];
            return msg?.temporaryId === message.temporaryId || 
                   (msg?.id === message.id && msg?.temporaryId);
          });
          
          if (foundByTemporaryId) {
            // Сообщение уже обработано через sendPoll.fulfilled
            if (__DEV__) {
              console.log('✅ receiveSocketMessage: Ignoring WebSocket poll message (already processed via sendPoll.fulfilled)', {
                messageId: message.id,
                temporaryId: message.temporaryId,
                roomId
              });
            }
            return;
          }
        }
        
        // Дополнительная проверка: ищем сообщения с temporaryId, которые могли быть обновлены
        if (message.temporaryId) {
          const foundByTemporaryId = bucket.ids.find(id => {
            const msg = bucket.byId[id];
            return msg?.temporaryId === message.temporaryId || 
                   (msg?.id === message.id && msg?.temporaryId);
          });
          
          if (foundByTemporaryId) {
            // Сообщение уже обработано через updateOptimisticMessage
            return;
          }
        }
        
        if (bucket) {
          let optimisticMessage = null;
          let optimisticMessageId = null;
          
          // Для текстовых сообщений ищем по content
          if (message.type === 'TEXT' && message.content) {
            optimisticMessage = bucket.ids
              .map(id => ({ id, msg: bucket.byId[id] }))
              .find(({ msg }) => 
                msg?.isOptimistic && 
                msg?.content === message.content &&
                msg?.type === message.type
              );
          }
          
          // Для опросов проверяем, не обновлено ли уже сообщение через sendPoll.fulfilled
          else if (message.type === 'POLL') {
            // Если сообщение уже существует с таким ID и не является оптимистичным, пропускаем
            if (bucket.byId[message.id] && !bucket.byId[message.id].isOptimistic) {
              // Сообщение уже обновлено через sendPoll.fulfilled
              if (__DEV__) {
                console.log('✅ receiveSocketMessage: Poll message already updated via sendPoll.fulfilled', {
                  messageId: message.id,
                  roomId
                });
              }
              return;
            }
            
            // Ищем оптимистичное сообщение по question
            if (message.poll?.question) {
              optimisticMessage = bucket.ids
                .map(id => ({ id, msg: bucket.byId[id] }))
                .find(({ msg }) => 
                  msg?.isOptimistic && 
                  msg?.type === 'POLL' &&
                  msg?.poll?.question === message.poll.question
                );
              
              if (optimisticMessage) {
                optimisticMessageId = optimisticMessage.id;
                optimisticMessage = optimisticMessage.msg;
              }
            }
          } 
          // Для голосовых сообщений ищем по типу и времени (близкое время создания - в пределах 5 секунд)
          else if (message.type === 'VOICE') {
            // Проверяем, не обновлено ли уже сообщение через updateOptimisticMessage
            // Если сообщение уже существует с таким ID и не является оптимистичным, пропускаем
            if (bucket.byId[message.id] && !bucket.byId[message.id].isOptimistic) {
              // Сообщение уже обновлено через updateOptimisticMessage
              if (__DEV__) {
                console.log('✅ receiveSocketMessage: Voice message already updated via updateOptimisticMessage', {
                  messageId: message.id,
                  roomId
                });
              }
              return;
            }
            
            if (!message.createdAt) {
              // Если нет createdAt, пропускаем поиск по времени
              return;
            }
            const messageTime = new Date(message.createdAt).getTime();
            const found = bucket.ids
              .map(id => ({ id, msg: bucket.byId[id] }))
              .find(({ msg }) => {
                if (!msg?.isOptimistic || msg?.type !== 'VOICE') return false;
                
                // Проверяем по temporaryId если есть
                if (msg.temporaryId && message.temporaryId && msg.temporaryId === message.temporaryId) {
                  return true;
                }
                
                // Или проверяем по времени создания (в пределах 5 секунд)
                const msgTime = new Date(msg.createdAt || msg.timestamp || 0).getTime();
                const timeDiff = Math.abs(messageTime - msgTime);
                return timeDiff < 5000; // 5 секунд
              });
            
            if (found) {
              optimisticMessageId = found.id;
              optimisticMessage = found.msg;
            }
          }
          // Для изображений ищем по типу и времени
          else if (message.type === 'IMAGE') {
            if (!message.createdAt) {
              // Если нет createdAt, пропускаем поиск по времени
              return;
            }
            const messageTime = new Date(message.createdAt).getTime();
            const found = bucket.ids
              .map(id => ({ id, msg: bucket.byId[id] }))
              .find(({ msg }) => {
                if (!msg?.isOptimistic || msg?.type !== 'IMAGE') return false;
                const msgTime = new Date(msg.createdAt || msg.timestamp || 0).getTime();
                const timeDiff = Math.abs(messageTime - msgTime);
                return timeDiff < 5000; // 5 секунд
              });
            
            if (found) {
              optimisticMessageId = found.id;
              optimisticMessage = found.msg;
            }
          }
          // Для контактов ищем по типу, temporaryId или contactUserId
          else if (message.type === 'CONTACT') {
            // Проверяем, не обновлено ли уже сообщение через sendContact.fulfilled
            if (bucket.byId[message.id] && !bucket.byId[message.id].isOptimistic) {
              // Сообщение уже обновлено через sendContact.fulfilled
              if (__DEV__) {
                console.log('✅ receiveSocketMessage: Contact message already updated via sendContact.fulfilled', {
                  messageId: message.id,
                  roomId
                });
              }
              return;
            }
            
            const contactUserId = message.contactUserId || (message.contact?.userId);
            const found = bucket.ids
              .map(id => ({ id, msg: bucket.byId[id] }))
              .find(({ msg }) => {
                if (!msg?.isOptimistic || msg?.type !== 'CONTACT') return false;
                
                // Проверяем по temporaryId если есть
                if (msg.temporaryId && message.temporaryId && msg.temporaryId === message.temporaryId) {
                  return true;
                }
                
                // Проверяем по contactUserId
                const msgContactUserId = msg.contactUserId || (msg.contact?.userId);
                if (contactUserId && msgContactUserId && contactUserId === msgContactUserId) {
                  // Также проверяем по времени (в пределах 5 секунд)
                  if (message.createdAt && msg.createdAt) {
                    const messageTime = new Date(message.createdAt).getTime();
                    const msgTime = new Date(msg.createdAt || msg.timestamp || 0).getTime();
                    const timeDiff = Math.abs(messageTime - msgTime);
                    return timeDiff < 5000; // 5 секунд
                  }
                  return true;
                }
                
                return false;
              });
            
            if (found) {
              optimisticMessageId = found.id;
              optimisticMessage = found.msg;
            }
          }
          
          if (optimisticMessage && optimisticMessageId) {
            // Для голосовых сообщений сохраняем attachments из оптимистичного сообщения
            const isVoiceMessage = message.type === 'VOICE' || optimisticMessage.type === 'VOICE';
            const hasOptimisticAttachments = optimisticMessage.attachments && optimisticMessage.attachments.length > 0;
            const shouldPreserveAttachments = isVoiceMessage && hasOptimisticAttachments &&
              (!message.attachments || message.attachments.length === 0);
            
            // Удаляем временное сообщение
            delete bucket.byId[optimisticMessageId];
            const tempIndex = bucket.ids.indexOf(optimisticMessageId);
            if (tempIndex >= 0) {
              bucket.ids.splice(tempIndex, 1);
            }
            
            // Добавляем серверное сообщение
            bucket.byId[message.id] = {
              ...optimisticMessage,
              ...message,
              // Сохраняем attachments из оптимистичного сообщения для голосовых
              attachments: shouldPreserveAttachments ? optimisticMessage.attachments : (message.attachments || optimisticMessage.attachments),
              // Сохраняем temporaryId для стабильности keyExtractor
              temporaryId: optimisticMessage.temporaryId,
              isOptimistic: false,
              status: message.status || 'SENT'
            };
            
            if (tempIndex >= 0) {
              bucket.ids.splice(tempIndex, 0, message.id);
            } else {
              bucket.ids.push(message.id);
            }
            
            // Сортируем сообщения после обновления
            bucket.ids.sort((a, b) => {
              const ma = bucket.byId[a];
              const mb = bucket.byId[b];
              const maTime = ma?.createdAt ? new Date(ma.createdAt).getTime() : 0;
              const mbTime = mb?.createdAt ? new Date(mb.createdAt).getTime() : 0;
              return mbTime - maTime;
            });
            
            // Обновляем lastMessage если это было последнее сообщение
            if (state.rooms.byId[roomId]?.lastMessage?.id === optimisticMessageId ||
                state.rooms.byId[roomId]?.lastMessage?.temporaryId === optimisticMessage?.temporaryId ||
                (isVoiceMessage && (!state.rooms.byId[roomId]?.lastMessage || 
                  new Date(message.createdAt || 0) >= new Date(state.rooms.byId[roomId]?.lastMessage?.createdAt || 0)))) {
              const createdAt = message?.createdAt || optimisticMessage?.createdAt || new Date().toISOString();
              const roomUpdate = { 
                id: roomId, 
                updatedAt: createdAt, 
                lastMessage: bucket.byId[message.id]
              };
              upsertRooms(state, [roomUpdate]);
            }
            
            updateMessageCache(roomId, bucket);
            
            if (__DEV__ && shouldPreserveAttachments) {
              console.log('✅ receiveSocketMessage: Preserved attachments from optimistic message', {
                messageId: message.id,
                roomId,
                attachmentsCount: optimisticMessage.attachments?.length || 0
              });
            }
            
            return;
          }
        }
      }

      // Обрабатываем информацию об отправителе для обогащения участников
      if (message.sender && message.senderId) {
        upsertParticipant(state, {
          userId: message.senderId,
          user: message.sender
        });
      }

      // Обновляем комнату с новым сообщением
      const createdAt = message?.createdAt || new Date().toISOString();
      
      // Для голосовых сообщений проверяем, есть ли уже сообщение с attachments
      const bucket = state.messages[roomId];
      if (bucket && message.type === 'VOICE' && bucket.byId[message.id]) {
        const existingMessage = bucket.byId[message.id];
        // Если существующее сообщение имеет attachments, сохраняем их
        if (existingMessage.attachments && existingMessage.attachments.length > 0 &&
            (!message.attachments || message.attachments.length === 0)) {
          message.attachments = existingMessage.attachments;
          message.temporaryId = existingMessage.temporaryId;
        }
        // Убеждаемся, что сообщение есть в списке
        if (!bucket.ids.includes(message.id)) {
          bucket.ids.push(message.id);
          bucket.ids.sort((a, b) => {
            const ma = bucket.byId[a];
            const mb = bucket.byId[b];
            const maTime = ma?.createdAt ? new Date(ma.createdAt).getTime() : 0;
            const mbTime = mb?.createdAt ? new Date(mb.createdAt).getTime() : 0;
            return mbTime - maTime;
          });
        }
      }
      
      const roomUpdate = { 
        id: roomId, 
        updatedAt: createdAt, 
        lastMessage: message 
      };
      upsertRooms(state, [roomUpdate]);
      
      // Обновляем сообщения в комнате
      ensureRoomBucket(state, roomId);
      upsertMessagesDesc(state.messages[roomId], [message]);

      // Обновляем кэш
      updateMessageCache(roomId, state.messages[roomId]);

      // Увеличиваем счетчик непрочитанных если:
      // - комната не активна
      // - сообщение не от текущего пользователя
      // - STOP-сообщение видимо для пользователя (не из чужого района, не просрочено)
      const isOwnMessage = currentUserId && (message.senderId === currentUserId || Number(message.senderId) === Number(currentUserId));

      if (state.activeRoomId !== roomId && !isOwnMessage) {
        const messageTime = new Date(message.createdAt).getTime();
        const shouldIncrement = !state.lastRoomsFetchTime || messageTime > state.lastRoomsFetchTime;

        if (shouldIncrement) {
          const userDistrictIds = action.payload?.userDistrictIds || [];
          const msgType = String(message.type || '').toUpperCase();
          let isVisible = true;

          if (msgType === 'STOP') {
            let stopData = message.stop || null;
            if (!stopData && message.content && typeof message.content === 'string') {
              try { stopData = JSON.parse(message.content); } catch (e) { stopData = null; }
            }

            if (stopData) {
              const stopStatus = String(stopData.status || '').toUpperCase();
              const isDeleted = Boolean(
                stopData.isDeleted || stopData.deletedAt || stopData.cancelledAt ||
                stopStatus === 'CANCELLED' || stopStatus === 'CANCELED' || stopStatus === 'DELETED'
              );
              if (isDeleted) {
                isVisible = false;
              }

              const endTime = stopData.endTime || stopData.startTime || null;
              if (endTime) {
                const endMs = new Date(endTime).getTime();
                if (Number.isFinite(endMs) && endMs < Date.now()) {
                  isVisible = false;
                }
              }

              if (isVisible && userDistrictIds.length > 0) {
                const stopDistrictId = stopData.districtId;
                if (!stopDistrictId) {
                  isVisible = false;
                } else {
                  const normalizedStopId = typeof stopDistrictId === 'string'
                    ? parseInt(stopDistrictId, 10) : stopDistrictId;
                  isVisible = userDistrictIds.some(id => {
                    const n = typeof id === 'string' ? parseInt(id, 10) : id;
                    return n === normalizedStopId;
                  });
                }
              }

              if (__DEV__) {
                console.log('[slice] STOP unread check', {
                  roomId,
                  isVisible,
                  userDistrictIds,
                  stopDistrictId: stopData.districtId,
                  isDeleted,
                  endTime,
                });
              }
            }
          }

          if (isVisible) {
            const oldUnread = state.unreadByRoomId[roomId] || 0;
            state.unreadByRoomId[roomId] = oldUnread + 1;
          }
        }
      }

      // Принудительно пересортировываем комнаты по времени последнего сообщения
      state.rooms.ids.sort((a, b) => {
        const ra = state.rooms.byId[a];
        const rb = state.rooms.byId[b];
        const ta = (ra?.updatedAt || ra?.lastMessage?.createdAt || 0);
        const tb = (rb?.updatedAt || rb?.lastMessage?.createdAt || 0);
        return new Date(tb) - new Date(ta);
      });
    },

    receiveMessage(state, action) {
      const { roomId, message } = action.payload || {};

      if (!roomId || !message) {
        return;
      }

      // Обрабатываем информацию об отправителе для обогащения участников
      if (message.sender && message.senderId) {
        upsertParticipant(state, {
          userId: message.senderId,
          user: message.sender
        });
      }

      // Добавляем сообщение в хранилище сообщений комнаты
      if (!state.messages[roomId]) {
        state.messages[roomId] = { ids: [], byId: {} };
      }

      const bucket = state.messages[roomId];
      if (bucket) {
        // Если сообщение уже существует, обновляем его
        if (bucket.byId[message.id]) {
          bucket.byId[message.id] = { ...bucket.byId[message.id], ...message };
        } else {
          // Добавляем новое сообщение
          bucket.ids.push(message.id);
          bucket.byId[message.id] = message;

          // Ограничиваем количество сообщений в памяти
          if (bucket.ids.length > 50) {
            const oldestId = bucket.ids.shift();
            delete bucket.byId[oldestId];
          }
        }

        // Обновляем кэш сообщений
        updateMessageCache(roomId, bucket);
      }
    },

    updatePollInMessage(state, action) {
      const { messageId, roomId, poll } = action.payload || {};
      
      if (!messageId || !roomId || !poll) {
        return;
      }
      
      const bucket = state.messages[roomId];
      if (!bucket) return;
      
      const message = bucket.byId[messageId];
      if (message) {
        // Обновляем опрос в сообщении
        message.poll = poll;
        // Обновляем кэш
        updateMessageCache(roomId, bucket);
      }
    },

    receiveMessageUpdated(state, action) {
      const { roomId, message } = action.payload || {};

      if (!roomId || !message?.id) {
        return;
      }

      ensureRoomBucket(state, roomId);
      const bucket = state.messages[roomId];

      const existing = bucket.byId[message.id];
      bucket.byId[message.id] = { ...(existing || {}), ...message };
      if (!bucket.ids.includes(message.id)) {
        bucket.ids.push(message.id);
      }

      const room = state.rooms.byId[roomId];
      if (room?.lastMessage?.id === message.id) {
        room.lastMessage = { ...(room.lastMessage || {}), ...message };
      }

      updateMessageCache(roomId, bucket);
    },
    
    receiveMessageDeleted(state, action) {
      const { roomId, messageId, forAll } = action.payload || {};
      
      if (__DEV__) {
        console.log('🔍 receiveMessageDeleted: Starting deletion', {
          roomId,
          messageId,
          messageIdType: typeof messageId,
          forAll,
          payload: action.payload
        });
      }
      
      if (!roomId || !messageId) {
        if (__DEV__) {
          console.warn('⚠️ receiveMessageDeleted: Missing roomId or messageId', { roomId, messageId });
        }
        return;
      }

      // Нормализуем messageId (может быть число или строка) — нужно до проверки bucket
      const normalizedMessageId = String(messageId);
      const numericMessageId = Number(messageId);

      const clearRoomLastMessageIfMatches = () => {
        const room = state.rooms.byId[roomId];
        if (!room?.lastMessage) return;
        const lm = room.lastMessage;
        const lastMsgId = String(lm.id ?? '');
        const lastMsgTemporaryId = String(lm.temporaryId ?? '');
        const matches =
          lastMsgId === normalizedMessageId ||
          (!isNaN(Number(lm.id)) && Number(lm.id) === numericMessageId) ||
          lastMsgTemporaryId === normalizedMessageId ||
          lm.id === messageId;
        if (matches) {
          delete room.lastMessage;
        }
      };

      const bumpUnreadDownOnDelete = () => {
        if (forAll === false) return;
        const u = state.unreadByRoomId[roomId] || 0;
        if (u > 0) {
          state.unreadByRoomId[roomId] = u - 1;
        }
      };

      const bucket = state.messages[roomId];
      if (!bucket) {
        if (__DEV__) {
          console.warn('⚠️ receiveMessageDeleted: Bucket not found — правим lastMessage/unread', { roomId });
        }
        const unreadBefore = state.unreadByRoomId[roomId];
        const hadLast = !!state.rooms.byId[roomId]?.lastMessage;
        clearRoomLastMessageIfMatches();
        bumpUnreadDownOnDelete();
        if (__DEV__) {
          console.log('[ChatBadgeDebug][receiveMessageDeleted]', {
            branch: 'noBucket',
            roomId,
            messageId,
            forAll,
            hadLastMessageBefore: hadLast,
            hasLastMessageAfter: !!state.rooms.byId[roomId]?.lastMessage,
            unreadBefore,
            unreadAfter: state.unreadByRoomId[roomId],
          });
        }
        return;
      }
      
      // Ищем сообщение по ID (может быть как serverId, так и temporaryId)
      let foundMessageKey = null;
      let foundMessage = null;
      
      // Сначала проверяем по serverId (как строка и как число)
      if (bucket.byId[normalizedMessageId]) {
        foundMessageKey = normalizedMessageId;
        foundMessage = bucket.byId[normalizedMessageId];
      } else if (!isNaN(numericMessageId) && bucket.byId[numericMessageId]) {
        foundMessageKey = numericMessageId;
        foundMessage = bucket.byId[numericMessageId];
      } else {
        // Если не найдено, ищем по temporaryId и id в сообщениях
        for (const id of bucket.ids) {
          const msg = bucket.byId[id];
          if (!msg) continue;
          
          // Проверяем по id (нормализуем для сравнения)
          const msgId = String(msg.id || '');
          const msgNumericId = Number(msg.id);
          
          // Проверяем по temporaryId
          const msgTemporaryId = String(msg.temporaryId || '');
          
          if (msgId === normalizedMessageId || 
              (!isNaN(msgNumericId) && msgNumericId === numericMessageId) ||
              msgTemporaryId === normalizedMessageId ||
              msg.id === messageId) {
            foundMessageKey = id;
            foundMessage = msg;
            break;
          }
        }
      }
      
      if (!foundMessageKey || !foundMessage) {
        // Сообщение не найдено в bucket (уже убрано), но lastMessage/unread могли остаться
        if (__DEV__) {
          console.warn('⚠️ receiveMessageDeleted: Message not found', {
            messageId,
            normalizedMessageId,
            numericMessageId,
            roomId,
            totalMessages: bucket.ids.length,
            availableIds: bucket.ids.slice(0, 10).map(id => ({
              id,
              type: typeof id,
              msgId: bucket.byId[id]?.id,
              msgTemporaryId: bucket.byId[id]?.temporaryId
            }))
          });
        }
        const unreadBeforeNf = state.unreadByRoomId[roomId];
        const hadLastNf = !!state.rooms.byId[roomId]?.lastMessage;
        clearRoomLastMessageIfMatches();
        bumpUnreadDownOnDelete();
        if (__DEV__) {
          console.log('[ChatBadgeDebug][receiveMessageDeleted]', {
            branch: 'messageNotInBucket',
            roomId,
            messageId,
            forAll,
            hadLastMessageBefore: hadLastNf,
            hasLastMessageAfter: !!state.rooms.byId[roomId]?.lastMessage,
            unreadBefore: unreadBeforeNf,
            unreadAfter: state.unreadByRoomId[roomId],
            bucketSize: bucket.ids.length,
          });
        }
        return;
      }
      
      if (__DEV__) {
        console.log('✅ receiveMessageDeleted: Message found', {
          messageId,
          foundMessageKey,
          foundMessageId: foundMessage.id,
          foundTemporaryId: foundMessage.temporaryId,
          roomId,
          forAll
        });
      }
      
      // Если forAll === false, просто скрываем сообщение для текущего пользователя
      // Но для WebSocket событий обычно forAll === true (удаление для всех)
      if (forAll === false) {
        if (!foundMessage.hiddenForUserIds) {
          foundMessage.hiddenForUserIds = [];
        }
        // Сообщение скрыто, но не удалено - селектор отфильтрует его
        // Обновляем кэш, чтобы сохранить состояние скрытия
        updateMessageCache(roomId, bucket);
        
        if (__DEV__) {
          console.log('✅ receiveMessageDeleted: Message hidden (forAll=false)', {
            messageId,
            foundMessageKey
          });
        }
        return;
      }
      
      // Удаляем сообщение из store (forAll === true или не указано)
      // Удаляем из byId
      delete bucket.byId[foundMessageKey];
      
      // Удаляем из ids - создаем новый массив для правильного обновления state
      const initialIdsLength = bucket.ids.length;
      const filteredIds = bucket.ids.filter(id => {
        // Сравниваем как строки и как числа
        const idStr = String(id);
        const idNum = Number(id);
        const foundKeyStr = String(foundMessageKey);
        const foundKeyNum = Number(foundMessageKey);
        
        // Исключаем найденный ключ всеми способами
        return idStr !== normalizedMessageId && 
               idStr !== foundKeyStr &&
               id !== foundMessageKey &&
               (!isNaN(idNum) && !isNaN(numericMessageId) ? idNum !== numericMessageId : true) &&
               (!isNaN(idNum) && !isNaN(foundKeyNum) ? idNum !== foundKeyNum : true);
      });
      
      // Присваиваем новый массив для правильного обновления state в Immer
      bucket.ids = filteredIds;
      
      // Проверяем, что сообщение действительно удалено
      const stillExists = bucket.byId[foundMessageKey] || bucket.ids.includes(foundMessageKey);
      
      if (__DEV__) {
        console.log('✅ receiveMessageDeleted: Message removed from store', {
          messageId,
          foundMessageKey,
          initialIdsLength,
          finalIdsLength: bucket.ids.length,
          removed: initialIdsLength - bucket.ids.length,
          stillExists,
          stillInById: !!bucket.byId[foundMessageKey],
          stillInIds: bucket.ids.includes(foundMessageKey)
        });
        
        if (stillExists) {
          console.error('❌ receiveMessageDeleted: Message still exists after deletion!', {
            messageId,
            foundMessageKey,
            bucketIds: bucket.ids.slice(0, 5)
          });
        }
      }
      
      // Обновляем lastMessage в комнате, если удаленное сообщение было последним
      const room = state.rooms.byId[roomId];
      if (room?.lastMessage) {
        const lastMsgId = String(room.lastMessage.id || '');
        const lastMsgTemporaryId = String(room.lastMessage.temporaryId || '');
        const wasLastMessage = lastMsgId === normalizedMessageId || 
                               lastMsgId === String(foundMessageKey) ||
                               lastMsgTemporaryId === normalizedMessageId ||
                               room.lastMessage.id === messageId ||
                               room.lastMessage.id === foundMessageKey ||
                               room.lastMessage.temporaryId === messageId;
        
        if (wasLastMessage) {
          // Находим новое последнее сообщение
          const remainingMessages = bucket.ids
            .map(id => bucket.byId[id])
            .filter(Boolean)
            .sort((a, b) => {
              const maTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
              const mbTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
              return mbTime - maTime;
            });

          if (remainingMessages.length > 0) {
            room.lastMessage = remainingMessages[0];
            room.updatedAt = remainingMessages[0].createdAt || new Date().toISOString();
          } else {
            delete room.lastMessage;
            room.updatedAt = room.createdAt || new Date().toISOString();
          }
          
          if (__DEV__) {
            console.log('✅ receiveMessageDeleted: Updated lastMessage', {
              newLastMessageId: room.lastMessage?.id,
              remainingCount: remainingMessages.length
            });
          }
        }
      }
      
      // Обновляем кэш сообщений (удаляем удаленное сообщение из кэша)
      updateMessageCache(roomId, bucket);
      
      // Удаляем сообщение из кэша асинхронно
      if (forAll && foundMessage?.id) {
        chatCacheService.removeMessageFromCache(roomId, foundMessage.id).catch((error) => {
          if (__DEV__) {
            console.warn('⚠️ receiveMessageDeleted: Failed to remove message from cache', error);
          }
        });
      }
      
      if (__DEV__) {
        console.log('✅ receiveMessageDeleted: Message deletion complete', {
          messageId,
          foundMessageKey,
          roomId,
          forAll,
          finalBucketSize: bucket.ids.length
        });
      }
    },
    updateMessageReactions(state, action) {
      const { messageId, reactions } = action.payload || {};

      if (!messageId) {
        if (__DEV__) {
          console.error('❌ updateMessageReactions: No messageId provided', action.payload);
        }
        return;
      }

      if (__DEV__) {
        console.log('📥 updateMessageReactions: STARTING', {
          messageId,
          reactionsReceived: reactions,
          reactionsCount: reactions?.length || 0,
          availableRooms: Object.keys(state.messages || {}),
          stateMessagesKeys: Object.keys(state.messages || {})
        });
      }

      let foundInAnyRoom = false;

      // Обновляем реакции во всех комнатах где есть это сообщение
      Object.keys(state.messages || {}).forEach((roomId) => {
        const roomMessages = state.messages[roomId];
        if (!roomMessages) {
          if (__DEV__) {
            console.warn('⚠️ updateMessageReactions: No roomMessages for roomId', roomId);
          }
          return;
        }

        if (roomMessages?.byId?.[messageId]) {
          foundInAnyRoom = true;
          const oldMessage = roomMessages.byId[messageId];
          
          if (__DEV__) {
            console.log('🔍 updateMessageReactions: Found message in room', {
              messageId,
              roomId,
              oldReactionsCount: oldMessage.reactions?.length || 0,
              oldReactions: oldMessage.reactions
            });
          }
          
          // Создаем новый объект сообщения чтобы триггернуть перерисовку
          // ВАЖНО: Создаем полностью новый объект, чтобы React увидел изменение
          // ВАЖНО: Сервер является источником правды - всегда используем реакции от сервера
          const reactionsTimestamp = Date.now();
          
          // Нормализуем реакции: убеждаемся, что все поля присутствуют
          const normalizedReactions = Array.isArray(reactions) 
            ? reactions.map(r => ({
                id: r.id,
                emoji: r.emoji,
                userId: r.userId,
                createdAt: r.createdAt,
                user: r.user || { id: r.userId }
              }))
            : [];
          
          const updatedMessage = {
            ...oldMessage,
            reactions: normalizedReactions, // Всегда используем реакции от сервера
            _reactionsUpdated: reactionsTimestamp // timestamp для гарантированного обновления
          };
          
          // Обновляем сообщение в byId - создаем новый объект для гарантированного обновления
          const newById = {
            ...roomMessages.byId,
            [messageId]: updatedMessage
          };
          
          // Создаем новый массив ids чтобы селектор вернул новый массив сообщений
          const newIds = [...roomMessages.ids];
          
          // Обновляем bucket полностью новым объектом для гарантированного обновления селектора
          state.messages[roomId] = {
            ...roomMessages,
            byId: newById,
            ids: newIds
          };
          
          if (__DEV__) {
            const finalMessage = state.messages[roomId]?.byId?.[messageId];
            console.log('✅ updateMessageReactions: Message updated in Redux', {
              messageId,
              roomId,
              oldReactionsCount: oldMessage.reactions?.length || 0,
              newReactionsCount: normalizedReactions?.length || 0,
              newReactions: normalizedReactions,
              oldReactions: oldMessage.reactions,
              timestamp: finalMessage?._reactionsUpdated,
              messageUpdated: oldMessage !== finalMessage,
              idsArrayUpdated: true,
              bucketUpdated: state.messages[roomId] !== roomMessages,
              finalReactionsInState: finalMessage?.reactions
            });
          }
        } else {
          if (__DEV__) {
            console.log('🔍 updateMessageReactions: Message not found in room', {
              messageId,
              roomId,
              availableMessageIds: Object.keys(roomMessages?.byId || {}).slice(0, 10)
            });
          }
        }
      });

      if (!foundInAnyRoom && __DEV__) {
        console.error('❌ updateMessageReactions: Message not found in any room', {
          messageId,
          availableRooms: Object.keys(state.messages || {}),
          roomsInfo: Object.keys(state.messages || {}).map(roomId => ({
            roomId,
            messageCount: state.messages[roomId]?.ids?.length || 0,
            messageIds: state.messages[roomId]?.ids?.slice(0, 5) || []
          }))
        });
      }
    },
    updateMessageStatus(state, action) {
      const { roomId, messageId, status, deliveredAt, readAt } = action.payload || {};

      if (!roomId || !messageId || !status) return;

      const roomMessages = state.messages[roomId];
      if (roomMessages?.byId?.[messageId]) {
        const message = roomMessages.byId[messageId];

        // Обновляем статус и временные метки
        message.status = status;
        if (deliveredAt) message.deliveredAt = deliveredAt;
        if (readAt) message.readAt = readAt;

        // Обновляем кэш сообщений
        updateMessageCache(roomId, roomMessages);
      }

      // Если это последнее сообщение в комнате, обновляем его статус в списке чатов
      const room = state.rooms.byId[roomId];
      if (room?.lastMessage?.id === messageId) {
        room.lastMessage = {
          ...room.lastMessage,
          status,
          deliveredAt: deliveredAt || room.lastMessage.deliveredAt,
          readAt: readAt || room.lastMessage.readAt
        };
      }
    },
    updateUserOnlineStatus(state, action) {
      const { userId, lastSeenAt } = action.payload || {};

      if (!userId) return;

      if (state.participants.byUserId[userId]) {
        state.participants.byUserId[userId].lastSeenAt = lastSeenAt;
      }
    },
    hydrateRooms(state, action) {
      const rooms = action.payload?.rooms || [];
      if (!Array.isArray(rooms) || rooms.length === 0) return;
      upsertRooms(state, rooms);
    },
    updateRoomFromSocket(state, action) {
      const room = action.payload;
      if (room && room.id) {
        upsertRooms(state, [room]);
      }
    },
    hydrateRoomMessages(state, action) {
      const { roomId, messages } = action.payload || {};
      if (!roomId || !Array.isArray(messages) || messages.length === 0) return;
      ensureRoomBucket(state, roomId);
      
      // Если в Redux уже есть сообщения, добавляем только новые
      const existingIds = new Set(state.messages[roomId].ids);
      const newMessages = messages.filter(msg => {
        const msgId = msg?.id || msg?.temporaryId;
        return msgId && !existingIds.has(msgId);
      });
      
      // Добавляем только новые сообщения
      if (newMessages.length > 0) {
        upsertMessagesDesc(state.messages[roomId], newMessages);
      }
      
      state.messages[roomId].cursorId = state.messages[roomId].ids.length
          ? state.messages[roomId].ids[state.messages[roomId].ids.length - 1]
          : null;
    },
    setConnectionStatus(state, action) {
      const { isConnected, transport, reconnectAttempts } = action.payload || {};
      state.connection.isConnected = !!isConnected;
      state.connection.transport = transport || null;
      state.connection.reconnectAttempts = reconnectAttempts || 0;
      
      if (isConnected) {
        state.connection.lastConnected = new Date().toISOString();
      } else {
        state.connection.lastDisconnected = new Date().toISOString();
      }
    },
    handleRoomDeleted(state, action) {
      const { roomId } = action.payload || {};
      
      if (!roomId) return;
      
      console.log('🗑️ [REDUX] Processing room deletion:', { roomId });
      
      // Добавляем в список удаленных комнат
      if (!state.deletedRoomIds.includes(roomId)) {
        state.deletedRoomIds.push(roomId);
      }
      
      // Удаляем комнату из списка
      delete state.rooms.byId[roomId];
      state.rooms.ids = state.rooms.ids.filter(id => id !== roomId);
      
      // Удаляем сообщения комнаты
      delete state.messages[roomId];
      
      // Удаляем счетчики непрочитанных
      delete state.unreadByRoomId[roomId];
      
      // Удаляем индикатор печати
      delete state.typingByRoomId[roomId];
      
      // Если это была активная комната, очищаем
      if (state.activeRoomId === roomId) {
        state.activeRoomId = null;
      }
      
      // Очищаем кэш сообщений
      try {
        chatCacheService.clearRoomCache(roomId);
      } catch (e) {
        console.error('Error clearing room messages cache:', e);
      }
    },
  },
  extraReducers: (builder) => {
    builder
        .addCase(loadRoomsCache.fulfilled, (state, action) => {
          const { rooms } = action.payload || {};
          upsertRooms(state, rooms || []);
        })
        .addCase(loadRoomMessagesCache.fulfilled, (state, action) => {
          const { roomId, messages } = action.payload || {};
          ensureRoomBucket(state, roomId);
          upsertMessagesDesc(state.messages[roomId], messages || []);
          state.messages[roomId].cursorId = state.messages[roomId].ids.length
              ? state.messages[roomId].ids[state.messages[roomId].ids.length - 1]
              : null;
        })
        .addCase(fetchRooms.pending, (state, action) => {
          state.rooms.loading = true;
          state.rooms.error = null;
          // Сохраняем время начала запроса — сообщения, пришедшие по WebSocket ПОСЛЕ
          // этого момента, точно не были учтены сервером в ответе fetchRooms.
          if (action.meta?.arg?.page === 1 || !action.meta?.arg?.page) {
            state.lastRoomsFetchTime = Date.now();
          }
        })
        .addCase(fetchRooms.fulfilled, (state, action) => {
          const { rooms, page, hasMore } = action.payload;
          if (page === 1) {
            state.rooms.ids = [];
            state.rooms.byId = {};
            state.avatarFetchAttemptedByRoomId = {};
          }

          if (rooms && Array.isArray(rooms)) {
            rooms.forEach(room => {
              if (!room.id) return;
              const serverUnread = room.unreadCount ?? room.unread ?? 0;
              // page 1: перезаписываем счётчик с сервера (устраняет «зависший» unread в Redux).
              // Иначе значение задаётся только при undefined и никогда не синхронизируется.
              if (page === 1) {
                state.unreadByRoomId[room.id] = serverUnread;
              } else if (state.unreadByRoomId[room.id] === undefined) {
                state.unreadByRoomId[room.id] = serverUnread;
              }
            });
          }

          upsertRooms(state, rooms || []);
          state.rooms.page = page;
          state.rooms.hasMore = !!hasMore;
          state.rooms.loading = false;
        })
        .addCase(fetchRooms.rejected, (state, action) => {
          state.rooms.loading = false;
          state.rooms.error = action.payload || 'Не удалось загрузить чаты';
        })
        .addCase(fetchRoom.pending, (state) => {
          state.rooms.loading = true;
          state.rooms.error = null;
        })
        .addCase(fetchRoom.fulfilled, (state, action) => {
          const { room } = action.payload;
          if (room && room.id) {
            if (Array.isArray(room?.participants)) {
              for (const p of room.participants) {
                upsertParticipant(state, p);
              }
            }

            state.rooms.byId[room.id] = { ...(state.rooms.byId[room.id] || {}), ...room };
            if (!state.rooms.ids.includes(room.id)) {
              state.rooms.ids.push(room.id);
            }
          }
          state.rooms.loading = false;
        })
        .addCase(fetchRoom.rejected, (state, action) => {
          state.rooms.loading = false;
          const payload = action.payload;
          const errorMessage = typeof payload === 'string' ? payload : (payload?.message || 'Не удалось загрузить комнату');
          state.rooms.error = errorMessage;
          
          // Если комната не найдена (404), помечаем её как удаленную
          if (payload?.isNotFound && payload?.roomId) {
            const roomId = payload.roomId;
            if (!state.deletedRoomIds.includes(roomId)) {
              state.deletedRoomIds.push(roomId);
            }
            // Очищаем данные комнаты
            delete state.rooms.byId[roomId];
            state.rooms.ids = state.rooms.ids.filter(id => id !== roomId);
            delete state.messages[roomId];
            delete state.unreadByRoomId[roomId];
            delete state.typingByRoomId[roomId];
            // Если это была активная комната, очищаем
            if (state.activeRoomId === roomId) {
              state.activeRoomId = null;
            }
          }
        })
        .addCase(fetchMessages.pending, (state, action) => {
          const { roomId } = action.meta.arg;
          ensureRoomBucket(state, roomId);
          state.messages[roomId].loading = true;
          state.messages[roomId].error = null;
        })
        .addCase(fetchMessages.fulfilled, (state, action) => {
          const { roomId, messages, hasMore } = action.payload;
          ensureRoomBucket(state, roomId);
          
          // Удаляем временные сообщения (только с temporaryId, без реального ID)
          // перед добавлением сообщений с сервера
          if (messages && Array.isArray(messages) && messages.length > 0) {
            const realMessageIds = new Set(messages.map(m => m.id).filter(Boolean));
            const idsToRemove = [];
            
            state.messages[roomId].ids.forEach(id => {
              const msg = state.messages[roomId].byId[id];
              // Удаляем временные сообщения, которые теперь имеют реальные ID
              if (msg && (!msg.id || msg.id !== id || msg.temporaryId)) {
                // Если у временного сообщения теперь есть реальный ID в новых сообщениях
                if (msg.temporaryId && realMessageIds.has(msg.id)) {
                  idsToRemove.push(id);
                }
                // Также удаляем временные сообщения без ID
                else if (!msg.id || msg.id !== id) {
                  idsToRemove.push(id);
                }
              }
            });
            
            // Удаляем найденные временные сообщения
            idsToRemove.forEach(id => {
              delete state.messages[roomId].byId[id];
              const index = state.messages[roomId].ids.indexOf(id);
              if (index >= 0) {
                state.messages[roomId].ids.splice(index, 1);
              }
            });
          }
          
          // Обновляем сообщения с новыми статусами
          if (messages && Array.isArray(messages)) {
            messages.forEach(newMessage => {
              const existingMessage = state.messages[roomId].byId[newMessage.id];
              if (existingMessage) {
                // Обновляем статус если он изменился
                if (newMessage.status && newMessage.status !== existingMessage.status) {
                  existingMessage.status = newMessage.status;
                  existingMessage.deliveredAt = newMessage.deliveredAt;
                  existingMessage.readAt = newMessage.readAt;
                }
              }
            });
          }
          
          upsertMessagesDesc(state.messages[roomId], messages || []);
          state.messages[roomId].hasMore = !!hasMore;
          const ids = state.messages[roomId].ids;
          state.messages[roomId].cursorId = ids.length ? ids[ids.length - 1] : null;
          state.messages[roomId].loading = false;
        })
        .addCase(fetchMessages.rejected, (state, action) => {
          const { roomId } = action.meta.arg;
          const payload = action.payload;
          
          // Проверяем, является ли ошибка 404 (комната не найдена/удалена)
          const isNotFound = typeof payload === 'object' && payload?.isNotFound ||
                             (typeof payload === 'string' && (
                               payload.includes('404') ||
                               payload.includes('не найдена') ||
                               payload.includes('not found')
                             ));
          
          // Если комната не найдена (404), помечаем её как удаленную
          if (isNotFound && roomId) {
            if (!state.deletedRoomIds.includes(roomId)) {
              state.deletedRoomIds.push(roomId);
            }
            // Очищаем данные комнаты
            delete state.rooms.byId[roomId];
            state.rooms.ids = state.rooms.ids.filter(id => id !== roomId);
            delete state.messages[roomId];
            delete state.unreadByRoomId[roomId];
            delete state.typingByRoomId[roomId];
            // Если это была активная комната, очищаем
            if (state.activeRoomId === roomId) {
              state.activeRoomId = null;
            }
            return;
          }
          
          ensureRoomBucket(state, roomId);
          state.messages[roomId].loading = false;
          state.messages[roomId].error = typeof payload === 'string' ? payload : (payload?.message || 'Не удалось загрузить сообщения');
        })
        .addCase(sendText.fulfilled, (state, action) => {
          const payload = action.payload;
          const message = payload?.message || payload;
          const temporaryId = payload?.temporaryId || action.meta?.arg?.temporaryId;
          const roomId = message?.roomId;
          
          if (!roomId || !message) return;
          
          ensureRoomBucket(state, roomId);
          
          if (__DEV__) {
            console.log('📩 sendText.fulfilled:', {
              messageId: message.id,
              temporaryId,
              roomId,
              hasReplyTo: !!message.replyTo,
              replyToId: message.replyToId
            });
          }
          
          // Проверяем, не существует ли уже сообщение с таким id (пришло через WebSocket)
          const messageAlreadyExists = state.messages[roomId].byId[message.id];
          
          // Если использовались оптимистичные обновления, находим и удаляем временное сообщение
          if (temporaryId && state.messages[roomId]) {
            let foundMessageKey = null;
            
            // Сначала пробуем найти напрямую по temporaryId как ключу
            if (state.messages[roomId].byId[temporaryId]) {
              foundMessageKey = temporaryId;
            } else {
              // Если не найдено, ищем по полю temporaryId
              for (const messageId of state.messages[roomId].ids) {
                const msg = state.messages[roomId].byId[messageId];
                if (msg?.temporaryId === temporaryId) {
                  foundMessageKey = messageId;
                  break;
                }
              }
            }
            
            if (foundMessageKey) {
              if (__DEV__) {
                console.log('🗑️ sendText.fulfilled: Removing temporary message', {
                  temporaryId: foundMessageKey,
                  messageAlreadyExists
                });
              }
              
              // Удаляем временное сообщение
              delete state.messages[roomId].byId[foundMessageKey];
              const tempIndex = state.messages[roomId].ids.indexOf(foundMessageKey);
              if (tempIndex >= 0) {
                state.messages[roomId].ids.splice(tempIndex, 1);
              }
              
              // Если сообщение уже пришло через WebSocket, просто удаляем временное и выходим
              if (messageAlreadyExists) {
                if (__DEV__) {
                  console.log('✅ sendText.fulfilled: Message already exists via WebSocket, skipping add');
                }
                
                // Обновляем lastMessage если нужно
                if (state.rooms.byId[roomId]?.lastMessage?.temporaryId === temporaryId || 
                    state.rooms.byId[roomId]?.lastMessage?.id === foundMessageKey) {
                  const createdAt3 = message?.createdAt || new Date().toISOString();
                  const roomUpdate = { 
                    id: roomId, 
                    updatedAt: createdAt3, 
                    lastMessage: message 
                  };
                  upsertRooms(state, [roomUpdate]);
                }
                
                updateMessageCache(roomId, state.messages[roomId]);
                return;
              }
            }
          }
          
          // Если сообщение уже существует (пришло через WebSocket), не добавляем дубликат
          if (messageAlreadyExists) {
            if (__DEV__) {
              console.log('⚠️ sendText.fulfilled: Message already exists, skipping');
            }
            return;
          }
          
          // Добавляем новое сообщение
          if (__DEV__) {
            console.log('➕ sendText.fulfilled: Adding new message', { messageId: message.id });
          }
          
          const createdAt4 = message?.createdAt || new Date().toISOString();
          upsertRooms(state, [{ id: roomId, updatedAt: createdAt4, lastMessage: message }]);
          upsertMessagesDesc(state.messages[roomId], [message]);
          updateMessageCache(roomId, state.messages[roomId]);
        })
        .addCase(sendImages.fulfilled, (state, action) => {
          // Работаем как sendVoice.fulfilled - обновляем оптимистичное сообщение прямо здесь
          const payload = action.payload;
          // Поддерживаем оба формата: { message, temporaryId } и просто message
          const message = payload?.message || payload;
          const temporaryId = payload?.temporaryId || action.meta?.arg?.temporaryId;
          const roomId = message?.roomId;
          
          if (!roomId || !message || !message.id) return;
          
          ensureRoomBucket(state, roomId);
          
          // Проверяем, не существует ли уже сообщение с таким id (пришло через WebSocket)
          const messageAlreadyExists = state.messages[roomId].byId[message.id];
          
          // Если использовались оптимистичные обновления, находим и удаляем временное сообщение
          if (temporaryId && state.messages[roomId]) {
            let foundMessageKey = null;
            
            if (state.messages[roomId].byId[temporaryId]) {
              foundMessageKey = temporaryId;
            } else {
              for (const messageId of state.messages[roomId].ids) {
                const msg = state.messages[roomId].byId[messageId];
                if (msg?.temporaryId === temporaryId) {
                  foundMessageKey = messageId;
                  break;
                }
              }
            }
            
            if (foundMessageKey) {
              // Удаляем временное сообщение
              delete state.messages[roomId].byId[foundMessageKey];
              const tempIndex = state.messages[roomId].ids.indexOf(foundMessageKey);
              if (tempIndex >= 0) {
                state.messages[roomId].ids.splice(tempIndex, 1);
              }
              
              // Если сообщение уже пришло через WebSocket, просто удаляем временное и выходим
              if (messageAlreadyExists) {
                if (state.rooms.byId[roomId]?.lastMessage?.temporaryId === temporaryId || 
                    state.rooms.byId[roomId]?.lastMessage?.id === foundMessageKey) {
                  const createdAt = message?.createdAt || new Date().toISOString();
                  const roomUpdate = { 
                    id: roomId, 
                    updatedAt: createdAt, 
                    lastMessage: message 
                  };
                  upsertRooms(state, [roomUpdate]);
                }
                
                updateMessageCache(roomId, state.messages[roomId]);
                return;
              }
            }
          }
          
          // Если сообщение уже существует (пришло через WebSocket), не добавляем дубликат
          if (messageAlreadyExists) {
            return;
          }
          
          // Добавляем новое сообщение
          const createdAt = message?.createdAt || new Date().toISOString();
          upsertRooms(state, [{ id: roomId, updatedAt: createdAt, lastMessage: message }]);
          upsertMessagesDesc(state.messages[roomId], [message]);
          updateMessageCache(roomId, state.messages[roomId]);
        })
        .addCase(sendPoll.fulfilled, (state, action) => {
          // Работаем как sendVoice.fulfilled - обновляем оптимистичное сообщение
          const payload = action.payload;
          const message = payload?.message || payload;
          const temporaryId = payload?.temporaryId || action.meta?.arg?.temporaryId;
          const roomId = message?.roomId;
          
          if (!roomId || !message || !message.id) return;
          
          ensureRoomBucket(state, roomId);
          
          // Проверяем, не существует ли уже сообщение с таким id (пришло через WebSocket)
          const messageAlreadyExists = state.messages[roomId].byId[message.id];
          
          // Если использовались оптимистичные обновления, находим и удаляем временное сообщение
          if (temporaryId && state.messages[roomId]) {
            let foundMessageKey = null;
            
            if (state.messages[roomId].byId[temporaryId]) {
              foundMessageKey = temporaryId;
            } else {
              for (const messageId of state.messages[roomId].ids) {
                const msg = state.messages[roomId].byId[messageId];
                if (msg?.temporaryId === temporaryId) {
                  foundMessageKey = messageId;
                  break;
                }
              }
            }
            
            if (foundMessageKey) {
              // Удаляем временное сообщение
              delete state.messages[roomId].byId[foundMessageKey];
              const tempIndex = state.messages[roomId].ids.indexOf(foundMessageKey);
              if (tempIndex >= 0) {
                state.messages[roomId].ids.splice(tempIndex, 1);
              }
              
              // Если сообщение уже пришло через WebSocket, просто удаляем временное и выходим
              if (messageAlreadyExists) {
                if (state.rooms.byId[roomId]?.lastMessage?.temporaryId === temporaryId || 
                    state.rooms.byId[roomId]?.lastMessage?.id === foundMessageKey) {
                  const createdAt = message?.createdAt || new Date().toISOString();
                  const roomUpdate = { 
                    id: roomId, 
                    updatedAt: createdAt, 
                    lastMessage: message 
                  };
                  upsertRooms(state, [roomUpdate]);
                }
                
                updateMessageCache(roomId, state.messages[roomId]);
                return;
              }
            }
          }
          
          // Если сообщение уже существует (пришло через WebSocket), не добавляем дубликат
          if (messageAlreadyExists) {
            return;
          }
          
          // Добавляем новое сообщение
          const createdAt = message?.createdAt || new Date().toISOString();
          upsertRooms(state, [{ id: roomId, updatedAt: createdAt, lastMessage: message }]);
          upsertMessagesDesc(state.messages[roomId], [message]);
          updateMessageCache(roomId, state.messages[roomId]);
        })
        .addCase(sendVoice.fulfilled, (state, action) => {
          // Работаем как sendText.fulfilled - обновляем оптимистичное сообщение прямо здесь
          const payload = action.payload;
          // Поддерживаем оба формата: { message, temporaryId } и просто message
          const message = payload?.message || payload;
          const temporaryId = payload?.temporaryId || action.meta?.arg?.temporaryId;
          const roomId = message?.roomId;
          
          if (!roomId || !message || !message.id) return;
          
          ensureRoomBucket(state, roomId);
          
          // Проверяем, не существует ли уже сообщение с таким id (пришло через WebSocket)
          const messageAlreadyExists = state.messages[roomId].byId[message.id];
          
          // Если использовались оптимистичные обновления, находим и удаляем временное сообщение
          if (temporaryId && state.messages[roomId]) {
            let foundMessageKey = null;
            
            if (state.messages[roomId].byId[temporaryId]) {
              foundMessageKey = temporaryId;
            } else {
              for (const messageId of state.messages[roomId].ids) {
                const msg = state.messages[roomId].byId[messageId];
                if (msg?.temporaryId === temporaryId) {
                  foundMessageKey = messageId;
                  break;
                }
              }
            }
            
            if (foundMessageKey) {
              // Удаляем временное сообщение
              delete state.messages[roomId].byId[foundMessageKey];
              const tempIndex = state.messages[roomId].ids.indexOf(foundMessageKey);
              if (tempIndex >= 0) {
                state.messages[roomId].ids.splice(tempIndex, 1);
              }
              
              // Если сообщение уже пришло через WebSocket, просто удаляем временное и выходим
              if (messageAlreadyExists) {
                if (state.rooms.byId[roomId]?.lastMessage?.temporaryId === temporaryId || 
                    state.rooms.byId[roomId]?.lastMessage?.id === foundMessageKey) {
                  const createdAt = message?.createdAt || new Date().toISOString();
                  const roomUpdate = { 
                    id: roomId, 
                    updatedAt: createdAt, 
                    lastMessage: message 
                  };
                  upsertRooms(state, [roomUpdate]);
                }
                
                updateMessageCache(roomId, state.messages[roomId]);
                return;
              }
            }
          }
          
          // Если сообщение уже существует (пришло через WebSocket), не добавляем дубликат
          if (messageAlreadyExists) {
            return;
          }
          
          // Добавляем новое сообщение
          const createdAt = message?.createdAt || new Date().toISOString();
          upsertRooms(state, [{ id: roomId, updatedAt: createdAt, lastMessage: message }]);
          upsertMessagesDesc(state.messages[roomId], [message]);
          updateMessageCache(roomId, state.messages[roomId]);
        })
        .addCase(sendProduct.fulfilled, (state, action) => {
          const message = action.payload?.message || action.payload;
          const roomId = message?.roomId;
          if (!roomId) return;
          const createdAt4 = message?.createdAt || new Date().toISOString();
          upsertRooms(state, [{ id: roomId, updatedAt: createdAt4, lastMessage: message }]);
          ensureRoomBucket(state, roomId);
          upsertMessagesDesc(state.messages[roomId], [message]);
          updateMessageCache(roomId, state.messages[roomId]);
        })
        .addCase(sendStop.fulfilled, (state, action) => {
          const message = action.payload?.message || action.payload;
          const roomId = message?.roomId;
          if (!roomId) return;
          const createdAt5 = message?.createdAt || new Date().toISOString();
          upsertRooms(state, [{ id: roomId, updatedAt: createdAt5, lastMessage: message }]);
          ensureRoomBucket(state, roomId);
          upsertMessagesDesc(state.messages[roomId], [message]);
          updateMessageCache(roomId, state.messages[roomId]);
        })
        .addCase(sendWarehouse.fulfilled, (state, action) => {
          const message = action.payload?.message || action.payload;
          const roomId = message?.roomId;
          if (!roomId) return;
          const createdAt6 = message?.createdAt || new Date().toISOString();
          upsertRooms(state, [{ id: roomId, updatedAt: createdAt6, lastMessage: message }]);
          ensureRoomBucket(state, roomId);
          upsertMessagesDesc(state.messages[roomId], [message]);
          updateMessageCache(roomId, state.messages[roomId]);
        })
        .addCase(sendContact.fulfilled, (state, action) => {
          // Работаем как sendVoice.fulfilled и sendImages.fulfilled - обновляем оптимистичное сообщение
          const payload = action.payload;
          // Поддерживаем оба формата: { message, temporaryId } и просто message
          const message = payload?.message || payload;
          const temporaryId = payload?.temporaryId || action.meta?.arg?.temporaryId;
          const roomId = message?.roomId;
          
          if (!roomId || !message || !message.id) return;
          
          ensureRoomBucket(state, roomId);
          
          // Проверяем, не существует ли уже сообщение с таким id (пришло через WebSocket)
          const messageAlreadyExists = state.messages[roomId].byId[message.id];
          
          // Если использовались оптимистичные обновления, находим и удаляем временное сообщение
          if (temporaryId && state.messages[roomId]) {
            let foundMessageKey = null;
            
            if (state.messages[roomId].byId[temporaryId]) {
              foundMessageKey = temporaryId;
            } else {
              // Ищем по temporaryId в других сообщениях
              for (const messageId of state.messages[roomId].ids) {
                const msg = state.messages[roomId].byId[messageId];
                if (msg?.temporaryId === temporaryId && msg?.isOptimistic) {
                  foundMessageKey = messageId;
                  break;
                }
              }
            }
            
            if (foundMessageKey && foundMessageKey !== message.id) {
              // Удаляем временное сообщение
              delete state.messages[roomId].byId[foundMessageKey];
              const tempIndex = state.messages[roomId].ids.indexOf(foundMessageKey);
              if (tempIndex >= 0) {
                state.messages[roomId].ids.splice(tempIndex, 1);
              }
            }
          }
          
          // Если сообщение уже существует (пришло через WebSocket), не добавляем его снова
          if (messageAlreadyExists && !messageAlreadyExists.isOptimistic) {
            return;
          }
          
          // Обновляем оптимистичное сообщение или добавляем новое
          if (temporaryId && state.messages[roomId].byId[temporaryId]) {
            // Обновляем существующее оптимистичное сообщение
            const oldMessage = state.messages[roomId].byId[temporaryId];
            const updatedMessage = {
              ...oldMessage,
              ...message,
              id: message.id,
              temporaryId: oldMessage.temporaryId,
              isOptimistic: false,
              status: message.status || 'SENT'
            };
            
            // Если ключ изменился (temporaryId -> serverId), переносим данные
            if (temporaryId !== message.id) {
              delete state.messages[roomId].byId[temporaryId];
              state.messages[roomId].byId[message.id] = updatedMessage;
              
              // Заменяем ключ в массиве ids
              const tempIndex = state.messages[roomId].ids.indexOf(temporaryId);
              if (tempIndex >= 0) {
                state.messages[roomId].ids[tempIndex] = message.id;
              } else {
                state.messages[roomId].ids.push(message.id);
              }
            } else {
              state.messages[roomId].byId[message.id] = updatedMessage;
            }
          } else {
            // Добавляем новое сообщение
            upsertMessagesDesc(state.messages[roomId], [message]);
          }
          
          const createdAt7 = message?.createdAt || new Date().toISOString();
          upsertRooms(state, [{ id: roomId, updatedAt: createdAt7, lastMessage: message }]);
          updateMessageCache(roomId, state.messages[roomId]);
        })
        .addCase(deleteMessage.fulfilled, (state, action) => {
            const { messageId, roomId: rid, deletedForAll, currentUserId } = action.payload;

            // Если указан roomId, используем его, иначе ищем по messageId
            const roomId = rid || Object.keys(state.messages).find(r =>
                state.messages[r]?.byId?.[messageId]
            );

            if (!roomId) {
                return;
            }

            ensureRoomBucket(state, roomId);

            if (deletedForAll) {
                // Удаляем сообщение для всех - полностью убираем из store
                delete state.messages[roomId].byId[messageId];
                state.messages[roomId].ids = state.messages[roomId].ids.filter(id => id !== messageId);

                // Также обновляем lastMessage в комнате если это было последнее сообщение
                const room = state.rooms.byId[roomId];
                if (room?.lastMessage?.id === messageId) {
                    const remainingMessages = state.messages[roomId].ids
                        .map(id => state.messages[roomId].byId[id])
                        .filter(Boolean)
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                    if (remainingMessages.length > 0) {
                        room.lastMessage = remainingMessages[0];
                        room.updatedAt = remainingMessages[0].createdAt;
                    } else {
                        delete room.lastMessage;
                        room.updatedAt = room.createdAt || new Date();
                    }
                }
                
                // КРИТИЧНО: Удаляем из кэша сразу при удалении для всех
                // Используем await внутри setTimeout для неблокирующего удаления
                if (messageId) {
                    chatCacheService.removeMessageFromCache(roomId, messageId).catch((error) => {
                        if (__DEV__) {
                            console.warn('⚠️ deleteMessage.fulfilled: Failed to remove message from cache:', error);
                        }
                    });
                }
            } else {
                const message = state.messages[roomId].byId[messageId];
                if (message) {
                    if (!message.hiddenForUserIds) {
                        message.hiddenForUserIds = [];
                    }

                    // Добавляем текущего пользователя в список скрытых
                    if (currentUserId && !message.hiddenForUserIds.includes(currentUserId)) {
                        message.hiddenForUserIds.push(currentUserId);
                    }
                }
                
                // Для скрытых сообщений тоже обновляем кэш
                // (сообщение остается в кэше, но помечается как скрытое)
                updateMessageCache(roomId, state.messages[roomId]);
            }

            // Обновляем кэш сообщений для синхронизации состояния
            updateMessageCache(roomId, state.messages[roomId]);
        })
        .addCase(markAsRead.fulfilled, (state, action) => {
          const { roomId } = action.payload;

          state.unreadByRoomId[roomId] = 0;

          const currentUserId = action.meta?.arg?.currentUserId;
          const roomMessages = state.messages[roomId];

          if (roomMessages?.byId && currentUserId) {
            Object.values(roomMessages.byId).forEach(message => {
              if (message && message.senderId !== currentUserId) {
                if (message.status === 'SENT' || message.status === 'DELIVERED') {
                  message.status = 'read';
                }
              }
            });
          }
        })
        .addCase(createRoom.fulfilled, (state, action) => {
          const room = action.payload;
          upsertRooms(state, [room]);
        })
        .addCase(updateRoom.fulfilled, (state, action) => {
          const room = action.payload;
          upsertRooms(state, [room]);
        })
        .addCase(addMembers.fulfilled, (state) => {})
        .addCase(removeMember.fulfilled, (state) => {})
        .addCase(removeMembers.fulfilled, (state) => {})

        .addCase(deleteRoom.fulfilled, (state, action) => {
            const { roomId } = action.payload;

            delete state.rooms.byId[roomId];
            state.rooms.ids = state.rooms.ids.filter(id => id !== roomId);
            delete state.messages[roomId];
            delete state.unreadByRoomId[roomId];
            delete state.typingByRoomId[roomId];

            if (state.activeRoomId === roomId) {
                state.activeRoomId = null;
            }

            try {
                chatCacheService.clearRoomCache(roomId);
            } catch (e) {
                // Ошибка очистки кэша сообщений
            }
        })
        .addCase(leaveRoom.fulfilled, (state, action) => {
            const { roomId } = action.payload;

            delete state.rooms.byId[roomId];
            state.rooms.ids = state.rooms.ids.filter(id => id !== roomId);
            delete state.messages[roomId];
            delete state.unreadByRoomId[roomId];
            delete state.typingByRoomId[roomId];

            if (state.activeRoomId === roomId) {
                state.activeRoomId = null;
            }

            try {
                chatCacheService.clearRoomCache(roomId);
            } catch (e) {
                // Ошибка очистки кэша сообщений
            }
        })
        .addCase(fetchRoomAvatar.fulfilled, (state, action) => {
          const { roomId, user, avatar } = action.payload || {};
          if (!roomId || !user) return;

          state.avatarFetchAttemptedByRoomId[roomId] = true;

          const userId = user?.id;
          if (userId) {
            upsertParticipant(state, { ...user, avatar });
          }

          const room = state.rooms.byId[roomId];
          if (!room || !Array.isArray(room.participants)) return;
          const idx = room.participants.findIndex(p => (p?.userId ?? p?.user?.id ?? p?.id) === userId);
          if (idx >= 0) {
            const updated = { ...room.participants[idx] };
            updated.user = { ...(updated.user || {}), ...user };
            if (avatar && !updated.user.avatar) updated.user.avatar = avatar;
            room.participants[idx] = updated;
          }
        })
        .addCase(fetchRoomAvatar.rejected, (state, action) => {
          const roomId = action.meta?.arg;
          if (roomId) state.avatarFetchAttemptedByRoomId[roomId] = true;
        })
        .addCase(updateMessageStatus, (state, action) => {
            const { roomId, messageId, status, deliveredAt, readAt, updatedBy } = action.payload;

            // Update message status in messages store
            if (state.messages[roomId]?.byId[messageId]) {
                const message = state.messages[roomId].byId[messageId];
                message.status = status;
                if (deliveredAt) message.deliveredAt = deliveredAt;
                if (readAt) message.readAt = readAt;
            }

            // Update lastMessage status in room if this is the last message
            const room = state.rooms.byId[roomId];
            if (room?.lastMessage?.id === messageId) {
                room.lastMessage.status = status;
                if (deliveredAt) room.lastMessage.deliveredAt = deliveredAt;
                if (readAt) room.lastMessage.readAt = readAt;
            }
        });
  },
});

export const {
  setActiveRoom,
  tickTime,
  setTyping,
  setTypingActivity,
  setLastActivityType,
  receiveSocketMessage,
  receiveMessage,
  receiveMessageDeleted,
  receiveMessageUpdated,
  updateMessageStatus,
  updateMessageReactions,
  updateUserOnlineStatus,
  setConnectionStatus,
  addOptimisticMessage,
  markOptimisticMessageFailed,
  updateOptimisticMessage,
  updateMessageRetryCount,
  cancelFailedMessage,
  handleRoomDeleted,
  hydrateRooms,
  hydrateRoomMessages,
  updatePollInMessage,
  updateRoomFromSocket,
} = chatSlice.actions;
export default chatSlice.reducer;