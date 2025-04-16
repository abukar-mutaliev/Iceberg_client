import React from 'react';
import { Pressable } from 'react-native';
import {useTheme} from "@react-navigation/native";
import FavoriteButtonSvg from "@shared/ui/Icon/productDetailScreen/ButtonFavorite";

export const ProductFavoriteButton = ({ isFavorite, onToggleFavorite, style }) => {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={onToggleFavorite}
        >
            <FavoriteButtonSvg
                color={colors.primary}
                filled={isFavorite}
            />
        </Pressable>
    );
};
