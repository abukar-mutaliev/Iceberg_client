import { useEffect, useRef } from 'react';
// Use UMD build to avoid engine.io webtransport resolution issues in React Native/Expo
// eslint-disable-next-line import/no-unresolved
import io from 'socket.io-client/dist/socket.io.js';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { AppState } from 'react-native';
import { getBaseUrl } from '@shared/api/api';
import { featureFlags } from '@shared/config/featureFlags';
import { enrichStopChatMessageFromStore } from '@entities/chat/lib/enrichStopChatMessageFromStore';
import {
  fetchRooms,
  fetchRoom,
  fetchMessages,
  receiveSocketMessage,
  receiveMessageDeleted,
  receiveMessageUpdated,
  setTyping,
  setTypingActivity,
  setLastActivityType,
  updateMessageStatus,
  updateUserOnlineStatus,
  setConnectionStatus,
  handleRoomDeleted,
  updatePollInMessage,
  updateRoomFromSocket,
  updateMessageReactions,
} from '@entities/chat/model/slice';
import { selectLastActivityType } from '@entities/chat/model/selectors';
import { setGlobalSocket, getActivityTypeCache, setActivityTypeCache } from './useChatSocketActions';
import { playReceiveSound } from '@entities/chat/lib/receiveSound';
import pushNotificationService from '@shared/services/PushNotificationService';

const getUserDistrictIdsFromUser = (user) => {
  if (!user) return [];
  const role = user.role;
  if (role === 'CLIENT' && user.client?.districtId) {
    return [user.client.districtId];
  }
  if ((role === 'EMPLOYEE' || role === 'DRIVER') && user[role.toLowerCase()]?.districts) {
    return user[role.toLowerCase()].districts
      .map(d => d?.id || d)
      .filter(id => id != null);
  }
  return [];
};

// Simple throttle helper
const throttle = (fn, wait) => {
  let inFlight = false;
  let lastArgs = null;
  return (...args) => {
    lastArgs = args;
    if (inFlight) return;
    inFlight = true;
    fn(...lastArgs);
    setTimeout(() => { inFlight = false; }, wait);
  };
};

export const useChatSocket = () => {
  const dispatch = useDispatch();
  const store = useStore();
  const roomsState = useSelector((s) => s.chat?.rooms);
  // Проверяем и наличие пользователя И наличие токенов
  const isAuthenticated = useSelector((s) => 
    !!(s.auth?.user?.id && s.auth?.tokens?.accessToken && s.auth?.tokens?.refreshToken)
  );
  const currentUserId = useSelector((s) => s.auth?.user?.id);
  const socketRef = useRef(null);
  const joinedRoomsRef = useRef(new Set());
  const appStateRef = useRef(AppState.currentState);
  const processedMessageIdsRef = useRef(new Set()); // Дедупликация сообщений
  const processedReactionUpdatesRef = useRef(new Map()); // Дедупликация обновлений реакций: messageId -> timestamp

  // Троттлим полный перезапрос списка комнат: при нестабильном соединении
  // (частые reconnect в dev) события chat:room:updated без данных комнаты
  // могут прилетать пачками и дёргать fetchRooms по несколько раз в секунду,
  // из-за чего список "мигает"/перезагружается. Ограничиваем не чаще 1 раза в 5с.
  const throttledFetchRoomsRef = useRef(
    throttle(() => {
      dispatch(fetchRooms({ page: 1 }));
    }, 5000)
  );

  // Отслеживаем состояние приложения для управления соединением
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (socketRef.current) {
        if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
          // Приложение вернулось в активное состояние - проверяем соединение
          if (!socketRef.current.connected) {
            socketRef.current.connect();
          }
        }
        // В фоне НЕ отключаем WebSocket - держим соединение для push-уведомлений
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (!featureFlags.chat || !isAuthenticated) {
      // Отключаем WebSocket если пользователь не авторизован
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setGlobalSocket(null); // Очищаем глобальную ссылку
        joinedRoomsRef.current.clear();
        dispatch(setConnectionStatus({ isConnected: false, transport: null }));
      }
      return;
    }

    let isMounted = true;
    const setup = async (attempt = 0) => {
      try {
        const { authService } = await import('@shared/api/api');
        // Единая точка чтения токенов (восстанавливает AsyncStorage из Redux при рассинхроне)
        const tokens = await authService.getStoredTokens();
        let token = tokens?.accessToken;
        const refreshToken = tokens?.refreshToken;
        const baseUrl = getBaseUrl();

        if (!token || !refreshToken) {
          if (attempt < 2 && isMounted) {
            setTimeout(() => {
              if (isMounted) setup(attempt + 1);
            }, 700);
          }
          return;
        }

        const isRefreshTokenValid = authService.isTokenValid(refreshToken);
        
        if (!isRefreshTokenValid) {
          if (__DEV__) console.warn('Refresh token expired, skipping WebSocket connection');
          return;
        }

        // Проверяем валидность access token и обновляем если истек
        const isAccessTokenValid = authService.isTokenValid(token);
        
        if (!isAccessTokenValid) {
          try {
            const refreshed = await authService.refreshAccessToken();
            if (refreshed?.accessToken) {
              token = refreshed.accessToken;
            } else {
              if (attempt < 1 && isMounted) {
                setTimeout(() => {
                  if (isMounted) setup(attempt + 1);
                }, 900);
              }
              return;
            }
          } catch (refreshError) {
            if (__DEV__) console.warn('Error refreshing token for WebSocket:', refreshError?.message || refreshError);
            if (attempt < 1 && isMounted) {
              setTimeout(() => {
                if (isMounted) setup(attempt + 1);
              }, 900);
            }
            return;
          }
        }

        // Socket.IO автоматически добавляет /socket.io/ к URL, поэтому используем HTTP URL
        // но принудительно включаем WebSocket transport
        const socket = io(baseUrl, {
          transports: ['websocket', 'polling'], // Добавляем polling как fallback для проблемных устройств
          auth: { token }, // Используем текущий токен
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000, // Увеличиваем timeout для медленных устройств
          forceNew: true, // Принудительно создаем новое соединение
        });

        socket.on('connect', () => {
          const transport = socket.io.engine.transport.name;

          // Обновляем статус соединения в Redux
          dispatch(setConnectionStatus({
            isConnected: true,
            transport,
            reconnectAttempts: 0
          }));
          
          // join existing rooms
          const roomIds = roomsState?.ids || [];
          
          roomIds.forEach((roomId) => {
            if (!joinedRoomsRef.current.has(roomId)) {
              socket.emit('chat:join', { roomId });
              joinedRoomsRef.current.add(roomId);
            }
          });

          // Подтягиваем актуальные сообщения активной комнаты после (ре)коннекта.
          // Пока сокет был отключен, могли прийти удаления (chat:message:deleted)
          // и обновления, которых мы не получили. fetchMessages вернет свежий
          // снапшот, а reconciliation в fetchMessages.fulfilled удалит из стора
          // и кэша сообщения, которые были удалены на сервере.
          try {
            const currentActiveRoomId = store.getState()?.chat?.activeRoomId;
            if (currentActiveRoomId) {
              dispatch(fetchMessages({ roomId: currentActiveRoomId, limit: 100 }));
            }
          } catch (e) {
            // Не должно ломать обработчик connect
            if (__DEV__) {
              console.warn('useChatSocket: failed to refresh active room on connect', e?.message);
            }
          }
        });

        socket.on('disconnect', (reason) => {
          if (__DEV__) console.warn('Chat socket disconnected:', reason);

          // Обновляем статус соединения в Redux
          dispatch(setConnectionStatus({
            isConnected: false,
            transport: null,
            reconnectAttempts: 0
          }));
          
          joinedRoomsRef.current.clear();
        });

        // Обработчик попытки переподключения - обновляем токен перед каждой попыткой
        socket.io.on('reconnect_attempt', async () => {
          try {
            const currentTokens = await authService.getStoredTokens();

            if (currentTokens?.accessToken && currentTokens?.refreshToken) {
              const isAccessTokenValid = authService.isTokenValid(currentTokens.accessToken);

              if (!isAccessTokenValid) {
                const refreshed = await authService.refreshAccessToken();
                if (refreshed?.accessToken) {
                  socket.auth = { token: refreshed.accessToken };
                }
              }
            }
          } catch (err) {
            if (__DEV__) console.warn('Error refreshing token on reconnect:', err?.message || err);
          }
        });

        socket.on('connect_error', async (error) => {
          if (__DEV__) console.warn('Chat socket connection error:', error?.message);

          // Если ошибка связана с JWT, пытаемся обновить токен и переподключиться
          if (error.message?.includes('jwt expired') || 
              error.message?.includes('Token expired') || 
              error.message?.includes('jwt invalid') ||
              error.message?.includes('unauthorized')) {
            try {
              const currentTokens = await authService.getStoredTokens();

              if (!currentTokens?.refreshToken) {
                socket.disconnect();
                return;
              }

              const isRefreshTokenValid = authService.isTokenValid(currentTokens.refreshToken);
              
              if (!isRefreshTokenValid) {
                socket.disconnect();
                return;
              }
              
              const refreshed = await authService.refreshAccessToken();
              
              if (refreshed?.accessToken) {
                // Обновляем токен в socket auth и переподключаемся
                socket.auth = { token: refreshed.accessToken };
                setTimeout(() => {
                  if (socket && !socket.connected) {
                    socket.connect();
                  }
                }, 1000);
              } else if (socket) {
                // Отключаем WebSocket если не удалось обновить токен
                socket.disconnect();
              }
            } catch (refreshError) {
              if (__DEV__) console.warn('Error refreshing token for WebSocket:', refreshError?.message || refreshError);
              // Отключаем WebSocket при критической ошибке
              if (socket) {
                socket.disconnect();
              }
            }
          }
        });

        socket.on('reconnect_error', (error) => {
          if (__DEV__) console.warn('Chat socket reconnection error:', error?.message);
        });

        socket.on('reconnect_failed', () => {
          if (__DEV__) console.warn('Chat socket reconnection failed');
        });

        // incoming events
        socket.on('chat:message:new', (payload) => {
          // payload: { roomId, message }
          const messageId = payload?.message?.id;
          const roomId = payload?.roomId;
          const message = payload?.message;
          
          // Дедупликация: проверяем, не обрабатывали ли мы уже это сообщение
          if (messageId && processedMessageIdsRef.current.has(messageId)) {
            return; // Игнорируем дубликат
          }
          
          // Добавляем ID в обработанные
          if (messageId) {
            processedMessageIdsRef.current.add(messageId);
            
            // Очищаем старые ID (оставляем только последние 1000)
            if (processedMessageIdsRef.current.size > 1000) {
              const idsArray = Array.from(processedMessageIdsRef.current);
              idsArray.slice(0, 500).forEach(id => processedMessageIdsRef.current.delete(id));
            }
          }
          
          // Воспроизводим звук входящего сообщения, если:
          // 1. Чат открыт (roomId совпадает с activeRoomId)
          // 2. Сообщение не от текущего пользователя
          const isIncomingMessage = message?.senderId && message.senderId !== currentUserId;
          
          // Получаем актуальное значение activeRoomId из store
          const currentActiveRoomId = store.getState()?.chat?.activeRoomId;
          const isActiveRoom = currentActiveRoomId && roomId &&
            Number(currentActiveRoomId) === Number(roomId);
          
          if (isIncomingMessage && isActiveRoom) {
            // Воспроизводим звук входящего сообщения
            playReceiveSound();
          }
          
          // Передаем currentUserId и userDistrictIds для фильтрации STOP и подсчета unread
          const freshState = store.getState();
          const currentAuthUser = freshState?.auth?.user;
          const freshUserId = currentAuthUser?.id || currentUserId;
          const userDistrictIds = getUserDistrictIdsFromUser(currentAuthUser);

          const enrichedMessage = enrichStopChatMessageFromStore(message, freshState);

          if (__DEV__ && message?.type === 'STOP') {
            console.log('[useChatSocket] STOP message received', {
              roomId,
              messageType: message.type,
              userRole: currentAuthUser?.role,
              clientDistrictId: currentAuthUser?.client?.districtId,
              userDistrictIds,
              stopDistrictId:
                enrichedMessage?.stop?.districtId ?? message?.stop?.districtId,
            });
          }

          dispatch(
            receiveSocketMessage({
              ...payload,
              message: enrichedMessage,
              currentUserId: freshUserId,
              userDistrictIds,
            })
          );
        });

        socket.on('chat:message:deleted', (payload) => {
          // payload: { roomId, messageId, forAll }
          if (__DEV__) {
            console.log('🗑️ [WEBSOCKET] Message deleted event received:', {
              payload,
              roomId: payload?.roomId,
              messageId: payload?.messageId,
              messageIdType: typeof payload?.messageId,
              forAll: payload?.forAll
            });
          }
          
          if (!payload?.roomId || !payload?.messageId) {
            if (__DEV__) {
              console.error('❌ [WEBSOCKET] Invalid payload for message:deleted', payload);
            }
            return;
          }
          
          dispatch(receiveMessageDeleted(payload));
        });

        socket.on('chat:message:updated', (payload) => {
          if (!payload?.roomId || !payload?.message?.id) {
            if (__DEV__) {
              console.error('❌ [WEBSOCKET] Invalid payload for message:updated', payload);
            }
            return;
          }

          const s = store.getState();
          dispatch(
            receiveMessageUpdated({
              ...payload,
              message: enrichStopChatMessageFromStore(payload.message, s),
            })
          );
        });

        socket.on('chat:poll:updated', (payload) => {
          // payload: { messageId, roomId, poll, message }
          if (__DEV__) {
            console.log('📊 [WEBSOCKET] Poll updated event received:', {
              payload,
              messageId: payload?.messageId,
              roomId: payload?.roomId,
              hasPoll: !!payload?.poll
            });
          }
          
          if (!payload?.messageId || !payload?.roomId || !payload?.poll) {
            if (__DEV__) {
              console.error('❌ [WEBSOCKET] Invalid payload for poll:updated', payload);
            }
            return;
          }
          
          // Обновляем опрос в сообщении
          dispatch(updatePollInMessage({
            messageId: payload.messageId,
            roomId: payload.roomId,
            poll: payload.poll
          }));
          
          // Если пришло полное сообщение, обновляем его
          if (payload.message) {
            const s = store.getState();
            const currentAuthUser = s?.auth?.user;
            const freshUserId = currentAuthUser?.id || currentUserId;
            const userDistrictIdsPoll = getUserDistrictIdsFromUser(currentAuthUser);
            dispatch(
              receiveSocketMessage({
                roomId: payload.roomId,
                message: enrichStopChatMessageFromStore(payload.message, s),
                currentUserId: freshUserId,
                userDistrictIds: userDistrictIdsPoll,
              })
            );
          }
        });

        // Удаляем старые обработчики перед регистрацией новых, чтобы избежать дублирования
        socket.off('chat:reaction:added');
        socket.on('chat:reaction:added', (payload) => {
          // payload: { roomId, messageId, reaction }
          if (__DEV__) {
            console.log('👍 [WEBSOCKET] Reaction added event received:', {
              payload,
              messageId: payload?.messageId,
              roomId: payload?.roomId,
              hasReaction: !!payload?.reaction
            });
          }
          
          if (!payload?.messageId || !payload?.roomId || !payload?.reaction) {
            if (__DEV__) {
              console.error('❌ [WEBSOCKET] Invalid payload for reaction:added', payload);
            }
            return;
          }
          
          // Обновляем реакции в сообщении
          dispatch(updateMessageReactions({
            messageId: payload.messageId,
            roomId: payload.roomId,
            reactions: payload.reaction
          }));
        });

        socket.off('chat:reaction:removed');
        socket.on('chat:reaction:removed', (payload) => {
          // payload: { roomId, messageId, reactionId }
          if (__DEV__) {
            console.log('👎 [WEBSOCKET] Reaction removed event received:', {
              payload,
              messageId: payload?.messageId,
              roomId: payload?.roomId,
              reactionId: payload?.reactionId
            });
          }
          
          if (!payload?.messageId || !payload?.roomId || !payload?.reactionId) {
            if (__DEV__) {
              console.error('❌ [WEBSOCKET] Invalid payload for reaction:removed', payload);
            }
            return;
          }
          
          // Обновляем реакции в сообщении
          dispatch(updateMessageReactions({
            messageId: payload.messageId,
            roomId: payload.roomId,
            reactions: payload.reaction
          }));
        });

        // Обработчик обновления реакций (от сервера через WebSocket)
        // Удаляем старый обработчик перед регистрацией нового, чтобы избежать дублирования
        socket.off('chat:reaction:updated');
        socket.on('chat:reaction:updated', (payload) => {
          // payload: { messageId, reactions }
          if (__DEV__) {
            console.log('🔄 [WEBSOCKET] Reactions updated FULL:', {
              messageId: payload?.messageId,
              reactionsCount: payload?.reactions?.length,
              reactions: payload?.reactions,
              payload: payload,
              hasReactions: !!payload?.reactions,
              isArray: Array.isArray(payload?.reactions)
            });
          }
          
          if (!payload?.messageId) {
            if (__DEV__) {
              console.error('❌ [WEBSOCKET] Invalid payload for reaction:updated - missing messageId', payload);
            }
            return;
          }
          
          if (!Array.isArray(payload?.reactions)) {
            if (__DEV__) {
              console.error('❌ [WEBSOCKET] Invalid payload for reaction:updated - reactions is not an array', {
                reactions: payload?.reactions,
                type: typeof payload?.reactions
              });
            }
            return;
          }
          
          // Дедупликация: проверяем, не обрабатывали ли мы это обновление недавно
          const messageId = payload.messageId;
          const now = Date.now();
          const lastProcessed = processedReactionUpdatesRef.current.get(messageId);
          
          // Создаем упрощенный hash для сравнения (только emoji+userId, без ID и timestamp)
          const reactionsSummary = payload.reactions
            ?.map(r => `${r.emoji}:${r.userId}`)
            .sort()
            .join(',') || '';
          
          // Создаем hash для проверки дубликатов (включая количество реакций)
          const reactionsHash = JSON.stringify(payload.reactions?.map(r => ({ emoji: r.emoji, userId: r.userId })).sort((a, b) => {
            if (a.emoji !== b.emoji) return a.emoji.localeCompare(b.emoji);
            return a.userId - b.userId;
          }));
          
          // Если это то же самое обновление (тот же messageId и те же реакции) в течение последних 1000мс - игнорируем
          if (lastProcessed && (now - lastProcessed.timestamp) < 1000 && lastProcessed.hash === reactionsHash) {
            if (__DEV__) {
              console.log('⏭️ [WEBSOCKET] Skipping duplicate reaction update', {
                messageId,
                timeSinceLastUpdate: now - lastProcessed.timestamp,
                summary: reactionsSummary,
                hash: reactionsHash,
                lastTimestamp: lastProcessed.timestamp,
                currentTimestamp: now
              });
            }
            return;
          }
          
          // Сохраняем информацию об обработанном обновлении ПЕРЕД обработкой
          processedReactionUpdatesRef.current.set(messageId, {
            timestamp: now,
            summary: reactionsSummary,
            hash: reactionsHash
          });
          
          // Очищаем старые записи (старше 5 секунд)
          for (const [msgId, data] of processedReactionUpdatesRef.current.entries()) {
            if (now - data.timestamp > 5000) {
              processedReactionUpdatesRef.current.delete(msgId);
            }
          }
          
          // Обновляем реакции в сообщении
          // ВАЖНО: Сервер является источником правды - всегда используем данные от сервера
          if (__DEV__) {
            console.log('✅ [WEBSOCKET] Dispatching updateMessageReactions', {
              messageId: payload.messageId,
              reactionsCount: payload.reactions?.length || 0,
              reactions: payload.reactions,
              reactionsIds: payload.reactions?.map(r => r.id),
              timestamp: now
            });
          }
          
          dispatch(updateMessageReactions({
            messageId: payload.messageId,
            reactions: payload.reactions || []
          }));
        });

        socket.on('chat:typing', (payload) => {
          const { roomId, userId, type, isVoice, isTyping, userIds } = payload;

          if (isTyping && userId) {
            // Определяем тип активности: сначала проверяем payload, затем используем сохраненный тип
            let activityType = null;
            
            if (isVoice === true || type === 'voice') {
              activityType = 'voice';
            } else if (isVoice === false || type === 'text') {
              activityType = 'text';
            } else {
              // Если тип не указан в payload, используем сохраненный тип из синхронного кэша или Redux
              const cachedType = getActivityTypeCache(roomId, userId);
              const savedType = selectLastActivityType(store.getState(), roomId, userId);
              
              // Приоритет: Redux "voice" > кэш "voice" > кэш другой тип > Redux другой тип > дефолт
              if (savedType === 'voice') {
                // Если в Redux "voice", всегда используем его, даже если в кэше "text"
                activityType = 'voice';
                // Синхронизируем кэш с Redux
                setActivityTypeCache(roomId, userId, 'voice');
              } else if (cachedType === 'voice') {
                // Если в кэше "voice", используем его
                activityType = 'voice';
              } else if (cachedType) {
                // Если в кэше есть другой тип, используем его
                activityType = cachedType;
              } else if (savedType) {
                // Если в кэше нет типа, используем Redux
                activityType = savedType;
                // Синхронизируем кэш с Redux только если это не перезапись "voice" на "text"
                setActivityTypeCache(roomId, userId, savedType);
              } else {
                // Если сохраненного типа нет, используем 'text' по умолчанию
                activityType = 'text';
              }
            }
            
            // Если тип не определен, используем дефолтный "text"
            if (!activityType) {
              activityType = 'text';
            }
            
            // Сохраняем тип активности в Redux
            // В кэш сохраняем ТОЛЬКО если тип был явно указан в payload
            // Если тип был взят из кэша, не перезаписываем кэш (он уже содержит правильное значение)
            const wasTypeFromPayload = (isVoice !== undefined || type !== undefined);
            
            if (wasTypeFromPayload) {
              // Тип был из payload - сохраняем в кэш и Redux
              setActivityTypeCache(roomId, userId, activityType);
              dispatch(setLastActivityType({ roomId, userId, type: activityType }));
            } else {
              // Тип был из кэша или Redux - обновляем только Redux, кэш не трогаем
              dispatch(setLastActivityType({ roomId, userId, type: activityType }));
            }
            
            dispatch(setTypingActivity({ roomId, userId, type: activityType }));
          } else if (!isTyping && userId) {
            dispatch(setTypingActivity({ roomId, userId, type: null }));
            // НЕ очищаем последний тип активности при остановке - он может понадобиться для следующего события
          } else if (userIds && Array.isArray(userIds)) {
            // Fallback для старого формата (если сервер еще не обновлен)
            dispatch(setTyping({ roomId, userIds }));
          }
        });

        // Обновление статусов сообщений в real-time
        socket.on('chat:message:status', (payload) => {
          // payload: { roomId, messageId, status, deliveredAt?, readAt?, updatedBy }
          // Дополнительная проверка перед диспатчем
          if (!payload.roomId || !payload.messageId) {
            if (__DEV__) console.warn('[WEBSOCKET] Invalid status payload');
            return;
          }

          dispatch(updateMessageStatus(payload));
        });

        socket.on('chat:user:status', (payload) => {
          dispatch(updateUserOnlineStatus(payload));
        });

        socket.on('chat:room:updated', (payload) => {
          const { room, roomId } = payload || {};
          // Если данные комнаты пришли в payload, обновляем напрямую (дёшево, без сети)
          if (room && room.id) {
            dispatch(updateRoomFromSocket(room));
            dispatch(fetchRoom(room.id));
          } else if (roomId) {
            dispatch(fetchRoom(roomId));
          } else {
            // Данных комнаты нет — перезапрашиваем список, но не чаще раза в 5с,
            // чтобы серия событий (в т.ч. при reconnect) не перегружала список.
            throttledFetchRoomsRef.current();
          }
        });

        socket.on('chat:room:deleted', (payload) => {
          const { roomId } = payload || {};
          if (roomId) {
            dispatch(handleRoomDeleted({ roomId }));
          }
        });

        socket.on('chat:join:error', (payload) => {
          if (__DEV__) console.warn('[WEBSOCKET] Failed to join room:', payload?.roomId);
          if (payload?.roomId) {
            joinedRoomsRef.current.delete(payload.roomId);
          }
        });

        socketRef.current = socket;
        setGlobalSocket(socket);
        pushNotificationService.setupWebSocketListener(socket);
      } catch (e) {
        // console.error('Socket init error', e);
      }
    };

    setup();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        pushNotificationService.removeWebSocketListener(socketRef.current);
        socketRef.current.off('chat:reaction:added');
        socketRef.current.off('chat:reaction:removed');
        socketRef.current.off('chat:reaction:updated');
        socketRef.current.disconnect();
        socketRef.current = null;
        setGlobalSocket(null);
      }
      joinedRoomsRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureFlags.chat, isAuthenticated]);

  // Join new rooms as they appear
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const roomIds = roomsState?.ids || [];
    roomIds.forEach((roomId) => {
      if (!joinedRoomsRef.current.has(roomId)) {
        socket.emit('chat:join', { roomId });
        joinedRoomsRef.current.add(roomId);
      }
    });
  }, [roomsState?.ids]);

  // Этот хук теперь только инициализирует соединение
  // Для использования WebSocket функций используйте useChatSocketActions
};

