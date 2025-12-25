import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

export const FormSection = ({ title, children, style }) => {
    return (
        <View style={[styles.container, style]}>
            {title && <Text style={styles.title}>{title}</Text>}
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: normalize(24),
    },
    title: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: Color.dark,
        marginBottom: normalize(16),
        fontFamily: FontFamily.sFProDisplay,
    },
    content: {
        // Контент секции
    },
});

export default FormSection;