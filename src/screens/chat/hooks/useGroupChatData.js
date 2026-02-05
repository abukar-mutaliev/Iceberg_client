import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { makeSelectRoomMessages, selectIsRoomDeleted, selectRoomsList } from '@entities/chat/model/selectors';
import { useCachedMessages, useMediaPreload } from '@entities/chat/hooks/useChatCache';

/**
 * Хук для управления данными группового чата
 * Расширяет useChatData для поддержки групповой логики
 */
export const useGroupChatData = (roomId) => {
  const [timeTick, setTimeTick] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick(Date.now());
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);
  // ============ SELECTORS ============
  const selectRoomMessages = useMemo(() => makeSelectRoomMessages(), []);
  const reduxMessages = useSelector((s) => selectRoomMessages(s, roomId));
  const loading = useSelector((s) => s.chat?.messages?.[roomId]?.loading);
  const hasMore = useSelector((s) => s.chat?.messages?.[roomId]?.hasMore ?? true);
  const cursorId = useSelector((s) => s.chat?.messages?.[roomId]?.cursorId);
  const currentUserId = useSelector((s) => s.auth?.user?.id);
  const currentUser = useSelector((s) => s.auth?.user);
  const roomDataRaw = useSelector((s) => s.chat?.rooms?.byId?.[roomId]);
  const roomData = useMemo(() => roomDataRaw?.room || roomDataRaw, [roomDataRaw]);
  const isRoomDeleted = useSelector((s) => selectIsRoomDeleted(s, roomId));
  const rooms = useSelector(selectRoomsList);
  
  // Кэш сообщений
  const { messages: cachedMessages } = useCachedMessages(roomId);
  
  // ============ COMPUTED VALUES ============
  
  // Районы пользователя для фильтрации
  const userDistrictIds = useMemo(() => {
    if (!currentUser) return [];
    
    const role = currentUser.role;
    if (role === 'CLIENT' && currentUser.client?.districtId) {
      return [currentUser.client.districtId];
    }
    
    if ((role === 'EMPLOYEE' || role === 'DRIVER') && currentUser[role.toLowerCase()]?.districts) {
      return currentUser[role.toLowerCase()].districts
        .map(d => d?.id || d)
        .filter(id => id != null);
    }
    
    return [];
  }, [currentUser]);
  
  // Фильтрация сообщений по району (только STOP) и времени исчезновения с дедупликацией
  const messages = useMemo(() => {
    const sourceMessages = (reduxMessages?.length > 0 ? reduxMessages : cachedMessages) || [];
    if (!sourceMessages.length) return [];
    
    const now = new Date(timeTick);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Дедупликация по ID для предотвращения дубликатов
    const seenIds = new Set();
    const uniqueMessages = sourceMessages.filter(msg => {
      const msgId = msg?.id || msg?.temporaryId;
      if (!msgId || seenIds.has(msgId)) return false;
      seenIds.add(msgId);
      return true;
    });
    
    // Фильтрация сообщений
    return uniqueMessages.filter(msg => {
      let stopData = null;
      const hasStopType = String(msg?.type || '').toUpperCase() === 'STOP';
      if (msg?.stop || msg?.content) {
        if (msg?.stop) {
          stopData = msg.stop;
        } else if (msg?.content) {
          try {
            stopData = JSON.parse(msg.content);
          } catch (e) {
            stopData = null;
          }
        }
      }

      const isStopMessage = hasStopType || Boolean(stopData?.id || stopData?.stopId || stopData?.startTime || stopData?.endTime);

      // Фильтрация STOP сообщений по району и времени остановки
      if (isStopMessage) {
        if (!stopData && msg?.content) {
          try {
            stopData = JSON.parse(msg.content);
          } catch (e) {
            stopData = null;
          }
        }

        const stopStatus = String(stopData?.status || '').toUpperCase();
        const isDeletedStop = Boolean(
          stopData?.isDeleted ||
          stopData?.deletedAt ||
          stopData?.cancelledAt ||
          stopStatus === 'CANCELLED' ||
          stopStatus === 'CANCELED' ||
          stopStatus === 'DELETED'
        );
        if (isDeletedStop) {
          return false;
        }

        // Проверка времени остановки - сообщение исчезает после окончания остановки
        let stopEndTime = null;
        
        // Пробуем получить endTime из связанного объекта stop
        if (stopData?.endTime) {
          stopEndTime = new Date(stopData.endTime);
        } else if (stopData?.startTime) {
          // Если endTime нет, используем startTime как время окончания
          stopEndTime = new Date(stopData.startTime);
        }
        
        // Если время остановки прошло, сообщение исчезает
        if (stopEndTime && stopEndTime < now) {
          return false;
        }
        
        // Фильтрация по району (только для STOP сообщений)
        if (!userDistrictIds.length) return true;
        
        let stopDistrictId = stopData?.districtId;
        
        if (!stopDistrictId) {
          return false;
        }
        
        const normalizedStopId = typeof stopDistrictId === 'string' 
          ? parseInt(stopDistrictId, 10) 
          : stopDistrictId;
        
        return userDistrictIds.some(userId => {
          const normalizedUserId = typeof userId === 'string' 
            ? parseInt(userId, 10) 
            : userId;
          return normalizedUserId === normalizedStopId;
        });
      }
      
      // Фильтрация PRODUCT сообщений - исчезают через 7 дней
      if (msg.type === 'PRODUCT') {
        const messageCreatedAt = msg?.createdAt ? new Date(msg.createdAt) : null;
        if (messageCreatedAt && messageCreatedAt < sevenDaysAgo) {
          return false;
        }
        return true;
      }
      
      // Фильтрация WAREHOUSE сообщений - исчезают через 7 дней
      if (msg.type === 'WAREHOUSE') {
        const messageCreatedAt = msg?.createdAt ? new Date(msg.createdAt) : null;
        if (messageCreatedAt && messageCreatedAt < sevenDaysAgo) {
          return false;
        }
        return true;
      }
      
      // Остальные типы сообщений проходят без фильтрации
      return true;
    });
  }, [reduxMessages, cachedMessages, userDistrictIds, roomData?.purpose, timeTick]);
  
  // Предзагрузка медиа
  useMediaPreload(roomId, messages);
  
  // Права доступа для групп
  const isSuperAdmin = useMemo(() => {
    return currentUser?.role === 'ADMIN' && 
           (currentUser?.admin?.isSuperAdmin || currentUser?.profile?.isSuperAdmin || currentUser?.isSuperAdmin);
  }, [currentUser]);

  const currentParticipant = useMemo(() => {
    if (!roomData?.participants || !currentUserId) return null;
    return roomData.participants.find(p => (p?.userId ?? p?.user?.id) === currentUserId);
  }, [roomData?.participants, currentUserId]);

  const isAdmin = useMemo(() => {
    return currentParticipant?.role === 'ADMIN' || currentParticipant?.role === 'OWNER';
  }, [currentParticipant]);

  // Проверка, является ли пользователь менеджером
  const isManager = useMemo(() => {
    if (!currentUser || currentUser.role !== 'EMPLOYEE') return false;
    const processingRole = currentUser?.employee?.processingRole || currentUser?.profile?.processingRole;
    return processingRole === 'MANAGER';
  }, [currentUser]);

  const canSendMessages = useMemo(() => {
    if (!roomData) return true;
    const type = String(roomData.type || '').toUpperCase().trim();
    
    let result = true;
    if (type === 'BROADCAST') {
      result = isSuperAdmin || isAdmin || isManager;
    } else if (type === 'GROUP' && roomData.isLocked === true) {
      result = isAdmin || isManager;
    }
    
    return result;
  }, [roomData, isSuperAdmin, isAdmin, isManager]);

  return {
    messages,
    loading,
    hasMore,
    cursorId,
    currentUserId,
    currentUser,
    roomData,
    isRoomDeleted,
    rooms,
    isSuperAdmin,
    isAdmin,
    currentParticipant,
    canSendMessages,
    userDistrictIds,
  };
};

