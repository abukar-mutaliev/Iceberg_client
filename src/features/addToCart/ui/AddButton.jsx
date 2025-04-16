import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useDispatch } from 'react-redux';
import { addToCart } from '@features/addToCart/model/slice';
import { PlusIcon } from '@shared/ui/Icon/PlusIcon';
import { Color, Border } from '@app/styles/GlobalStyles';

export const AddButton = ({ product, style, isWhite = false }) => {
    const dispatch = useDispatch();

    const handleAddToCart = () => {
        if (product) {
            const productToAdd = product.originalData || product;

            dispatch(addToCart({
                id: productToAdd.id,
                name: productToAdd.name || productToAdd.title,
                price: productToAdd.price,
                image: productToAdd.image,
                quantity: 1
            }));

            console.log(`Товар "${productToAdd.name || productToAdd.title}" добавлен в корзину`);
        }
    };

    const backgroundColor = isWhite ? Color.colorLightMode : Color.purpleSoft;
    const iconColor = isWhite ? Color.purpleSoft : Color.colorLightMode;

    return (
        <View style={[styles.container, style]}>
            <View style={[styles.background, { backgroundColor }]} />
            <Pressable
                style={styles.buttonContent}
                onPress={handleAddToCart}
            >
                <PlusIcon size={22} color={iconColor} />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 57,
        height: 57,
        position: 'relative',
    },
    background: {
        zIndex: 0,
        borderBottomRightRadius: Border.br_xl,
        borderTopLeftRadius: Border.br_xl,
        bottom: 0,
        right: 0,
        height: '100%',
        width: '100%',
        position: 'absolute',
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: 'transparent',
    },
    buttonContent: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    }
});