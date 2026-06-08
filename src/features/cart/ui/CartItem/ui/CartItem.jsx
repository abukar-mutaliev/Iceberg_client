import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Animated,
    Dimensions,
    TextInput,
} from 'react-native';
import { useCartProduct } from '@entities/cart';
import { useFavoriteStatus } from '@entities/favorites/hooks/useFavoriteStatus';
import { useToast } from '@shared/ui/Toast';

import { FontFamily } from '@app/styles/GlobalStyles';
import { TrashIcon } from '@shared/ui/Cart/ui/DeleteProductButton/TrashIcon';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Функция для адаптивного масштабирования
const normalize = (size) => {
    const scale = screenWidth / 440;
    return Math.round(size * scale);
};

export const CartItem = React.memo(({
                                        item,
                                        onProductPress,
                                        index,
                                        isSelected = false,
                                        onToggleSelection
                                    }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const {
        quantity,
        isUpdating,
        isRemoving,
        removeFromCart,
        incrementQuantity: originalIncrementQuantity,
        decrementQuantity,
        updateQuantity,
        debouncedUpdateQuantity
    } = useCartProduct(item.productId || item.product?.id);

    // Хук для работы с избранным
    const { 
        isFavorite, 
        isLoading: isFavoriteLoading, 
        toggleFavorite,
        isAuthenticated 
    } = useFavoriteStatus(item.productId || item.product?.id);

    const { showError, showInfo } = useToast();

    const product = item.product;
    const isLoading = isRemoving; // Убираем isUpdating из общего состояния загрузки
    const maxQuantity = product?.stockQuantity || 100;

    // Обертка для incrementQuantity с учетом максимального количества
    const incrementQuantity = useCallback(() => {
        const newQuantity = quantity + 1;
        const finalQuantity = newQuantity > maxQuantity ? maxQuantity : newQuantity;

        if (finalQuantity !== quantity) {
            debouncedUpdateQuantity(finalQuantity);
        }
    }, [quantity, maxQuantity, debouncedUpdateQuantity]);

    // Состояние для редактирования количества
    const [isEditingQuantity, setIsEditingQuantity] = useState(false);
    const [inputValue, setInputValue] = useState(quantity.toString());

    // Обновляем inputValue когда изменяется quantity
    React.useEffect(() => {
        if (!isEditingQuantity) {
            setInputValue(quantity.toString());
        }
    }, [quantity, isEditingQuantity]);

    // Обработчики для ввода количества
    const handleQuantityPress = () => {
        if (!isRemoving) {
            setIsEditingQuantity(true);
            setInputValue(quantity.toString());
        }
    };

    const handleQuantitySubmit = async () => {
        const newQuantity = parseInt(inputValue, 10);

        if (isNaN(newQuantity) || newQuantity < 1) {
            showError('Количество должно быть больше 0', { duration: 4000, position: 'top' });
            setInputValue(quantity.toString());
            setIsEditingQuantity(false);
            return;
        }

        // Если введенное количество больше доступного, автоматически устанавливаем максимальное
        const finalQuantity = newQuantity > maxQuantity ? maxQuantity : newQuantity;

        if (finalQuantity !== quantity) {
            await updateQuantity(finalQuantity); // Используем немедленное обновление для ручного ввода
        }
        setIsEditingQuantity(false);
    };

    const handleQuantityBlur = () => {
        handleQuantitySubmit();
    };

    const handleQuantityChange = (text) => {
        // Разрешаем только цифры
        const numericText = text.replace(/[^0-9]/g, '');
        setInputValue(numericText);
    };

    // Анимации
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;
    const checkboxScaleAnim = useRef(new Animated.Value(1)).current;

    // Эффект появления элемента
    React.useEffect(() => {
        Animated.sequence([
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
            }),
            Animated.delay(index * 100),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.98,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();

        onProductPress?.();
    };

    const handleCheckboxPress = () => {
        // Анимация нажатия чекбокса
        Animated.sequence([
            Animated.timing(checkboxScaleAnim, {
                toValue: 0.85,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(checkboxScaleAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();

        onToggleSelection?.();
    };

    const handleRemove = () => {
        Animated.sequence([
            Animated.timing(slideAnim, {
                toValue: -screenWidth,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            removeFromCart();
        });
    };

    const formatPrice = (price) => {
        return `${price.toLocaleString()} ₽`;
    };

    // Обработчик для кнопки избранного
    const handleFavoritePress = useCallback(async () => {
        if (!isAuthenticated) {
            showInfo('Для добавления товаров в избранное необходимо войти в аккаунт', {
                duration: 4000,
                position: 'top',
            });
            return;
        }

        try {
            await toggleFavorite();
        } catch (error) {
            console.error('Ошибка при работе с избранным:', error);
            showError('Не удалось обновить избранное', { duration: 5000, position: 'top' });
        }
    }, [toggleFavorite, isAuthenticated, showInfo, showError]);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: opacityAnim,
                    transform: [
                        { scale: scaleAnim },
                        { translateX: slideAnim }
                    ],
                },
                isLoading && styles.containerLoading
            ]}
        >
            {/* Основной контент карточки */}
            <View style={styles.cardContainer}>
                <TouchableOpacity
                    style={styles.content}
                    onPress={handlePress}
                    activeOpacity={0.9}
                    disabled={isRemoving}
                >
                    {/* Чекбокс */}
                    <TouchableOpacity
                        style={styles.checkboxClickArea}
                        onPress={handleCheckboxPress}
                        activeOpacity={1}
                        disabled={isRemoving}
                    >
                        <Animated.View
                            style={[
                                styles.checkboxContainer,
                                { transform: [{ scale: checkboxScaleAnim }] }
                            ]}
                        >
                            <View
                                style={[
                                    styles.checkbox,
                                    isSelected && styles.checkboxSelected
                                ]}
                            >
                                {isSelected && (
                                    <Text style={styles.checkmark}>✓</Text>
                                )}
                            </View>
                        </Animated.View>
                    </TouchableOpacity>

                    {/* Изображение товара */}
                    <Image
                        source={
                            product?.images?.[0]
                                ? { uri: product.images[0] }
                                : require('@assets/images/icecreamPlaceholder.png')
                        }
                        style={styles.image}
                        resizeMode="cover"
                    />

                    {/* Основная информация о товаре */}
                    <View style={styles.productInfo}>
                        {/* Цена и скидка */}
                        <View style={styles.priceContainer}>
                            <Text style={styles.productPrice}>
                                {formatPrice(product?.boxPrice || (product?.price * (product?.itemsPerBox || 1)))}
                            </Text>
                            {/* Если есть скидка, показываем старую цену */}
                            {product?.originalPrice && product?.originalPrice > (product?.boxPrice || product?.price) && (
                                <Text style={styles.originalPrice}>
                                    {formatPrice(product.originalPrice)}
                                </Text>
                            )}
                        </View>

                        {/* Бейдж скидки */}
                        {product?.hasDiscount && (
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountText}>Распродажа</Text>
                            </View>
                        )}

                        {/* Название товара */}
                        <Text
                            style={styles.productName}
                            numberOfLines={2}
                        >
                            {product?.name || 'Мороженое рожок'}
                        </Text>

                        {/* Поставщик */}
                        <Text
                            style={styles.supplierText}
                            numberOfLines={1}
                        >
                            {product?.supplier?.companyName || 'Айсберг'}
                        </Text>

                        {/* Информация о коробке */}
                        <Text style={styles.priceLabel}>
                            {product?.itemsPerBox > 1
                                ? `${product.itemsPerBox} шт. в коробке (${formatPrice(product?.price || 0)}/шт.)`
                                : `${formatPrice(product?.price || 0)} за штуку`
                            }
                        </Text>

                        {/* Дополнительные бейджи */}
                        {maxQuantity <= 10 && (
                            <Text style={styles.limitedQuantityText}>
                                Количество ограничено
                            </Text>
                        )}

                        {/* Кнопки действий внизу */}
                        <View style={styles.actionContainer}>
                            {/* Кнопка "В избранное" */}
                            <TouchableOpacity 
                                style={styles.favoriteButton} 
                                onPress={handleFavoritePress}
                                disabled={isFavoriteLoading}
                            >
                                {isFavoriteLoading ? (
                                    <ActivityIndicator size="small" color={colors.error} />
                                ) : (
                                    <Text style={[
                                        styles.favoriteIcon,
                                        { color: isFavorite ? colors.error : colors.textTertiary }
                                    ]}>
                                        {isFavorite ? '♥' : '♡'}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {/* Кнопка "Удалить" */}
                            <TouchableOpacity
                                style={styles.trashButton}
                                onPress={handleRemove}
                                disabled={isRemoving}
                            >
                                {isRemoving ? (
                                    <ActivityIndicator size="small" color={colors.textSecondary} />
                                ) : (
                                    <TrashIcon
                                        width={normalize(16)}
                                        height={normalize(18)}
                                        color={colors.textSecondary}
                                    />
                                )}
                            </TouchableOpacity>

                            {/* Счетчик количества */}
                            <View style={styles.quantityContainer}>
                                {/* Кнопка уменьшения (-) */}
                                <TouchableOpacity
                                    style={[styles.quantityButton, styles.minusButton]}
                                    onPress={decrementQuantity}
                                    disabled={quantity <= 1}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.quantityButtonText,
                                        { opacity: quantity <= 1 ? 0.5 : 1 }
                                    ]}>
                                        −
                                    </Text>
                                </TouchableOpacity>

                                {/* Отображение количества */}
                                <View style={styles.quantityDisplay}>
                                    {isEditingQuantity ? (
                                        <TextInput
                                            style={styles.quantityInput}
                                            value={inputValue}
                                            onChangeText={handleQuantityChange}
                                            onSubmitEditing={handleQuantitySubmit}
                                            onBlur={handleQuantityBlur}
                                            keyboardType="numeric"
                                            maxLength={3}
                                            selectTextOnFocus={true}
                                            autoFocus={true}
                                            textAlign="center"
                                            placeholderTextColor={colors.textTertiary}
                                            keyboardAppearance={colors.keyboardAppearance}
                                        />
                                    ) : (
                                        <TouchableOpacity onPress={handleQuantityPress} style={styles.quantityTextContainer}>
                                            <Text style={styles.quantityText}>
                                                {quantity}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Кнопка увеличения (+) */}
                                <TouchableOpacity
                                    style={[styles.quantityButton, styles.plusButton]}
                                    onPress={incrementQuantity}
                                    disabled={quantity >= (product?.stockQuantity || 100)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.quantityButtonText,
                                        { opacity: quantity >= (product?.stockQuantity || 100) ? 0.5 : 1 }
                                    ]}>
                                        +
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {isLoading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator
                                size="small"
                                color={colors.primary}
                            />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Разделительная линия */}
                <View style={styles.separator} />
            </View>
        </Animated.View>
    );
});

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        backgroundColor: colors.cardBackground,
        marginHorizontal: normalize(16),
        marginVertical: normalize(4),
        overflow: 'hidden',
        position: 'relative',
        borderRadius: normalize(12),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: isDark ? 0.25 : 0.05,
        shadowRadius: isDark ? 6 : 2,
        elevation: isDark ? 2 : 1,
        borderWidth: isDark ? 1 : 0,
        borderColor: colors.border,
    },
    containerLoading: {
        opacity: 0.7,
    },

    // Основная карточка
    cardContainer: {
        backgroundColor: colors.cardBackground,
        borderRadius: normalize(12),
        overflow: 'hidden',
    },
    content: {
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(16),
        backgroundColor: colors.cardBackground,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },

    // Чекбокс
    checkboxClickArea: {
        paddingRight: normalize(12),
        paddingTop: normalize(4),
    },
    checkboxContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkbox: {
        width: normalize(20),
        height: normalize(20),
        borderRadius: normalize(4),
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.inputBackground,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    checkmark: {
        color: colors.textInverse,
        fontSize: normalize(12),
        fontWeight: 'bold',
        includeFontPadding: false,
    },

    // Изображение товара
    image: {
        width: normalize(80),
        height: normalize(80),
        borderRadius: normalize(8),
        backgroundColor: colors.surfaceSecondary,
        marginRight: normalize(12),
    },

    // Информация о товаре
    productInfo: {
        flex: 1,
        paddingTop: 0,
    },

    // Цена
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(4),
    },
    productPrice: {
        color: colors.textPrimary,
        fontSize: normalize(18),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '700',
        marginRight: normalize(8),
    },
    originalPrice: {
        color: colors.textTertiary,
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '400',
        textDecorationLine: 'line-through',
    },

    // Бейдж скидки
    discountBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.error,
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(2),
        borderRadius: normalize(10),
        marginBottom: normalize(8),
    },
    discountText: {
        color: colors.textInverse,
        fontSize: normalize(11),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
    },

    // Название товара
    productName: {
        color: colors.textPrimary,
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '400',
        lineHeight: normalize(18),
        marginBottom: normalize(4),
    },

    // Поставщик
    supplierText: {
        color: colors.textSecondary,
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '400',
        marginBottom: normalize(4),
    },

    // Информация о коробке
    priceLabel: {
        color: colors.textSecondary,
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '400',
        marginBottom: normalize(8),
    },

    // Ограничение количества
    limitedQuantityText: {
        color: colors.error,
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        marginBottom: normalize(12),
    },

    // Контейнер действий
    actionContainer: {
        width: '80%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: normalize(8),
    },

    // Кнопка избранного
    favoriteButton: {
        width: normalize(32),
        height: normalize(32),
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: normalize(16),
        backgroundColor: colors.surfaceSecondary,
    },
    favoriteIcon: {
        fontSize: normalize(16),
        color: colors.textTertiary,
    },

    // Кнопка удаления
    trashButton: {
        width: normalize(32),
        height: normalize(32),
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: normalize(16),
        backgroundColor: colors.surfaceSecondary,
        marginLeft: normalize(8),
    },

    // Счетчик количества
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: normalize(8),
        marginLeft: normalize(8),
        backgroundColor: colors.cardBackground,
    },

    quantityButton: {
        width: normalize(32),
        height: normalize(32),
        justifyContent: 'center',
        alignItems: 'center',
    },

    quantityButtonText: {
        color: colors.primary,
        fontSize: normalize(18),
        fontWeight: '600',
        includeFontPadding: false,
        textAlign: 'center',
    },

    quantityDisplay: {
        paddingHorizontal: normalize(12),
        minWidth: normalize(32),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceSecondary,
    },

    quantityTextContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        minHeight: normalize(32),
        minWidth: normalize(32),
    },

    quantityText: {
        color: colors.primary,
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        includeFontPadding: false,
        textAlign: 'center',
    },


    quantityInput: {
        color: colors.primary,
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        includeFontPadding: false,
        textAlign: 'center',
        backgroundColor: colors.inputBackground,
        borderRadius: normalize(4),
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        borderWidth: 1,
        borderColor: colors.primary,
        minWidth: normalize(32),
    },

    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDark ? 'rgba(14,15,20,0.8)' : 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: normalize(12),
    },

    // Разделительная линия
    separator: {
        height: 1,
        backgroundColor: colors.border,
        marginLeft: normalize(16),
    },
});