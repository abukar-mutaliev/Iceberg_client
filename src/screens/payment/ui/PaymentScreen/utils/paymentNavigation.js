import { CommonActions } from '@react-navigation/native';

const getRootNavigation = (navigation) => {
    let current = navigation;
    while (current?.getParent?.()) {
        current = current.getParent();
    }
    return current || navigation;
};

const resetRootToCartStack = (navigation, stackScreen, params = {}) => {
    const root = getRootNavigation(navigation);
    root.dispatch(
        CommonActions.reset({
            index: 0,
            routes: [
                {
                    name: 'Main',
                    params: {
                        screen: 'Cart',
                        params: {
                            screen: stackScreen,
                            params
                        }
                    }
                }
            ]
        })
    );
};

/**
 * PaymentScreen живёт в корневом AppStack, а корзина — во вложенном табе:
 * Main → Cart (Tab) → CartMain (Stack).
 * Прямой navigate('Cart') из PaymentScreen не работает.
 * reset обязателен, иначе «Назад» из Мои заказы возвращает на экран Т-Банка.
 */
export const exitPaymentToCart = (navigation, params = {}) => {
    resetRootToCartStack(navigation, 'CartMain', {
        forceRefresh: true,
        timestamp: Date.now(),
        ...params
    });
};

export const exitPaymentToMyOrders = (navigation, params = {}) => {
    resetRootToCartStack(navigation, 'MyOrders', {
        refresh: true,
        timestamp: Date.now(),
        ...params
    });
};

export const exitPaymentToMain = (navigation, params = {}) => {
    navigation.navigate('Main', {
        screen: 'MainTab',
        params: {
            screen: 'Main',
            params: {
                timestamp: Date.now(),
                ...params,
            },
        },
    });
};

export const exitMyOrdersScreen = (navigation, { fromScreen } = {}) => {
    const resetCartStack = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'CartMain' }],
        });
    };

    if (fromScreen === 'Profile') {
        navigation.getParent()?.navigate('ProfileTab', {
            screen: 'ProfileMain',
        });
        resetCartStack();
        return;
    }

    const state = navigation.getState?.();
    const previousRoute = state?.routes?.[(state.index ?? 0) - 1];

    // canGoBack() смотрит и на родительский AppStack. Если там остался
    // PaymentScreen / Checkout, goBack вернёт на оплату Т-Банка.
    if (previousRoute?.name === 'CartMain') {
        navigation.goBack();
        return;
    }

    resetCartStack();
};

export const navigateToOrderDetails = (navigation, orderId, params = {}) => {
    if (!orderId) return;

    const { fromScreen, ...restParams } = params;
    const orderDetailsParams = { orderId, fromScreen, ...restParams };

    if (fromScreen === 'OrderSuccess') {
        navigation.navigate('Main', {
            screen: 'Cart',
            params: {
                screen: 'OrderDetails',
                params: orderDetailsParams,
            },
        });
        return;
    }

    navigation.dispatch(
        CommonActions.navigate({
            name: 'Main',
            params: {
                screen: 'Cart',
                params: {
                    state: {
                        routes: [
                            { name: 'MyOrders' },
                            { name: 'OrderDetails', params: orderDetailsParams },
                        ],
                        index: 1,
                    },
                },
            },
        })
    );
};

export { goBackFromOrderDetails, navigateToOrderDetailsInCart } from '@screens/ordes/lib/orderDetailsNavigation';
