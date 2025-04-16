import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { FontFamily, FontSize, Border } from '@/app/styles/GlobalStyles';
import {useTheme} from "@react-navigation/native";

export const AddToCartButton = ({ isInCart, onPress, style }) => {
    const { colors } = useTheme();

    return (
        <Pressable
            style={[
                styles.container,
                { backgroundColor: isInCart ? colors.secondary : colors.primary },
                style
            ]}
            onPress={onPress}
        >
            <Text style={styles.text}>
                {isInCart ? 'Добавлено в корзину' : 'В корзину'}
            </Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Border.br_mini,
        height: 52,
    },
    text: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_mid,
        color: '#fff',
        fontWeight: '500',
    },
});