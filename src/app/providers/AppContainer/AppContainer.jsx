import React, { useRef, useEffect, useState } from 'react';
import { StatusBar, View, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFavorites } from '@entities/favorites';
import { useCartAutoLoad, useCartAvailability, CartAuthHandler } from '@entities/cart';
import { AuthDialog } from "@entities/auth/ui/AuthDialog";
import PushNotificationService from "@shared/services/PushNotificationService";
import { usePushTokenAutoRegistration } from '@shared/hooks/usePushTokenAutoRegistration';

// Компонент ErrorBoundary для перехвата ошибок рендеринга
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('AppContainer ErrorBoundary caught an error:', error, errorInfo);

        // Логируем подробную информацию об ошибке
        if (error.message && error.message.includes('Malformed calls from JS')) {
            console.error('Detected Malformed calls from JS error - likely SVG/Native component issue');
        }
    }

    render() {
        if (this.state.hasError) {
            // Возвращаем простую заглушку при ошибке
            return (
                <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
                    <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
                    <View style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 20
                    }}>
                        {/* Минимальный UI без сложных компонентов */}
                        <View style={{
                            backgroundColor: '#f5f5f5',
                            padding: 20,
                            borderRadius: 8,
                            alignItems: 'center'
                        }}>
                            {/* Используем простой текст без кастомных компонентов */}
                            <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
                        </View>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

export const AppContainer = ({ children, onNavigateToAuth }) => {
    const dispatch = useDispatch();
    const authDialogRef = useRef(null);
    const {isAuthenticated, setAuthDialogRef, user} = useAuth();
    const {isCartAvailable} = useCartAvailability();
    const tokens = useSelector((state) => state.auth?.tokens);

    // Состояние для контроля инициализации
    const [isInitialized, setIsInitialized] = useState(false);
    const pushInitializationAttempted = useRef(false);

    // Автоматическая загрузка корзины при запуске приложения (только для клиентов)
    useCartAutoLoad({
        loadOnMount: isCartAvailable,
        loadOnAuthChange: isCartAvailable,
        autoMergeGuestCart: isCartAvailable,
        enableReservationCheck: isCartAvailable
    });

    // Используем кастомный хук для автоматической регистрации push токенов
    usePushTokenAutoRegistration();

    useEffect(() => {
        try {
            if (authDialogRef.current && setAuthDialogRef && typeof setAuthDialogRef === 'function') {
                setAuthDialogRef(authDialogRef.current);
            }
        } catch (error) {
            console.error('AppContainer: Ошибка установки authDialogRef:', error);
        }
    }, [setAuthDialogRef]);

    // Безопасная загрузка избранного
    useEffect(() => {
        if (isAuthenticated && !isInitialized) {
            setIsInitialized(true);

            // Добавляем небольшую задержку для стабилизации
            const timer = setTimeout(() => {
                dispatch(fetchFavorites())
                    .catch(err => {
                        console.error('AppContainer: Ошибка при загрузке избранного:', err);
                    });
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, dispatch, isInitialized]);

    // Безопасные обработчики навигации
    const handleLogin = React.useCallback(() => {
        try {
            if (onNavigateToAuth && typeof onNavigateToAuth === 'function') {
                onNavigateToAuth('login');
            } else {
                console.warn('AppContainer: Navigation handler не предоставлен для login');
            }
        } catch (error) {
            console.error('AppContainer: Ошибка навигации к экрану логина:', error);
        }
    }, [onNavigateToAuth]);

    const handleRegister = React.useCallback(() => {
        try {
            if (onNavigateToAuth && typeof onNavigateToAuth === 'function') {
                onNavigateToAuth('register');
            } else {
                console.warn('AppContainer: Navigation handler не предоставлен для register');
            }
        } catch (error) {
            console.error('AppContainer: Ошибка навигации к экрану регистрации:', error);
        }
    }, [onNavigateToAuth]);

    return (
        <ErrorBoundary>
            <SafeAreaProvider>
                <SafeAreaView
                    style={{flex: 1, backgroundColor: '#ffffff'}}
                    edges={['top', 'right', 'left']}
                >
                    <StatusBar
                        backgroundColor="#ffffff"
                        barStyle="dark-content"
                        translucent={false}
                    />

                    {children}

                    <AuthDialog
                        ref={authDialogRef}
                        onLogin={handleLogin}
                        onRegister={handleRegister}
                    />

                    <CartAuthHandler/>
                </SafeAreaView>
            </SafeAreaProvider>
        </ErrorBoundary>
    );
};