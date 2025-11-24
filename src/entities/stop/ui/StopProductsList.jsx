import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator
} from 'react-native';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { stopApi } from '../api/stopApi';
import { ProductTile } from '@entities/product/ui/ProductTile';

export const StopProductsList = ({ stopId, isActive }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (stopId && isActive) {
            loadProducts();
        }
    }, [stopId, isActive]);

    const loadProducts = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await stopApi.getStopProducts(stopId);
            const productsData = response.data?.products || [];
            setProducts(productsData);
        } catch (err) {
            console.error('Ошибка загрузки товаров остановки:', err);
            setError('Не удалось загрузить товары');
        } finally {
            setLoading(false);
        }
    };

    // Преобразуем данные товаров из остановки в формат для ProductTile
    const normalizedProducts = useMemo(() => {
        return products.map(product => {
            // Извлекаем itemsPerBox из разных возможных мест
            const itemsPerBox = product.itemsPerBox || product.product?.itemsPerBox || 1;
            
            // Получаем эффективную цену из priceInfo (это цена за коробку)
            const effectivePrice = product.priceInfo?.effectivePrice || 
                                   product.priceInfo?.stopPrice || 
                                   product.priceInfo?.warehousePrice || 
                                   product.priceInfo?.basePrice || 
                                   product.boxPrice || 
                                   (product.price * itemsPerBox);
            
            // Базовая цена за коробку (для расчета цены за штуку)
            const basePrice = product.priceInfo?.basePrice || 
                             product.boxPrice || 
                             (product.price * itemsPerBox);
            
            // Цена за штуку (для отображения в ProductTile)
            const pricePerItem = basePrice / itemsPerBox;
            
            // Получаем категорию
            const category = product.product?.categories?.[0]?.name || 
                            product.categories?.[0]?.name || 
                            product.category || 
                            'БАСКЕТ';
            
            // Формируем объект продукта для ProductTile
            return {
                id: product.id || product.productId || product.product?.id,
                name: product.name || product.product?.name,
                title: product.name || product.product?.name, // ProductTile может использовать title
                price: pricePerItem, // Цена за штуку (базовая, будет переопределена в ProductTile если есть priceInfo)
                boxPrice: effectivePrice, // Сохраняем эффективную цену за коробку
                itemsPerBox: itemsPerBox, // Важно для расчета цены за штуку из цены за коробку
                stockQuantity: product.quantity || 0, // Количество коробок в фургоне
                availableQuantity: product.quantity || 0,
                isActive: (product.isActive !== false) && (product.product?.isActive !== false),
                images: product.images || product.product?.images || [],
                image: (product.images && product.images[0]) || (product.product?.images && product.product.images[0]),
                category: category,
                categories: product.product?.categories || product.categories || [],
                // Сохраняем priceInfo - ProductTile будет использовать его для отображения цены из фургона
                priceInfo: product.priceInfo,
                // Сохраняем оригинальные данные
                originalData: {
                    ...product,
                    priceInfo: product.priceInfo,
                    boxPrice: effectivePrice,
                    price: pricePerItem,
                    itemsPerBox: itemsPerBox
                }
            };
        });
    }, [products]);

    // Разбиваем товары на строки по 2 элемента (всегда вызываем useMemo перед условными возвратами)
    const productRows = useMemo(() => {
        const rows = [];
        for (let i = 0; i < normalizedProducts.length; i += 2) {
            rows.push(normalizedProducts.slice(i, i + 2));
        }
        return rows;
    }, [normalizedProducts]);

    if (!isActive) {
        return (
            <View style={styles.container}>
                <Text style={styles.hint}>
                    Товары доступны только во время работы остановки
                </Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Color.blue2} />
                <Text style={styles.loadingText}>Загрузка товаров...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    if (normalizedProducts.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.hint}>
                    В этом фургоне пока нет товаров
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Товары в фургоне</Text>
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
                                key={`stop-product-${item.id}`} 
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
    errorContainer: {
        paddingVertical: normalize(16),
    },
    errorText: {
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProText,
        color: Color.error || '#ff0000',
        textAlign: 'center',
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




