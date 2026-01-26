import { useState, useEffect, useCallback, useMemo } from 'react';
import { Keyboard, Platform } from 'react-native';
import * as Device from 'expo-device';
import { getChatKeyboardGapPx } from '@shared/lib/device/chatKeyboardGap';

/**
 * Хук для управления состоянием клавиатуры в чате
 * Оптимизирован для правильной работы KeyboardAvoidingView
 */
export const useChatKeyboard = (insets, options = {}) => {
  const {
    headerOffset = 64,
    androidVerticalOffset = 83,
    androidBehavior = 'padding',
    enableSamsungBehavior = false,
    enableSamsungGap = false,
  } = options;
  
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const isSamsung = useMemo(() => {
    if (!enableSamsungBehavior && !enableSamsungGap) return false;
    const brand = String(Device.brand || '').toLowerCase();
    return brand.includes('samsung');
  }, [enableSamsungBehavior, enableSamsungGap]);
  
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
      return androidVerticalOffset;
    }
    
    return headerOffset + insets.top;
  }, [insets.top, headerOffset, androidVerticalOffset]);
  
  /**
   * Стили для контейнера Composer
   * На Android добавляем дополнительный отступ снизу
   */
  const androidKeyboardGap = useMemo(() => {
    if (Platform.OS !== 'android' || !keyboardVisible || !enableSamsungGap) {
      return 0;
    }
    
    return getChatKeyboardGapPx({ keyboardHeight });
  }, [keyboardVisible, keyboardHeight, enableSamsungGap]);
  
  const composerContainerStyle = useMemo(() => {
    const baseStyle = { position: 'relative' };
    if (Platform.OS === 'android' && androidKeyboardGap > 0) {
      return [baseStyle, { marginBottom: androidKeyboardGap }];
    }
    return baseStyle;
  }, [androidKeyboardGap]);
  
  const keyboardAvoidingBehavior = useMemo(() => {
    if (Platform.OS === 'ios') return 'padding';
    if (enableSamsungBehavior && isSamsung) return 'padding';
    return androidBehavior;
  }, [androidBehavior, enableSamsungBehavior, isSamsung]);
  
  const keyboardAvoidingOffset = useMemo(() => {
    if (Platform.OS === 'ios') return keyboardVerticalOffset;
    return keyboardAvoidingBehavior === 'padding' ? keyboardVerticalOffset : 0;
  }, [keyboardVerticalOffset, keyboardAvoidingBehavior]);
  
  return {
    keyboardVisible,
    keyboardHeight,
    keyboardVerticalOffset,
    composerContainerStyle,
    dismissKeyboard,
    keyboardAvoidingBehavior,
    keyboardAvoidingOffset,
    androidKeyboardGap,
  };
};