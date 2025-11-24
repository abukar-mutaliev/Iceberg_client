import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchEmployeeRewards,
    fetchMyRewards,
    fetchAllEmployeesStats,
    fetchAllPendingRewards,
    processReward,
    batchProcessRewards,
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
    selectAllPendingRewardsError,
    selectEmployeeStatistics
} from '@/entities/reward/model/selectors';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { GlobalAlert } from '@shared/ui/CustomAlert';

const ITEMS_PER_PAGE = 10;

// Вспомогательная функция для получения диапазона дат для месяца
const getMonthDateRange = (year, month) => {
    if (year === null || month === null) return null;
    
    const dateFrom = new Date(year, month, 1);
    const dateTo = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    return {
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString()
    };
};

export const useEmployeeRewardsData = (viewMode, employeeId) => {
    const dispatch = useDispatch();
    const { currentUser: user } = useAuth();
    
    // Состояние для фильтра по месяцам
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    // Проверяем доступность для роли пользователя
    // Роль EMPLOYEE включает всех сотрудников: обычных, PICKER, COURIER, PACKER и т.д.
    // через поле employee.processingRole
    const isAdmin = user?.role === 'ADMIN';
    const isEmployee = user?.role === 'EMPLOYEE'; // включает PICKER, COURIER и др.
    const hasAccess = isAdmin || isEmployee;

    // Selectors
    const rewards = useSelector(selectEmployeeRewards);
    const allEmployeesStats = useSelector(selectAllEmployeesStats);
    const allPendingRewards = useSelector(selectAllPendingRewards);
    const totalStats = useSelector(selectTotalStats);
    const employeeStatistics = useSelector(selectEmployeeStatistics);
    const hasRewardData = useSelector(selectHasRewardData);
    const loadingStates = useSelector(selectOverallLoadingState);
    const allEmployeesStatsError = useSelector(selectAllEmployeesStatsError);
    const allPendingRewardsError = useSelector(selectAllPendingRewardsError);
    
    // Получаем диапазон дат для выбранного месяца
    const dateRange = useMemo(() => 
        getMonthDateRange(selectedYear, selectedMonth), 
        [selectedYear, selectedMonth]
    );

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

        const params = {
            page: 1,
            limit: ITEMS_PER_PAGE,
            ...(dateRange ? { 
                dateFrom: dateRange.dateFrom, 
                dateTo: dateRange.dateTo 
            } : {}),
            ...(forceRefresh ? { forceRefresh: true } : {})
        };

        if (isViewingSpecificEmployee && employeeId) {
            // Только админы могут просматривать вознаграждения других сотрудников
            if (!isAdmin) return;
            dispatch(fetchEmployeeRewards({
                employeeId,
                params
            }));
        } else if (isEmployeeViewMode && isEmployee) {
            // Сотрудники видят свои собственные вознаграждения
            dispatch(fetchMyRewards(params));
        } else if (isViewingPending) {
            // Pending вознаграждения доступны только администраторам
            if (!isAdmin) return;
            dispatch(fetchAllPendingRewards({
                page: 1,
                limit: 50,
                ...(dateRange ? { 
                    dateFrom: dateRange.dateFrom, 
                    dateTo: dateRange.dateTo 
                } : {}),
                ...(forceRefresh ? { forceRefresh: true } : {})
            }));
        } else if (isStatisticsMode) {
            // Статистика всех сотрудников доступна только администраторам
            if (!isAdmin) return;
            dispatch(fetchAllEmployeesStats({
                ...(dateRange ? { 
                    dateFrom: dateRange.dateFrom, 
                    dateTo: dateRange.dateTo 
                } : {}),
                ...(forceRefresh ? { forceRefresh: true } : {})
            }));
        }
    }, [dispatch, isViewingSpecificEmployee, isViewingPending, isStatisticsMode, isEmployeeViewMode, employeeId, hasAccess, isAdmin, dateRange]);

    // Reward processing
    const handleProcessReward = useCallback(async (rewardId, status, comment) => {
        // Проверяем права доступа
        if (!hasAccess) {
            GlobalAlert.showError('Ошибка', 'Недостаточно прав для выполнения операции');
            return;
        }

        try {
            await dispatch(processReward({ id: rewardId, status, comment })).unwrap();
            GlobalAlert.showSuccess('', 'Статус вознаграждения обновлен');
        } catch (error) {
            GlobalAlert.showError('Ошибка', error || 'Не удалось обновить статус');
        }
    }, [dispatch, hasAccess]);

    // Массовая обработка вознаграждений
    const handleBatchProcessRewards = useCallback(async (employeeId) => {
        // Проверяем права доступа (только админы)
        if (!isAdmin) {
            GlobalAlert.showError('Ошибка', 'Недостаточно прав для выполнения операции');
            return;
        }

        // Показываем подтверждение
        GlobalAlert.showConfirm(
            'Подтверждение',
            'Пометить все необработанные вознаграждения как выплаченные?',
            async () => {
                try {
                    const result = await dispatch(batchProcessRewards({
                        employeeId,
                        data: {
                            status: 'PAID',
                            dateFrom: dateRange?.dateFrom,
                            dateTo: dateRange?.dateTo
                        }
                    })).unwrap();

                    GlobalAlert.showSuccess(
                        '',
                        `Выплачено вознаграждений: ${result.processedCount} на сумму ${result.totalAmount} руб.`
                    );

                    // Перезагружаем данные
                    loadData(true);
                } catch (error) {
                    GlobalAlert.showError('Ошибка', error || 'Не удалось выполнить массовую выплату');
                }
            }
        );
    }, [dispatch, isAdmin, dateRange, loadData]);

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

    // Обработчик изменения выбранного месяца
    const handleMonthChange = useCallback((year, month) => {
        // Очищаем данные перед сменой месяца
        clearData();
        
        // Устанавливаем новый месяц
        setSelectedYear(year);
        setSelectedMonth(month);
    }, [clearData]);

    return {
        // Data
        rewards,
        allEmployeesStats,
        allPendingRewards,
        totalStats,
        employeeStatistics,
        
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
        
        // Month filter
        selectedMonth,
        selectedYear,
        handleMonthChange,
        
        // Actions
        loadData,
        handleProcessReward,
        handleBatchProcessRewards,
        clearData
    };
}; 