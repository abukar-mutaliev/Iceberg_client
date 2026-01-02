import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { makeSelectRoomMessages, selectIsRoomDeleted, selectRoomsList } from '@entities/chat/model/selectors';
import { useCachedMessages, useMediaPreload } from '@entities/chat/hooks/useChatCache';

/**
 * Хук для управления данными группового чата
 * Расширяет useChatData для поддержки групповой логики
 */
export const useGroupChatData = (roomId) => {
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
  
  // Фильтрация сообщений по району (только STOP) с дедупликацией
  const messages = useMemo(() => {
    const sourceMessages = (reduxMessages?.length > 0 ? reduxMessages : cachedMessages) || [];
    if (!sourceMessages.length) return [];
    
    // Дедупликация по ID для предотвращения дубликатов
    const seenIds = new Set();
    const uniqueMessages = sourceMessages.filter(msg => {
      const msgId = msg?.id || msg?.temporaryId;
      if (!msgId || seenIds.has(msgId)) return false;
      seenIds.add(msgId);
      return true;
    });
    
    // Фильтрация по району (только для STOP сообщений)
    if (!uniqueMessages.length || !userDistrictIds.length) return uniqueMessages;
    
    return uniqueMessages.filter(msg => {
      if (msg.type !== 'STOP') return true;
      
      let stopDistrictId = msg?.stop?.districtId;
      
      if (!stopDistrictId && msg?.content) {
        try {
          const stopData = JSON.parse(msg.content);
          stopDistrictId = stopData?.districtId;
        } catch (e) {
          return false;
        }
      }
      
      if (!stopDistrictId) return false;
      
      const normalizedStopId = typeof stopDistrictId === 'string' 
        ? parseInt(stopDistrictId, 10) 
        : stopDistrictId;
      
      return userDistrictIds.some(userId => {
        const normalizedUserId = typeof userId === 'string' 
          ? parseInt(userId, 10) 
          : userId;
        return normalizedUserId === normalizedStopId;
      });
    });
  }, [reduxMessages, cachedMessages, userDistrictIds]);
  
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

  const canSendMessages = useMemo(() => {
    if (!roomData) return true;
    const type = String(roomData.type || '').toUpperCase().trim();
    if (type === 'BROADCAST') return isSuperAdmin || isAdmin;
    if (type === 'GROUP' && roomData.isLocked === true) return isAdmin;
    return true;
  }, [roomData, isSuperAdmin, isAdmin]);

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

