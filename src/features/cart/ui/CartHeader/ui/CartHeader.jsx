import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions
} from 'react-native';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

const normalize = (size) => {
    const scale = screenWidth / 440;
    return Math.round(size * scale);
};

export const CartHeader = ({ itemsCount = 0 }) => {
    const { colors, isDark } = useTheme();
    const headerStyles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    return (
        <View style={headerStyles.container}>
            {/* Градиентный фон (эмуляция) */}
            <View style={headerStyles.gradientBackground} />
            
            {/* Контент заголовка */}
            <View style={headerStyles.content}>
                {/* Иконка корзины с badge */}
                <View style={headerStyles.iconContainer}>
                    <View style={headerStyles.cartIconWrapper}>
                        <Text style={headerStyles.cartIcon}>🛒</Text>
                        {itemsCount > 0 && (
                            <View style={headerStyles.badge}>
                                <Text style={headerStyles.badgeText}>
                                    {itemsCount > 99 ? '99+' : itemsCount}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Текстовая часть */}
                <View style={headerStyles.textContainer}>
                    <Text style={headerStyles.title}>Корзина</Text>
                    {itemsCount > 0 && (
                        <Text style={headerStyles.subtitle}>
                            {itemsCount} {getItemsText(itemsCount)}
                        </Text>
                    )}
                </View>
            </View>

            {/* Декоративные элементы */}
            <View style={headerStyles.decorativeCircle1} />
            <View style={headerStyles.decorativeCircle2} />
        </View>
    );
};

// Вспомогательная функция для склонения слова "товар"
const getItemsText = (count) => {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return 'товаров';
    }
    
    switch (lastDigit) {
        case 1:
            return 'товар';
        case 2:
        case 3:
        case 4:
            return 'товара';
        default:
            return 'товаров';
    }
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        paddingHorizontal: normalize(20),
        paddingTop: normalize(20),
        paddingBottom: normalize(15),
        borderBottomLeftRadius: normalize(24),
        borderBottomRightRadius: normalize(24),
        shadowColor: colors.primary,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: isDark ? 0.25 : 0.1,
        shadowRadius: 12,
        elevation: 8,
        position: 'relative',
        overflow: 'hidden',
    },

    gradientBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.surface,
        opacity: 1,
    },

    content: {
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 2,
    },

    iconContainer: {
        marginRight: normalize(16),
    },

    cartIconWrapper: {
        width: normalize(56),
        height: normalize(56),
        borderRadius: normalize(28),
        backgroundColor: isDark ? colors.surfaceSecondary : colors.primary + '1A',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        borderWidth: 2,
        borderColor: colors.primary,
    },

    cartIcon: {
        fontSize: normalize(28),
    },

    badge: {
        position: 'absolute',
        top: normalize(-4),
        right: normalize(-4),
        backgroundColor: colors.error,
        borderRadius: normalize(12),
        minWidth: normalize(24),
        height: normalize(24),
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: normalize(6),
        borderWidth: 2,
        borderColor: colors.surface,
        shadowColor: colors.error,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },

    badgeText: {
        color: colors.textInverse,
        fontSize: normalize(11),
        fontWeight: '700',
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        includeFontPadding: false,
    },

    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },

    title: {
        fontSize: normalize(28),
        fontWeight: '700',
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        color: colors.textPrimary,
        marginBottom: normalize(2),
        letterSpacing: -0.5,
    },

    subtitle: {
        fontSize: normalize(15),
        fontWeight: '500',
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
    },

    // Декоративные элементы
    decorativeCircle1: {
        position: 'absolute',
        top: normalize(-30),
        right: normalize(-20),
        width: normalize(100),
        height: normalize(100),
        borderRadius: normalize(50),
        backgroundColor: colors.primary + '14',
        zIndex: 1,
    },

    decorativeCircle2: {
        position: 'absolute',
        bottom: normalize(-20),
        left: normalize(-30),
        width: normalize(80),
        height: normalize(80),
        borderRadius: normalize(40),
        backgroundColor: colors.error + '14',
        zIndex: 1,
    },
});