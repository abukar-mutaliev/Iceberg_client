// ============================================================================
// ЧАСТЬ 1: Imports и Constants
// ============================================================================
import React, { useEffect, useRef, useState, useCallback } from "react";
import { StatusBar, Platform, Linking, Animated, View, Text, TouchableOpacity, Image } from 'react-native';
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useDispatch, useSelector } from "react-redux";
import { useNavigation } from '@react-navigation/native';

// Hooks & Services
import { useNotifications } from "@entities/notification";
import PushNotificationService from '@shared/services/PushNotificationService';
import { useAuth } from "@entities/auth/hooks/useAuth";
import { navigationRef } from '@shared/utils/NavigationRef';

// Redux Actions
import { fetchFavorites, removeFromFavorites } from "@entities/favorites";
import { fetchProducts } from "@entities/product";

// Components & Screens
import { SplashScreen } from "@/features/splash";
import { WelcomeScreen } from "@/screens/welcome";
import { AuthScreen } from "@/screens/auth/ui/AuthScreen";
import { PrivacyPolicyScreen } from "@/screens/auth/ui/PrivacyPolicyScreen";
import { MainScreen } from "@screens/main/ui/MainScreen";
import { ProfileScreen } from "@/screens/profile";
import { ProfileEdit } from "@features/profile/ui/ProfileEdit";
import { ChangePasswordScreen, SettingsScreen, NotificationSettings } from "@features/profile";
import PushNotificationDiagnostic from "@shared/ui/PushNotificationDiagnostic";
import { ProductListScreen } from "@screens/product/ProductListScreen/ProductListScreen";
import { ProductDetailScreen } from "@screens/product/ProductDetailScreen";
import { ProductManagementScreen } from "@screens/product/ProductManagementScreen";
import { CatalogScreen } from "@screens/catalog";
import { SearchScreen } from "@screens/search";
import { SearchResultsScreen } from "@screens/search/ui/SearchResultsScreen";
import { CategorySelectScreen, FilterScreen } from "@screens/filter/FilterScreen";
import { FavouritesScreen } from "@screens/favourites";
import { CategoriesScreen, ProductsByCategoryScreen } from "@/screens/categories/ui";
import { CategoriesManagementScreen } from "@screens/categories/ui/CategoriesManagementScreen";
import { StopsListScreen } from "src/screens/stop/ui/StopsListScreen";
import { AddStopScreen } from "src/screens/stop/ui/AddStopScreen";
import { StopDetailsScreen } from "src/screens/stop/ui/StopDetailsScreen";
import { EditStopScreen } from "src/screens/stop/ui/EditStopScreen";
import { MapScreen } from "@screens/map/MapScreen";
import { SupplierScreen } from "@screens/supplier";
import { UserPublicProfileScreen } from "@screens/user/ui/UserPublicProfileScreen";
import { AdminPanelScreen } from "@screens/admin/ui/AdminPanelScreen";
import { AdminProductDetailScreen } from "@screens/admin/ui/AdminProductDetailScreen/ui/AdminProductDetailScreen";
import { EmployeeManagementScreen } from "@screens/admin/ui/EmployeeManagementScreen";
import { DriverManagementScreen } from "@screens/admin/ui/DriverManagementScreen";
import { UsersManagementScreen } from "@screens/user/ui/UsersManagementScreen";
import { UserAddScreen } from "@screens/user/ui/UserAddScreen";
import { DistrictsManagementScreen } from "@screens/district";
import { WarehouseStatisticsScreen } from "@screens/warehouse/ui/WarehouseStatisticsScreen";
import { WarehouseSalesScreen } from "@screens/warehouse/ui/WarehouseSalesScreen";
import { WarehouseListScreen } from "@screens/warehouse/ui/WarehouseListScreen";
import { WarehouseSelectionScreen } from "@screens/warehouse/ui/WarehouseSelectionScreen";
import { TurnoverProductsScreen } from "@screens/warehouse/ui/TurnoverProductsScreen";
import { AddProductScreen } from "@screens/product/AddProductScreen";
import { CartScreen } from "@screens/cart/ui/CartScreen";
import { NotificationsScreen } from "@screens/notifications";
import { ChatListScreen } from "@/screens/chat/ui/ChatListScreen";
import { ChatRoomScreen } from "@/screens/chat/ui/ChatRoomScreen";
import { ChatSearchScreen } from "@/screens/chat/ui/ChatSearchScreen";
import { CreateGroupScreen } from "@/screens/chat/ui/CreateGroupScreen";
import { GroupInfoScreen } from "@/screens/chat/ui/GroupInfoScreen";
import { AddGroupMembersScreen } from "@/screens/chat/ui/AddGroupMembersScreen";
import { EditGroupScreen } from "@/screens/chat/ui/EditGroupScreen";
import { ChatHeader, ChatListHeader } from '@entities/chat';
import { MyOrdersScreen } from "@screens/ordes/ui/MyOrdersScreen";
import { OrderDetailsClientScreen } from "@screens/ordes/ui/OrderDetailsClientScreen/ui/OrderDetailsClientScreen";
import { OrderDetailsEmployeeScreen } from "@screens/ordes/ui/OrderDetailsEmployeeScreen/ui/OrderDetailsEmployeeScreen";
import { StaffOrdersScreen } from "@screens/ordes/ui/StaffOrdersScreen";
import StockAlertsScreen from "@screens/stockAlerts/ui/StockAlertsScreen";
import { OrderSuccessScreen } from "@screens/ordes/ui/OrderSuccessScreen";
import { OrderChoicesListScreen } from "@screens/order/ui/OrderChoicesListScreen";
import { CheckoutScreen } from "@screens/cart/ui/CheckoutScreen/ui/CheckoutScreen";
import { GuestCheckoutScreen } from "@screens/cart/ui/GuestCheckoutScreen/ui/GuestCheckoutScreen";
import { PreauthorizationInfoScreen } from "@screens/cart/ui/PreauthorizationInfoScreen/ui/PreauthorizationInfoScreen";
import { OrderChoiceScreen } from "@screens/order/ui/OrderChoiceScreen";
import { PaymentScreen } from "@screens/payment";
import { JoinTeamScreen } from "@screens/profile/ui/JoinTeamScreen";
import { EmployeeRewardsScreen } from "@screens/rewards/ui/EmployeeRewardsScreen/EmployeeRewardsScreen";
import RewardSettingsScreen from "@screens/admin/ui/RewardSettingsScreen";
import {
    StagnantProductsScreen,
    ProductReturnsScreen,
    ProductReturnDetailScreen,
    CreateReturnModal
} from '@screens/product-return';
import { getBaseUrl } from "@shared/api/api";

// Navigation Config
import { linkingConfig } from '@shared/config/linkingConfig';
import { DeepLinkHandler } from '@shared/ui/DeepLinkHandler';
import { AppContainer } from "@app/providers/AppContainer/AppContainer";
import { CustomTabBar, TabBarProvider, useTabBar } from "@widgets/navigation";
import { featureFlags } from "@shared/config/featureFlags";
// InAppNotificationProvider больше не используется - показываем системные уведомления как в WhatsApp
// import { InAppNotificationProvider } from '@shared/ui/InAppNotificationBanner';
import OneSignalService from '@shared/services/OneSignalService';
// import { useOneSignalInAppNotifications } from '@shared/hooks/useOneSignalInAppNotifications';

// Transition Configs
import {
    slideFromRight,
    fadeIn,
    modalSlideFromBottom,
    slideFromBottom,
    cardStackTransition,
    defaultScreenOptions,
    fullScreenModal
} from '@app/providers/navigation/transitionConfigs';

// ============================================================================
// ЧАСТЬ 2: Navigation Stacks
// ============================================================================
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const MainStack = createStackNavigator();
const SearchStack = createStackNavigator();
const CartStack = createStackNavigator();
const ChatStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const AdminStack = createStackNavigator();

// ============================================================================
// ЧАСТЬ 3: Утилиты и хуки
// ============================================================================

// Хук для оптимизации памяти
const useMemoryOptimization = () => {
    useEffect(() => {
        return () => {
            if (global.gc) global.gc();
        };
    }, []);
};

// Хук для обработки Deep Links
const useDeepLinking = () => {
    const processedUrls = useRef(new Set());
    const [initialUrl, setInitialUrl] = useState(null);

    useEffect(() => {
        const handleDeepLink = (url) => {
            const apiBaseUrl = getBaseUrl();
            
            // Пропускаем служебные URL
            if (url.startsWith('exp://') ||
                url.includes('expo-dev-client://') ||
                url.startsWith(apiBaseUrl) ||
                url.includes('192.168.1.226:5000') ||
                url.includes('212.67.11.134:5000')) {
                return;
            }

            // Предотвращаем дублирование
            if (processedUrls.current.has(url)) return;
            
            processedUrls.current.add(url);

            // Очистка старых URL
            if (processedUrls.current.size > 20) {
                const urls = Array.from(processedUrls.current);
                urls.slice(0, 10).forEach(oldUrl => processedUrls.current.delete(oldUrl));
            }

            // Парсинг и навигация
            const match = url.match(/iceberg:\/\/(\w+)\/(\d+)/);
            if (match) {
                const [, type, id] = match;
                const itemId = parseInt(id);

                setTimeout(() => {
                    switch (type) {
                        case 'stop':
                            window.navigateToStops?.({
                                stopId: itemId,
                                source: 'deep_link',
                                forceRefresh: true,
                                skipDeepLinkCheck: true
                            });
                            break;
                        case 'order':
                            window.navigateToOrder?.({
                                orderId: itemId,
                                source: 'deep_link',
                                forceRefresh: true
                            });
                            break;
                        case 'chat':
                            window.navigateToChat?.({
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

        // Обработка начального URL
        Linking.getInitialURL().then((url) => {
            if (url) {
                setInitialUrl(url);
                setTimeout(() => handleDeepLink(url), 1500);
            }
        });

        // Подписка на изменения URL
        const subscription = Linking.addEventListener('url', (event) => {
            handleDeepLink(event.url);
        });

        return () => subscription?.remove();
    }, []);

    return initialUrl;
};

// Хук для очистки избранного
const useFavoritesCleanup = (isAuthenticated) => {
    const dispatch = useDispatch();

    useEffect(() => {
        if (!isAuthenticated) return;

        dispatch(fetchFavorites())
            .then(favoritesResult => {
                if (!favoritesResult || !Array.isArray(favoritesResult.payload)) return;

                dispatch(fetchProducts())
                    .then(productsResult => {
                        if (!productsResult || !Array.isArray(productsResult.payload)) return;

                        const validProductIds = new Set(
                            productsResult.payload.map(p => Number(p.id))
                        );

                        favoritesResult.payload.forEach(favorite => {
                            const favoriteProductId = favorite.product?.id || favorite.productId;

                            if (favoriteProductId && !validProductIds.has(Number(favoriteProductId))) {
                                console.warn(`Удаляем несуществующий продукт ${favoriteProductId} из избранного`);
                                dispatch(removeFromFavorites(favoriteProductId));
                            }
                        });
                    });
            });
    }, [isAuthenticated, dispatch]);
};

// ============================================================================
// ЧАСТЬ 4: Навигационные функции
// ============================================================================

const createNavigationFunctions = (navigation) => {
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
                console.warn('No roomId provided for chat navigation');
                return;
            }
            // ✅ ChatRoom теперь в корневом Stack (AppStack), чтобы таббар физически не мог появляться в комнате.
            navigation.navigate('ChatRoom', {
                roomId: parseInt(data.roomId),
                fromNotification: true,
                messageId: data.messageId || null,
            });
        } catch (error) {
            console.error('Navigation error to chat:', error);
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

// ============================================================================
// ЧАСТЬ 5: Navigation Wrapper
// ============================================================================

// Компонент для инициализации InApp уведомлений - БОЛЬШЕ НЕ ИСПОЛЬЗУЕТСЯ
// Теперь показываем системные уведомления как в WhatsApp
// const InAppNotificationInitializer = ({ children }) => {
//     useOneSignalInAppNotifications();
//     return children;
// };

const NavigationWrapper = ({ children }) => {
    const navigation = useNavigation();
    const notifications = useNotifications(navigation);

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

// ============================================================================
// ЧАСТЬ 6: Screen Options (вынесены в константы)
// ============================================================================

const COMMON_CARD_STYLE = {
    backgroundColor: '#ffffff',
    ...Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: -3, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
        },
        android: {
            elevation: 6,
        },
    }),
};

const createScreenOptions = (options = {}) => ({
    ...slideFromRight,
    headerShown: false,
    gestureEnabled: true,
    cardStyle: COMMON_CARD_STYLE,
    ...options,
});

// ============================================================================
// ЧАСТЬ 7: Stack Navigators (упрощенные)
// ============================================================================

// Специальный компонент авторизации для таб навигатора
const AuthTabScreen = ({ navigation }) => {
    const { isAuthenticated } = useAuth();
    const dispatch = useDispatch();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        dispatch({ type: 'profile/clearProfile' });
        const timer = setTimeout(() => setIsCheckingAuth(false), 100);
        return () => clearTimeout(timer);
    }, [dispatch]);

    useEffect(() => {
        if (!isCheckingAuth && isAuthenticated) {
            console.log('✅ AuthTabScreen: User authenticated successfully in tab');
        }
    }, [isAuthenticated, isCheckingAuth]);

    return <AuthScreen />;
};

const ProfileTabScreenContent = ({ navigation }) => {
    const { isAuthenticated } = useAuth();
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const handleProductPress = useCallback((productId) => {
        navigation.navigate('ProductDetail', {
            productId,
            fromScreen: 'ProfileTab'
        });
    }, [navigation]);

    if (isAuthenticated) {
        return (
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <ProfileScreen onProductPress={handleProductPress} />
            </Animated.View>
        );
    }

    return (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <AuthTabScreen navigation={navigation} />
        </Animated.View>
    );
};

// Profile Stack Navigator
const ProfileStackScreen = () => (
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
            options={{ ...fadeIn, cardOverlayEnabled: false }}
        />
        <ProfileStack.Screen
            name="ProfileEdit"
            component={ProfileEdit}
            options={createScreenOptions()}
        />
        <ProfileStack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
            options={createScreenOptions()}
        />
        <ProfileStack.Screen
            name="Settings"
            component={SettingsScreen}
            options={createScreenOptions()}
        />
        <ProfileStack.Screen
            name="JoinTeam"
            component={JoinTeamScreen}
            options={createScreenOptions()}
        />
        <ProfileStack.Screen
            name="ProductList"
            component={ProductListScreen}
            options={createScreenOptions({ 
                headerShown: true,
                title: 'Мои продукты',
                headerTitleStyle: { fontWeight: '600' }
            })}
        />
        <ProfileStack.Screen
            name="SupplierScreen"
            component={SupplierScreen}
            options={createScreenOptions()}
        />
        <ProfileStack.Screen
            name="Categories"
            component={CategoriesScreen}
            options={createScreenOptions()}
        />
        <ProfileStack.Screen
            name="ProductsByCategory"
            component={ProductsByCategoryScreen}
            options={createScreenOptions()}
        />
        <ProfileStack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={createScreenOptions({ 
                ...cardStackTransition,
                unmountOnBlur: false,
                cardStyle: {
                    backgroundColor: '#ffffff',
                    ...Platform.select({
                        ios: {
                            shadowColor: '#000',
                            shadowOffset: { width: -3, height: 0 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                        },
                        android: {
                            elevation: 8,
                        },
                    }),
                }
            })}
        />
        <ProfileStack.Screen
            name="ProductManagement"
            component={ProductManagementScreen}
            options={createScreenOptions()}
        />
        <ProfileStack.Screen
            name="StagnantProducts"
            component={StagnantProductsScreen}
            options={createScreenOptions({ title: 'Залежавшиеся товары' })}
        />
        <ProfileStack.Screen
            name="ProductReturns"
            component={ProductReturnsScreen}
            options={createScreenOptions({ title: 'Возвраты товаров' })}
        />
        <ProfileStack.Screen
            name="ProductReturnDetail"
            component={ProductReturnDetailScreen}
            options={createScreenOptions({ title: 'Детали возврата' })}
        />
        <ProfileStack.Screen
            name="CreateReturnModal"
            component={CreateReturnModal}
            options={{
                ...modalSlideFromBottom,
                headerShown: false,
                gestureEnabled: true,
                presentation: 'transparentModal',
                cardStyle: { backgroundColor: 'transparent' },
            }}
        />
        <ProfileStack.Screen
            name="AdminProductDetail"
            component={AdminProductDetailScreen}
            options={createScreenOptions()}
        />
        <ProfileStack.Screen
            name="Favourites"
            component={FavouritesScreen}
            options={createScreenOptions()}
        />
        <ProfileStack.Screen
            name="NotificationSettings"
            component={NotificationSettings}
            options={createScreenOptions()}
        />
        <ProfileStack.Screen
            name="PushNotificationDiagnostic"
            component={PushNotificationDiagnostic}
            options={createScreenOptions()}
        />
    </ProfileStack.Navigator>
);

// Cart Stack Navigator
const CartStackScreen = () => (
    <CartStack.Navigator
        id="CartStack"
        screenOptions={{
            ...defaultScreenOptions,
            cardOverlayEnabled: true,
            detachPreviousScreen: false,
            freezeOnBlur: false,
        }}
    >
        <CartStack.Screen
            name="CartMain"
            component={CartScreen}
            options={{ ...fadeIn, cardOverlayEnabled: false }}
        />
        <CartStack.Screen
            name="MyOrders"
            component={MyOrdersScreen}
            options={createScreenOptions({ unmountOnBlur: false, freezeOnBlur: true })}
        />
        <CartStack.Screen
            name="OrderDetails"
            component={OrderDetailsClientScreen}
            options={createScreenOptions({ unmountOnBlur: false, freezeOnBlur: true })}
        />
        <CartStack.Screen
            name="StaffOrders"
            component={StaffOrdersScreen}
            options={createScreenOptions({ unmountOnBlur: false, freezeOnBlur: true })}
        />
        <CartStack.Screen
            name="SupplierScreen"
            component={SupplierScreen}
            options={createScreenOptions()}
        />
        <CartStack.Screen
            name="Categories"
            component={CategoriesScreen}
            options={createScreenOptions()}
        />
        <CartStack.Screen
            name="ProductsByCategory"
            component={ProductsByCategoryScreen}
            options={createScreenOptions()}
        />
        <CartStack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={createScreenOptions({ 
                ...cardStackTransition,
                unmountOnBlur: false,
                freezeOnBlur: true,
                cardStyle: {
                    backgroundColor: '#ffffff',
                    ...Platform.select({
                        ios: {
                            shadowColor: '#000',
                            shadowOffset: { width: -3, height: 0 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                        },
                        android: {
                            elevation: 8,
                        },
                    }),
                }
            })}
        />
    </CartStack.Navigator>
);

// Chat Stack Navigator
const ChatStackScreen = () => (
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
            options={({ navigation }) => ({
                ...fadeIn,
                headerShown: true,
                title: '',
                // В продакшен-сборках (особенно Android) иногда появляется смещение контента хедера по вертикали
                // из-за дополнительного status-bar inset'а. Мы уже оборачиваем приложение в SafeAreaView,
                // поэтому явно убираем headerStatusBarHeight и центрируем контейнер.
                headerStatusBarHeight: 0,
                headerStyle: {
                    backgroundColor: '#FFFFFF',
                    elevation: 4,
                    shadowOpacity: 0.1,
                    height: 56,
                },
                headerTitle: () => <ChatListHeader navigation={navigation} />,
                headerLeft: () => null,
                headerTintColor: '#000000',
                cardOverlayEnabled: false,
            })}
        />
        <ChatStack.Screen
            name="CreateGroup"
            component={CreateGroupScreen}
            options={createScreenOptions({ cardStyle: { backgroundColor: '#FFFFFF' } })}
        />
        <ChatStack.Screen
            name="GroupInfo"
            component={GroupInfoScreen}
            options={createScreenOptions({ cardStyle: { backgroundColor: '#FFFFFF' } })}
        />
        <ChatStack.Screen
            name="AddGroupMembers"
            component={AddGroupMembersScreen}
            options={createScreenOptions({ cardStyle: { backgroundColor: '#FFFFFF' } })}
        />
        <ChatStack.Screen
            name="EditGroup"
            component={EditGroupScreen}
            options={createScreenOptions({ cardStyle: { backgroundColor: '#FFFFFF' } })}
        />
        <ChatStack.Screen
            name="UserPublicProfile"
            component={UserPublicProfileScreen}
            options={createScreenOptions({ 
                headerShown: true,
                title: 'Профиль пользователя' 
            })}
        />
        <ChatStack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={{ ...cardStackTransition, headerShown: false }}
        />
        <ChatStack.Screen
            name="SupplierScreen"
            component={SupplierScreen}
            options={createScreenOptions()}
        />
    </ChatStack.Navigator>
);

// Admin Stack Navigator
const AdminStackScreen = () => (
    <AdminStack.Navigator
        id="AdminStack"
        screenOptions={{
            ...defaultScreenOptions,
            detachPreviousScreen: false,
            detachInactiveScreens: false,
            keyboardHandlingEnabled: false,
            freezeOnBlur: false,
        }}
    >
        <AdminStack.Screen
            name="AdminPanel"
            component={AdminPanelScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="ProductManagement"
            component={ProductManagementScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="AdminProductDetail"
            component={AdminProductDetailScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="CategoriesManagement"
            component={CategoriesManagementScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="DistrictsManagement"
            component={DistrictsManagementScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="UsersManagement"
            component={UsersManagementScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="UserAdd"
            component={UserAddScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="EmployeeManagement"
            component={EmployeeManagementScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="DriverManagement"
            component={DriverManagementScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="StaffOrders"
            component={StaffOrdersScreen}
            options={createScreenOptions({ unmountOnBlur: false, freezeOnBlur: true })}
        />
        <AdminStack.Screen
            name="StockAlerts"
            component={StockAlertsScreen}
            options={createScreenOptions({ unmountOnBlur: false, freezeOnBlur: true })}
        />
        <AdminStack.Screen
            name="StaffOrderDetails"
            component={OrderDetailsEmployeeScreen}
            options={createScreenOptions({ unmountOnBlur: false, freezeOnBlur: true })}
        />
        <AdminStack.Screen
            name="EmployeeRewards"
            component={EmployeeRewardsScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="RewardSettings"
            component={RewardSettingsScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="StagnantProducts"
            component={StagnantProductsScreen}
            options={createScreenOptions({ title: 'Залежавшиеся товары' })}
        />
        <AdminStack.Screen
            name="ProductReturns"
            component={ProductReturnsScreen}
            options={createScreenOptions({ title: 'Возвраты товаров' })}
        />
        <AdminStack.Screen
            name="ProductReturnDetail"
            component={ProductReturnDetailScreen}
            options={createScreenOptions({ title: 'Детали возврата' })}
        />
        <AdminStack.Screen
            name="CreateReturnModal"
            component={CreateReturnModal}
            options={{
                ...modalSlideFromBottom,
                headerShown: false,
                gestureEnabled: true,
                presentation: 'transparentModal',
                cardStyle: { backgroundColor: 'transparent' },
            }}
        />
        <AdminStack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={createScreenOptions({ 
                ...cardStackTransition,
                unmountOnBlur: false,
                freezeOnBlur: true,
                cardStyle: {
                    backgroundColor: '#ffffff',
                    ...Platform.select({
                        ios: {
                            shadowColor: '#000',
                            shadowOffset: { width: -3, height: 0 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                        },
                        android: {
                            elevation: 8,
                        },
                    }),
                }
            })}
        />
        <AdminStack.Screen
            name="WarehouseStatistics"
            component={WarehouseStatisticsScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="WarehouseSales"
            component={WarehouseSalesScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="WarehouseList"
            component={WarehouseListScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="WarehouseSelection"
            component={WarehouseSelectionScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="FastMovingProducts"
            component={(props) => <TurnoverProductsScreen {...props} route={{...props.route, params: {...props.route?.params, type: 'fast'}}} />}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="SlowMovingProducts"
            component={(props) => <TurnoverProductsScreen {...props} route={{...props.route, params: {...props.route?.params, type: 'slow'}}} />}
            options={createScreenOptions()}
        />
    </AdminStack.Navigator>
);

// Main Stack Navigator
const MainStackScreen = () => (
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
            options={{ ...fadeIn, animationTypeForReplace: 'pop' }}
        />
        <MainStack.Screen
            name="NotificationsScreen"
            component={NotificationsScreen}
            options={createScreenOptions()}
        />
        <MainStack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={createScreenOptions({ 
                ...cardStackTransition,
                unmountOnBlur: false,
                cardStyle: {
                    backgroundColor: '#ffffff',
                    ...Platform.select({
                        ios: {
                            shadowColor: '#000',
                            shadowOffset: { width: -3, height: 0 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                        },
                        android: {
                            elevation: 8,
                        },
                    }),
                }
            })}
            initialParams={{ fromScreen: 'MainTab' }}
        />
        <MainStack.Screen
            name="SupplierScreen"
            component={SupplierScreen}
            options={createScreenOptions()}
        />
        <MainStack.Screen
            name="Categories"
            component={CategoriesScreen}
            options={createScreenOptions()}
        />
        <MainStack.Screen
            name="ProductsByCategory"
            component={ProductsByCategoryScreen}
            options={createScreenOptions({ cardOverlayEnabled: true })}
        />
        <MainStack.Screen
            name="EmployeeRewardsTestMain"
            component={EmployeeRewardsScreen}
            options={{ headerShown: false, gestureEnabled: false, animationEnabled: false }}
        />
        <MainStack.Screen
            name="StopsListScreen"
            component={StopsListScreen}
            options={createScreenOptions()}
        />
    </MainStack.Navigator>
);

// Search Stack Navigator
const SearchStackScreen = () => (
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
            options={createScreenOptions({ 
                cardOverlayEnabled: true,
                keyboardHandlingEnabled: true 
            })}
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
            options={createScreenOptions()}
        />
        <SearchStack.Screen
            name="Categories"
            component={CategoriesScreen}
            options={createScreenOptions()}
        />
        <SearchStack.Screen
            name="ProductsByCategory"
            component={ProductsByCategoryScreen}
            options={createScreenOptions()}
        />
        <SearchStack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={createScreenOptions({ 
                ...cardStackTransition,
                unmountOnBlur: false,
                cardStyle: {
                    backgroundColor: '#ffffff',
                    ...Platform.select({
                        ios: {
                            shadowColor: '#000',
                            shadowOffset: { width: -3, height: 0 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                        },
                        android: {
                            elevation: 8,
                        },
                    }),
                }
            })}
        />
    </SearchStack.Navigator>
);
const MainTabNavigatorContent = () => {
    const { isTabBarVisible } = useTabBar();

    const getLeafRouteName = React.useCallback((route) => {
        let r = route;
        while (r?.state?.routes && typeof r.state.index === 'number') {
            r = r.state.routes[r.state.index];
        }
        return r?.name;
    }, []);
    
    React.useEffect(() => {
        if (__DEV__) {
            console.log('🎯 TabBar visibility changed:', isTabBarVisible);
        }
    }, [isTabBarVisible]);
    
    const tabBarStyle = React.useMemo(() => {
        const style = isTabBarVisible ? {
            elevation: 8,
            shadowOpacity: 0.1,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: -2 },
        } : {
            display: 'none',
            height: 0,
            overflow: 'hidden',
        };
        if (__DEV__) {
            console.log('📐 TabBar style:', style);
        }
        return style;
    }, [isTabBarVisible]);
    
    return (
        <Tab.Navigator
            id="MainTabs"
            screenOptions={({ route }) => {
                return {
                    headerShown: false,
                    // ChatRoom вынесен в корневой Stack (AppStack), поэтому здесь таббар больше не нужно
                    // прятать по leaf-роуту — в комнате он физически не рендерится.
                    tabBarStyle: tabBarStyle,
                    lazy: true,
                    unmountOnBlur: true,
                    freezeOnBlur: true,
                    // Отключаем анимацию таббара для предотвращения дергания
                    animationEnabled: false,
                };
            }}
            detachInactiveScreens={true}
            tabBar={props => <CustomTabBar {...props} />}
            backBehavior="none"
        >
            <Tab.Screen name="MainTab" component={MainStackScreen} options={{ lazy: false }} />
            <Tab.Screen name="Search" component={SearchStackScreen} />
            <Tab.Screen name="Cart" component={CartStackScreen} />
            {featureFlags.chat && <Tab.Screen name="ChatList" component={ChatStackScreen} options={{ unmountOnBlur: false }} />}
            <Tab.Screen name="ProfileTab" component={ProfileStackScreen} />
            <Tab.Screen name="Catalog" component={CatalogScreen} options={{ tabBarVisible: false }} />
        </Tab.Navigator>
    );
};

export const MainTabNavigator = () => (
    <TabBarProvider>
        <MainTabNavigatorContent />
    </TabBarProvider>
);

// ============================================================================
// ЧАСТЬ 8: Главный навигатор
// ============================================================================

export const AppNavigator = () => {
    useMemoryOptimization();
    const { isAuthenticated } = useSelector((state) => state.auth);
    useFavoritesCleanup(isAuthenticated);
    useDeepLinking();

    // Важно для push-навигации на cold start:
    // пока isAuthenticated === undefined, навигацию по уведомлению лучше не выполнять,
    // иначе она может быть перетёрта Welcome/Auth редиректом.
    useEffect(() => {
        PushNotificationService.setAuthState?.(isAuthenticated);
    }, [isAuthenticated]);

    if (isAuthenticated === undefined) {
        return (
            <NavigationContainer
                ref={navigationRef}
                linking={linkingConfig}
                onReady={() => PushNotificationService.setNavigationReady()}
            >
                <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
                <NavigationWrapper>
                    <Stack.Navigator
                        id="AppStack"
                        screenOptions={defaultScreenOptions}
                        initialRouteName="Splash"
                    >
                        <Stack.Screen
                            name="Splash"
                            component={SplashScreen}
                            options={{ ...fadeIn, gestureEnabled: false }}
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
            onReady={() => PushNotificationService.setNavigationReady()}
        >
            <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
            <NavigationWrapper>
                {isAuthenticated && <DeepLinkHandler />}

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
                        options={{ ...fadeIn, gestureEnabled: false }}
                    />
                    <Stack.Screen
                        name="Welcome"
                        component={WelcomeScreen}
                        options={{
                            ...createScreenOptions(),
                            gestureEnabled: false, // Запрещаем возврат жестом
                            headerLeft: null, // Убираем кнопку назад
                        }}
                    />
                    <Stack.Screen
                        name="Auth"
                        component={AuthScreen}
                        options={createScreenOptions()}
                    />
                    <Stack.Screen
                        name="PrivacyPolicy"
                        component={PrivacyPolicyScreen}
                        options={createScreenOptions({
                            headerShown: false,
                        })}
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
                    <Stack.Screen
                        name="MapScreen"
                        component={MapScreen}
                        options={createScreenOptions()}
                    />

                    {/* Доступно всем (включая гостей) */}
                    <Stack.Screen
                        name="StopDetails"
                        component={StopDetailsScreen}
                        options={createScreenOptions()}
                    />
                    
                    {/* Важно: ProductDetail в AppStack нужен для переходов из ChatRoom.
                       Тогда экран товара ложится поверх ChatRoom и back возвращает обратно в комнату,
                       а не в список чатов (ChatMain) внутри табового ChatStack. */}
                    <Stack.Screen
                        name="ProductDetail"
                        component={ProductDetailScreen}
                        options={createScreenOptions({ ...cardStackTransition })}
                    />

                    {/* Экраны доступные после авторизации */}
                    {isAuthenticated && (
                        <>
                            <Stack.Screen 
                                name="AddProduct" 
                                component={AddProductScreen} 
                                options={createScreenOptions({ unmountOnBlur: false, freezeOnBlur: true })} 
                            />
                            <Stack.Screen 
                                name="WarehouseSelection" 
                                component={WarehouseSelectionScreen} 
                                options={createScreenOptions()} 
                            />
                            <Stack.Screen 
                                name="NotificationsScreen" 
                                component={NotificationsScreen} 
                                options={createScreenOptions()} 
                            />
                            <Stack.Screen 
                                name="AddStop" 
                                component={AddStopScreen} 
                                options={createScreenOptions()} 
                            />
                            <Stack.Screen 
                                name="EditStop" 
                                component={EditStopScreen} 
                                options={createScreenOptions({
                                    cardStyle: {
                                        backgroundColor: 'white',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: '#000',
                                                shadowOffset: { width: 0, height: -8 },
                                                shadowOpacity: 0.4,
                                                shadowRadius: 15,
                                            },
                                            android: {
                                                elevation: 12,
                                            },
                                        }),
                                    }
                                })} 
                            />
                            <Stack.Screen 
                                name="Admin" 
                                component={AdminStackScreen} 
                                options={createScreenOptions()} 
                            />
                            <Stack.Screen 
                                name="Checkout" 
                                component={CheckoutScreen} 
                                options={createScreenOptions()} 
                            />
                            <Stack.Screen 
                                name="GuestCheckout" 
                                component={GuestCheckoutScreen} 
                                options={createScreenOptions()} 
                            />
                            <Stack.Screen 
                                name="PreauthorizationInfo" 
                                component={PreauthorizationInfoScreen} 
                                options={createScreenOptions()} 
                            />
                            <Stack.Screen 
                                name="OrderChoice" 
                                component={OrderChoiceScreen} 
                                options={createScreenOptions()} 
                            />
                            <Stack.Screen 
                                name="OrderSuccess" 
                                component={OrderSuccessScreen} 
                                options={createScreenOptions({ 
                                    gestureEnabled: false,
                                    cardStyle: {
                                        backgroundColor: '#f8f9fa',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: '#000',
                                                shadowOffset: { width: -3, height: 0 },
                                                shadowOpacity: 0.25,
                                                shadowRadius: 6,
                                            },
                                            android: {
                                                elevation: 6,
                                            },
                                        }),
                                    }
                                })} 
                            />
                            <Stack.Screen 
                                name="PaymentScreen" 
                                component={PaymentScreen} 
                                options={createScreenOptions({ 
                                    gestureEnabled: false,
                                    cardStyle: {
                                        backgroundColor: '#FFFFFF',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: '#000',
                                                shadowOffset: { width: -3, height: 0 },
                                                shadowOpacity: 0.25,
                                                shadowRadius: 6,
                                            },
                                            android: {
                                                elevation: 6,
                                            },
                                        }),
                                    }
                                })} 
                            />
                            <Stack.Screen 
                                name="OrderChoicesList" 
                                component={OrderChoicesListScreen} 
                                options={createScreenOptions({
                                    cardStyle: {
                                        backgroundColor: '#ffffff',
                                        ...Platform.select({
                                            ios: {
                                                shadowColor: '#000',
                                                shadowOffset: { width: -3, height: 0 },
                                                shadowOpacity: 0.25,
                                                shadowRadius: 6,
                                            },
                                            android: {
                                                elevation: 8,
                                            },
                                        }),
                                    }
                                })} 
                            />
                            <Stack.Screen 
                                name="EmployeeRewardsTest" 
                                component={EmployeeRewardsScreen} 
                                options={{ headerShown: false, gestureEnabled: false, animationEnabled: false }} 
                            />

                            {featureFlags.chat && (
                                <>
                                    <Stack.Screen
                                        name="ChatList"
                                        component={ChatListScreen}
                                        options={({ navigation }) => ({
                                            ...slideFromRight,
                                            headerShown: true,
                                            headerTitle: () => <ChatListHeader navigation={navigation} />,
                                            title: '',
                                            headerStatusBarHeight: 0,
                                            headerLeft: () => (
                                                <TouchableOpacity
                                                    onPress={() => navigation.goBack()}
                                                    style={{ marginLeft: 8, padding: 8 }}
                                                    activeOpacity={0.6}
                                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                >
                                                    <Text style={{ fontSize: 28, color: '#000000', fontWeight: '300' }}>‹</Text>
                                                </TouchableOpacity>
                                            ),
                                            headerStyle: {
                                                backgroundColor: '#FFFFFF',
                                                height: 56,
                                            },
                                            headerTintColor: '#000000',
                                            gestureEnabled: true,
                                            cardStyle: { backgroundColor: '#ffffff' },
                                        })}
                                    />
                                    {/* Профиль пользователя из чата должен открываться в корневом AppStack,
                                       иначе back() может вернуть в ChatMain (внутри табового ChatStack). */}
                                    <Stack.Screen
                                        name="UserPublicProfile"
                                        component={UserPublicProfileScreen}
                                        options={createScreenOptions({
                                            headerShown: false,
                                        })}
                                    />
                                    <Stack.Screen
                                        name="ChatRoom"
                                        component={ChatRoomScreen}
                                        options={({ route, navigation }) => {
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
                                                            const groupRoomId = params.groupRoomId;

                                                            if (fromScreen === 'ChatList') {
                                                                navigation.goBack();
                                                            } else if ((fromScreen === 'UserPublicProfile' || fromScreen === 'GroupInfo') && params.userId) {
                                                                try {
                                                                    navigation.navigate('UserPublicProfile', {
                                                                        userId: params.userId,
                                                                        fromScreen: fromScreen === 'GroupInfo' ? 'GroupInfo' : 'ChatRoom',
                                                                        roomId: groupRoomId
                                                                    });
                                                                } catch (error) {
                                                                    const parentNavigation = navigation.getParent();
                                                                    if (parentNavigation) {
                                                                        parentNavigation.navigate('UserPublicProfile', {
                                                                            userId: params.userId,
                                                                            fromScreen: fromScreen === 'GroupInfo' ? 'GroupInfo' : 'ChatRoom',
                                                                            roomId: groupRoomId
                                                                        });
                                                                    } else {
                                                                        navigation.goBack();
                                                                    }
                                                                }
                                                            } else if (productId && fromScreen === 'ProductDetail') {
                                                                // ProductDetail уже в стеке (AppStack), просто возвращаемся назад
                                                                navigation.goBack();
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
                                                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
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
                                                cardStyle: { backgroundColor: '#ffffff' },
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
                                        options={({ navigation }) => ({
                                            ...slideFromRight,
                                            headerShown: true,
                                            title: 'Поиск чатов',
                                            gestureEnabled: true,
                                            cardStyle: { backgroundColor: '#ffffff' },
                                            headerStatusBarHeight: 0,
                                            headerStyle: {
                                                backgroundColor: '#FFFFFF',
                                                height: 56,
                                            },
                                            headerTitleStyle: {
                                                fontSize: 18,
                                                fontWeight: '500',
                                            },
                                            headerTitleAlign: 'center',
                                            headerLeftContainerStyle: {
                                                left: 0,
                                                alignItems: 'flex-start',
                                                justifyContent: 'center',
                                                paddingRight: 50,
                                            },
                                            headerTitleContainerStyle: {
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            },
                                            headerLeft: () => (
                                                <TouchableOpacity
                                                    onPress={() => navigation.goBack()}
                                                    style={{ 
                                                        paddingLeft: 16,
                                                        paddingRight: 8,
                                                        paddingVertical: 8,
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                    }}
                                                    activeOpacity={0.6}
                                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                >
                                                    <Text style={{ fontSize: 28, color: '#000000', fontWeight: '300', lineHeight: 28 }}>‹</Text>
                                                </TouchableOpacity>
                                            ),
                                            headerTintColor: '#000000',
                                        })}
                                    />
                                    <Stack.Screen
                                        name="CreateGroup"
                                        component={CreateGroupScreen}
                                        options={{
                                            ...slideFromRight,
                                            headerShown: false,
                                            gestureEnabled: true,
                                            cardStyle: { backgroundColor: '#FFFFFF' },
                                        }}
                                    />
                                    <Stack.Screen
                                        name="GroupInfo"
                                        component={GroupInfoScreen}
                                        options={{
                                            ...slideFromRight,
                                            headerShown: false,
                                            gestureEnabled: true,
                                            cardStyle: { backgroundColor: '#FFFFFF' },
                                        }}
                                    />
                                    <Stack.Screen
                                        name="AddGroupMembers"
                                        component={AddGroupMembersScreen}
                                        options={{
                                            ...slideFromRight,
                                            headerShown: false,
                                            gestureEnabled: true,
                                            cardStyle: { backgroundColor: '#FFFFFF' },
                                        }}
                                    />
                                    <Stack.Screen
                                        name="EditGroup"
                                        component={EditGroupScreen}
                                        options={{
                                            ...slideFromRight,
                                            headerShown: false,
                                            gestureEnabled: true,
                                            cardStyle: { backgroundColor: '#FFFFFF' },
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