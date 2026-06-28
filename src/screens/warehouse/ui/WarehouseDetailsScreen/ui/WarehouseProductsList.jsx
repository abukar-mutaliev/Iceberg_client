import React, { useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    FlatList
} from 'react-native';
import { useSelector } from 'react-redux';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { ProductTile } from '@entities/product/ui/ProductTile';
import { selectDeletedProductIds } from '@entities/product/model/selectors';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

/**
 * Основные цены каталога (как на экране товара: ProductContent / useProductDetailData).
 * product.price — цена за единицу; boxPrice при отсутствии считается как price * itemsPerBox.
 */
function resolveCatalogPricing(catalogProduct) {
    if (!catalogProduct || typeof catalogProduct !== 'object') {
        return null;
    }
    const itemsPerBox = Number(catalogProduct.itemsPerBox) || 1;
    const isPendingLike =
        catalogProduct.moderationStatus === 'PENDING'
        || catalogProduct.moderationStatus === 'REJECTED';
    const rawUnit = isPendingLike
        ? Number(catalogProduct.supplierProposedPrice ?? catalogProduct.price)
        : Number(catalogProduct.price);
    const explicitBox = isPendingLike
        ? Number(catalogProduct.supplierProposedBoxPrice ?? catalogProduct.boxPrice)
        : Number(catalogProduct.boxPrice);
    const unitPrice = Number.isFinite(rawUnit) ? rawUnit : 0;
    const hasExplicitBoxPrice = Number.isFinite(explicitBox) && explicitBox > 0;
    const boxPrice = hasExplicitBoxPrice ? explicitBox : unitPrice * itemsPerBox;
    return { unitPrice, boxPrice, itemsPerBox };
}

/**
 * Виртуализированный список товаров склада.
 *
 * Является корневым скролл-контейнером экрана: вся «шапка» (детали склада, карта,
 * сотрудники и т.д.) передаётся через `ListHeaderComponent`, а сами карточки
 * рендерятся через FlatList с numColumns=2. Это позволяет монтировать только
 * видимые ProductTile вместо всех сразу, устраняя подтормаживание при открытии
 * экрана с большим количеством товаров.
 */
export const WarehouseProductsList = ({
    products,
    loading,
    loadingMore = false,
    hasMore = false,
    onLoadMore,
    ListHeaderComponent,
    contentContainerStyle,
    ...flatListProps
}) => {
    const deletedProductIds = useSelector(selectDeletedProductIds);
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    const deletedProductIdSet = useMemo(() => {
        if (!Array.isArray(deletedProductIds) || deletedProductIds.length === 0) {
            return new Set();
        }
        return new Set(
            deletedProductIds
                .map(id => parseInt(id, 10))
                .filter(id => !Number.isNaN(id))
        );
    }, [deletedProductIds]);

    // Преобразуем данные товаров склада в формат для ProductTile
    const normalizedProducts = useMemo(() => {
        if (!products || !Array.isArray(products)) return [];

        return products
            .filter(product => {
                if (!product || typeof product !== 'object') return false;

                const productId = product.productId || product.product?.id || product.id;
                const numericProductId = parseInt(productId, 10);
                if (!Number.isNaN(numericProductId) && deletedProductIdSet.has(numericProductId)) {
                    return false;
                }

                const isActive = (product.isActive !== false) && (product.product?.isActive !== false);
                if (!isActive) return false;

                if (product.deletedAt || product.isDeleted || product.product?.deletedAt || product.product?.isDeleted) {
                    return false;
                }

                return true;
            })
            .map(product => {
            const catalogProduct =
                product.product && typeof product.product === 'object' ? product.product : null;
            const catalog = resolveCatalogPricing(catalogProduct);

            let itemsPerBox = catalog?.itemsPerBox
                ?? catalogProduct?.itemsPerBox
                ?? product.itemsPerBox
                ?? 1;
            if (!itemsPerBox || itemsPerBox < 1) {
                itemsPerBox = 1;
            }

            let unitPrice;
            let boxPrice;
            if (catalog && catalogProduct) {
                unitPrice = catalog.unitPrice;
                boxPrice = catalog.boxPrice;
                itemsPerBox = catalog.itemsPerBox;
            } else {
                const warehouseBoxPrice = Number(product.price ?? 0) || 0;
                boxPrice = warehouseBoxPrice;
                unitPrice = warehouseBoxPrice / itemsPerBox;
            }

            // Получаем категорию
            const category = product.product?.categories?.[0]?.name || 
                            product.categories?.[0]?.name || 
                            product.category || 
                            'БАСКЕТ';
            
            // Формируем объект продукта для ProductTile
            return {
                id: product.product?.id || product.productId || product.id,
                name: product.name || product.product?.name,
                title: product.name || product.product?.name,
                price: unitPrice,
                pricePerItem: unitPrice,
                boxPrice,
                itemsPerBox,
                priceInfo: catalogProduct?.priceInfo ?? product.priceInfo ?? null,
                stockQuantity: product.quantity || product.stockQuantity || 0,
                availableQuantity: product.availableQuantity || product.quantity || 0,
                isActive: (product.isActive !== false) && (product.product?.isActive !== false),
                images: product.images || product.product?.images || [],
                image: (product.images && product.images[0]) || (product.product?.images && product.product.images[0]),
                category: category,
                categories: product.product?.categories || product.categories || [],
                originalData: catalogProduct || product,
            };
        });
    }, [products, deletedProductIdSet]);

    const renderItem = useCallback(({ item }) => (
        <View style={styles.productCardWrapper}>
            <ProductTile product={item} hideAddToCart />
        </View>
    ), [styles.productCardWrapper]);

    const keyExtractor = useCallback(
        (item) => `warehouse-product-${item.id}`,
        []
    );

    const handleEndReached = useCallback(() => {
        if (!loading && !loadingMore && hasMore && typeof onLoadMore === 'function') {
            onLoadMore();
        }
    }, [loading, loadingMore, hasMore, onLoadMore]);

    const listFooter = useMemo(() => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={isDark ? colors.primary : Color.blue2} />
            </View>
        );
    }, [loadingMore, styles.footerLoader, isDark, colors.primary]);

    // «Шапка» экрана + заголовок ассортимента и состояния загрузки/пустоты.
    const listHeader = useMemo(() => (
        <>
            {ListHeaderComponent}
            <View style={styles.sectionContainer}>
                <Text style={styles.title}>Ассортимент склада</Text>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={isDark ? colors.primary : Color.blue2} />
                        <Text style={styles.loadingText}>Загрузка товаров...</Text>
                    </View>
                ) : normalizedProducts.length === 0 ? (
                    <Text style={styles.hint}>
                        На этом складе пока нет товаров
                    </Text>
                ) : null}
            </View>
        </>
    ), [ListHeaderComponent, loading, normalizedProducts.length, styles, isDark, colors.primary]);

    return (
        <FlatList
            data={loading ? [] : normalizedProducts}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={styles.row}
            ListHeaderComponent={listHeader}
            ListFooterComponent={listFooter}
            contentContainerStyle={contentContainerStyle}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={false}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={7}
            updateCellsBatchingPeriod={50}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            {...flatListProps}
        />
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    sectionContainer: {
        marginTop: normalize(16),
        marginBottom: normalize(12),
        paddingHorizontal: normalize(20),
    },
    title: {
        fontSize: normalizeFont(18),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(12),
    },
    hint: {
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: normalize(16),
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: normalize(20),
    },
    loadingText: {
        marginLeft: normalize(8),
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
    },
    row: {
        justifyContent: 'center',
        gap: normalize(24),
        paddingHorizontal: normalize(20),
        marginBottom: normalize(20),
    },
    productCardWrapper: {
        width: normalize(192),
    },
    footerLoader: {
        paddingVertical: normalize(16),
        alignItems: 'center',
        justifyContent: 'center',
    },
});
