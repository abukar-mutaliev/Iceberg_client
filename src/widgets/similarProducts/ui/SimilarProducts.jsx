import React, { useMemo, useCallback } from 'react';
import { FontFamily, FontSize, Color, Border } from '@app/styles/GlobalStyles';
import { View, Text, StyleSheet, FlatList, Dimensions, PixelRatio } from 'react-native';

// Прямой импорт компонента
import { ProductTile } from '@entities/product/ui/ProductTile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Оптимизированный компонент для отображения похожих продуктов
 * Убрана зависимость от useRoute, теперь currentProductId передается как проп
 */
export const SimilarProducts = React.memo(({
                                               products,
                                               onProductPress,
                                               currentProductId,
                                               color
                                           }) => {
    // Фильтруем и валидируем продукты
    const validProducts = useMemo(() => {
        if (!Array.isArray(products)) return [];

        return products
            .filter(p => p && p.id && p.id !== currentProductId)
            .slice(0, 6); // Ограничиваем до 6 продуктов для лучшей производительности
    }, [products, currentProductId]);

    // Обработчик нажатия на похожий продукт
    const handleProductPress = useCallback((product) => {
        if (onProductPress && product?.id) {
            onProductPress(product.id);
        }
    }, [onProductPress]);

    // Проверка доступности компонента ProductTile
    const isValidReactComponent = useMemo(() => {
        const isValid = ProductTile &&
            (typeof ProductTile === 'function' ||
                (typeof ProductTile === 'object' && ProductTile.$$typeof));

        if (process.env.NODE_ENV === 'development' && !isValid) {
            console.error('ProductTile не является валидным React компонентом:', {
                type: typeof ProductTile,
                value: ProductTile
            });
        }

        return isValid;
    }, []);

    // Рендерер элемента списка с улучшенной проверкой компонента
    const renderItem = useCallback(({ item, index }) => {
        // Проверка на валидность React компонента
        if (!isValidReactComponent) {
            return (
                <View style={[styles.productCardContainer, styles.errorContainer]}>
                    <Text style={styles.errorText}>Ошибка компонента</Text>
                </View>
            );
        }

        // Проверяем валидность данных продукта
        if (!item || !item.id) {
            return null;
        }

        // Передаем правильные пропсы в компонент
        return (
            <View style={styles.productCardContainer}>
                <ProductTile
                    product={item}
                    onPress={() => handleProductPress(item)}
                    testID={`similar-product-${item.id}`}
                />
            </View>
        );
    }, [handleProductPress, isValidReactComponent]);

    // Мемоизированная функция keyExtractor
    const keyExtractor = useCallback((item) => `similar-${item.id}`, []);

    // Мемоизированная функция getItemLayout для лучшей производительности
    const getItemLayout = useCallback((data, index) => {
        const itemHeight = normalize(269) + normalize(20); // высота + margin
        return {
            length: itemHeight,
            offset: itemHeight * Math.floor(index / 2), // учитываем 2 колонки
            index,
        };
    }, []);

    // Дополнительное логирование только в режиме разработки
    if (process.env.NODE_ENV === 'development') {
        console.log('SimilarProducts render:', {
            productsCount: validProducts.length,
            currentProductId,
            hasCustomHandler: !!onProductPress,
            isValidComponent: isValidReactComponent
        });
    }

    // Для пустого списка сразу возвращаем сообщение без перерисовки
    if (!validProducts || validProducts.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>
                    Похожие товары
                </Text>
                <View style={[styles.emptyContainer, {
                    backgroundColor: 'rgba(51, 57, 176, 0.05)'
                }]}>
                    <Text style={[styles.emptyText, { color: Color.colorSilver_100 }]}>
                        Похожие товары не найдены
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                Похожие товары
            </Text>
            <FlatList
                data={validProducts}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                numColumns={2}
                columnWrapperStyle={styles.row}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
                contentContainerStyle={styles.listContentContainer}
                initialNumToRender={4}
                maxToRenderPerBatch={4}
                windowSize={2}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={50}
                // Добавляем дополнительные оптимизации
                disableVirtualization={false}
                legacyImplementation={false}
            />
        </View>
    );
}, (prevProps, nextProps) => {
    // Оптимизированная функция сравнения для мемоизации

    // Сравниваем currentProductId
    if (prevProps.currentProductId !== nextProps.currentProductId) {
        return false;
    }

    // Проверяем наличие массивов
    if (!prevProps.products && !nextProps.products) return true;
    if (!prevProps.products || !nextProps.products) return false;

    // Если количество продуктов изменилось, обновляем компонент
    if (prevProps.products.length !== nextProps.products.length) return false;

    // Проверяем только ID продуктов, что гораздо быстрее глубокого сравнения
    for (let i = 0; i < Math.min(prevProps.products.length, 6); i++) {
        if (prevProps.products[i]?.id !== nextProps.products[i]?.id) return false;
    }

    // Проверяем функцию onProductPress (по ссылке)
    if (prevProps.onProductPress !== nextProps.onProductPress) return false;

    return true;
});

// Добавляем displayName для удобства отладки
SimilarProducts.displayName = 'SimilarProducts';

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
    row: {
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
    emptyContainer: {
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
    listContentContainer: {
        paddingBottom: 0,
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffeeee',
        borderWidth: 1,
        borderColor: '#ffaaaa',
    },
    errorText: {
        color: '#ff0000',
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        textAlign: 'center',
    }
});