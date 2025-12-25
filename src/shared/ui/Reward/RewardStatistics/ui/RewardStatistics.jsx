import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Color } from "@/styles/GlobalStyles";

export const RewardStatistics = ({ statistics, style }) => {
    if (!statistics) {
        return null;
    }

    const {
        totalEarned = 0,
        totalPending = 0,
        totalApproved = 0,
        totalCancelled = 0,
        totalRewards = 0
    } = statistics;

    const StatCard = ({ title, value, color, isAmount = true }) => (
        <View style={[styles.statCard, { borderLeftColor: color }]}>
            <Text style={styles.statTitle}>{title}</Text>
            <Text style={[styles.statValue, { color }]}>
                {isAmount ? `${value} ₽` : value}
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, style]}>
            <Text style={styles.sectionTitle}>Статистика вознаграждений</Text>

            <View style={styles.statsGrid}>
                <StatCard
                    title="Всего заработано"
                    value={totalEarned}
                    color={Color.success}
                />
                <StatCard
                    title="В ожидании"
                    value={totalPending}
                    color={Color.warning}
                />
                <StatCard
                    title="Одобрено"
                    value={totalApproved}
                    color={Color.blue2}
                />
                <StatCard
                    title="Отменено"
                    value={totalCancelled}
                    color={Color.error}
                />
            </View>

            <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Общее количество</Text>
                <Text style={styles.summaryValue}>{totalRewards} вознаграждений</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Color.background,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: 16,
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        minWidth: 150,
        backgroundColor: Color.background,
        borderRadius: 12,
        padding: 12,
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: Color.border,
    },
    statTitle: {
        fontSize: 12,
        color: Color.textSecondary,
        marginBottom: 4,
        fontWeight: '500',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    summaryCard: {
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Color.border,
    },
    summaryTitle: {
        fontSize: 14,
        color: Color.textSecondary,
        marginBottom: 4,
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '700',
        color: Color.textPrimary,
    },
});

