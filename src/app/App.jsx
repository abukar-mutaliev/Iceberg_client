import React, {useEffect, useRef, useState} from 'react';
import {View, Text, Button, StyleSheet, Image} from 'react-native';
import {AppNavigator} from '@app/providers/navigation/AppNavigator';
import * as Font from 'expo-font';
import {AppProviders} from './providers';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useAuth} from "@entities/auth/hooks/useAuth";
import {authService} from "@shared/api/api";
import {PersistGate} from "redux-persist/integration/react";
import {persistor} from "@app/store/store";
import {useDispatch} from "react-redux";
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {initConsolePolyfill} from '@shared/lib/consolePolyfill';
import {testNetworkConnection} from '@shared/api/api';
import {useChatSocket} from '@entities/chat/hooks/useChatSocket';
import {usePushTokenAutoRegistration} from '@shared/hooks/usePushTokenAutoRegistration';
import {ToastContainer} from '@shared/ui/Toast';
import InAppLogger from '@shared/services/InAppLogger';

initConsolePolyfill();

// Инициализируем InAppLogger для сбора логов на prod/preview
// Логи будут доступны в PushNotificationDiagnostic экране
console.log('[App] 🔍 InAppLogger initialized');
// InAppLogger автоматически начинает перехватывать console.log при создании

// 📝 ВАЖНО: Уведомления обрабатываются через OneSignal
// OneSignal автоматически настраивает показ уведомлений в foreground
// Канал уведомлений создается в OneSignalService.initialize()

// 🔍 ГЛОБАЛЬНАЯ ОБРАБОТКА ОШИБОК ДЛЯ ДИАГНОСТИКИ КРАШЕЙ
if (typeof ErrorUtils !== 'undefined') {
    const originalGlobalHandler = ErrorUtils.getGlobalHandler();
    
    ErrorUtils.setGlobalHandler((error, isFatal) => {
        const errorInfo = {
            message: error?.message || 'Unknown error',
            stack: error?.stack || 'No stack trace',
            name: error?.name || 'Error',
            isFatal: isFatal || false,
            timestamp: new Date().toISOString(),
        };
        
        // Детальное логирование для диагностики
        console.error('🚨 GLOBAL ERROR HANDLER:', errorInfo);
        console.error('🚨 Error details:', JSON.stringify(errorInfo, null, 2));
        
        // Логируем в консоль с максимальной детализацией
        if (error?.stack) {
            console.error('🚨 Stack trace:', error.stack);
        }
        
        // Вызываем оригинальный обработчик если он есть
        if (originalGlobalHandler) {
            originalGlobalHandler(error, isFatal);
        }
    });
}

// 🔍 ОБРАБОТКА НЕОБРАБОТАННЫХ ПРОМИСОВ
if (typeof global !== 'undefined') {
    const originalUnhandledRejection = global.onunhandledrejection;
    
    global.onunhandledrejection = (event) => {
        const errorInfo = {
            reason: event?.reason || 'Unknown rejection',
            message: event?.reason?.message || String(event?.reason || 'Unhandled promise rejection'),
            stack: event?.reason?.stack || 'No stack trace',
            timestamp: new Date().toISOString(),
        };
        
        console.error('🚨 UNHANDLED PROMISE REJECTION:', errorInfo);
        console.error('🚨 Rejection details:', JSON.stringify(errorInfo, null, 2));
        
        if (originalUnhandledRejection) {
            originalUnhandledRejection(event);
        }
    };
}


class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        const errorDetails = {
            message: error?.message || 'Unknown error',
            name: error?.name || 'Error',
            stack: error?.stack || 'No stack trace',
            componentStack: errorInfo?.componentStack || 'No component stack',
            errorInfo: errorInfo,
            timestamp: new Date().toISOString(),
        };
        
        // Детальное логирование для диагностики
        console.error('🚨 ErrorBoundary caught error:', errorDetails);
        console.error('🚨 Full error object:', JSON.stringify(errorDetails, null, 2));
        console.error('🚨 Error stack:', error?.stack);
        console.error('🚨 Component stack:', errorInfo?.componentStack);
        
        // Пытаемся сохранить информацию об ошибке для последующего анализа
        try {
            if (__DEV__) {
                // В dev режиме выводим больше информации
                console.error('🚨 Error boundary state:', this.state);
            }
        } catch (e) {
            console.error('🚨 Failed to log error details:', e);
        }
        
        this.setState({ 
            error,
            errorInfo: errorInfo?.componentStack || 'No component stack available'
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>Что-то пошло не так!</Text>
                    <Text style={styles.errorText}>
                        {this.state.error?.message || 'Произошла ошибка в приложении'}
                    </Text>
                    <Button
                        title="Перезагрузить приложение"
                        onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                    />
                </View>
            );
        }

        return this.props.children;
    }
}

const AppInitializer = ({children}) => {
    const [error, setError] = useState(null);
    const hasInitialized = useRef(false);
    
    // Хуки вызываются безусловно (правило React hooks)
    // Защита от ошибок добавлена в useEffect и внутри самих хуков
    const auth = useAuth();
    const dispatch = useDispatch();
    
    // Необязательные хуки - должны иметь внутреннюю защиту от ошибок
    usePushTokenAutoRegistration();
    useChatSocket();


    useEffect(() => {
        if (hasInitialized.current) return;

        const initializeApp = async () => {
            hasInitialized.current = true;

            try {
                console.log('🚀 App: Starting background initialization...');

                // Безопасная проверка сети
                try {
                    await testNetworkConnection();
                } catch (networkError) {
                    console.warn('⚠️ App: Network check failed (non-critical):', networkError);
                    // Не блокируем инициализацию при ошибках сети
                }

                // Безопасная инициализация auth
                try {
                    const initialized = await authService.initializeAuth();
                    if (!initialized) {
                        return;
                    }
                } catch (authError) {
                    console.error('❌ App: Auth initialization failed:', authError);
                    return;
                }

                // Безопасное получение токенов
                let tokens;
                try {
                    tokens = await authService.getStoredTokens();
                    if (!tokens || !tokens.refreshToken) {
                        return;
                    }
                } catch (tokenError) {
                    console.error('❌ App: Failed to get stored tokens:', tokenError);
                    return;
                }

                // Безопасная валидация токенов
                let accessTokenValid = false;
                let refreshTokenValid = false;
                try {
                    accessTokenValid = tokens.accessToken ? authService.isTokenValid(tokens.accessToken) : false;
                    refreshTokenValid = tokens.refreshToken ? authService.isTokenValid(tokens.refreshToken) : false;
                } catch (validationError) {
                    console.error('❌ App: Token validation failed:', validationError);
                    return;
                }

                console.log('🔍 Token validation:', {
                    hasAccessToken: !!tokens.accessToken,
                    hasRefreshToken: !!tokens.refreshToken,
                    accessTokenValid,
                    refreshTokenValid
                });

                if (!refreshTokenValid) {
                    console.log('⚠️ Refresh token expired, need to re-login');
                    try {
                        if (dispatch && typeof dispatch === 'function') {
                            dispatch({ type: 'auth/resetState' });
                        }
                        await authService.clearTokens();
                    } catch (clearError) {
                        console.error('❌ App: Failed to clear tokens:', clearError);
                    }
                    return;
                }

                if (!accessTokenValid && refreshTokenValid) {
                    try {
                        // Используем authService.refreshAccessToken напрямую, так как он работает с AsyncStorage
                        // Это избегает проблемы несинхронизированности Redux store с AsyncStorage
                        const refreshed = await authService.refreshAccessToken();
                        if (refreshed?.accessToken) {
                            console.log('✅ App: Token refreshed successfully on initialization');
                            // Обновляем Redux store с новыми токенами
                            if (dispatch && typeof dispatch === 'function') {
                                dispatch({ 
                                    type: 'auth/setTokens', 
                                    payload: { 
                                        accessToken: refreshed.accessToken, 
                                        refreshToken: refreshed.refreshToken 
                                    } 
                                });
                            }
                        } else {
                            console.warn('⚠️ App: Token refresh failed - no new tokens received');
                            await authService.clearTokens();
                            return;
                        }
                    } catch (refreshError) {
                        console.error('❌ App: Failed to refresh token on initialization:', refreshError?.message || refreshError);
                        try {
                            await authService.clearTokens();
                        } catch (clearError) {
                            console.error('❌ App: Failed to clear tokens after refresh error:', clearError);
                        }
                        return;
                    }
                } else if (accessTokenValid) {
                    // Если access token валиден, убеждаемся что Redux store синхронизирован
                    if (dispatch && typeof dispatch === 'function') {
                        console.log('✅ App: Syncing valid tokens with Redux store');
                        dispatch({ 
                            type: 'auth/setTokens', 
                            payload: { 
                                accessToken: tokens.accessToken, 
                                refreshToken: tokens.refreshToken 
                            } 
                        });
                    }
                }

                // Безопасная инициализация push-уведомлений
                try {
                    const pushService = await import('@shared/services/PushNotificationService');
                    if (pushService?.default?.initialize) {
                        await pushService.default.initialize();
                    }
                } catch (pushError) {
                    console.warn('⚠️ App: Push notification initialization failed (non-critical):', pushError?.message || pushError);
                    // Ошибка инициализации push-уведомлений не критична - продолжаем работу
                }

            } catch (err) {
                console.error('❌ App: Initialization error:', err);
                try {
                    if (err?.response?.status === 401) {
                        await authService.clearTokens();
                        if (auth?.logout && typeof auth.logout === 'function') {
                            auth.logout();
                        }
                    }
                } catch (cleanupError) {
                    console.error('❌ App: Cleanup error:', cleanupError);
                }
            }
        };

        // Инициализация в фоне без блокировки UI
        initializeApp();
    }, [auth, dispatch]);

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Button
                    title="Повторить"
                    onPress={() => {
                        setError(null);
                        hasInitialized.current = false;
                    }}
                />
            </View>
        );
    }

    return children;
};

const AppContent = () => {
    useEffect(() => {
        // В продакшене полностью отключаем загрузку шрифтов
        // Система будет использовать системные fallback шрифты
        if (!__DEV__) {
            console.log('ℹ️ App: Font loading disabled in production - using system fonts');
            return;
        }

        // Загрузка шрифтов только в DEV режиме
        async function loadFonts() {
            try {
                const fontMap = {};

                // Безопасная загрузка каждого шрифта
                try {
                    const bezierSans = require('../assets/fonts/BezierSans_Regular.ttf');
                    if (bezierSans !== undefined && bezierSans !== null && bezierSans !== 'undefined') {
                        const font = bezierSans.default || bezierSans;
                        if (font !== undefined && font !== null && font !== 'undefined') {
                            fontMap['BezierSans'] = font;
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ BezierSans font not found (non-critical):', e?.message || e);
                }

                try {
                    const sfProText = require('../assets/fonts/SFProText-Regular.ttf');
                    if (sfProText !== undefined && sfProText !== null && sfProText !== 'undefined') {
                        const font = sfProText.default || sfProText;
                        if (font !== undefined && font !== null && font !== 'undefined') {
                            fontMap['SFProText'] = font;
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ SFProText font not found (non-critical):', e?.message || e);
                }

                try {
                    const sfProDisplay = require('../assets/fonts/SF-Pro-Display-Regular.otf');
                    if (sfProDisplay !== undefined && sfProDisplay !== null && sfProDisplay !== 'undefined') {
                        const font = sfProDisplay.default || sfProDisplay;
                        if (font !== undefined && font !== null && font !== 'undefined') {
                            fontMap['SF Pro Display'] = font;
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ SF Pro Display font not found (non-critical):', e?.message || e);
                }

                try {
                    const sfProDisplayMedium = require('../assets/fonts/SF-Pro-Display-Medium.otf');
                    if (sfProDisplayMedium !== undefined && sfProDisplayMedium !== null && sfProDisplayMedium !== 'undefined') {
                        const font = sfProDisplayMedium.default || sfProDisplayMedium;
                        if (font !== undefined && font !== null && font !== 'undefined') {
                            fontMap['SFProDisplayMedium'] = font;
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ SFProDisplayMedium font not found (non-critical):', e?.message || e);
                }

                // Проверяем валидность шрифтов
                const validFonts = Object.keys(fontMap).filter(key => {
                    const font = fontMap[key];
                    if (font === undefined || font === null) return false;
                    if (typeof font === 'string' && font === 'undefined') return false;
                    return true;
                });

                if (validFonts.length > 0 && Font && typeof Font.loadAsync === 'function') {
                    try {
                        const validFontMap = {};
                        validFonts.forEach(key => {
                            const font = fontMap[key];
                            if (font !== undefined && font !== null && font !== 'undefined') {
                                validFontMap[key] = font;
                            }
                        });
                        
                        const finalValidFonts = Object.keys(validFontMap);
                        if (finalValidFonts.length > 0) {
                            await Font.loadAsync(validFontMap);
                            console.log(`✅ App: ${finalValidFonts.length} font(s) loaded in DEV mode`);
                        }
                    } catch (fontLoadError) {
                        console.error('❌ App: Font.loadAsync error (non-critical):', fontLoadError);
                    }
                }
            } catch (e) {
                console.error('❌ App: Font loading error (non-critical):', e);
            }
        }

        loadFonts().catch(err => {
            console.error('❌ App: Unexpected error in loadFonts (non-critical):', err);
        });
    }, []);

    // Сразу показываем навигатор - все загрузки происходят в фоне во время SplashScreen
    return (
        <AppInitializer>
            <AppNavigator/>
        </AppInitializer>
    );
};

export default function App() {
    // Безопасная обертка для PersistGate
    const SafePersistGate = ({ children }) => {
        try {
            if (!persistor) {
                console.warn('⚠️ App: Persistor not available, skipping PersistGate');
                return children;
            }
            
            return (
                <PersistGate
                    loading={null}
                    persistor={persistor}
                >
                    {children}
                </PersistGate>
            );
        } catch (error) {
            console.error('❌ App: PersistGate error:', error);
            // В случае ошибки показываем children без PersistGate
            return children;
        }
    };

    return (
        <ErrorBoundary>
            <GestureHandlerRootView style={{flex: 1}}>
                <SafeAreaProvider>
                    <AppProviders>
                        <SafePersistGate>
                            <AppContent/>
                        </SafePersistGate>
                    </AppProviders>
                </SafeAreaProvider>
                {/* ToastContainer на самом верхнем уровне для отображения поверх всех модальных окон */}
                {/* CustomAlertContainer теперь внутри AppProviders для доступа к контексту */}
                <ToastContainer/>
            </GestureHandlerRootView>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f8f8',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#d32f2f',
        textAlign: 'center',
    },
    errorText: {
        textAlign: 'center',
        marginBottom: 20,
        fontSize: 16,
        color: '#666',
        lineHeight: 22,
    },
});