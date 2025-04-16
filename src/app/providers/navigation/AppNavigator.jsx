import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import { useSelector } from "react-redux";
import React from "react";
import { StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthScreen } from "@/screens/auth/ui/AuthScreen";
import { ProfileScreen } from "@/screens/profile";
import { SplashScreen } from "@/features/splash";
import { WelcomeScreen } from "@/screens/welcome";
import { AddProductScreen } from "@/screens/product/add-product/AddProductScreen";
import { ProductListScreen } from "@/screens/product/product-list/ProductListScreen";
import { CategoriesScreen, ProductsByCategoryScreen } from "@/screens/categories/ui";

import { MainTabNavigator } from "@/widgets/navigation";

import {
    slideFromRight,
    fadeIn,
    modalSlideFromBottom,
    defaultScreenOptions
} from '@/app/providers/navigation/transitionConfigs';
import {ProfileEdit} from "@features/profile/ui/ProfileEdit";

const Stack = createStackNavigator();

export const AppNavigator = () => {
    const { isAuthenticated } = useSelector((state) => state.auth);

    if (isAuthenticated === undefined) {
        return (
            <NavigationContainer>
                <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
                <SafeAreaView style={{ flex: 1 }} edges={['top', 'right', 'left']}>
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
                        <Stack.Screen
                            name="Auth"
                            component={AuthScreen}
                            options={slideFromRight}
                        />
                    </Stack.Navigator>
                </SafeAreaView>
            </NavigationContainer>
        );
    }

    return (
        <NavigationContainer>
            <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'right', 'left']}>
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
                    <Stack.Screen
                        name="Welcome"
                        component={WelcomeScreen}
                        options={slideFromRight}
                    />
                    <Stack.Screen
                        name="Auth"
                        component={AuthScreen}
                        options={slideFromRight}
                    />
                    <Stack.Screen
                        name="Main"
                        component={MainTabNavigator}
                        options={{
                            ...fadeIn,
                            headerLeft: null,
                            gestureEnabled: false,
                        }}
                    />
                    <Stack.Screen
                        name="Categories"
                        component={CategoriesScreen}
                        options={{
                            ...slideFromRight,
                            headerShown: false,
                            gestureEnabled: true,
                        }}
                    />
                    <Stack.Screen
                        name="ProductsByCategory"
                        component={ProductsByCategoryScreen}
                        options={{
                            ...slideFromRight,
                            headerShown: false,
                            gestureEnabled: true,
                        }}
                    />
                    {isAuthenticated && (
                        <>
                            <Stack.Screen
                                name="Profile"
                                component={ProfileScreen}
                                options={slideFromRight}
                            />
                            <Stack.Screen
                                name="ProfileEdit"
                                component={ProfileEdit}
                                options={slideFromRight}
                            />
                            <Stack.Screen
                                name="AddProduct"
                                component={AddProductScreen}
                                options={{
                                    ...modalSlideFromBottom,
                                    headerShown: true,
                                    title: 'Добавить продукт',
                                    headerTitleStyle: {
                                        fontWeight: '600',
                                    },
                                    cardStyle: { backgroundColor: 'white' },
                                }}
                            />
                            <Stack.Screen
                                name="ProductList"
                                component={ProductListScreen}
                                options={{
                                    ...slideFromRight,
                                    headerShown: true,
                                    title: 'Мои продукты',
                                    headerTitleStyle: {
                                        fontWeight: '600',
                                    },
                                }}
                            />
                        </>
                    )}
                </Stack.Navigator>
            </SafeAreaView>
        </NavigationContainer>
    );
};