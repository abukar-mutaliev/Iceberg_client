import { useEffect, useRef } from 'react';
// Use UMD build to avoid engine.io webtransport resolution issues in React Native/Expo
// eslint-disable-next-line import/no-unresolved
import io from 'socket.io-client/dist/socket.io.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { getBaseUrl } from '@shared/api/api';
import { featureFlags } from '@shared/config/featureFlags';
import {
  fetchRooms,
  receiveSocketMessage,
  receiveMessageDeleted,
  setTyping,
  updateMessageStatus,
  updateUserOnlineStatus,
} from '@entities/chat/model/slice';

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
  const socketRef = useRef(null);
  const joinedRoomsRef = useRef(new Set());

  useEffect(() => {
    if (!featureFlags.chat) return;

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
          transports: ['websocket'],
          auth: { token },
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
          console.log('🔌 Chat socket connected', socket.id);
          // join existing rooms
          const roomIds = roomsState?.ids || [];
          roomIds.forEach((roomId) => {
            if (!joinedRoomsRef.current.has(roomId)) {
              socket.emit('chat:join', { roomId });
              joinedRoomsRef.current.add(roomId);
            }
          });
        });

        socket.on('disconnect', () => {
          console.log('⚠️ Chat socket disconnected');
          joinedRoomsRef.current.clear();
        });

        socket.on('connect_error', (error) => {
          console.error('❌ Chat socket connection error:', error);
        });

        // incoming events
        socket.on('chat:message:new', (payload) => {
          // payload: { roomId, message }
          console.log('📨 Received new message:', payload);
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
          // payload: { roomId, messageId, status }
          console.log('📡 Received status update:', payload);
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

        socketRef.current = socket;
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
      }
      joinedRoomsRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureFlags.chat]);

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

  // API for emitting typing with throttle 500ms
  const emitTyping = useRef(throttle((roomId, isTyping) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('chat:typing', { roomId, isTyping });
  }, 500)).current;

  // API for marking messages as read via socket
  const emitMarkRead = useRef((roomId, messageIds = []) => {
    const socket = socketRef.current;
    if (!socket || !roomId || messageIds.length === 0) return;
    
    console.log(`📖 Emitting mark-read for room ${roomId}, messages:`, messageIds);
    socket.emit('chat:mark-read', { roomId, messageIds }, (response) => {
      if (response?.ok) {
        console.log(`✅ Mark-read successful for room ${roomId}`);
      } else {
        console.error(`❌ Mark-read failed for room ${roomId}:`, response?.error);
      }
    });
  }).current;

  return {
    emitTyping,
    emitMarkRead,
  };
};

