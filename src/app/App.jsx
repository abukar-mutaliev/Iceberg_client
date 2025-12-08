import React, {useEffect, useState, useRef} from 'react';
import {View, ActivityIndicator, Text, Button, StyleSheet, Animated, Platform} from 'react-native';
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

initConsolePolyfill();


class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error });
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>Что-то пошло не так!</Text>
                    <Text style={styles.errorText}>
                        Произошла ошибка в приложении. Попробуйте перезапустить.
                    </Text>
                    <Button
                        title="Перезагрузить приложение"
                        onPress={() => this.setState({ hasError: false, error: null })}
                    />
                </View>
            );
        }

        return this.props.children;
    }
}

const CustomLoadingScreen = ({ loadingText = "Загрузка..." }) => {
    const [logoScale] = useState(new Animated.Value(0.8));
    const [logoOpacity] = useState(new Animated.Value(0));
    const [textOpacity] = useState(new Animated.Value(0));

    useEffect(() => {
        // Анимация появления логотипа
        Animated.sequence([
            Animated.parallel([
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(logoScale, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]),
            Animated.delay(200),
            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const RenderLogo = () => {
        try {
            const LogoSvg = require('@assets/logo/Logo').default;
            return <LogoSvg width={120} height={102} />;
        } catch (error) {
            return (
                <View style={styles.logoFallback}>
                    <Text style={styles.logoText}>🍦</Text>
                </View>
            );
        }
    };

    return (
        <View style={styles.customLoadingContainer}>
            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        opacity: logoOpacity,
                        transform: [{ scale: logoScale }],
                    },
                ]}
            >
                <RenderLogo />
            </Animated.View>

            <Animated.View
                style={[
                    styles.loadingTextContainer,
                    { opacity: textOpacity },
                ]}
            >
                <Text style={styles.customLoadingText}>{loadingText}</Text>
                <ActivityIndicator size="small" color="#3339B0" style={{ marginTop: 10 }} />
            </Animated.View>
        </View>
    );
};

const AppInitializer = ({children}) => {
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState(null);
    const [loadingText, setLoadingText] = useState("Инициализация...");
    const {refreshToken, logout} = useAuth();
    const dispatch = useDispatch();
    const hasInitialized = useRef(false);

    usePushTokenAutoRegistration();
    useChatSocket();


    useEffect(() => {
        if (hasInitialized.current) return;

        const initializeApp = async () => {
            hasInitialized.current = true;

            try {
                setLoadingText("Проверка подключения к серверу...");

                try {
                    await testNetworkConnection();
                } catch (networkError) {
                    // Не блокируем инициализацию при ошибках сети
                }

                setLoadingText("Проверка аутентификации...");
                const initialized = await authService.initializeAuth();

                if (!initialized) {
                    setIsInitializing(false);
                    return;
                }

                setLoadingText("Проверка токенов...");
                const tokens = await authService.getStoredTokens();

                if (!tokens || !tokens.refreshToken) {
                    setIsInitializing(false);
                    return;
                }

                setLoadingText("Валидация сессии...");
                const accessTokenValid = tokens.accessToken ? authService.isTokenValid(tokens.accessToken) : false;
                const refreshTokenValid = tokens.refreshToken ? authService.isTokenValid(tokens.refreshToken) : false;

                console.log('🔍 Token validation:', {
                    hasAccessToken: !!tokens.accessToken,
                    hasRefreshToken: !!tokens.refreshToken,
                    accessTokenValid,
                    refreshTokenValid
                });

                if (!refreshTokenValid) {
                    console.log('⚠️ Refresh token expired, need to re-login');
                    setLoadingText("Сессия истекла...");
                    // Сбрасываем состояние Redux и очищаем токены
                    dispatch({ type: 'auth/resetState' });
                    await authService.clearTokens();
                    setIsInitializing(false);
                    return;
                }

                if (!accessTokenValid && refreshTokenValid) {
                    setLoadingText("Обновление токена...");
                    try {
                        const result = await refreshToken();
                        if (result && !result.error) {
                            console.log('✅ App: Token refreshed successfully on initialization');
                        } else {
                            console.warn('⚠️ App: Token refresh returned error:', result?.error || result);
                            await authService.clearTokens();
                            setIsInitializing(false);
                            return;
                        }
                    } catch (refreshError) {
                        console.error('❌ App: Failed to refresh token on initialization:', refreshError?.message || refreshError);
                        await authService.clearTokens();
                        setIsInitializing(false);
                        return;
                    }
                }

                setLoadingText("Инициализация push-уведомлений...");
                try {
                    const pushService = await import('@shared/services/PushNotificationService');
                    await pushService.default.initialize();
                    console.log('✅ App: Push notifications initialized successfully');
                } catch (pushError) {
                    console.warn('⚠️ App: Push notification initialization failed (non-critical):', pushError?.message || pushError);
                    // Ошибка инициализации push-уведомлений не критична - продолжаем работу
                }

                setLoadingText("Завершение...");
            } catch (err) {
                if (err.response && err.response.status === 401) {
                    await authService.clearTokens();
                    logout();
                }
            } finally {
                setIsInitializing(false);
            }
        };

        initializeApp();
    }, [refreshToken, logout]);

    if (isInitializing) {
        return <CustomLoadingScreen loadingText={loadingText} />;
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Button
                    title="Повторить"
                    onPress={() => {
                        setError(null);
                        hasInitialized.current = false;
                        setIsInitializing(true);
                    }}
                />
            </View>
        );
    }

    return children;
};

const AppContent = () => {
    // Отключаем загрузку шрифтов в production/preview сборках для стабильности
    const [fontsLoaded, setFontsLoaded] = useState(__DEV__ ? false : true);

    useEffect(() => {
        // Загружаем шрифты только в dev режиме (Expo Go)
        if (!__DEV__) {
            setFontsLoaded(true);
            return;
        }

        async function loadFonts() {
            try {
                const fontMap = {};

                try {
                    const font = require('../assets/fonts/BezierSans_Regular.ttf');
                    if (font !== undefined && font !== null) {
                        fontMap['BezierSans'] = font;
                    }
                } catch (e) {
                    console.log('BezierSans font not found:', e.message);
                }

                try {
                    const font = require('../assets/fonts/SFProText-Regular.ttf');
                    if (font !== undefined && font !== null) {
                        fontMap['SFProText'] = font;
                    }
                } catch (e) {
                    console.log('SFProText font not found:', e.message);
                }

                try {
                    const font = require('../assets/fonts/SF-Pro-Display-Regular.otf');
                    if (font !== undefined && font !== null) {
                        fontMap['SF Pro Display'] = font;
                    }
                } catch (e) {
                    console.log('SF Pro Display font not found:', e.message);
                }

                try {
                    const font = require('../assets/fonts/SF-Pro-Display-Medium.otf');
                    if (font !== undefined && font !== null) {
                        fontMap['SFProDisplayMedium'] = font;
                    }
                } catch (e) {
                    console.log('SFProDisplayMedium font not found:', e.message);
                }

                if (Object.keys(fontMap).length > 0) {
                    console.log('Loading fonts:', Object.keys(fontMap));
                    await Font.loadAsync(fontMap);
                    console.log('Fonts loaded successfully');
                } else {
                    console.log('No fonts to load, using system fonts');
                }

                setFontsLoaded(true);
            } catch (e) {
                console.error('Error loading fonts:', e.message);
                // В случае ошибки все равно продолжаем с системными шрифтами
                setFontsLoaded(true);
            }
        }

        loadFonts();
    }, []);

    if (!fontsLoaded) {
        return <CustomLoadingScreen loadingText="Загрузка шрифтов..." />;
    }

    return (
        <AppInitializer>
            <AppNavigator/>
        </AppInitializer>
    );
};

export default function App() {
    return (
        <ErrorBoundary>
            <GestureHandlerRootView style={{flex: 1}}>
                <SafeAreaProvider>
                    <AppProviders>
                        <PersistGate
                            loading={<CustomLoadingScreen loadingText="Загрузка данных..." />}
                            persistor={persistor}
                        >
                            <AppContent/>
                        </PersistGate>
                    </AppProviders>
                </SafeAreaProvider>
                {/* ToastContainer на самом верхнем уровне для отображения поверх всех модальных окон */}
                <ToastContainer/>
            </GestureHandlerRootView>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    customLoadingContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    logoContainer: {
        marginBottom: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoFallback: {
        width: 120,
        height: 102,
        backgroundColor: '#3339B0',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3339B0',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    logoText: {
        fontSize: 48,
        textAlign: 'center',
    },
    loadingTextContainer: {
        alignItems: 'center',
    },
    customLoadingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3339B0',
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },

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