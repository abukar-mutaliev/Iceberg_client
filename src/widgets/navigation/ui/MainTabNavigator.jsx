import React, { useRef, useEffect } from 'react';
import { useSelector } from "react-redux";
import { Animated, Platform, View, Text, TouchableOpacity } from 'react-native';

import { MainScreen } from "@/screens/main/ui/MainScreen";
import { ProfileScreen } from "@/screens/profile/ui/ProfileScreen";
import { AuthScreen } from "@/screens/auth/ui/AuthScreen/ui/AuthScreen";
import { CustomTabBar } from './CustomTabBar';
import { CatalogScreen } from "@/screens/catalog";
import { ProductDetailScreen } from "@/screens/product/ProductDetailScreen";
import { SupplierScreen } from "@/screens/supplier";
import { ProductsList } from "@/widgets/productsList/";
import { CategoriesScreen, ProductsByCategoryScreen } from "@/screens/categories/ui";

import { SearchScreen } from "@/screens/search";
import { FavouritesScreen } from "@/screens/favourites";
import { createStackNavigator } from "@react-navigation/stack";
import {SearchResultsScreen} from "@/screens/search/ui/SearchResultsScreen";
import {CategorySelectScreen, FilterScreen} from "@/screens/filter/FilterScreen";
import {createBottomTabNavigator} from "@react-navigation/bottom-tabs";
import {ProfileEdit} from "@features/profile/ui/ProfileEdit";

const MainStack = createStackNavigator();
const SearchStack = createStackNavigator();
const FavouritesStack = createStackNavigator();
const CartStack = createStackNavigator();
const ProfileStack = createStackNavigator();

// Заглушка для CartScreen с переходом на ProductDetail
const CartScreen = ({ navigation }) => {
    const handleProductPress = (productId) => {
        navigation.navigate('ProductDetail', { productId, fromScreen: 'Cart' });
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Cart Screen</Text>
            <TouchableOpacity onPress={() => handleProductPress('example-product-id')}>
                <Text>Go to Product Detail</Text>
            </TouchableOpacity>
        </View>
    );
};

const MainStackScreen = () => {
    return (
        <MainStack.Navigator id="MainStack" screenOptions={{ headerShown: false }}>
            <MainStack.Screen name="Main" component={MainScreen} />
            <MainStack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <MainStack.Screen
                name="SupplierScreen"
                component={SupplierScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <MainStack.Screen
                name="Categories"
                component={CategoriesScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <MainStack.Screen
                name="ProductsByCategory"
                component={ProductsByCategoryScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
        </MainStack.Navigator>
    );
};

const SearchStackScreen = () => {
    return (
        <SearchStack.Navigator
            id="SearchStack"
            screenOptions={{
                headerShown: false,
                presentation: 'card',
                animationEnabled: true,
                cardStyle: { backgroundColor: 'transparent' },
                detachPreviousScreen: false,
                keyboardHandlingEnabled: true,
            }}
        >
            <SearchStack.Screen
                name="SearchMain"
                component={SearchScreen}
                options={{
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
                    cardOverlayEnabled: false,
                    gestureEnabled: true,
                    animationEnabled: true,
                    keyboardHandlingEnabled: true,
                }}
            />
            <SearchStack.Screen
                name="FilterScreen"
                component={FilterScreen}
                options={{
                    cardOverlayEnabled: false,
                    gestureEnabled: true,
                    animationEnabled: true,
                    headerShown: false,
                }}
            />
            <SearchStack.Screen
                name="CategorySelectScreen"
                component={CategorySelectScreen}
                options={{
                    cardOverlayEnabled: false,
                    gestureEnabled: true,
                    animationEnabled: true,
                    headerShown: false,
                }}
            />
            <SearchStack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <SearchStack.Screen
                name="SupplierScreen"
                component={SupplierScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <SearchStack.Screen
                name="Categories"
                component={CategoriesScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <SearchStack.Screen
                name="ProductsByCategory"
                component={ProductsByCategoryScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
        </SearchStack.Navigator>
    );
};

const FavouritesStackScreen = () => {
    return (
        <FavouritesStack.Navigator id="FavouritesStack" screenOptions={{ headerShown: false }}>
            <FavouritesStack.Screen name="FavouritesMain" component={FavouritesScreen} />
            <FavouritesStack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <FavouritesStack.Screen
                name="SupplierScreen"
                component={SupplierScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <FavouritesStack.Screen
                name="Categories"
                component={CategoriesScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <FavouritesStack.Screen
                name="ProductsByCategory"
                component={ProductsByCategoryScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
        </FavouritesStack.Navigator>
    );
};

const CartStackScreen = () => {
    return (
        <CartStack.Navigator id="CartStack" screenOptions={{ headerShown: false }}>
            <CartStack.Screen name="CartMain" component={CartScreen} />
            <CartStack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <CartStack.Screen
                name="SupplierScreen"
                component={SupplierScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <CartStack.Screen
                name="Categories"
                component={CategoriesScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <CartStack.Screen
                name="ProductsByCategory"
                component={ProductsByCategoryScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
        </CartStack.Navigator>
    );
};

const ProfileTabScreenContent = ({ navigation }) => {
    const { isAuthenticated } = useSelector((state) => state.auth);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const handleProductPress = (productId) => {
        navigation.navigate('ProductDetail', { productId, fromScreen: 'ProfileTab' });
    };

    return (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            {isAuthenticated ? (
                <ProfileScreen onProductPress={handleProductPress} />
            ) : (
                <AuthScreen />
            )}
        </Animated.View>
    );
};

const ProfileStackScreen = () => {
    return (
        <ProfileStack.Navigator id="ProfileStack" screenOptions={{ headerShown: false }}>
            <ProfileStack.Screen
                name="ProfileMain"
                component={ProfileTabScreenContent}
            />
            <ProfileStack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <ProfileStack.Screen
                name="ProfileEdit"
                component={ProfileEdit}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <ProfileStack.Screen
                name="SupplierScreen"
                component={SupplierScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <ProfileStack.Screen
                name="ProductList"
                component={ProductsList}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <ProfileStack.Screen
                name="Categories"
                component={CategoriesScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
            <ProfileStack.Screen
                name="ProductsByCategory"
                component={ProductsByCategoryScreen}
                options={{
                    headerShown: false,
                    gestureEnabled: true,
                }}
            />
        </ProfileStack.Navigator>
    );
};

const Tab = createBottomTabNavigator();

export const MainTabNavigator = () => {
    return (
        <Tab.Navigator
            id="MainTabs"
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    elevation: 0,
                    shadowOpacity: 0,
                    ...Platform.select({
                        ios: {
                            shadowColor: 'transparent',
                        },
                    }),
                },
            }}
            tabBar={props => <CustomTabBar {...props} />}
        >
            <Tab.Screen
                name="MainTab"
                component={MainStackScreen}
                options={{
                    tabBarLabel: 'Главная',
                }}
            />
            <Tab.Screen
                name="Search"
                component={SearchStackScreen}
                options={{
                    tabBarLabel: 'Поиск',
                }}
            />
            <Tab.Screen
                name="Favourites"
                component={FavouritesStackScreen}
                options={{
                    tabBarLabel: 'Избранное',
                }}
            />
            <Tab.Screen
                name="Cart"
                component={CartStackScreen}
                options={{
                    tabBarLabel: 'Корзина',
                }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileStackScreen}
                options={{
                    tabBarLabel: 'Профиль',
                }}
            />
            <Tab.Screen
                name="Catalog"
                component={CatalogScreen}
                options={{
                    tabBarVisible: false,
                }}
            />
        </Tab.Navigator>
    );
};