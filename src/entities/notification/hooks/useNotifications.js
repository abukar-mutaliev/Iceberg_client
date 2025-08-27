import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useStopsNavigation } from '@entities/stop/hooks/useStopsNavigation';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@entities/auth/hooks/useAuth';
import pushNotificationService from "@shared/services/PushNotificationService";

export const useNotifications = () => {
    let navigation = null;
    let navigateToStops = null;
    
    // Безопасно получаем навигацию
    try {
        navigation = useNavigation();
        const stopsNavigation = useStopsNavigation();
        navigateToStops = stopsNavigation.navigateToStops;
    } catch (error) {
        console.warn('Navigation not available in useNotifications:', error.message);
        // Возвращаем заглушки, если навигация недоступна
        return {
            isInitialized: false,
            hasToken: false,
            initializePushNotifications: () => {
                console.warn('Push notifications initialization skipped - no navigation');
            }
        };
    }

    const { user } = useAuth();

    const initializePushNotifications = () => {
        // УБИРАЕМ: Дублирующая инициализация - уже есть в AppContainer
        // if (user && user.role === 'CLIENT' && navigateToStops) {
        //     console.log('🔔 Initializing push notifications for user:', user.id);

        //     pushNotificationService.navigateToStops = navigateToStops;

        //     // Можете добавить функцию навигации к заказам если есть
        //     // pushNotificationService.navigateToOrder = navigateToOrder;

        //     pushNotificationService.setNavigationReady();

        //     pushNotificationService.initializeForUser(user)
        //         .then(initialized => {
        //             if (initialized) {
        //                 console.log('✅ Push notifications initialized successfully');
        //             } else {
        //                 console.log('❌ Failed to initialize push notifications');
        //             }
        //         })
        //         .catch(error => {
        //             console.error('❌ Error initializing push notifications:', error);
        //         });
        // }

        // Только настройка навигационных обработчиков
        if (user && navigateToStops) {
            console.log('🔔 Setting up navigation handlers for push notifications');
            pushNotificationService.navigateToStops = navigateToStops;
            pushNotificationService.setNavigationReady();
        }
    };

    useEffect(() => {
        if (user && navigateToStops) {
            initializePushNotifications();
        }

        return () => {
            if (user) {
                console.log('🧹 Cleaning up push notifications');
                // ИСПРАВЛЕНО: Не сбрасываем navigationReady, так как это мешает работе навигации
                // pushNotificationService.navigationReady = false;
            }
        };
    }, [user, navigateToStops]);

    useEffect(() => {
        if (navigateToStops) {
            window.navigateToStops = navigateToStops;

            return () => {
                delete window.navigateToStops;
            };
        }
    }, [navigateToStops]);

    return {
        isInitialized: pushNotificationService.isInitialized,
        hasToken: !!pushNotificationService.expoPushToken,
        initializePushNotifications
    };
};