import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import {
    selectUnreadCount,
    fetchUnreadCount,
    fetchNotifications
} from '@entities/notification';
import { useAuth } from '@entities/auth/hooks/useAuth';

// Глобальный флаг для предотвращения дублирования запросов
let globalRefreshInterval = null;
let isGlobalRefreshActive = false;

export const NotificationBadge = ({
                                      onPress,
                                      iconComponent: IconComponent,
                                      showZero = false,
                                      maxCount = 99,
                                      style = {},
                                      badgeStyle = {},
                                      textStyle = {}
                                  }) => {
    const dispatch = useDispatch();
    const unreadCount = useSelector(selectUnreadCount);
    const isMounted = useRef(true);
    const { currentUser: user } = useAuth();

    // Проверяем доступность уведомлений для роли пользователя
    const isNotificationsAvailable = user?.role === 'CLIENT';

    useEffect(() => {
        // Загружаем уведомления только для клиентов
        if (isMounted.current && isNotificationsAvailable) {
            dispatch(fetchUnreadCount());
            dispatch(fetchNotifications({ page: 1, limit: 20 }));
        }

        // Устанавливаем глобальный интервал только если его еще нет и уведомления доступны
        if (!isGlobalRefreshActive && isNotificationsAvailable) {
            isGlobalRefreshActive = true;

            globalRefreshInterval = setInterval(() => {
                // Обновляем только счетчик, не весь список уведомлений
                dispatch(fetchUnreadCount());
            }, 60000); // Увеличено до 1 минуты
        }

        return () => {
            isMounted.current = false;
        };
    }, [dispatch, isNotificationsAvailable]);

    // Очищаем глобальный интервал при размонтировании последнего компонента
    useEffect(() => {
        return () => {
            if (globalRefreshInterval && !isMounted.current) {
                clearInterval(globalRefreshInterval);
                globalRefreshInterval = null;
                isGlobalRefreshActive = false;
            }
        };
    }, []);

    const forceShowInDev = __DEV__ && unreadCount > 0;
    const shouldShowBadge = (unreadCount > 0 || showZero) || forceShowInDev;
    const displayCount = unreadCount > maxCount ? `${maxCount}+` : unreadCount.toString();

    return (
        <TouchableOpacity
            style={[styles.container, style]}
            onPress={() => {
                onPress && onPress();
            }}
            activeOpacity={0.7}
        >
            {IconComponent && <IconComponent />}

            {shouldShowBadge && (
                <View style={[styles.badge, badgeStyle]}>
                    <Text style={[styles.badgeText, textStyle]}>
                        {displayCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

export const BellIcon = ({ size = 24, color = Color.dark }) => (
    <View style={[styles.bellIcon, { width: size, height: size }]}>
        <Text style={[styles.bellText, { fontSize: size * 0.75, color }]}>
            🔔
        </Text>
    </View>
);

export const HeaderNotificationBadge = ({ navigation }) => {
    const { currentUser: user } = useAuth();
    const isNotificationsAvailable = user?.role === 'CLIENT';

    // Не показываем бейдж уведомлений для пользователей без прав
    if (!isNotificationsAvailable) {
        return null;
    }

    return (
        <NotificationBadge
            onPress={() => {
                navigation.navigate('NotificationsScreen');
            }}
            iconComponent={() => <BellIcon size={24} color={Color.dark} />}
            style={styles.headerBadge}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 40,
        minHeight: 40,
    },
    badge: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: '#ff4444',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: Color.colorLightMode || '#fff',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.35,
        shadowRadius: 4.84,
        zIndex: 1000,
    },
    badgeText: {
        color: Color.colorLightMode || '#fff',
        fontSize: FontSize.size_xs || 12,
        fontFamily: FontFamily.sFProText || 'System',
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 16,
    },
    bellIcon: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 12,
    },
    bellText: {
        textAlign: 'center',
    },
    headerBadge: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
});

export default NotificationBadge;