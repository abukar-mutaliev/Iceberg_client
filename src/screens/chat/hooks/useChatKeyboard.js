import { useState, useEffect, useCallback, useMemo } from 'react';
import { Keyboard, Platform } from 'react-native';
import * as Device from 'expo-device';
import { getChatKeyboardGapPx } from '@shared/lib/device/chatKeyboardGap';

const KNOWN_ANDROID_BRANDS = [
  'samsung',
  'xiaomi', 'redmi', 'poco',
  'huawei', 'honor',
  'oppo', 'vivo', 'realme',
  'oneplus', 'meizu', 'zte',
  'lenovo', 'nothing',
  'tecno', 'infinix', 'itel',
  'motorola', 'nokia',
];

function detectAndroidBrand() {
  if (Platform.OS !== 'android') return null;
  const brand = String(Device.brand || '').toLowerCase();
  const manufacturer = String(Device.manufacturer || '').toLowerCase();
  return (
    KNOWN_ANDROID_BRANDS.find(b => brand.includes(b) || manufacturer.includes(b)) ?? null
  );
}

/**
 * Хук для управления состоянием клавиатуры в чате.
 *
 * На Android всегда используется behavior='padding' — это единственный
 * режим, корректно работающий на всех вендорах (Samsung, Xiaomi, Huawei,
 * Oppo, Vivo и т.д.). Режим 'height' приводит к тому, что Composer
 * обрезается, а не сдвигается вверх.
 */
export const useChatKeyboard = (insets, options = {}) => {
  const {
    headerOffset = 64,
    androidVerticalOffset = 83,
    enableKeyboardGap = false,
  } = options;

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const detectedBrand = useMemo(detectAndroidBrand, []);

  // ============ KEYBOARD LISTENERS ============

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleShow = (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
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

  const keyboardVerticalOffset = useMemo(() => {
    if (Platform.OS === 'android') {
      return androidVerticalOffset;
    }
    return headerOffset + insets.top;
  }, [insets.top, headerOffset, androidVerticalOffset]);

  const androidKeyboardGap = useMemo(() => {
    if (Platform.OS !== 'android' || !keyboardVisible || !enableKeyboardGap) {
      return 0;
    }
    return getChatKeyboardGapPx({ keyboardHeight, brand: detectedBrand });
  }, [keyboardVisible, keyboardHeight, enableKeyboardGap, detectedBrand]);

  const composerContainerStyle = useMemo(() => {
    const baseStyle = { position: 'relative' };
    if (Platform.OS === 'android' && androidKeyboardGap > 0) {
      return [baseStyle, { marginBottom: androidKeyboardGap }];
    }
    return baseStyle;
  }, [androidKeyboardGap]);

  const keyboardAvoidingBehavior = 'padding';

  const keyboardAvoidingOffset = keyboardVerticalOffset;

  return {
    keyboardVisible,
    keyboardHeight,
    keyboardVerticalOffset,
    composerContainerStyle,
    dismissKeyboard,
    keyboardAvoidingBehavior,
    keyboardAvoidingOffset,
    androidKeyboardGap,
    detectedBrand,
  };
};