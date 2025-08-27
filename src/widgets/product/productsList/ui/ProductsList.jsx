import React, { memo, useCallback, useMemo } from 'react';
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
                                 hideLoader = false
                             }) => {
    const products = useSelector(selectProducts);
    const isLoading = useSelector(selectProductsLoading);
    const error = useSelector(selectProductsError);

    // Обработка ошибок и пустых состояний
    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Ошибка загрузки продуктов: {error}</Text>
            </View>
        );
    }

    if (!Array.isArray(products) || products.length === 0) {
        return (
            <View style={styles.noProductsContainer}>
                <Text style={styles.noProductsText}>Товары не найдены</Text>
            </View>
        );
    }

    const displayProducts = useMemo(() => {
        if (!Array.isArray(products)) {
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
    }, [products]);

    const renderItem = useCallback(({ item }) => (
        <ProductCardItem
            product={item}
            onProductPress={onProductPress}
            fromScreen={fromScreen}
        />
    ), [onProductPress, fromScreen]);

    const keyExtractor = useCallback(item =>
            `product-${item.id}`,
        []);

    // Обработчик для бесконечной прокрутки
    const handleEndReached = useCallback(() => {
        if (hasMore && !isLoadingMore && onEndReached) {
            onEndReached();
        }
    }, [hasMore, isLoadingMore, onEndReached]);

    // Вычисляем threshold в зависимости от количества элементов
    const threshold = useMemo(() => {
        if (displayProducts.length === 0) return 0.5;
        return Math.min(onEndReachedThreshold / displayProducts.length, 0.5);
    }, [displayProducts.length, onEndReachedThreshold]);

    const renderListFooter = useCallback(() => (
        <>
            {isLoadingMore && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color={Color.purpleSoft} />
                    <Text style={styles.loadingText}>Загружаем ещё товары...</Text>
                </View>
            )}
            {ListFooterComponent && ListFooterComponent()}
        </>
    ), [isLoadingMore, ListFooterComponent]);

    return (
        <View style={styles.container}>
            <FlatList
                data={displayProducts}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                onEndReached={handleEndReached}
                onEndReachedThreshold={threshold}
                windowSize={5}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                removeClippedSubviews={true}
                initialNumToRender={10}
                ListHeaderComponent={ListHeaderComponent}
                ListFooterComponent={renderListFooter}
                showsVerticalScrollIndicator={false}
                scrollEnabled={true}
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