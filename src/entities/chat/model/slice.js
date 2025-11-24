import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ChatApi from '@entities/chat/api/chatApi';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from '@entities/user/api/userApi';

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
  typingByRoomId: {},
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
    bucket.byId[msg.id] = { ...(bucket.byId[msg.id] || {}), ...msg };
    if (!bucket.ids.includes(msg.id)) bucket.ids.push(msg.id);
  }

  bucket.ids.sort((a, b) => {
    const ma = bucket.byId[a];
    const mb = bucket.byId[b];
    return new Date(mb.createdAt) - new Date(ma.createdAt);
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

const updateMessageCache = async (roomId, bucket) => {
  try {
    const messagesToCache = bucket.ids.slice(0, 30).map(id => bucket.byId[id]).filter(Boolean);
    await AsyncStorage.setItem(CACHE_KEYS.roomMessages(roomId), JSON.stringify(messagesToCache));
  } catch (e) {
    // Ошибка обновления кэша сообщений
  }
};

const CACHE_KEYS = {
  ROOMS: 'chat.rooms',
  roomMessages: (roomId) => `chat.messages.${roomId}`,
};

export const loadRoomsCache = createAsyncThunk('chat/loadRoomsCache', async (_, { rejectWithValue }) => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.ROOMS);
    const rooms = raw ? JSON.parse(raw) : [];
    return { rooms };
  } catch (e) {
    return rejectWithValue(e.message || 'Ошибка чтения кэша комнат');
  }
});

export const loadRoomMessagesCache = createAsyncThunk('chat/loadRoomMessagesCache', async ({ roomId }, { rejectWithValue }) => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.roomMessages(roomId));
    const messages = raw ? JSON.parse(raw) : [];
    return { roomId, messages };
  } catch (e) {
    return rejectWithValue(e.message || 'Ошибка чтения кэша сообщений');
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
          try { await AsyncStorage.setItem(CACHE_KEYS.ROOMS, JSON.stringify(rooms)); } catch {}
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
        return rejectWithValue(e.message || 'Ошибка загрузки комнаты');
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
    async ({ roomId, limit = 15, cursorId = null, direction = 'backward' }, { rejectWithValue }) => {
      try {
        const params = { limit };
        if (cursorId) params.cursorId = cursorId;
        if (direction) params.direction = direction;

        const res = await ChatApi.getMessages(roomId, params);
        const messages = res?.data?.messages || res?.data?.data || res?.data || [];
        const hasMore = (res?.data?.pagination?.hasMore ?? (messages.length >= limit));

        if (!cursorId) {
          try { await AsyncStorage.setItem(CACHE_KEYS.roomMessages(roomId), JSON.stringify(messages.slice(0, 15))); } catch {}
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
    async ({ roomId, voice, temporaryId, retryCount = 0 }, { rejectWithValue, dispatch, getState }) => {
      const MAX_RETRIES = 5;
      const RETRY_DELAYS = [1000, 2000, 3000, 5000, 10000]; // Прогрессивная задержка
      
      try {
        const form = new FormData();
        form.append('type', 'VOICE');
        form.append('duration', voice.duration.toString());
        
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
        
        if (__DEV__) {
          console.log('✅ sendVoice.fulfilled:', { 
            serverMessage,
            messageId: serverMessage?.id,
            attemptNumber: retryCount + 1
          });
        }

        // Если есть temporaryId, обновляем оптимистичное сообщение
        if (temporaryId && serverMessage) {
          dispatch(updateOptimisticMessage({
            roomId,
            temporaryId,
            newMessage: serverMessage,
          }));
        }

        return serverMessage;
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
    async ({ roomId, content, temporaryId }, { rejectWithValue, dispatch, getState }) => {
      try {
        const form = new FormData();
        form.append('type', 'TEXT');
        form.append('content', content);
        const res = await ChatApi.sendMessage(roomId, form);
        const serverMessage = res?.data?.data?.message || res?.data?.message || res?.data?.data || res?.data;
        
        return serverMessage;
      } catch (e) {
        // Если есть temporaryId, помечаем сообщение как неудачное
        if (temporaryId) {
          dispatch(markOptimisticMessageFailed({ temporaryId, error: e.message || 'Ошибка отправки сообщения' }));
        }
        return rejectWithValue(e.message || 'Ошибка отправки сообщения');
      }
    }
);

export const sendImages = createAsyncThunk(
    'chat/sendImages',
    async ({ roomId, files = [], captions = [] }, { rejectWithValue }) => {
      try {
        const form = new FormData();
        form.append('type', 'IMAGE');

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

        const res = await ChatApi.sendMessage(roomId, form);
        return res?.data?.data || res?.data;
      } catch (e) {
        return rejectWithValue(e.message || 'Ошибка отправки изображений');
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
        return rejectWithValue(e.message || 'Ошибка создания комнаты');
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
        return rejectWithValue(e.message || 'Ошибка добавления участников');
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

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveRoom(state, action) {
      state.activeRoomId = action.payload || null;
    },
    setTyping(state, action) {
      const { roomId, userIds } = action.payload || {};
      state.typingByRoomId[roomId] = Array.isArray(userIds) ? userIds : [];
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
        updatedAt: optimisticMessage.createdAt, 
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
      if (!roomId || !temporaryId || !newMessage) return;
      
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
        // Серверное сообщение уже есть, просто удаляем временное
        delete bucket.byId[foundMessageKey];
        const tempIndex = bucket.ids.indexOf(foundMessageKey);
        if (tempIndex >= 0) {
          bucket.ids.splice(tempIndex, 1);
        }
        updateMessageCache(roomId, bucket);
        
        if (__DEV__) {
          console.log('✅ updateOptimisticMessage: Removed duplicate temporary message', {
            temporaryId,
            serverId: newMessage.id,
            roomId
          });
        }
        return;
      }
      
      const oldMessage = bucket.byId[foundMessageKey];
      const updatedMessage = {
        ...oldMessage,
        ...newMessage,
        id: newMessage.id,
        temporaryId: temporaryId, // ✅ Сохраняем temporaryId для стабильного keyExtractor
        isOptimistic: false,
        status: newMessage.status || 'SENT'
      };
      
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
          bucket.ids.push(newMessage.id);
        }
      } else {
        // Если ключ не изменился, просто обновляем данные
        bucket.byId[newMessage.id] = updatedMessage;
      }
      
      // Обновляем lastMessage
      if (state.rooms.byId[roomId]?.lastMessage?.temporaryId === temporaryId || 
          state.rooms.byId[roomId]?.lastMessage?.id === foundMessageKey) {
        const roomUpdate = { 
          id: roomId, 
          updatedAt: updatedMessage.createdAt, 
          lastMessage: updatedMessage 
        };
        upsertRooms(state, [roomUpdate]);
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

      // Проверяем, не обрабатывали ли мы уже это сообщение
      const existingMessage = state.messages[roomId]?.byId?.[message.id];
      if (existingMessage) {
        return;
      }
      
      // Проверяем, не является ли это наше собственное сообщение, которое уже обработано через HTTP
      if (currentUserId && message.senderId === currentUserId) {
        // Проверяем, есть ли уже сообщение с таким ID (обработанное через sendText.fulfilled)
        if (state.messages[roomId]?.byId?.[message.id]) {
          return;
        }
        
        // Ищем оптимистичное сообщение с тем же содержимым (только если нет серверного сообщения)
        const bucket = state.messages[roomId];
        if (bucket) {
          const optimisticMessage = bucket.ids
            .map(id => bucket.byId[id])
            .find(msg => 
              msg?.isOptimistic && 
              msg?.content === message.content &&
              msg?.type === message.type
            );
          
          if (optimisticMessage) {
            // Обновляем оптимистичное сообщение данными с сервера
            const messageId = bucket.ids.find(id => bucket.byId[id] === optimisticMessage);
            if (messageId) {
              // Удаляем временное сообщение
              delete bucket.byId[messageId];
              const tempIndex = bucket.ids.indexOf(messageId);
              if (tempIndex >= 0) {
                bucket.ids.splice(tempIndex, 1);
              }
              
              // Добавляем серверное сообщение
              bucket.byId[message.id] = {
                ...optimisticMessage,
                ...message,
                isOptimistic: false,
                status: message.status || 'SENT'
              };
              
              if (tempIndex >= 0) {
                bucket.ids.splice(tempIndex, 0, message.id);
              } else {
                bucket.ids.push(message.id);
              }
              
              // Обновляем lastMessage если это было последнее сообщение
              if (state.rooms.byId[roomId]?.lastMessage?.id === optimisticMessage.id) {
                const roomUpdate = { 
                  id: roomId, 
                  updatedAt: message.createdAt, 
                  lastMessage: bucket.byId[message.id]
                };
                upsertRooms(state, [roomUpdate]);
              }
              
              updateMessageCache(roomId, bucket);
              return;
            }
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
      const roomUpdate = { 
        id: roomId, 
        updatedAt: message.createdAt, 
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

    receiveMessageDeleted(state, action) {
      const { roomId, messageId } = action.payload || {};
      if (!roomId || !messageId || !state.messages[roomId]) return;
      delete state.messages[roomId].byId[messageId];
      state.messages[roomId].ids = state.messages[roomId].ids.filter(id => id !== messageId);
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
          state.rooms.error = action.payload || 'Не удалось загрузить комнату';
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
          const message = action.payload?.message || action.payload;
          const roomId = message?.roomId;
          const temporaryId = action.meta.arg.temporaryId;
          
          // Если использовались оптимистичные обновления, находим и обновляем временное сообщение
          if (temporaryId && roomId && state.messages[roomId]) {
            // Ищем временное сообщение
            // Временные сообщения используют temporaryId как ключ в store
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
              // Заменяем временное сообщение на серверное
              const oldMessage = state.messages[roomId].byId[foundMessageKey];
              const updatedMessage = {
                ...oldMessage,
                ...message,
                id: message.id, // Новый серверный ID
                temporaryId: undefined, // Убираем временный ID
                isOptimistic: false,
                status: message.status || 'SENT'
              };
              
              // Удаляем старое временное сообщение
              delete state.messages[roomId].byId[foundMessageKey];
              const tempIndex = state.messages[roomId].ids.indexOf(foundMessageKey);
              if (tempIndex >= 0) {
                state.messages[roomId].ids.splice(tempIndex, 1);
              }
              
              // Добавляем обновленное сообщение с новым ID
              state.messages[roomId].byId[message.id] = updatedMessage;
              
              // Вставляем новое сообщение в то же место в массиве ids
              if (tempIndex >= 0) {
                state.messages[roomId].ids.splice(tempIndex, 0, message.id);
              } else {
                state.messages[roomId].ids.push(message.id);
              }
              
              // Обновляем lastMessage если это было последнее сообщение
              if (state.rooms.byId[roomId]?.lastMessage?.temporaryId === temporaryId || 
                  state.rooms.byId[roomId]?.lastMessage?.id === foundMessageKey) {
                const roomUpdate = { 
                  id: roomId, 
                  updatedAt: updatedMessage.createdAt, 
                  lastMessage: updatedMessage 
                };
                upsertRooms(state, [roomUpdate]);
              }
              
              updateMessageCache(roomId, state.messages[roomId]);
              
              return;
            }
          }
          
          // Обрабатываем только если не было оптимистичного обновления или не нашли временное сообщение
          if (!roomId) return;
          
          upsertRooms(state, [{ id: roomId, updatedAt: message.createdAt, lastMessage: message }]);
          ensureRoomBucket(state, roomId);
          upsertMessagesDesc(state.messages[roomId], [message]);
          updateMessageCache(roomId, state.messages[roomId]);
        })
        .addCase(sendImages.fulfilled, (state, action) => {
          const message = action.payload?.message || action.payload;
          const roomId = message?.roomId;
          if (!roomId) return;
          upsertRooms(state, [{ id: roomId, updatedAt: message.createdAt, lastMessage: message }]);
          ensureRoomBucket(state, roomId);
          upsertMessagesDesc(state.messages[roomId], [message]);
          updateMessageCache(roomId, state.messages[roomId]);
        })
        .addCase(sendVoice.fulfilled, (state, action) => {
          // ✅ Если был temporaryId, то updateOptimisticMessage уже обработал сообщение
          // Ничего не делаем в fulfilled чтобы избежать дубликатов
          const temporaryId = action.meta?.arg?.temporaryId;
          
          if (temporaryId) {
            // Оптимистичное обновление уже произошло в thunk через updateOptimisticMessage
            return;
          }
          
          // Если temporaryId не было, добавляем сообщение (fallback для старой логики)
          const message = action.payload?.message || action.payload;
          const roomId = message?.roomId;
          
          if (!roomId) return;
          
          const messageExists = state.messages[roomId]?.byId[message.id];
          
          if (!messageExists) {
            upsertRooms(state, [{ id: roomId, updatedAt: message.createdAt, lastMessage: message }]);
            ensureRoomBucket(state, roomId);
            upsertMessagesDesc(state.messages[roomId], [message]);
            updateMessageCache(roomId, state.messages[roomId]);
          }
        })
        .addCase(sendProduct.fulfilled, (state, action) => {
          const message = action.payload?.message || action.payload;
          const roomId = message?.roomId;
          if (!roomId) return;
          upsertRooms(state, [{ id: roomId, updatedAt: message.createdAt, lastMessage: message }]);
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
                AsyncStorage.removeItem(CACHE_KEYS.roomMessages(roomId));
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
                AsyncStorage.removeItem(CACHE_KEYS.roomMessages(roomId));
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
  receiveSocketMessage, 
  receiveMessage, 
  receiveMessageDeleted, 
  updateMessageStatus, 
  updateUserOnlineStatus, 
  setConnectionStatus, 
  addOptimisticMessage, 
  markOptimisticMessageFailed, 
  updateOptimisticMessage,
  updateMessageRetryCount,
  cancelFailedMessage 
} = chatSlice.actions;
export default chatSlice.reducer;