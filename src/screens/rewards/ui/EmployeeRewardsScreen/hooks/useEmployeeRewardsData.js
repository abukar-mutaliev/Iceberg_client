import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from 'react-native';
import {
    fetchEmployeeRewards,
    fetchMyRewards,
    fetchAllEmployeesStats,
    fetchAllPendingRewards,
    processReward,
    clearEmployeeRewards
} from '@/entities/reward/model/slice';
import {
    selectEmployeeRewards,
    selectAllEmployeesStats,
    selectAllPendingRewards,
    selectTotalStats,
    selectHasRewardData,
    selectOverallLoadingState,
    selectAllEmployeesStatsError,
    selectAllPendingRewardsError
} from '@/entities/reward/model/selectors';
import { useAuth } from '@entities/auth/hooks/useAuth';

const ITEMS_PER_PAGE = 10;

export const useEmployeeRewardsData = (viewMode, employeeId) => {
    const dispatch = useDispatch();
    const { currentUser: user } = useAuth();

    // Проверяем доступность для роли пользователя
    const isAdmin = user?.role === 'ADMIN';
    const isEmployee = user?.role === 'EMPLOYEE';
    const hasAccess = isAdmin || isEmployee;

    // Selectors
    const rewards = useSelector(selectEmployeeRewards);
    const allEmployeesStats = useSelector(selectAllEmployeesStats);
    const allPendingRewards = useSelector(selectAllPendingRewards);
    const totalStats = useSelector(selectTotalStats);
    const hasRewardData = useSelector(selectHasRewardData);
    const loadingStates = useSelector(selectOverallLoadingState);
    const allEmployeesStatsError = useSelector(selectAllEmployeesStatsError);
    const allPendingRewardsError = useSelector(selectAllPendingRewardsError);

    // Computed values
    const isViewingSpecificEmployee = useMemo(() => 
        viewMode === 'employee' && employeeId, [viewMode, employeeId]
    );
    const isViewingPending = useMemo(() => viewMode === 'pending', [viewMode]);
    const isStatisticsMode = useMemo(() => viewMode === 'statistics', [viewMode]);
    const isEmployeeViewMode = useMemo(() => viewMode === 'employee', [viewMode]);

    // Data loading
    const loadData = useCallback(async (forceRefresh = false) => {
        // Проверяем права доступа
        if (!hasAccess) return;

        if (isViewingSpecificEmployee && employeeId) {
            // Только админы могут просматривать вознаграждения других сотрудников
            if (!isAdmin) return;
            dispatch(fetchEmployeeRewards({
                employeeId,
                params: { 
                    page: 1, 
                    limit: ITEMS_PER_PAGE, 
                    ...(forceRefresh ? { forceRefresh: true } : {}) 
                }
            }));
        } else if (isEmployeeViewMode && isEmployee) {
            // Сотрудники видят свои собственные вознаграждения
            dispatch(fetchMyRewards({ 
                page: 1, 
                limit: ITEMS_PER_PAGE, 
                ...(forceRefresh ? { forceRefresh: true } : {}) 
            }));
        } else if (isViewingPending) {
            // Статистика всех сотрудников доступна только администраторам
            if (!isAdmin) return;
            dispatch(fetchAllPendingRewards({
                page: 1,
                limit: 50,
                ...(forceRefresh ? { forceRefresh: true } : {})
            }));
        } else if (isStatisticsMode) {
            // Статистика всех сотрудников доступна только администраторам
            if (!isAdmin) return;
            dispatch(fetchAllEmployeesStats(forceRefresh ? { forceRefresh: true } : {}));
        }
    }, [dispatch, isViewingSpecificEmployee, isViewingPending, isStatisticsMode, isEmployeeViewMode, employeeId, hasAccess, isAdmin, user?.role, user?.id, viewMode]);

    // Reward processing
    const handleProcessReward = useCallback(async (rewardId, status, comment) => {
        // Проверяем права доступа
        if (!hasAccess) {
            Alert.alert('Ошибка', 'Недостаточно прав для выполнения операции');
            return;
        }

        try {
            await dispatch(processReward({ id: rewardId, status, comment })).unwrap();
            Alert.alert('Успех', 'Статус вознаграждения обновлен');
        } catch (error) {
            Alert.alert('Ошибка', error || 'Не удалось обновить статус');
        }
    }, [dispatch, hasAccess]);

    // Cleanup
    const clearData = useCallback(() => {
        if (isViewingSpecificEmployee || isEmployeeViewMode) {
            dispatch(clearEmployeeRewards());
        }
    }, [dispatch, isViewingSpecificEmployee, isEmployeeViewMode]);

    // Data status checks
    const hasDataToShow = useMemo(() => {
        if (isViewingSpecificEmployee || isEmployeeViewMode) return rewards && rewards.length > 0;
        if (isViewingPending) return allPendingRewards && allPendingRewards.length > 0;
        if (isStatisticsMode) return allEmployeesStats && allEmployeesStats.length > 0;
        return false;
    }, [isViewingSpecificEmployee, isEmployeeViewMode, isViewingPending, isStatisticsMode, rewards, allPendingRewards, allEmployeesStats]);

    const hasErrors = useMemo(() => {
        if (isViewingSpecificEmployee || isEmployeeViewMode) return hasRewardData.isError;
        if (isViewingPending) return !!allPendingRewardsError;
        if (isStatisticsMode) return !!allEmployeesStatsError;
        return false;
    }, [isViewingSpecificEmployee, isEmployeeViewMode, isViewingPending, isStatisticsMode, hasRewardData.isError, allPendingRewardsError, allEmployeesStatsError]);

    return {
        // Data
        rewards,
        allEmployeesStats,
        allPendingRewards,
        totalStats,
        
        // State
        loadingStates,
        hasDataToShow,
        hasErrors,
        
        // Mode flags
        isViewingSpecificEmployee,
        isViewingPending,
        isStatisticsMode,
        
        // Access control
        hasAccess,
        isAdmin,
        isEmployee,
        
        // Actions
        loadData,
        handleProcessReward,
        clearData
    };
}; 