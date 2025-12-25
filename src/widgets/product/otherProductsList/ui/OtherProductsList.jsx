import React, { useMemo, useCallback, useEffect } from 'react';
import { FontFamily, FontSize, Color, Border } from '@app/styles/GlobalStyles';
import { View, Text, StyleSheet, Dimensions, PixelRatio, ActivityIndicator } from 'react-native';
import { ProductTile } from '@entities/product/ui/ProductTile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Компонент для отображения остальных товаров без использования FlatList
 * Используется внутри ScrollView, поэтому не может использовать VirtualizedList
 */
export const OtherProductsList = React.memo(({
    products,
    onProductPress,
    currentProductId,
    onEndReached,
    isLoadingMore = false,
    hasMore = true
}) => {
    // Фильтруем и валидируем продукты
    const validProducts = useMemo(() => {
        if (!Array.isArray(products)) return [];
        return products.filter(p => p && p.id && p.id !== currentProductId);
    }, [products, currentProductId]);

    // Обработчик нажатия на товар
    const handleProductPress = useCallback((product) => {
        if (onProductPress && product?.id) {
            onProductPress(product.id);
        }
    }, [onProductPress]);

    // Проверка достижения конца списка для загрузки следующей страницы
    useEffect(() => {
        if (validProducts.length > 0 && hasMore && !isLoadingMore && onEndReached) {
            // Загружаем следующую страницу, если товаров достаточно много
            // Это будет вызываться при монтировании, если товаров уже много
            const shouldLoadMore = validProducts.length >= 10;
            if (shouldLoadMore) {
                // Небольшая задержка, чтобы не вызывать сразу
                const timer = setTimeout(() => {
                    if (hasMore && !isLoadingMore) {
                        onEndReached();
                    }
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [validProducts.length, hasMore, isLoadingMore, onEndReached]);

    if (!validProducts || validProducts.length === 0) {
        return null;
    }

    // Разбиваем товары на ряды по 2
    const rows = [];
    for (let i = 0; i < validProducts.length; i += 2) {
        rows.push(validProducts.slice(i, i + 2));
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                Другие товары
            </Text>
            <View style={styles.productsContainer}>
                {rows.map((row, rowIndex) => (
                    <View key={`row-${rowIndex}`} style={styles.row}>
                        {row.map((product) => (
                            <View key={product.id} style={styles.productCardContainer}>
                                <ProductTile
                                    product={product}
                                    onPress={() => handleProductPress(product)}
                                    testID={`other-product-${product.id}`}
                                />
                            </View>
                        ))}
                        {/* Заполнитель для нечетного количества товаров в последнем ряду */}
                        {row.length === 1 && <View style={styles.productCardContainer} />}
                    </View>
                ))}
            </View>
            {isLoadingMore && (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="small" color={Color.purpleSoft} />
                    <Text style={styles.loadingText}>Загружаем ещё товары...</Text>
                </View>
            )}
            {/* Триггер для загрузки следующей страницы - невидимый элемент внизу */}
            {hasMore && !isLoadingMore && (
                <View
                    style={styles.loadMoreTrigger}
                    onLayout={(event) => {
                        // Когда этот элемент становится видимым, загружаем следующую страницу
                        const { y, height } = event.nativeEvent.layout;
                        if (y < SCREEN_WIDTH * 2 && onEndReached) {
                            onEndReached();
                        }
                    }}
                />
            )}
        </View>
    );
}, (prevProps, nextProps) => {
    // Оптимизированная функция сравнения для мемоизации
    if (prevProps.currentProductId !== nextProps.currentProductId) return false;
    if (prevProps.isLoadingMore !== nextProps.isLoadingMore) return false;
    if (prevProps.hasMore !== nextProps.hasMore) return false;
    if (prevProps.onProductPress !== nextProps.onProductPress) return false;
    if (prevProps.onEndReached !== nextProps.onEndReached) return false;

    if (!prevProps.products && !nextProps.products) return true;
    if (!prevProps.products || !nextProps.products) return false;
    if (prevProps.products.length !== nextProps.products.length) return false;

    // Проверяем только ID продуктов
    for (let i = 0; i < Math.min(prevProps.products.length, 20); i++) {
        if (prevProps.products[i]?.id !== nextProps.products[i]?.id) return false;
    }

    return true;
});

OtherProductsList.displayName = 'OtherProductsList';

const styles = StyleSheet.create({
    container: {
        marginTop: 30,
        marginHorizontal: 15,
    },
    title: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_lg,
        fontWeight: '600',
        marginBottom: 16,
        color: "#000",
    },
    productsContainer: {
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    productCardContainer: {
        width: normalize(192),
        height: normalize(269),
        marginBottom: normalize(20),
        borderRadius: normalize(Border.br_xl),
        overflow: 'hidden',
    },
    loaderContainer: {
        paddingVertical: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 8,
        fontSize: FontSize.size_xs,
        fontFamily: FontFamily.sFProText,
        color: Color.colorSilver_100,
        textAlign: 'center',
    },
    loadMoreTrigger: {
        height: 100,
        width: '100%',
    },
});









