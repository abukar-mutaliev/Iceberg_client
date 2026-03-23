import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { formatLastSeen, isUserOnline } from '@shared/utils/dateUtils';

/**
 * Хук для получения данных заголовка чата
 * Исправлена логика определения собеседника
 */
export const useChatHeaderData = (route) => {
  const params = route?.params || {};
  const roomId = params.roomId;
  
  const currentUser = useSelector(state => state?.auth?.user);
  const currentUserId = currentUser?.id;
  const participantsById = useSelector(state => state?.chat?.participants?.byUserId || {});
  
  const roomDataRaw = useSelector(state => state?.chat?.rooms?.byId?.[roomId]);
  const roomDataParam = roomDataRaw?.room ? roomDataRaw.room : roomDataRaw;
  const roomData = roomDataParam?.participants ? roomDataParam : (roomDataParam?.room ? roomDataParam.room : roomDataParam);
  
  // ============ HELPER FUNCTIONS ============
  
  const getDisplayName = useMemo(() => (user) => {
    if (!user) return 'Пользователь';
    
    // SUPPLIER - приоритет companyName
    if (user.role === 'SUPPLIER') {
      const companyName = user.supplier?.companyName || user.companyName || user.profile?.companyName;
      if (companyName) return companyName;
    }
    
    // DRIVER - приоритет driver.name
    if (user.role === 'DRIVER') {
      const driverName = user.driver?.name || user.name;
      if (driverName) return driverName;
    }
    
    // Общее имя
    const name = user.name || user.profile?.name || user.firstName || user.profile?.firstName || user.companyName || user.profile?.companyName;
    if (name) return name;
    
    // Контактное лицо для поставщиков
    if (user.role === 'SUPPLIER') {
      const contactPerson = user.supplier?.contactPerson || user.contactPerson || user.profile?.contactPerson;
      if (contactPerson) return contactPerson;
    }
    
    // Из email
    if (user.email) {
      const emailName = user.email.split('@')[0];
      const cleanName = emailName
        .replace(/[-_]?test[-_]?/gi, '')
        .replace(/[-_]?example[-_]?/gi, '')
        .replace(/\d+/g, '');
      return cleanName.charAt(0).toUpperCase() + cleanName.slice(1) || 'Пользователь';
    }
    
    // По ID
    if (user.id) return `Пользователь #${user.id}`;
    
    return 'Пользователь';
  }, []);
  
  // ============ CURRENT USER ROLE ============
  
  const currentUserParticipant = useMemo(() => 
    roomData?.participants?.find(p => (p?.userId ?? p?.user?.id) === currentUserId),
    [roomData?.participants, currentUserId]
  );
  
  const userRoleInRoom = currentUserParticipant?.role;
  const isOwner = userRoleInRoom === 'OWNER';
  
  // ============ CHAT PARTNER (DIRECT CHAT) ============
  
  const chatPartner = useMemo(() => {
    if (!roomData?.participants || !Array.isArray(roomData.participants) || !currentUserId) {
      return null;
    }
    
    // Групповые чаты
    if (roomData?.type === 'GROUP' || roomData?.type === 'BROADCAST') {
      return null;
    }
    
    // ✅ ИСПРАВЛЕНИЕ: Правильный поиск собеседника
    const normalizedCurrentUserId = Number(currentUserId);
    
    const partner = roomData.participants.find(p => {
      const participantId = p?.userId ?? p?.user?.id ?? p?.id;
      const normalizedParticipantId = Number(participantId);
      
      // ВАЖНО: Проверяем что это НЕ текущий пользователь
      return normalizedParticipantId !== normalizedCurrentUserId;
    });
    
    if (__DEV__ && !partner) {
      console.warn('⚠️ ChatHeader: Собеседник не найден', {
        currentUserId: normalizedCurrentUserId,
        participants: roomData.participants.map(p => ({
          id: p?.userId ?? p?.user?.id ?? p?.id,
          name: getDisplayName(p?.user || p)
        }))
      });
    }
    
    return partner;
  }, [roomData?.participants, roomData?.type, currentUserId, getDisplayName]);
  
  // ============ CHAT PARTNER INFO ============
  
  const chatPartnerInfo = useMemo(() => {
    // Для групповых чатов
    if (roomData?.type === 'GROUP' || roomData?.type === 'BROADCAST') {
      const participantsCount = getFilteredParticipantsCount(roomData, currentUser);
      
      return {
        name: roomData.title || (roomData?.type === 'BROADCAST' ? 'Канал' : 'Группа'),
        avatar: roomData.avatar,
        status: getGroupStatus(roomData, participantsCount),
        isGroup: true,
      };
    }
    
    // Для личных чатов
    if (!chatPartner) {
      // Fallback на supplier info если нет собеседника
      const supplierInfo = params.productInfo?.supplier || params.supplierInfo;
      if (supplierInfo) {
        const supplierUserData = supplierInfo.user || supplierInfo;
        return {
          name: getDisplayName(supplierUserData),
          avatar: supplierInfo.user?.avatar || supplierInfo.avatar || supplierInfo.user?.image || supplierInfo.image || null,
          status: 'онлайн',
          isGroup: false,
        };
      }
      
      return {
        name: 'Чат',
        avatar: null,
        status: 'онлайн',
        isGroup: false,
      };
    }
    
    const partnerId = chatPartner?.userId ?? chatPartner?.user?.id ?? chatPartner?.id;
    const cachedUser = participantsById[partnerId];
    const userData = cachedUser || chatPartner.user || chatPartner;
    const displayName = getDisplayName(userData);

    // Имя собеседника из данных участника — единственный надёжный источник.
    // params.roomTitle ненадёжен: ChatListScreen передаёт room.title с сервера,
    // который для личных чатов часто равен имени текущего пользователя.
    // roomTitle используем только как fallback, если getDisplayName не дал результата,
    // и при этом roomTitle не совпадает ни с одним именем текущего пользователя.
    const isGenericName = displayName === 'Пользователь' || displayName.startsWith('Пользователь #');
    let finalName = displayName;

    if (isGenericName && params.roomTitle) {
      const currentUserNames = new Set(
        [
          currentUser?.name,
          currentUser?.firstName,
          currentUser?.profile?.name,
          currentUser?.profile?.firstName,
          currentUser?.client?.name,
          currentUser?.client?.companyName,
          currentUser?.supplier?.companyName,
          currentUser?.supplier?.contactPerson,
          currentUser?.driver?.name,
          currentUser?.employee?.name,
          currentUser?.companyName,
          currentUser?.contactPerson,
        ]
          .filter(Boolean)
          .map(n => String(n).trim()),
      );

      const trimmedTitle = String(params.roomTitle).trim();
      const isOwnName = currentUserNames.has(trimmedTitle);
      const isDefault = trimmedTitle === 'Чат' || trimmedTitle === 'Водитель';

      if (!isOwnName && !isDefault) {
        finalName = params.roomTitle;
      }
    }
    
    const avatar = cachedUser?.avatar || 
                   cachedUser?.image || 
                   chatPartner.avatar || 
                   chatPartner.image || 
                   chatPartner.user?.avatar || 
                   chatPartner.user?.image || 
                   null;
    
    const userIsOnline = isUserOnline(userData.lastSeenAt);
    const status = formatLastSeen(userData.lastSeenAt, userIsOnline);
    
    return {
      name: finalName,
      avatar,
      status,
      isGroup: false,
      userId: partnerId,
      userRole: userData?.role,
    };
  }, [chatPartner, roomData, currentUser, participantsById, params, getDisplayName]);
  
  return {
    roomId,
    roomData,
    currentUser,
    currentUserId,
    isOwner,
    chatPartner,
    chatPartnerInfo,
    params,
  };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getFilteredParticipantsCount(roomData, currentUser) {
  let participantsCount = roomData.participants ? roomData.participants.length : 0;
  
  // Для клиентов в BROADCAST каналах - показываем только менеджеров и водителей
  if (roomData?.type === 'BROADCAST' && currentUser?.role === 'CLIENT') {
    const clientDistrictId = currentUser?.client?.districtId;
    const filteredParticipants = (roomData.participants || []).filter(p => {
      const user = p.user || p;
      const userRole = user?.role;
      
      // Скрываем суперадминов
      if (userRole === 'ADMIN') {
        const isSuperAdmin = user?.admin?.isSuperAdmin;
        if (isSuperAdmin) return false;
        return true;
      }
      
      // Сотрудники - только менеджеры из района клиента
      if (userRole === 'EMPLOYEE') {
        const processingRole = user?.employee?.processingRole;
        const hiddenRoles = ['PICKER', 'PACKER', 'QUALITY_CHECKER', 'COURIER'];
        if (processingRole && hiddenRoles.includes(processingRole)) return false;
        
        const position = user?.employee?.position;
        if (!position) return false;
        
        const employeeWarehouseDistrictId = user?.employee?.warehouse?.districtId;
        if (employeeWarehouseDistrictId && clientDistrictId && employeeWarehouseDistrictId !== clientDistrictId) {
          return false;
        }
        
        return true;
      }
      
      // Поставщиков не показываем
      if (userRole === 'SUPPLIER') return false;
      
      // Водители - только из района клиента
      if (userRole === 'DRIVER') {
        if (!clientDistrictId) return false;
        const driverWarehouseDistrictId = user?.driver?.warehouse?.district?.id || 
                                          user?.driver?.warehouse?.districtId;
        if (driverWarehouseDistrictId === clientDistrictId) return true;
        const driverDistricts = user?.driver?.districts || [];
        return driverDistricts.some(d => d.id === clientDistrictId);
      }
      
      return false;
    });
    participantsCount = filteredParticipants.length;
  }
  
  return participantsCount;
}

function getGroupStatus(roomData, participantsCount) {
  if (roomData?.type === 'BROADCAST') {
    return `📢 Канал • ${participantsCount} ${getParticipantWord(participantsCount, true)}`;
  }
  
  return `${participantsCount} ${getParticipantWord(participantsCount, false)}`;
}

function getParticipantWord(count, isBroadcast) {
  if (isBroadcast) {
    if (count === 1) return 'контакт';
    if (count < 5) return 'контакта';
    return 'контактов';
  }
  
  if (count === 1) return 'участник';
  if (count < 5) return 'участника';
  return 'участников';
}