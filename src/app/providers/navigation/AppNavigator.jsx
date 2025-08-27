import React, {useEffect, useRef, useState} from "react";
import {StatusBar, Animated, Platform, Linking, View, Text, TouchableOpacity, Image} from 'react-native';
import {NavigationContainer} from "@react-navigation/native";
import {createStackNavigator} from "@react-navigation/stack";
import {createBottomTabNavigator} from "@react-navigation/bottom-tabs";
import {useDispatch, useSelector} from "react-redux";
import {useNavigation} from '@react-navigation/native';
import {useNotifications} from "@entities/notification";
import PushNotificationService from '@shared/services/PushNotificationService';
import {navigationRef} from '@shared/utils/NavigationRef';
import {ChatHeader, ChatListHeader} from '@entities/chat';


import {SplashScreen} from "@/features/splash";
import {WelcomeScreen} from "@/screens/welcome";
import {AuthScreen} from "@/screens/auth/ui/AuthScreen";
import {MainScreen} from "@screens/main/ui/MainScreen";
import {ProfileScreen} from "@/screens/profile";
import {ProfileEdit} from "@features/profile/ui/ProfileEdit";
import {ChangePasswordScreen, SettingsScreen} from "@features/profile";
import {ProductListScreen} from "@screens/product/ProductListScreen/ProductListScreen";
import {ProductDetailScreen} from "@screens/product/ProductDetailScreen";
import {ProductManagementScreen} from "@screens/product/ProductManagementScreen";
import {CatalogScreen} from "@screens/catalog";
import {SearchScreen} from "@screens/search";
import {SearchResultsScreen} from "@screens/search/ui/SearchResultsScreen";
import {CategorySelectScreen, FilterScreen} from "@screens/filter/FilterScreen";
import {FavouritesScreen} from "@screens/favourites";
import {CategoriesScreen, ProductsByCategoryScreen} from "@/screens/categories/ui";
import {CategoriesManagementScreen} from "@screens/categories/ui/CategoriesManagementScreen";
import {StopsListScreen} from "src/screens/stop/ui/StopsListScreen";
import {AddStopScreen} from "src/screens/stop/ui/AddStopScreen";
import {StopDetailsScreen} from "src/screens/stop/ui/StopDetailsScreen";
import {EditStopScreen} from "src/screens/stop/ui/EditStopScreen";
import {MapScreen} from "@screens/map/MapScreen";
import {SupplierScreen} from "@screens/supplier";
import {UserPublicProfileScreen} from "@screens/user/ui/UserPublicProfileScreen";
import {AdminPanelScreen} from "@screens/admin/ui/AdminPanelScreen";
import {AdminProductDetailScreen} from "@screens/admin/ui/AdminProductDetailScreen/ui/AdminProductDetailScreen";
import {EmployeeManagementScreen} from "@screens/admin/ui/EmployeeManagementScreen";
import OrderNotificationTestScreen from "@screens/admin/OrderNotificationTestScreen";
import {UsersManagementScreen} from "@screens/user/ui/UsersManagementScreen";
import {UserAddScreen} from "@screens/user/ui/UserAddScreen";
import {DistrictsManagementScreen} from "@screens/district";

import {linkingConfig} from '@shared/config/linkingConfig';
import {DeepLinkHandler} from '@shared/ui/DeepLinkHandler';
import {AppContainer} from "@app/providers/AppContainer/AppContainer";
import {AddProductModal} from "@widgets/product/AddProductModal";

import {
    slideFromRight,
    fadeIn,
    modalSlideFromBottom,
    slideFromBottom,
    cardStackTransition,
    defaultScreenOptions,
    fullScreenModal
} from '@app/providers/navigation/transitionConfigs';

import {fetchFavorites, removeFromFavorites} from "@entities/favorites";
import {fetchProducts} from "@entities/product";
import {useAuth} from "@entities/auth/hooks/useAuth";
import {CartScreen} from "@screens/cart/ui/CartScreen";
import {CustomTabBar} from "@widgets/navigation";
import {NotificationsScreen} from "@screens/notifications";
import {getBaseUrl} from "@shared/api/api";
import {featureFlags} from "@shared/config/featureFlags";
import {ChatListScreen} from "@/screens/chat/ui/ChatListScreen";
import {ChatRoomScreen} from "@/screens/chat/ui/ChatRoomScreen";
import {ChatSearchScreen} from "@/screens/chat/ui/ChatSearchScreen";
import {CreateGroupScreen} from "@/screens/chat/ui/CreateGroupScreen";
import {GroupInfoScreen} from "@/screens/chat/ui/GroupInfoScreen";
import {AddGroupMembersScreen} from "@/screens/chat/ui/AddGroupMembersScreen";
import {EditGroupScreen} from "@/screens/chat/ui/EditGroupScreen";

import {MyOrdersScreen} from "@screens/ordes/ui/MyOrdersScreen";
import {OrderDetailsScreen} from "@screens/ordes/ui/OrderDetailsScreen";
import {StaffOrdersScreen} from "@screens/ordes/ui/StaffOrdersScreen";

import {CheckoutScreen} from "@screens/cart/ui/CheckoutScreen/ui/CheckoutScreen";
import {GuestCheckoutScreen} from "@screens/cart/ui/GuestCheckoutScreen/ui/GuestCheckoutScreen";
import {JoinTeamScreen} from "@screens/profile/ui/JoinTeamScreen";

import {EmployeeRewardsScreen} from "@screens/rewards/ui/EmployeeRewardsScreen/EmployeeRewardsScreen";
import RewardSettingsScreen from "@screens/admin/ui/RewardSettingsScreen";
import {PushNotificationTestScreen} from '@screens/test/ui/PushNotificationTestScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const MainStack = createStackNavigator();
const SearchStack = createStackNavigator();

const CartStack = createStackNavigator();
const ChatStack = createStackNavigator();

const ProfileStack = createStackNavigator();
const AdminStack = createStackNavigator();

const ProfileTabScreenContent = ({navigation}) => {
    const {isAuthenticated} = useAuth();
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const handleProductPress = (productId) => {
        navigation.navigate('ProductDetail', {
            productId,
            fromScreen: 'ProfileTab'
        });
    };

    return (
        <Animated.View style={{flex: 1, opacity: fadeAnim}}>
            {isAuthenticated ? (
                <ProfileScreen onProductPress={handleProductPress}/>
            ) : (
                <AuthScreen/>
            )}
        </Animated.View>
    );
};

const ProfileStackScreen = () => {
    return (
        <ProfileStack.Navigator
            id="ProfileStack"
            screenOptions={{
                ...defaultScreenOptions,
                cardOverlayEnabled: true,
                detachPreviousScreen: false,
            }}
        >
            <ProfileStack.Screen
                name="ProfileMain"
                component={ProfileTabScreenContent}
                options={{
                    ...fadeIn,
                    cardOverlayEnabled: false,
                }}
            />

            <ProfileStack.Screen
                name="ProfileEdit"
                component={ProfileEdit}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <ProfileStack.Screen
                name="ChangePassword"
                component={ChangePasswordScreen}
                options={{
                    ...slideFromRight,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <ProfileStack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <ProfileStack.Screen
                name="JoinTeam"
                component={JoinTeamScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <ProfileStack.Screen
                name="ProductList"
                component={ProductListScreen}
                options={{
                    ...slideFromRight,
                    headerShown: true,
                    title: 'Мои продукты',
                    headerTitleStyle: {
                        fontWeight: '600',
                    },
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <ProfileStack.Screen
                name="SupplierScreen"
                component={SupplierScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />

            <ProfileStack.Screen
                name="Categories"
                component={CategoriesScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />

            <ProfileStack.Screen
                name="ProductsByCategory"
                component={ProductsByCategoryScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />


            <ProfileStack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{
                    ...cardStackTransition,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                            },
                            android: {
                                elevation: 8,
                            },
                        }),
                    },
                    unmountOnBlur: false,
                }}
            />

            <ProfileStack.Screen
                name="Favourites"
                component={FavouritesScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
        </ProfileStack.Navigator>
    );
};

const CartStackScreen = () => {
    return (
        <CartStack.Navigator
            id="CartStack"
            screenOptions={{
                ...defaultScreenOptions,
                cardOverlayEnabled: true,
                detachPreviousScreen: false,
            }}
        >
            <CartStack.Screen
                name="CartMain"
                component={CartScreen}
                options={{
                    ...fadeIn,
                    cardOverlayEnabled: false,
                }}
            />

            <CartStack.Screen
                name="MyOrders"
                component={MyOrdersScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <CartStack.Screen
                name="OrderDetails"
                component={OrderDetailsScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <CartStack.Screen
                name="StaffOrders"
                component={StaffOrdersScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />

            <CartStack.Screen
                name="SupplierScreen"
                component={SupplierScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <CartStack.Screen
                name="Categories"
                component={CategoriesScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <CartStack.Screen
                name="ProductsByCategory"
                component={ProductsByCategoryScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <CartStack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{
                    ...cardStackTransition,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                            },
                            android: {
                                elevation: 8,
                            },
                        }),
                    },
                    unmountOnBlur: false,
                }}
            />
        </CartStack.Navigator>
    );
};

const useMemoryOptimization = () => {
    useEffect(() => {
        return () => {
            if (global.gc) {
                global.gc();
            }
        };
    }, []);
};

const NavigationWrapper = ({children}) => {
    const navigation = useNavigation();
    const notifications = useNotifications(navigation);

    useEffect(() => {
        const navigateToStops = (params = {}) => {
            try {
                if (params.stopId) {
                    navigation.navigate('StopDetails', {
                        stopId: parseInt(params.stopId),
                        fromNotification: true,
                        ...params
                    });
                } else {
                    navigation.navigate('StopsListScreen', params);
                }
            } catch (error) {
                console.error('Navigation error to stops:', error);

                try {
                    navigation.navigate('Main', {
                        screen: 'MainTab',
                        params: {
                            screen: 'StopsListScreen'
                        }
                    });
                } catch (fallbackError) {
                    console.error('Fallback navigation failed:', fallbackError);
                }
            }
        };

        const navigateToOrder = (params = {}) => {
            try {
                if (params.orderId) {
                    try {
                        navigation.navigate('StaffOrderDetails', {
                            orderId: parseInt(params.orderId),
                            fromNotification: true,
                            ...params
                        });
                    } catch (error) {
                        try {
                            navigation.navigate('OrderDetails', {
                                orderId: parseInt(params.orderId),
                                fromNotification: true,
                                ...params
                            });
                        } catch (fallbackError) {
                            console.error('Error navigating to order:', fallbackError);
                        }
                    }
                } else {
                    navigation.navigate('Cart', {
                        screen: 'MyOrders',
                        params
                    });
                }
            } catch (error) {
                console.error('Navigation error to order:', error);
            }
        };

        if (PushNotificationService && typeof PushNotificationService.setNavigationFunctions === 'function') {
            PushNotificationService.setNavigationFunctions(navigateToStops, navigateToOrder);
        } else {
            console.warn('PushNotificationService.setNavigationFunctions is not available');
        }
    }, [navigation]);

    const handleNavigateToAuth = (mode) => {
        try {
            navigation.navigate('Auth', {initialScreen: mode});
        } catch (error) {
            console.error('Navigation error:', error);
        }
    };

    return (
        <AppContainer onNavigateToAuth={handleNavigateToAuth}>
            {children}
        </AppContainer>
    );
};

// Основной навигатор приложения
export const AppNavigator = () => {
    useMemoryOptimization();
    const {isAuthenticated} = useSelector((state) => state.auth);
    const dispatch = useDispatch();

    const processedUrls = useRef(new Set());
    const [initialUrl, setInitialUrl] = useState(null);

    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchFavorites())
                .then(favoritesResult => {
                    if (favoritesResult && Array.isArray(favoritesResult.payload)) {
                        dispatch(fetchProducts())
                            .then(productsResult => {
                                if (productsResult && Array.isArray(productsResult.payload)) {
                                    const validProductIds = new Set(productsResult.payload.map(p => Number(p.id)));

                                    favoritesResult.payload.forEach(favorite => {
                                        const favoriteProductId = favorite.product?.id || favorite.productId;

                                        if (favoriteProductId && !validProductIds.has(Number(favoriteProductId))) {
                                            console.warn(`Удаляем несуществующий продукт ${favoriteProductId} из избранного`);
                                            dispatch(removeFromFavorites(favoriteProductId));
                                        }
                                    });
                                }
                            });
                    }
                });
        }
    }, [isAuthenticated, dispatch]);

    useEffect(() => {
        const handleDeepLink = (url) => {
            const apiBaseUrl = getBaseUrl();

            if (url.startsWith('exp://') ||
                url.includes('expo-dev-client://') ||
                url.startsWith(apiBaseUrl) ||
                url.includes('192.168.1.226:5000') ||
                url.includes('212.67.11.134:5000')) {
                return;
            }

            if (processedUrls.current.has(url)) {
                return;
            }

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
                            if (typeof window !== 'undefined' && window.navigateToStops) {
                                window.navigateToStops({
                                    stopId: itemId,
                                    source: 'deep_link',
                                    forceRefresh: true,
                                    skipDeepLinkCheck: true
                                });
                            }
                            break;
                        case 'order':
                            if (typeof window !== 'undefined' && window.navigateToOrder) {
                                window.navigateToOrder({
                                    orderId: itemId,
                                    source: 'deep_link',
                                    forceRefresh: true
                                });
                            }
                            break;
                        default:
                            console.warn('Unknown deep link type:', type);
                    }
                }, 300);
            } else {
                console.warn('Invalid deep link format:', url);
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

        return () => {
            subscription?.remove();
        };
    }, []);

    if (isAuthenticated === undefined) {
        return (
            <NavigationContainer
                ref={navigationRef}
                linking={linkingConfig}
                onReady={() => {
                    PushNotificationService.setNavigationReady();
                }}
            >
                <StatusBar backgroundColor="#ffffff" barStyle="dark-content"/>
                <NavigationWrapper>
                    <Stack.Navigator
                        id="AppStack"
                        screenOptions={defaultScreenOptions}
                        initialRouteName="Splash"
                    >
                        <Stack.Screen
                            name="Splash"
                            component={SplashScreen}
                            options={{
                                ...fadeIn,
                                gestureEnabled: false,
                            }}
                        />
                    </Stack.Navigator>
                </NavigationWrapper>
            </NavigationContainer>
        );
    }

    return (
        <NavigationContainer
            ref={navigationRef}
            linking={linkingConfig}
            onReady={() => {
                PushNotificationService.setNavigationReady();
            }}
        >
            <StatusBar backgroundColor="#ffffff" barStyle="dark-content"/>
            <NavigationWrapper>
                {isAuthenticated && <DeepLinkHandler/>}

                <Stack.Navigator
                    id="AppStack"
                    screenOptions={{
                        ...defaultScreenOptions,
                        cardOverlayEnabled: true,
                        detachPreviousScreen: false,
                    }}
                    initialRouteName="Splash"
                >
                    <Stack.Screen
                        name="Splash"
                        component={SplashScreen}
                        options={{
                            ...fadeIn,
                            gestureEnabled: false,
                        }}
                    />
                    <Stack.Screen
                        name="Welcome"
                        component={WelcomeScreen}
                        options={{
                            ...slideFromRight,
                            cardStyle: {
                                backgroundColor: '#ffffff',
                                ...Platform.select({
                                    ios: {
                                        shadowColor: '#000',
                                        shadowOffset: {width: -3, height: 0},
                                        shadowOpacity: 0.2,
                                        shadowRadius: 5,
                                    },
                                    android: {
                                        elevation: 5,
                                    },
                                }),
                            },
                        }}
                    />
                    <Stack.Screen
                        name="Auth"
                        component={AuthScreen}
                        options={{
                            ...slideFromRight,
                            cardStyle: {
                                backgroundColor: '#ffffff',
                                ...Platform.select({
                                    ios: {
                                        shadowColor: '#000',
                                        shadowOffset: {width: -3, height: 0},
                                        shadowOpacity: 0.2,
                                        shadowRadius: 5,
                                    },
                                    android: {
                                        elevation: 5,
                                    },
                                }),
                            },
                        }}
                    />
                    <Stack.Screen
                        name="Main"
                        component={MainTabNavigator}
                        options={{
                            ...slideFromRight,
                            headerLeft: null,
                            gestureEnabled: false,
                        }}
                    />

                    {/* Общие экраны (доступны независимо от авторизации) */}
                    <Stack.Screen
                        name="MapScreen"
                        component={MapScreen}
                        options={{
                            ...slideFromRight,
                            headerShown: false,
                            cardStyle: {
                                backgroundColor: 'white',
                                ...Platform.select({
                                    ios: {
                                        shadowColor: '#000',
                                        shadowOffset: {width: -3, height: 0},
                                        shadowOpacity: 0.25,
                                        shadowRadius: 6,
                                    },
                                    android: {
                                        elevation: 6,
                                    },
                                }),
                            },
                            animationEnabled: true,
                            gestureEnabled: true,
                        }}
                    />

                    {/* Экраны доступные после авторизации */}
                    {isAuthenticated && (
                        <>
                            <Stack.Screen
                                name="PushNotificationTest"
                                component={PushNotificationTestScreen}
                                options={{
                                    ...slideFromRight,
                                    headerShown: false,
                                    gestureEnabled: true,
                                    cardStyle: {
                                        backgroundColor: '#ffffff',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: '#000',
                                                shadowOffset: {width: -3, height: 0},
                                                shadowOpacity: 0.25,
                                                shadowRadius: 6,
                                            },
                                            android: {
                                                elevation: 6,
                                            },
                                        }),
                                    },
                                }}
                            />
                            <Stack.Screen
                                name="AddProduct"
                                component={AddProductModal}
                                options={{
                                    ...modalSlideFromBottom,
                                    headerShown: false,
                                    cardStyle: {
                                        backgroundColor: 'white',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: '#000',
                                                shadowOffset: {width: 0, height: -8},
                                                shadowOpacity: 0.4,
                                                shadowRadius: 15,
                                            },
                                            android: {
                                                elevation: 12,
                                            },
                                        }),
                                    },
                                    presentation: 'transparentModal',
                                    gestureEnabled: true,
                                }}
                            />
                            <Stack.Screen
                                name="NotificationsScreen"
                                component={NotificationsScreen}
                                options={{
                                    ...slideFromRight,
                                    headerShown: false,
                                    gestureEnabled: true,
                                    cardStyle: {
                                        backgroundColor: '#ffffff',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: '#000',
                                                shadowOffset: {width: -3, height: 0},
                                                shadowOpacity: 0.25,
                                                shadowRadius: 6,
                                            },
                                            android: {
                                                elevation: 6,
                                            },
                                        }),
                                    },
                                }}
                            />
                            <Stack.Screen
                                name="StopsListScreen"
                                component={StopsListScreen}
                                options={{
                                    ...slideFromRight,
                                    headerShown: false,
                                    gestureEnabled: true,
                                    cardStyle: {
                                        backgroundColor: '#ffffff',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: '#000',
                                                shadowOffset: {width: -3, height: 0},
                                                shadowOpacity: 0.25,
                                                shadowRadius: 6,
                                            },
                                            android: {
                                                elevation: 6,
                                            },
                                        }),
                                    },
                                }}
                            />
                            <Stack.Screen
                                name="AddStop"
                                component={AddStopScreen}
                                options={{
                                    ...modalSlideFromBottom,
                                    headerShown: false,
                                    gestureEnabled: true,
                                    cardStyle: {
                                        backgroundColor: 'white',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: '#000',
                                                shadowOffset: {width: 0, height: -8},
                                                shadowOpacity: 0.4,
                                                shadowRadius: 15,
                                            },
                                            android: {
                                                elevation: 12,
                                            },
                                        }),
                                    },
                                }}
                            />
                            <Stack.Screen
                                name="StopDetails"
                                component={StopDetailsScreen}
                                options={{
                                    ...slideFromRight,
                                    headerShown: false,
                                    gestureEnabled: true,
                                    cardStyle: {
                                        backgroundColor: '#ffffff',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: '#000',
                                                shadowOffset: {width: -3, height: 0},
                                                shadowOpacity: 0.25,
                                                shadowRadius: 6,
                                            },
                                            android: {
                                                elevation: 6,
                                            },
                                        }),
                                    },
                                }}
                            />
                            <Stack.Screen
                                name="EditStop"
                                component={EditStopScreen}
                                options={{
                                    ...modalSlideFromBottom,
                                    headerShown: false,
                                    gestureEnabled: true,
                                    cardStyle: {
                                        backgroundColor: 'white',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: '#000',
                                                shadowOffset: {width: 0, height: -8},
                                                shadowOpacity: 0.4,
                                                shadowRadius: 15,
                                            },
                                            android: {
                                                elevation: 12,
                                            },
                                        }),
                                    },
                                }}
                            />
                            <Stack.Screen
                                name="Admin"
                                component={AdminStackScreen}
                                options={{
                                    ...slideFromRight,
                                    headerShown: false,
                                    gestureEnabled: true,
                                    cardStyle: {
                                        backgroundColor: '#ffffff',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: '#000',
                                                shadowOffset: {width: -3, height: 0},
                                                shadowOpacity: 0.25,
                                                shadowRadius: 6,
                                            },
                                            android: {
                                                elevation: 6,
                                            },
                                        }),
                                    },
                                }}
                            />

                            <Stack.Screen
                                name="Checkout"
                                component={CheckoutScreen}
                                options={{
                                    ...slideFromRight,
                                    headerShown: false,
                                    gestureEnabled: true,
                                    cardStyle: {
                                        backgroundColor: '#ffffff',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: '#000',
                                                shadowOffset: {width: -3, height: 0},
                                                shadowOpacity: 0.25,
                                                shadowRadius: 6,
                                            },
                                            android: {
                                                elevation: 6,
                                            },
                                        }),
                                    },
                                }}
                            />
                            <Stack.Screen
                                name="GuestCheckout"
                                component={GuestCheckoutScreen}
                                options={{
                                    ...slideFromRight,
                                    headerShown: false,
                                    gestureEnabled: true,
                                    cardStyle: {
                                        backgroundColor: '#ffffff',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: '#000',
                                                shadowOffset: {width: -3, height: 0},
                                                shadowOpacity: 0.25,
                                                shadowRadius: 6,
                                            },
                                            android: {
                                                elevation: 6,
                                            },
                                        }),
                                    },
                                }}
                            />

                            <Stack.Screen
                                name="EmployeeRewardsTest"
                                component={EmployeeRewardsScreen}
                                options={{
                                    headerShown: false,
                                    gestureEnabled: false,
                                    animationEnabled: false,
                                }}
                            />

                            {featureFlags.chat && (
                                <>
                                    <Stack.Screen
                                        name="ChatList"
                                        component={ChatListScreen}
                                        options={({navigation}) => ({
                                            ...slideFromRight,
                                            headerShown: true,
                                            headerTitle: () => <ChatListHeader navigation={navigation}/>,
                                            title: '',
                                            headerLeft: () => (
                                                <TouchableOpacity
                                                    onPress={() => navigation.goBack()}
                                                    style={{
                                                        marginLeft: 8,
                                                        padding: 8,
                                                    }}
                                                    activeOpacity={0.6}
                                                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                                                >
                                                    <Text style={{
                                                        fontSize: 28,
                                                        color: '#000000',
                                                        fontWeight: '300',
                                                    }}>‹</Text>
                                                </TouchableOpacity>
                                            ),
                                            headerStyle: {
                                                backgroundColor: '#FFFFFF',
                                                height: 56,
                                            },
                                            headerTintColor: '#000000',
                                            gestureEnabled: true,
                                            cardStyle: {backgroundColor: '#ffffff'},
                                        })}
                                    />
                                    <Stack.Screen
                                        name="ChatRoom"
                                        component={ChatRoomScreen}
                                        options={({route, navigation}) => {
                                            const params = route?.params || {};
                                            const roomTitle = params.roomTitle || 'Чат';

                                            return {
                                                ...slideFromRight,
                                                headerShown: true,
                                                title: roomTitle,
                                                headerBackTitle: '',
                                                headerLeft: () => (
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            const fromScreen = params.fromScreen;
                                                            const productId = params.productId || params.productInfo?.id;

                                                            if (fromScreen === 'ChatList') {
                                                                navigation.goBack();
                                                            } else if (productId && fromScreen === 'ProductDetail') {
                                                                navigation.navigate('ProductDetail', {id: productId});
                                                            } else {
                                                                navigation.goBack();
                                                            }
                                                        }}
                                                        style={{
                                                            marginLeft: 16,
                                                            paddingHorizontal: 16,
                                                            paddingVertical: 12,
                                                            minWidth: 48,
                                                            minHeight: 48,
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                        }}
                                                        activeOpacity={0.6}
                                                        hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
                                                    >
                                                        <Text style={{
                                                            fontSize: 32,
                                                            color: '#000000',
                                                            fontWeight: '300',
                                                            lineHeight: 32,
                                                        }}>‹</Text>
                                                    </TouchableOpacity>
                                                ),
                                                gestureEnabled: true,
                                                cardStyle: {backgroundColor: '#ffffff'},
                                                headerStyle: {
                                                    backgroundColor: '#FFFFFF',
                                                    height: 56,
                                                },
                                                headerTintColor: '#000000',
                                                headerBackTitleVisible: false,
                                            };
                                        }}
                                    />
                                    <Stack.Screen
                                        name="ChatSearch"
                                        component={ChatSearchScreen}
                                        options={{
                                            ...slideFromRight,
                                            headerShown: true,
                                            title: 'Поиск чатов',
                                            gestureEnabled: true,
                                            cardStyle: {backgroundColor: '#ffffff'},
                                            headerStyle: {
                                                backgroundColor: '#FFFFFF',
                                                height: 56,
                                            },
                                            headerTintColor: '#000000',
                                        }}
                                    />
                                    <Stack.Screen
                                        name="CreateGroup"
                                        component={CreateGroupScreen}
                                        options={{
                                            ...slideFromRight,
                                            headerShown: false,
                                            gestureEnabled: true,
                                            cardStyle: {backgroundColor: '#FFFFFF'},
                                        }}
                                    />
                                    <Stack.Screen
                                        name="GroupInfo"
                                        component={GroupInfoScreen}
                                        options={{
                                            ...slideFromRight,
                                            headerShown: false,
                                            gestureEnabled: true,
                                            cardStyle: {backgroundColor: '#FFFFFF'},
                                        }}
                                    />

                                    <Stack.Screen
                                        name="AddGroupMembers"
                                        component={AddGroupMembersScreen}
                                        options={{
                                            ...slideFromRight,
                                            headerShown: false,
                                            gestureEnabled: true,
                                            cardStyle: {backgroundColor: '#FFFFFF'},
                                        }}
                                    />
                                    <Stack.Screen
                                        name="EditGroup"
                                        component={EditGroupScreen}
                                        options={{
                                            ...slideFromRight,
                                            headerShown: false,
                                            gestureEnabled: true,
                                            cardStyle: {backgroundColor: '#FFFFFF'},
                                        }}
                                    />
                                </>
                            )}

                        </>
                    )}
                </Stack.Navigator>
            </NavigationWrapper>
        </NavigationContainer>
    );
};

// Стек чатов в стиле WhatsApp
const ChatStackScreen = () => {
    return (
        <ChatStack.Navigator
            id="ChatStack"
            screenOptions={{
                ...defaultScreenOptions,
                cardOverlayEnabled: true,
                detachPreviousScreen: false,
            }}
        >
            <ChatStack.Screen
                name="ChatMain"
                component={ChatListScreen}
                options={({navigation}) => ({
                    ...fadeIn,
                    headerShown: true,
                    title: '',
                    headerStyle: {
                        backgroundColor: '#FFFFFF', // Белый фон
                        elevation: 4,
                        shadowOpacity: 0.1,
                        height: 56, // Стандартная высота заголовка
                    },
                    headerTitle: () => <ChatListHeader navigation={navigation}/>,
                    headerLeft: () => null,
                    headerTintColor: '#000000',
                    cardOverlayEnabled: false,
                })}
            />
            <ChatStack.Screen
                name="ChatRoom"
                component={ChatRoomScreen}
                options={({route, navigation}) => ({
                    ...slideFromRight,
                    headerShown: true,
                    title: '',
                    headerStyle: {
                        backgroundColor: '#FFFFFF',
                        elevation: 2,
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        shadowOffset: {
                            width: 0,
                            height: 1,
                        },
                        borderBottomWidth: 0.5,
                        borderBottomColor: '#E0E0E0',
                    },
                    headerTintColor: '#000000',
                    headerLeft: () => <ChatHeader route={route} navigation={navigation}/>,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ECE5DD',
                    },
                    headerRight: null
                })}
            />
            <ChatStack.Screen
                name="CreateGroup"
                component={CreateGroupScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {backgroundColor: '#FFFFFF'},
                }}
            />
            <ChatStack.Screen
                name="GroupInfo"
                component={GroupInfoScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {backgroundColor: '#FFFFFF'},
                }}
            />
            <ChatStack.Screen
                name="AddGroupMembers"
                component={AddGroupMembersScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {backgroundColor: '#FFFFFF'},
                }}
            />
            <ChatStack.Screen
                name="EditGroup"
                component={EditGroupScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {backgroundColor: '#FFFFFF'},
                }}
            />
            <ChatStack.Screen
                name="UserPublicProfile"
                component={UserPublicProfileScreen}
                options={{
                    ...slideFromRight,
                    headerShown: true,
                    title: 'Профиль пользователя',
                }}
            />
            <ChatStack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{
                    ...cardStackTransition,
                    headerShown: false,
                }}
            />
            <ChatStack.Screen
                name="SupplierScreen"
                component={SupplierScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
        </ChatStack.Navigator>
    );
};

// Административный стек для изоляции админских экранов
const AdminStackScreen = () => {
    return (
        <AdminStack.Navigator
            id="AdminStack"
            screenOptions={{
                ...defaultScreenOptions,
                detachPreviousScreen: true,
                detachInactiveScreens: true,
                keyboardHandlingEnabled: false,
            }}
        >
            <AdminStack.Screen
                name="AdminPanel"
                component={AdminPanelScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    freezeOnBlur: true,
                    detachPreviousScreen: true,
                }}
            />
            <AdminStack.Screen
                name="ProductManagement"
                component={ProductManagementScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <AdminStack.Screen
                name="AdminProductDetail"
                component={AdminProductDetailScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <AdminStack.Screen
                name="CategoriesManagement"
                component={CategoriesManagementScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <AdminStack.Screen
                name="DistrictsManagement"
                component={DistrictsManagementScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <AdminStack.Screen
                name="UsersManagement"
                component={UsersManagementScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <AdminStack.Screen
                name="UserAdd"
                component={UserAddScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <AdminStack.Screen
                name="EmployeeManagement"
                component={EmployeeManagementScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <AdminStack.Screen
                name="StaffOrders"
                component={StaffOrdersScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <AdminStack.Screen
                name="StaffOrderDetails"
                component={OrderDetailsScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <AdminStack.Screen
                name="EmployeeRewards"
                component={EmployeeRewardsScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <AdminStack.Screen
                name="RewardSettings"
                component={RewardSettingsScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <AdminStack.Screen
                name="OrderNotificationTest"
                component={OrderNotificationTestScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
        </AdminStack.Navigator>
    );
};


// Основные вкладки с улучшенными тенями
export const MainTabNavigator = () => {
    return (
        <Tab.Navigator
            id="MainTabs"
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    elevation: 8,
                    shadowOpacity: 0.1,
                    shadowRadius: 6,
                    shadowOffset: {width: 0, height: -2},
                    shadowColor: '#000',
                    ...Platform.select({
                        ios: {
                            shadowColor: '#000',
                        },
                    }),
                },
                lazy: true,
                unmountOnBlur: true,
                freezeOnBlur: true,
            }}
            detachInactiveScreens={true}
            tabBar={props => <CustomTabBar {...props} />}
            backBehavior="initialRoute"
        >
            <Tab.Screen
                name="MainTab"
                component={MainStackScreen}
                options={{
                    tabBarLabel: 'Главная',
                    lazy: false,
                }}
            />
            <Tab.Screen
                name="Search"
                component={SearchStackScreen}
                options={{
                    tabBarLabel: 'Поиск',
                    lazy: true,
                }}
            />

            <Tab.Screen
                name="Cart"
                component={CartStackScreen}
                options={{
                    tabBarLabel: 'Корзина',
                    lazy: true,
                }}
            />

            {featureFlags.chat && (
                <Tab.Screen
                    name="ChatList"
                    component={ChatStackScreen}
                    options={{
                        tabBarLabel: 'Чаты',
                        lazy: true,
                    }}
                />
            )}

            <Tab.Screen
                name="ProfileTab"
                component={ProfileStackScreen}
                options={{
                    tabBarLabel: 'Профиль',
                    lazy: true,
                }}
            />
            <Tab.Screen
                name="Catalog"
                component={CatalogScreen}
                options={{
                    tabBarVisible: false,
                    lazy: true,
                }}
            />
        </Tab.Navigator>
    );
};

// Стек главной вкладки с улучшенными переходами
const MainStackScreen = () => {
    return (
        <MainStack.Navigator
            id="MainStack"
            screenOptions={{
                ...defaultScreenOptions,
                cardOverlayEnabled: true,
                animationEnabled: true,
                gestureEnabled: true,
                detachPreviousScreen: false,
            }}
            detachInactiveScreens={false}
        >
            <MainStack.Screen
                name="Main"
                component={MainScreen}
                options={{
                    ...fadeIn,
                    animationTypeForReplace: 'pop',
                }}
            />
            <MainStack.Screen
                name="NotificationsScreen"
                component={NotificationsScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <MainStack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{
                    ...cardStackTransition,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                            },
                            android: {
                                elevation: 8,
                            },
                        }),
                    },
                    unmountOnBlur: false,
                }}
                initialParams={{fromScreen: 'MainTab'}}
            />
            <MainStack.Screen
                name="SupplierScreen"
                component={SupplierScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <MainStack.Screen
                name="Categories"
                component={CategoriesScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <MainStack.Screen
                name="ProductsByCategory"
                component={ProductsByCategoryScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                    cardOverlayEnabled: true,
                }}
            />

            <MainStack.Screen
                name="EmployeeRewardsTestMain"
                component={EmployeeRewardsScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: false,
                    animationEnabled: false,
                }}
            />

        </MainStack.Navigator>
    );
};

// Стек поиска с улучшенными переходами
const SearchStackScreen = () => {
    return (
        <SearchStack.Navigator
            id="SearchStack"
            screenOptions={{
                ...defaultScreenOptions,
                presentation: 'card',
                animationEnabled: true,
                cardOverlayEnabled: true,
                detachPreviousScreen: false,
                keyboardHandlingEnabled: true,
            }}
        >
            <SearchStack.Screen
                name="SearchMain"
                component={SearchScreen}
                options={{
                    ...fadeIn,
                    cardOverlayEnabled: false,
                    gestureEnabled: false,
                    animationEnabled: true,
                    keyboardHandlingEnabled: true,
                }}
            />
            <SearchStack.Screen
                name="SearchResults"
                component={SearchResultsScreen}
                options={{
                    ...slideFromRight,
                    cardOverlayEnabled: true,
                    gestureEnabled: true,
                    animationEnabled: true,
                    keyboardHandlingEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <SearchStack.Screen
                name="FilterScreen"
                component={FilterScreen}
                options={{
                    ...fullScreenModal,
                    headerShown: false,
                    gestureEnabled: true,
                    presentation: 'transparentModal',
                }}
            />
            <SearchStack.Screen
                name="CategorySelectScreen"
                component={CategorySelectScreen}
                options={{
                    ...slideFromBottom,
                    cardOverlayEnabled: true,
                    gestureEnabled: true,
                    animationEnabled: true,
                    headerShown: false,
                }}
            />

            <SearchStack.Screen
                name="SupplierScreen"
                component={SupplierScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <SearchStack.Screen
                name="Categories"
                component={CategoriesScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <SearchStack.Screen
                name="ProductsByCategory"
                component={ProductsByCategoryScreen}
                options={{
                    ...slideFromRight,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                            },
                            android: {
                                elevation: 6,
                            },
                        }),
                    },
                }}
            />
            <SearchStack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{
                    ...cardStackTransition,
                    headerShown: false,
                    gestureEnabled: true,
                    cardStyle: {
                        backgroundColor: '#ffffff',
                        ...Platform.select({
                            ios: {
                                shadowColor: '#000',
                                shadowOffset: {width: -3, height: 0},
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                            },
                            android: {
                                elevation: 8,
                            },
                        }),
                    },
                    unmountOnBlur: false,
                }}
            />
        </SearchStack.Navigator>
    );
};



