import React, { useState, useMemo, useCallback } from 'react';
import { FontFamily, FontSize, Color, Border } from '@app/styles/GlobalStyles';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    PixelRatio,
    ActivityIndicator,
} from 'react-native';

import { ProductTile } from '@entities/product/ui/ProductTile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Количество карточек, отображаемых за один шаг
const PAGE_SIZE = 4;

// Ширина плитки: 2 колонки с горизонтальными отступами 15px и зазором 12px
const TILE_WIDTH = Math.floor((SCREEN_WIDTH - 15 - 15 - 12) / 2);
const TILE_HEIGHT = normalize(269);

/**
 * Плиточный блок похожих товаров.
 *
 * Рендерим не все карточки сразу, а порциями по PAGE_SIZE.
 * Компонент работает внутри родительского ScrollView, поэтому вложенный
 * скролл не нужен — просто наращиваем список через кнопку «Показать ещё».
 * Когда локальные карточки закончились и есть ещё страницы на сервере,
 * вызываем onEndReached для подгрузки следующей порции.
 */
export const SimilarProducts = React.memo(({
    products,
    onProductPress,
    currentProductId,
    color,
    onEndReached,
    isLoadingMore = false,
    hasMore = false,
}) => {
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const validProducts = useMemo(() => {
        if (!Array.isArray(products)) return [];
        return products.filter(p => p && p.id && p.id !== currentProductId);
    }, [products, currentProductId]);

    // Сбрасываем счётчик при смене набора продуктов (новый товар)
    const prevProductsLengthRef = React.useRef(validProducts.length);
    if (prevProductsLengthRef.current !== validProducts.length && validProducts.length <= PAGE_SIZE) {
        prevProductsLengthRef.current = validProducts.length;
        if (visibleCount !== PAGE_SIZE) {
            setVisibleCount(PAGE_SIZE);
        }
    }

    const visibleProducts = useMemo(
        () => validProducts.slice(0, visibleCount),
        [validProducts, visibleCount],
    );

    const isValidReactComponent = useMemo(() => {
        return ProductTile &&
            (typeof ProductTile === 'function' ||
                (typeof ProductTile === 'object' && ProductTile.$$typeof));
    }, []);

    const handleProductPress = useCallback((product) => {
        if (onProductPress && product?.id) {
            onProductPress(product.id);
        }
    }, [onProductPress]);

    // Есть ли ещё карточки для показа (локально или на сервере)
    const hasMoreToShow = visibleCount < validProducts.length || hasMore;

    const handleShowMore = useCallback(() => {
        const nextCount = visibleCount + PAGE_SIZE;
        setVisibleCount(nextCount);
        // Если локальные карточки закончатся и есть ещё на сервере — подгружаем
        if (nextCount >= validProducts.length && hasMore && !isLoadingMore && onEndReached) {
            onEndReached();
        }
    }, [visibleCount, validProducts.length, hasMore, isLoadingMore, onEndReached]);

    if (!validProducts || validProducts.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Похожие товары</Text>
                <View style={[styles.emptyContainer, { backgroundColor: 'rgba(51, 57, 176, 0.05)' }]}>
                    <Text style={[styles.emptyText, { color: Color.colorSilver_100 }]}>
                        Похожие товары не найдены
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Похожие товары</Text>

            {/* 2-колоночная сетка */}
            <View style={styles.grid}>
                {isValidReactComponent && visibleProducts.map((item) => {
                    if (!item?.id) return null;
                    return (
                        <View key={`similar-${item.id}`} style={styles.tile}>
                            <ProductTile
                                product={item}
                                onPress={() => handleProductPress(item)}
                                testID={`similar-product-${item.id}`}
                            />
                        </View>
                    );
                })}
            </View>

            {/* Индикатор загрузки с сервера */}
            {isLoadingMore && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color={Color.purpleSoft} />
                </View>
            )}

            {/* Кнопка «Показать ещё» — видна пока есть ещё карточки */}
            {!isLoadingMore && hasMoreToShow && (
                <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={handleShowMore}
                    activeOpacity={0.7}
                >
                    <Text style={styles.showMoreText}>Показать ещё</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}, (prevProps, nextProps) => {
    if (prevProps.currentProductId !== nextProps.currentProductId) return false;
    if (!prevProps.products && !nextProps.products) return true;
    if (!prevProps.products || !nextProps.products) return false;
    if (prevProps.products.length !== nextProps.products.length) return false;

    const checkCount = Math.min(prevProps.products.length, 20);
    for (let i = 0; i < checkCount; i++) {
        if (prevProps.products[i]?.id !== nextProps.products[i]?.id) return false;
    }

    if (prevProps.onProductPress !== nextProps.onProductPress) return false;
    if (prevProps.onEndReached !== nextProps.onEndReached) return false;
    if (prevProps.isLoadingMore !== nextProps.isLoadingMore) return false;
    if (prevProps.hasMore !== nextProps.hasMore) return false;

    return true;
});

SimilarProducts.displayName = 'SimilarProducts';

const styles = StyleSheet.create({
    container: {
        marginTop: 30,
        marginBottom: 50,
    },
    title: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_lg,
        fontWeight: '600',
        marginBottom: 16,
        marginHorizontal: 15,
        color: '#000',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 15,
        paddingBottom: 20,
        gap: 12,
    },
    tile: {
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
        borderRadius: normalize(Border.br_xl),
        overflow: 'hidden',
    },
    emptyContainer: {
        marginHorizontal: 15,
        borderRadius: Border.br_xl,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        minHeight: 120,
    },
    emptyText: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        textAlign: 'center',
    },
    loaderContainer: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    showMoreButton: {
        marginTop: 12,
        marginBottom: 36,
        marginHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: 'rgba(51, 57, 176, 0.07)',
        alignItems: 'center',
    },
    showMoreText: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_sm,
        fontWeight: '600',
        color: Color.blue2,
    },
});
