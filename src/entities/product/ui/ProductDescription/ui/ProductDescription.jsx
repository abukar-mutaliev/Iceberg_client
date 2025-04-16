import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/app/providers/themeProvider/ThemeProvider';
import { FontFamily } from '@/app/styles/GlobalStyles';

export const ProductDescription = ({ shortDescription, fullDescription }) => {
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            <Text style={[styles.shortDescription, { color: colors.primary }]}>
                {shortDescription}
            </Text>
            <Text style={[styles.fullDescription, { color: colors.text }]}>
                {fullDescription}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    shortDescription: {
        fontFamily: FontFamily.sFProText,
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 16,
    },
    fullDescription: {
        fontFamily: FontFamily.sFProText,
        fontSize: 12,
        lineHeight: 18,
    },
});
