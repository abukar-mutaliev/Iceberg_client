import { useCallback } from 'react';

export const useToast = () => {
  const showSuccess = useCallback((message, options = {}) => {
    if (typeof window !== 'undefined' && window.showToast) {
      return window.showToast({
        message,
        type: 'success',
        ...options,
      });
    } else {
      console.warn('[useToast] Toast system not initialized yet');
    }
  }, []);

  const showError = useCallback((message, options = {}) => {
    if (typeof window !== 'undefined' && window.showToast) {
      return window.showToast({
        message,
        type: 'error',
        ...options,
      });
    } else {
      console.warn('[useToast] Toast system not initialized yet');
    }
  }, []);

  const showWarning = useCallback((message, options = {}) => {
    if (typeof window !== 'undefined' && window.showToast) {
      return window.showToast({
        message,
        type: 'warning',
        ...options,
      });
    } else {
      console.warn('[useToast] Toast system not initialized yet');
    }
  }, []);

  const showInfo = useCallback((message, options = {}) => {
    if (typeof window !== 'undefined' && window.showToast) {
      return window.showToast({
        message,
        type: 'info',
        ...options,
      });
    } else {
      console.warn('[useToast] Toast system not initialized yet');
    }
  }, []);

  const showCustom = useCallback((config) => {
    if (typeof window !== 'undefined' && window.showToast) {
      return window.showToast(config);
    } else {
      console.warn('[useToast] Toast system not initialized yet');
    }
  }, []);

  const hideToast = useCallback((id) => {
    if (typeof window !== 'undefined' && window.hideToast) {
      window.hideToast(id);
    } else {
      console.warn('[useToast] Toast system not initialized yet');
    }
  }, []);

  const hideAllToasts = useCallback(() => {
    if (typeof window !== 'undefined' && window.hideAllToasts) {
      window.hideAllToasts();
    } else {
      console.warn('[useToast] Toast system not initialized yet');
    }
  }, []);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showCustom,
    hideToast,
    hideAllToasts,
  };
};
