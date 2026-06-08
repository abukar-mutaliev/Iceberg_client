import { CommonActions } from '@react-navigation/native';

/**
 * PaymentScreen живёт в корневом AppStack, а корзина — во вложенном табе:
 * Main → Cart (Tab) → CartMain (Stack).
 * Прямой navigate('Cart') из PaymentScreen не работает.
 */
export const exitPaymentToCart = (navigation, params = {}) => {
    const cartParams = {
        forceRefresh: true,
        timestamp: Date.now(),
        ...params
    };

    navigation.dispatch(
        CommonActions.reset({
            index: 0,
            routes: [
                {
                    name: 'Main',
                    params: {
                        screen: 'Cart',
                        params: {
                            screen: 'CartMain',
                            params: cartParams
                        }
                    }
                }
            ]
        })
    );
};

export const exitPaymentToMyOrders = (navigation, params = {}) => {
    navigation.navigate('Main', {
        screen: 'Cart',
        params: {
            screen: 'MyOrders',
            params: {
                refresh: true,
                timestamp: Date.now(),
                ...params
            }
        }
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

    if (navigation.canGoBack()) {
        navigation.goBack();
        return;
    }

    resetCartStack();
    exitPaymentToMain(navigation);
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
