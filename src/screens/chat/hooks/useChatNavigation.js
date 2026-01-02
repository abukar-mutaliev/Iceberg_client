import { useLayoutEffect, useEffect, useCallback } from 'react';
import { Platform, BackHandler } from 'react-native';
import { ChatHeader } from '@entities/chat/ui/ChatHeader';
import { ChatSelectionHeader } from '@entities/chat/ui/ChatSelectionHeader';

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
}) => {
  // Настройка header в зависимости от режима выбора
  useLayoutEffect(() => {
    if (isSelectionMode) {
      const canReply = canSendMessages && selectedMessages.size === 1;
      const selectedArray = Array.from(selectedMessages);
      const canDeleteAll = selectedArray.length > 0 && 
        selectedArray.every(msgId => {
          const msg = messages.find(m => m.id === msgId);
          return msg && canDeleteMessage(msg);
        });
      
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
