import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontFamily, Color } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { HighlightChange } from '@shared/ui/HighlightChange/HighlightChange';

export const ProductDescription = ({ shortDescription, fullDescription }) => {
    const { colors, isDark } = useTheme();
    const shortColor = isDark ? (colors?.primary || Color.purpleSoft) : Color.purpleSoft;
    const fullColor = colors?.textPrimary || Color.dark;

    return (
        <View style={styles.container}>
            <HighlightChange value={shortDescription}>
                <Text style={[styles.shortDescription, { color: shortColor }]}>
                    {shortDescription}
                </Text>
            </HighlightChange>
            <HighlightChange value={fullDescription}>
                <Text style={[styles.fullDescription, { color: fullColor }]}>
                    {fullDescription}
                </Text>
            </HighlightChange>
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