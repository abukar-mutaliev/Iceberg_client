import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { FontFamily, FontSize, Color } from '@app/styles/GlobalStyles';
import { HighlightChange } from '@shared/ui/HighlightChange/HighlightChange';
import {formatPrice} from "@entities/cart";

export const ProductPrice = ({ price, weight, product }) => {
    const { colors } = useTheme();
    const priceTextRef = useRef(null);

    return (
        <View style={styles.container}>
            <View style={styles.priceContainer}>
                <HighlightChange value={price} style={styles.priceHighlight}>
                    <Text
                        ref={priceTextRef}
                        style={[styles.priceText, { color: Color.dark }]}
                    >
                        {price} р
                    </Text>
                </HighlightChange>
                <Text style={[styles.unitText, { color: Color.colorDarkgray }]}>
                    / 1 шт
                </Text>
            </View>

            <View style={styles.priceContainer}>
                <HighlightChange value={price} style={styles.priceHighlight}>
                    <Text
                        ref={priceTextRef}
                        style={[styles.boxPriceText, { color: Color.dark }]}
                    >
                        {formatPrice(product?.boxPrice || (product?.price * (product?.itemsPerBox || 1)))}

                    </Text>
                </HighlightChange>
                <Text style={[styles.boxUnitText, { color: Color.colorDarkgray }]}>
                    / 1 коробка
                </Text>
            </View>
            {weight ? (
                <HighlightChange value={weight} style={styles.weightHighlight}>
                    <Text style={[styles.weightText, { color: colors.border }]}>
                        ~ {weight} грамм
                    </Text>
                </HighlightChange>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 6,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    priceHighlight: {
        borderRadius: 8,
    },
    weightHighlight: {
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    priceText: {
        fontFamily: FontFamily.montserratSemiBold,
        fontSize: 30,
        fontWeight: 'bold',
    },
    boxPriceText: {
        fontFamily: FontFamily.montserratSemiBold,
        fontSize: 15,
        fontWeight: 'bold',
    },
    unitText: {
        marginLeft: 8,
        fontFamily: FontFamily.montserratSemiBold,
        fontSize: FontSize.size_3xl,
        fontWeight: '600',
    },
    boxUnitText: {
        marginLeft: 8,
        fontFamily: FontFamily.montserratSemiBold,
        fontSize: FontSize.size_sm,
        fontWeight: '600',
    },
    weightText: {
        fontFamily: FontFamily.montserratSemiBold,
        fontSize: FontSize.size_3xl,
        fontWeight: '600',
        marginTop: 8,
    },
});