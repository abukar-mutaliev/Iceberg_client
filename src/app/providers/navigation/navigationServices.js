import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { getBaseUrl } from '@shared/api/api';
import { buildAssistantChatTabParams } from '@features/ai-assistant/lib/assistantNavigation';

let navigationHandlers = {};

export const setNavigationHandlers = (handlers) => {
    navigationHandlers = handlers || {};
};

export const useDeepLinking = () => {
    const processedUrls = useRef(new Set());
    const [initialUrl, setInitialUrl] = useState(null);

    useEffect(() => {
        const handleDeepLink = (url) => {
            const apiBaseUrl = getBaseUrl();

            if (url.startsWith('exp://') ||
                url.includes('expo-dev-client://') ||
                url.startsWith(apiBaseUrl)) {
                return;
            }

            if (processedUrls.current.has(url)) return;

            processedUrls.current.add(url);

            if (processedUrls.current.size > 20) {
                const urls = Array.from(processedUrls.current);
                urls.slice(0, 10).forEach(oldUrl => processedUrls.current.delete(oldUrl));
            }

            const match = url.match(/iceberg:\/\/(\w+)\/(\d+)/);
            if (match) {
                const [, type, id] = match;
                const itemId = parseInt(id);

                setTimeout(() => {
                    switch (type) {
                        case 'stop':
                            navigationHandlers.navigateToStops?.({
                                stopId: itemId,
                                source: 'deep_link',
                                forceRefresh: true,
                                skipDeepLinkCheck: true
                            });
                            break;
                        case 'order':
                            navigationHandlers.navigateToOrder?.({
                                orderId: itemId,
                                source: 'deep_link',
                                forceRefresh: true
                            });
                            break;
                        case 'chat':
                            navigationHandlers.navigateToChat?.({
                                roomId: itemId,
                                source: 'deep_link',
                                fromNotification: true
                            });
                            break;
                        default:
                            console.warn('Unknown deep link type:', type);
                    }
                }, 300);
            }
        };

        Linking.getInitialURL().then((url) => {
            if (url) {
                setInitialUrl(url);
                setTimeout(() => handleDeepLink(url), 1500);
            }
        });

        const subscription = Linking.addEventListener('url', (event) => {
            handleDeepLink(event.url);
        });

        return () => subscription?.remove();
    }, []);

    return initialUrl;
};

export const createNavigationFunctions = (navigation) => {
    const isAssistantChatNavigation = (data) => {
        const roomType = String(data?.roomType || data?.room_type || '').toUpperCase();
        return roomType === 'ASSISTANT';
    };

    const buildAssistantChatParams = (roomId, data = {}) => ({
        roomId,
        fromNotification: Boolean(data.fromNotification),
        fromScreen: data.fromScreen || (data.fromNotification ? 'Notification' : 'DeepLink'),
        messageId: data.messageId ? parseInt(String(data.messageId), 10) : null,
    });

    const buildChatRoomParams = (roomId, data = {}) => ({
        roomId,
        fromNotification: Boolean(data.fromNotification),
        messageId: data.messageId ? parseInt(String(data.messageId), 10) : null,
        autoFocusInput: data.autoFocusInput || false,
    });

    const dispatchChatNavigation = (roomId, data = {}) => {
        const { CommonActions } = require('@react-navigation/native');

        if (isAssistantChatNavigation(data)) {
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{
                        name: 'Main',
                        params: {
                            screen: 'ChatList',
                            params: buildAssistantChatTabParams(buildAssistantChatParams(roomId, data)),
                        },
                    }],
                })
            );
            return;
        }

        navigation.dispatch(
            CommonActions.reset({
                index: 1,
                routes: [
                    { name: 'Main' },
                    {
                        name: 'ChatRoom',
                        params: buildChatRoomParams(roomId, data),
                    },
                ],
            })
        );
    };

    const navigateToStops = (params = {}) => {
        try {
            if (!params.stopId) {
                navigation.navigate('StopsListScreen', params);
                return;
            }

            const stopId = parseInt(params.stopId);
            const { InteractionManager } = require('react-native');
            const { CommonActions } = require('@react-navigation/native');

            const performNavigation = () => {
                try {
                    navigation.dispatch(
                        CommonActions.reset({
                            index: 1,
                            routes: [
                                { name: 'Main' },
                                {
                                    name: 'StopDetails',
                                    params: {
                                        stopId,
                                        fromNotification: true,
                                        ...params
                                    }
                                }
                            ]
                        })
                    );
                } catch (error) {
                    console.error('Navigation error to stop (reset):', error);
                    try {
                        navigation.navigate('StopDetails', {
                            stopId,
                            fromNotification: true,
                            ...params
                        });
                    } catch (fallbackError) {
                        console.error('Fallback navigation to stop failed:', fallbackError);
                    }
                }
            };

            setTimeout(() => {
                requestAnimationFrame(() => {
                    InteractionManager.runAfterInteractions(() => {
                        if (!navigation || typeof navigation.dispatch !== 'function') {
                            setTimeout(() => {
                                if (navigation && typeof navigation.dispatch === 'function') {
                                    performNavigation();
                                }
                            }, 500);
                            return;
                        }
                        performNavigation();
                    });
                });
            }, 1500);
        } catch (error) {
            console.error('Navigation error to stops:', error);
            try {
                navigation.navigate('Main', {
                    screen: 'MainTab',
                    params: { screen: 'StopsListScreen' }
                });
            } catch (fallbackError) {
                console.error('Fallback navigation failed:', fallbackError);
            }
        }
    };

    const navigateToOrder = (params = {}) => {
        try {
            if (!params.orderId) {
                navigation.navigate('Cart', { screen: 'MyOrders', params });
                return;
            }

            const orderId = parseInt(params.orderId);
            const userRole = navigation.getState()?.routes
                ?.find(route => route.name === 'Main')?.state?.routes
                ?.find(route => route.name === 'ProfileTab')?.params?.userRole || 'CLIENT';

            const isEmployee = userRole === 'EMPLOYEE' || userRole === 'ADMIN';

            if (isEmployee) {
                try {
                    navigation.navigate('Admin', {
                        screen: 'StaffOrderDetails',
                        params: { orderId, fromNotification: true, ...params }
                    });
                } catch (error) {
                    console.warn('StaffOrderDetails navigation failed, trying OrderDetails:', error.message);
                    navigation.navigate('Cart', {
                        screen: 'OrderDetails',
                        params: { orderId, fromNotification: true, ...params }
                    });
                }
            } else {
                navigation.navigate('Cart', {
                    screen: 'OrderDetails',
                    params: { orderId, fromNotification: true, ...params }
                });
            }
        } catch (error) {
            console.error('General navigation error to order:', error);
        }
    };

    const navigateToChat = (data) => {
        try {
            if (!data.roomId) {
                if (__DEV__) {
                    console.warn('[AppNavigator] ⚠️ No roomId provided for chat navigation', data);
                }
                return;
            }

            const roomId = parseInt(data.roomId || data.room_id, 10);
            if (__DEV__) {
                console.log('[AppNavigator] 🔄 navigateToChat вызван', {
                    roomId,
                    roomType: data.roomType || data.room_type || null,
                    autoFocusInput: data.autoFocusInput,
                    messageId: data.messageId
                });
            }

            const { InteractionManager } = require('react-native');

            setTimeout(() => {
                requestAnimationFrame(() => {
                    InteractionManager.runAfterInteractions(() => {
                        try {
                            if (!navigation || typeof navigation.navigate !== 'function') {
                                if (__DEV__) {
                                    console.warn('[AppNavigator] ⚠️ Navigation недоступна, откладываем навигацию');
                                }
                                setTimeout(() => {
                                    if (navigation && typeof navigation.navigate === 'function') {
                                        dispatchChatNavigation(roomId, {
                                            ...data,
                                            fromNotification: data.fromNotification ?? true,
                                        });
                                        if (__DEV__) {
                                            console.log('[AppNavigator] ✅ Навигация к чату выполнена (повторная попытка, reset)', { roomId });
                                        }
                                    }
                                }, 500);
                                return;
                            }

                            dispatchChatNavigation(roomId, {
                                ...data,
                                fromNotification: data.fromNotification ?? Boolean(
                                    data.source === 'deep_link' || data.messageId
                                ),
                            });

                            if (__DEV__) {
                                console.log('[AppNavigator] ✅ Навигация к чату выполнена (reset stack)', { roomId });
                            }
                        } catch (error) {
                            if (__DEV__) {
                                console.error('[AppNavigator] ❌ Navigation error to chat:', error?.message, error?.stack);
                            }
                        }
                    });
                });
            }, 2000);
        } catch (error) {
            if (__DEV__) {
                console.error('[AppNavigator] ❌ Navigation error to chat:', error?.message, error?.stack);
            }
        }
    };

    const navigateToUrl = (url) => {
        try {
            if (!url.startsWith('iceberg://')) return;

            const path = url.replace('iceberg://', '');
            const [screen, id] = path.split('/');

            if (screen === 'chat' && id) {
                navigateToChat({ roomId: id });
            } else if (screen === 'stop' && id) {
                navigateToStops({ stopId: id });
            } else if (screen === 'order' && id) {
                navigateToOrder({ orderId: id });
            }
        } catch (error) {
            console.error('Navigation error for URL:', error);
        }
    };

    return { navigateToStops, navigateToOrder, navigateToChat, navigateToUrl };
};
