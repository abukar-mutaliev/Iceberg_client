import { useCallback } from 'react';
import { CommonActions } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { 
  deleteRoom, 
  leaveRoom,
  setActiveRoom,
} from '@entities/chat/model/slice';
import { useChatActions } from './useChatActions';

/**
 * Хук для действий в групповом чате
 * Расширяет useChatActions для групповой логики
 */
export const useGroupChatActions = ({
  roomId,
  currentUserId,
  messages,
  isSuperAdmin,
  isAdmin,
  showError,
  showWarning,
  showConfirm,
  navigation,
  isRoomDeletedRef,
  emitActiveRoom,
}) => {
  const dispatch = useDispatch();

  const resetToChatList = useCallback(() => {
    try {
      const rootNavigation = navigation.getParent('AppStack') || navigation.getParent() || navigation;
      rootNavigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'Main',
              params: {
                screen: 'ChatList',
                params: { screen: 'ChatMain' },
              },
            },
          ],
        })
      );
    } catch (error) {
      // Fallback: try best-effort navigation without stack reset
      const parent = navigation.getParent();
      if (parent) {
        parent.navigate('ChatMain');
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('ChatMain');
      }
    }
  }, [navigation]);
  
  // Получаем базовые действия из useChatActions
  const baseActions = useChatActions({
    roomId,
    currentUserId,
    messages,
    isSuperAdmin,
    isAdmin,
    canDeleteForAll: (message) => {
      if (!message) return false;
      if (isSuperAdmin || isAdmin) return true;
      return Number(message.senderId) === Number(currentUserId);
    },
    showError,
    showWarning,
    showConfirm,
    navigation,
  });
  
  // canDeleteMessage с учетом групповых прав
  const canDeleteMessage = useCallback((message) => {
    if (!message) {
      if (__DEV__) {
        console.log('[useGroupChatActions] canDeleteMessage: no message');
      }
      return false;
    }
    
    // Суперадмин и админ могут удалять любые сообщения
    if (isSuperAdmin || isAdmin) {
      if (__DEV__) {
        console.log('[useGroupChatActions] canDeleteMessage: admin/superAdmin can delete', {
          isSuperAdmin,
          isAdmin,
          messageId: message.id,
        });
      }
      return true;
    }
    
    // Обычные пользователи могут удалять только свои сообщения
    const canDelete = Number(message.senderId) === Number(currentUserId);
    if (__DEV__) {
      console.log('[useGroupChatActions] canDeleteMessage: regular user check', {
        messageSenderId: message.senderId,
        currentUserId,
        canDelete,
      });
    }
    return canDelete;
  }, [isSuperAdmin, isAdmin, currentUserId]);
  
  // Выход из группы
  const handleLeaveGroup = useCallback(async () => {
    try {
      isRoomDeletedRef.current = true;
      dispatch(setActiveRoom(null));
      emitActiveRoom?.(null);
      
      const result = await dispatch(leaveRoom({ roomId }));
      if (result.error) throw new Error(result.error);

      resetToChatList();
      
      return true;
    } catch (error) {
      console.error('Ошибка при выходе из группы:', error);
      showError('Ошибка', 'Не удалось покинуть группу');
      isRoomDeletedRef.current = false;
      return false;
    }
  }, [roomId, dispatch, showError, emitActiveRoom, isRoomDeletedRef, resetToChatList]);

  // Удаление группы
  const handleDeleteGroup = useCallback(async () => {
    try {
      isRoomDeletedRef.current = true;
      dispatch(setActiveRoom(null));
      emitActiveRoom?.(null);
      
      const result = await dispatch(deleteRoom({ roomId }));
      if (result.error) throw new Error(result.error);

      resetToChatList();
      
      return true;
    } catch (error) {
      console.error('Ошибка при удалении группы:', error);
      showError('Ошибка', 'Не удалось удалить группу');
      isRoomDeletedRef.current = false;
      return false;
    }
  }, [roomId, dispatch, showError, emitActiveRoom, isRoomDeletedRef, resetToChatList]);
  
  return {
    ...baseActions,
    canDeleteMessage, // Переопределяем с учетом групповых прав
    handleLeaveGroup,
    handleDeleteGroup,
  };
};

