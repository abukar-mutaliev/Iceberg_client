import React, { useRef, useEffect, useState } from 'react';
import { StatusBar, View, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { useDispatch } from 'react-redux';
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

    usePushTokenAutoRegistration();

    // ИНИЦИАЛИЗАЦИЯ PUSH-УВЕДОМЛЕНИЙ
    useEffect(() => {
        const initializePushNotifications = async () => {
            if (!isAuthenticated || !user) {
                console.log('🔔 AppContainer: Пользователь не авторизован, пропускаем инициализацию push-уведомлений');
                // Сбрасываем флаг при выходе из системы
                pushInitializationAttempted.current = false;
                // Очищаем контекст пользователя в push сервисе
                PushNotificationService.clearUserContext();
                return;
            }

            // Дополнительная проверка токенов
            const { tokens } = useSelector((state) => state.auth);
            if (!tokens?.accessToken) {
                console.log('🔔 AppContainer: Токены отсутствуют, пропускаем инициализацию push-уведомлений');
                return;
            }

            // Принудительная проверка и регистрация токена (только для preview/production)
            const buildType = PushNotificationService.getBuildType();
            if (buildType === 'development' || buildType === 'expo-go') {
                console.log('ℹ️ AppContainer: Expo Go режим - Firebase недоступен, пропускаем регистрацию токена');
            } else {
                const currentToken = PushNotificationService.getCurrentToken();
                if (!currentToken) {
                    console.log('🔍 AppContainer: Push токен отсутствует, принудительно регистрируем...');
                    try {
                        const token = await PushNotificationService.getFCMToken();
                        if (token) {
                            console.log('🎫 AppContainer: FCM токен получен, сохраняем на сервере...');
                            const saved = await PushNotificationService.saveTokenToServerSafe(token, PushNotificationService._deviceId, Platform.OS);
                            if (saved) {
                                console.log('💾 AppContainer: Токен успешно сохранен на сервере');
                            }
                        }
                    } catch (error) {
                        console.warn('⚠️ AppContainer: Ошибка принудительной регистрации токена:', error);
                    }
                }
            }

            const currentUserId = user.id;
            const lastInitializedUserId = pushInitializationAttempted.current;

            // Предотвращаем множественные инициализации в течение одной сессии
            if (lastInitializedUserId === currentUserId) {
                console.log('🔔 AppContainer: Push-уведомления уже инициализированы в этой сессии для пользователя:', currentUserId);
                // Регистрация токена теперь обрабатывается в usePushTokenAutoRegistration
                return;
            }

            console.log('🔔 AppContainer: Начинаем ПОЛНУЮ инициализацию push-уведомлений для пользователя:', currentUserId, 'роль:', user.role);
            pushInitializationAttempted.current = currentUserId;

            try {
                console.log('🔐 AppContainer: Запрашиваем разрешения на уведомления...');
                const permissions = await PushNotificationService.requestPermissions();
                console.log('🔐 AppContainer: Результат запроса разрешений:', permissions);

                const success = await PushNotificationService.initializeForUser(user);

                if (success) {
                    console.log('✅ AppContainer: Push-уведомления успешно инициализированы');

                    // Проверяем токен после инициализации
                    const token = PushNotificationService.getCurrentToken();
                    console.log('🎫 AppContainer: Текущий токен после инициализации:', token ? token.substring(0, 50) + '...' : 'Нет токена');
                } else {
                    console.log('❌ AppContainer: Не удалось инициализировать push-уведомления');
                    // Сбрасываем флаг для повторной попытки
                    pushInitializationAttempted.current = false;
                }
            } catch (error) {
                console.error('❌ AppContainer: Ошибка инициализации push-уведомлений:', error);
                // Сбрасываем флаг для повторной попытки
                pushInitializationAttempted.current = false;
            }
        };

        //   Убираем задержку для немедленной инициализации
        initializePushNotifications();
    }, [isAuthenticated, user?.id, user?.role]);

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