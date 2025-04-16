import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/app/providers/themeProvider/ThemeProvider';
import { FontFamily, FontSize } from '@/app/styles/GlobalStyles';

export const ProductPrice = ({ price, weight }) => {
    const { colors } = useTheme();
    const priceTextRef = useRef(null);

    return (
        <View style={styles.container}>
            <View style={styles.priceContainer}>
                <Text
                    ref={priceTextRef}
                    style={[styles.priceText, { color: colors.text }]}
                >
                    {price} р
                </Text>
                <Text style={[styles.unitText, { color: colors.border }]}>
                    / 1 шт
                </Text>
            </View>
            {weight ? <Text style={[styles.weightText, { color: colors.border }]}>
                ~ {weight} грамм
            </Text> : null
            }
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
    priceText: {
        fontFamily: FontFamily.montserratSemiBold,
        fontSize: 30,
        fontWeight: 'bold',
    },
    unitText: {
        marginLeft: 8,
        fontFamily: FontFamily.montserratSemiBold,
        fontSize: FontSize.size_3xl,
        fontWeight: '600',
    },
    weightText: {
        fontFamily: FontFamily.montserratSemiBold,
        fontSize: FontSize.size_3xl,
        fontWeight: '600',
        marginTop: 8,
    },
});