// ============================================================================
// ЧАСТЬ 1: Imports и Constants
// ============================================================================
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Platform, Animated, View, Text, TouchableOpacity, Image } from 'react-native';
import ThemedStatusBar from '@shared/ui/ThemedStatusBar/ThemedStatusBar';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { NavigationContainer, DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";

// Hooks & Services
import PushNotificationService from '@shared/services/PushNotificationService';
import { useAuth } from "@entities/auth/hooks/useAuth";
import { selectIsAuthenticated } from "@entities/auth/model/selectors";
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
import { HelpCenterScreen } from "@features/help";
import { AssistantChatScreen } from "@features/ai-assistant";
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
import { StaffApplicationsScreen } from "@screens/admin/ui/StaffApplicationsScreen";
import { ProcessingRolesScreen } from "@screens/admin/ui/ProcessingRolesScreen";
import { UsersManagementScreen } from "@screens/user/ui/UsersManagementScreen";
import { UserAddScreen } from "@screens/user/ui/UserAddScreen";
import { DistrictsManagementScreen } from "@screens/district";
import { WarehouseStatisticsScreen } from "@screens/warehouse/ui/WarehouseStatisticsScreen";
import { WarehouseSalesScreen } from "@screens/warehouse/ui/WarehouseSalesScreen";
import { WarehouseListScreen } from "@screens/warehouse/ui/WarehouseListScreen";
import { WarehouseSelectionScreen } from "@screens/warehouse/ui/WarehouseSelectionScreen";
import { WarehouseDetailsScreen } from "@screens/warehouse/ui/WarehouseDetailsScreen";
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

// Navigation Config
import { linkingConfig } from '@shared/config/linkingConfig';
import { DeepLinkHandler } from '@shared/ui/DeepLinkHandler';
import { featureFlags } from "@shared/config/featureFlags";
import { MainTabNavigator } from './MainTabNavigator';
import { NavigationWrapper } from './NavigationWrapper';

// Transition Configs
import {
    slideFromRight,
    fadeIn,
    modalSlideFromBottom,
    slideFromBottom,
    defaultScreenOptions,
    fullScreenModal
} from '@app/providers/navigation/transitionConfigs';
import {
    useDeepLinking,
} from '@app/providers/navigation/navigationServices';
import {
    createProductDetailScreenOptions,
    createScreenOptions,
    useCreateProductDetailScreenOptions,
    useCreateScreenOptions,
    useThemedCardStyle,
} from '@app/providers/navigation/navigationOptions';
import {
    AdminStack,
    CartStack,
    ChatStack,
    MainStack,
    ProfileStack,
    SearchStack,
    Stack,
} from './stacks/stackNavigators';


// Хук для очистки избранного
// Оптимизация: запускается однократно за сессию с задержкой 30 сек,
// чтобы не нагружать API и память при каждом переключении auth-состояния
const useFavoritesCleanup = (isAuthenticated) => {
    const dispatch = useDispatch();
    const hasCleanedUp = useRef(false);

    useEffect(() => {
        if (!isAuthenticated || hasCleanedUp.current) return;

        // Откладываем очистку избранного — она не критична для UX
        // и не должна конкурировать с загрузкой UI при запуске
        const timer = setTimeout(() => {
            if (hasCleanedUp.current) return;
            hasCleanedUp.current = true;

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
        }, 30000); // 30 сек задержка — даём приложению полностью загрузиться

        return () => clearTimeout(timer);
    }, [isAuthenticated, dispatch]);
};


// ============================================================================
// ЧАСТЬ 2: Stack Navigators (упрощенные)
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
const ProfileStackScreen = () => {
    // Тёма-aware фабрики опций (шадоют модульные createScreenOptions / createProductDetailScreenOptions,
    // чтобы все дочерние экраны получили правильный cardStyle.backgroundColor вместо жёсткого белого).
    const createScreenOptions = useCreateScreenOptions();
    const createProductDetailScreenOptions = useCreateProductDetailScreenOptions();
    const themedCardStyle = useThemedCardStyle('default');

    return (
    <ProfileStack.Navigator
        id="ProfileStack"
        screenOptions={{
            ...defaultScreenOptions,
            cardStyle: themedCardStyle,
            cardOverlayEnabled: true,
            detachPreviousScreen: false,
        }}
    >
        <ProfileStack.Screen
            name="ProfileMain"
            component={ProfileTabScreenContent}
            options={{ ...fadeIn, cardOverlayEnabled: false, cardStyle: themedCardStyle }}
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
                title: 'Мои товары',
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
            options={createProductDetailScreenOptions()}
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
            name="HelpCenter"
            component={HelpCenterScreen}
            options={createScreenOptions({ title: 'Центр помощи' })}
        />
        <ProfileStack.Screen
            name="StopsListScreen"
            component={StopsListScreen}
            options={createScreenOptions()}
        />
        <ProfileStack.Screen
            name="AddStop"
            component={AddStopScreen}
            options={createScreenOptions()}
        />
    </ProfileStack.Navigator>
    );
};

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
            options={createProductDetailScreenOptions()}
        />
    </CartStack.Navigator>
);

// Chat Stack Navigator
const ChatStackScreen = () => {
    const { colors, isDark } = useTheme();
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
            options={({ navigation }) => ({
                ...fadeIn,
                headerShown: true,
                title: '',
                // В продакшен-сборках (особенно Android) иногда появляется смещение контента хедера по вертикали
                // из-за дополнительного status-bar inset'а. Мы уже оборачиваем приложение в SafeAreaView,
                // поэтому явно убираем headerStatusBarHeight и центрируем контейнер.
                headerStatusBarHeight: 0,
                headerStyle: {
                    backgroundColor: isDark ? colors.surface : '#FFFFFF',
                    elevation: isDark ? 0 : 4,
                    shadowOpacity: isDark ? 0 : 0.1,
                    height: 56,
                    borderBottomWidth: isDark ? 1 : 0,
                    borderBottomColor: isDark ? colors.divider : 'transparent',
                },
                headerTitle: () => <ChatListHeader navigation={navigation} />,
                headerLeft: () => null,
                headerTintColor: isDark ? colors.textPrimary : '#000000',
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
            options={createProductDetailScreenOptions()}
        />
        <ChatStack.Screen
            name="SupplierScreen"
            component={SupplierScreen}
            options={createScreenOptions()}
        />
        <ChatStack.Screen
            name="AssistantChat"
            component={AssistantChatScreen}
            options={createScreenOptions({ headerShown: false })}
        />
    </ChatStack.Navigator>
    );
};

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
            name="ProductModerationQueue"
            component={ProductManagementScreen}
            initialParams={{ moderationOnly: true }}
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
            name="StaffApplications"
            component={StaffApplicationsScreen}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="ProcessingRolesScreen"
            component={ProcessingRolesScreen}
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
            options={createProductDetailScreenOptions()}
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
            component={TurnoverProductsScreen}
            initialParams={{ type: 'fast' }}
            options={createScreenOptions()}
        />
        <AdminStack.Screen
            name="SlowMovingProducts"
            component={TurnoverProductsScreen}
            initialParams={{ type: 'slow' }}
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
        // Android: detach неактивных экранов — иначе Main остаётся в нативном дереве
        // и конкурирует с JS при переходе на ProductDetail (FlatList, скролл).
        // iOS: НЕ detach — иначе Main удаляется из нативной иерархии, и при возврате
        // через Tab Press (fade-анимация productChainTransition, 90ms) iOS не успевает
        // re-attach + layout Main до окончания анимации → Main рисуется в половину ширины.
        // Похожие товары теперь используют replace() (один ProductDetail в стеке),
        // поэтому оригинальная причина detach на iOS больше не актуальна.
        detachInactiveScreens={Platform.OS === 'android'}
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
            options={createProductDetailScreenOptions()}
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
            options={createScreenOptions()}
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
        <MainStack.Screen
            name="WarehouseList"
            component={WarehouseListScreen}
            options={createScreenOptions()}
        />
        <MainStack.Screen
            name="WarehouseDetails"
            component={WarehouseDetailsScreen}
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
            options={createProductDetailScreenOptions()}
        />
    </SearchStack.Navigator>
);
const MainTabNavigatorScreen = () => (
    <MainTabNavigator
        MainStackScreen={MainStackScreen}
        SearchStackScreen={SearchStackScreen}
        CartStackScreen={CartStackScreen}
        ChatStackScreen={ChatStackScreen}
        ProfileStackScreen={ProfileStackScreen}
        CatalogScreen={CatalogScreen}
    />
);

// ============================================================================
// ЧАСТЬ 3: Главный навигатор
// ============================================================================

export const AppNavigator = () => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const { colors, isDark } = useTheme();
    useFavoritesCleanup(isAuthenticated);
    useDeepLinking();

    // Тёма-aware фабрики опций — шадоуем модульные createScreenOptions
    // / createProductDetailScreenOptions, чтобы все экраны этого стека (Welcome, Auth,
    // MapScreen, CatalogModal, StopDetails, ProductDetail, CheckoutScreen и т.д.)
    // получили правильный cardStyle.backgroundColor и не мигали белым в dark-режиме
    // во время slide/fade-перехода.
    const createScreenOptions = useCreateScreenOptions();
    const createProductDetailScreenOptions = useCreateProductDetailScreenOptions();
    const themedCardStyle = useThemedCardStyle('default');

    // Тема самого NavigationContainer. Без неё используется DefaultTheme с БЕЛЫМ
    // `colors.background`, и именно он показывается "под" карточками во время
    // первого ленивого монтирования нового экрана (например, StopDetails) и
    // даёт белую вспышку при slide-анимации в dark-режиме.
    const navigationTheme = useMemo(() => {
        const base = isDark ? NavDarkTheme : NavDefaultTheme;
        return {
            ...base,
            colors: {
                ...base.colors,
                background: colors.background,
                card: colors.surface || colors.background,
                text: colors.textPrimary,
                border: colors.divider || base.colors.border,
                primary: colors.primary || base.colors.primary,
            },
        };
    }, [isDark, colors.background, colors.surface, colors.textPrimary, colors.divider, colors.primary]);

    // Важно для push-навигации на cold start:
    // пока isAuthenticated === undefined, навигацию по уведомлению лучше не выполнять,
    // иначе она может быть перетёрта Welcome/Auth редиректом.
    useEffect(() => {
        PushNotificationService.setAuthState?.(isAuthenticated);
    }, [isAuthenticated]);

    // Выносим NavigationContainer наружу, чтобы он был только один
    // Это устраняет ошибку "configured linking in multiple places"
    return (
        <NavigationContainer
            ref={navigationRef}
            theme={navigationTheme}
            linking={linkingConfig}
            onReady={() => PushNotificationService.setNavigationReady()}
        >
            <ThemedStatusBar />
            <NavigationWrapper>
                {isAuthenticated && <DeepLinkHandler />}

                {isAuthenticated === undefined ? (
                    // Показываем только Splash экран пока проверяется авторизация
                    <Stack.Navigator
                        id="AppStack"
                        screenOptions={{ ...defaultScreenOptions, cardStyle: themedCardStyle }}
                        initialRouteName="Splash"
                    >
                        <Stack.Screen
                            name="Splash"
                            component={SplashScreen}
                            options={{ ...fadeIn, gestureEnabled: false, cardStyle: themedCardStyle }}
                        />
                    </Stack.Navigator>
                ) : (
                    // Полный навигатор после проверки авторизации
                    <Stack.Navigator
                        id="AppStack"
                        screenOptions={{
                            ...defaultScreenOptions,
                            cardStyle: themedCardStyle,
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
                        component={MainTabNavigatorScreen}
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
                    <Stack.Screen
                        name="CatalogModal"
                        component={CatalogScreen}
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
                        options={createProductDetailScreenOptions()}
                    />
                    {/* SupplierScreen в AppStack нужен для переходов из ChatRoom.
                       Тогда экран поставщика ложится поверх ChatRoom и back возвращает обратно в комнату. */}
                    <Stack.Screen
                        name="SupplierScreen"
                        component={SupplierScreen}
                        options={createScreenOptions()}
                    />
                    <Stack.Screen
                        name="StagnantProducts"
                        component={StagnantProductsScreen}
                        options={createScreenOptions({ title: 'Залежавшиеся товары' })}
                    />
                    <Stack.Screen
                        name="AdminProductDetail"
                        component={AdminProductDetailScreen}
                        options={createScreenOptions()}
                    />
                    {/* WarehouseDetails в AppStack нужен для переходов из ChatRoom.
                       Тогда экран склада ложится поверх ChatRoom и back возвращает обратно в комнату. */}
                    <Stack.Screen
                        name="WarehouseDetails"
                        component={WarehouseDetailsScreen}
                        options={createScreenOptions()}
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
                                                    <Text style={{ fontSize: 28, color: isDark ? colors.textPrimary : '#000000', fontWeight: '300' }}>‹</Text>
                                                </TouchableOpacity>
                                            ),
                                            headerStyle: {
                                                backgroundColor: isDark ? colors.surface : '#FFFFFF',
                                                height: 56,
                                                elevation: isDark ? 0 : undefined,
                                                shadowOpacity: isDark ? 0 : undefined,
                                                borderBottomWidth: isDark ? 1 : 0,
                                                borderBottomColor: isDark ? colors.divider : 'transparent',
                                            },
                                            headerTintColor: isDark ? colors.textPrimary : '#000000',
                                            gestureEnabled: true,
                                            cardStyle: { backgroundColor: isDark ? colors.background : '#ffffff' },
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
                                            // Тёма-aware фон карточки и хедера: без этого в dark-режиме
                                            // во время slide-анимации видна белая "вспышка" под чатом,
                                            // пока ChatBackground (ImageBackground) ещё декодирует PNG.
                                            const headerBg = isDark ? colors.surface : '#FFFFFF';
                                            const cardBg = isDark ? colors.background : '#ffffff';
                                            const tint = isDark ? colors.textPrimary : '#000000';

                                            return {
                                                ...slideFromRight,
                                                headerShown: true,
                                                title: roomTitle,
                                                headerBackTitle: '',
                                                headerTransparent: false,
                                                headerStatusBarHeight: 0,
                                                keyboardHandlingEnabled: false,
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
                                                            color: tint,
                                                            fontWeight: '300',
                                                            lineHeight: 32,
                                                        }}>‹</Text>
                                                    </TouchableOpacity>
                                                ),
                                                gestureEnabled: true,
                                                cardStyle: { backgroundColor: cardBg },
                                                headerStyle: {
                                                    backgroundColor: headerBg,
                                                    height: 64,
                                                    elevation: 0,
                                                    shadowOpacity: 0,
                                                    borderBottomWidth: isDark ? 1 : 0,
                                                    borderBottomColor: isDark ? colors.divider : 'transparent',
                                                },
                                                headerTintColor: tint,
                                                headerTitleStyle: {
                                                    color: tint,
                                                },
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
                                            cardStyle: { backgroundColor: isDark ? colors.background : '#ffffff' },
                                            headerStatusBarHeight: 0,
                                            headerStyle: {
                                                backgroundColor: isDark ? colors.surface : '#FFFFFF',
                                                height: 56,
                                                elevation: isDark ? 0 : undefined,
                                                shadowOpacity: isDark ? 0 : undefined,
                                                borderBottomWidth: isDark ? 1 : 0,
                                                borderBottomColor: isDark ? colors.divider : 'transparent',
                                            },
                                            headerTitleStyle: {
                                                fontSize: 18,
                                                fontWeight: '500',
                                                color: isDark ? colors.textPrimary : '#000000',
                                            },
                                            headerTitleAlign: 'center',
                                            headerLeftContainerStyle: {
                                                paddingRight: 0,
                                            },
                                            headerRightContainerStyle: {
                                                paddingLeft: 0,
                                            },
                                            headerTitleContainerStyle: {
                                                left: 0,
                                                right: 0,
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
                                                    <Text style={{ fontSize: 28, color: isDark ? colors.textPrimary : '#000000', fontWeight: '300', lineHeight: 28 }}>‹</Text>
                                                </TouchableOpacity>
                                            ),
                                            headerTintColor: isDark ? colors.textPrimary : '#000000',
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
                )}
            </NavigationWrapper>
        </NavigationContainer>
    );
};