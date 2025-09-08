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
  receiveSocketMessage,
  receiveMessageDeleted,
  setTyping,
  updateMessageStatus,
  updateUserOnlineStatus,
  setConnectionStatus,
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
  const isAuthenticated = useSelector((s) => !!s.auth?.user?.id);
  const socketRef = useRef(null);
  const joinedRoomsRef = useRef(new Set());
  const appStateRef = useRef(AppState.currentState);

  // Отслеживаем состояние приложения для управления соединением
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('🔄 App state changed:', appStateRef.current, '->', nextAppState);
      
      if (socketRef.current) {
        if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
          // Приложение вернулось в активное состояние - проверяем и переподключаем
          console.log('📱 App became active - checking WebSocket connection');
          
          const isConnected = socketRef.current.connected;
          console.log('🔍 WebSocket status:', {
            connected: isConnected,
            socketId: socketRef.current.id,
            transport: socketRef.current.io?.engine?.transport?.name
          });
          
          if (!isConnected) {
            console.log('🔌 WebSocket disconnected - reconnecting...');
            socketRef.current.connect();
          } else {
            console.log('✅ WebSocket still connected - rejoining rooms...');
            // Даже если подключен, перезаходим в комнаты на всякий случай
            const roomIds = roomsState?.ids || [];
            roomIds.forEach((roomId) => {
              console.log('🏠 Re-joining room after app activation:', roomId);
              socketRef.current.emit('chat:join', { roomId }, (response) => {
                if (response?.ok) {
                  console.log('🏠 ✅ Re-joined room successfully:', roomId);
                } else {
                  console.error('🏠 ❌ Failed to re-join room:', roomId, response?.error);
                }
              });
            });
          }
          
          // Принудительно обновляем список комнат при возвращении в приложение
          setTimeout(() => {
            if (dispatch) {
              console.log('🔄 Refreshing rooms after app activation');
              dispatch(fetchRooms({ page: 1 }));
            }
          }, 1000);
          
        } else if (nextAppState.match(/inactive|background/)) {
          // Приложение ушло в фон - НЕ отключаем WebSocket для получения уведомлений
          console.log('📱 App went to background - keeping WebSocket alive for push notifications');
        }
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [dispatch, roomsState?.ids]);

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
        console.log('🔌 [DEBUG] Starting Socket.IO setup...');

        const tokensStr = await AsyncStorage.getItem('tokens');
        console.log('🔌 [DEBUG] Raw tokens from AsyncStorage:', {
          tokensStr: tokensStr ? `${tokensStr.substring(0, 50)}...` : 'null',
          tokensStrLength: tokensStr?.length || 0
        });

        const tokens = tokensStr ? JSON.parse(tokensStr) : null;
        console.log('🔌 [DEBUG] Parsed tokens object:', {
          hasTokens: !!tokens,
          hasAccessToken: !!tokens?.accessToken,
          hasRefreshToken: !!tokens?.refreshToken,
          accessTokenLength: tokens?.accessToken?.length || 0,
          refreshTokenLength: tokens?.refreshToken?.length || 0
        });

        const token = tokens?.accessToken;
        const baseUrl = getBaseUrl();

        // Проверяем валидность токена
        let isTokenValid = false;
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            isTokenValid = payload.exp > currentTime;
            console.log('🔌 [DEBUG] Token validation:', {
              exp: payload.exp,
              currentTime,
              isValid: isTokenValid,
              timeToExpiry: payload.exp - currentTime
            });
          } catch (decodeError) {
            console.error('🔌 [DEBUG] Token decode error:', decodeError.message);
            isTokenValid = false;
          }
        }

           console.log('🔌 [DEBUG] Final token check:', {
             hasToken: !!token,
             isTokenValid,
             tokenLength: token?.length || 0,
             tokenPrefix: token ? `${token.substring(0, 50)}...` : 'no token',
             tokenEnd: token ? `...${token.substring(Math.max(0, token.length - 50))}` : 'no token',
             baseUrl
           });

        if (!token || !isTokenValid) {
          console.warn('🔌 [WARNING] No valid access token found, skipping WebSocket connection');
          return; // not authenticated; skip sockets
        }

        console.log('🔌 Attempting to connect to WebSocket:', {
            baseUrl,
            hasToken: !!token,
            isProductionUrl: baseUrl === 'http://212.67.11.134:5000'
        });

        // Подробное логирование Socket.IO конфигурации
        const socketConfig = {
          transports: ['websocket', 'polling'],
          auth: {
            token: token // Полный токен для аутентификации
          },
          extraHeaders: {
            'Authorization': `Bearer ${token}` // Дополнительный способ передачи токена
          },
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          forceNew: true
        };

        console.log('🔌 [DEBUG] Socket.IO configuration:', {
          ...socketConfig,
          auth: {
            token: socketConfig.auth.token ? `${socketConfig.auth.token.substring(0, 50)}...` : 'NO_TOKEN',
            tokenLength: socketConfig.auth.token?.length || 0,
            tokenEnd: socketConfig.auth.token ? `...${socketConfig.auth.token.substring(Math.max(0, socketConfig.auth.token.length - 50))}` : 'NO_TOKEN'
          }
        });

        const socket = io(baseUrl, socketConfig);

        socket.on('connect', () => {
          const transport = socket.io.engine.transport.name;
          console.log('🔌 Chat socket connected successfully!', {
            socketId: socket.id,
            transport,
            connected: socket.connected,
            serverUrl: socket.io.uri,
            authSent: !!socket.auth?.token,
            authTokenLength: socket.auth?.token?.length || 0,
            authTokenPrefix: socket.auth?.token?.substring(0, 20) + '...' || 'NO_TOKEN',
            extraHeadersAuth: socket.io.opts?.extraHeaders?.Authorization?.substring(0, 30) + '...' || 'NO_HEADER',
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
              socket.emit('chat:join', { roomId }, (response) => {
                if (response?.ok) {
                  joinedRoomsRef.current.add(roomId);
                  console.log('🏠 ✅ Successfully joined room:', roomId);
                } else {
                  console.error('🏠 ❌ Failed to join room:', roomId, response?.error);
                }
              });
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

        socket.on('connect_error', (error) => {
          console.error('❌ Chat socket connection error:', {
            error: error.message,
            type: error.type,
            description: error.description,
            context: error.context,
            timestamp: new Date().toISOString(),
            baseUrl,
            socketId: socket?.id,
            authSent: !!socket?.auth?.token,
            authTokenPrefix: socket?.auth?.token ? `${socket.auth.token.substring(0, 20)}...` : 'no auth token',
            serverUrl: socket?.io?.uri,
            transport: socket?.io?.engine?.transport?.name,
            isAuthError: error.message?.includes('unauthorized') || error.message?.includes('auth') || error.message?.includes('token')
          });
          
          // Обновляем статус соединения в Redux при ошибке
          dispatch(setConnectionStatus({
            isConnected: false,
            transport: null,
            lastError: error.message,
            reconnectAttempts: 0
          }));
        });

        socket.on('reconnect', (attemptNumber) => {
          console.log('🔄 Chat socket reconnected after', attemptNumber, 'attempts');
          
          // После переподключения перезаходим в комнаты
          const roomIds = roomsState?.ids || [];
          console.log('🏠 Re-joining rooms after reconnect:', roomIds);
          
          roomIds.forEach((roomId) => {
            socket.emit('chat:join', { roomId }, (response) => {
              if (response?.ok) {
                joinedRoomsRef.current.add(roomId);
                console.log('🏠 ✅ Re-joined room after reconnect:', roomId);
              } else {
                console.error('🏠 ❌ Failed to re-join room after reconnect:', roomId, response?.error);
              }
            });
          });
          
          // Обновляем статус соединения
          dispatch(setConnectionStatus({
            isConnected: true,
            transport: socket.io.engine.transport.name,
            reconnectAttempts: attemptNumber
          }));
        });

        socket.on('reconnect_error', (error) => {
          console.error('🔄❌ Chat socket reconnection failed:', error.message);
          
          // Обновляем статус соединения
          dispatch(setConnectionStatus({
            isConnected: false,
            transport: null,
            lastError: error.message
          }));
        });

        socket.on('reconnect_failed', () => {
          console.error('🔄💀 Chat socket reconnection completely failed');
          
          // Обновляем статус соединения
          dispatch(setConnectionStatus({
            isConnected: false,
            transport: null,
            lastError: 'Reconnection failed'
          }));
          
          // Очищаем соединение
          socketRef.current = null;
          setGlobalSocket(null);
          joinedRoomsRef.current.clear();
        });

        // incoming events
        socket.on('chat:message:new', (payload) => {
          // payload: { roomId, message }
          console.log('📨 [WEBSOCKET] New message received:', {
            roomId: payload?.roomId,
            messageId: payload?.message?.id,
            senderId: payload?.message?.senderId,
            hasContent: !!payload?.message?.content,
            timestamp: new Date().toISOString()
          });
          dispatch(receiveSocketMessage(payload));
        });

        socket.on('chat:message:deleted', (payload) => {
          // payload: { roomId, messageId }
          dispatch(receiveMessageDeleted(payload));
        });

        socket.on('chat:typing', ({ roomId, userIds }) => {
          dispatch(setTyping({ roomId, userIds }));
        });

        // Обновление статусов сообщений в real-time
        socket.on('chat:message:status', (payload) => {
          // payload: { roomId, messageId, status, deliveredAt?, readAt?, updatedBy }
          console.log('📡 [WEBSOCKET] Status update received:', {
            ...payload,
            timestamp: new Date().toISOString(),
            socketId: socket.id,
            socketConnected: socket.connected
          });

          // Дополнительная проверка перед диспатчем
          if (!payload.roomId || !payload.messageId) {
            console.error('❌ [WEBSOCKET] Invalid status payload:', payload);
            return;
          }

          // Логируем перед отправкой в Redux
          console.log('📦 Dispatching updateMessageStatus to Redux:', payload);
          dispatch(updateMessageStatus(payload));
        });

        // Обновление статуса онлайн пользователей
        socket.on('chat:user:status', (payload) => {
          // payload: { userId, lastSeenAt }
          console.log('👤 Received user status update:', payload);
          dispatch(updateUserOnlineStatus(payload));
        });

        // Optional: room updated/members updated triggers refetch
        socket.on('chat:room:updated', () => {
          dispatch(fetchRooms({ page: 1 }));
        });

        // Добавляем обработку ответов на события join
        socket.on('chat:join:success', (payload) => {
          console.log('🏠 ✅ Successfully joined room:', payload);
        });

        socket.on('chat:join:error', (payload) => {
          console.error('🏠 ❌ Failed to join room:', payload);
          // Удаляем из списка присоединенных комнат в случае ошибки
          if (payload?.roomId) {
            joinedRoomsRef.current.delete(payload.roomId);
          }
        });

        // Обработка ошибок аутентификации после подключения
        socket.on('disconnect', (reason, details) => {
          console.warn('⚠️ Chat socket disconnected:', {
            reason,
            details,
            isAuthError: reason === 'server namespace disconnect' || 
                        reason === 'client namespace disconnect' ||
                        details?.description?.includes('unauthorized')
          });
        });

        socketRef.current = socket;
        setGlobalSocket(socket); // Устанавливаем глобальную ссылку для других компонентов
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
    if (!socket || !socket.connected) return;
    const roomIds = roomsState?.ids || [];
    roomIds.forEach((roomId) => {
      if (!joinedRoomsRef.current.has(roomId)) {
        console.log('🏠 New room detected, joining:', roomId);
        socket.emit('chat:join', { roomId }, (response) => {
          if (response?.ok) {
            joinedRoomsRef.current.add(roomId);
            console.log('🏠 ✅ Successfully joined new room:', roomId);
          } else {
            console.error('🏠 ❌ Failed to join new room:', roomId, response?.error);
          }
        });
      }
    });
  }, [roomsState?.ids]);

  // Этот хук теперь только инициализирует соединение
  // Для использования WebSocket функций используйте useChatSocketActions
};

