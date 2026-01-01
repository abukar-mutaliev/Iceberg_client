import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFavorites } from '@entities/favorites';
import { loadUserProfile } from '@entities/auth';
import { useCartAutoLoad, useCartAvailability, CartAuthHandler } from '@entities/cart';
import { useOrderCountsBackground } from '@entities/order';
import { AuthDialog } from "@entities/auth/ui/AuthDialog";
import { usePushTokenAutoRegistration } from '@shared/hooks/usePushTokenAutoRegistration';
import { useChatCacheInit, useChatBackgroundSync } from '@entities/chat';

// Вынесен в отдельный компонент для переиспользования
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

        if (error.message?.includes('Malformed calls from JS')) {
            console.error('Detected Malformed calls from JS error - likely SVG/Native component issue');
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
                    <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
                    <View style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 20
                    }}>
                        <View style={{
                            backgroundColor: '#f5f5f5',
                            padding: 20,
                            borderRadius: 8,
                            alignItems: 'center'
                        }}>
                            <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
                        </View>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

// Хук для безопасной навигации
const useAuthNavigation = (onNavigateToAuth) => {
    const navigate = useCallback((screen) => {
        try {
            if (onNavigateToAuth && typeof onNavigateToAuth === 'function') {
                onNavigateToAuth(screen);
            } else {
                console.warn(`AppContainer: Navigation handler не предоставлен для ${screen}`);
            }
        } catch (error) {
            console.error(`AppContainer: Ошибка навигации к экрану ${screen}:`, error);
        }
    }, [onNavigateToAuth]);

    return {
        handleLogin: useCallback(() => navigate('login'), [navigate]),
        handleRegister: useCallback(() => navigate('register'), [navigate])
    };
};

// Хук для валидации токенов
const useTokenValidation = (tokens) => {
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        const validateTokens = async () => {
            if (!tokens?.accessToken || !tokens?.refreshToken) {
                setIsValid(false);
                return;
            }

            try {
                const { authService } = await import('@shared/api/api');
                const isRefreshTokenValid = authService.isTokenValid(tokens.refreshToken);
                setIsValid(isRefreshTokenValid);
            } catch (error) {
                console.error('❌ Token validation error:', error);
                setIsValid(false);
            }
        };

        validateTokens();
    }, [tokens]);

    return isValid;
};

// Хук для инициализации данных пользователя
const useUserDataInitialization = (isAuthenticated, tokens, isTokenValid) => {
    const dispatch = useDispatch();
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Ранний выход если условия не выполнены
        if (!isAuthenticated || !isTokenValid || isInitialized) {
            if (!isAuthenticated || !tokens?.accessToken || !tokens?.refreshToken) {
                console.log('ℹ️ AppContainer: Skipping data load', {
                    isAuthenticated,
                    hasAccessToken: !!tokens?.accessToken,
                    hasRefreshToken: !!tokens?.refreshToken
                });
            }
            return;
        }

        let isMounted = true;

        const loadData = async () => {
            try {
                setIsInitialized(true);

                // Загрузка профиля
                console.log('📊 AppContainer: Loading user profile on app startup');
                await dispatch(loadUserProfile());

                // Небольшая задержка для обновления состояния
                await new Promise(resolve => setTimeout(resolve, 100));

                // Загрузка избранного
                if (isMounted) {
                    await dispatch(fetchFavorites());
                }
            } catch (error) {
                console.error('❌ AppContainer: Error loading user data:', error?.message || error);
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, [isAuthenticated, isTokenValid, isInitialized, dispatch, tokens]);

    return isInitialized;
};

export const AppContainer = ({ children, onNavigateToAuth }) => {
    const authDialogRef = useRef(null);
    const { isAuthenticated, setAuthDialogRef } = useAuth();
    const { isCartAvailable } = useCartAvailability();
    const tokens = useSelector((state) => state.auth?.tokens);

    // Кастомные хуки для разделения логики
    const { handleLogin, handleRegister } = useAuthNavigation(onNavigateToAuth);
    const isTokenValid = useTokenValidation(tokens);
    
    useUserDataInitialization(isAuthenticated, tokens, isTokenValid);

    // Автоматическая загрузка корзины
    useCartAutoLoad({
        loadOnMount: isCartAvailable,
        loadOnAuthChange: isCartAvailable,
        autoMergeGuestCart: isCartAvailable && isAuthenticated,
        enableReservationCheck: isCartAvailable && isAuthenticated
    });

    // Регистрация push токенов и фоновая загрузка счетчиков
    usePushTokenAutoRegistration();
    useOrderCountsBackground();
    
    // Инициализация кэша чатов и фоновая синхронизация
    useChatCacheInit();
    useChatBackgroundSync();

    // Установка ref для AuthDialog
    useEffect(() => {
        try {
            if (authDialogRef.current && typeof setAuthDialogRef === 'function') {
                setAuthDialogRef(authDialogRef.current);
            }
        } catch (error) {
            console.error('AppContainer: Ошибка установки authDialogRef:', error);
        }
    }, [setAuthDialogRef]);

    return (
        <ErrorBoundary>
            <SafeAreaProvider>
                <SafeAreaView
                    style={{ flex: 1, backgroundColor: '#ffffff' }}
                    edges={['top', 'right', 'left']}
                >
                    <StatusBar
                        barStyle="dark-content"
                        translucent={true}
                    />

                    {children}

                    <AuthDialog
                        ref={authDialogRef}
                        onLogin={handleLogin}
                        onRegister={handleRegister}
                    />

                    <CartAuthHandler />
                </SafeAreaView>
            </SafeAreaProvider>
        </ErrorBoundary>
    );
};