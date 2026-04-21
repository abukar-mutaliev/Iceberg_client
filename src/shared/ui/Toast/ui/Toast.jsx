import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily, Color, Border } from '@app/styles/GlobalStyles';
import { AndroidShadow } from '@shared/ui/Shadow/ui/AndroidShadow';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const Toast = ({
  message,
  type = 'success',
  duration = 3000,
  onHide,
  position = 'top',
  icon,
  action,
  actionText,
  onActionPress,
}) => {
  const { isDark } = useTheme();
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
    if (isDark) {
      switch (type) {
        case 'success':
          return {
            backgroundColor: '#1F6B46',
            borderColor: 'rgba(52, 199, 89, 0.35)',
            icon: '✓',
            textColor: '#E8F6EE',
          };
        case 'error':
          return {
            backgroundColor: '#7A2320',
            borderColor: 'rgba(255, 80, 70, 0.4)',
            icon: '✕',
            textColor: '#FDECEA',
          };
        case 'warning':
          return {
            backgroundColor: '#5C4733',
            borderColor: 'rgba(255, 204, 0, 0.45)',
            icon: '⚠',
            textColor: '#FFE7A6',
          };
        case 'info':
          return {
            backgroundColor: '#2A2F55',
            borderColor: 'rgba(115, 125, 255, 0.45)',
            icon: 'ℹ',
            textColor: '#E3E6FF',
          };
        default:
          return {
            backgroundColor: '#2A2F55',
            borderColor: 'rgba(115, 125, 255, 0.45)',
            icon: 'ℹ',
            textColor: '#E3E6FF',
          };
      }
    }

    switch (type) {
      case 'success':
        return {
          backgroundColor: Color.success,
          borderColor: 'transparent',
          icon: '✓',
          textColor: '#FFFFFF',
        };
      case 'error':
        return {
          backgroundColor: Color.error,
          borderColor: 'transparent',
          icon: '✕',
          textColor: '#FFFFFF',
        };
      case 'warning':
        return {
          backgroundColor: Color.warning,
          borderColor: 'transparent',
          icon: '⚠',
          textColor: '#000000',
        };
      case 'info':
        return {
          backgroundColor: Color.primary,
          borderColor: 'transparent',
          icon: 'ℹ',
          textColor: '#FFFFFF',
        };
      default:
        return {
          backgroundColor: Color.primary,
          borderColor: 'transparent',
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
        shadowColor={isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(51, 57, 176, 0.15)'}
        shadowConfig={{
          offsetX: 0,
          offsetY: 2,
          elevation: 6,
          radius: 4,
          opacity: isDark ? 0.5 : 0.3
        }}
        borderRadius={10}
      >
        <View
          style={[
            styles.toast,
            {
              backgroundColor: config.backgroundColor,
              borderWidth: isDark ? 1 : 0,
              borderColor: config.borderColor,
            },
          ]}
        >
          <View style={styles.content}>
            <Text style={styles.icon}>{icon || config.icon}</Text>
            <Text style={[styles.message, { color: config.textColor }]}>
              {message}
            </Text>
          </View>

          {action && actionText && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                onActionPress?.();
                hideToast();
              }}
            >
              <Text style={[styles.actionText, { color: config.textColor }]}>
                {actionText}
              </Text>
            </TouchableOpacity>
          )}

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
    zIndex: 2147483647,
    elevation: 2147483647,
  },
  toastContainer: {
    width: '100%',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: normalize(16),
    paddingVertical: normalize(12),
    borderRadius: Border.br_3xs,
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
    fontFamily: FontFamily.medium,
    lineHeight: normalizeFont(20),
  },
  actionButton: {
    marginLeft: normalize(12),
    paddingHorizontal: normalize(8),
    paddingVertical: normalize(4),
  },
  actionText: {
    fontSize: normalizeFont(14),
    fontFamily: FontFamily.medium,
    fontWeight: '600',
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