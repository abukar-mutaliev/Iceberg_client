import React, { memo, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Keyboard,
    Dimensions,
} from 'react-native';
import {normalize} from "@shared/lib/normalize";
import {CLIENT_TYPES, formatPrice} from "@entities/cart";
import {FontFamily} from "@app/styles/GlobalStyles";

export const CartSummary = memo(({
                                     stats,
                                     selectedCount = 0,
                                     totalCount = 0,
                                     onCheckout,
                                     disabled = false,
                                     loading = false,
                                     clientType,
                                     showSavings = false
                                 }) => {
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setKeyboardVisible(true);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidHideListener?.remove();
            keyboardDidShowListener?.remove();
        };
    }, []);

    if (!stats) {
        return null;
    }

    const {
        totalBoxes = 0,
        totalItems = 0,
        totalAmount,
        totalPrice,
        finalPrice,
        totalSavings = 0
    } = stats;

    const displayPrice = finalPrice || totalAmount || totalPrice || 0;
    const hasSelectedItems = selectedCount > 0;
    const isCheckoutDisabled = disabled || !hasSelectedItems || loading;

    const getBoxesText = (count) => {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;
        
        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
            return `${count} коробок`;
        }
        
        switch (lastDigit) {
            case 1:
                return `${count} коробка`;
            case 2:
            case 3:
            case 4:
                return `${count} коробки`;
            default:
                return `${count} коробок`;
        }
    };

    const getItemsText = (count) => {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;
        
        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
            return `${count} штук`;
        }
        
        switch (lastDigit) {
            case 1:
                return `${count} штука`;
            case 2:
            case 3:
            case 4:
                return `${count} штуки`;
            default:
                return `${count} штук`;
        }
    };

    return (
        <View style={[styles.container, isKeyboardVisible && styles.containerKeyboard]}>
            {/* Статистика заказа */}
            <View style={styles.statsContainer}>

                <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>Коробки:</Text>
                    <Text style={styles.statsValue}>{getBoxesText(totalBoxes)}</Text>
                </View>
                
                {totalItems > totalBoxes && (
                    <View style={styles.statsRow}>
                        <Text style={styles.statsLabel}>Общее количество:</Text>
                        <Text style={styles.statsValue}>{getItemsText(totalItems)}</Text>
                    </View>
                )}
                {clientType === CLIENT_TYPES.WHOLESALE && totalSavings > 0 && showSavings && (
                    <View style={styles.statsRow}>
                        <Text style={styles.statsLabelSavings}>Оптовая скидка:</Text>
                        <Text style={styles.statsValueSavings}>
                            -{formatPrice(totalSavings)}
                        </Text>
                    </View>
                )}
            </View>

            {/* Итоговая сумма и кнопка */}
            <TouchableOpacity
                style={[
                    styles.summaryContainer,
                    isCheckoutDisabled && styles.summaryContainerDisabled
                ]}
                onPress={onCheckout}
                disabled={isCheckoutDisabled}
                activeOpacity={0.8}
            >
                <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Итого:</Text>
                    <Text style={styles.totalAmount}>
                        {formatPrice(displayPrice)}
                    </Text>
                </View>

                <View style={styles.checkoutButtonContainer}>
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <Text style={styles.checkoutButtonText}>
                            К оплате
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
    },

    containerKeyboard: {
        // Add appropriate styles for the keyboard visible state
    },

    statsContainer: {
        backgroundColor: '#F8F9FF',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(12),
        borderTopWidth: 1,
        borderTopColor: 'rgba(193, 199, 222, 0.3)',
    },

    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(8),
    },

    statsLabel: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '500',
        color: '#3339B0',
    },

    statsValue: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '400',
        color: 'rgba(60, 60, 67, 0.60)',
    },

    statsLabelSavings: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '500',
        color: '#34C759',
    },

    statsValueSavings: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#34C759',
    },

    summaryContainer: {
        width: '100%',
        minHeight: normalize(64),
        backgroundColor: 'rgba(85, 0, 255, 1)',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(12),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#3339B0',
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10,
    },

    summaryContainerDisabled: {
        backgroundColor: 'rgba(51, 57, 176, 0.6)',
    },

    totalContainer: {
        flex: 1,
        marginRight: normalize(16),
    },

    totalLabel: {
        color: 'white',
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '400',
        marginBottom: normalize(4),
        opacity: 0.9,
    },

    totalAmount: {
        color: 'white',
        fontSize: normalize(26),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        includeFontPadding: false,
    },

    checkoutButtonContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },

    checkoutButtonText: {
        color: 'white',
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
    },
});