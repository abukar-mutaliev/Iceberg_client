import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useTheme } from '@/app/providers/themeProvider/ThemeProvider';
import Text from '@/shared/ui/Text/Text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ProductsSlider = ({ products = [], onProductPress = () => {}, showRating = false }) => {
    const { colors } = useTheme();

    if (!products || products.length === 0) return null;

    const renderProduct = (item) => {
        if (!item || !item.id) return null;

        const isSimpleProduct = !item.hasOwnProperty('images') && !item.hasOwnProperty('price');

        let productImage = null;
        let productPrice = 'Цена по запросу';

        if (!isSimpleProduct) {
            productImage = item.images && item.images.length > 0 ? { uri: item.images[0] } : null;
            productPrice = item.price ? `${item.price.toFixed(2)} руб.` : 'Цена по запросу';
        }

        const productName = item.name || 'Без названия';

        return (
            <TouchableOpacity
                key={String(item.id)}
                style={[styles.productCard]}
                onPress={() => onProductPress(item.id)}
            >
                {productImage ? (
                    <Image source={productImage} style={styles.productImage} resizeMode="cover" />
                ) : (
                    <View style={[styles.productImagePlaceholder, { backgroundColor: colors.background }]}>
                        <Text style={{ color: colors.secondary }}>Нет фото</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.productsList}
                bounces={true}
                // Дополнительные свойства для управления жестами
                waitFor={[]}
                simultaneousHandlers={[]}
            >
                {products.map((item) => renderProduct(item))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: SCREEN_WIDTH * 0.047,
        width: '100%',
    },
    productsList: {
        paddingHorizontal: SCREEN_WIDTH * 0.037,
    },
    productCard: {
        width: SCREEN_WIDTH * 0.35,
        marginHorizontal: SCREEN_WIDTH * 0.015,
        borderRadius: SCREEN_WIDTH * 0.055,
        overflow: 'visible',
    },
    productImage: {
        width: '100%',
        height: SCREEN_WIDTH * 0.40,
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

export { ProductsSlider };