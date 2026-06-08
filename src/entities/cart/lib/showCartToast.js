export const showCartToast = (notification) => {
    if (!notification?.message || typeof notification.message !== 'string') {
        return null;
    }

    if (typeof window === 'undefined' || typeof window.showToast !== 'function') {
        if (__DEV__) {
            console.warn('[showCartToast] Toast system not initialized');
        }
        return null;
    }

    const { type = 'info', message, duration, position = 'top' } = notification;

    return window.showToast({
        message,
        type,
        duration: duration || (type === 'error' ? 5000 : 3000),
        position,
    });
};
