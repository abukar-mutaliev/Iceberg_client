import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const FormSection = ({ title, subtitle, children, style }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    return (
        <View style={[styles.section, style]}>
            {title && <Text style={styles.sectionTitle}>{title}</Text>}
            {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
            {children}
        </View>
    );
};

export const FormField = ({
    label,
    required,
    hint,
    error,
    children,
    style
}) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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

export const FormDivider = ({ style }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    return <View style={[styles.divider, style]} />;
};

const createStyles = (colors, isDark) => StyleSheet.create({
    section: {
        marginBottom: normalize(5),
        backgroundColor: isDark ? colors.surface : '#fff',
        borderRadius: 12,
        padding: normalize(10),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 2,
        elevation: isDark ? 0 : 2,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    sectionTitle: {
        fontSize: normalizeFont(17),
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(8),
        fontFamily: FontFamily.sFProText,
    },
    sectionSubtitle: {
        fontSize: normalizeFont(13),
        color: isDark ? colors.textSecondary : '#666',
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
        color: colors.textPrimary,
        opacity: isDark ? 1 : 0.8,
        fontFamily: FontFamily.sFProText,
    },
    required: {
        color: '#FF3B30',
    },
    hint: {
        fontSize: normalizeFont(12),
        color: isDark ? colors.textTertiary : '#999',
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
        backgroundColor: isDark ? colors.divider : '#E5E5EA',
        marginVertical: normalize(16),
    },
});
