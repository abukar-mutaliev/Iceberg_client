import { useLayoutEffect, useEffect, useCallback } from 'react';
import { Platform, BackHandler } from 'react-native';
import { ChatHeader } from '@/entities/chat/ui/Header/ChatHeader/ChatHeader';
import { ChatSelectionHeader } from '@/entities/chat/ui/Header/ChatSelectionHeader';

/**
 * Хук для управления навигацией и header чата
 */
export const useChatNavigation = ({
  navigation,
  route,
  isSelectionMode,
  selectedMessages,
  messages,
  canSendMessages,
  canDeleteMessage,
  clearSelection,
  onReply,
  onCopy,
  onForward,
  onDelete,
  isSuperAdmin, // Опционально: для прямого доступа к правам
  isAdmin, // Опционально: для прямого доступа к правам
}) => {
  // Настройка header в зависимости от режима выбора
  useLayoutEffect(() => {
    if (isSelectionMode) {
      const canReply = canSendMessages && selectedMessages.size === 1;
      const selectedArray = Array.from(selectedMessages);
      
      // Если суперадмин или админ, всегда разрешаем удаление
      const isAdminOrSuperAdmin = isSuperAdmin || isAdmin;
      
      // Проверяем каждое выбранное сообщение
      const canDeleteResults = selectedArray.map(msgId => {
        const msg = messages.find(m => m.id === msgId);
        // Если админ/суперадмин, всегда разрешаем удаление
        if (isAdminOrSuperAdmin) {
          return true;
        }
        const canDelete = msg && canDeleteMessage(msg);
        return canDelete;
      });
      
      const canDeleteAll = selectedArray.length > 0 && canDeleteResults.every(result => result === true);
      
      navigation.setOptions({
        headerShown: true,
        header: () => (
          <ChatSelectionHeader
            selectedCount={selectedMessages.size}
            canReply={canReply}
            canDelete={canDeleteAll}
            onCancel={clearSelection}
            onReply={onReply}
            onCopy={onCopy}
            onForward={onForward}
            onDelete={onDelete}
          />
        ),
        gestureEnabled: false,
        keyboardHandlingEnabled: false,
      });
    } else {
      navigation.setOptions({
        headerShown: true,
        header: () => <ChatHeader route={route} navigation={navigation} />,
        gestureEnabled: true,
        headerTransparent: false,
        headerStatusBarHeight: 0,
        keyboardHandlingEnabled: false,
        headerStyle: {
          backgroundColor: '#FFFFFF',
          height: 64,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
      });
    }
  }, [
    navigation, 
    route, 
    isSelectionMode, 
    selectedMessages, 
    messages, 
    canSendMessages, 
    canDeleteMessage,
    clearSelection,
    onReply,
    onCopy,
    onForward,
    onDelete,
    isSuperAdmin,
    isAdmin,
  ]);
  
  // Android back button для режима выбора
  useEffect(() => {
    if (Platform.OS !== 'android' || !isSelectionMode) return;
    
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isSelectionMode) {
        clearSelection();
        return true;
      }
      return false;
    });
    
    return () => backHandler.remove();
  }, [isSelectionMode, clearSelection]);
};
