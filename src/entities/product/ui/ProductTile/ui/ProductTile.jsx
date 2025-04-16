import React from 'react';
import {View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, PixelRatio} from 'react-native';
import { FontFamily, FontSize, Border, Color } from '@app/styles/GlobalStyles';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PlusIcon } from '@shared/ui/Icon/PlusIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};
export const ProductTile = ({ product, onPress }) => {
    const navigation = useNavigation();
    const route = useRoute();

    const handleProductPress = () => {
        if (onPress) {
            onPress();
        } else {
            const currentProductId = route.params?.productId;
            navigation.push('ProductDetail', {
                productId: product.id,
                previousProductId: currentProductId,
                fromScreen: 'ProductTile'
            });
        }
    };

    const handleAddToCart = () => {
        if (product) {
            const productToAdd = {
                id: product.id,
                name: product.name || product.title,
                price: product.price,
                image: product.images && product.images.length > 0
                    ? { uri: product.images[0] }
                    : require('@/assets/images/placeholder.png'),
                quantity: 1
            };
            console.log(`Товар "${productToAdd.name}" добавлен в корзину`);
        }
    };

    if (!product) return null;

    return (
        <TouchableOpacity style={styles.container} onPress={handleProductPress} activeOpacity={0.95}>
            <Image
                style={styles.productImage}
                resizeMode="cover"
                source={
                    product.images && product.images.length > 0
                        ? { uri: product.images[0] }
                        : require('@/assets/images/placeholder.png')
                }
            />
            <View style={styles.infoContainer}>
                <Text style={styles.category}>
                    {product.category?.toUpperCase() || 'БАСКЕТ'}
                </Text>
                <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                    {product.name || product.title || 'Товар'}
                </Text>
                <View style={styles.priceContainer}>
                    <Text style={styles.price}>
                        {product.price || 0} р
                    </Text>
                    <Text style={styles.unit}>
                        / 1 шт
                    </Text>
                </View>
            </View>
            <TouchableOpacity style={styles.addButtonContainer} onPress={handleAddToCart}>
                <View style={styles.addButtonBackground} />
                <View style={styles.addButtonContent}>
                    <PlusIcon size={22} color={Color.purpleSoft} />
                </View>
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderColor: Color.purpleSoft,
        borderWidth: 1,
        backgroundColor: Color.colorLightMode,
        width: normalize(192),
        height: normalize(269),
        marginBottom: normalize(20),
        borderRadius: normalize(Border.br_xl),
        overflow: 'hidden',
    },
    productImage: {
        width: '100%',
        height: 142,
    },
    infoContainer: {
        flex: 1,
        paddingLeft: 10,
        backgroundColor: Color.purpleSoft,
        paddingTop: 4,
    },
    category: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        fontWeight: '500',
        textTransform: 'uppercase',
    },
    title: {
        color: Color.colorLightMode,
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        fontWeight: '600',
        marginTop: 2,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 4,
    },
    price: {
        color: Color.colorLightMode,
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_lg,
        fontWeight: '700',
    },
    unit: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        marginLeft: 4,
    },
    addButtonContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 45,
        height: 40,
        zIndex: 2,
    },
    addButtonBackground: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: Color.colorLightMode,
        borderBottomRightRadius: Border.br_sm,
        borderTopLeftRadius: Border.br_xl,
        borderWidth: 0.5,
        borderColor: Color.colorLightMode,
        zIndex: 0,
    },
    addButtonContent: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    }
});