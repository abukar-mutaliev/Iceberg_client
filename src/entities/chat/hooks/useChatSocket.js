import { useEffect, useRef } from 'react';
// Use UMD build to avoid engine.io webtransport resolution issues in React Native/Expo
// eslint-disable-next-line import/no-unresolved
import io from 'socket.io-client/dist/socket.io.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'react-native';
import { getBaseUrl } from '@shared/api/api';
import { featureFlags } from '@shared/config/featureFlags';
import {
  fetchRooms,
  fetchRoom,
  receiveSocketMessage,
  receiveMessageDeleted,
  setTyping,
  updateMessageStatus,
  updateUserOnlineStatus,
  setConnectionStatus,
  handleRoomDeleted,
  updatePollInMessage,
  updateRoomFromSocket,
} from '@entities/chat/model/slice';
import { setGlobalSocket } from './useChatSocketActions';

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

  // Отслеживаем состояние приложения для управления соединением
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('🔄 App state changed:', appStateRef.current, '->', nextAppState);
      
      if (socketRef.current) {
        if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
          // Приложение вернулось в активное состояние - проверяем соединение
          console.log('📱 App became active - checking WebSocket connection');
          if (!socketRef.current.connected) {
            console.log('🔌 Reconnecting WebSocket...');
            socketRef.current.connect();
          }
        } else if (nextAppState.match(/inactive|background/)) {
          // Приложение ушло в фон - НЕ отключаем WebSocket для получения уведомлений
          console.log('📱 App went to background - keeping WebSocket alive for push notifications');
        }
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
        console.log('🔌 Disconnecting WebSocket - user not authenticated');
        socketRef.current.disconnect();
        socketRef.current = null;
        setGlobalSocket(null); // Очищаем глобальную ссылку
        joinedRoomsRef.current.clear();
        dispatch(setConnectionStatus({ isConnected: false, transport: null }));
      }
      return;
    }

    let isMounted = true;
    const setup = async () => {
      try {
        const tokensStr = await AsyncStorage.getItem('tokens');
        const tokens = tokensStr ? JSON.parse(tokensStr) : null;
        let token = tokens?.accessToken;
        const refreshToken = tokens?.refreshToken;
        const baseUrl = getBaseUrl();

        if (!token || !refreshToken) {
          console.log('🔌 No tokens available, skipping WebSocket connection');
          return; // not authenticated; skip sockets
        }

        // Проверяем валидность refresh token перед подключением
        const { authService } = await import('@shared/api/api');
        const isRefreshTokenValid = authService.isTokenValid(refreshToken);
        
        if (!isRefreshTokenValid) {
          console.error('❌ Refresh token expired, skipping WebSocket connection');
          return;
        }

        // Проверяем валидность access token и обновляем если истек
        const isAccessTokenValid = authService.isTokenValid(token);
        
        if (!isAccessTokenValid) {
          console.log('🔄 Access token expired, refreshing before WebSocket connection...');
          try {
            const refreshed = await authService.refreshAccessToken();
            if (refreshed?.accessToken) {
              token = refreshed.accessToken;
              console.log('✅ Access token refreshed successfully for WebSocket');
            } else {
              console.error('❌ Failed to refresh access token, skipping WebSocket connection');
              return;
            }
          } catch (refreshError) {
            console.error('❌ Error refreshing token for WebSocket:', refreshError?.message || refreshError);
            return;
          }
        }

        // Socket.IO автоматически добавляет /socket.io/ к URL, поэтому используем HTTP URL
        // но принудительно включаем WebSocket transport
        console.log('🔌 Attempting to connect to WebSocket:', { baseUrl, hasToken: !!token });
        
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
          console.log('🔌 Chat socket connected successfully!', {
            socketId: socket.id,
            transport,
            connected: socket.connected,
            deviceInfo: {
              platform: require('react-native').Platform.OS,
              version: require('react-native').Platform.Version
            }
          });
          
          // Обновляем статус соединения в Redux
          dispatch(setConnectionStatus({
            isConnected: true,
            transport,
            reconnectAttempts: 0
          }));
          
          // join existing rooms
          const roomIds = roomsState?.ids || [];
          console.log('🏠 Auto-joining rooms:', roomIds);
          
          roomIds.forEach((roomId) => {
            if (!joinedRoomsRef.current.has(roomId)) {
              console.log('🏠 Attempting to join room:', roomId);
              socket.emit('chat:join', { roomId });
              joinedRoomsRef.current.add(roomId);
              console.log('🏠 ✅ Joined room:', roomId);
            }
          });
        });

        socket.on('disconnect', (reason) => {
          console.warn('⚠️ Chat socket disconnected:', {
            reason,
            transport: socket?.io?.engine?.transport?.name,
            socketId: socket?.id,
            timestamp: new Date().toISOString()
          });
          
          // Обновляем статус соединения в Redux
          dispatch(setConnectionStatus({
            isConnected: false,
            transport: null,
            reconnectAttempts: 0
          }));
          
          joinedRoomsRef.current.clear();
        });

        // Обработчик попытки переподключения - обновляем токен перед каждой попыткой
        socket.io.on('reconnect_attempt', async (attempt) => {
          console.log(`🔄 Reconnection attempt #${attempt} - refreshing token...`);
          try {
            const currentTokensStr = await AsyncStorage.getItem('tokens');
            const currentTokens = currentTokensStr ? JSON.parse(currentTokensStr) : null;
            
            if (currentTokens?.accessToken && currentTokens?.refreshToken) {
              const { authService: reconnectAuthService } = await import('@shared/api/api');
              const isAccessTokenValid = reconnectAuthService.isTokenValid(currentTokens.accessToken);
              
              if (!isAccessTokenValid) {
                console.log('🔄 Access token expired on reconnect, refreshing...');
                const refreshed = await reconnectAuthService.refreshAccessToken();
                if (refreshed?.accessToken) {
                  socket.auth = { token: refreshed.accessToken };
                  console.log('✅ Token refreshed for reconnection attempt');
                } else {
                  console.warn('⚠️ Failed to refresh token on reconnect attempt');
                }
              }
            }
          } catch (err) {
            console.error('❌ Error refreshing token on reconnect:', err?.message || err);
          }
        });

        socket.on('connect_error', async (error) => {
          console.error('❌ Chat socket connection error:', {
            error: error.message,
            type: error.type,
            description: error.description,
            context: error.context,
            timestamp: new Date().toISOString(),
            baseUrl
          });
          
          // Если ошибка связана с JWT, пытаемся обновить токен и переподключиться
          if (error.message?.includes('jwt expired') || 
              error.message?.includes('Token expired') || 
              error.message?.includes('jwt invalid') ||
              error.message?.includes('unauthorized')) {
            try {
              console.log('🔄 JWT error, attempting to refresh token...');
              
              // Проверяем валидность refresh token перед попыткой обновления
              const currentTokensStr = await AsyncStorage.getItem('tokens');
              const currentTokens = currentTokensStr ? JSON.parse(currentTokensStr) : null;
              
              if (!currentTokens?.refreshToken) {
                console.error('❌ No refresh token available, cannot reconnect WebSocket');
                socket.disconnect();
                return;
              }
              
              const { authService } = await import('@shared/api/api');
              const isRefreshTokenValid = authService.isTokenValid(currentTokens.refreshToken);
              
              if (!isRefreshTokenValid) {
                console.error('❌ Refresh token expired, cannot reconnect WebSocket');
                socket.disconnect();
                return;
              }
              
              console.log('🔄 Refresh token is valid, trying to refresh access token...');
              const refreshed = await authService.refreshAccessToken();
              
              if (refreshed?.accessToken) {
                console.log('✅ Token refreshed successfully');
                // Обновляем токен в socket auth и переподключаемся
                socket.auth = { token: refreshed.accessToken };
                console.log('🔌 Reconnecting with fresh token...');
                setTimeout(() => {
                  if (socket && !socket.connected) {
                    socket.connect();
                  }
                }, 1000);
              } else {
                console.warn('⚠️ Could not refresh token for WebSocket');
                // Отключаем WebSocket если не удалось обновить токен
                if (socket) {
                  socket.disconnect();
                }
              }
            } catch (refreshError) {
              console.error('❌ Error refreshing token for WebSocket:', refreshError?.message || refreshError);
              // Отключаем WebSocket при критической ошибке
              if (socket) {
                socket.disconnect();
              }
            }
          }
        });

        socket.on('reconnect', (attemptNumber) => {
          console.log('🔄 Chat socket reconnected after', attemptNumber, 'attempts');
        });

        socket.on('reconnect_error', (error) => {
          console.error('🔄❌ Chat socket reconnection failed:', error.message);
        });

        socket.on('reconnect_failed', () => {
          console.error('🔄💀 Chat socket reconnection completely failed');
        });

        // incoming events
        socket.on('chat:message:new', (payload) => {
          // payload: { roomId, message }
          const messageId = payload?.message?.id;
          
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
          
          // Передаем currentUserId для проверки оптимистичных сообщений
          dispatch(receiveSocketMessage({ ...payload, currentUserId }));
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
            dispatch(receiveSocketMessage({ 
              roomId: payload.roomId, 
              message: payload.message,
              currentUserId 
            }));
          }
        });

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
        socket.on('chat:reaction:updated', (payload) => {
          // payload: { messageId, reactions }
          if (__DEV__) {
            console.log('🔄 [WEBSOCKET] Reactions updated FULL:', {
              messageId: payload?.messageId,
              reactionsCount: payload?.reactions?.length,
              reactions: JSON.stringify(payload?.reactions),
              payload: JSON.stringify(payload)
            });
          }
          
          if (!payload?.messageId) {
            if (__DEV__) {
              console.error('❌ [WEBSOCKET] Invalid payload for reaction:updated', payload);
            }
            return;
          }
          
          // Обновляем реакции в сообщении
          dispatch(updateMessageReactions({
            messageId: payload.messageId,
            reactions: payload.reactions || []
          }));
        });

        socket.on('chat:typing', ({ roomId, userIds }) => {
          dispatch(setTyping({ roomId, userIds }));
        });

        // Обновление статусов сообщений в real-time
        socket.on('chat:message:status', (payload) => {
          // payload: { roomId, messageId, status, deliveredAt?, readAt?, updatedBy }
          console.log('📡 [WEBSOCKET] Status update:', payload);

          // Дополнительная проверка перед диспатчем
          if (!payload.roomId || !payload.messageId) {
            console.error('❌ [WEBSOCKET] Invalid payload:', payload);
            return;
          }

          dispatch(updateMessageStatus(payload));
        });

        socket.on('chat:user:status', (payload) => {
          dispatch(updateUserOnlineStatus(payload));
        });

        socket.on('chat:room:updated', (payload) => {
          const { room } = payload || {};
          // Если данные комнаты пришли в payload, обновляем напрямую
          if (room && room.id) {
            dispatch(updateRoomFromSocket(room));
            // Также перезагружаем полные данные комнаты для обновления участников
            dispatch(fetchRoom(room.id));
          } else {
            // Если данных нет, просто перезагружаем список комнат
            dispatch(fetchRooms({ page: 1 }));
          }
        });

        socket.on('chat:room:deleted', (payload) => {
          console.log('🗑️ [WEBSOCKET] Room deleted:', payload);
          const { roomId } = payload || {};
          if (roomId) {
            dispatch(handleRoomDeleted({ roomId }));
          }
        });

        socket.on('chat:join:success', (payload) => {
          console.log('🏠 ✅ Successfully joined room:', payload);
        });

        socket.on('chat:join:error', (payload) => {
          console.error('🏠 ❌ Failed to join room:', payload);
          if (payload?.roomId) {
            joinedRoomsRef.current.delete(payload.roomId);
          }
        });

        socketRef.current = socket;
        setGlobalSocket(socket);
      } catch (e) {
        // console.error('Socket init error', e);
      }
    };

    setup();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setGlobalSocket(null); // Очищаем глобальную ссылку
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

