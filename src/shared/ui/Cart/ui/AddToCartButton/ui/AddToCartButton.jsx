import React, { memo, useCallback, useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Text,
    ActivityIndicator,
    Animated
} from 'react-native';
import { useDispatch } from 'react-redux';
import { useCartProduct, useCart } from '@entities/cart';
import { PlusIcon } from '@shared/ui/Icon/PlusIcon';
import { CartIcon } from '@shared/ui/Icon/CartIcon';
import {
    Color,
    Border,
    FontFamily,
    FontSize
} from '@app/styles/GlobalStyles';
import {CartIconWhite} from "@shared/ui/Cart/ui/CartIcon/CartIcon";

const AddButtonComponent = ({
                                product,
                                style,
                                isWhite = false,
                                onPress,
                                onGoToCart,
                                size = 'default'
                            }) => {
    const dispatch = useDispatch();
    const [scaleAnim] = useState(new Animated.Value(1));

    const productId = product?.id || product?.originalData?.id;

    const {
        isInCart,
        quantity,
        isAdding,
        isUpdating,
        isRemoving,
        addToCart,
        isLoading: cartLoading,
    } = useCartProduct(productId);

    const isLoading = isAdding || isUpdating || isRemoving;

    const productData = product?.originalData || product;
    
    // Определяем доступность товара
    const isActive = productData?.isActive !== false; // по умолчанию true, если не указано
    const stockQuantity = productData?.stockQuantity || 0;
    const availableQuantity = productData?.availableQuantity !== undefined && productData?.availableQuantity !== null 
        ? productData.availableQuantity 
        : stockQuantity;
    const isAvailable = isActive && availableQuantity > 0;
    const isOutOfStock = availableQuantity <= 0;



    const containerSize = size === 'small' ? 45 : size === 'large' ? 65 : 57;
    const iconSize = size === 'small' ? 18 : size === 'large' ? 26 : 22;

    const backgroundColor = isWhite ? Color.colorLightMode : Color.purpleSoft;
    const iconColor = isWhite ? Color.purpleSoft : Color.colorLightMode;
    const disabledColor = Color.colorSilver_100;

    const handlePress = useCallback(async () => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();

        try {
            if (isInCart && onGoToCart) {
                // Если товар уже в корзине - переходим в корзину
                onGoToCart();
            } else if (onPress) {
                // Если передан кастомный обработчик
                await onPress();
            } else if (productId && isAvailable && !isInCart) {
                await addToCart(1);
            } else if (isInCart && onGoToCart) {
                onGoToCart();
            }
        } catch (error) {
            console.error('Ошибка при работе с корзиной:', error);
        }
    }, [onPress, onGoToCart, productId, isAvailable, isInCart, addToCart, scaleAnim]);

    if (cartLoading) {
        return (
            <View style={[
                styles.container,
                { width: containerSize, height: containerSize },
                style
            ]}>
                <View style={[
                    styles.background,
                    { backgroundColor: Color.colorSilver_100 }
                ]} />
                <View style={styles.buttonContent}>
                    <ActivityIndicator
                        size="small"
                        color={Color.textSecondary}
                    />
                </View>
            </View>
        );
    }

    if (!isAvailable) {
        return (
            <View style={[
                styles.container,
                { width: containerSize, height: containerSize },
                style
            ]}>
                <View style={[
                    styles.background,
                    { backgroundColor: disabledColor }
                ]} />
                <View style={styles.buttonContent}>
                    <Text style={[
                        styles.disabledText,
                        { fontSize: size === 'small' ? 8 : 10 }
                    ]}>
                        {isOutOfStock ? 'Нет' : 'Недоступен'}
                    </Text>
                </View>
            </View>
        );
    }

    if (isInCart && quantity > 0) {
        return (
            <Animated.View style={[
                styles.container,
                {
                    width: containerSize,
                    height: containerSize,
                    transform: [{ scale: scaleAnim }]
                },
                style
            ]}>
                <View style={[
                    styles.background,
                    {
                        backgroundColor: '#4CAF50',
                    }
                ]} />
                <Pressable
                    style={styles.buttonContent}
                    onPress={handlePress}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator
                            size="small"
                            color={Color.colorLightMode}
                        />
                    ) : (
                        <View style={styles.cartButtonContent}>
                            <CartIconWhite size={24} />

                            {quantity > 0 && (
                                <View style={styles.quantityBadge}>
                                    <Text style={styles.quantityBadgeText}>
                                        {quantity}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </Pressable>
            </Animated.View>
        );
    }

    return (
        <Animated.View style={[
            styles.container,
            {
                width: containerSize,
                height: containerSize,
                transform: [{ scale: scaleAnim }]
            },
            style
        ]}>
            <View style={[
                styles.background,
                {
                    backgroundColor: isLoading ? disabledColor : backgroundColor,
                    opacity: isLoading ? 0.7 : 1
                }
            ]} />
            <Pressable
                style={styles.buttonContent}
                onPress={handlePress}
                disabled={isLoading || !isAvailable}
            >
                {isLoading ? (
                    <ActivityIndicator
                        size="small"
                        color={iconColor}
                    />
                ) : (
                    <PlusIcon size={iconSize} color={iconColor} />
                )}
            </Pressable>
        </Animated.View>
    );
};

export const AddToCartButton = memo(AddButtonComponent, (prevProps, nextProps) => {

    return false;
});

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    background: {
        zIndex: 0,
        borderBottomRightRadius: Border.br_xl,
        borderTopLeftRadius: Border.br_xl,
        bottom: 0,
        right: 0,
        height: '100%',
        width: '100%',
        position: 'absolute',
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: 'transparent',
    },
    buttonContent: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    disabledText: {
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.textSecondary,
        textAlign: 'center',
        lineHeight: 12,
    },
    cartButtonContent: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    cartButtonText: {
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 14,
    },
    quantityBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: Color.colorLightMode,
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    quantityBadgeText: {
        fontSize: 10,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: '#4CAF50',
        textAlign: 'center',
        lineHeight: 12,
    },
});