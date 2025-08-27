import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState, Platform } from 'react-native';

import { selectUser } from '@entities/auth';
import PushNotificationService from "@shared/services/PushNotificationService";
import {
    fetchNotifications,
    fetchUnreadCount,
    fetchStopNotifications,
    fetchOrderNotifications,
    performBulkOperation,
    addNotification,
    updateNotificationData
} from "@entities/notification";
import { fetchAllStops, selectStops } from "@entities/stop";

export const useNotifications = (navigation) => {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const stops = useSelector(selectStops);
    const appState = useRef(AppState.currentState);

    const initializationAttempted = useRef(false);
    const refreshing = useRef(false);
    const setupDone = useRef(false);
    const navigationHandlersSet = useRef(false);
    const lastRefreshTime = useRef(0);

    useEffect(() => {
        const initializePush = async () => {
            // ОТКЛЮЧЕНО: Дублирующая инициализация - она уже происходит в AppContainer
            // if (initializationAttempted.current) {
            //     return;
            // }

            // if (user?.role !== 'CLIENT') {
            //     return;
            // }

            // initializationAttempted.current = true;

            // try {
            //     const success = await PushNotificationService.initializeForUser(user);
            //     if (success) {
            //         setupNavigationHandlers();
            //         console.log('✅ Push notifications initialized');
            //     }
            // } catch (error) {
            //     console.error('Error initializing push notifications:', error);
            // }

            // Вместо инициализации просто настраиваем навигационные хэндлеры
            if (user?.role === 'CLIENT') {
                setupNavigationHandlers();
            }
        };

        const timeoutId = setTimeout(() => {
            initializePush();
        }, 100);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [user?.id, setupNavigationHandlers]);

    useEffect(() => {
        if (setupDone.current) return;
        setupDone.current = true;

        const handleAppStateChange = (nextAppState) => {
            const now = Date.now();

            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active' &&
                user?.role === 'CLIENT' &&
                !refreshing.current &&
                (now - lastRefreshTime.current > 30000)
            ) {
                console.log('🔄 App became active, refreshing notifications');
                refreshing.current = true;
                lastRefreshTime.current = now;

                dispatch(fetchUnreadCount());
                setTimeout(() => { refreshing.current = false; }, 1000);
            }
            appState.current = nextAppState;
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription?.remove();
            setupDone.current = false;
        };
    }, []);

    const refreshNotifications = useCallback(() => {
        const now = Date.now();

        if (refreshing.current || (now - lastRefreshTime.current < 5000)) {
            console.log('🚫 Refresh skipped - too frequent or already refreshing');
            return;
        }

        if (user?.role !== 'CLIENT') {
            return;
        }

        refreshing.current = true;
        lastRefreshTime.current = now;

        console.log('🔄 Manual refresh notifications');
        dispatch(fetchUnreadCount());
        dispatch(fetchNotifications({
            page: 1,
            refresh: true,
            includeData: true // ВАЖНО: Включаем связанные данные
        }));

        setTimeout(() => { refreshing.current = false; }, 1000);
    }, [dispatch, user?.id, user?.role]);

    const setupNavigationHandlers = useCallback(() => {
        if (navigationHandlersSet.current || !navigation) {
            return;
        }

        console.log('🧭 Setting up navigation handlers');
        navigationHandlersSet.current = true;

        // Улучшенная функция навигации к остановкам
        PushNotificationService.navigateToStops = async (data) => {
            console.log('🧭 navigateToStops called with:', data);

            if (!navigation) {
                console.warn('❌ Navigation object not available, delaying navigation');
                // Добавляем в очередь ожидания с задержкой
                setTimeout(() => {
                    if (navigation) {
                        PushNotificationService.navigateToStops(data);
                    } else {
                        console.error('❌ Navigation still not available after delay');
                    }
                }, 2000);
                return;
            }

            if (!data?.stopId) {
                console.warn('❌ No stopId in notification data');
                navigation.navigate('Main', {
                    screen: 'MainTab',
                    params: {
                        screen: 'StopsListScreen'
                    }
                });
                return;
            }

            try {
                const stopId = parseInt(data.stopId);
                console.log('🚛 Navigating to stop with ID:', stopId);

                // Загружаем данные остановок если они не загружены
                if (!stops || stops.length === 0) {
                    console.log('📥 Loading stops data before navigation');
                    await dispatch(fetchAllStops()).unwrap();
                }

                // Используем более надежную навигацию с задержкой
                setTimeout(() => {
                    try {
                        navigation.navigate('StopDetails', {
                            stopId: stopId,
                            fromNotification: true,
                            timestamp: Date.now() // Добавляем timestamp для принудительного обновления
                        });
                        console.log('✅ Successfully navigated to StopDetails');
                    } catch (navError) {
                        console.error('❌ Error in direct navigation:', navError);

                        // Fallback навигация через Main
                        navigation.navigate('Main', {
                            screen: 'MainTab',
                            params: {
                                screen: 'StopDetails',
                                params: {
                                    stopId: stopId,
                                    fromNotification: true,
                                    fallback: true
                                }
                            }
                        });
                    }
                }, 500);

            } catch (error) {
                console.error('❌ Error in navigateToStops:', error);

                // Fallback: навигация к списку остановок
                navigation.navigate('Main', {
                    screen: 'MainTab',
                    params: {
                        screen: 'StopsListScreen'
                    }
                });
            }
        };

        PushNotificationService.navigateToOrder = (data) => {
            console.log('🧭 navigateToOrder called with:', data);
            if (navigation && data?.orderId) {
                try {
                    navigation.navigate('OrderDetails', {
                        orderId: data.orderId,
                        fromNotification: true
                    });
                } catch (error) {
                    console.error('❌ Error navigating to order:', error);
                }
            }
        };

        // Важно: сообщаем сервису, что навигация готова
        setTimeout(() => {
            PushNotificationService.setNavigationReady();
            console.log('🧭 Navigation handlers setup complete and marked as ready');
        }, 100);

    }, [navigation, dispatch, stops]);

    const initializePushNotifications = useCallback(async () => {
        if (initializationAttempted.current) {
            return true;
        }

        if (user?.role === 'CLIENT') {
            try {
                const success = await PushNotificationService.initializeForUser(user);
                if (success) {
                    setupNavigationHandlers();
                }
                return success;
            } catch (error) {
                console.error('Error in initialization:', error);
                return false;
            }
        }

        return false;
    }, [user?.id, setupNavigationHandlers]);

    // ОБНОВЛЕННЫЕ функции создания уведомлений с навигационными данными
    const showStopNotification = useCallback((stopData) => {
        if (user?.role === 'CLIENT') {
            const stopId = typeof stopData.id === 'string' ? parseInt(stopData.id) : stopData.id;

            console.log('🚛 Creating stop notification for stopId:', stopId);

            PushNotificationService.showStopNotification({
                ...stopData,
                id: stopId
            })
                .then(() => {
                    console.log('✅ Stop notification sent successfully');
                })
                .catch((error) => {
                    console.error('❌ Error sending stop notification:', error);
                });

            // ИСПРАВЛЕНО: Добавляем полные навигационные данные
            dispatch(addNotification({
                id: Date.now(),
                title: `🚛 Остановка в районе ${stopData.district?.name}`,
                content: `Новая остановка по адресу: ${stopData.address}`,
                type: 'SYSTEM',
                isRead: false,
                createdAt: new Date().toISOString(),
                // ВАЖНО: Добавляем stopId для навигации
                stopId: stopId,
                // Дополнительные данные для навигации
                data: {
                    type: 'STOP_NOTIFICATION',
                    stopId: stopId,
                    districtId: stopData.districtId,
                    url: `iceberg://stop/${stopId}`,
                    address: stopData.address,
                    startTime: stopData.startTime?.toISOString(),
                    endTime: stopData.endTime?.toISOString()
                }
            }));

            dispatch(fetchUnreadCount());
        }
    }, [dispatch, user?.role]);

    const showStopUpdateNotification = useCallback((stopData, changes) => {
        const userDistrictId = user?.client?.districtId || user?.districtId;

        if (user?.role === 'CLIENT' && userDistrictId === stopData.districtId) {
            PushNotificationService.showStopUpdateNotification(stopData, changes);

            // ИСПРАВЛЕНО: Добавляем полные навигационные данные
            dispatch(addNotification({
                id: Date.now(),
                title: `📝 Изменения в остановке (${stopData.district?.name})`,
                content: `Остановка: ${stopData.address}\n${changes.join('\n')}`,
                type: 'SYSTEM',
                isRead: false,
                createdAt: new Date().toISOString(),
                // ВАЖНО: Добавляем stopId для навигации
                stopId: stopData.id,
                // Дополнительные данные для навигации
                data: {
                    type: 'STOP_UPDATE',
                    stopId: stopData.id,
                    districtId: stopData.districtId,
                    url: `iceberg://stop/${stopData.id}`,
                    changes: changes,
                    address: stopData.address
                }
            }));

            dispatch(fetchUnreadCount());
        }
    }, [dispatch, user]);

    const showStopCancelNotification = useCallback((stopData) => {
        const userDistrictId = user?.client?.districtId || user?.districtId;

        if (user?.role === 'CLIENT' && userDistrictId === stopData.districtId) {
            PushNotificationService.showStopCancelNotification(stopData);

            // ИСПРАВЛЕНО: Добавляем полные навигационные данные
            dispatch(addNotification({
                id: Date.now(),
                title: `❌ Остановка отменена (${stopData.district?.name})`,
                content: `Остановка по адресу ${stopData.address} была отменена`,
                type: 'SYSTEM',
                isRead: false,
                createdAt: new Date().toISOString(),
                // ВАЖНО: Добавляем stopId для навигации
                stopId: stopData.id,
                // Дополнительные данные для навигации
                data: {
                    type: 'STOP_CANCEL',
                    stopId: stopData.id,
                    districtId: stopData.districtId,
                    url: `iceberg://stop/${stopData.id}`,
                    address: stopData.address,
                    cancelled: true,
                    cancelledAt: new Date().toISOString()
                }
            }));

            dispatch(fetchUnreadCount());
        }
    }, [dispatch, user]);

    const showProductNotification = useCallback((productData) => {
        if (user?.role === 'CLIENT') {
            PushNotificationService.showLocalNotification({
                title: `🆕 Новый товар: ${productData.name}`,
                body: `Цена: ${productData.price} ₽`,
                channelId: 'default',
                data: {
                    type: 'PRODUCT_NOTIFICATION',
                    productId: productData.id,
                    url: `iceberg://product/${productData.id}`
                }
            });

            // ОБНОВЛЕНО: Добавляем навигационные данные для продукта
            dispatch(addNotification({
                id: Date.now(),
                title: `🆕 Новый товар: ${productData.name}`,
                content: `Цена: ${productData.price} ₽${productData.description ? '\n' + productData.description : ''}`,
                type: 'PROMOTION',
                isRead: false,
                createdAt: new Date().toISOString(),
                // НОВОЕ: Добавляем productId
                productId: productData.id,
                // НОВОЕ: Добавляем данные продукта
                data: {
                    type: 'PRODUCT_NOTIFICATION',
                    productId: productData.id,
                    url: `iceberg://product/${productData.id}`,
                    name: productData.name,
                    price: productData.price,
                    images: productData.images
                }
            }));

            dispatch(fetchUnreadCount());
        }
    }, [dispatch, user?.role]);

    // НОВЫЕ функции для работы с обновленными возможностями

    /**
     * Получить уведомления об остановке
     */
    const getStopNotifications = useCallback(async (stopId) => {
        try {
            const result = await dispatch(fetchStopNotifications(stopId)).unwrap();
            console.log('✅ Stop notifications loaded:', result);
            return result;
        } catch (error) {
            console.error('❌ Error loading stop notifications:', error);
            throw error;
        }
    }, [dispatch]);

    /**
     * Получить уведомления о заказе
     */
    const getOrderNotifications = useCallback(async (orderId) => {
        try {
            const result = await dispatch(fetchOrderNotifications(orderId)).unwrap();
            console.log('✅ Order notifications loaded:', result);
            return result;
        } catch (error) {
            console.error('❌ Error loading order notifications:', error);
            throw error;
        }
    }, [dispatch]);

    /**
     * Массовые операции с уведомлениями
     */
    const performBulkNotificationOperation = useCallback(async (notificationIds, action) => {
        try {
            console.log('🔄 Performing bulk operation:', { notificationIds, action });
            const result = await dispatch(performBulkOperation({ notificationIds, action })).unwrap();
            console.log('✅ Bulk operation completed:', result);
            return result;
        } catch (error) {
            console.error('❌ Error in bulk operation:', error);
            throw error;
        }
    }, [dispatch]);

    /**
     * Обновить навигационные данные уведомления
     */
    const updateNotificationNavigationData = useCallback((notificationId, data) => {
        dispatch(updateNotificationData({ notificationId, data }));
    }, [dispatch]);

    const updateBadgeCount = useCallback((count) => {
        PushNotificationService.setBadgeCount(count);
    }, []);

    const clearBadge = useCallback(() => {
        PushNotificationService.setBadgeCount(0);
    }, []);

    const clearAllNotifications = useCallback(() => {
        PushNotificationService.clearAllNotifications();
        clearBadge();
    }, [clearBadge]);

    const checkTokenStatus = useCallback(async () => {
        const serviceStatus = PushNotificationService.getStatus();
        const deviceToken = await PushNotificationService.getDeviceToken();

        return {
            service: serviceStatus,
            hasDeviceToken: !!deviceToken,
            deviceToken,
            isInitialized: serviceStatus.isInitialized,
            userRole: user?.role,
            navigationReady: serviceStatus.navigationReady,
            pendingNavigationsCount: serviceStatus.pendingNavigationsCount
        };
    }, [user?.role]);

    const forceTokenRefresh = useCallback(async () => {
        if (user?.role === 'CLIENT') {
            try {
                await PushNotificationService.refreshTokenOnServer();
                return true;
            } catch (error) {
                console.error('Token refresh failed:', error);
                return false;
            }
        }
        return false;
    }, [user?.role]);

    return {
        // Существующие методы
        initializePushNotifications,
        refreshNotifications,
        showStopNotification,
        showStopUpdateNotification,
        showStopCancelNotification,
        showProductNotification,
        updateBadgeCount,
        clearBadge,
        clearAllNotifications,
        checkTokenStatus,
        forceTokenRefresh,

        // НОВЫЕ методы
        getStopNotifications,
        getOrderNotifications,
        performBulkNotificationOperation,
        updateNotificationNavigationData
    };
};

export const useBadgeSync = () => {
    const unreadCount = useSelector(state => state.notification?.unreadCount || 0);
    const user = useSelector(selectUser);
    const lastBadgeUpdate = useRef(0);

    useEffect(() => {
        const now = Date.now();
        if (now - lastBadgeUpdate.current < 1000) {
            return;
        }

        if (user?.role === 'CLIENT' && Platform.OS === 'ios') {
            PushNotificationService.setBadgeCount(unreadCount);
            lastBadgeUpdate.current = now;
        }
    }, [unreadCount, user?.role]);
};

export default useNotifications;