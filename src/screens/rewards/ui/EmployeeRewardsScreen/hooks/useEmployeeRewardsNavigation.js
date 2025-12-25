import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { userSelectors } from '@/entities/user';

export const useEmployeeRewardsNavigation = (navigation, routeParams) => {
    const user = useSelector(userSelectors.selectUser);
    // Роль EMPLOYEE включает всех сотрудников: обычных, PICKER, COURIER, PACKER и т.д.
    const isAdminMode = useMemo(() => user?.role === 'ADMIN', [user?.role]);

    // Определяем режим по умолчанию в зависимости от роли пользователя
    const getDefaultViewMode = () => {
        if (isAdminMode) return 'statistics';
        return 'employee'; // Сотрудники по умолчанию видят свои вознаграждения
    };

    const {
        viewMode = getDefaultViewMode(),
        fromScreen = null,
        previousViewMode = null
    } = routeParams || {};



    // Mode checks
    const isViewingSpecificEmployee = useMemo(() => 
        viewMode === 'employee', [viewMode]
    );
    const isViewingPending = useMemo(() => viewMode === 'pending', [viewMode]);
    const isStatisticsMode = useMemo(() => viewMode === 'statistics', [viewMode]);

    // Navigation handlers
    const handleViewEmployeeRewards = useCallback((employee) => {
        // Проверяем права доступа
        if (!isAdminMode && employee.id !== user?.id) {
            return;
        }
        
        navigation.navigate('EmployeeRewards', {
            viewMode: 'employee',
            employeeId: employee.id,
            employeeName: employee.name,
            fromScreen: fromScreen,
            previousViewMode: viewMode
        });
    }, [navigation, viewMode, fromScreen, isAdminMode, user?.id]);

    const handlePendingCardClick = useCallback(() => {
        // Проверяем права доступа
        if (!isAdminMode) {
            return;
        }
        
        navigation.navigate('EmployeeRewards', {
            viewMode: 'pending',
            fromScreen: fromScreen,
            previousViewMode: viewMode
        });
    }, [navigation, viewMode, fromScreen, isAdminMode]);

    const handleBackNavigation = useCallback(() => {
        // Если находимся в режиме просмотра конкретного сотрудника или pending,
        // и есть предыдущий режим, возвращаемся к нему
        if ((isViewingSpecificEmployee || isViewingPending) && previousViewMode) {
            navigation.navigate('EmployeeRewards', {
                viewMode: previousViewMode,
                fromScreen: fromScreen,
                employeeId: undefined,
                employeeName: undefined,
                previousViewMode: undefined
            });
            return;
        }

        // Если находимся в режиме просмотра конкретного сотрудника или pending,
        // но нет предыдущего режима, возвращаемся к статистике
        if (isViewingSpecificEmployee || isViewingPending) {
            navigation.navigate('EmployeeRewards', {
                viewMode: 'statistics',
                fromScreen: fromScreen,
                employeeId: undefined,
                employeeName: undefined,
                previousViewMode: undefined
            });
            return;
        }

        // Если находимся в основном режиме статистики - всегда возвращаемся назад
        navigation.goBack();
    }, [navigation, isAdminMode, fromScreen, isViewingSpecificEmployee, isViewingPending, isStatisticsMode, previousViewMode, viewMode]);

    // Screen title
    const screenTitle = useMemo(() => {
        const { employeeName } = routeParams || {};
        if (isViewingSpecificEmployee) return `Вознаграждения ${employeeName || 'сотрудника'}`;
        if (isViewingPending) return 'В ожидании обработки';
        return 'Управление вознаграждениями';
    }, [isViewingSpecificEmployee, isViewingPending, routeParams]);

    return {
        // State
        isAdminMode,
        screenTitle,
        
        // Actions
        handleViewEmployeeRewards,
        handlePendingCardClick,
        handleBackNavigation
    };
}; 