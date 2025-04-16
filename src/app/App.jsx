import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, Button } from 'react-native';
import { csrfService } from '@/shared/api/api';
import { authService } from '@/shared/api/api';
import { AppNavigator } from '@app/providers/navigation/AppNavigator';
import { useFonts } from 'expo-font';
import { AppProviders } from './providers';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {GestureHandlerRootView} from "react-native-gesture-handler";

export default function App() {
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState(null);

    const [fontsLoaded, fontError] = useFonts({
        'BezierSans': require('../assets/fonts/BézierSans_Regular.ttf'),
        'SFProText': require('../assets/fonts/SFProText-Regular.ttf'),
        'SF Pro Display': require('../assets/fonts/SF-Pro-Display-Regular.otf'),
        'SFProDisplayMedium': require('../assets/fonts/SF-Pro-Display-Medium.otf'),
    });

    useEffect(() => {
        if (fontsLoaded) {
            console.log('Fonts loaded successfully');
        } else if (fontError) {
            console.error('Font loading error:', fontError);
        }
    }, [fontsLoaded, fontError]);

    useEffect(() => {
        if (!fontsLoaded) return;

        const initializeApp = async () => {
            try {
                console.log('Starting app initialization');
                await csrfService.initialize();
                await authService.initializeAuth();
                console.log('App initialized successfully');
            } catch (err) {
                console.error('Failed to initialize app:', err);
                setError('Ошибка подключения к сети. Проверьте интернет-соединение.');
            } finally {
                setIsInitializing(false);
            }
        };

        initializeApp();
    }, [fontsLoaded]);

    if (!fontsLoaded || fontError) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Text style={{ textAlign: 'center', marginBottom: 15 }}>
                    {fontError ? 'Ошибка загрузки шрифтов.' : 'Загрузка шрифтов...'}
                </Text>
                {fontError && (
                    <Button
                        title="Повторить"
                        onPress={() => {
                            // Перезапуск для теста
                            window.location.reload();
                        }}
                    />
                )}
            </View>
        );
    }

    if (isInitializing) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <AppProviders>
                <GestureHandlerRootView style={{ flex: 1 }}>
                <AppNavigator />
                </GestureHandlerRootView>

            </AppProviders>
        </SafeAreaProvider>
    );
}