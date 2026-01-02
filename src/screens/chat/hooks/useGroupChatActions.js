import { useCallback } from 'react';
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
  
  // Получаем базовые действия из useChatActions
  const baseActions = useChatActions({
    roomId,
    currentUserId,
    messages,
    isSuperAdmin,
    showError,
    showWarning,
    showConfirm,
    navigation,
  });
  
  // canDeleteMessage с учетом групповых прав
  const canDeleteMessage = useCallback((message) => {
    if (!message || isSuperAdmin || isAdmin) return isSuperAdmin || isAdmin;
    return Number(message.senderId) === Number(currentUserId);
  }, [isSuperAdmin, isAdmin, currentUserId]);
  
  // Выход из группы
  const handleLeaveGroup = useCallback(async () => {
    try {
      isRoomDeletedRef.current = true;
      dispatch(setActiveRoom(null));
      emitActiveRoom?.(null);
      
      const result = await dispatch(leaveRoom({ roomId }));
      if (result.error) throw new Error(result.error);

      const parent = navigation.getParent();
      if (parent) {
        parent.navigate('ChatMain');
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('ChatMain');
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка при выходе из группы:', error);
      showError('Ошибка', 'Не удалось покинуть группу');
      isRoomDeletedRef.current = false;
      return false;
    }
  }, [roomId, navigation, dispatch, showError, emitActiveRoom, isRoomDeletedRef]);

  // Удаление группы
  const handleDeleteGroup = useCallback(async () => {
    try {
      isRoomDeletedRef.current = true;
      dispatch(setActiveRoom(null));
      emitActiveRoom?.(null);
      
      const result = await dispatch(deleteRoom({ roomId }));
      if (result.error) throw new Error(result.error);

      const parent = navigation.getParent();
      if (parent) {
        parent.navigate('ChatMain');
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('ChatMain');
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка при удалении группы:', error);
      showError('Ошибка', 'Не удалось удалить группу');
      isRoomDeletedRef.current = false;
      return false;
    }
  }, [roomId, navigation, dispatch, showError, emitActiveRoom, isRoomDeletedRef]);
  
  return {
    ...baseActions,
    canDeleteMessage, // Переопределяем с учетом групповых прав
    handleLeaveGroup,
    handleDeleteGroup,
  };
};

