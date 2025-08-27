import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontFamily, Color } from '@app/styles/GlobalStyles';
import { HighlightChange } from '@shared/ui/HighlightChange/HighlightChange';
export const ProductDescription = ({ shortDescription, fullDescription }) => {

    return (
        <View style={styles.container}>
            <HighlightChange value={shortDescription}>
                <Text style={[styles.shortDescription, { color: Color.purpleSoft }]}>
                    {shortDescription}
                </Text>
            </HighlightChange>
            <HighlightChange value={fullDescription}>
                <Text style={[styles.fullDescription, { color: Color.dark }]}>
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