import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator
} from 'react-native';
import { useSelector } from 'react-redux';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { ProductTile } from '@entities/product/ui/ProductTile';
import { selectDeletedProductIds } from '@entities/product/model/selectors';

export const WarehouseProductsList = ({ warehouseId, products, loading }) => {
    const deletedProductIds = useSelector(selectDeletedProductIds);

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
            // Извлекаем itemsPerBox
            const itemsPerBox = product.itemsPerBox || product.product?.itemsPerBox || 1;
            
            // Получаем цену
            const price = product.price || product.product?.price || 0;
            const pricePerItem = price / itemsPerBox;
            
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
                price: pricePerItem,
                boxPrice: price,
                itemsPerBox: itemsPerBox,
                stockQuantity: product.quantity || product.stockQuantity || 0,
                availableQuantity: product.availableQuantity || product.quantity || 0,
                isActive: (product.isActive !== false) && (product.product?.isActive !== false),
                images: product.images || product.product?.images || [],
                image: (product.images && product.images[0]) || (product.product?.images && product.product.images[0]),
                category: category,
                categories: product.product?.categories || product.categories || [],
                originalData: product.product || product,
            };
        });
    }, [products, deletedProductIdSet]);

    // Разбиваем товары на строки по 2 элемента
    const productRows = useMemo(() => {
        const rows = [];
        for (let i = 0; i < normalizedProducts.length; i += 2) {
            rows.push(normalizedProducts.slice(i, i + 2));
        }
        return rows;
    }, [normalizedProducts]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Color.blue2} />
                <Text style={styles.loadingText}>Загрузка товаров...</Text>
            </View>
        );
    }

    if (normalizedProducts.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Ассортимент склада</Text>
                <Text style={styles.hint}>
                    На этом складе пока нет товаров
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Ассортимент склада</Text>
            <View style={styles.productsContainer}>
                {productRows.map((row, rowIndex) => (
                    <View 
                        key={`row-${rowIndex}`} 
                        style={[
                            styles.row,
                            row.length === 1 && styles.rowCenter
                        ]}
                    >
                        {row.map((item, itemIndex) => (
                            <View 
                                key={`warehouse-product-${item.id}`} 
                                style={[
                                    styles.productCardWrapper,
                                    row.length === 1 && styles.productCardWrapperCenter,
                                    row.length === 2 && itemIndex === 0 && styles.productCardWrapperLeft,
                                    row.length === 2 && itemIndex === 1 && styles.productCardWrapperRight
                                ]}
                            >
                                <ProductTile
                                    product={item}
                                />
                            </View>
                        ))}
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: normalize(16),
        marginBottom: normalize(16),
    },
    title: {
        fontSize: normalizeFont(18),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.dark,
        marginBottom: normalize(12),
    },
    hint: {
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProText,
        color: Color.gray,
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
        color: Color.gray,
    },
    productsContainer: {
        paddingBottom: normalize(8),
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: normalize(20),
        paddingHorizontal: normalize(20),
        alignItems: 'center',
    },
    rowCenter: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 0,
        width: '100%',
    },
    productCardWrapper: {
        width: normalize(192),
    },
    productCardWrapperCenter: {
        // Без дополнительных отступов для центрированной карточки
    },
    productCardWrapperLeft: {
        marginRight: normalize(12),
    },
    productCardWrapperRight: {
        marginLeft: normalize(12),
    },
});
