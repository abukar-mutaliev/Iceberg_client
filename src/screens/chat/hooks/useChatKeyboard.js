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
  // Уменьшаем offset, так как KeyboardAvoidingView сам управляет отступами
  const keyboardVerticalOffset = useMemo(() => {
    // Для iOS учитываем только safe area top, без дополнительного offset для хедера
    // KeyboardAvoidingView сам правильно обработает клавиатуру
    return Platform.OS === 'ios' ? 0 : 0;
  }, []);
  
  // Убираем дополнительный marginBottom, так как KeyboardAvoidingView сам управляет позицией
  const composerContainerStyle = useMemo(() => {
    return {};
  }, []);
  
  return {
    keyboardVisible,
    keyboardVerticalOffset,
    composerContainerStyle,
    dismissKeyboard,
  };
};