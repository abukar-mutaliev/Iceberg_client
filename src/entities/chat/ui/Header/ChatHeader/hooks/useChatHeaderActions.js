import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { deleteRoom, leaveRoom } from '@entities/chat/model/slice';

/**
 * Хук для действий в заголовке чата
 * Содержит всю логику навигации и операций с чатом
 */
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
  
  /**
   * Обработка кнопки "Назад"
   * Специальная логика для возврата из чата в ProductDetail
   */
  const handleBackPress = useCallback(() => {
    const fromScreen = params.fromScreen;
    const productId = params.productId || params.productInfo?.id;
    
    // ProductDetail - особый случай, переходим напрямую
    if (productId && (fromScreen === 'ProductDetail' || !fromScreen)) {
      const rootNavigation = navigation.getParent() || navigation;
      rootNavigation.navigate('ProductDetail', {
        productId,
        fromScreen: 'ChatRoom'
      });
      return;
    }
    
    // Стандартная навигация назад
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, params]);
  
  /**
   * Обработка нажатия на профиль/аватар
   * Открывает GroupInfo для групп или профиль пользователя для личных чатов
   */
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
        const rootNavigation = navigation?.getParent?.('AppStack') || 
                               navigation?.getParent?.() || 
                               navigation;
        (rootNavigation || navigation).navigate('SupplierScreen', {
          supplierId,
          fromScreen: 'ChatRoom'
        });
        return;
      }
    }
    
    // Остальные роли - открываем UserPublicProfile
    if (userId) {
      const rootNavigation = navigation?.getParent?.('AppStack') || 
                             navigation?.getParent?.() || 
                             navigation;
      (rootNavigation || navigation).navigate('UserPublicProfile', {
        userId,
        fromScreen: 'ChatRoom',
        roomId,
      });
    }
  }, [navigation, roomId, roomData, chatPartnerInfo, params]);
  
  // ============ ROOM ACTIONS ============
  
  /**
   * Удаление личного чата
   * Показывает подтверждение и удаляет чат
   */
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
              
              // Возврат к списку чатов
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
  
  /**
   * Удаление группового чата или канала (только для владельца)
   */
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
              
              // Возврат к списку чатов
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
  
  /**
   * Выход из группового чата или канала
   * @param {boolean} deleteMessages - Удалить свои сообщения при выходе
   */
  const handleLeaveGroup = useCallback((deleteMessages = false) => {
    const isBroadcast = roomData?.type === 'BROADCAST';
    const entityName = isBroadcast ? 'канал' : 'группу';
    
    // Формируем заголовок и сообщение в зависимости от deleteMessages
    const title = deleteMessages 
      ? `Покинуть ${entityName} с удалением` 
      : `Покинуть ${entityName}`;
    
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
              
              // Возврат к списку чатов
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
              
              // Специальная обработка для владельца
              if (errorMessage.includes('владелец') || errorMessage.includes('Владелец')) {
                showAlert({
                  type: 'warning',
                  title: `Нельзя покинуть ${entityName}`,
                  message: isBroadcast
                    ? 'Владелец канала не может покинуть канал, не назначив другого администратора. Сначала назначьте кого-то из участников администратором канала или удалите канал полностью.'
                    : 'Владелец группы не может покинуть группу, не назначив другого администратора. Сначала назначьте кого-то из участников администратором группы или удалите группу полностью.',
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