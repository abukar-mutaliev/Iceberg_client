import React, { memo, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, FlatList, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import {
    selectProducts,
    selectProductsLoading,
    selectProductsError,
    resetCurrentProduct
} from '@entities/product';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';


import { ProductCardItem } from './ProductCardItem';

const defaultProductImage = { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' };

export const ProductsList = ({
                                 fromScreen = 'ProductsList',
                                 onProductPress,
                                 onEndReached,
                                 onEndReachedThreshold = 8,
                                 isLoadingMore = false,
                                 hasMore = true,
                                 ListHeaderComponent,
                                 ListFooterComponent,
                                 hideLoader = false,
                                 products: productsProp = null,
                                 scrollEnabled = true,
                                 nestedScrollEnabled = true,
                                 contentContainerStyle = null,
                                 onRetry = null
                             }) => {
    // Безопасные значения по умолчанию
    const safeIsLoadingMore = Boolean(isLoadingMore);
    const safeHasMore = Boolean(hasMore);
    const productsFromStore = useSelector(selectProducts);
    const isLoading = useSelector(selectProductsLoading);
    const error = useSelector(selectProductsError);
    // Используем переданные продукты через пропсы, если они есть, иначе из store
    const products = productsProp !== null ? productsProp : productsFromStore;
    const safeScrollEnabled = scrollEnabled !== false;
    const safeNestedScrollEnabled = nestedScrollEnabled !== false;

    // Сохраняем позицию скролла
    const flatListRef = useRef(null);
    const scrollPositionRef = useRef({ x: 0, y: 0 });

    // ВСЕ ХУКИ ДОЛЖНЫ БЫТЬ ВЫЗВАНЫ ДО ЛЮБЫХ УСЛОВНЫХ ВОЗВРАТОВ!
    
    // Подготовка данных для отображения
    const displayProducts = useMemo(() => {
        if (!Array.isArray(products) || !products) {
            return [];
        }

        return products
            .filter(product => product && product.id)
            .map(product => ({
                id: product.id,
                title: product.name || '',
                description: product.description || '',
                price: product.price ? product.price.toString() : '0',
                image: product.images && Array.isArray(product.images) && product.images.length > 0
                    ? { uri: product.images[0] }
                    : null,
                // Сохраняем массив images для листания изображений
                // Передаем массив images, если он есть, иначе undefined (ProductCard будет искать в originalData.images)
                images: product.images && Array.isArray(product.images) && product.images.length > 0 
                    ? product.images 
                    : (product.originalData?.images && Array.isArray(product.originalData.images) && product.originalData.images.length > 0
                        ? product.originalData.images
                        : undefined),
                // Сохраняем категорию для проверки в ProductCard
                category: product.category || product.originalData?.category || null,
                categories: product.categories || product.originalData?.categories || null,
                originalData: product
            }));
    }, [products?.length, products]); // Добавляем products.length для лучшего контроля зависимостей

    const handleScroll = useCallback((event) => {
        const { x, y } = event.nativeEvent.contentOffset;
        const { height } = event.nativeEvent.layoutMeasurement;
        const { contentSize } = event.nativeEvent;
        
        scrollPositionRef.current = { x, y };
        
        // Альтернативная проверка для коротких списков
        // Если пользователь проскроллил близко к концу (в пределах 200px)
        if (contentSize.height > 0 && y + height >= contentSize.height - 200) {
            // Проверяем, нужно ли загрузить больше
            if (safeHasMore && !safeIsLoadingMore && onEndReached && !endReachedCalledRef.current) {
                endReachedCalledRef.current = true;
                onEndReached();
                setTimeout(() => {
                    endReachedCalledRef.current = false;
                }, 1000);
            }
        }
    }, [safeHasMore, safeIsLoadingMore, onEndReached]);

    const renderItem = useCallback(({ item }) => {
        if (!item) return null;

        return (
            <ProductCardItem
                product={item}
                onProductPress={onProductPress}
                fromScreen={fromScreen}
            />
        );
    }, [onProductPress, fromScreen]);

    const keyExtractor = useCallback((item, index) => {
        if (!item) return `product-empty-${index}`;
        return `product-${item.id}-${item.originalData?.updatedAt || 0}`;
    }, []);

    // Защита от множественных вызовов
    const endReachedCalledRef = useRef(false);

    // Обработчик для бесконечной прокрутки
    const handleEndReached = useCallback(() => {
        if (safeHasMore && !safeIsLoadingMore && onEndReached && !endReachedCalledRef.current) {
            endReachedCalledRef.current = true;
            onEndReached();
            // Сбрасываем флаг через небольшую задержку, чтобы избежать повторных вызовов
            setTimeout(() => {
                endReachedCalledRef.current = false;
            }, 1000);
        }
    }, [safeHasMore, safeIsLoadingMore, onEndReached]);

    // Сбрасываем флаг при изменении состояния загрузки
    useEffect(() => {
        if (!safeIsLoadingMore) {
            endReachedCalledRef.current = false;
        }
    }, [safeIsLoadingMore]);

    const threshold = useMemo(() => {
        if (!displayProducts || displayProducts.length === 0) return 0.5;
        if (displayProducts.length <= 15) return 0.3;
        return 0.2;
    }, [displayProducts?.length]);

    const renderListFooter = useCallback(() => (
        <>
            {safeIsLoadingMore && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color={Color.purpleSoft} />
                    <Text style={styles.loadingText}>Загружаем ещё товары...</Text>
                </View>
            )}
            {ListFooterComponent && ListFooterComponent()}
        </>
    ), [safeIsLoadingMore, ListFooterComponent]);

    const renderEmptyComponent = useCallback(() => {
        if (error) {
            return (
                <View style={styles.networkErrorContainer}>
                    <Text style={styles.networkErrorTitle}>Товары не загружены</Text>
                    <Text style={styles.networkErrorText}>
                        Проверьте интернет-соединение и попробуйте снова
                    </Text>
                    {onRetry && (
                        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                            <Text style={styles.retryButtonText}>Повторить попытку</Text>
                        </TouchableOpacity>
                    )}
                </View>
            );
        }
        return (
            <View style={styles.noProductsContainer}>
                <Text style={styles.noProductsText}>Товары не найдены</Text>
            </View>
        );
    }, [error, onRetry]);

    const hasProducts = Array.isArray(products) && products.length > 0;
    const showError = error && !hasProducts;
    const effectiveData = (showError || !hasProducts) ? [] : displayProducts;

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={effectiveData}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                onEndReached={handleEndReached}
                onEndReachedThreshold={threshold}
                onScroll={handleScroll}
                windowSize={5}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                removeClippedSubviews={false}
                initialNumToRender={10}
                showsVerticalScrollIndicator={false}
                scrollEnabled={safeScrollEnabled}
                nestedScrollEnabled={safeNestedScrollEnabled}
                ListHeaderComponent={ListHeaderComponent}
                ListFooterComponent={renderListFooter}
                ListEmptyComponent={renderEmptyComponent}
                scrollEventThrottle={16}
                contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 10,
        marginBottom: 0,
    },
    contentContainer: {
        flexGrow: 1,
        paddingBottom: 12,
    },
    loaderContainer: {
        paddingVertical: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    networkErrorContainer: {
        paddingVertical: 40,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    networkErrorTitle: {
        fontSize: 16,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
    },
    networkErrorText: {
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#3339b0',
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 10,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    noProductsContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    noProductsText: {
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        color: Color.colorSilver_100,
        textAlign: 'center',
    },
    loadingText: {
        marginTop: 8,
        fontSize: FontSize.size_xs,
        fontFamily: FontFamily.sFProText,
        color: Color.colorSilver_100,
        textAlign: 'center',
    }
});