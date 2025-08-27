import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, RefreshControl, Text as RNText } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import Text from '@shared/ui/Text/Text';
import { ProductsSlider } from '@features/supplier/ui/ProductsSlider/ProductsSlider';
import { SupplierHeader } from '@features/supplier/ui/SupplierHeader/SupplierHeader';
import { BestFeedbacks } from '@features/supplier/ui/BestFeedbacks/BestFeedbacks';
import { ScrollableBackgroundGradient } from '@shared/ui/BackgroundGradient';
import { resetCurrentProduct } from "@entities/product";
import { useDispatch } from 'react-redux';

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
                                        productsLoaded = false,
                                        fromScreen = null,
                                        previousProductId = null
                                    }) => {
    const renderCount = useRef(0);
    const dataLogged = useRef(false);

    const { colors } = useTheme();
    const scrollViewRef = useRef(null);
    const dispatch = useDispatch();

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

        if (process.env.NODE_ENV === 'development' && !dataLogged.current && hasProducts) {
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
    }, [supplierId, supplierName, productsCount, hasProducts, feedbacksCount, hasFeedbacks, fromScreen, previousProductId]);

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


    const handleProductPress = (productId) => {
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
        paddingBottom: SCREEN_WIDTH * 0.187,
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