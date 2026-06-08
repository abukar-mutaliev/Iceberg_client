import React, { useRef, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { useCartAutoLoad, useCartAvailability, CartAuthHandler } from '@entities/cart';
import { useOrderCountsBackground } from '@entities/order';
import { AuthDialog } from "@entities/auth/ui/AuthDialog";
import { usePushTokenAutoRegistration } from '@shared/hooks/usePushTokenAutoRegistration';
import { useChatCacheInit, useChatBackgroundSync } from '@entities/chat';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import ThemedStatusBar from '@shared/ui/ThemedStatusBar/ThemedStatusBar';

// Вынесен в отдельный компонент для переиспользования
class ErrorBoundaryInner extends React.Component {
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
            const { themeColors } = this.props;
            return (
                <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
                    <ThemedStatusBar />
                    <View style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 20
                    }}>
                        <View style={{
                            backgroundColor: themeColors.surfaceElevated,
                            padding: 20,
                            borderRadius: 8,
                            alignItems: 'center'
                        }}>
                            <ThemedStatusBar />
                        </View>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

// Обёртка, чтобы передать в классовый ErrorBoundary текущие цвета темы
const ErrorBoundary = ({ children }) => {
    const { colors } = useTheme();
    return <ErrorBoundaryInner themeColors={colors}>{children}</ErrorBoundaryInner>;
};

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

export const AppContainer = ({ children, onNavigateToAuth }) => {
    const authDialogRef = useRef(null);
    const { isAuthenticated, setAuthDialogRef } = useAuth();
    const { isCartAvailable } = useCartAvailability();
    const { colors } = useTheme();

    // Кастомные хуки для разделения логики
    const { handleLogin, handleRegister } = useAuthNavigation(onNavigateToAuth);

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
            <SafeAreaView
                style={{ flex: 1, backgroundColor: colors.background }}
                edges={['top', 'right', 'left']}
            >
                <ThemedStatusBar />

                {children}

                <AuthDialog
                    ref={authDialogRef}
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                />

                <CartAuthHandler />
            </SafeAreaView>
        </ErrorBoundary>
    );
};