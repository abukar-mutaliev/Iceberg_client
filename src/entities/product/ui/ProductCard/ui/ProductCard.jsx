import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Color, Border, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { useProductCard } from "@entities/product";
import { useToast } from '@shared/ui/Toast';
import {AddToCartButton} from "@shared/ui/Cart/ui/AddToCartButton";
import * as navigation from "@shared/utils/NavigationRef";

const placeholderImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 360; // Очень маленькие экраны (iPhone SE 1st gen и меньше)
const isMediumScreen = SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 414; // Стандартные смартфоны
const isLargePhone = SCREEN_WIDTH >= 414 && SCREEN_WIDTH < 768; // Большие смартфоны (iPhone 12 Pro Max, Plus модели)
const isTablet = SCREEN_WIDTH >= 768; // Планшеты

const ProductCardComponent = ({ product, onPress, onGoToCart, width, compact = false }) => {
    const { showError, showWarning } = useToast();
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
            console.error('ProductCard: Error adding to cart:', error);
            if (error.message && error.message.includes('403')) {
                showWarning('Корзина доступна только для клиентов', {
                    duration: 4000,
                    position: 'top'
                });
            } else {
                showError('Не удалось добавить товар в корзину', {
                    duration: 3000,
                    position: 'top'
                });
            }
        }
    }, [handleAddToCart, showError, showWarning]);

    const handleGoToCart = useCallback(() => {
        navigation.navigate('Cart');
    }, []);

    // Адаптивные размеры
    const adaptiveStyles = useMemo(() => {
        let imageWidth, contentMarginLeft, paddingRight, fontSize;
        
        if (isTablet) {
            // Планшеты
            imageWidth = 170;
            contentMarginLeft = 190;
            paddingRight = 40;
            fontSize = {
                title: 18,
                description: 14,
                price: 20,
                boxPrice: 16,
                priceUnit: 11,
            };
        } else if (isLargePhone) {
            // Большие смартфоны (iPhone 14 Plus, Pro Max и т.д.)
            imageWidth = 145;
            contentMarginLeft = 165;
            paddingRight = 30;
            fontSize = {
                title: 15,
                description: 12,
                price: 18,
                boxPrice: 15,
                priceUnit: 10,
            };
        } else if (isMediumScreen) {
            // Средние смартфоны (iPhone 12/13/14/15 стандартные)
            imageWidth = 135;
            contentMarginLeft = 155;
            paddingRight = 25;
            fontSize = {
                title: FontSize.size_sm,
                description: FontSize.size_xs,
                price: 17,
                boxPrice: 14,
                priceUnit: 9,
            };
        } else {
            // Очень маленькие экраны (iPhone SE 1st gen)
            imageWidth = 105;
            contentMarginLeft = 115;
            paddingRight = 15;
            fontSize = {
                title: 13,
                description: 10,
                price: 15,
                boxPrice: 12,
                priceUnit: 8,
            };
        }
        
        return {
            imageWidth,
            contentMarginLeft,
            paddingRight,
            fontSize,
        };
    }, []);

    const containerStyle = width ? [styles.container, { width }] : styles.container;

    // Получаем priceInfo из product или originalData
    const priceInfo = useMemo(() => {
        return product?.priceInfo || product?.originalData?.priceInfo || null;
    }, [product]);
    
    // Используем данные из productData (коробочная логика)
    const isActive = productData.isActive !== false;
    const availableBoxes = productData.availableBoxes || 0;
    const itemsPerBox = productData.itemsPerBox || 1;
    const pricePerItem = productData.pricePerItem || product.price || 0;
    
    // Используем effectivePrice из priceInfo, если доступен, иначе используем boxPrice
    const boxPrice = useMemo(() => {
        if (priceInfo?.effectivePrice) {
            return priceInfo.effectivePrice;
        }
        return productData.boxPrice || productData.price || (pricePerItem * itemsPerBox);
    }, [priceInfo, productData, pricePerItem, itemsPerBox]);

    const getStatusBadge = () => {
        if (!isActive) {
            return (
                <View style={[styles.statusBadge, styles.statusInactive, compact && styles.statusBadgeCompact]}>
                    <Text style={[styles.statusText, compact && styles.statusTextCompact]}>Неактивен</Text>
                </View>
            );
        }

        if (availableBoxes === 0) {
            return (
                <View style={[styles.statusBadge, styles.statusOutOfStock, compact && styles.statusBadgeCompact]}>
                    <Text style={[styles.statusText, compact && styles.statusTextCompact]}>Нет в наличии</Text>
                </View>
            );
        }

        return null;
    };

    // Компактный режим для чата
    if (compact) {
        return (
            <Pressable
                style={[styles.compactContainer, width && { width }]}
                onPress={handlePress}
                disabled={isLoading}
            >
                {/* Изображение товара сверху */}
                <View style={styles.compactImageContainer}>
                    <Image
                        style={styles.compactProductImage}
                        resizeMode="cover"
                        source={productData.image || placeholderImage}
                        defaultSource={placeholderImage}
                    />
                    {/* Статус-бейдж */}
                    {getStatusBadge()}
                </View>

                {/* Контент снизу */}
                <View style={styles.compactContentContainer}>
                    <Text style={styles.compactTitle} numberOfLines={2} ellipsizeMode="tail">
                        {productData.name}
                    </Text>

                    <View style={styles.compactPriceContainer}>
                        <Text style={styles.compactPrice}>
                            {pricePerItem.toFixed(0)} ₽
                        </Text>
                        <Text style={styles.compactPriceUnit}>/ шт.</Text>
                    </View>
                    
                    {itemsPerBox > 1 && (
                        <Text style={styles.compactBoxInfo}>
                            {boxPrice.toFixed(0)} ₽ / коробка ({itemsPerBox} шт.)
                        </Text>
                    )}
                    
                    {/* Компактная информация о ценах */}
                    {priceInfo && priceInfo.effectivePrice && Math.abs(priceInfo.effectivePrice - boxPrice) > 0.01 && (
                        <Text style={styles.compactPriceInfo}>
                            Эффективная: {parseFloat(priceInfo.effectivePrice).toFixed(0)} ₽
                        </Text>
                    )}
                </View>
            </Pressable>
        );
    }

    // Обычный режим
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
                style={[styles.productImage, { width: adaptiveStyles.imageWidth }]}
                resizeMode="cover"
                source={productData.image || placeholderImage}
                defaultSource={placeholderImage}
            />

            {/* Статус-бейдж только для критических случаев */}
            {getStatusBadge()}

            {/* Контент */}
            <View style={[styles.contentContainer, { 
                marginLeft: adaptiveStyles.contentMarginLeft,
                paddingRight: adaptiveStyles.paddingRight 
            }]}>
                <View style={styles.titleContainer}>
                    <Text style={[styles.title, { fontSize: adaptiveStyles.fontSize.title }]} numberOfLines={1} ellipsizeMode="tail">
                        {productData.name}
                    </Text>
                </View>

                <View style={styles.descriptionContainer}>
                    <Text style={[styles.description, { fontSize: adaptiveStyles.fontSize.description }]} numberOfLines={isSmallScreen ? 2 : 3} ellipsizeMode="tail">
                        {productData.description || 'Без описания'}
                    </Text>
                </View>

                <View style={styles.priceContainer}>
                    {/* Цена за штуку */}
                    <View style={styles.priceWrapper}>
                        <Text style={[styles.price, { fontSize: adaptiveStyles.fontSize.price }]}>
                            {pricePerItem.toFixed(0)} ₽
                        </Text>
                        <Text style={[styles.priceUnit, { fontSize: adaptiveStyles.fontSize.priceUnit }]}>
                            / шт.
                        </Text>
                    </View>

                    {/* Цена за коробку (если товар продается коробками) */}
                    {itemsPerBox > 1 && (
                        <View style={styles.priceWrapper}>
                            <Text style={[styles.boxPrice, { fontSize: adaptiveStyles.fontSize.boxPrice }]}>
                                {boxPrice.toFixed(0)} ₽
                            </Text>
                            <Text style={[styles.priceUnit, { fontSize: adaptiveStyles.fontSize.priceUnit }]}>
                                / коробка ({itemsPerBox} шт.)
                            </Text>
                        </View>
                    )}
                    
                    {/* Информация о многоуровневых ценах */}
                    {priceInfo && (
                        <View style={styles.priceInfoContainer}>
                            
                            {/* Цена фургона (stopPrice) */}
                            {priceInfo.stopPrice !== null && priceInfo.stopPrice !== undefined && (
                                <View style={styles.priceInfoRow}>
                                    <Text style={styles.priceInfoLabel}>Цена фургона:</Text>
                                    <Text style={[styles.priceInfoValue, styles.stopPriceValue]}>
                                        {parseFloat(priceInfo.stopPrice).toFixed(0)} ₽
                                    </Text>
                                </View>
                            )}
                            
                            {/* Цена склада (warehousePrice) */}
                            {priceInfo.warehousePrice !== null && priceInfo.warehousePrice !== undefined && (
                                <View style={styles.priceInfoRow}>
                                    <Text style={styles.priceInfoLabel}>Цена склада:</Text>
                                    <Text style={styles.priceInfoValue}>
                                        {parseFloat(priceInfo.warehousePrice).toFixed(0)} ₽
                                    </Text>
                                </View>
                            )}
                            
                            {/* Наценка (markup) */}
                            {priceInfo.markup && priceInfo.markup > 0 && (
                                <View style={styles.priceInfoRow}>
                                    <Text style={styles.priceInfoLabel}>Наценка:</Text>
                                    <Text style={[styles.priceInfoValue, styles.markupValue]}>
                                        +{parseFloat(priceInfo.markup).toFixed(0)} ₽ ({parseFloat(priceInfo.markupPercent || 0).toFixed(1)}%)
                                    </Text>
                                </View>
                            )}
                            
                            {/* Скидка (discount) */}
                            {priceInfo.discount && priceInfo.discount > 0 && (
                                <View style={styles.priceInfoRow}>
                                    <Text style={styles.priceInfoLabel}>Скидка:</Text>
                                    <Text style={[styles.priceInfoValue, styles.discountValue]}>
                                        -{parseFloat(priceInfo.discount).toFixed(0)} ₽ ({parseFloat(priceInfo.discountPercent || 0).toFixed(1)}%)
                                    </Text>
                                </View>
                            )}
                            
                            {/* Базовая цена (если отличается от эффективной) */}
                            {priceInfo.basePrice && Math.abs(priceInfo.basePrice - (priceInfo.effectivePrice || boxPrice)) > 0.01 && (
                                <View style={styles.priceInfoRow}>
                                    <Text style={styles.priceInfoLabel}>Базовая цена:</Text>
                                    <Text style={[styles.priceInfoValue, styles.basePriceValue]}>
                                        {parseFloat(priceInfo.basePrice).toFixed(0)} ₽
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* Кнопка добавления в корзину с переходом */}
            <AddToCartButton
                style={[styles.addButton, isSmallScreen && styles.addButtonSmall]}
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
    if (prevProps.compact !== nextProps.compact) return false;
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
        height: isTablet ? 200 : (isSmallScreen ? 150 : 162),
        borderWidth: 0.5,
        borderColor: Color.purpleSoft,
        borderStyle: 'solid',
        borderRadius: Border.br_xl,
        backgroundColor: Color.colorLightMode,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: isTablet ? 25 : (isSmallScreen ? 15 : 20),
        marginHorizontal: isTablet ? 12 : (isSmallScreen ? 4 : 8),
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
        paddingTop: isTablet ? 20 : (isSmallScreen ? 10 : 15),
        paddingRight: 30,
        paddingBottom: isTablet ? 20 : (isSmallScreen ? 10 : 15),
    },
    titleContainer: {
        height: isTablet ? 25 : (isSmallScreen ? 18 : 20),
        width: "100%",
        marginBottom: isTablet ? 6 : (isSmallScreen ? 3 : 4),
    },
    title: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_sm,
        fontWeight: 'bold',
        color: Color.purpleSoft,
        textAlign: 'left',
    },
    descriptionContainer: {
        marginTop: isTablet ? 8 : (isSmallScreen ? 4 : 6),
        height: isTablet ? 50 : (isSmallScreen ? 28 : 40),
        width: "100%",
        marginBottom: isTablet ? 6 : (isSmallScreen ? 3 : 4),
    },
    description: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        fontWeight: '500',
        color: Color.colorCornflowerblue,
        textAlign: 'left',
        lineHeight: isTablet ? 18 : (isSmallScreen ? 12 : 14),
    },
    priceContainer: {
        width: "100%",
        marginTop: isTablet ? 8 : (isSmallScreen ? 4 : 6),
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
        width: isTablet ? 60 : 50,
        height: isTablet ? 60 : 50,
    },
    addButtonSmall: {
        width: 42,
        height: 42,
    },
    statusBadge: {
        position: 'absolute',
        top: isTablet ? 10 : (isSmallScreen ? 6 : 8),
        right: isTablet ? 10 : (isSmallScreen ? 6 : 8),
        paddingHorizontal: isTablet ? 10 : (isSmallScreen ? 6 : 8),
        paddingVertical: isTablet ? 5 : (isSmallScreen ? 3 : 4),
        borderRadius: isTablet ? 14 : (isSmallScreen ? 10 : 12),
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
        fontSize: isTablet ? 12 : (isSmallScreen ? 9 : 10),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.purpleSoft,
        textAlign: 'center',
    },
    statusBadgeCompact: {
        top: 6,
        right: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    statusTextCompact: {
        fontSize: 9,
    },
    // Компактный режим для чата
    compactContainer: {
        width: 220,
        borderWidth: 0.5,
        borderColor: Color.purpleSoft,
        borderRadius: Border.br_xl,
        backgroundColor: Color.colorLightMode,
        overflow: 'hidden',
    },
    compactImageContainer: {
        width: '100%',
        height: 140,
        position: 'relative',
        backgroundColor: '#F9F9F9',
    },
    compactProductImage: {
        width: '100%',
        height: '100%',
    },
    compactContentContainer: {
        padding: 10,
    },
    compactTitle: {
        fontFamily: FontFamily.sFProText,
        fontSize: 14,
        fontWeight: '600',
        color: Color.purpleSoft,
        marginBottom: 6,
        lineHeight: 18,
    },
    compactPriceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 4,
    },
    compactPrice: {
        fontFamily: FontFamily.sFProText,
        fontSize: 16,
        fontWeight: '700',
        color: Color.purpleSoft,
    },
    compactPriceUnit: {
        fontFamily: FontFamily.sFProText,
        fontSize: 11,
        fontWeight: '500',
        color: Color.colorSilver_100,
        marginLeft: 4,
    },
    compactBoxInfo: {
        fontFamily: FontFamily.sFProText,
        fontSize: 11,
        fontWeight: '500',
        color: Color.colorCornflowerblue,
    },
    compactPriceInfo: {
        fontFamily: FontFamily.sFProText,
        fontSize: 10,
        fontWeight: '600',
        color: Color.blue2,
        marginTop: 2,
    },
    // Стили для информации о многоуровневых ценах
    priceInfoContainer: {
        marginTop: isTablet ? 8 : (isSmallScreen ? 4 : 6),
        paddingTop: isTablet ? 8 : (isSmallScreen ? 4 : 6),
        borderTopWidth: 1,
        borderTopColor: Color.grayLight || '#E5E5E5',
    },
    priceInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isTablet ? 4 : (isSmallScreen ? 2 : 3),
    },
    priceInfoLabel: {
        fontFamily: FontFamily.sFProText,
        fontSize: isTablet ? 11 : (isSmallScreen ? 9 : 10),
        fontWeight: '500',
        color: Color.textSecondary || Color.colorSilver_100,
        flex: 1,
    },
    priceInfoValue: {
        fontFamily: FontFamily.sFProText,
        fontSize: isTablet ? 12 : (isSmallScreen ? 10 : 11),
        fontWeight: '600',
        color: Color.purpleSoft,
        textAlign: 'right',
    },
    stopPriceValue: {
        color: Color.blue2 || '#007AFF',
    },
    markupValue: {
        color: '#4CAF50',
    },
    discountValue: {
        color: '#4CAF50',
    },
    basePriceValue: {
        color: Color.textSecondary || Color.colorSilver_100,
        textDecorationLine: 'line-through',
        fontSize: isTablet ? 11 : (isSmallScreen ? 9 : 10),
    },
});