import React, { memo, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, FlatList } from 'react-native';
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
                                 products: productsProp = null
                             }) => {
    // Безопасные значения по умолчанию
    const safeOnEndReachedThreshold = onEndReachedThreshold || 8;
    const safeIsLoadingMore = Boolean(isLoadingMore);
    const safeHasMore = Boolean(hasMore);
    const safeHideLoader = Boolean(hideLoader);
    const productsFromStore = useSelector(selectProducts);
    const isLoading = useSelector(selectProductsLoading);
    const error = useSelector(selectProductsError);
    // Используем переданные продукты через пропсы, если они есть, иначе из store
    const products = productsProp !== null ? productsProp : productsFromStore;

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
                    : defaultProductImage,
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

    // onEndReachedThreshold - это расстояние от конца списка в единицах видимого контента (0-1)
    // Используем фиксированное значение для надежного срабатывания
    const threshold = useMemo(() => {
        // Если продуктов мало, используем большее значение для гарантии срабатывания
        if (!displayProducts || displayProducts.length === 0) return 0.5;
        // Для коротких списков (до 15 элементов) используем 0.3, чтобы гарантировать срабатывание
        if (displayProducts.length <= 15) return 0.3;
        // Для больших списков используем фиксированное значение 0.2
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

    // Восстанавливаем позицию скролла после обновления данных
    useEffect(() => {
        if (flatListRef.current && displayProducts && displayProducts.length > 0) {
            // Небольшая задержка для обеспечения корректного рендеринга
            const timeoutId = setTimeout(() => {
                if (flatListRef.current && scrollPositionRef.current.y > 0) {
                    flatListRef.current.scrollToOffset({
                        offset: scrollPositionRef.current.y,
                        animated: false
                    });
                }
            }, 50);

            return () => clearTimeout(timeoutId);
        }
    }, [displayProducts?.length]);

    // Обработка ошибок и пустых состояний (ПОСЛЕ ВСЕХ ХУКОВ!)
    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Ошибка загрузки продуктов: {error}</Text>
            </View>
        );
    }

    if (!Array.isArray(products) || !products || products.length === 0) {
        return (
            <View style={styles.noProductsContainer}>
                <Text style={styles.noProductsText}>Товары не найдены</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={displayProducts}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                onEndReached={handleEndReached}
                onEndReachedThreshold={threshold}
                onScroll={handleScroll}
                windowSize={5}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                removeClippedSubviews={true}
                initialNumToRender={10}
                showsVerticalScrollIndicator={false}
                scrollEnabled={true}
                ListHeaderComponent={ListHeaderComponent}
                ListFooterComponent={renderListFooter}
                scrollEventThrottle={16}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginVertical: 10,
    },
    loaderContainer: {
        paddingVertical: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    errorText: {
        color: 'red',
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
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