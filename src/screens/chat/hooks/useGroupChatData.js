import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { makeSelectRoomMessages, selectIsRoomDeleted, selectRoomsList } from '@entities/chat/model/selectors';
import { useCachedMessages, useMediaPreload } from '@entities/chat/hooks/useChatCache';
import { authService } from '@shared/api/api';
import { isGroupAdminRoleSystemMessage } from '@entities/chat/lib/isGroupAdminRoleSystemMessage';
import { resolveStopDistrictId } from '@entities/chat/lib/resolveStopDistrictId';

const userLikeIsSuperAdmin = (u) => {
  if (!u) return false;
  const role = String(u.role || '').toUpperCase();
  if (role === 'SUPER_ADMIN') return true;
  return (
    role === 'ADMIN' &&
    Boolean(u.admin?.isSuperAdmin ?? u.profile?.isSuperAdmin ?? u.isSuperAdmin)
  );
};

const jwtIndicatesSuperAdmin = (decoded) => {
  if (!decoded || typeof decoded !== 'object') return false;
  const role = String(decoded.role || '').toUpperCase();
  if (role === 'SUPER_ADMIN') return true;
  return Boolean(
    decoded.isSuperAdmin === true ||
      decoded.superAdmin === true ||
      decoded.is_super_admin === true ||
      decoded.super_admin === true
  );
};

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
  const profileData = useSelector((s) => s.profile?.data);
  const accessToken = useSelector((s) => s.auth?.tokens?.accessToken);
  const roomDataRaw = useSelector((s) => s.chat?.rooms?.byId?.[roomId]);
  const roomData = useMemo(() => roomDataRaw?.room || roomDataRaw, [roomDataRaw]);
  const isRoomDeleted = useSelector((s) => selectIsRoomDeleted(s, roomId));
  const rooms = useSelector(selectRoomsList);
  
  // Кэш сообщений
  const { messages: cachedMessages } = useCachedMessages(roomId);
  
  // ============ COMPUTED VALUES ============
  
  // Районы пользователя для фильтрации.
  // Логи убраны из useMemo — выполняется на каждый ре-рендер, где меняется
  // currentUser (довольно часто), и в dev-режиме каждый console.log тормозит
  // JS-поток, из-за чего чат "подвисал" на Android при открытии.
  const userDistrictIds = useMemo(() => {
    if (!currentUser) return [];

    const role = currentUser.role;
    if (role === 'CLIENT') {
      const clientDistrictId =
        currentUser.client?.districtId ??
        currentUser.client?.district?.id ??
        null;
      if (clientDistrictId != null && clientDistrictId !== '') {
        return [clientDistrictId];
      }
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

    // Фильтры по району/сроку остановки применяются только к каналам (BROADCAST).
    // В обычных групповых чатах STOP должен отображаться у всех участников вне
    // зависимости от их района и времени окончания остановки.
    const isBroadcastRoom = String(roomData?.type || '').toUpperCase() === 'BROADCAST';

    // Дедупликация по ID для предотвращения дубликатов
    const seenIds = new Set();
    const uniqueMessages = sourceMessages.filter(msg => {
      const msgId = msg?.id || msg?.temporaryId;
      if (!msgId || seenIds.has(msgId)) return false;
      seenIds.add(msgId);
      return true;
    });

    // Фильтрация сообщений
    return uniqueMessages.filter((msg) => {
      const explicitType = String(msg?.type || '').toUpperCase();

      // Товар и склад: только лимит 7 дней в канале. Раньше шли после эвристики STOP —
      // JSON склада содержит `id`, ошибочно попадали под фильтр остановки по району (клиенты не видели карточку).
      if (explicitType === 'PRODUCT') {
        if (!isBroadcastRoom) return true;
        const messageCreatedAt = msg?.createdAt ? new Date(msg.createdAt) : null;
        if (messageCreatedAt && messageCreatedAt < sevenDaysAgo) {
          return false;
        }
        return true;
      }
      if (explicitType === 'WAREHOUSE') {
        if (!isBroadcastRoom) return true;
        const messageCreatedAt = msg?.createdAt ? new Date(msg.createdAt) : null;
        if (messageCreatedAt && messageCreatedAt < sevenDaysAgo) {
          return false;
        }
        return true;
      }

      let stopData = null;
      const hasStopType = explicitType === 'STOP';
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

      // STOP: явный тип, вложенный stop или поля фургона — не использовать общий id (у склада/товара тоже есть id в JSON)
      const isStopMessage =
        hasStopType ||
        Boolean(msg?.stop) ||
        Boolean(stopData?.stopId || stopData?.stop_id) ||
        Boolean(stopData?.startTime || stopData?.endTime);

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

        // В обычных групповых чатах (GROUP) не скрываем STOP ни по району,
        // ни по истечении времени — это просто пересланное сообщение.
        if (!isBroadcastRoom) {
          return true;
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

        // Фильтрация по району (только для BROADCAST)
        if (!userDistrictIds.length) return true;

        const stopDistrictRaw = resolveStopDistrictId(stopData);
        // В payload сообщений чата часто нет district/districtId — не скрываем такие STOP,
        // иначе клиенты с привязкой к району не видят остановки вообще
        if (stopDistrictRaw === null || stopDistrictRaw === '') {
          return true;
        }

        const normalizedStopId = typeof stopDistrictRaw === 'string'
          ? parseInt(stopDistrictRaw, 10)
          : stopDistrictRaw;

        return userDistrictIds.some(userId => {
          const normalizedUserId = typeof userId === 'string'
            ? parseInt(userId, 10)
            : userId;
          return normalizedUserId === normalizedStopId;
        });
      }

      if (isBroadcastRoom && isGroupAdminRoleSystemMessage(msg)) {
        return false;
      }

      // Остальные типы сообщений проходят без фильтрации
      return true;
    });
  }, [reduxMessages, cachedMessages, userDistrictIds, roomData?.type, roomData?.purpose, timeTick]);
  
  // Предзагрузка медиа
  useMediaPreload(roomId, messages);

  const jwtDecoded = useMemo(() => {
    if (!accessToken) return null;
    return authService.decodeToken(accessToken);
  }, [accessToken]);

  // Права доступа для групп: суперадмин из JWT, auth после loadUserProfile или из среза profile
  // (после refresh токена в auth.user часто только id/role без admin.isSuperAdmin).
  const isSuperAdmin = useMemo(() => {
    if (jwtIndicatesSuperAdmin(jwtDecoded)) return true;
    if (userLikeIsSuperAdmin(currentUser)) return true;
    if (userLikeIsSuperAdmin(profileData)) return true;
    if (userLikeIsSuperAdmin(profileData?.user)) return true;
    return false;
  }, [currentUser, profileData, jwtDecoded]);

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

