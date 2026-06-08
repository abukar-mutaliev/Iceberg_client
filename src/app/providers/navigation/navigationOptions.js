import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { CardStyleInterpolators } from '@react-navigation/stack';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import {
    cardStackTransition,
    productChainTransition,
    slideFromRight,
} from './transitionConfigs';

export const COMMON_CARD_STYLE = {
    backgroundColor: '#ffffff',
    ...Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: -3, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
        },
        android: {
            elevation: 6,
        },
    }),
};

export const createScreenOptions = (options = {}) => ({
    ...slideFromRight,
    headerShown: false,
    cardStyle: COMMON_CARD_STYLE,
    ...options,
});

export const PRODUCT_DETAIL_CARD_STYLE = {
    backgroundColor: '#ffffff',
    ...Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: -3, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
        },
        android: {
            elevation: 8,
        },
    }),
};

export const createProductDetailScreenOptions = (extra = {}) => ({ route }) => {
    const isProductChain = (route?.params?.productHistory?.length ?? 0) > 0;
    return createScreenOptions({
        ...(isProductChain ? productChainTransition : cardStackTransition),
        unmountOnBlur: false,
        freezeOnBlur: true,
        gestureEnabled: !isProductChain,
        ...(Platform.OS === 'ios' && !isProductChain
            ? { cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }
            : {}),
        cardStyle: PRODUCT_DETAIL_CARD_STYLE,
        ...extra,
    });
};

export const useThemedCardStyle = (variant = 'default') => {
    const { isDark, colors } = useTheme();
    return useMemo(() => {
        const bg = isDark ? colors.background : '#ffffff';
        if (variant === 'productDetail') {
            return {
                backgroundColor: bg,
                ...Platform.select({
                    ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: -3, height: 0 },
                        shadowOpacity: isDark ? 0.5 : 0.3,
                        shadowRadius: 8,
                    },
                    android: { elevation: isDark ? 0 : 8 },
                }),
            };
        }
        return {
            backgroundColor: bg,
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: -3, height: 0 },
                    shadowOpacity: isDark ? 0.5 : 0.25,
                    shadowRadius: 6,
                },
                android: { elevation: isDark ? 0 : 6 },
            }),
        };
    }, [isDark, colors.background, variant]);
};

export const useCreateScreenOptions = () => {
    const themedCardStyle = useThemedCardStyle('default');
    return useCallback((options = {}) => {
        const { cardStyle: overrideCardStyle, ...rest } = options;
        return {
            ...slideFromRight,
            headerShown: false,
            ...rest,
            cardStyle: overrideCardStyle
                ? { ...themedCardStyle, ...overrideCardStyle }
                : themedCardStyle,
        };
    }, [themedCardStyle]);
};

export const useCreateProductDetailScreenOptions = () => {
    const baseCreate = useCreateScreenOptions();
    const productCardStyle = useThemedCardStyle('productDetail');
    return useCallback((extra = {}) => ({ route }) => {
        const isProductChain = (route?.params?.productHistory?.length ?? 0) > 0;
        return baseCreate({
            ...(isProductChain ? productChainTransition : cardStackTransition),
            unmountOnBlur: false,
            freezeOnBlur: true,
            gestureEnabled: !isProductChain,
            ...(Platform.OS === 'ios' && !isProductChain
                ? { cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS }
                : {}),
            cardStyle: productCardStyle,
            ...extra,
        });
    }, [baseCreate, productCardStyle]);
};
