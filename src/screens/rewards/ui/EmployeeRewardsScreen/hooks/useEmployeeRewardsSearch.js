import { useState, useMemo } from 'react';

export const useEmployeeRewardsSearch = (data, viewMode) => {
    const [searchQuery, setSearchQuery] = useState('');

    const isViewingPending = useMemo(() => viewMode === 'pending', [viewMode]);
    const isViewingSpecificEmployee = useMemo(() => viewMode === 'employee', [viewMode]);
    const isStatisticsMode = useMemo(() => viewMode === 'statistics', [viewMode]);

    const filteredData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        if (!searchQuery.trim()) return data;

        const query = searchQuery.toLowerCase();

        if (isViewingPending) {
            return data.filter(reward =>
                reward.employee?.name?.toLowerCase().includes(query) ||
                reward.order?.orderNumber?.toLowerCase().includes(query)
            );
        }

        if (isViewingSpecificEmployee) {
            return data.filter(reward =>
                reward.description?.toLowerCase().includes(query) ||
                reward.order?.orderNumber?.toLowerCase().includes(query)
            );
        }

        if (isStatisticsMode) {
            return data.filter(employee =>
                employee.name?.toLowerCase().includes(query) ||
                employee.warehouse?.name?.toLowerCase().includes(query)
            );
        }

        return data;
    }, [data, searchQuery, isViewingPending, isViewingSpecificEmployee, isStatisticsMode]);

    const searchPlaceholder = useMemo(() => {
        if (isViewingPending) return "Поиск по сотруднику или номеру заказа...";
        if (isViewingSpecificEmployee) return "Поиск вознаграждений...";
        return "Поиск сотрудников...";
    }, [isViewingPending, isViewingSpecificEmployee]);

    return {
        searchQuery,
        setSearchQuery,
        filteredData,
        searchPlaceholder
    };
}; 