// NotificationsScreen.js - Исправленная навигация

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    selectNotifications,
    selectNotificationLoading,
    selectNotificationError,
    selectUnreadCount,
    fetchNotifications,
    fetchUnreadCount,
    markNotificationAsRead
} from '@entities/notification';
import {NavigationDebugger} from "@screens/notifications/ui/NavigationDebugHelper";
import { useAuth } from '@entities/auth/hooks/useAuth';

export const NotificationsScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const notifications = useSelector(selectNotifications);
    const loading = useSelector(selectNotificationLoading);
    const error = useSelector(selectNotificationError);
    const unreadCount = useSelector(selectUnreadCount);
    const { currentUser: user } = useAuth();

    // Проверяем доступность уведомлений для роли пользователя
    const isNotificationsAvailable = user?.role === 'CLIENT';

    useEffect(() => {
        // Загружаем уведомления только для клиентов
        if (isNotificationsAvailable) {
            loadNotifications();
        } else {
            console.log('🚫 NotificationsScreen: Access denied - role:', user?.role);
        }
    }, [isNotificationsAvailable, user?.role]);

    const loadNotifications = () => {
        dispatch(fetchNotifications({
            page: 1,
            limit: 50,
            includeData: true
        }));
        dispatch(fetchUnreadCount());
    };

    const handleRefresh = () => {
        if (!isNotificationsAvailable) {
            console.log('🚫 NotificationsScreen: Refresh denied - role:', user?.role);
            return;
        }
        loadNotifications();
    };

    // ИСПРАВЛЕННЫЙ обработчик нажатий
    const handleNotificationPress = (notification) => {
        // Проверяем права доступа
        if (!isNotificationsAvailable) {
            console.log('🚫 NotificationsScreen: Press denied - role:', user?.role);
            return;
        }

        console.log('📱 Notification pressed - FULL DEBUG:', {
            id: notification.id,
            type: notification.type,
            stopId: notification.stopId,
            orderId: notification.orderId,
            productId: notification.productId,
            data: notification.data,
            title: notification.title,
            content: notification.content?.substring(0, 50) + '...',
            // ОТЛАДКА навигации
            navigationAvailable: !!navigation,
            navigationMethods: navigation ? Object.keys(navigation) : 'no navigation'
        });

        // Отмечаем как прочитанное
        if (!notification.isRead) {
            dispatch(markNotificationAsRead(notification.id));
        }

        // ОСНОВНАЯ ЛОГИКА НАВИГАЦИИ
        try {
            // 1. Проверяем доступность навигации
            if (!navigation) {
                console.error('❌ Navigation object is not available');
                Alert.alert('Ошибка', 'Навигация недоступна');
                return;
            }

            // 2. Навигация к остановке (основной случай)
            if (notification.stopId || (notification.type === 'SYSTEM' && notification.title.includes('остановк'))) {
                const stopId = notification.stopId || extractStopIdFromContent(notification);

                if (stopId) {
                    console.log('🚛 Navigating to stop with ID:', stopId);
                    navigateToStopDetails(stopId, notification);
                    return;
                }
            }

            // 3. Навигация к заказу
            if (notification.orderId || notification.type === 'ORDER_STATUS') {
                const orderId = notification.orderId;
                if (orderId) {
                    console.log('📦 Navigating to order with ID:', orderId);
                    navigateToOrderDetails(orderId, notification);
                    return;
                }
            }

            // 4. Навигация к продукту
            if (notification.productId || notification.type === 'PROMOTION') {
                const productId = notification.productId;
                if (productId) {
                    console.log('🛍️ Navigating to product with ID:', productId);
                    navigateToProductDetails(productId, notification);
                    return;
                }
            }

            // 5. Fallback навигация
            console.log('🔄 Using fallback navigation for notification type:', notification.type);
            handleFallbackNavigation(notification);

        } catch (error) {
            console.error('❌ Critical error in notification navigation:', error);
            Alert.alert('Ошибка навигации', 'Произошла ошибка при переходе. Попробуйте еще раз.');
        }
    };

    // Функция навигации к деталям остановки
    const navigateToStopDetails = (stopId, notification) => {
        const targetStopId = parseInt(stopId);

        console.log('🚛 Attempting navigation to StopDetails with:', {
            stopId: targetStopId,
            notificationId: notification.id,
            fromNotification: true
        });

        try {
            // Сначала пробуем прямую навигацию
            navigation.navigate('StopDetails', {
                stopId: targetStopId,
                fromNotification: true,
                notificationId: notification.id,
                timestamp: Date.now()
            });

            console.log('✅ Direct navigation to StopDetails successful');

        } catch (directError) {
            console.warn('⚠️ Direct navigation failed, trying stack navigation:', directError.message);

            try {
                // Пробуем навигацию через стек
                navigation.navigate('StopDetailsStack', {
                    screen: 'StopDetails',
                    params: {
                        stopId: targetStopId,
                        fromNotification: true,
                        fallback: true
                    }
                });

                console.log('✅ Stack navigation successful');

            } catch (stackError) {
                console.warn('⚠️ Stack navigation failed, trying main navigator:', stackError.message);

                try {
                    // Пробуем через Main navigator
                    navigation.navigate('Main', {
                        screen: 'MainTab',
                        params: {
                            screen: 'StopDetails',
                            params: {
                                stopId: targetStopId,
                                fromNotification: true,
                                fallback: true
                            }
                        }
                    });

                    console.log('✅ Main navigator navigation successful');

                } catch (mainError) {
                    console.error('❌ All navigation attempts failed:', mainError.message);

                    // Последний fallback - к списку остановок
                    try {
                        navigation.navigate('Main', {
                            screen: 'MainTab',
                            params: { screen: 'StopsListScreen' }
                        });
                        Alert.alert(
                            'Частичный успех',
                            `Перешли к списку остановок. Найдите остановку с ID ${targetStopId}`
                        );
                    } catch (finalError) {
                        console.error('❌ Even fallback to stops list failed:', finalError.message);
                        Alert.alert('Ошибка', 'Не удалось открыть ни один экран. Проверьте навигационную структуру приложения.');
                    }
                }
            }
        }
    };

    // Функция навигации к деталям заказа
    const navigateToOrderDetails = (orderId, notification) => {
        try {
            // Пробуем сначала навигацию в AdminStack (для персонала)
            navigation.navigate('StaffOrderDetails', {
                orderId: parseInt(orderId),
                fromNotification: true,
                notificationId: notification.id
            });
            console.log('✅ Navigation to StaffOrderDetails successful');
        } catch (error) {
            console.log('⚠️ StaffOrderDetails not available, trying OrderDetails');
            try {
                // Fallback - навигация в CartStack
                navigation.navigate('OrderDetails', {
                    orderId: parseInt(orderId),
                    fromNotification: true,
                    notificationId: notification.id
                });
                console.log('✅ Navigation to OrderDetails successful');
            } catch (fallbackError) {
                console.error('❌ Error navigating to OrderDetails:', fallbackError);
                Alert.alert('Ошибка', 'Не удалось перейти к заказу');
            }
        }
    };

    // Функция навигации к деталям продукта
    const navigateToProductDetails = (productId, notification) => {
        try {
            navigation.navigate('ProductDetail', {
                productId: parseInt(productId),
                fromNotification: true,
                notificationId: notification.id
            });
            console.log('✅ Navigation to ProductDetail successful');
        } catch (error) {
            console.error('❌ Error navigating to ProductDetails:', error);
            Alert.alert('Ошибка', 'Не удалось перейти к товару');
        }
    };

    // Fallback навигация
    const handleFallbackNavigation = (notification) => {
        const options = [];

        // Определяем возможные варианты навигации
        if (notification.type === 'SYSTEM') {
            options.push({
                text: 'К остановкам',
                onPress: () => {
                    try {
                        navigation.navigate('Main', {
                            screen: 'MainTab',
                            params: { screen: 'StopsListScreen' }
                        });
                    } catch (error) {
                        console.error('Navigation to StopsListScreen failed:', error);
                        Alert.alert('Ошибка', 'Не удалось открыть список остановок');
                    }
                }
            });
        }

        if (notification.type === 'ORDER_STATUS') {
            options.push({
                text: 'К заказам',
                onPress: () => {
                    try {
                        navigation.navigate('OrdersListScreen');
                    } catch (error) {
                        try {
                            navigation.navigate('Main', {
                                screen: 'MainTab',
                                params: { screen: 'OrdersListScreen' }
                            });
                        } catch (fallbackError) {
                            Alert.alert('Ошибка', 'Не удалось открыть список заказов');
                        }
                    }
                }
            });
        }

        if (notification.type === 'PROMOTION') {
            options.push({
                text: 'К товарам',
                onPress: () => {
                    try {
                        navigation.navigate('ProductsScreen');
                    } catch (error) {
                        try {
                            navigation.navigate('Main', {
                                screen: 'MainTab',
                                params: { screen: 'ProductsScreen' }
                            });
                        } catch (fallbackError) {
                            Alert.alert('Ошибка', 'Не удалось открыть товары');
                        }
                    }
                }
            });
        }

        options.push({ text: 'Отмена', style: 'cancel' });

        if (options.length > 1) {
            Alert.alert(
                'Куда перейти?',
                'Выберите раздел для перехода',
                options
            );
        } else {
            console.log('📱 No navigation options available for this notification');
        }
    };

    // Функция извлечения stopId из контента (для старых уведомлений)
    const extractStopIdFromContent = (notification) => {
        if (!notification.content) return null;

        const patterns = [
            /остановка.*?ID[\s:]*(\d+)/i,
            /stop.*?ID[\s:]*(\d+)/i,
            /ID[\s:]*(\d+)/i,
            /номер[\s:]*(\d+)/i
        ];

        for (const pattern of patterns) {
            const match = notification.content.match(pattern);
            if (match && match[1]) {
                const id = parseInt(match[1]);
                if (id > 0 && id < 999999) {
                    console.log('✅ Extracted stopId from content:', id);
                    return id;
                }
            }
        }

        return null;
    };

    // Рендер уведомления
    const renderNotification = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.notificationItem,
                !item.isRead && styles.unreadNotification
            ]}
            onPress={() => handleNotificationPress(item)}
        >
            <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle} numberOfLines={2}>
                    {item.title}
                </Text>
                <View style={styles.notificationMeta}>
                    <Text style={styles.notificationDate}>
                        {new Date(item.createdAt).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </Text>
                    {/* Индикаторы навигации */}
                    {item.stopId && <Text style={styles.navIndicator}>🚛</Text>}
                    {item.orderId && <Text style={styles.navIndicator}>📦</Text>}
                    {item.productId && <Text style={styles.navIndicator}>🛍️</Text>}
                    {item.data && <Text style={styles.navIndicator}>🔗</Text>}
                </View>
            </View>

            <Text style={styles.notificationContent} numberOfLines={3}>
                {item.content}
            </Text>

            {/* ОТЛАДОЧНАЯ ИНФОРМАЦИЯ (только в dev режиме) */}
            {__DEV__ && (
                <View style={styles.debugInfo}>
                    <Text style={styles.debugText}>
                        ID: {item.id} | StopID: {item.stopId || 'none'} | Data: {item.data ? 'yes' : 'no'}
                    </Text>
                </View>
            )}

            <View style={styles.notificationFooter}>
                <Text style={styles.notificationType}>
                    {item.type === 'SYSTEM' ? 'Система' :
                        item.type === 'PROMOTION' ? 'Акция' :
                            item.type === 'ORDER_STATUS' ? 'Заказ' : item.type}
                </Text>
                {!item.isRead && <View style={styles.unreadDot} />}
            </View>
        </TouchableOpacity>
    );

    // Остальные компоненты остаются такими же
    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>📭</Text>
            <Text style={styles.emptyTitle}>Нет уведомлений</Text>
            <Text style={styles.emptySubtitle}>
                Здесь будут появляться важные уведомления
            </Text>
        </View>
    );

    if (loading && notifications.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Загрузка уведомлений...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>😞 Ошибка загрузки</Text>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                    <Text style={styles.retryButtonText}>Попробовать снова</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    Уведомления {unreadCount > 0 && `(${unreadCount})`}
                </Text>
            </View>
             {__DEV__ && <NavigationDebugger navigation={navigation} />}
            <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item.id.toString()}
                ListEmptyComponent={renderEmpty}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={handleRefresh}
                        colors={['#007AFF']}
                    />
                }
                contentContainerStyle={notifications.length === 0 ? styles.emptyList : null}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    notificationItem: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginVertical: 4,
        padding: 16,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
    },
    unreadNotification: {
        borderLeftColor: '#ff4444',
        backgroundColor: '#fff8f8',
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
        marginRight: 8,
    },
    notificationMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    notificationDate: {
        fontSize: 12,
        color: '#666',
    },
    navIndicator: {
        fontSize: 12,
        marginLeft: 4,
    },
    notificationContent: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
        marginBottom: 8,
    },
    debugInfo: {
        backgroundColor: '#f0f0f0',
        padding: 4,
        borderRadius: 4,
        marginBottom: 8,
    },
    debugText: {
        fontSize: 10,
        color: '#666',
        fontFamily: 'monospace',
    },
    notificationFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    notificationType: {
        fontSize: 12,
        color: '#888',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ff4444',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    emptyList: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#d32f2f',
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});