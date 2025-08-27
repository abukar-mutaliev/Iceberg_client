import React, { memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { resetCurrentProduct } from '@entities/product';
import { ProductCard } from "@entities/product/ui/ProductCard";

export const ProductCardItem = memo(({ product, onProductPress, fromScreen }) => {
    const navigation = useNavigation();
    const dispatch = useDispatch();

    const handlePress = useCallback((productId) => {
        if (onProductPress) {
            onProductPress(productId);
        } else {
            dispatch(resetCurrentProduct());
            // Используем прямую навигацию внутри текущего стека
            navigation.navigate('ProductDetail', {
                productId,
                fromScreen
            });
        }
    }, [onProductPress, dispatch, navigation, fromScreen]);

    return (
        <ProductCard
            product={product}
            onPress={handlePress}
        />
    );
}, (prevProps, nextProps) => {

    return false;
});