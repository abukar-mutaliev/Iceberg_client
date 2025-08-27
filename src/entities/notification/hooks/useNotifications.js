import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@entities/auth/model/hooks/useAuth';
import pushNotificationService from "@shared/services/PushNotificationService";
import {useStopsNavigation} from "@entities/stop";

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
        if (user && user.role === 'CLIENT' && navigateToStops) {
            console.log('🔔 Initializing push notifications for user:', user.id);

            pushNotificationService.navigateToStops = navigateToStops;

            // Можете добавить функцию навигации к заказам если есть
            // pushNotificationService.navigateToOrder = navigateToOrder;

            pushNotificationService.setNavigationReady();

            pushNotificationService.initializeForUser(user)
                .then(initialized => {
                    if (initialized) {
                        console.log('✅ Push notifications initialized successfully');
                    } else {
                        console.log('❌ Failed to initialize push notifications');
                    }
                })
                .catch(error => {
                    console.error('❌ Error initializing push notifications:', error);
                });
        }
    };

    useEffect(() => {
        if (user && user.role === 'CLIENT' && navigateToStops) {
            initializePushNotifications();
        }

        return () => {
            if (user && user.role === 'CLIENT') {
                console.log('🧹 Cleaning up push notifications');
                pushNotificationService.navigationReady = false;
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