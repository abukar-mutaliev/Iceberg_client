import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@shared/lib/normalize';

/**
 * Компонент секции формы
 */
export const FormSection = ({ title, subtitle, children, style }) => {
    return (
        <View style={[styles.section, style]}>
            {title && <Text style={styles.sectionTitle}>{title}</Text>}
            {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
            {children}
        </View>
    );
};

/**
 * Компонент поля формы
 */
export const FormField = ({ 
    label, 
    required, 
    hint, 
    error, 
    children, 
    style 
}) => {
    return (
        <View style={[styles.fieldContainer, style]}>
            {label && (
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>
                        {label}
                        {required && <Text style={styles.required}> *</Text>}
                    </Text>
                    {hint && <Text style={styles.hint}>{hint}</Text>}
                </View>
            )}
            {children}
            {error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : null}
        </View>
    );
};

/**
 * Разделитель между полями
 */
export const FormDivider = ({ style }) => {
    return <View style={[styles.divider, style]} />;
};

const styles = StyleSheet.create({
    section: {
        marginBottom: normalize(28),
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: normalize(16),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: Color.dark,
        marginBottom: normalize(8),
        fontFamily: FontFamily.sFProText,
    },
    sectionSubtitle: {
        fontSize: normalizeFont(13),
        color: '#666',
        marginBottom: normalize(16),
        fontFamily: FontFamily.sFProText,
    },
    fieldContainer: {
        marginBottom: normalize(16),
    },
    labelContainer: {
        marginBottom: normalize(8),
    },
    label: {
        fontSize: normalizeFont(15),
        fontWeight: '500',
        color: Color.dark,
        opacity: 0.8,
        fontFamily: FontFamily.sFProText,
    },
    required: {
        color: '#FF3B30',
    },
    hint: {
        fontSize: normalizeFont(12),
        color: '#999',
        marginTop: normalize(4),
        fontFamily: FontFamily.sFProText,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: normalizeFont(13),
        marginTop: normalize(6),
        fontFamily: FontFamily.sFProText,
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E5EA',
        marginVertical: normalize(16),
    },
});




