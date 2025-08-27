import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { StatsCard } from '@/shared/ui/StatsCard';
import { SearchBar } from '@/shared/ui/SearchBar';
import { EmployeeStatsCard } from '@/shared/ui/EmployeeStatsCard';
import { styles } from '../styles/EmployeeRewardsScreen.styles';
import { useAuth } from '@entities/auth/hooks/useAuth';

// Мемоизированный компонент кнопки pending карточки
const PendingCard = React.memo(({ totalStats, onPress }) => (
    <TouchableOpacity style={styles.pendingCard} onPress={onPress}>
        <Text style={styles.pendingTitle}>В ожидании 👆</Text>
        <Text style={styles.pendingAmount}>
            {totalStats?.pendingAmount?.toLocaleString() || 0} ₽
        </Text>
        <Text style={styles.pendingSubtitle}>Нажмите для просмотра</Text>
    </TouchableOpacity>
), (prevProps, nextProps) => {
    return prevProps.totalStats?.pendingAmount === nextProps.totalStats?.pendingAmount;
});

// Мемоизированный компонент статистики сотрудника
const MemoizedEmployeeStatsCard = React.memo(({ employee, onPress }) => (
    <EmployeeStatsCard employee={employee} onPress={onPress} />
), (prevProps, nextProps) => {
    return (
        prevProps.employee.id === nextProps.employee.id &&
        prevProps.employee.totalEarned === nextProps.employee.totalEarned &&
        prevProps.employee.pendingAmount === nextProps.employee.pendingAmount &&
        prevProps.employee.ordersProcessed === nextProps.employee.ordersProcessed
    );
});

export const StatisticsView = React.memo(({
    totalStats,
    filteredData,
    searchQuery,
    searchPlaceholder,
    onSearchChange,
    onPendingCardClick,
    onViewEmployeeRewards
}) => {
    const { currentUser: user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

        return (
        <>
            <View style={styles.statsContainer}>
                {/* Показываем pending карточку только администраторам */}
                {isAdmin && (
                    <PendingCard
                        totalStats={totalStats}
                        onPress={onPendingCardClick}
                    />
                )}
                {/* Показываем общую статистику только администраторам */}
                {isAdmin && totalStats && (
                    <StatsCard
                        title="Общая статистика"
                        stats={[
                            { label: 'Выплачено', value: `${totalStats.paidAmount?.toLocaleString() || 0} ₽` },
                            { label: 'Одобрено', value: `${totalStats.approvedAmount?.toLocaleString() || 0} ₽` },
                            { label: 'Всего', value: `${totalStats.totalAmount?.toLocaleString() || 0} ₽` }
                        ]}
                    />
                )}
            </View>

            {/* Показываем поиск только администраторам */}
            {isAdmin && (
                <View style={styles.searchContainer}>
                    <SearchBar
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onChangeText={onSearchChange}
                    />
                </View>
            )}

            {/* Показываем список сотрудников только администраторам */}
            {isAdmin && filteredData.map((item) => (
                <View key={item.id} style={styles.listItem}>
                    <MemoizedEmployeeStatsCard
                        employee={item}
                        onPress={() => onViewEmployeeRewards(item)}
                    />
                </View>
            ))}
        </>
    );
}); 