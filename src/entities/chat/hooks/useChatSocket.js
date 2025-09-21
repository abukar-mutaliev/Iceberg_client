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
        const token = tokens?.accessToken;
        const baseUrl = getBaseUrl();

        if (!token) {
          return; // not authenticated; skip sockets
        }

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
              error.message?.includes('unauthorized')) {
            try {
              console.log('🔄 JWT expired, trying to refresh token and reconnect...');
              const { validateAndRefreshTokens } = require('@shared/api/api');
              const refreshResult = await validateAndRefreshTokens(true); // force refresh
              
              if (refreshResult) {
                console.log('✅ Token refreshed successfully');
                // Получаем новый токен и переподключаемся
                const newTokensStr = await AsyncStorage.getItem('tokens');
                const newTokens = newTokensStr ? JSON.parse(newTokensStr) : null;
                if (newTokens?.accessToken) {
                  console.log('🔌 Reconnecting with fresh token...');
                  socket.auth = { token: newTokens.accessToken };
                  socket.connect();
                }
              } else {
                console.warn('⚠️ Could not refresh token for WebSocket');
              }
            } catch (refreshError) {
              console.error('❌ Error refreshing token for WebSocket:', refreshError);
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

        socket.on('chat:room:updated', () => {
          dispatch(fetchRooms({ page: 1 }));
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

