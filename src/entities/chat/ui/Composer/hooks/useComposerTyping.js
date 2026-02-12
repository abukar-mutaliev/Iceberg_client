import { useCallback, useEffect, useRef } from 'react';
import { useChatSocketActions } from '@entities/chat/hooks/useChatSocketActions';

/**
 * Хук для управления индикатором печати
 * Отслеживает ввод текста и отправляет события через WebSocket
 */
export const useComposerTyping = ({
  roomId,
  onTyping,
  typingTimeoutRef,
  disabled,
}) => {
  const { emitTyping } = useChatSocketActions();
  const isTypingRef = useRef(false);
  
  // ============ CLEANUP ============
  
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [typingTimeoutRef]);
  
  // ============ START TYPING ============
  
  const startTyping = useCallback(() => {
    if (disabled) return;
    
    onTyping?.(true);
    if (roomId) {
      emitTyping(roomId, true, 'text');
    }
    isTypingRef.current = true;
  }, [disabled, onTyping, roomId, emitTyping]);
  
  // ============ STOP TYPING ============
  
  const stopTyping = useCallback(() => {
    // Очищаем таймер
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    onTyping?.(false);
    if (roomId) {
      emitTyping(roomId, false, 'text');
    }
    isTypingRef.current = false;
  }, [onTyping, roomId, emitTyping, typingTimeoutRef]);
  
  // ============ RESET TYPING TIMEOUT ============
  
  const resetTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Устанавливаем таймер для отправки события окончания печати
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000); // 2 секунды бездействия
  }, [typingTimeoutRef, stopTyping]);
  
  // ============ HANDLE TEXT CHANGE ============
  
  const handleTextChange = useCallback((setText, currentText, newText) => {
    if (disabled) return;
    
    const wasEmpty = currentText.trim().length === 0;
    const isEmpty = newText.trim().length === 0;
    
    setText(newText);
    
    if (isEmpty && !wasEmpty) {
      // Закончил печатать
      stopTyping();
      return;
    }

    if (!isEmpty) {
      if (!isTypingRef.current) {
        // Начал печатать (включая повтор после тайм-аута)
        startTyping();
      }
      // Продолжает печатать - сбрасываем таймер
      resetTypingTimeout();
    }
  }, [disabled, startTyping, stopTyping, resetTypingTimeout]);
  
  // ============ HANDLE BLUR ============
  
  const handleBlur = useCallback(() => {
    stopTyping();
  }, [stopTyping]);
  
  return {
    handleTextChange,
    handleBlur,
    stopTyping,
  };
};
