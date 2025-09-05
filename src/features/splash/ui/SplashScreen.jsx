import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Animated, View, Dimensions, Image } from 'react-native';
import Text from '@shared/ui/Text/Text';
import { SafeFonts } from '@shared/lib/fontUtils';

export const SplashScreen = () => {
    const navigation = useNavigation();

    const [logoScale] = useState(new Animated.Value(1));
    const [logoPosition] = useState(new Animated.Value(100));
    const [textOpacity] = useState(new Animated.Value(0));
    const [textPosition] = useState(new Animated.Value(50));

    const { height } = Dimensions.get('window');

    const RenderLogo = () => {
        try {
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
                toValue: -height * 0.90,
                duration: 1500,
                useNativeDriver: true,
            }),
        ]).start();

        Animated.timing(logoScale, {
            toValue: 0.3,
            duration: 1500,
            delay: 1000,
            useNativeDriver: true,
        }).start();

        Animated.sequence([
            Animated.delay(1500),
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

            Animated.delay(2000),

            Animated.timing(textOpacity, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();

        const timer = setTimeout(() => {
            navigation.replace('Welcome');
        }, 3000);

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
                    fontFamily: SafeFonts.BezierSans,
                    marginTop: 100,
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