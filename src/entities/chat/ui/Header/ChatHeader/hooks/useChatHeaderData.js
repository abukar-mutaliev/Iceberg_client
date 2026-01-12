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
    
    // ✅ ИСПРАВЛЕНИЕ: Улучшенная логика определения имени
    const displayName = getDisplayName(userData);
    
    // Проверяем, не является ли roomTitle именем текущего пользователя
    const isDefaultTitle = params.roomTitle === 'Чат' || params.roomTitle === 'Водитель';
    const isCurrentUserTitle = params.roomTitle && (
      params.roomTitle === currentUser?.name ||
      params.roomTitle === currentUser?.firstName ||
      params.roomTitle === currentUser?.client?.name ||
      params.roomTitle === currentUser?.client?.companyName ||
      params.roomTitle === currentUser?.supplier?.companyName ||
      params.roomTitle === currentUser?.driver?.name ||
      params.roomTitle === currentUser?.employee?.name
    );
    
    // Используем roomTitle только если:
    // 1. Он передан
    // 2. Не является дефолтным
    // 3. Не является именем текущего пользователя
    const shouldUseRoomTitle = params.roomTitle && !isDefaultTitle && !isCurrentUserTitle;
    const finalName = shouldUseRoomTitle ? params.roomTitle : displayName;
    
    if (__DEV__) {
      console.log('📝 ChatHeader name logic:', {
        roomTitle: params.roomTitle,
        displayName,
        isDefaultTitle,
        isCurrentUserTitle,
        shouldUseRoomTitle,
        finalName,
        currentUserName: currentUser?.name,
      });
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

// ============================================
// chat/ui/ChatHeader/hooks/useChatHeaderActions.js
// ============================================

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { deleteRoom, leaveRoom } from '@entities/chat/model/slice';

export const useChatHeaderActions = ({
  navigation,
  roomId,
  roomData,
  chatPartnerInfo,
  params,
  showAlert,
  showError,
}) => {
  const dispatch = useDispatch();
  
  // ============ NAVIGATION ============
  
  const handleBackPress = useCallback(() => {
    const fromScreen = params.fromScreen;
    const productId = params.productId || params.productInfo?.id;
    
    if (productId && (fromScreen === 'ProductDetail' || !fromScreen)) {
      const rootNavigation = navigation.getParent() || navigation;
      rootNavigation.navigate('ProductDetail', {
        productId,
        fromScreen: 'ChatRoom'
      });
      return;
    }
    
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, params]);
  
  const handleProfilePress = useCallback(() => {
    // Групповые чаты - открываем GroupInfo
    if (roomData?.type === 'GROUP' || roomData?.type === 'BROADCAST') {
      navigation.navigate('GroupInfo', { roomId });
      return;
    }
    
    // Личные чаты - открываем профиль собеседника
    const userRole = chatPartnerInfo?.userRole;
    const userId = chatPartnerInfo?.userId;
    
    // Поставщик - открываем SupplierScreen
    if (userRole === 'SUPPLIER') {
      const supplierFromProduct = params.productInfo?.supplier;
      let supplierId = supplierFromProduct?.id || userId;
      
      if (supplierId) {
        const rootNavigation = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
        (rootNavigation || navigation).navigate('SupplierScreen', {
          supplierId,
          fromScreen: 'ChatRoom'
        });
        return;
      }
    }
    
    // Остальные роли - открываем UserPublicProfile
    if (userId) {
      const rootNavigation = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
      (rootNavigation || navigation).navigate('UserPublicProfile', {
        userId,
        fromScreen: 'ChatRoom',
        roomId,
      });
    }
  }, [navigation, roomId, roomData, chatPartnerInfo, params]);
  
  // ============ ROOM ACTIONS ============
  
  const handleDeleteChat = useCallback(() => {
    showAlert({
      type: 'warning',
      title: 'Удалить чат',
      message: 'Вы уверены, что хотите удалить этот чат? Все сообщения будут удалены безвозвратно.',
      buttons: [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          icon: 'delete',
          onPress: async () => {
            try {
              await dispatch(deleteRoom({ roomId })).unwrap();
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'ChatTab', params: { screen: 'ChatList' } }],
                });
              }
            } catch (error) {
              console.error('Delete room error:', error);
              showError('Ошибка', error.message || 'Не удалось удалить чат');
            }
          },
        },
      ]
    });
  }, [dispatch, roomId, navigation, showAlert, showError]);
  
  const handleDeleteGroup = useCallback(() => {
    const isBroadcast = roomData?.type === 'BROADCAST';
    const entityName = isBroadcast ? 'канал' : 'группу';
    
    showAlert({
      type: 'warning',
      title: `Удалить ${entityName}`,
      message: isBroadcast 
        ? 'Вы уверены, что хотите удалить этот канал? Все сообщения и подписчики будут удалены безвозвратно.'
        : 'Вы уверены, что хотите удалить эту группу? Все сообщения и участники будут удалены безвозвратно.',
      buttons: [
        { text: 'Отмена', style: 'cancel' },
        {
          text: `Удалить ${entityName}`,
          style: 'destructive',
          icon: 'delete-forever',
          onPress: async () => {
            try {
              await dispatch(deleteRoom({ roomId })).unwrap();
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'ChatTab', params: { screen: 'ChatList' } }],
                });
              }
            } catch (error) {
              console.error('Delete group error:', error);
              showError('Ошибка', error.message || `Не удалось удалить ${entityName}`);
            }
          },
        },
      ]
    });
  }, [dispatch, roomId, roomData, navigation, showAlert, showError]);
  
  const handleLeaveGroup = useCallback((deleteMessages = false) => {
    const isBroadcast = roomData?.type === 'BROADCAST';
    const entityName = isBroadcast ? 'канал' : 'группу';
    
    const title = deleteMessages ? `Покинуть ${entityName} с удалением` : `Покинуть ${entityName}`;
    const message = deleteMessages
      ? (isBroadcast 
          ? 'Вы уверены, что хотите покинуть канал и удалить все свои сообщения? Это действие нельзя отменить.'
          : 'Вы уверены, что хотите покинуть группу и удалить все свои сообщения? Это действие нельзя отменить.')
      : (isBroadcast
          ? 'Вы уверены, что хотите покинуть этот канал? Ваши сообщения останутся в канале.'
          : 'Вы уверены, что хотите покинуть эту группу? Ваши сообщения останутся в группе.');
    
    showAlert({
      type: deleteMessages ? 'error' : 'warning',
      title,
      message,
      buttons: [
        { text: 'Отмена', style: 'cancel' },
        {
          text: deleteMessages ? 'Покинуть и удалить' : 'Покинуть',
          style: 'destructive',
          icon: deleteMessages ? 'delete-sweep' : 'exit-to-app',
          onPress: async () => {
            try {
              await dispatch(leaveRoom({ roomId, deleteMessages })).unwrap();
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'ChatTab', params: { screen: 'ChatList' } }],
                });
              }
            } catch (error) {
              console.error('Leave room error:', error);
              const errorMessage = error.message || `Не удалось покинуть ${entityName}`;
              
              if (errorMessage.includes('владелец') || errorMessage.includes('Владелец')) {
                showAlert({
                  type: 'warning',
                  title: `Нельзя покинуть ${entityName}`,
                  message: isBroadcast
                    ? 'Владелец канала не может покинуть канал, не назначив другого администратора.'
                    : 'Владелец группы не может покинуть группу, не назначив другого администратора.',
                  buttons: [{ text: 'Понятно', style: 'primary' }]
                });
              } else {
                showError('Ошибка', errorMessage);
              }
            }
          },
        },
      ]
    });
  }, [dispatch, roomId, roomData, navigation, showAlert, showError]);
  
  return {
    handleBackPress,
    handleProfilePress,
    handleDeleteChat,
    handleDeleteGroup,
    handleLeaveGroup,
  };
};