import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';

export const StatsCard = ({ title, stats = [], containerStyle }) => {
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

const styles = StyleSheet.create({
    container: {
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        marginHorizontal: normalize(16),
        marginVertical: normalize(8),
        shadowColor: Color.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: normalizeFont(FontSize.size_lg),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.textPrimary,
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
        color: Color.grey7D7D7D,
        marginBottom: normalize(4),
        textAlign: 'center',
    },
    statValue: {
        fontSize: normalizeFont(FontSize.size_md),
        fontFamily: FontFamily.sFProDisplay,
        fontWeight: '600',
        color: Color.blue2,
        textAlign: 'center',
    },
});

export default StatsCard; 