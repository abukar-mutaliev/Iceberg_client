import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Animated, View, Text, Dimensions } from 'react-native';
import LogoSvg from '@/assets/logo/Logo';

export const SplashScreen = () => {
    const navigation = useNavigation();

    const [logoScale] = useState(new Animated.Value(1));
    const [logoPosition] = useState(new Animated.Value(100));
    const [textOpacity] = useState(new Animated.Value(0));
    const [textPosition] = useState(new Animated.Value(50));

    const { height } = Dimensions.get('window');

    const RenderLogo = () => {
        try {
            return <LogoSvg width={296} height={252} />;
        } catch (error) {
            console.error('Error rendering logo:', error);
            return <View style={{ width: 296, height: 252, backgroundColor: '#3339B0' }} />;
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

        // Задержка перед переходом на другой экран
        const timer = setTimeout(() => {
            navigation.replace('Welcome');
        }, 4500);

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
                    fontSize: 24,
                    color: '#3339B0',
                    textAlign: 'center',
                    fontFamily: 'BezierSans',
                    marginTop: 100, // Больше места для текста под логотипом
                }}
            >
                Добро пожаловать{'\n'}в Айсберг
            </Animated.Text>
        </View>
    );
};