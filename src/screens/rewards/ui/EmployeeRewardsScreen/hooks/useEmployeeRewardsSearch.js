import { useState, useMemo } from 'react';

export const useEmployeeRewardsSearch = (data, viewMode) => {
    const [searchQuery, setSearchQuery] = useState('');

    const isViewingPending = useMemo(() => viewMode === 'pending', [viewMode]);
    const isViewingSpecificEmployee = useMemo(() => viewMode === 'employee', [viewMode]);
    const isStatisticsMode = useMemo(() => viewMode === 'statistics', [viewMode]);

    const filteredData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        
        const query = searchQuery.trim().toLowerCase();

        let result;

        if (isViewingPending) {
            result = searchQuery.trim() 
                ? data.filter(reward =>
                    reward.employee?.name?.toLowerCase().includes(query) ||
                    reward.order?.orderNumber?.toLowerCase().includes(query)
                )
                : data;
        } else if (isViewingSpecificEmployee) {
            result = searchQuery.trim()
                ? data.filter(reward =>
                    reward.description?.toLowerCase().includes(query) ||
                    reward.order?.orderNumber?.toLowerCase().includes(query)
                )
                : data;
        } else if (isStatisticsMode) {
            // Фильтруем сотрудников по поисковому запросу
            result = searchQuery.trim()
                ? data.filter(employee =>
                    employee.name?.toLowerCase().includes(query) ||
                    employee.warehouse?.name?.toLowerCase().includes(query)
                )
                : [...data]; // Копируем массив для сортировки
            
            // Сортируем сотрудников по убыванию totalEarned (от большей суммы к меньшей)
            result.sort((a, b) => {
                const totalA = a.totalEarned || 0;
                const totalB = b.totalEarned || 0;
                return totalB - totalA; // Убывающий порядок
            });
        } else {
            result = data;
        }

        return result;
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