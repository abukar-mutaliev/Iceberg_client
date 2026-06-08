import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const StatsCard = ({ title, stats = [], containerStyle }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    return (
        <View style={[styles.container, containerStyle]}>
            {title && (
                <Text style={styles.title}>{title}</Text>
            )}
            <View style={styles.statsContainer}>
                {stats.map((stat, index) => (
                    <View key={index} style={styles.statItem}>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                        <Text style={styles.statValue}>{stat.value}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        backgroundColor: colors.cardBackground,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        marginHorizontal: normalize(16),
        marginVertical: normalize(8),
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: Color.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: isDark ? 0.35 : 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(12),
        textAlign: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statItem: {
        flex: 1,
        minWidth: 100,
        alignItems: 'center',
        marginVertical: normalize(4),
    },
    statLabel: {
        fontSize: normalizeFont(FontSize.size_sm),
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
        marginBottom: normalize(4),
        textAlign: 'center',
    },
    statValue: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: colors.primary,
        textAlign: 'center',
    },
});

export default StatsCard; 