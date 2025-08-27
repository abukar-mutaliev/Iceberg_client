import React, { useState, useRef, useCallback } from 'react';
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
    Alert,
} from 'react-native';
import { useCartProduct } from '@entities/cart';
import { useFavoriteStatus } from '@entities/favorites/hooks/useFavoriteStatus';

import {
    Color,
    FontFamily
} from '@app/styles/GlobalStyles';
import { TrashIcon } from '@shared/ui/Cart/ui/DeleteProductButton/TrashIcon';

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
    const {
        quantity,
        isUpdating,
        isRemoving,
        removeFromCart,
        incrementQuantity: originalIncrementQuantity,
        decrementQuantity,
        updateQuantity
    } = useCartProduct(item.productId || item.product?.id);

    // Хук для работы с избранным
    const { 
        isFavorite, 
        isLoading: isFavoriteLoading, 
        toggleFavorite,
        isAuthenticated 
    } = useFavoriteStatus(item.productId || item.product?.id);

    const product = item.product;
    const isLoading = isUpdating || isRemoving;
    const maxQuantity = product?.stockQuantity || 100;

    // Обертка для incrementQuantity с учетом максимального количества
    const incrementQuantity = useCallback(async () => {
        const newQuantity = quantity + 1;
        const finalQuantity = newQuantity > maxQuantity ? maxQuantity : newQuantity;

        if (finalQuantity !== quantity) {
            return await updateQuantity(finalQuantity);
        }
    }, [quantity, maxQuantity, updateQuantity]);

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
        if (!isLoading) {
            setIsEditingQuantity(true);
            setInputValue(quantity.toString());
        }
    };

    const handleQuantitySubmit = async () => {
        const newQuantity = parseInt(inputValue, 10);

        if (isNaN(newQuantity) || newQuantity < 1) {
            Alert.alert('Ошибка', 'Количество должно быть больше 0');
            setInputValue(quantity.toString());
            setIsEditingQuantity(false);
            return;
        }

        // Если введенное количество больше доступного, автоматически устанавливаем максимальное
        const finalQuantity = newQuantity > maxQuantity ? maxQuantity : newQuantity;

        if (finalQuantity !== quantity) {
            await updateQuantity(finalQuantity);
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
            Alert.alert(
                'Требуется авторизация',
                'Для добавления товаров в избранное необходимо войти в аккаунт',
                [{ text: 'OK' }]
            );
            return;
        }

        try {
            await toggleFavorite();
        } catch (error) {
            console.error('Ошибка при работе с избранным:', error);
            Alert.alert('Ошибка', 'Не удалось обновить избранное');
        }
    }, [toggleFavorite, isAuthenticated]);

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
                    disabled={isLoading}
                >
                    {/* Чекбокс */}
                    <TouchableOpacity
                        style={styles.checkboxClickArea}
                        onPress={handleCheckboxPress}
                        activeOpacity={1}
                        disabled={isLoading}
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
                                    <ActivityIndicator size="small" color="#FF6B9D" />
                                ) : (
                                    <Text style={[
                                        styles.favoriteIcon,
                                        { color: isFavorite ? '#FF6B9D' : '#8B95A7' }
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
                                    <ActivityIndicator size="small" color="#666" />
                                ) : (
                                    <TrashIcon
                                        width={normalize(16)}
                                        height={normalize(18)}
                                        color="#666"
                                    />
                                )}
                            </TouchableOpacity>

                            {/* Счетчик количества */}
                            <View style={styles.quantityContainer}>
                                {/* Кнопка уменьшения (-) */}
                                <TouchableOpacity
                                    style={[styles.quantityButton, styles.minusButton]}
                                    onPress={decrementQuantity}
                                    disabled={isLoading || quantity <= 1}
                                    activeOpacity={0.7}
                                >
                                    {isUpdating ? (
                                        <ActivityIndicator size="small" color="#0073E6" />
                                    ) : (
                                        <Text style={[
                                            styles.quantityButtonText,
                                            { opacity: quantity <= 1 ? 0.5 : 1 }
                                        ]}>
                                            −
                                        </Text>
                                    )}
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
                                        />
                                    ) : (
                                        <TouchableOpacity onPress={handleQuantityPress} disabled={isLoading}>
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
                                    disabled={
                                        isLoading ||
                                        quantity >= (product?.stockQuantity || 100)
                                    }
                                    activeOpacity={0.7}
                                >
                                    {isUpdating ? (
                                        <ActivityIndicator size="small" color="#0073E6" />
                                    ) : (
                                        <Text style={[
                                            styles.quantityButtonText,
                                            { opacity: quantity >= (product?.stockQuantity || 100) ? 0.5 : 1 }
                                        ]}>
                                            +
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {isLoading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator
                                size="small"
                                color="rgba(0, 115, 230, 0.7)"
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

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
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
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    containerLoading: {
        opacity: 0.7,
    },

    // Основная карточка
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: normalize(12),
        overflow: 'hidden',
    },
    content: {
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(16),
        backgroundColor: '#FFFFFF',
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
        borderColor: '#C1C7DE',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#0073E6',
        borderColor: '#0073E6',
    },
    checkmark: {
        color: '#FFFFFF',
        fontSize: normalize(12),
        fontWeight: 'bold',
        includeFontPadding: false,
    },

    // Изображение товара
    image: {
        width: normalize(80),
        height: normalize(80),
        borderRadius: normalize(8),
        backgroundColor: '#F5F5F5',
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
        color: '#000000',
        fontSize: normalize(18),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '700',
        marginRight: normalize(8),
    },
    originalPrice: {
        color: '#8B95A7',
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '400',
        textDecorationLine: 'line-through',
    },

    // Бейдж скидки
    discountBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#FF0080',
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(2),
        borderRadius: normalize(10),
        marginBottom: normalize(8),
    },
    discountText: {
        color: '#FFFFFF',
        fontSize: normalize(11),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
    },

    // Название товара
    productName: {
        color: '#000000',
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '400',
        lineHeight: normalize(18),
        marginBottom: normalize(4),
    },

    // Поставщик
    supplierText: {
        color: '#8B95A7',
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '400',
        marginBottom: normalize(4),
    },

    // Информация о коробке
    priceLabel: {
        color: '#8B95A7',
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '400',
        marginBottom: normalize(8),
    },

    // Ограничение количества
    limitedQuantityText: {
        color: '#FF0080',
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
        backgroundColor: '#F8F9FB',
    },
    favoriteIcon: {
        fontSize: normalize(16),
        color: '#8B95A7',
    },

    // Кнопка удаления
    trashButton: {
        width: normalize(32),
        height: normalize(32),
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: normalize(16),
        backgroundColor: '#F8F9FB',
        marginLeft: normalize(8),
    },

    // Счетчик количества
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: normalize(8),
        marginLeft: normalize(8),
        backgroundColor: '#FFFFFF',
    },

    quantityButton: {
        width: normalize(32),
        height: normalize(32),
        justifyContent: 'center',
        alignItems: 'center',
    },

    quantityButtonText: {
        color: '#0073E6',
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
        backgroundColor: '#F8F9FB',
    },

    quantityText: {
        color: '#0073E6',
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        includeFontPadding: false,
        textAlign: 'center',
    },

    quantityInput: {
        color: '#0073E6',
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        includeFontPadding: false,
        textAlign: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: normalize(4),
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        borderWidth: 1,
        borderColor: '#0073E6',
        minWidth: normalize(32),
    },

    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: normalize(12),
    },

    // Разделительная линия
    separator: {
        height: 1,
        backgroundColor: '#F0F2F5',
        marginLeft: normalize(16),
    },
});