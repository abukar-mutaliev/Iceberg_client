import React, { useCallback, useMemo, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import Text from '@shared/ui/Text/Text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Оптимизированный компонент карточки продукта с мемоизацией
 */
const ProductCard = memo(({ item, onPress, colors, isDark }) => {
    if (!item || !item.id) return null;

    const isSimpleProduct = !item.hasOwnProperty('images') && !item.hasOwnProperty('price');

    const productImage = useMemo(() => {
        if (isSimpleProduct) return null;
        return item.images && item.images.length > 0 ? { uri: item.images[0] } : null;
    }, [item.images, isSimpleProduct]);

    const productName = item.name || 'Без названия';

    const handlePress = useCallback(() => {
        onPress(item.id);
    }, [item.id, onPress]);

    const cardStyle = useMemo(() => [
        styles.productCard,
        {
            backgroundColor: isDark ? colors.surface : '#F2F2F2',
            shadowColor: isDark ? '#000' : 'rgba(100, 110, 220, 1)',
            shadowOpacity: isDark ? 0.4 : 0.22,
        },
    ], [colors, isDark]);

    const cardInnerStyle = useMemo(() => [
        styles.cardInner,
        {
            borderColor: isDark ? colors.divider : 'rgba(145, 158, 238, 0.25)',
        },
    ], [colors, isDark]);

    const imageWrapperStyle = useMemo(() => [
        styles.imageWrapper,
        { backgroundColor: isDark ? colors.surface : '#F2F2F2' },
    ], [colors, isDark]);

    const blurBackgroundStyle = useMemo(() => [
        styles.blurBackground,
        { opacity: isDark ? 0.55 : 0.9 },
    ], [isDark]);

    const placeholderStyle = useMemo(() => [
        styles.productImagePlaceholder,
        { backgroundColor: colors.background }
    ], [colors.background]);

    return (
        <TouchableOpacity
            style={cardStyle}
            onPress={handlePress}
            activeOpacity={0.85}
        >
            <View style={cardInnerStyle}>
                {productImage ? (
                    <View style={imageWrapperStyle}>
                        <Image
                            source={productImage}
                            style={blurBackgroundStyle}
                            resizeMode="cover"
                            blurRadius={20}
                        />
                        {isDark && <View style={styles.blurDarkOverlay} pointerEvents="none" />}
                        <Image
                            source={productImage}
                            style={styles.productImage}
                            resizeMode="contain"
                            progressiveRenderingEnabled={true}
                            fadeDuration={100}
                        />
                    </View>
                ) : (
                    <View style={placeholderStyle}>
                        <Text style={{ color: colors.secondary || colors.textSecondary }}>Нет фото</Text>
                    </View>
                )}
            </View>
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
    const { colors, isDark } = useTheme();

    const hasProducts = useMemo(() =>
            Array.isArray(products) && products.length > 0,
        [products]
    );

    if (!hasProducts) return null;

    const productCards = useMemo(() =>
            products.map((item) => (
                <ProductCard
                    key={String(item.id)}
                    item={item}
                    onPress={onProductPress}
                    colors={colors}
                    isDark={isDark}
                />
            )),
        [products, onProductPress, colors, isDark]
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
        paddingVertical: 0,
    },
    productsList: {
        paddingHorizontal: SCREEN_WIDTH * 0.037,
        paddingVertical: 20,
    },
    productCard: {
        width: SCREEN_WIDTH * 0.27,
        marginHorizontal: SCREEN_WIDTH * 0.015,
        borderRadius: SCREEN_WIDTH * 0.055,
        backgroundColor: '#F2F2F2',
        shadowColor: 'rgba(100, 110, 220, 1)',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 6,
        elevation: 6,
    },
    cardInner: {
        borderRadius: SCREEN_WIDTH * 0.055,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(145, 158, 238, 0.25)',
    },
    imageWrapper: {
        width: '100%',
        height: SCREEN_WIDTH * 0.32,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F2F2F2',
    },
    blurBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        opacity: 0.9,
    },
    blurDarkOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    productImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    productImagePlaceholder: {
        width: '100%',
        height: SCREEN_WIDTH * 0.32,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: SCREEN_WIDTH * 0.055,
    }
});

// Добавляем displayName для удобства отладки
ProductCard.displayName = 'ProductCard';
ProductsSlider.displayName = 'ProductsSlider';

export { ProductsSlider };