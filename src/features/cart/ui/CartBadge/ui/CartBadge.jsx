import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated
} from 'react-native';
import {
    useCartStats,
    useClientType
} from '@entities/cart';
import {
    Color,
    FontFamily
} from '@app/styles/GlobalStyles';

const normalize = (size) => {
    const scale = 440 / 440;
    return Math.round(size * scale);
};

export const CartBadge = ({ onPress, style, showExtended = false }) => {
    const {
        totalBoxes,
        totalItems,
        totalAmount,
        totalSavings,
        isEmpty
    } = useCartStats();

    const {
        isWholesale
    } = useClientType();

    const scaleAnim = React.useRef(new Animated.Value(1)).current;
    const [prevBoxesCount, setPrevBoxesCount] = React.useState(totalBoxes);

    // Анимация при изменении количества коробок
    React.useEffect(() => {
        if (totalBoxes !== prevBoxesCount) {
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.3,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
            setPrevBoxesCount(totalBoxes);
        }
    }, [totalBoxes, prevBoxesCount]);

    if (isEmpty) {
        return null;
    }

    const formatDisplayPrice = (price) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(price);
    };

    const getBoxesText = (count) => {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;
        
        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
            return 'коробок';
        }
        
        switch (lastDigit) {
            case 1:
                return 'коробка';
            case 2:
            case 3:
            case 4:
                return 'коробки';
            default:
                return 'коробок';
        }
    };

    const getItemsText = (count) => {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;

        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
            return `${count} товаров`;
        }

        switch (lastDigit) {
            case 1: return `${count} товар`;
            case 2:
            case 3:
            case 4: return `${count} товара`;
            default: return `${count} товаров`;
        }
    };

    return (
        <View style={style}>
            <TouchableOpacity
                style={[
                    badgeStyles.container,
                    isWholesale && badgeStyles.containerWholesale
                ]}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <View style={badgeStyles.content}>
                    {/* Иконка корзины с бейджем */}
                    <View style={badgeStyles.iconContainer}>
                        <Text style={badgeStyles.cartIcon}>🛒</Text>
                        <Animated.View
                            style={[
                                badgeStyles.badge,
                                { transform: [{ scale: scaleAnim }] }
                            ]}
                        >
                            <Text style={badgeStyles.badgeText}>
                                {totalItems > 99 ? '99+' : totalItems}
                            </Text>
                        </Animated.View>
                    </View>

                    {/* Информация о корзине */}
                    <View style={badgeStyles.info}>
                        <View style={badgeStyles.topRow}>
                            <Text style={badgeStyles.itemsText}>
                                {getItemsText(totalItems)}
                            </Text>

                            {/* Показываем тип клиента */}
                            {isWholesale && (
                                <View style={badgeStyles.clientTypeBadge}>
                                    <Text style={badgeStyles.clientTypeText}>ОПТ</Text>
                                </View>
                            )}
                        </View>

                        <Text style={badgeStyles.amountText}>
                            {formatDisplayPrice(totalAmount)}
                        </Text>

                        {/* Расширенная информация */}
                        {showExtended && (
                            <View style={badgeStyles.extendedInfo}>
                                {/* Показываем экономию для оптовых клиентов */}
                                {isWholesale && totalSavings > 0 && (
                                    <Text style={badgeStyles.savingsText}>
                                        💰 Экономия: {formatDisplayPrice(totalSavings)}
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Стрелка перехода */}
                    <View style={badgeStyles.arrowContainer}>
                        <Text style={badgeStyles.arrow}>→</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
};

const badgeStyles = StyleSheet.create({
    container: {
        backgroundColor: Color.background || '#FFFFFF',
        borderRadius: normalize(12),
        padding: normalize(16),
        marginHorizontal: normalize(16),
        marginBottom: normalize(12),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(193, 199, 222, 0.20)',
    },

    containerWholesale: {
        borderColor: '#3339B0',
        borderWidth: 2,
        backgroundColor: 'rgba(51, 57, 176, 0.02)',
    },

    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    iconContainer: {
        position: 'relative',
        marginRight: normalize(12),
    },

    cartIcon: {
        fontSize: normalize(24),
    },

    badge: {
        position: 'absolute',
        top: normalize(-8),
        right: normalize(-8),
        backgroundColor: '#FF3B30',
        borderRadius: normalize(12),
        minWidth: normalize(24),
        height: normalize(24),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Color.background || '#FFFFFF',
    },

    badgeText: {
        color: Color.background || '#FFFFFF',
        fontSize: normalize(12),
        fontWeight: '700',
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
    },

    info: {
        flex: 1,
    },

    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: normalize(4),
    },

    itemsText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: 'rgba(60, 60, 67, 0.60)',
        fontWeight: '500',
    },

    clientTypeBadge: {
        backgroundColor: '#3339B0',
        paddingHorizontal: normalize(6),
        paddingVertical: normalize(2),
        borderRadius: normalize(4),
    },

    clientTypeText: {
        color: '#FFFFFF',
        fontSize: normalize(10),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '700',
    },

    amountText: {
        fontSize: normalize(18),
        fontWeight: '700',
        fontFamily: FontFamily.sFProDisplay || 'SF Pro Display',
        color: '#3339B0',
        marginBottom: normalize(4),
    },

    extendedInfo: {
        marginTop: normalize(4),
    },

    savingsText: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: '#34C759',
        fontWeight: '600',
        marginBottom: normalize(2),
    },

    arrowContainer: {
        marginLeft: normalize(8),
    },

    arrow: {
        color: '#3339B0',
        fontSize: normalize(20),
        fontWeight: '600',
    }
});