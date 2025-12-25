// API
export { rewardApi } from './api/rewardApi';

// Redux
export { default as rewardReducer } from './model/slice';
export {
    fetchRewardSettings,
    createRewardSetting,
    updateRewardSetting,
    fetchEmployeeRewards,
    fetchMyRewards,
    fetchAllEmployeesStats,
    fetchAllPendingRewards,
    processReward,
    batchProcessRewards,
    clearEmployeeRewards,
    clearAllEmployeesStats,
    clearPendingRewards,
    clearErrors
} from './model/slice';

// Selectors
export {
    selectRewardsState,
    selectEmployeeRewards,
    selectEmployeeRewardsLoading,
    selectEmployeeRewardsError,
    selectEmployeeStatistics,
    selectEmployeeRewardsPagination,
    selectAllEmployeesStats,
    selectAllEmployeesStatsLoading,
    selectAllEmployeesStatsError,
    selectTotalStats,
    selectAllPendingRewards,
    selectAllPendingRewardsLoading,
    selectAllPendingRewardsError,
    selectAllPendingRewardsPagination,
    // Новые оптимизированные селекторы
    selectPendingRewards,
    selectApprovedRewards,
    selectPaidRewards,
    selectCancelledRewards,
    selectRewardSummaryByStatus,
    selectFormattedEmployeeStats,
    selectHasRewardData,
    selectPaginationInfo,
    selectPendingRewardsInfo,
    selectTopEmployeesByEarnings,
    makeSelectRewardById,
    makeSelectRewardsByStatus,
    selectHasErrors,
    selectOverallLoadingState
} from './model/selectors'; 