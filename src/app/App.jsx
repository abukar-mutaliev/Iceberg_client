import React, {useEffect, useState, useRef} from 'react';
import {View, ActivityIndicator, Text, Button, StyleSheet, Animated} from 'react-native';
import {AppNavigator} from '@app/providers/navigation/AppNavigator';
import * as Font from 'expo-font';
import {AppProviders} from './providers';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useAuth} from "@entities/auth/hooks/useAuth";
import {authService} from "@shared/api/api";
import {PersistGate} from "redux-persist/integration/react";
import {persistor} from "@app/store/store";
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {initConsolePolyfill} from '@shared/lib/consolePolyfill';
import {testNetworkConnection} from '@shared/api/api';
import {useChatSocket} from '@entities/chat/hooks/useChatSocket';

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
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (hasInitialized.current) return;

        const initializeApp = async () => {
            hasInitialized.current = true;
            console.log('🚀 Начинаем инициализацию приложения...');

            try {
                setLoadingText("Проверка подключения к серверу...");
                // Тестируем подключение к серверу

                try {
                    const networkResult = await testNetworkConnection();

                    if (!networkResult) {
                        console.warn('Сервер недоступен, продолжаем без проверки');
                        // Не блокируем инициализацию, если сервер недоступен
                    }

                } catch (networkError) {
                    console.warn('Ошибка подключения к серверу:', networkError.message);
                    // Не блокируем инициализацию при ошибках сети
                }

                setLoadingText("Проверка аутентификации...");
                // Инициализация аутентификации
                const initialized = await authService.initializeAuth();

                if (!initialized) {
                    console.log('Auth service не инициализирован, продолжаем');
                    setIsInitializing(false);
                    return;
                }

                setLoadingText("Проверка токенов...");
                // Проверяем токены
                const tokens = await authService.getStoredTokens();

                if (!tokens || !tokens.refreshToken) {
                    console.log('Токены не найдены, пользователь не авторизован');
                    setIsInitializing(false);
                    return;
                }

                setLoadingText("Валидация сессии...");
                const accessTokenValid = tokens.accessToken ? authService.isTokenValid(tokens.accessToken) : false;
                const refreshTokenValid = tokens.refreshToken ? authService.isTokenValid(tokens.refreshToken) : false;

                if (!refreshTokenValid) {
                    setLoadingText("Очистка данных...");
                    console.log('Refresh token недействителен, очищаем данные');
                    await authService.clearTokens();
                    logout();
                    setIsInitializing(false);
                    return;
                }

                if (!accessTokenValid && refreshTokenValid) {
                    setLoadingText("Обновление токена...");
                    try {
                        console.log('Обновляем access token');
                        await refreshToken();
                    } catch (refreshError) {
                        console.log('Ошибка обновления токена:', refreshError.message);
                        await authService.clearTokens();
                        logout();
                    }
                }

                setLoadingText("Завершение...");
                console.log('Инициализация приложения завершена успешно');
            } catch (err) {
                console.error('Ошибка инициализации приложения:', err);

                if (err.response && err.response.status === 401) {
                    console.log('Получен 401, очищаем токены');
                    await authService.clearTokens();
                    logout();
                } else {
                    console.warn('Ошибка сети при инициализации, продолжаем работу');
                    // Не блокируем приложение при сетевых ошибках
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

// Основной контент приложения
const AppContent = () => {
    const [fontsLoaded, setFontsLoaded] = useState(__DEV__ ? false : true);
    
    // Инициализируем WebSocket подключение для чата глобально
    useChatSocket();

    useEffect(() => {
        if (!__DEV__) {
            setFontsLoaded(true);
            return;
        }

        async function loadFonts() {
            try {
                console.log('Начинаем загрузку шрифтов...');

                // Динамически импортируем шрифты только в development режиме
                const fontMap = {};

                try {
                    fontMap['BezierSans'] = require('../assets/fonts/BezierSans_Regular.ttf');
                } catch (e) {
                    console.log('BezierSans font не найден');
                }

                try {
                    fontMap['SFProText'] = require('../assets/fonts/SFProText-Regular.ttf');
                } catch (e) {
                    console.log('SFProText font не найден');
                }

                try {
                    fontMap['SF Pro Display'] = require('../assets/fonts/SF-Pro-Display-Regular.otf');
                } catch (e) {
                    console.log('SF Pro Display font не найден');
                }

                try {
                    fontMap['SFProDisplayMedium'] = require('../assets/fonts/SF-Pro-Display-Medium.otf');
                } catch (e) {
                    console.log('SFProDisplayMedium font не найден');
                }

                // Загружаем только те шрифты, которые успешно найдены
                if (Object.keys(fontMap).length > 0) {
                    console.log(`Загружаем ${Object.keys(fontMap).length} шрифтов...`);
                    await Font.loadAsync(fontMap);
                    console.log('Шрифты загружены успешно');
                } else {
                    console.log('Шрифты для загрузки не найдены');
                }

                setFontsLoaded(true);
            } catch (e) {
                console.warn('Ошибка загрузки шрифтов:', e.message);
                // Продолжаем без кастомных шрифтов
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
            </GestureHandlerRootView>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    // Кастомный экран загрузки
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
        fontFamily: __DEV__ ? 'System' : 'System',
    },

    // Старые стили для совместимости
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f9ff',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#333',
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