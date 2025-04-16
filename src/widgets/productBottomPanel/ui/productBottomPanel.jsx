import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AddToCartButton } from '@/features/addToCart/ui/AddToCartButton';
import {useTheme} from "@app/providers/themeProvider/ThemeProvider";
import {ProductFavoriteButton} from "@features/productFavorite";

export const BottomPanel = ({
                                price,
                                quantity,
                                isInCart,
                                isFavorite,
                                onAddToCart,
                                onToggleFavorite,
                            }) => {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            <AddToCartButton
                isInCart={isInCart}
                onPress={onAddToCart}
                style={styles.addToCartButton}
            />

            <ProductFavoriteButton
                isFavorite={isFavorite}
                onToggleFavorite={onToggleFavorite}
                style={styles.favoriteButton}
            />

            <View style={styles.totalContainer}>
                <Text style={[styles.totalText, { color: colors.primary }]}>
                    {price * quantity} р
                </Text>
            </View>
        </View>
    );
};