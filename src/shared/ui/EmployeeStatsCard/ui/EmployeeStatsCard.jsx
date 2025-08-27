import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Color } from "@/styles/GlobalStyles";

export const EmployeeStatsCard = ({ employee, onPress, showRewardActions = false, onViewRewards }) => {
    const {
        id,
        name,
        position,
        warehouse,
        totalEarned,
        paidAmount,
        pendingAmount,
        ordersProcessed,
        rewardsCount
    } = employee;

    const warehouseName = warehouse?.name || 'Не назначен';
    const districtName = warehouse?.district?.name || '';

    return (
        <TouchableOpacity 
            style={styles.container} 
            onPress={() => onPress?.(employee)}
            activeOpacity={0.7}
        >
            {/* Заголовок сотрудника */}
            <View style={styles.header}>
                <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>{name}</Text>
                    <Text style={styles.employeePosition}>{position}</Text>
                </View>
                <View style={styles.idBadge}>
                    <Text style={styles.idText}>#{id}</Text>
                </View>
            </View>

            {/* Информация о складе */}
            <View style={styles.warehouseSection}>
                <Text style={styles.warehouseLabel}>📍 Склад:</Text>
                <Text style={styles.warehouseValue}>
                    {warehouseName}
                    {districtName && ` (${districtName})`}
                </Text>
            </View>

            {/* Статистика заказов */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{ordersProcessed}</Text>
                    <Text style={styles.statLabel}>Заказов обработано</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{rewardsCount}</Text>
                    <Text style={styles.statLabel}>Вознаграждений</Text>
                </View>
            </View>

            {/* Финансовая статистика */}
            <View style={styles.financialStats}>
                <View style={styles.financialRow}>
                    <View style={styles.financialItem}>
                        <Text style={styles.financialLabel}>💰 Всего заработано:</Text>
                        <Text style={[styles.financialValue, styles.totalEarned]}>
                            {totalEarned} ₽
                        </Text>
                    </View>
                </View>
                
                <View style={styles.financialRow}>
                    <View style={styles.financialItem}>
                        <Text style={styles.financialLabel}>✅ Выплачено:</Text>
                        <Text style={[styles.financialValue, styles.paid]}>
                            {paidAmount} ₽
                        </Text>
                    </View>
                    <View style={styles.financialItem}>
                        <Text style={styles.financialLabel}>⏳ В ожидании:</Text>
                        <Text style={[styles.financialValue, styles.pending]}>
                            {pendingAmount} ₽
                        </Text>
                    </View>
                </View>
            </View>

            {/* Действия для администратора */}
            {showRewardActions && (
                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => onViewRewards?.(employee)}
                    >
                        <Text style={styles.actionButtonText}>📋 Просмотреть вознаграждения</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Индикатор активности */}
            {ordersProcessed > 0 && (
                <View style={styles.activityIndicator}>
                    <Text style={styles.activityText}>🔥 Активный</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Color.background,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        borderLeftWidth: 4,
        borderLeftColor: Color.blue2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    employeeInfo: {
        flex: 1,
    },
    employeeName: {
        fontSize: 18,
        fontWeight: '700',
        color: Color.textPrimary,
        marginBottom: 4,
    },
    employeePosition: {
        fontSize: 14,
        color: Color.textSecondary,
        fontWeight: '500',
    },
    idBadge: {
        backgroundColor: Color.lightGray,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    idText: {
        fontSize: 12,
        color: Color.textSecondary,
        fontWeight: '600',
    },
    warehouseSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
    },
    warehouseLabel: {
        fontSize: 14,
        color: Color.textSecondary,
        marginRight: 8,
        fontWeight: '500',
    },
    warehouseValue: {
        fontSize: 14,
        color: Color.textPrimary,
        fontWeight: '600',
        flex: 1,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
        paddingVertical: 12,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: Color.blue2,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: Color.textSecondary,
        textAlign: 'center',
        fontWeight: '500',
    },
    financialStats: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    financialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    financialItem: {
        flex: 1,
    },
    financialLabel: {
        fontSize: 12,
        color: Color.textSecondary,
        marginBottom: 2,
        fontWeight: '500',
    },
    financialValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    totalEarned: {
        color: Color.blue2,
        fontSize: 16,
    },
    paid: {
        color: Color.success,
    },
    pending: {
        color: Color.warning,
    },
    actions: {
        marginTop: 8,
    },
    actionButton: {
        backgroundColor: Color.primary,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionButtonText: {
        color: Color.background,
        fontSize: 14,
        fontWeight: '600',
    },
    activityIndicator: {
        position: 'absolute',
        top: 12,
        right: 16,
        backgroundColor: Color.success,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    activityText: {
        color: Color.background,
        fontSize: 10,
        fontWeight: '600',
    },
});

export default EmployeeStatsCard; 