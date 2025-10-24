import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const MonthlySummaryCard = React.memo(({ 
    statistics, 
    selectedMonth, 
    selectedYear,
    isEmployee = false,
    alwaysShow = false // По умолчанию НЕ показываем при нулях
}) => {
    // Если нет статистики - скрываем
    if (!statistics) return null;
    
    const periodLabel = selectedMonth !== null && selectedYear !== null
        ? `${getMonthName(selectedMonth)} ${selectedYear}`
        : 'Все время';

    // Рассчитываем общую сумму к выплате (PENDING + APPROVED)
    const toPayAmount = (statistics.totalPending || 0) + (statistics.totalApproved || 0);
    
    // Уже выплачено
    const paidAmount = statistics.totalEarned || 0;
    
    // Общая сумма
    const totalAmount = toPayAmount + paidAmount;
    
    // Если все суммы нулевые и не нужно всегда показывать - скрываем карточку
    const hasNoData = totalAmount === 0;
    const hasSelectedMonth = selectedMonth !== null && selectedYear !== null;
    
    if (hasNoData && !alwaysShow) {
        return null; // ✅ Скрываем карточку если нет данных
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>💰 Итого за период</Text>
                <Text style={styles.period}>{periodLabel}</Text>
            </View>

            {/* Главная сумма - к выплате */}
            {!isEmployee && (
                <View style={styles.mainAmountContainer}>
                    <Text style={styles.mainAmountLabel}>К выплате:</Text>
                    <Text style={styles.mainAmount}>{toPayAmount.toLocaleString()} ₽</Text>
                </View>
            )}

            {/* Детализация */}
            <View style={styles.detailsContainer}>
                {/* Ожидает обработки */}
                <View style={styles.detailItem}>
                    <View style={styles.detailRow}>
                        <View style={[styles.statusDot, { backgroundColor: '#FF9500' }]} />
                        <Text style={styles.detailLabel}>В ожидании</Text>
                    </View>
                    <Text style={styles.detailAmount}>{(statistics.totalPending || 0).toLocaleString()} ₽</Text>
                </View>

                {/* Одобрено */}
                <View style={styles.detailItem}>
                    <View style={styles.detailRow}>
                        <View style={[styles.statusDot, { backgroundColor: '#34C759' }]} />
                        <Text style={styles.detailLabel}>Одобрено</Text>
                    </View>
                    <Text style={styles.detailAmount}>{(statistics.totalApproved || 0).toLocaleString()} ₽</Text>
                </View>

                {/* Выплачено */}
                <View style={styles.detailItem}>
                    <View style={styles.detailRow}>
                        <View style={[styles.statusDot, { backgroundColor: '#007AFF' }]} />
                        <Text style={styles.detailLabel}>Выплачено</Text>
                    </View>
                    <Text style={styles.detailAmount}>{paidAmount.toLocaleString()} ₽</Text>
                </View>

                {/* Разделитель */}
                <View style={styles.divider} />

                {/* Общая сумма */}
                <View style={styles.totalItem}>
                    <Text style={styles.totalLabel}>Всего начислено:</Text>
                    <Text style={styles.totalAmount}>{totalAmount.toLocaleString()} ₽</Text>
                </View>
            </View>

            {/* Подсказка для администратора */}
            {!isEmployee && toPayAmount > 0 && (
                <View style={styles.hintContainer}>
                    <Text style={styles.hintText}>
                        💡 После обработки вознаграждений не забудьте пометить их как "Выплачено"
                    </Text>
                </View>
            )}
            
            {/* Информационное сообщение если нет данных за выбранный месяц */}
            {hasNoData && hasSelectedMonth && (
                <View style={[styles.hintContainer, { backgroundColor: '#F5F5F5', borderLeftColor: '#999' }]}>
                    <Text style={[styles.hintText, { color: '#666' }]}>
                        ℹ️ За выбранный период нет вознаграждений. Попробуйте выбрать другой месяц.
                    </Text>
                </View>
            )}
        </View>
    );
});

MonthlySummaryCard.displayName = 'MonthlySummaryCard';

// Вспомогательная функция для получения названия месяца
const getMonthName = (month) => {
    const months = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return months[month];
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    period: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    mainAmountContainer: {
        backgroundColor: '#F0F9FF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#B3E0FF',
    },
    mainAmountLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#0066CC',
        marginBottom: 4,
    },
    mainAmount: {
        fontSize: 32,
        fontWeight: '700',
        color: '#0066CC',
    },
    detailsContainer: {
        gap: 12,
    },
    detailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    detailLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#666',
    },
    detailAmount: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 8,
    },
    totalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    totalAmount: {
        fontSize: 20,
        fontWeight: '700',
        color: '#007AFF',
    },
    hintContainer: {
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#FF9500',
    },
    hintText: {
        fontSize: 13,
        color: '#E65100',
        lineHeight: 18,
    },
});

