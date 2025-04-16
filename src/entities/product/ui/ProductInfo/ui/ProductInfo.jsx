import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/app/providers/themeProvider/ThemeProvider';
import {Color as colors, FontFamily, FontSize} from '@/app/styles/GlobalStyles';

export const ProductInfo = ({ type, name, category }) => {
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            <View style={styles.typeContainer}>
                <Text style={styles.typeText}>
                    {type}
                </Text>
            </View>
            <View style={styles.titleContainer}>
                <Text style={styles.titleText}>
                    {name}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
        marginTop: -35
    },
    typeContainer: {
        marginBottom: 4,
    },
    categoryText: {
        fontSize: 16,
        fontWeight: "600",
        fontFamily: FontFamily.montserratSemiBold,
        color: "#919eee",
        textAlign: "left"
    },
    typeText: {
        fontSize: 20,
        fontWeight: "600",
        fontFamily: FontFamily.sFProText,
        textAlign: "left"
    },
    titleContainer: {
        marginBottom: 10,
    },
    titleText: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_xl,
        fontWeight: '600',
        color: colors.blue2,
    },
});
