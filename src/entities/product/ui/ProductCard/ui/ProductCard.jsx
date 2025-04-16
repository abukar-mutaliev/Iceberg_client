import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useDispatch } from 'react-redux';
import { AddButton } from '@features/addToCart/ui/AddButton';
import { Color, Border, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { addToCart } from "@features/addToCart/model/slice";

export const ProductCard = ({ product, onPress }) => {
    const dispatch = useDispatch();

    if (!product || !product.id || !product.title || !product.price) {
        return null;
    }

    const handleAddToCart = () => {
        dispatch(addToCart(product));
    };

    return (
        <Pressable style={styles.container} onPress={onPress}>
            <Image
                style={styles.productImage}
                resizeMode="cover"
                source={product.image}
            />

            <View style={styles.contentContainer}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                        {product.title}
                    </Text>
                </View>

                <View style={styles.descriptionContainer}>
                    <Text style={styles.description} numberOfLines={3} ellipsizeMode="tail">
                        {product.description || 'Без описания'}
                    </Text>
                </View>

                <View style={styles.priceWrapper}>
                    <Text style={styles.price}>{product.price} р</Text>
                    <Text style={styles.priceUnit}>/ 1 шт</Text>
                </View>
            </View>

            <AddButton
                style={styles.addButton}
                product={product}
            />
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 172,
        borderWidth: 0.5,
        borderColor: Color.purpleSoft,
        borderStyle: 'solid',
        borderRadius: Border.br_xl,
        backgroundColor: Color.colorLightMode,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 20,
        marginHorizontal: 16,
    },
    productImage: {
        width: 150,
        height: '100%',
        left: 0,
        bottom: 0,
        top: 0,
        position: 'absolute',
        borderRadius: Border.br_xl,
    },
    contentContainer: {
        marginLeft: 168,
        width: '50%',
        flex: 1,
        paddingTop: 15,
        paddingRight: 16,
    },
    titleContainer: {
        height: 20,
        width: "100%",
    },
    title: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_sm,
        fontWeight: 'bold',
        color: Color.purpleSoft,
        textAlign: 'left',
    },
    descriptionContainer: {
        marginTop: 10,
        height: 43,
        width: "100%",
    },
    description: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xs,
        fontWeight: '500',
        color: Color.colorCornflowerblue,
        textAlign: 'left',
    },
    priceWrapper: {
        marginTop: 33,
        flexDirection: 'row',
        alignItems: 'flex-end',
        width: "50%",
    },
    price: {
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.purpleSoft,
        textAlign: 'left',
        fontSize: 19,

    },
    priceUnit: {
        fontFamily: FontFamily.sFProText,
        fontSize: 10,
        fontWeight: '600',
        color: Color.colorSilver_100,
        textAlign: 'left',
        marginLeft: 5,
        marginBottom: 4,
    },
    addButton: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 62,
        height: 62,
    }
});