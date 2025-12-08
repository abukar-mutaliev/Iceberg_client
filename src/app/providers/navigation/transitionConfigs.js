import { CardStyleInterpolators } from '@react-navigation/stack';
import { Platform } from 'react-native';

/**
 * Коллекция настраиваемых анимаций переходов для навигации с тенями
 */

// Стандартный переход справа налево с тенями как в iOS
// Упрощенная версия slideFromRight
export const slideFromRight = {
    cardStyleInterpolator: ({ current, next, layouts }) => {
        const translateX = current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
            extrapolate: 'clamp',
        });

        return {
            cardStyle: {
                transform: [{ translateX }],
                // Убираем сложные анимации scale и opacity
            },
            overlayStyle: {
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                opacity: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                }),
            },
        };
    },
    transitionSpec: {
        open: {
            animation: 'timing', // Заменяем spring на timing
            config: {
                duration: 300,
                useNativeDriver: true,
            },
        },
        close: {
            animation: 'timing',
            config: {
                duration: 250,
                useNativeDriver: true,
            },
        },
    },
    gestureEnabled: true,
    gestureDirection: 'horizontal',
    cardOverlayEnabled: true,
};

// Упрощенная версия fadeIn
export const fadeIn = {
    cardStyleInterpolator: ({ current }) => ({
        cardStyle: {
            opacity: current.progress,
        },
    }),
    transitionSpec: {
        open: {
            animation: 'timing',
            config: {
                duration: 200,
                useNativeDriver: true,
            },
        },
        close: {
            animation: 'timing',
            config: {
                duration: 150,
                useNativeDriver: true,
            },
        },
    },
};


export const fullScreenModal = {
    cardStyle: { backgroundColor: 'transparent' },
    cardOverlayEnabled: true,
    cardStyleInterpolator: ({ current, layouts }) => {
        return {
            cardStyle: {
                transform: [
                    {
                        translateY: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [layouts.screen.height, 0],
                            extrapolate: 'clamp',
                        }),
                    },
                ],
                ...Platform.select({
                    ios: {
                        shadowOpacity: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.4],
                            extrapolate: 'clamp',
                        }),
                        shadowRadius: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 20],
                            extrapolate: 'clamp',
                        }),
                        shadowOffset: {
                            width: 0,
                            height: -10,
                        },
                        shadowColor: '#000',
                    },
                    android: {
                        elevation: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 16],
                            extrapolate: 'clamp',
                        }),
                    },
                }),
            },
            overlayStyle: {
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                opacity: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                }),
            },
        };
    },
};

// Модальный переход снизу вверх с улучшенными тенями
export const modalSlideFromBottom = {
    cardStyleInterpolator: ({ current, next, layouts }) => {
        const translateY = current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.height, 0],
            extrapolate: 'clamp',
        });

        const scale = next
            ? next.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.92],
                extrapolate: 'clamp',
            })
            : 1;

        return {
            cardStyle: {
                transform: [
                    { translateY },
                    { scale }
                ],
                ...Platform.select({
                    ios: {
                        shadowOpacity: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.4],
                            extrapolate: 'clamp',
                        }),
                        shadowRadius: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 15],
                            extrapolate: 'clamp',
                        }),
                        shadowOffset: {
                            width: 0,
                            height: -8,
                        },
                        shadowColor: '#000',
                    },
                    android: {
                        elevation: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 12],
                            extrapolate: 'clamp',
                        }),
                    },
                }),
            },
        };
    },
    headerStyleInterpolator: CardStyleInterpolators.forFade,
    gestureEnabled: true,
    gestureDirection: 'vertical',
    cardOverlayEnabled: true,
    transitionSpec: {
        open: {
            animation: 'spring',
            config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
                useNativeDriver: true,
            },
        },
        close: {
            animation: 'spring',
            config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: true,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
                useNativeDriver: true,
            },
        },
    },
};

// Плавная анимация для экрана-заглушки
export const splashTransition = {
    cardStyleInterpolator: ({ current }) => ({
        cardStyle: {
            opacity: current.progress,
        },
    }),
    transitionSpec: {
        open: {
            animation: 'timing',
            config: {
                duration: 600,
                useNativeDriver: true,
            },
        },
        close: {
            animation: 'timing',
            config: {
                duration: 600,
                useNativeDriver: true,
            },
        },
    },
    gestureEnabled: false,
};

// Переход со смещением снизу с тенями
export const slideFromBottom = {
    cardStyleInterpolator: ({ current, next, layouts }) => {
        const translateY = current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.height, 0],
            extrapolate: 'clamp',
        });

        const scale = next
            ? next.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.94],
                extrapolate: 'clamp',
            })
            : 1;

        return {
            cardStyle: {
                transform: [
                    { translateY },
                    { scale }
                ],
                ...Platform.select({
                    ios: {
                        shadowOpacity: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.3],
                            extrapolate: 'clamp',
                        }),
                        shadowRadius: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 12],
                            extrapolate: 'clamp',
                        }),
                        shadowOffset: {
                            width: 0,
                            height: -5,
                        },
                        shadowColor: '#000',
                    },
                    android: {
                        elevation: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 8],
                            extrapolate: 'clamp',
                        }),
                    },
                }),
            },
        };
    },
    headerStyleInterpolator: CardStyleInterpolators.forFade,
    transitionSpec: {
        open: {
            animation: 'spring',
            config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: false,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
                useNativeDriver: true,
            },
        },
        close: {
            animation: 'spring',
            config: {
                stiffness: 1000,
                damping: 500,
                mass: 3,
                overshootClamping: false,
                restDisplacementThreshold: 0.01,
                restSpeedThreshold: 0.01,
                useNativeDriver: true,
            },
        },
    },
    gestureEnabled: true,
    gestureDirection: 'vertical',
    cardOverlayEnabled: true,
};

// Новая анимация для стека с улучшенным эффектом глубины
// Быстрая версия для немедленной навигации
export const cardStackTransition = {
    cardStyleInterpolator: ({ current, next, layouts }) => {
        const translateX = current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
            extrapolate: 'clamp',
        });

        // Эффект параллакса для предыдущего экрана
        const prevTranslateX = next
            ? next.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -layouts.screen.width * 0.3],
                extrapolate: 'clamp',
            })
            : 0;

        const scale = next
            ? next.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.88],
                extrapolate: 'clamp',
            })
            : 1;

        const opacity = next
            ? next.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.8],
                extrapolate: 'clamp',
            })
            : 1;

        return {
            cardStyle: {
                transform: [
                    { translateX: next ? prevTranslateX : translateX },
                    { scale },
                ],
                opacity,
                ...Platform.select({
                    ios: {
                        shadowOpacity: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.35],
                            extrapolate: 'clamp',
                        }),
                        shadowRadius: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 15],
                            extrapolate: 'clamp',
                        }),
                        shadowOffset: {
                            width: -8,
                            height: 0,
                        },
                        shadowColor: '#000',
                    },
                    android: {
                        elevation: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 10],
                            extrapolate: 'clamp',
                        }),
                    },
                }),
            },
        };
    },
    transitionSpec: {
        open: {
            animation: 'timing',
            config: {
                duration: 250,
                useNativeDriver: true,
            },
        },
        close: {
            animation: 'timing',
            config: {
                duration: 200,
                useNativeDriver: true,
            },
        },
    },
    gestureEnabled: true,
    gestureDirection: 'horizontal',
    cardOverlayEnabled: true,
    // Разрешаем прерывание анимации при навигации назад
    animationEnabled: true,
};

export const defaultScreenOptions = {
    headerShown: false,
    cardStyle: {
        backgroundColor: '#ffffff',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    animationEnabled: true,
    gestureEnabled: true,
    cardOverlayEnabled: true,
    detachPreviousScreen: false,
    freezeOnBlur: true,
    lazy: true,
};