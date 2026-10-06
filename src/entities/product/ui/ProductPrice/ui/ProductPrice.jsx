import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { FontFamily, FontSize, Color } from '@app/styles/GlobalStyles';
import { HighlightChange } from '@shared/ui/HighlightChange/HighlightChange';
import {formatPrice} from "@entities/cart";
import {
    isWeightBasedProduct,
    estimateWeightBasedUnitPrice,
    getWeightBasedBoxPrice,
    getWeightBasedKgPerBox,
    formatWeightKg,
} from '@shared/lib/isWeightBasedProduct';

export const ProductPrice = ({ price, weight, product }) => {
    const { colors } = useTheme();
    const priceTextRef = useRef(null);

    const isFishCategory = () => isWeightBasedProduct(product);

    // Форматирование цены: рубли обычным шрифтом, копейки маленьким
    const formatPriceWithKopecks = (priceValue) => {
        if (!priceValue && priceValue !== 0) return { rubles: '0', kopecks: '00' };
        
        const numPrice = typeof priceValue === 'string' ? parseFloat(priceValue) : priceValue;
        const rubles = Math.floor(numPrice);
        const kopecks = Math.round((numPrice - rubles) * 100);
        
        return {
            rubles: rubles.toString(),
            kopecks: kopecks.toString().padStart(2, '0')
        };
    };

    const { rubles, kopecks } = formatPriceWithKopecks(price);
    const isFish = isFishCategory();
    const unitText = isFish ? '/ кг' : '/ 1 шт';
    const itemsPerBox = Number(product?.itemsPerBox) || 1;
    const numericUnitPrice = Number(product?.price ?? price) || 0;
    const explicitBoxPrice = Number(product?.boxPrice);
    const hasExplicitBoxPrice = Number.isFinite(explicitBoxPrice) && explicitBoxPrice > 0;
    const kgPerBox = getWeightBasedKgPerBox(product);
    const normalizedBoxPrice = isFish
        ? getWeightBasedBoxPrice(product, numericUnitPrice)
        : (hasExplicitBoxPrice
            ? explicitBoxPrice
            : (numericUnitPrice * itemsPerBox));
    const boxUnitText = isFish
        ? `/ 1 коробка (${formatWeightKg(kgPerBox)} кг)`
        : (itemsPerBox > 1
            ? `/ 1 коробка (${itemsPerBox} шт.)`
            : '/ 1 коробка');

    const primaryTextColor = colors?.textPrimary || Color.dark;
    const secondaryTextColor = colors?.textSecondary || Color.grey7D7D7D;

    return (
        <View style={styles.container}>
            <View style={styles.priceContainer}>
                <HighlightChange value={price} style={styles.priceHighlight}>
                    <View style={styles.priceRow}>
                        <Text
                            ref={priceTextRef}
                            style={[styles.priceText, { color: primaryTextColor }]}
                        >
                            {rubles}
                        </Text>
                        <Text
                            style={[styles.kopecksText, { color: primaryTextColor }]}
                        >
                            {kopecks}
                        </Text>
                        <Text
                            style={[styles.currencyText, { color: primaryTextColor }]}
                        >
                            {' ₽'}
                        </Text>
                    </View>
                </HighlightChange>
                <Text style={[styles.unitText, { color: secondaryTextColor }]}>
                    {unitText}
                </Text>
            </View>

            <View style={styles.priceContainer}>
                <HighlightChange value={price} style={styles.priceHighlight}>
                    <Text
                        ref={priceTextRef}
                        style={[styles.boxPriceText, { color: primaryTextColor }]}
                    >
                        {formatPrice(normalizedBoxPrice)}
                    </Text>
                </HighlightChange>
                <Text style={[styles.boxUnitText, { color: secondaryTextColor }]}>
                    {boxUnitText}
                </Text>
            </View>

            {isFish && weight ? (
                <Text style={[styles.weightText, { color: secondaryTextColor }]}>
                    ≈ {formatPrice(estimateWeightBasedUnitPrice({ ...product, price: numericUnitPrice }))} за шт
                    {` (~${weight} г)`}
                </Text>
            ) : !isFish && weight ? (
                <HighlightChange value={weight} style={styles.weightHighlight}>
                    <Text style={[styles.weightText, { color: secondaryTextColor }]}>
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
    priceColumn: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    priceText: {
        fontFamily: FontFamily.montserratSemiBold,
        fontSize: 30,
        fontWeight: 'bold',
    },
    kopecksText: {
        fontFamily: FontFamily.montserratSemiBold,
        fontSize: 12,
        fontWeight: 'bold',
        lineHeight: 16,
        marginLeft: 4,
        paddingTop: 5,
    },
    currencyText: {
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
    itemsPerBoxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    itemsPerBoxLabel: {
        fontFamily: FontFamily.montserratSemiBold,
        fontSize: FontSize.size_sm,
        fontWeight: '600',
    },
    itemsPerBoxValue: {
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