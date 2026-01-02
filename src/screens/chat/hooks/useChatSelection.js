import { useState, useCallback, useEffect } from 'react';
import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Хук для управления режимом выбора сообщений
 */
export const useChatSelection = () => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  
  // Синхронизация режима выбора
  useEffect(() => {
    if (selectedMessages.size === 0 && isSelectionMode) {
      setIsSelectionMode(false);
    }
  }, [selectedMessages.size, isSelectionMode]);
  
  const clearSelection = useCallback(() => {
    setSelectedMessages(new Set());
    setIsSelectionMode(false);
  }, []);
  
  const toggleMessageSelection = useCallback((messageId) => {
    setSelectedMessages(prev => {
      const updated = new Set(prev);
      const wasSelected = updated.has(messageId);
      
      if (wasSelected) {
        updated.delete(messageId);
      } else {
        updated.add(messageId);
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          Vibration.vibrate(5);
        }
      }
      
      return updated;
    });
    
    if (!isSelectionMode) setIsSelectionMode(true);
  }, [isSelectionMode]);
  
  const selectMessage = useCallback((messageId) => {
    setSelectedMessages(prev => new Set(prev).add(messageId));
    if (!isSelectionMode) setIsSelectionMode(true);
  }, [isSelectionMode]);
  
  const deselectMessage = useCallback((messageId) => {
    setSelectedMessages(prev => {
      const updated = new Set(prev);
      updated.delete(messageId);
      return updated;
    });
  }, []);
  
  return {
    isSelectionMode,
    selectedMessages,
    setIsSelectionMode,
    clearSelection,
    toggleMessageSelection,
    selectMessage,
    deselectMessage,
  };
};