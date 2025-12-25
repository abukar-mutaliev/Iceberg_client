import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { normalize } from "@shared/lib/normalize";
import { FontFamily } from "@app/styles/GlobalStyles";

// Упрощенный компонент уведомления без анимаций
const NotificationItem = React.memo(({ notification, onDismiss }) => {
    const timerRef = useRef(null);

    // Автоматическое скрытие без анимаций
    useEffect(() => {
        if (notification.autoHide && notification.duration) {
            timerRef.current = setTimeout(() => {
                onDismiss(notification.id);
            }, notification.duration);

            return () => {
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                }
            };
        }
    }, [notification.id, notification.autoHide, notification.duration, onDismiss]);

    const handleDismiss = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        onDismiss(notification.id);
    }, [notification.id, onDismiss]);

    const getNotificationStyle = () => {
        switch (notification.type) {
            case 'success':
                return notificationStyles.success;
            case 'error':
                return notificationStyles.error;
            case 'warning':
                return notificationStyles.warning;
            case 'info':
            default:
                return notificationStyles.info;
        }
    };

    const getIcon = () => {
        switch (notification.type) {
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'warning':
                return '⚠️';
            case 'info':
            default:
                return 'ℹ️';
        }
    };

    return (
        <View style={[notificationStyles.container, getNotificationStyle()]}>
            <View style={notificationStyles.content}>
                <Text style={notificationStyles.icon}>{getIcon()}</Text>
                <Text style={notificationStyles.message}>{notification.message}</Text>
                <TouchableOpacity
                    style={notificationStyles.closeButton}
                    onPress={handleDismiss}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={notificationStyles.closeText}>✕</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

// Упрощенный главный компонент
export const CartNotifications = React.memo(({ notifications = [], onDismiss }) => {
    // Простая фильтрация без сложных зависимостей
    const activeNotifications = useMemo(() => {
        if (!notifications || notifications.length === 0) return [];
        
        return notifications.filter(notification => {
            if (!notification.autoHide) return true;

            const now = Date.now();
            const notificationTime = new Date(notification.timestamp).getTime();
            const duration = notification.duration || 3000;

            return (now - notificationTime) < duration;
        });
    }, [notifications]);

    // Если нет активных уведомлений, не рендерим ничего
    if (!activeNotifications || activeNotifications.length === 0) {
        return null;
    }

    return (
        <View style={notificationStyles.wrapper}>
            {activeNotifications.map((notification) => (
                <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onDismiss={onDismiss}
                />
            ))}
        </View>
    );
});

const notificationStyles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        top: normalize(100),
        left: normalize(20),
        right: normalize(20),
        zIndex: 1000,
    },

    container: {
        borderRadius: normalize(12),
        marginBottom: normalize(8),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },

    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: normalize(16),
    },

    icon: {
        fontSize: normalize(16),
        marginRight: normalize(12),
    },

    message: {
        flex: 1,
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '500',
        color: '#FFFFFF',
    },

    closeButton: {
        marginLeft: normalize(12),
        width: normalize(24),
        height: normalize(24),
        borderRadius: normalize(12),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    closeText: {
        color: '#FFFFFF',
        fontSize: normalize(14),
        fontWeight: 'bold',
    },

    // Стили для разных типов уведомлений
    success: {
        backgroundColor: '#4CAF50',
    },

    error: {
        backgroundColor: '#F44336',
    },

    warning: {
        backgroundColor: '#FF9800',
    },

    info: {
        backgroundColor: '#2196F3',
    },
});