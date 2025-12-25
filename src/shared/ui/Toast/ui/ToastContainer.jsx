import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Toast } from './Toast';

let toastId = 0;

export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((config) => {
    const id = ++toastId;
    const toast = {
      id,
      ...config,
      onHide: () => {
        setToasts(prev => prev.filter(t => t.id !== id));
      },
    };

    setToasts(prev => [...prev, toast]);

    return id;
  }, []);

  const hideToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const hideAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Сохраняем функции в window для глобального доступа
  if (typeof window !== 'undefined') {
    window.showToast = showToast;
    window.hideToast = hideToast;
    window.hideAllToasts = hideAllToasts;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast, index) => (
        <View
          key={toast.id}
          style={[
            styles.toastWrapper,
            { marginTop: index > 0 ? 8 : 0 }
          ]}
        >
          <Toast {...toast} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
    zIndex: 2147483647, // Максимально возможный z-index в CSS
    elevation: 2147483647, // Максимально возможный elevation на Android
  },
  toastWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2147483647,
    elevation: 2147483647,
  },
});
