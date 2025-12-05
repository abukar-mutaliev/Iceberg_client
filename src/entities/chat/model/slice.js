import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ChatApi from '@entities/chat/api/chatApi';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from '@entities/user/api/userApi';
import { chatCacheService } from '../lib/chatCacheService';

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
  for (const msg of messages) {
    // Убеждаемся, что у сообщения есть createdAt
    if (!msg.createdAt) {
      msg.createdAt = new Date().toISOString();
    }
    // Инициализируем reactions как пустой массив если отсутствует
    if (!msg.reactions) {
      msg.reactions = [];
    }
    bucket.byId[msg.id] = { ...(bucket.byId[msg.id] || {}), ...msg };
    if (!bucket.ids.includes(msg.id)) bucket.ids.push(msg.id);
  }

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
// Важно: делаем глубокую копию для избежания ошибки "Proxy handler is null"
// Debounce для предотвращения частых записей
let cacheUpdateTimers = {};

const updateMessageCache = async (roomId, bucket) => {
  // Отменяем предыдущий таймер для этой комнаты
  if (cacheUpdateTimers[roomId]) {
    clearTimeout(cacheUpdateTimers[roomId]);
  }
  
  // Debounce - обновляем кэш через 500ms после последнего изменения
  cacheUpdateTimers[roomId] = setTimeout(async () => {
    try {
      // Сохраняем ВСЕ сообщения (не ограничиваем 100)
      const messagesToCache = bucket.ids.map(id => {
        const msg = bucket.byId[id];
        if (!msg) return null;
        // Делаем копию через JSON для полного отделения от Proxy
        try {
          return JSON.parse(JSON.stringify(msg));
        } catch {
          return null;
        }
      }).filter(Boolean);
      
      if (messagesToCache.length === 0) return;
      
      await chatCacheService.saveMessages(roomId, messagesToCache);
      
      // Фоновое кэширование медиа-файлов (только первые 20)
      const recentMessages = messagesToCache.slice(0, 20);
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
    }
    delete cacheUpdateTimers[roomId];
  }, 500);
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
        const messages = res?.data?.messages || res?.data?.data || res?.data || [];
        const hasMore = (res?.data?.pagination?.hasMore ?? (messages.length >= limit));

        if (!cursorId) {
          try { 
            await chatCacheService.saveMessages(roomId, messages);
            
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
        return rejectWithValue(e.message || 'Ошибка загрузки сообщений');
      }
    }
);

// Отправка голосового сообщения
// Вспомогательная функция для проверки сетевой ошибки
const isNetworkError = (error) => {
  return error.message === 'Network Error' || 
         error.message?.includes('Network') ||
         error.message?.includes('сетевым подключением') ||
         error.code === 'ECONNABORTED' ||
         error.code === 'ERR_NETWORK';
};

// Функция задержки для retry
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
          
          // Ждём перед повторной попыткой
          await delay(delayMs);
          
          // Рекурсивно вызываем sendVoice с увеличенным счётчиком
          return dispatch(sendVoice({ 
            roomId, 
            voice, 
            temporaryId, 
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
    async ({ roomId, content, temporaryId, replyToId }, { rejectWithValue, dispatch, getState }) => {
      try {
        const form = new FormData();
        form.append('type', 'TEXT');
        form.append('content', content);
        if (replyToId) {
          form.append('replyToId', replyToId.toString());
        }
        const res = await ChatApi.sendMessage(roomId, form);
        const serverMessage = res?.data?.data?.message || res?.data?.message || res?.data?.data || res?.data;
        
        if (__DEV__) {
          console.log('🔍 sendText: Full server response:', {
            hasRes: !!res,
            hasData: !!res?.data,
            dataKeys: res?.data ? Object.keys(res.data) : [],
            messageHasReplyTo: !!serverMessage?.replyTo,
            replyToId: serverMessage?.replyToId,
            messageKeys: serverMessage ? Object.keys(serverMessage) : []
          });
        }
        
        return { message: serverMessage, temporaryId };
      } catch (e) {
        // Если есть temporaryId, помечаем сообщение как неудачное
        if (temporaryId) {
          dispatch(markOptimisticMessageFailed({ temporaryId, error: e.message || 'Ошибка отправки сообщения' }));
        }
        return rejectWithValue(e.message || 'Ошибка отправки сообщения');
      }
    }
);

export const sendPoll = createAsyncThunk(
    'chat/sendPoll',
    async ({ roomId, pollData, temporaryId, replyToId }, { rejectWithValue, dispatch, getState }) => {
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
        
        const res = await ChatApi.sendMessage(roomId, form);
        const serverMessage = res?.data?.data?.message || res?.data?.message || res?.data?.data || res?.data;
        
        return { message: serverMessage, temporaryId };
      } catch (e) {
        // Если есть temporaryId, помечаем сообщение как неудачное
        if (temporaryId) {
          dispatch(markOptimisticMessageFailed({ temporaryId, error: e.message || 'Ошибка отправки опроса' }));
        }
        return rejectWithValue(e.message || 'Ошибка отправки опроса');
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
          
          // Ждём перед повторной попыткой
          await delay(delayMs);
          
          // Рекурсивно вызываем sendImages с увеличенным счётчиком
          return dispatch(sendImages({ 
            roomId, 
            files, 
            captions,
            temporaryId, 
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
        return rejectWithValue(e.message || 'Ошибка отправки товара');
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

export const deleteMessage = createAsyncThunk(
    'chat/deleteMessage',
    async ({ messageId, forAll = false, currentUserId }, { rejectWithValue }) => {
        try {
            const res = await ChatApi.deleteMessage(messageId, { forAll });
            return {
                messageId,
                deletedForAll: !!forAll,
                currentUserId
            };
        } catch (e) {
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
        // Ждем пока sendText.fulfilled/sendImages.fulfilled сами обработают замену
        const hasOptimisticMessage = bucket.ids.some(id => {
          const msg = bucket.byId[id];
          if (!msg?.isOptimistic) return false;
          
          // Проверяем соответствие по типу и контенту
          if (msg.type !== message.type) return false;
          
          // Для TEXT - проверяем content
          if (message.type === 'TEXT' && msg.content === message.content) {
            return true;
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

      // Увеличиваем счетчик непрочитанных если комната не активна и сообщение не от текущего пользователя
      // Для определения текущего пользователя используем auth state из getState в thunk
      const isOwnMessage = false; // Пока отключаем эту проверку, так как currentUserId не доступен в slice

      if (state.activeRoomId !== roomId && !isOwnMessage) {
        // Проверяем, не было ли это сообщение учтено при загрузке комнат
        const messageTime = new Date(message.createdAt).getTime();
        const shouldIncrement = !state.lastRoomsFetchTime || messageTime > state.lastRoomsFetchTime;

        if (shouldIncrement) {
          const oldUnread = state.unreadByRoomId[roomId] || 0;
          const newUnread = oldUnread + 1;
          state.unreadByRoomId[roomId] = newUnread;
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
      
      const bucket = state.messages[roomId];
      if (!bucket) {
        if (__DEV__) {
          console.warn('⚠️ receiveMessageDeleted: Bucket not found', { roomId });
        }
        return;
      }
      
      // Нормализуем messageId (может быть число или строка)
      const normalizedMessageId = String(messageId);
      const numericMessageId = Number(messageId);
      
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
        // Сообщение не найдено - возможно уже удалено
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
      
      // Обновляем кэш сообщений
      updateMessageCache(roomId, bucket);
      
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
      if (!roomId || !Array.isArray(messages)) return;
      ensureRoomBucket(state, roomId);
      upsertMessagesDesc(state.messages[roomId], messages);
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
        .addCase(fetchRooms.pending, (state) => {
          state.rooms.loading = true;
          state.rooms.error = null;
        })
        .addCase(fetchRooms.fulfilled, (state, action) => {
          const { rooms, page, hasMore } = action.payload;
          if (page === 1) {
            state.rooms.ids = [];
            state.rooms.byId = {};
            state.avatarFetchAttemptedByRoomId = {};
            // НЕ очищаем счетчики непрочитанных полностью - сохраняем существующие
            // Только инициализируем новые комнаты
          }

          // Инициализируем счетчики непрочитанных из данных сервера ТОЛЬКО для новых комнат
          // Это предотвращает потерю счетчиков при обновлении экрана
          if (rooms && Array.isArray(rooms)) {
            rooms.forEach(room => {
              if (room.id && state.unreadByRoomId[room.id] === undefined) {
                // Инициализируем счетчик только если он еще не существует
                const unreadCount = room.unreadCount ?? room.unread ?? 0;
                state.unreadByRoomId[room.id] = unreadCount;
              }
            });
          }

          upsertRooms(state, rooms || []);
          state.rooms.page = page;
          state.rooms.hasMore = !!hasMore;
          state.rooms.loading = false;

          // Сохраняем время загрузки комнат для предотвращения дублирования счетчиков
          state.lastRoomsFetchTime = Date.now();
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
          ensureRoomBucket(state, roomId);
          state.messages[roomId].loading = false;
          state.messages[roomId].error = action.payload || 'Не удалось загрузить сообщения';
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
        .addCase(deleteMessage.fulfilled, (state, action) => {
            const { messageId, roomId: rid, deletedForAll, currentUserId } = action.payload;

            // Если указан roomId, используем его, иначе ищем по messageId
            const roomId = rid || Object.keys(state.messages).find(r =>
                state.messages[r]?.byId?.[messageId]
            );

            if (!roomId || !state.messages[roomId]) {
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
            }

            // Обновляем кэш сообщений
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
  setTyping,
  setTypingActivity,
  setLastActivityType,
  receiveSocketMessage,
  receiveMessage,
  receiveMessageDeleted,
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