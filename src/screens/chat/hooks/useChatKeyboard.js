import { useState, useEffect, useCallback, useMemo } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Хук для управления состоянием клавиатуры
 * Оптимизирован для минимизации ре-рендеров
 */
export const useChatKeyboard = (insets) => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Упрощенная логика клавиатуры
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const handleShow = () => setKeyboardVisible(true);
    const handleHide = () => setKeyboardVisible(false);
    
    const showSub = Keyboard.addListener(showEvent, handleShow);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);
    
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  
  // Dismiss клавиатуры
  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);
  
  // Стабильные стили (мемоизированы)
  const keyboardVerticalOffset = useMemo(() => {
    const HEADER_OFFSET = 64;
    return Platform.OS === 'ios' ? insets.top + HEADER_OFFSET : 0;
  }, [insets.top]);
  
  const composerContainerStyle = useMemo(() => {
    if (keyboardVisible) {
      return { marginBottom: 85 };
    }
    return {};
  }, [keyboardVisible]);
  
  return {
    keyboardVisible,
    keyboardVerticalOffset,
    composerContainerStyle,
    dismissKeyboard,
  };
};