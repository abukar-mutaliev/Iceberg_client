import { useRef } from 'react';

// Simple throttle helper
const throttle = (fn, wait) => {
  let lastExecAt = 0;
  let timeoutId = null;
  let trailingArgs = null;

  const invoke = (args) => {
    lastExecAt = Date.now();
    fn(...args);
  };

  return (...args) => {
    const now = Date.now();
    const remaining = wait - (now - lastExecAt);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      trailingArgs = null;
      invoke(args);
      return;
    }

    // Keep only the latest call during throttle window
    trailingArgs = args;
    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        timeoutId = null;
        if (trailingArgs) {
          invoke(trailingArgs);
          trailingArgs = null;
        }
      }, remaining);
    }
  };
};

// Глобальная ссылка на socket для использования в разных компонентах
let globalSocketRef = null;

// Функция для установки глобальной ссылки на socket
export const setGlobalSocket = (socket) => {
  globalSocketRef = socket;
};

// Глобальное хранилище для типа активности: Map<`${roomId}:${userId}`, 'text' | 'voice'>
// Используем global объект для гарантии единого экземпляра
if (!global.__chatActivityTypeStorage) {
  global.__chatActivityTypeStorage = new Map();
}
const globalActivityTypeStorage = global.__chatActivityTypeStorage;

// Функция для установки глобального хранилища типа активности (теперь не используется, но оставляем для совместимости)
export const setGlobalActivityTypeStorage = (storage) => {
  // Не заменяем хранилище, а копируем данные из переданного хранилища
  if (storage && storage instanceof Map) {
    storage.forEach((value, key) => {
      globalActivityTypeStorage.set(key, value);
    });
  }
};

// Функция для получения типа активности из кэша
export const getActivityTypeCache = (roomId, userId) => {
  const key = `${roomId}:${userId}`;
  return globalActivityTypeStorage.get(key) || null;
};

// Функция для сохранения типа активности в кэш
export const setActivityTypeCache = (roomId, userId, type) => {
  const key = `${roomId}:${userId}`;
  if (type) {
    // Не перезаписываем "voice" на "text" - если уже сохранен "voice", оставляем его
    const currentType = globalActivityTypeStorage.get(key);
    if (currentType === 'voice' && type === 'text') {
      return; // Не перезаписываем
    }
    globalActivityTypeStorage.set(key, type);
  } else {
    globalActivityTypeStorage.delete(key);
  }
};



import { useSelector, useDispatch } from 'react-redux';
import { setLastActivityType } from '@entities/chat/model/slice';

// Хук для получения действий WebSocket без инициализации соединения
export const useChatSocketActions = () => {
  const dispatch = useDispatch();
  const currentUserId = useSelector((state) => state.auth?.user?.id);
  // API for emitting typing with throttle 500ms
  const emitTyping = useRef(throttle((roomId, isTyping, type = 'text') => {
    const socket = globalSocketRef;
    if (!socket || !socket.connected) {
      console.warn('⚠️ Cannot emit typing - socket not connected');
      return;
    }

    // Сохраняем тип активности в синхронный кэш и Redux при отправке события
    if (isTyping) {
      // Сохраняем тип только при начале активности - сначала в кэш (синхронно), потом в Redux
      setActivityTypeCache(roomId, currentUserId, type);
      dispatch(setLastActivityType({ roomId, userId: currentUserId, type }));
    }
    // НЕ очищаем тип при отправке isTyping: false - очистим только при получении подтверждения от сервера

    // Отправляем событие с userId для нового формата
    const payload = {
      roomId,
      userId: currentUserId,
      type,
      isVoice: type === 'voice',
      isTyping
    };
    socket.emit('chat:typing', payload);

    // Также отправляем старый формат для совместимости
    // socket.emit('chat:typing', { roomId, isTyping });
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

    if (__DEV__) {
      console.log(`[useChatSocketActions] 🔄 emitActiveRoom вызван`, { roomId, socketConnected: socket?.connected });
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


