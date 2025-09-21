import React, { memo, useCallback } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Alert } from 'react-native';
import { Color, Border, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { useProductCard } from "@entities/product";
import {AddToCartButton} from "@shared/ui/Cart/ui/AddToCartButton";
import * as navigation from "@shared/utils/NavigationRef";

const placeholderImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

const ProductCardComponent = ({ product, onPress, onGoToCart, width }) => {
    const {
        productId,
        productData,
        handleAddToCart,
        isLoading,
        status
    } = useProductCard(product);

    if (!product || !productId) {
        return null;
    }

    const handlePress = useCallback(() => {
        if (onPress && productId) {
            const numericId = typeof productId === 'string' ? parseInt(productId, 10) : productId;
            onPress(numericId);
        }
    }, [onPress, productId]);

    const handleAddToCartPress = useCallback(async () => {
        try {
            await handleAddToCart(1); // Добавляем 1 коробку
            // Можно добавить уведомление об успешном добавлении
        } catch (error) {
            Alert.alert(
                'Ошибка',
                'Не удалось добавить товар в корзину. Попробуйте снова.',
                [{ text: 'OK' }]
            );
        }
    }, [handleAddToCart]);

    const handleGoToCart = useCallback(() => {
        navigation.navigate('Cart');
    }, []);

    const containerStyle = width ? [styles.container, { width }] : styles.container;

    // Используем данные из productData (коробочная логика)
    const isActive = productData.isActive !== false;
    const availableBoxes = productData.availableBoxes || 0;
    const itemsPerBox = productData.itemsPerBox || 1;
    const pricePerItem = productData.pricePerItem || product.price || 0;
    const boxPrice = productData.boxPrice || productData.price || (pricePerItem * itemsPerBox);

    const getStatusBadge = () => {
        if (!isActive) {
            return (
                <View style={[styles.statusBadge, styles.statusInactive]}>
                    <Text style={styles.statusText}>Неактивен</Text>
                </View>
            );
        }

        if (availableBoxes === 0) {
            return (
                <View style={[styles.statusBadge, styles.statusOutOfStock]}>
                    <Text style={styles.statusText}>Нет в наличии</Text>
                </View>
            );
        }

        return null;
    };

    return (
        <Pressable
            style={[
                containerStyle,
            ]}
            onPress={handlePress}
            disabled={isLoading}
        >
            {/* Изображение товара */}
            <Image
                style={styles.productImage}
                resizeMode="cover"
                source={productData.image || placeholderImage}
                defaultSource={placeholderImage}
            />

            {/* Статус-бейдж только для критических случаев */}
            {getStatusBadge()}

            {/* Контент */}
            <View style={styles.contentContainer}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                        {productData.name}
                    </Text>
                </View>

                <View style={styles.descriptionContainer}>
                    <Text style={styles.description} numberOfLines={3} ellipsizeMode="tail">
                        {productData.description || 'Без описания'}
                    </Text>
                </View>

                <View style={styles.priceContainer}>
                    {/* Цена за штуку */}
                    <View style={styles.priceWrapper}>
                        <Text style={styles.price}>
                            {pricePerItem.toFixed(0)} ₽
                        </Text>
                        <Text style={styles.priceUnit}>
                            / шт.
                        </Text>
                    </View>

                    {/* Цена за коробку (если товар продается коробками) */}
                    {itemsPerBox > 1 && (
                        <View style={styles.priceWrapper}>
                            <Text style={styles.boxPrice}>
                                {boxPrice.toFixed(0)} ₽
                            </Text>
                            <Text style={styles.priceUnit}>
                                / коробка ({itemsPerBox} шт.)
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Кнопка добавления в корзину с переходом */}
            <AddToCartButton
                style={styles.addButton}
                product={product}
                onPress={handleAddToCartPress}
                size="default"
                isWhite={false}
                onGoToCart={handleGoToCart}
            />
        </Pressable>
    );
};

const arePropsEqual = (prevProps, nextProps) => {
    // Быстрая проверка на идентичность пропсов
    if (prevProps === nextProps) return true;

    // Проверяем примитивные пропсы
    if (prevProps.width !== nextProps.width) return false;
    if (prevProps.onPress !== nextProps.onPress) return false;
    if (prevProps.onGoToCart !== nextProps.onGoToCart) return false;

    const prevProduct = prevProps.product;
    const nextProduct = nextProps.product;

    // Проверяем на идентичность объектов
    if (prevProduct === nextProduct) return true;

    // Проверяем на отсутствие данных
    if (!prevProduct || !nextProduct) return false;

    // Проверяем основные поля продукта для оптимизации перерендеринга
    const essentialFieldsEqual = (
        prevProduct.id === nextProduct.id &&
        prevProduct.name === nextProduct.name &&
        prevProduct.price === nextProduct.price &&
        prevProduct.stockQuantity === nextProduct.stockQuantity &&
        prevProduct.isActive === nextProduct.isActive
    );

    if (!essentialFieldsEqual) return false;

    // Проверяем изображения только если они действительно изменились
    if (prevProduct.images !== nextProduct.images) {
        if (!prevProduct.images || !nextProduct.images ||
            prevProduct.images.length !== nextProduct.images.length) {
            return false;
        }

        // Проверяем первые несколько изображений
        const imagesToCheck = Math.min(3, prevProduct.images.length);
        for (let i = 0; i < imagesToCheck; i++) {
            if (prevProduct.images[i] !== nextProduct.images[i]) {
                return false;
            }
        }
    }

    return true;
};

export const ProductCard = memo(ProductCardComponent, arePropsEqual);

const styles = StyleSheet.create({
    container: {
        height: 162,
        borderWidth: 0.5,
        borderColor: Color.purpleSoft,
        borderStyle: 'solid',
        borderRadius: Border.br_xl,
        backgroundColor: Color.colorLightMode,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 20,
        marginHorizontal: 8,
    },
    productImage: {
        width: 130,
        height: '100%',
        left: 0,
        bottom: 0,
        top: 0,
        position: 'absolute',
        borderRadius: Border.br_xl,
    },
    contentContainer: {
        marginLeft: 150,
        flex: 1,
        paddingTop: 15,
        paddingRight: 30,
        paddingBottom: 15,
    },
    titleContainer: {
        height: 20,
        width: "100%",
        marginBottom: 4,
    },
    title: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_sm,
        fontWeight: 'bold',
        color: Color.purpleSoft,
        textAlign: 'left',
    },
    descriptionContainer: {
        marginTop: 6,
        height: 40,
        width: "100%",
        marginBottom: 4,
    },
    description: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        fontWeight: '500',
        color: Color.colorCornflowerblue,
        textAlign: 'left',
        lineHeight: 14,
    },
    priceContainer: {
        width: "100%",
        marginTop: 6,
        flex: 1,
        justifyContent: 'flex-end',
    },
    priceWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        width: "100%",
        marginBottom: 1,
        flexWrap: 'wrap',
    },
    price: {
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.purpleSoft,
        textAlign: 'left',
        fontSize: 17,
    },
    boxPrice: {
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: Color.purpleSoft,
        textAlign: 'left',
        fontSize: 14,
    },
    priceUnit: {
        fontFamily: FontFamily.sFProText,
        fontSize: 9,
        fontWeight: '600',
        color: Color.colorSilver_100,
        textAlign: 'left',
        marginLeft: 4,
        marginBottom: 2,
    },
    weight: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        color: Color.textSecondary,
        marginBottom: 2,
    },
    supplier: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        color: Color.textSecondary,
        fontStyle: 'italic',
    },
    addButton: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 50,
        height: 50,
    },
    statusBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    statusInactive: {
        backgroundColor: '#FF3B30',
    },
    statusOutOfStock: {
        backgroundColor: "rgba(242, 243, 255, 1)",
    },
    statusText: {
        fontSize: 10,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.purpleSoft,
        textAlign: 'center',
    },
});