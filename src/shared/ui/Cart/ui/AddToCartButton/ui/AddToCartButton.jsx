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
import { useCartProduct, useCart, useCartAvailability } from '@entities/cart';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { useToast } from '@shared/ui/Toast';
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
    const { isCartAvailable } = useCartAvailability();
    const { currentUser } = useAuth();
    const { showError, showWarning } = useToast();
    const [scaleAnim] = useState(new Animated.Value(1));
    const [iconScaleAnim] = useState(new Animated.Value(1));
    const [isAnimating, setIsAnimating] = useState(false);

    const productId = product?.id || product?.originalData?.id;

    // ВРЕМЕННО СКРЫТО: Кнопка корзины скрыта для всех пользователей
    // TODO: Вернуть когда функциональность заказа будет готова
    if (!isCartAvailable) {
        return null;
    }

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

    // Анимация при изменении состояния загрузки
    useEffect(() => {
        if (isLoading && !isAnimating) {
            setIsAnimating(true);
            // Анимация масштабирования иконки
            Animated.sequence([
                Animated.timing(iconScaleAnim, {
                    toValue: 0.8,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(iconScaleAnim, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        } else if (!isLoading && isAnimating) {
            // Сброс анимации при завершении загрузки
            setIsAnimating(false);
        }
    }, [isLoading, isAnimating, iconScaleAnim]);
    
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
    const successColor = '#4CAF50';

    // Определяем текущие цвета на основе состояния загрузки
    const currentBackgroundColor = isLoading ? successColor : backgroundColor;
    const currentIconColor = isLoading ? Color.colorLightMode : iconColor;

    const handlePress = useCallback(async () => {
        // Проверяем доступность корзины перед любыми действиями
        if (!isCartAvailable && (onPress || (!isInCart && productId))) {
            const userRole = currentUser?.role || 'неизвестна';
            showWarning(
                `Только клиенты могут добавлять товары в корзину.`,
                {
                    duration: 4000,
                    position: 'top'
                }
            );
            return;
        }

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
                // Анимация успешного добавления
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.1,
                        duration: 150,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 150,
                        useNativeDriver: true,
                    }),
                ]).start();
            } else if (isInCart && onGoToCart) {
                onGoToCart();
            }
        } catch (error) {
            console.error('Ошибка при работе с корзиной:', error);
            
            // Показываем информативное сообщение об ошибке
            if (error.message && error.message.includes('403')) {
                showWarning('Корзина доступна только для клиентов', {
                    duration: 4000,
                    position: 'top'
                });
            } else {
                showError(`Ошибка при работе с корзиной: ${error.message || 'Неизвестная ошибка'}`, {
                    duration: 3000,
                    position: 'top'
                });
            }
        }
    }, [onPress, onGoToCart, productId, isAvailable, isInCart, addToCart, scaleAnim, isCartAvailable, currentUser, showError, showWarning]);

    if (cartLoading) {
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
                <Animated.View style={[
                    styles.background,
                    { backgroundColor: currentBackgroundColor }
                ]} />
                <View style={styles.buttonContent}>
                    <Animated.View style={{ transform: [{ scale: iconScaleAnim }] }}>
                        <ActivityIndicator
                            size="small"
                            color={currentIconColor}
                        />
                    </Animated.View>
                </View>
            </Animated.View>
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
                        <Animated.View style={{ transform: [{ scale: iconScaleAnim }] }}>
                            <ActivityIndicator
                                size="small"
                                color={Color.colorLightMode}
                            />
                        </Animated.View>
                    ) : (
                        <Animated.View style={[{ transform: [{ scale: iconScaleAnim }] }, styles.cartButtonContent]}>
                            <CartIconWhite size={24} />

                            {quantity > 0 && (
                                <View style={styles.quantityBadge}>
                                    <Text style={styles.quantityBadgeText}>
                                        {quantity}
                                    </Text>
                                </View>
                            )}
                        </Animated.View>
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
            <Animated.View style={[
                styles.background,
                {
                    backgroundColor: currentBackgroundColor,
                    opacity: isLoading ? 0.9 : 1
                }
            ]} />
            <Pressable
                style={styles.buttonContent}
                onPress={handlePress}
                disabled={isLoading || !isAvailable}
            >
                <Animated.View style={{ transform: [{ scale: iconScaleAnim }] }}>
                    {isLoading ? (
                        <CartIconWhite size={iconSize} />
                    ) : (
                        <PlusIcon size={iconSize} color={currentIconColor} />
                    )}
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
};

export const AddToCartButton = memo(AddButtonComponent, (prevProps, nextProps) => {
    // Проверяем основные поля продукта для оптимизации перерендеринга
    if (prevProps.product?.id !== nextProps.product?.id) return false;
    if (prevProps.style !== nextProps.style) return false;
    if (prevProps.isWhite !== nextProps.isWhite) return false;
    if (prevProps.size !== nextProps.size) return false;
    if (prevProps.onPress !== nextProps.onPress) return false;
    if (prevProps.onGoToCart !== nextProps.onGoToCart) return false;
    
    return true;
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