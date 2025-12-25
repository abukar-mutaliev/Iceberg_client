import React, { useCallback, useMemo, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import Text from '@shared/ui/Text/Text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Оптимизированный компонент карточки продукта с мемоизацией
 */
const ProductCard = memo(({ item, onPress, colors }) => {
    if (!item || !item.id) return null;

    // Определяем тип продукта
    const isSimpleProduct = !item.hasOwnProperty('images') && !item.hasOwnProperty('price');

    // Получаем изображение продукта
    const productImage = useMemo(() => {
        if (isSimpleProduct) return null;
        return item.images && item.images.length > 0 ? { uri: item.images[0] } : null;
    }, [item.images, isSimpleProduct]);

    // Получаем имя продукта
    const productName = item.name || 'Без названия';

    // Обработчик нажатия на продукт
    const handlePress = useCallback(() => {
        onPress(item.id);
    }, [item.id, onPress]);

    // Определяем стили для placeholder изображения
    const placeholderStyle = useMemo(() => [
        styles.productImagePlaceholder,
        { backgroundColor: colors.background }
    ], [colors.background]);

    return (
        <TouchableOpacity
            style={styles.productCard}
            onPress={handlePress}
        >
            {productImage ? (
                <Image
                    source={productImage}
                    style={styles.productImage}
                    resizeMode="cover"
                    // Параметры для оптимизации загрузки изображений
                    progressiveRenderingEnabled={true}
                    fadeDuration={100}
                />
            ) : (
                <View style={placeholderStyle}>
                    <Text style={{ color: colors.secondary }}>Нет фото</Text>
                </View>
            )}
        </TouchableOpacity>
    );
});

/**
 * Оптимизированный компонент слайдера продуктов
 */
const ProductsSlider = memo(({
                                 products = [],
                                 onProductPress = () => {},
                                 showRating = false
                             }) => {
    const { colors } = useTheme();

    // Проверяем наличие продуктов
    const hasProducts = useMemo(() =>
            Array.isArray(products) && products.length > 0,
        [products]
    );

    if (!hasProducts) return null;

    // Мемоизируем список карточек продуктов
    const productCards = useMemo(() =>
            products.map((item) => (
                <ProductCard
                    key={String(item.id)}
                    item={item}
                    onPress={onProductPress}
                    colors={colors}
                />
            )),
        [products, onProductPress, colors]
    );

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.productsList}
                bounces={true}
                waitFor={[]}
                simultaneousHandlers={[]}
                // Оптимизация прокрутки
                scrollEventThrottle={16}
                removeClippedSubviews={true}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={5}
            >
                {productCards}
            </ScrollView>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginTop: SCREEN_WIDTH * 0.047,
        width: '100%',
    },
    productsList: {
        paddingHorizontal: SCREEN_WIDTH * 0.037,
    },
    productCard: {
        width: SCREEN_WIDTH * 0.27,
        marginHorizontal: SCREEN_WIDTH * 0.015,
        borderRadius: SCREEN_WIDTH * 0.055,
        overflow: 'visible',
    },
    productImage: {
        width: '100%',
        height: SCREEN_WIDTH * 0.32,
        borderRadius: SCREEN_WIDTH * 0.055,
    },
    productImagePlaceholder: {
        width: '100%',
        height: SCREEN_WIDTH * 0.35,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: SCREEN_WIDTH * 0.023,
    }
});

// Добавляем displayName для удобства отладки
ProductCard.displayName = 'ProductCard';
ProductsSlider.displayName = 'ProductsSlider';

export { ProductsSlider };