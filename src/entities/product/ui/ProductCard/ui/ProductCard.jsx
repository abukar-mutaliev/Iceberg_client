// Ключевые изменения для работы на Android и iOS:
// 1. Добавлен collapsable={false} для PagerView и всех View внутри
// 2. PagerView не обернут в Pressable - область изображений свободна для свайпов
// 3. Только область контента (текст, цены) обернута в Pressable для обработки нажатий
// 4. Добавлены необходимые пропсы в PagerView для корректной работы

import React, { memo, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import PagerView from "react-native-pager-view";
import { Color, Border, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { useProductCard } from "../../../hooks/useProductCard";
import { useToast } from '@shared/ui/Toast';
import {AddToCartButton} from "@shared/ui/Cart/ui/AddToCartButton";
import {CustomSliderIndicator} from "@shared/ui/CustomSliderIndicator";
import { formatImageUrl } from '@shared/api/api';
import * as navigation from "@shared/utils/NavigationRef";

const placeholderImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 360;
const isMediumScreen = SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 414;
const isLargePhone = SCREEN_WIDTH >= 414 && SCREEN_WIDTH < 768;
const isTablet = SCREEN_WIDTH >= 768;

const ProductCardComponent = ({ product, onPress, onGoToCart, width, compact = false }) => {
    const { showError, showWarning } = useToast();
    const {
        productId,
        productData,
        handleAddToCart,
        isLoading,
        status
    } = useProductCard(product);

    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [loadingError, setLoadingError] = useState({});
    const [isScrolling, setIsScrolling] = useState(false);
    const pagerRef = useRef(null);
    const compactPagerRef = useRef(null);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchStartTime = useRef(0);
    const hasMovedRef = useRef(false);
    const isSwipingRef = useRef(false);
    const scrollTimeoutRef = useRef(null);

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
            await handleAddToCart(1);
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

    const adaptiveStyles = useMemo(() => {
        let imageWidth, contentMarginLeft, paddingRight, fontSize;
        
        if (isTablet) {
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

    const priceInfo = useMemo(() => {
        return product?.priceInfo || product?.originalData?.priceInfo || null;
    }, [product]);

    const imageArray = useMemo(() => {
        let images = [];
        
        if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
            images = product.images.filter(item => {
                if (!item) return false;
                if (typeof item === 'string') return item.trim() !== '';
                if (item.uri || item.url || item.path || item.src) return true;
                return false;
            });
        }
        else if (product?.originalData?.images && Array.isArray(product.originalData.images) && product.originalData.images.length > 0) {
            images = product.originalData.images.filter(item => {
                if (!item) return false;
                if (typeof item === 'string') return item.trim() !== '';
                if (item.uri || item.url || item.path || item.src) return true;
                return false;
            });
        }
        else if (productData?.image) {
            images = [productData.image];
        }
        else if (product?.image) {
            images = [product.image];
        }
        
        return images.length > 0 ? images : [];
    }, [product?.images, product?.originalData?.images, product?.image, productData?.image]);

    const extendedImageArray = useMemo(() => {
        if (imageArray.length <= 1) return imageArray;
        return [imageArray[imageArray.length - 1], ...imageArray, imageArray[0]];
    }, [imageArray]);
    
    const realImageIndex = useMemo(() => {
        if (imageArray.length <= 1) return activeImageIndex;
        if (activeImageIndex === 0) return imageArray.length - 1;
        if (activeImageIndex === extendedImageArray.length - 1) return 0;
        return activeImageIndex - 1;
    }, [activeImageIndex, imageArray.length, extendedImageArray.length]);

    const handlePageSelected = useCallback((event) => {
        const newIndex = event.nativeEvent.position;
        setActiveImageIndex(newIndex);
        
        if (imageArray.length > 1 && pagerRef.current) {
            if (newIndex === 0) {
                setTimeout(() => {
                    pagerRef.current?.setPageWithoutAnimation(imageArray.length);
                }, 50);
            }
            else if (newIndex === extendedImageArray.length - 1) {
                setTimeout(() => {
                    pagerRef.current?.setPageWithoutAnimation(1);
                }, 50);
            }
        }
    }, [imageArray.length, extendedImageArray.length]);

    const handleCompactPageSelected = useCallback((event) => {
        const newIndex = event.nativeEvent.position;
        setActiveImageIndex(newIndex);
        
        if (imageArray.length > 1 && compactPagerRef.current) {
            if (newIndex === 0) {
                setTimeout(() => {
                    compactPagerRef.current?.setPageWithoutAnimation(imageArray.length);
                }, 50);
            }
            else if (newIndex === extendedImageArray.length - 1) {
                setTimeout(() => {
                    compactPagerRef.current?.setPageWithoutAnimation(1);
                }, 50);
            }
        }
    }, [imageArray.length, extendedImageArray.length]);

    // Обработчик изменения состояния прокрутки
    const handlePageScrollStateChanged = useCallback((event) => {
        const state = event.nativeEvent.pageScrollState;
        if (state === 'dragging') {
            setIsScrolling(true);
            isSwipingRef.current = true;
            hasMovedRef.current = true;
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        } else if (state === 'idle') {
            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
                isSwipingRef.current = false;
                hasMovedRef.current = false;
            }, 150);
        }
    }, []);

    // Обработчик изменения состояния прокрутки для compact версии
    const handleCompactPageScrollStateChanged = useCallback((event) => {
        const state = event.nativeEvent.pageScrollState;
        if (state === 'dragging') {
            setIsScrolling(true);
            isSwipingRef.current = true;
            hasMovedRef.current = true;
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        } else if (state === 'idle') {
            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
                isSwipingRef.current = false;
                hasMovedRef.current = false;
            }, 150);
        }
    }, []);

    // Обработчик начала касания для различения тапа и свайпа
    const handleTouchStart = useCallback((event) => {
        const touch = event.nativeEvent.touches[0];
        if (touch) {
            touchStartX.current = touch.pageX;
            touchStartY.current = touch.pageY;
            touchStartTime.current = Date.now();
            hasMovedRef.current = false;
        }
    }, []);

    // Обработчик движения для определения свайпа
    const handleTouchMove = useCallback((event) => {
        const touch = event.nativeEvent.touches[0];
        if (touch) {
            const deltaX = Math.abs(touch.pageX - touchStartX.current);
            const deltaY = Math.abs(touch.pageY - touchStartY.current);
            // Если движение больше 10px, считаем это свайпом
            if (deltaX > 10 || deltaY > 10) {
                hasMovedRef.current = true;
            }
        }
    }, []);

    // Обработчик окончания касания для обработки тапа
    const handleTouchEnd = useCallback((event) => {
        const touchTime = Date.now() - touchStartTime.current;
        const touch = event.nativeEvent.changedTouches[0];
        
        if (touch) {
            const deltaX = Math.abs(touch.pageX - touchStartX.current);
            const deltaY = Math.abs(touch.pageY - touchStartY.current);
            
            // Если движение было минимальным (< 10px) и время касания короткое (< 300ms), это тап
            if (!hasMovedRef.current && deltaX < 10 && deltaY < 10 && touchTime < 300) {
                // Небольшая задержка, чтобы убедиться, что PagerView не обработал это как свайп
                setTimeout(() => {
                    if (!isSwipingRef.current && !isScrolling) {
                        handlePress();
                    }
                }, 100);
            }
        }
        
        // Сбрасываем флаги
        hasMovedRef.current = false;
    }, [handlePress]);

    const handleImageError = useCallback((index) => {
        setLoadingError(prev => ({...prev, [index]: true}));
    }, []);

    // Очистка timeout при размонтировании
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    const getImageSource = useCallback((item) => {
        if (typeof item === 'string') {
            const url = formatImageUrl(item);
            return url ? { uri: url } : placeholderImage;
        } else if (item && typeof item === 'object') {
            if (item.uri) {
                const url = formatImageUrl(item.uri);
                return url ? { uri: url } : placeholderImage;
            }
            const imageUrl = item.url || item.uri || item.path || item.src;
            if (imageUrl) {
                const url = formatImageUrl(imageUrl);
                return url ? { uri: url } : placeholderImage;
            }
        }
        return placeholderImage;
    }, []);
    
    const isActive = productData.isActive !== false;
    const availableBoxes = productData.availableBoxes || 0;
    const itemsPerBox = productData.itemsPerBox || 1;
    const pricePerItem = productData.pricePerItem || product.price || 0;
    
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

    if (compact) {
        return (
            <View style={[styles.compactContainer, width && { width }]}>
                <View 
                    style={styles.compactImageContainer}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {imageArray.length > 1 ? (
                        <PagerView
                            ref={compactPagerRef}
                            style={styles.compactPagerView}
                            initialPage={1}
                            onPageSelected={handleCompactPageSelected}
                            onPageScrollStateChanged={handleCompactPageScrollStateChanged}
                            scrollEnabled={true}
                            collapsable={false}
                            orientation="horizontal"
                            overScrollMode="never"
                            overdrag={false}
                            nestedScrollEnabled={true}
                            keyboardDismissMode="on-drag"
                        >
                            {extendedImageArray.map((item, index) => {
                                const imageSource = getImageSource(item);
                                return (
                                    <View 
                                        key={`compact-image-${index}`} 
                                        style={styles.compactSlide}
                                        collapsable={false}
                                    >
                                        {loadingError[index % imageArray.length] ? (
                                            <Image
                                                source={placeholderImage}
                                                style={styles.compactProductImage}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <Image
                                                source={imageSource}
                                                style={styles.compactProductImage}
                                                resizeMode="cover"
                                                defaultSource={placeholderImage}
                                                onError={() => handleImageError(index % imageArray.length)}
                                            />
                                        )}
                                    </View>
                                );
                            })}
                        </PagerView>
                    ) : (
                        <Image
                            style={styles.compactProductImage}
                            resizeMode="cover"
                            source={imageArray.length > 0 ? getImageSource(imageArray[0]) : (productData.image || placeholderImage)}
                            defaultSource={placeholderImage}
                        />
                    )}
                    {imageArray.length > 1 && (
                        <View style={styles.compactIndicatorContainer} pointerEvents="none">
                            <CustomSliderIndicator
                                totalItems={imageArray.length}
                                activeIndex={realImageIndex}
                            />
                        </View>
                    )}
                    {getStatusBadge()}
                </View>

                <Pressable
                    style={styles.compactContentContainer}
                    onPress={handlePress}
                    disabled={isLoading}
                >
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
                    
                    {priceInfo && priceInfo.effectivePrice && Math.abs(priceInfo.effectivePrice - boxPrice) > 0.01 && (
                        <Text style={styles.compactPriceInfo}>
                            Эффективная: {parseFloat(priceInfo.effectivePrice).toFixed(0)} ₽
                        </Text>
                    )}
                </Pressable>
            </View>
        );
    }

    return (
        <View style={containerStyle}>
            <View 
                style={[styles.imageContainer, { width: adaptiveStyles.imageWidth }]}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {imageArray.length > 1 ? (
                    <PagerView
                        ref={pagerRef}
                        style={[styles.pagerView, { width: adaptiveStyles.imageWidth }]}
                        initialPage={1}
                        onPageSelected={handlePageSelected}
                        onPageScrollStateChanged={handlePageScrollStateChanged}
                        scrollEnabled={true}
                        collapsable={false}
                        orientation="horizontal"
                        overScrollMode="never"
                        overdrag={false}
                        nestedScrollEnabled={true}
                        keyboardDismissMode="on-drag"
                    >
                        {extendedImageArray.map((item, index) => {
                            const imageSource = getImageSource(item);
                            return (
                                <View 
                                    key={`image-${index}`} 
                                    style={styles.slide}
                                    collapsable={false}
                                >
                                    {loadingError[index % imageArray.length] ? (
                                        <Image
                                            source={placeholderImage}
                                            style={styles.productImage}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <Image
                                            source={imageSource}
                                            style={styles.productImage}
                                            resizeMode="cover"
                                            defaultSource={placeholderImage}
                                            onError={() => handleImageError(index % imageArray.length)}
                                        />
                                    )}
                                </View>
                            );
                        })}
                    </PagerView>
                ) : (
                    <Image
                        style={[styles.productImage, { width: adaptiveStyles.imageWidth }]}
                        resizeMode="cover"
                        source={imageArray.length > 0 ? getImageSource(imageArray[0]) : (productData.image || placeholderImage)}
                        defaultSource={placeholderImage}
                    />
                )}
                {imageArray.length > 1 && (
                    <View style={styles.indicatorContainer} pointerEvents="none">
                        <CustomSliderIndicator
                            totalItems={imageArray.length}
                            activeIndex={realImageIndex}
                        />
                    </View>
                )}
            </View>

            {getStatusBadge()}

            <Pressable
                style={[styles.contentContainer, { 
                    marginLeft: adaptiveStyles.contentMarginLeft,
                    paddingRight: adaptiveStyles.paddingRight 
                }]}
                onPress={handlePress}
                disabled={isLoading}
            >
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
                    <View style={styles.priceWrapper}>
                        <Text style={[styles.price, { fontSize: adaptiveStyles.fontSize.price }]}>
                            {pricePerItem.toFixed(0)} ₽
                        </Text>
                        <Text style={[styles.priceUnit, { fontSize: adaptiveStyles.fontSize.priceUnit }]}>
                            / шт.
                        </Text>
                    </View>

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
                    
                    {priceInfo && (
                        <View style={styles.priceInfoContainer}>
                            {priceInfo.stopPrice !== null && priceInfo.stopPrice !== undefined && (
                                <View style={styles.priceInfoRow}>
                                    <Text style={styles.priceInfoLabel}>Цена фургона:</Text>
                                    <Text style={[styles.priceInfoValue, styles.stopPriceValue]}>
                                        {parseFloat(priceInfo.stopPrice).toFixed(0)} ₽
                                    </Text>
                                </View>
                            )}
                            
                            {priceInfo.warehousePrice !== null && priceInfo.warehousePrice !== undefined && (
                                <View style={styles.priceInfoRow}>
                                    <Text style={styles.priceInfoLabel}>Цена склада:</Text>
                                    <Text style={styles.priceInfoValue}>
                                        {parseFloat(priceInfo.warehousePrice).toFixed(0)} ₽
                                    </Text>
                                </View>
                            )}
                            
                            {priceInfo.markup && priceInfo.markup > 0 && (
                                <View style={styles.priceInfoRow}>
                                    <Text style={styles.priceInfoLabel}>Наценка:</Text>
                                    <Text style={[styles.priceInfoValue, styles.markupValue]}>
                                        +{parseFloat(priceInfo.markup).toFixed(0)} ₽ ({parseFloat(priceInfo.markupPercent || 0).toFixed(1)}%)
                                    </Text>
                                </View>
                            )}
                            
                            {priceInfo.discount && priceInfo.discount > 0 && (
                                <View style={styles.priceInfoRow}>
                                    <Text style={styles.priceInfoLabel}>Скидка:</Text>
                                    <Text style={[styles.priceInfoValue, styles.discountValue]}>
                                        -{parseFloat(priceInfo.discount).toFixed(0)} ₽ ({parseFloat(priceInfo.discountPercent || 0).toFixed(1)}%)
                                    </Text>
                                </View>
                            )}
                            
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
            </Pressable>

            <AddToCartButton
                style={[styles.addButton, isSmallScreen && styles.addButtonSmall]}
                product={product}
                onPress={handleAddToCartPress}
                size="default"
                isWhite={false}
                onGoToCart={handleGoToCart}
            />
        </View>
    );
};

const arePropsEqual = (prevProps, nextProps) => {
    if (prevProps === nextProps) return true;

    if (prevProps.width !== nextProps.width) return false;
    if (prevProps.compact !== nextProps.compact) return false;
    if (prevProps.onPress !== nextProps.onPress) return false;
    if (prevProps.onGoToCart !== nextProps.onGoToCart) return false;

    const prevProduct = prevProps.product;
    const nextProduct = nextProps.product;

    if (prevProduct === nextProduct) return true;

    if (!prevProduct || !nextProduct) return false;

    const essentialFieldsEqual = (
        prevProduct.id === nextProduct.id &&
        prevProduct.name === nextProduct.name &&
        prevProduct.price === nextProduct.price &&
        prevProduct.stockQuantity === nextProduct.stockQuantity &&
        prevProduct.isActive === nextProduct.isActive
    );

    if (!essentialFieldsEqual) return false;

    if (prevProduct.images !== nextProduct.images) {
        if (!prevProduct.images || !nextProduct.images ||
            prevProduct.images.length !== nextProduct.images.length) {
            return false;
        }

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
    imageContainer: {
        width: 130,
        height: '100%',
        left: 0,
        bottom: 0,
        top: 0,
        position: 'absolute',
        borderRadius: Border.br_xl,
        overflow: 'hidden',
    },
    pagerView: {
        width: 130,
        height: '100%',
    },
    slide: {
        flex: 1,
        width: 130,
        height: '100%',
    },
    productImage: {
        width: 130,
        height: '100%',
        borderRadius: Border.br_xl,
    },
    indicatorContainer: {
        position: 'absolute',
        bottom: 8,
        width: '100%',
        alignItems: 'center',
        zIndex: 10,
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
        overflow: 'hidden',
    },
    compactPagerView: {
        width: '100%',
        height: '100%',
    },
    compactSlide: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    compactProductImage: {
        width: '100%',
        height: '100%',
    },
    compactIndicatorContainer: {
        position: 'absolute',
        bottom: 8,
        width: '100%',
        alignItems: 'center',
        zIndex: 10,
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