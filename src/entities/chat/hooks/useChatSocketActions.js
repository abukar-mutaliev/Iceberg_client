import { useRef } from 'react';

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

// Глобальная ссылка на socket для использования в разных компонентах
let globalSocketRef = null;

// Функция для установки глобальной ссылки на socket
export const setGlobalSocket = (socket) => {
  globalSocketRef = socket;
};

// Хук для получения действий WebSocket без инициализации соединения
export const useChatSocketActions = () => {
  // API for emitting typing with throttle 500ms
  const emitTyping = useRef(throttle((roomId, isTyping) => {
    const socket = globalSocketRef;
    if (!socket || !socket.connected) {
      console.warn('⚠️ Cannot emit typing - socket not connected');
      return;
    }
    socket.emit('chat:typing', { roomId, isTyping });
  }, 500)).current;

  // API for marking messages as read via socket
  const emitMarkRead = useRef((roomId, messageIds = []) => {
    const socket = globalSocketRef;
    if (!socket || !socket.connected) {
      console.warn('⚠️ Cannot emit mark-read - socket not connected');
      return;
    }
    if (!roomId || messageIds.length === 0) return;
    
    console.log(`📖 Emitting mark-read for room ${roomId}, messages:`, messageIds);
    socket.emit('chat:mark-read', { roomId, messageIds }, (response) => {
      if (response?.ok) {
        console.log(`✅ Mark-read successful for room ${roomId}`);
      } else {
        console.error(`❌ Mark-read failed for room ${roomId}:`, response?.error);
      }
    });
  }).current;

  // API for setting active room (for push notification filtering)
  const emitActiveRoom = useRef((roomId) => {
    const socket = globalSocketRef;
    if (!socket || !socket.connected) {
      console.warn('⚠️ Cannot emit active room - socket not connected');
      return;
    }

    socket.emit('chat:room:active', { roomId }, (response) => {
      if (response?.ok) {
        console.log(`✅ Active room set successfully: ${roomId}`);
      } else {
        console.error(`❌ Failed to set active room:`, response?.error);
      }
    });
  }).current;

  // Функция для получения статуса соединения
  const getConnectionStatus = useRef(() => {
    const socket = globalSocketRef;
    return {
      hasSocket: !!socket,
      connected: socket?.connected || false,
      socketId: socket?.id || null,
      transport: socket?.io?.engine?.transport?.name || null
    };
  }).current;

  // API для переключения реакции через WebSocket
  const emitToggleReaction = useRef((messageId, emoji) => {
    const socket = globalSocketRef;
    if (!socket || !socket.connected) {
      console.warn('⚠️ Cannot emit toggle reaction - socket not connected');
      return Promise.reject(new Error('Socket not connected'));
    }
    
    return new Promise((resolve, reject) => {
      console.log(`👍 Emitting toggle reaction for message ${messageId}:`, emoji);
      socket.emit('chat:reaction:toggle', { messageId, emoji }, (response) => {
        if (response?.ok) {
          console.log(`✅ Toggle reaction successful for message ${messageId}`);
          resolve(response.data);
        } else {
          console.error(`❌ Toggle reaction failed for message ${messageId}:`, response?.error);
          reject(new Error(response?.error || 'Failed to toggle reaction'));
        }
      });
    });
  }).current;

  return {
    emitTyping,
    emitMarkRead,
    emitActiveRoom,
    getConnectionStatus,
    emitToggleReaction,
  };
};


