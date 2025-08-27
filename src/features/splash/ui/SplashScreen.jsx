import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Animated, View, Dimensions, Platform, Image } from 'react-native';
import Text from '@shared/ui/Text/Text';

// Безопасная функция для получения шрифта
const getSafeFont = () => {
    if (__DEV__) {
        // В development режиме пытаемся использовать кастомный шрифт
        return 'BezierSans';
    } else {
        // В production используем платформенные шрифты
        return Platform.select({
            ios: 'System',
            android: 'Roboto',
            default: 'System'
        });
    }
};

export const SplashScreen = () => {
    const navigation = useNavigation();

    const [logoScale] = useState(new Animated.Value(1));
    const [logoPosition] = useState(new Animated.Value(100));
    const [textOpacity] = useState(new Animated.Value(0));
    const [textPosition] = useState(new Animated.Value(50));

    const { height } = Dimensions.get('window');

    const RenderLogo = () => {
        try {
            // Используем качественный PNG логотип
            return (
                <Image
                    source={require('@assets/logo/logo.png')}
                    style={{
                        width: 296,
                        height: 252,
                        resizeMode: 'contain',
                    }}
                />
            );
        } catch (error) {
            console.error('Error loading PNG logo:', error);
            // Fallback на простой логотип
            return (
                <View style={{ 
                    width: 296, 
                    height: 252, 
                    backgroundColor: '#3339B0',
                    borderRadius: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#3339B0',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3,
                    shadowRadius: 16,
                    elevation: 8,
                }}>
                    <Text style={{ fontSize: 48, color: '#fff' }}>🍦</Text>
                </View>
            );
        }
    };

    useEffect(() => {
        Animated.sequence([
            Animated.delay(1000),

            Animated.timing(logoPosition, {
                toValue: -height * 0.90, // Поднимаем наверх, примерно на 1/4 высоты экрана
                duration: 1500,
                useNativeDriver: true,
            }),
        ]).start();

        // Анимация масштабирования логотипа (уменьшение размера)
        Animated.timing(logoScale, {
            toValue: 0.3, // Уменьшаем размер логотипа при поднятии вверх
            duration: 1500,
            delay: 1000, // Начинаем одновременно с движением вверх
            useNativeDriver: true,
        }).start();

        // Анимация появления текста
        Animated.sequence([
            // Задержка до появления текста (чтобы логотип успел подняться)
            Animated.delay(1500),

            // Появление текста с движением снизу вверх
            Animated.parallel([
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(textPosition, {
                    toValue: -height * 0.2,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]),

            // Задержка перед исчезновением текста
            Animated.delay(2000),

            // Исчезновение текста
            Animated.timing(textOpacity, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();

        // Задержка перед переходом на Welcome экран
        const timer = setTimeout(() => {
            navigation.replace('Welcome');
        }, 3000); // Уменьшаем время до 3 секунд

        // Очистка таймера при размонтировании компонента
        return () => clearTimeout(timer);
    }, [navigation, logoScale, logoPosition, textOpacity, textPosition, height]);

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: 'white',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            {/* Анимированный логотип */}
            <Animated.View
                style={{
                    transform: [
                        { scale: logoScale },
                        { translateY: logoPosition },
                    ],
                }}
            >
                <RenderLogo />
            </Animated.View>

            {/* Анимированный текст */}
            <Animated.Text
                style={{
                    opacity: textOpacity,
                    transform: [{ translateY: textPosition }],
                    fontSize: 26,
                    fontWeight: '600',
                    color: '#3339B0',
                    textAlign: 'center',
                    fontFamily: getSafeFont(),
                    marginTop: 100, // Больше места для текста под логотипом
                    letterSpacing: 0.5,
                    lineHeight: 34,
                    shadowColor: '#3339B0',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                }}
            >
                Добро пожаловать{'\n'}в Айсберг
            </Animated.Text>
        </View>
    );
};