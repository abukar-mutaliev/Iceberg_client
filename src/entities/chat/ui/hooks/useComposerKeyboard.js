import { useEffect, useCallback } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Хук для управления клавиатурой и эмодзи-пикером
 * Содержит логику переключения между клавиатурой и эмодзи
 */
export const useComposerKeyboard = ({
  textInputRef,
  autoFocus,
  showEmojiPicker,
  setShowEmojiPicker,
  setIsKeyboardVisible,
  isSwitchingToKeyboardRef,
  isSwitchingToEmojiRef,
  disabled,
}) => {
  // ============ KEYBOARD LISTENERS ============
  
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        // Если переключаемся на клавиатуру намеренно - не скрываем эмодзи-пикер сразу
        if (!isSwitchingToKeyboardRef.current) {
          setShowEmojiPicker(false);
        }
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        // Показываем эмодзи-пикер только если это намеренное переключение на эмодзи
        if (isSwitchingToEmojiRef.current) {
          setShowEmojiPicker(true);
          isSwitchingToEmojiRef.current = false;
        }
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [setIsKeyboardVisible, setShowEmojiPicker, isSwitchingToKeyboardRef, isSwitchingToEmojiRef]);
  
  // ============ AUTO FOCUS ============
  
  useEffect(() => {
    if (autoFocus && textInputRef.current) {
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, textInputRef]);
  
  // ============ HANDLERS ============
  
  const toggleEmojiPicker = useCallback(() => {
    if (disabled) return;
    
    if (!showEmojiPicker) {
      // Открываем эмодзи-пикер
      if (Keyboard.isVisible?.()) {
        // Если клавиатура открыта - переключаемся на эмодзи
        isSwitchingToEmojiRef.current = true;
        textInputRef.current?.blur();
        Keyboard.dismiss();
      } else {
        // Если клавиатура закрыта - просто показываем эмодзи-пикер
        setShowEmojiPicker(true);
      }
    } else {
      // Закрываем эмодзи-пикер и открываем клавиатуру
      isSwitchingToKeyboardRef.current = true;
      setShowEmojiPicker(false);
      textInputRef.current?.focus();
      setTimeout(() => {
        isSwitchingToKeyboardRef.current = false;
      }, 300);
    }
  }, [
    disabled, 
    showEmojiPicker, 
    setShowEmojiPicker, 
    textInputRef, 
    isSwitchingToKeyboardRef, 
    isSwitchingToEmojiRef
  ]);
  
  const handleInputFocus = useCallback(() => {
    // При фокусе на поле ввода закрываем эмодзи-пикер
    // Но только если это не было намеренное переключение через кнопку клавиатуры
    if (showEmojiPicker && !isSwitchingToKeyboardRef.current) {
      setShowEmojiPicker(false);
    }
  }, [showEmojiPicker, setShowEmojiPicker, isSwitchingToKeyboardRef]);
  
  return {
    toggleEmojiPicker,
    handleInputFocus,
  };
};
