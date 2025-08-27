import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, Border, Shadow } from '@app/styles/GlobalStyles';

export const InfoCard = ({
                             icon,
                             title,
                             value,
                             subtitle,
                             fullWidth = false,
                             style
                         }) => {
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

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        marginHorizontal: normalize(4),
        ...Shadow.light,
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
        color: Color.blue2,
    },
    cardTitle: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    },
    cardValue: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProDisplay,
    },
    cardSubtitle: {
        fontSize: normalizeFont(12),
        color: Color.blue2,
        marginTop: normalize(4),
        fontFamily: FontFamily.sFProText,
    },
});
