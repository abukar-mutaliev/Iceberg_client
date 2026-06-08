import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, Border, Shadow } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const InfoCard = ({
                             icon,
                             title,
                             value,
                             subtitle,
                             fullWidth = false,
                             style
                         }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    return (
        <View style={[styles.card, fullWidth && styles.fullWidthCard, style]}>
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    <Text style={styles.iconText}>{icon}</Text>
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <Text style={styles.cardValue}>{value}</Text>
            {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        marginHorizontal: normalize(4),
        borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
        borderColor: isDark ? colors.border : 'transparent',
        ...(isDark ? {} : Shadow.light),
    },
    fullWidthCard: {
        marginHorizontal: 0,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(8),
    },
    iconContainer: {
        marginRight: normalize(8),
    },
    iconText: {
        fontSize: normalizeFont(16),
        color: isDark ? colors.primary : Color.blue2,
    },
    cardTitle: {
        fontSize: normalizeFont(12),
        color: isDark ? colors.textSecondary : Color.textSecondary,
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    },
    cardValue: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: isDark ? colors.textPrimary : Color.dark,
        fontFamily: FontFamily.sFProDisplay,
    },
    cardSubtitle: {
        fontSize: normalizeFont(12),
        color: isDark ? colors.primary : Color.blue2,
        marginTop: normalize(4),
        fontFamily: FontFamily.sFProText,
    },
});
