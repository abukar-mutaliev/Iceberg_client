import { useMemo } from 'react';
import { CONSTANTS } from '../lib/constants';

export const useOrderPermissions = (currentUser) => {
    const actualProcessingRole = useMemo(() =>
        currentUser?.profile?.processingRole || currentUser?.employee?.processingRole || null,
        [currentUser?.profile?.processingRole, currentUser?.employee?.processingRole]
    );

    const canViewAllOrders = useMemo(() => {
        if (!currentUser) return false;
        // Админы всегда могут видеть все заказы
        const isAdmin = currentUser?.role === 'ADMIN';
        // Обычные сотрудники (не PICKER/PACKER/COURIER) тоже могут видеть все заказы
        const isGeneralStaff = currentUser?.role === 'EMPLOYEE' && !['PICKER', 'PACKER', 'COURIER'].includes(actualProcessingRole);
        return isAdmin || isGeneralStaff;
    }, [currentUser, actualProcessingRole]);

    // Стабилизируем массивы, чтобы они не пересоздавались при каждом рендере
    const relevantStatuses = useMemo(() =>
        actualProcessingRole ? (CONSTANTS.ROLE_STATUS_MAPPING[actualProcessingRole] || []) : [],
        [actualProcessingRole]
    );

    const historyStatuses = useMemo(() =>
        actualProcessingRole ? (CONSTANTS.ROLE_HISTORY_MAPPING[actualProcessingRole] || []) : [],
        [actualProcessingRole]
    );

    return {
        canViewAllOrders,
        actualProcessingRole,
        relevantStatuses,
        historyStatuses
    };
};
