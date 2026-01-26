import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, RefreshControl, Text as RNText, Pressable } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import Text from '@shared/ui/Text/Text';
import { ProductsSlider } from '@features/supplier/ui/ProductsSlider/ProductsSlider';
import { SupplierHeader } from '@features/supplier/ui/SupplierHeader/SupplierHeader';
import { BestFeedbacks } from '@features/supplier/ui/BestFeedbacks/BestFeedbacks';
import { ScrollableBackgroundGradient } from '@shared/ui/BackgroundGradient';
import { resetCurrentProduct } from "@entities/product";
import { useDispatch, useSelector } from 'react-redux';
import { selectUser } from '@entities/auth';
import { Color, FontFamily, FontSize, Border, Shadow, Padding } from '@app/styles/GlobalStyles';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Полностью переработанный компонент контента экрана поставщика,
 * исправляющий проблемы с рендерингом и отображением отзывов
 */
const SupplierContent = React.memo(({
                                        supplierId,
                                        supplier,
                                        supplierProducts = [],
                                        feedbacks = [],
                                        navigation,
                                        onRefresh,
                                        isRefreshing = false,
                                        fromScreen = null,
                                        previousProductId = null
                                    }) => {
    const renderCount = useRef(0);
    const dataLogged = useRef(false);

    const { colors } = useTheme();
    const scrollViewRef = useRef(null);
    const dispatch = useDispatch();
    
    // Получаем текущего пользователя для проверки роли
    const currentUser = useSelector(selectUser);
    const isSupplier = useMemo(() => currentUser?.role === 'SUPPLIER', [currentUser?.role]);

    const contentHeight = SCREEN_HEIGHT * 2;

    const enrichedSupplier = useMemo(() => {
        if (!supplier) return null;
        
        return {
            ...supplier,
            id: supplier.id || supplierId || (supplier.supplier?.id)
        };
    }, [supplier, supplierId]);

    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('SupplierContent - supplier данные:', {
                supplierId,
                'supplier.id': supplier?.id,
                'supplier.supplier?.id': supplier?.supplier?.id,
                'enrichedSupplier.id': enrichedSupplier?.id
            });
        }
    }, [supplierId, supplier, enrichedSupplier]);

    const products = useMemo(() =>
            Array.isArray(supplierProducts) ? supplierProducts : [],
        [supplierProducts]
    );

    const reviews = useMemo(() =>
            Array.isArray(feedbacks) ? feedbacks : [],
        [feedbacks]
    );

    const productsCount = useMemo(() => products.length, [products]);
    const hasProducts = useMemo(() => productsCount > 0, [productsCount]);

    const feedbacksCount = useMemo(() => reviews.length, [reviews]);
    const hasFeedbacks = useMemo(() => feedbacksCount > 0, [feedbacksCount]);

    const supplierName = useMemo(() => {
        if (!enrichedSupplier) return 'Неизвестный поставщик';
        return enrichedSupplier.supplier?.companyName ||
            enrichedSupplier.companyName ||
            enrichedSupplier.user?.supplier?.companyName ||
            'Неизвестный поставщик';
    }, [enrichedSupplier]);

    useEffect(() => {
        renderCount.current += 1;

        if (process.env.NODE_ENV === 'development') {
            console.log('SupplierContent - Рендер:', {
                supplierId,
                supplierProductsType: typeof supplierProducts,
                supplierProductsIsArray: Array.isArray(supplierProducts),
                supplierProductsLength: supplierProducts?.length,
                productsCount,
                hasProducts,
                feedbacksCount,
                hasFeedbacks,
                renderCount: renderCount.current
            });
            
            if (!dataLogged.current && hasProducts) {
                console.log('SupplierContent - Итоговые данные:', {
                    supplierId,
                    supplierName,
                    productsCount,
                    hasProducts,
                    feedbacksCount,
                    hasFeedbacks,
                    fromScreen,
                    previousProductId,
                    renderCount: renderCount.current
                });
                dataLogged.current = true;
            }
        }
    }, [supplierId, supplierName, productsCount, hasProducts, feedbacksCount, hasFeedbacks, fromScreen, previousProductId, supplierProducts]);

    const handleGoBack = useCallback(() => {
        console.log('SupplierContent handleGoBack called with fromScreen:', fromScreen);
        
        // Если пришли из чата, возвращаемся к чату
        if (fromScreen === 'ChatRoom') {
            console.log('Returning to chat from supplier screen...');
            // Простой возврат назад - теперь SupplierScreen в ChatStack с анимацией
            navigation.goBack();
        } else {
            console.log('Regular goBack navigation...');
            // Обычный возврат назад
            navigation.goBack();
        }
    }, [navigation, fromScreen]);


    const handleProductPress = (product) => {
        // Поддержка как productId, так и объекта продукта
        const productId = typeof product === 'object' && product?.id ? product.id : product;
        navigation.navigate('ProductDetail', {
            productId: productId,
            fromScreen: 'SupplierScreen',
            supplierId: supplierId,
            previousScreen: fromScreen
        });

        if (process.env.NODE_ENV === 'development') {
            console.log('SupplierContent - Переход к товару:', {
                productId,
                fromScreen: 'SupplierScreen',
                supplierId,
                previousScreen: fromScreen
            });
        }
    };

    // Обработчики навигации к возвратам товаров
    const handleStagnantProductsPress = useCallback(() => {
        navigation.navigate('StagnantProducts');
    }, [navigation]);

    const handleProductReturnsPress = useCallback(() => {
        navigation.navigate('ProductReturns');
    }, [navigation]);

    const noProductsContainerStyle = useMemo(() => [
        styles.noProductsContainer,
        { backgroundColor: colors.cardBackground }
    ], [colors.cardBackground]);

    const noProductsTextStyle = useMemo(() => [
        styles.noProductsText,
        { color: colors.textSecondary }
    ], [colors.textSecondary]);

    const refreshControlProps = useMemo(() => ({
        refreshing: isRefreshing,
        onRefresh: onRefresh,
        colors: [colors.primary || '#5e00ff'],
        tintColor: colors.primary || '#5e00ff'
    }), [isRefreshing, onRefresh, colors.primary]);

    // Функции рендеринга компонентов
    const renderProducts = useCallback(() => {
        if (!hasProducts) {
            return (
                <View style={noProductsContainerStyle}>
                    <Text style={noProductsTextStyle}>
                        У поставщика нет продуктов
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.productsContainer}>
                <ProductsSlider
                    products={products}
                    onProductPress={handleProductPress}
                />
            </View>
        );
    }, [hasProducts, products, handleProductPress, noProductsContainerStyle, noProductsTextStyle]);

    const renderFeedbacks = useCallback(() => {
        if (!hasFeedbacks) return null;

        return (
            <View style={styles.feedbacksContainer}>
                <BestFeedbacks
                    feedbacks={reviews}
                    onProductPress={handleProductPress}
                />
            </View>
        );
    }, [hasFeedbacks, reviews, handleProductPress]);

    // Рендер карточек возвратов товаров для поставщиков
    const renderReturnCards = useCallback(() => {
        return (
            <View style={styles.returnCardsContainer}>
                <Pressable
                    style={({ pressed }) => [
                        styles.returnCard,
                        styles.returnCardStagnant,
                        pressed && styles.returnCardPressed,
                    ]}
                    onPress={handleStagnantProductsPress}
                    android_ripple={{ color: 'rgba(255, 149, 0, 0.2)' }}
                >
                    <RNText style={styles.returnCardIcon}>⚠️</RNText>
                    <RNText style={styles.returnCardTitle}>Залежавшиеся товары</RNText>
                    <RNText style={styles.returnCardDescription}>
                        Товары без продаж более 3 недель
                    </RNText>
                </Pressable>

                <Pressable
                    style={({ pressed }) => [
                        styles.returnCard,
                        styles.returnCardReturns,
                        pressed && styles.returnCardPressed,
                    ]}
                    onPress={handleProductReturnsPress}
                    android_ripple={{ color: 'rgba(106, 90, 224, 0.2)' }}
                >
                    <RNText style={styles.returnCardIcon}>📦</RNText>
                    <RNText style={styles.returnCardTitle}>Мои возвраты</RNText>
                    <RNText style={styles.returnCardDescription}>
                        Статус и история возвратов
                    </RNText>
                </Pressable>
            </View>
        );
    }, [handleStagnantProductsPress, handleProductReturnsPress]);

    // Рендерим компонент
    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                style={styles.contentScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl {...refreshControlProps} />}
                overScrollMode="never"
                bounces={true}
                horizontal={false}
            >
                <ScrollableBackgroundGradient
                    contentHeight={contentHeight}
                    showOverlayGradient={false}
                    showShadowGradient={false}
                />

                <SupplierHeader
                    supplier={enrichedSupplier}
                    supplierProducts={productsCount}
                    onGoBack={handleGoBack}
                />

                {isSupplier && renderReturnCards()}
                {renderProducts()}
                {renderFeedbacks()}

            </ScrollView>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    contentScrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 0,
    },
    productsContainer: {
        position: 'relative',
    },
    feedbacksContainer: {
        marginTop: SCREEN_WIDTH * 0.047,
    },
    noProductsContainer: {
        marginHorizontal: SCREEN_WIDTH * 0.037,
        marginVertical: SCREEN_WIDTH * 0.047,
        padding: SCREEN_WIDTH * 0.047,
        alignItems: 'center',
        borderRadius: SCREEN_WIDTH * 0.023,
    },
    noProductsText: {
        fontSize: SCREEN_WIDTH * 0.037,
    },
    // Карточки возвратов
    returnCardsContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: SCREEN_WIDTH * 0.037,
        marginTop: SCREEN_WIDTH * 0.047,
        marginBottom: SCREEN_WIDTH * 0.037,
    },
    returnCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
    },
    returnCardStagnant: {
        backgroundColor: 'rgba(255, 149, 0, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 149, 0, 0.3)',
    },
    returnCardReturns: {
        backgroundColor: 'rgba(106, 90, 224, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(106, 90, 224, 0.3)',
    },
    returnCardPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.97 }],
    },
    returnCardIcon: {
        fontSize: 32,
        marginBottom: 8,
    },
    returnCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Color.textPrimary,
        textAlign: 'center',
        marginBottom: 4,
    },
    returnCardDescription: {
        fontSize: 11,
        color: Color.textSecondary,
        textAlign: 'center',
        lineHeight: 14,
    },
    debugContainer: {
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginTop: 10,
        alignItems: 'center'
    },
    debugText: {
        fontSize: 10,
        color: '#777'
    }
});


export { SupplierContent };