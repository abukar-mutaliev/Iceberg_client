import { CardStyleInterpolators } from '@react-navigation/stack';
import { Platform } from 'react-native';

/**
 * Коллекция настраиваемых анимаций переходов для навигации
 */

// Стандартный переход справа налево (как в iOS)
export const slideFromRight = {
    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
    headerStyleInterpolator: CardStyleInterpolators.forFade,
    transitionSpec: {
        open: {
            animation: 'timing',
            config: {
                duration: 300,
            },
        },
        close: {
            animation: 'timing',
            config: {
                duration: 300,
            },
        },
    },
    gestureEnabled: Platform.OS === 'ios',
    gestureDirection: 'horizontal',
};

// Переход с появлением экрана (затухание)
export const fadeIn = {
    cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
    headerStyleInterpolator: CardStyleInterpolators.forFade,
    transitionSpec: {
        open: {
            animation: 'timing',
            config: {
                duration: 400,
            },
        },
        close: {
            animation: 'timing',
            config: {
                duration: 300,
            },
        },
    },
    gestureEnabled: false,
};

// Модальный переход снизу вверх (как в iOS)
export const modalSlideFromBottom = {
    cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
    headerStyleInterpolator: CardStyleInterpolators.forFade,
    gestureEnabled: true,
    gestureDirection: 'vertical',
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
            },
        },
        close: {
            animation: 'timing',
            config: {
                duration: 600,
            },
        },
    },
    gestureEnabled: false,
};

// Переход со смещением снизу
export const slideFromBottom = {
    cardStyleInterpolator: CardStyleInterpolators.forBottomSheetAndroid,
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
            },
        },
    },
    gestureEnabled: true,
    gestureDirection: 'vertical',
};

export const defaultScreenOptions = {
    headerShown: false,
    ...slideFromRight,
    cardStyle: { backgroundColor: 'white' },
    ...(Platform.OS === 'ios' && {
        gestureEnabled: true,
        gestureResponseDistance: {
            horizontal: 50,
        },
    }),
};