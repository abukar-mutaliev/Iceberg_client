import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { makeSelectRoomMessages, selectIsRoomDeleted, selectRoomsList } from '@entities/chat/model/selectors';
import { selectIsProductDeleted } from '@entities/product/model/selectors';
import { useCachedMessages, useMediaPreload } from '@entities/chat/hooks/useChatCache';
import { getBaseUrl } from '@shared/api/api';

/**
 * Хук для получения всех данных чата
 * Оптимизирован для минимизации ре-рендеров
 */
export const useChatData = (roomId) => {
  // ============ SELECTORS ============
  // Мемоизированный селектор сообщений
  const selectRoomMessages = useMemo(() => makeSelectRoomMessages(), []);
  
  const reduxMessages = useSelector((s) => selectRoomMessages(s, roomId));
  const loading = useSelector((s) => s.chat?.messages?.[roomId]?.loading);
  const hasMore = useSelector((s) => s.chat?.messages?.[roomId]?.hasMore ?? true);
  const cursorId = useSelector((s) => s.chat?.messages?.[roomId]?.cursorId);
  const currentUserId = useSelector((s) => s.auth?.user?.id);
  const currentUser = useSelector((s) => s.auth?.user);
  const roomDataRaw = useSelector((s) => s.chat?.rooms?.byId?.[roomId]);
  const participantsById = useSelector((s) => s.chat?.participants?.byUserId || {});
  const isRoomDeleted = useSelector((s) => selectIsRoomDeleted(s, roomId));
  const rooms = useSelector(selectRoomsList);
  
  // Кэш сообщений
  const { messages: cachedMessages } = useCachedMessages(roomId);
  
  // ============ COMPUTED VALUES ============
  
  // Стабильная ссылка на roomData
  const roomData = useMemo(() => 
    roomDataRaw?.room || roomDataRaw, 
    [roomDataRaw]
  );
  
  // Объединяем кэшированные и Redux сообщения с дедупликацией
  const messages = useMemo(() => {
    const sourceMessages = reduxMessages?.length > 0 ? reduxMessages : (cachedMessages || []);
    if (!sourceMessages?.length) return [];
    
    // Дедупликация по ID
    const seenIds = new Set();
    const uniqueMessages = sourceMessages.filter(msg => {
      const msgId = msg?.id || msg?.temporaryId;
      if (!msgId || seenIds.has(msgId)) return false;
      seenIds.add(msgId);
      return true;
    });
    
    return uniqueMessages;
  }, [reduxMessages, cachedMessages]);
  
  // Предзагрузка медиа
  useMediaPreload(roomId, messages);
  
  // Права доступа (примитивное значение)
  const isSuperAdmin = useMemo(() => {
    return currentUser?.role === 'ADMIN' && 
           (currentUser?.admin?.isSuperAdmin || 
            currentUser?.profile?.isSuperAdmin || 
            currentUser?.isSuperAdmin);
  }, [
    currentUser?.role,
    currentUser?.admin?.isSuperAdmin,
    currentUser?.profile?.isSuperAdmin,
    currentUser?.isSuperAdmin
  ]);
  
  // Собеседник
  const chatPartner = useMemo(() => {
    if (!roomData?.participants || !currentUserId) return null;
    return roomData.participants.find(p =>
      (p?.userId ?? p?.user?.id) !== currentUserId
    );
  }, [roomData?.participants, currentUserId]);
  
  // Стабильный userId собеседника (только примитивы!)
  const peerUserId = useMemo(() => {
    const peerId = chatPartner?.userId || chatPartner?.user?.id || chatPartner?.id || null;
    return peerId ? String(peerId) : null;
  }, [chatPartner?.userId, chatPartner?.user?.id, chatPartner?.id]);
  
  // Аватар собеседника
  const partnerAvatar = useMemo(() => {
    if (!chatPartner) return null;

    const partnerId = chatPartner?.userId ?? chatPartner?.user?.id ?? chatPartner?.id;
    const cachedUser = participantsById[partnerId];

    let raw = cachedUser?.avatar;
    if (!raw) {
      raw = chatPartner?.user?.avatar ||
            chatPartner?.user?.profile?.avatar ||
            chatPartner?.user?.image ||
            chatPartner?.avatar ||
            chatPartner?.profile?.avatar ||
            chatPartner?.image;
    }

    if (raw && !raw.startsWith('http')) {
      return `${getBaseUrl()}${raw}`;
    }
    return raw;
  }, [chatPartner, participantsById]);
  
  return {
    // Сообщения
    messages,
    loading,
    hasMore,
    cursorId,
    
    // Пользователи
    currentUserId,
    currentUser,
    chatPartner,
    peerUserId,
    partnerAvatar,
    participantsById,
    
    // Комната
    roomData,
    isRoomDeleted,
    rooms,
    
    // Права
    isSuperAdmin,
    canSendMessages: true,
  };
};