import React, { memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { resetCurrentProduct } from '@entities/product';
import { ProductCard } from "@entities/product/ui/ProductCard";

export const ProductCardItem = memo(({ product, onProductPress, fromScreen }) => {
    // Если продукт не передан или пустой, не рендерим ничего
    if (!product) return null;

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
    // Проверяем основные поля продукта для оптимизации перерендеринга
    if (prevProps.fromScreen !== nextProps.fromScreen) return false;
    if (prevProps.onProductPress !== nextProps.onProductPress) return false;

    const prevProduct = prevProps.product;
    const nextProduct = nextProps.product;

    if (prevProduct === nextProduct) return true;

    if (!prevProduct || !nextProduct) return false;

    // Проверяем основные поля продукта
    return (
        prevProduct.id === nextProduct.id &&
        prevProduct.title === nextProduct.title &&
        prevProduct.price === nextProduct.price &&
        prevProduct.description === nextProduct.description &&
        JSON.stringify(prevProduct.image) === JSON.stringify(nextProduct.image) &&
        prevProduct.originalData?.isActive === nextProduct.originalData?.isActive &&
        prevProduct.originalData?.stockQuantity === nextProduct.originalData?.stockQuantity
    );
});