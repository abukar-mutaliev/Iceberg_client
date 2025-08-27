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
  typingByRoomId: {},
  activeRoomId: null,
  avatarFetchAttemptedByRoomId: {},
  participants: {
    byUserId: {},
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
    console.warn('Ошибка обновления кэша сообщений:', e);
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
    async ({ page = 1, limit = 20 } = {}, { rejectWithValue }) => {
      try {
        const res = await ChatApi.getRooms({ page, limit });
        const root = (res && res.data) ? res.data : {};
        const dataNode = root?.data ?? root ?? {};
        let roomsRaw = Array.isArray(dataNode)
            ? dataNode
            : (dataNode.rooms ?? dataNode.items ?? dataNode.data ?? []);
        if (!Array.isArray(roomsRaw)) roomsRaw = [];

        const rooms = roomsRaw.map((it) => {
          if (it && it.room && typeof it.room === 'object') {
            const room = { ...it.room, unread: it.unreadCount ?? it.unread ?? 0 };
            if (!room.product && it.product) room.product = it.product;
            return room;
          }
          return it;
        }).filter(r => r && r.id);

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
    async ({ roomId, limit = 30, cursorId = null, direction = 'backward' }, { rejectWithValue }) => {
      try {
        const params = { limit };
        if (cursorId) params.cursorId = cursorId;
        if (direction) params.direction = direction;

        const res = await ChatApi.getMessages(roomId, params);
        const messages = res?.data?.messages || res?.data?.data || res?.data || [];
        const hasMore = (res?.data?.pagination?.hasMore ?? (messages.length >= limit));

        if (!cursorId) {
          try { await AsyncStorage.setItem(CACHE_KEYS.roomMessages(roomId), JSON.stringify(messages.slice(0, 30))); } catch {}
        }

        return { roomId, messages, hasMore };
      } catch (e) {
        return rejectWithValue(e.message || 'Ошибка загрузки сообщений');
      }
    }
);

export const sendText = createAsyncThunk(
    'chat/sendText',
    async ({ roomId, content }, { rejectWithValue }) => {
      try {
        const form = new FormData();
        form.append('type', 'TEXT');
        form.append('content', content);
        const res = await ChatApi.sendMessage(roomId, form);
        return res?.data?.data || res?.data;
      } catch (e) {
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
        return res?.data?.data || res?.data;
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
        return res?.data?.data || res?.data;
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
    receiveSocketMessage(state, action) {
      const { roomId, message } = action.payload || {};

      if (!roomId || !message) return;

      upsertRooms(state, [{ id: roomId, updatedAt: message.createdAt, lastMessage: message }]);
      ensureRoomBucket(state, roomId);
      upsertMessagesDesc(state.messages[roomId], [message]);

      updateMessageCache(roomId, state.messages[roomId]);

      if (state.activeRoomId !== roomId) {
        const oldUnread = state.unreadByRoomId[roomId] || 0;
        state.unreadByRoomId[roomId] = oldUnread + 1;

        const roomInList = state.rooms.byId[roomId];
        if (roomInList) {
          roomInList.unread = state.unreadByRoomId[roomId];
        }
      }
    },
    receiveMessageDeleted(state, action) {
      const { roomId, messageId } = action.payload || {};
      if (!roomId || !messageId || !state.messages[roomId]) return;
      delete state.messages[roomId].byId[messageId];
      state.messages[roomId].ids = state.messages[roomId].ids.filter(id => id !== messageId);
    },
    updateMessageStatus(state, action) {
      const { roomId, messageId, status } = action.payload || {};

      if (!roomId || !messageId || !status) return;

      const roomMessages = state.messages[roomId];
      if (roomMessages?.byId?.[messageId]) {
        roomMessages.byId[messageId].status = status;
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

            console.log('Redux: deleteMessage.fulfilled', { messageId, rid, deletedForAll, currentUserId });

            // Если указан roomId, используем его, иначе ищем по messageId
            const roomId = rid || Object.keys(state.messages).find(r =>
                state.messages[r]?.byId?.[messageId]
            );

            console.log('Redux: Найден roomId для удаления:', roomId);

            if (!roomId || !state.messages[roomId]) {
                console.log('Redux: roomId не найден или сообщения не существуют');
                return;
            }

            ensureRoomBucket(state, roomId);

            if (deletedForAll) {
                console.log('Redux: Удаляем сообщение для всех');
                // Удаляем сообщение для всех - полностью убираем из store
                delete state.messages[roomId].byId[messageId];
                state.messages[roomId].ids = state.messages[roomId].ids.filter(id => id !== messageId);

                console.log('Redux: Сообщение удалено из store, оставшиеся ID:', state.messages[roomId].ids);

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
                console.log('Redux: Скрываем сообщение для пользователя');
                const message = state.messages[roomId].byId[messageId];
                if (message) {
                    if (!message.hiddenForUserIds) {
                        message.hiddenForUserIds = [];
                    }

                    // Добавляем текущего пользователя в список скрытых
                    if (currentUserId && !message.hiddenForUserIds.includes(currentUserId)) {
                        message.hiddenForUserIds.push(currentUserId);
                        console.log('Redux: Добавлен пользователь в hiddenForUserIds:', currentUserId);
                    }
                }
            }

            // Обновляем кэш сообщений
            updateMessageCache(roomId, state.messages[roomId]);
            console.log('Redux: Кэш сообщений обновлен');
        })
        .addCase(markAsRead.fulfilled, (state, action) => {
          const { roomId } = action.payload;

          const oldUnread = state.unreadByRoomId[roomId] || 0;
          state.unreadByRoomId[roomId] = 0;

          const roomInList = state.rooms.byId[roomId];
          if (roomInList) {
            roomInList.unread = 0;
          }

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
                console.warn('Ошибка очистки кэша сообщений:', e);
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
                console.warn('Ошибка очистки кэша сообщений:', e);
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
        });
  },
});

export const { setActiveRoom, setTyping, receiveSocketMessage, receiveMessageDeleted, updateMessageStatus, updateUserOnlineStatus } = chatSlice.actions;
export default chatSlice.reducer;