import { useState, useEffect, useCallback, useMemo } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Хук для управления состоянием клавиатуры в чате
 * Оптимизирован для правильной работы KeyboardAvoidingView
 */
export const useChatKeyboard = (insets) => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // ============ KEYBOARD LISTENERS ============
  
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const handleShow = (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      
      if (__DEV__) {
        console.log('⌨️ Keyboard shown:', {
          height: e.endCoordinates.height,
          screenY: e.endCoordinates.screenY,
          platform: Platform.OS,
        });
      }
    };
    
    const handleHide = () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    };
    
    const showSub = Keyboard.addListener(showEvent, handleShow);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);
    
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  
  // ============ DISMISS KEYBOARD ============
  
  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);
  
  // ============ COMPUTED VALUES ============
  
  /**
   * Вертикальный отступ для KeyboardAvoidingView
   * 
   * iOS: header (44) + status bar (insets.top)
   * Android: нужен небольшой offset для правильного позиционирования
   */
  const keyboardVerticalOffset = useMemo(() => {
    if (Platform.OS === 'android') {
      // На Android нужен небольшой offset
      // Обычно это высота header (56dp стандартный Material header)
      return 83;
    }
    
    // iOS: header + status bar
    const headerHeight = 44;
    const statusBarHeight = insets.top;
    
    return headerHeight + statusBarHeight;
  }, [insets.top]);
  
  /**
   * Стили для контейнера Composer
   * На Android добавляем дополнительный отступ снизу
   */
  const composerContainerStyle = useMemo(() => {
    if (Platform.OS === 'android' && keyboardVisible) {
      // На Android добавляем небольшой отступ для компенсации
      return {
        marginBottom: 0,
      };
    }
    
    return {};
  }, [keyboardVisible]);
  
  return {
    keyboardVisible,
    keyboardHeight,
    keyboardVerticalOffset,
    composerContainerStyle,
    dismissKeyboard,
  };
};