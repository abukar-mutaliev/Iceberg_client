import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';

const getAppRootNavigation = (navigation) => {
    let current = navigation;

    while (current?.getParent?.()) {
        current = current.getParent();
    }

    return current;
};

export const goBackFromOrderDetails = (navigation, { fromScreen, fallbackScreen = 'MyOrders' } = {}) => {
    if (navigation.canGoBack()) {
        navigation.goBack();
        return;
    }

    if (fromScreen === 'OrderSuccess') {
        const rootNav = getAppRootNavigation(navigation);
        const routes = rootNav?.getState?.()?.routes || [];
        const hasOrderSuccess = routes.some((route) => route.name === 'OrderSuccess');

        if (hasOrderSuccess) {
            rootNav.navigate('OrderSuccess');
            return;
        }

        if (rootNav?.canGoBack?.()) {
            rootNav.goBack();
            return;
        }
    }

    navigation.navigate(fallbackScreen);
};

export const useOrderDetailsBack = ({ fallbackScreen = 'MyOrders', onBack } = {}) => {
    const navigation = useNavigation();
    const route = useRoute();
    const fromScreen = route.params?.fromScreen;

    const handleGoBack = useCallback(() => {
        if (onBack) {
            onBack();
            return;
        }

        goBackFromOrderDetails(navigation, { fromScreen, fallbackScreen });
    }, [navigation, fromScreen, fallbackScreen, onBack]);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                handleGoBack();
                return true;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [handleGoBack])
    );

    return handleGoBack;
};

export const navigateToOrderDetailsInCart = (navigation, orderId, params = {}) => {
    if (!orderId) return;

    const state = navigation.getState?.();
    const isInCartStack = state?.routeNames?.includes('OrderDetails');

    if (isInCartStack) {
        navigation.navigate('OrderDetails', { orderId, ...params });
        return;
    }

    navigation.navigate('Main', {
        screen: 'Cart',
        params: {
            screen: 'OrderDetails',
            params: { orderId, ...params },
        },
    });
};
