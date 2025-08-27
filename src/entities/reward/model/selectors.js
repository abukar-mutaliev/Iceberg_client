import { createSelector } from '@reduxjs/toolkit';

// Константы для предотвращения создания новых ссылок при каждом вызове селекторов
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

// Базовые селекторы (простые)
export const selectRewardsState = (state) => state.rewards || EMPTY_OBJECT;
export const selectEmployeeRewards = (state) => state.rewards?.employeeRewards || EMPTY_ARRAY;
export const selectEmployeeRewardsLoading = (state) => state.rewards?.employeeRewardsLoading || false;
export const selectEmployeeRewardsError = (state) => state.rewards?.employeeRewardsError || null;
export const selectEmployeeStatistics = (state) => state.rewards?.employeeStatistics || null;
export const selectEmployeeRewardsPagination = (state) => state.rewards?.employeeRewardsPagination || null;

export const selectAllEmployeesStats = (state) => state.rewards?.allEmployeesStats || EMPTY_ARRAY;
export const selectAllEmployeesStatsLoading = (state) => state.rewards?.allEmployeesStatsLoading || false;
export const selectAllEmployeesStatsError = (state) => state.rewards?.allEmployeesStatsError || null;
export const selectTotalStats = (state) => state.rewards?.totalStats || null;

export const selectAllPendingRewards = (state) => state.rewards?.allPendingRewards || EMPTY_ARRAY;
export const selectAllPendingRewardsLoading = (state) => state.rewards?.allPendingRewardsLoading || false;
export const selectAllPendingRewardsError = (state) => state.rewards?.allPendingRewardsError || null;
export const selectAllPendingRewardsPagination = (state) => state.rewards?.allPendingRewardsPagination || null;

// ОПТИМИЗИРОВАННЫЕ МЕМОИЗИРОВАННЫЕ СЕЛЕКТОРЫ

// Мемоизированные селекторы для фильтрации по статусу (избегаем пересчета при каждом рендере)
export const selectPendingRewards = createSelector(
    [selectEmployeeRewards],
    (rewards) => rewards.filter(reward => reward.status === 'PENDING')
);

export const selectApprovedRewards = createSelector(
    [selectEmployeeRewards],
    (rewards) => rewards.filter(reward => reward.status === 'APPROVED')
);

export const selectPaidRewards = createSelector(
    [selectEmployeeRewards],
    (rewards) => rewards.filter(reward => reward.status === 'PAID')
);

export const selectCancelledRewards = createSelector(
    [selectEmployeeRewards],
    (rewards) => rewards.filter(reward => reward.status === 'CANCELLED')
);

// Мемоизированный селектор для подсчета суммы по статусам
export const selectRewardSummaryByStatus = createSelector(
    [selectEmployeeRewards],
    (rewards) => {
        const summary = {
            totalCount: rewards.length,
            totalAmount: 0,
            pending: { count: 0, amount: 0 },
            approved: { count: 0, amount: 0 },
            paid: { count: 0, amount: 0 },
            cancelled: { count: 0, amount: 0 }
        };

        rewards.forEach(reward => {
            summary.totalAmount += reward.amount;
            
            switch (reward.status) {
                case 'PENDING':
                    summary.pending.count++;
                    summary.pending.amount += reward.amount;
                    break;
                case 'APPROVED':
                    summary.approved.count++;
                    summary.approved.amount += reward.amount;
                    break;
                case 'PAID':
                    summary.paid.count++;
                    summary.paid.amount += reward.amount;
                    break;
                case 'CANCELLED':
                    summary.cancelled.count++;
                    summary.cancelled.amount += reward.amount;
                    break;
            }
        });

        return summary;
    }
);

// Мемоизированный селектор для форматированной статистики сотрудника
export const selectFormattedEmployeeStats = createSelector(
    [selectEmployeeStatistics, selectRewardSummaryByStatus],
    (statistics, summary) => {
        if (!statistics) return null;

        return {
            totalEarned: statistics.totalEarned || summary.paid.amount,
            totalPending: statistics.totalPending || summary.pending.amount,
            totalApproved: statistics.totalApproved || summary.approved.amount,
            byStatus: statistics.byStatus || [
                { status: 'PAID', _sum: { amount: summary.paid.amount }, _count: { id: summary.paid.count } },
                { status: 'PENDING', _sum: { amount: summary.pending.amount }, _count: { id: summary.pending.count } },
                { status: 'APPROVED', _sum: { amount: summary.approved.amount }, _count: { id: summary.approved.count } },
                { status: 'CANCELLED', _sum: { amount: summary.cancelled.amount }, _count: { id: summary.cancelled.count } }
            ]
        };
    }
);

// Мемоизированный селектор для определения есть ли данные для отображения
export const selectHasRewardData = createSelector(
    [selectEmployeeRewards, selectEmployeeRewardsLoading, selectEmployeeRewardsError],
    (rewards, loading, error) => ({
        hasData: rewards.length > 0,
        isEmpty: rewards.length === 0 && !loading && !error,
        isError: !!error,
        isLoading: loading
    })
);

// Мемоизированный селектор для пагинации с дополнительной информацией
export const selectPaginationInfo = createSelector(
    [selectEmployeeRewardsPagination],
    (pagination) => {
        const safePagination = pagination || { page: 1, pages: 1, total: 0 };
        return {
            ...safePagination,
            hasNextPage: safePagination.page < safePagination.pages,
            hasPrevPage: safePagination.page > 1,
            isFirstPage: safePagination.page === 1,
            isLastPage: safePagination.page >= safePagination.pages
        };
    }
);

// Мемоизированный селектор для pending вознаграждений с дополнительной информацией
export const selectPendingRewardsInfo = createSelector(
    [selectAllPendingRewards, selectAllPendingRewardsPagination],
    (rewards, pagination) => {
        const safePagination = pagination || EMPTY_OBJECT;
        const totalAmount = rewards.reduce((sum, reward) => sum + reward.amount, 0);
        const employeeCount = new Set(rewards.map(r => r.employee?.id)).size;
        
        return {
            rewards,
            totalAmount,
            employeeCount,
            totalCount: safePagination.total || rewards.length,
            pagination: safePagination
        };
    }
);

// Мемоизированный селектор для топ сотрудников по заработку
export const selectTopEmployeesByEarnings = createSelector(
    [selectAllEmployeesStats],
    (employeesStats) => {
        return employeesStats
            .filter(employee => employee.totalEarned > 0)
            .sort((a, b) => b.totalEarned - a.totalEarned)
            .slice(0, 10);
    }
);

// Мемоизированный селектор для быстрого поиска вознаграждения по ID
export const makeSelectRewardById = () => createSelector(
    [selectEmployeeRewards, (state, rewardId) => rewardId],
    (rewards, rewardId) => {
        return rewards.find(reward => reward.id === rewardId);
    }
);

// Селектор для оптимизированного фильтра по статусу
export const makeSelectRewardsByStatus = () => createSelector(
    [selectEmployeeRewards, (state, status) => status],
    (rewards, status) => {
        if (!status || status === 'ALL') return rewards;
        return rewards.filter(reward => reward.status === status);
    }
);

// Мемоизированный селектор для проверки есть ли неопрацованные ошибки
export const selectHasErrors = createSelector(
    [selectEmployeeRewardsError, selectAllEmployeesStatsError, selectAllPendingRewardsError],
    (employeeError, statsError, pendingError) => ({
        hasErrors: !!(employeeError || statsError || pendingError),
        errors: {
            employee: employeeError,
            stats: statsError,
            pending: pendingError
        }
    })
);

// Мемоизированный селектор для общего состояния загрузки
export const selectOverallLoadingState = createSelector(
    [selectEmployeeRewardsLoading, selectAllEmployeesStatsLoading, selectAllPendingRewardsLoading],
    (employeeLoading, statsLoading, pendingLoading) => ({
        isAnyLoading: employeeLoading || statsLoading || pendingLoading,
        loadingStates: {
            employee: employeeLoading,
            stats: statsLoading,
            pending: pendingLoading
        }
    })
); 