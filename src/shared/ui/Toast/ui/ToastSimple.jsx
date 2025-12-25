import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily, Color, Border } from '@app/styles/GlobalStyles';
import { AndroidShadow } from '@shared/ui/Shadow/ui/AndroidShadow';

export const ToastSimple = ({
  message,
  type = 'success',
  duration = 3000,
  onHide,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const slideAnim = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation for appearing
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide after duration
    if (duration > 0) {
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, []);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      onHide?.();
    });
  };

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#34C759', // Color.success
          icon: '✓',
          textColor: '#FFFFFF',
        };
      case 'error':
        return {
          backgroundColor: '#FF3B30', // Color.error
          icon: '✕',
          textColor: '#FFFFFF',
        };
      case 'warning':
        return {
          backgroundColor: '#FFCC00', // Color.warning
          icon: '⚠',
          textColor: '#000000',
        };
      case 'info':
        return {
          backgroundColor: '#3339B0', // Color.primary
          icon: 'ℹ',
          textColor: '#FFFFFF',
        };
      default:
        return {
          backgroundColor: '#3339B0', // Color.primary
          icon: 'ℹ',
          textColor: '#FFFFFF',
        };
    }
  };

  const config = getToastConfig();

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          [position === 'top' ? 'top' : 'bottom']: normalize(50),
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <AndroidShadow
        style={styles.toastContainer}
        shadowColor="rgba(51, 57, 176, 0.15)"
        shadowConfig={{
          offsetX: 0,
          offsetY: 2,
          elevation: 6,
          radius: 4,
          opacity: 0.3
        }}
        borderRadius={10}
      >
        <View style={[styles.toast, { backgroundColor: config.backgroundColor }]}>
          <View style={styles.content}>
            <Text style={styles.icon}>{config.icon}</Text>
            <Text style={[styles.message, { color: config.textColor }]}>
              {message}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={hideToast}
          >
            <Text style={[styles.closeIcon, { color: config.textColor }]}>×</Text>
          </TouchableOpacity>
        </View>
      </AndroidShadow>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: normalize(16),
    right: normalize(16),
    zIndex: 1000,
  },
  toastContainer: {
    width: '100%',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(12),
    borderRadius: 10, // Border.br_3xs
    minHeight: normalize(50),
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: normalizeFont(18),
    marginRight: normalize(12),
    fontWeight: 'bold',
  },
  message: {
    flex: 1,
    fontSize: normalizeFont(14),
    fontFamily: 'SF Pro Text-Medium', // FontFamily.medium
    lineHeight: normalizeFont(20),
  },
  closeButton: {
    marginLeft: normalize(8),
    padding: normalize(4),
  },
  closeIcon: {
    fontSize: normalizeFont(20),
    fontWeight: 'bold',
  },
});
