import React, { useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '@entities/notification';
import PushNotificationService from '@shared/services/PushNotificationService';
import { AppContainer } from '@app/providers/AppContainer/AppContainer';
import {
    createNavigationFunctions,
    setNavigationHandlers,
} from './navigationServices';

export const NavigationWrapper = ({ children }) => {
    const navigation = useNavigation();
    useNotifications(navigation);

    useEffect(() => {
        const { navigateToStops, navigateToOrder, navigateToChat, navigateToUrl } =
            createNavigationFunctions(navigation);

        if (PushNotificationService?.setNavigationFunctions) {
            PushNotificationService.setNavigationFunctions(
                navigateToStops,
                navigateToOrder,
                navigateToChat,
                navigateToUrl
            );
        }
        setNavigationHandlers({ navigateToStops, navigateToOrder, navigateToChat, navigateToUrl });

        return () => setNavigationHandlers({});
    }, [navigation]);

    const handleNavigateToAuth = useCallback((mode) => {
        try {
            navigation.navigate('Auth', { initialScreen: mode });
        } catch (error) {
            console.error('Navigation error:', error);
        }
    }, [navigation]);

    return (
        <AppContainer onNavigateToAuth={handleNavigateToAuth}>
            {children}
        </AppContainer>
    );
};
