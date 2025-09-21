import { useMemo } from 'react';
import { CONSTANTS } from '../lib/constants';

export const useOrderPermissions = (currentUser) => {
    const actualProcessingRole = useMemo(() =>
        currentUser?.profile?.processingRole || currentUser?.employee?.processingRole || null,
        [currentUser?.profile?.processingRole, currentUser?.employee?.processingRole]
    );

    const canViewAllOrders = useMemo(() => {
        if (!currentUser) return false;
        const isSuperAdmin = currentUser?.role === 'ADMIN' && currentUser?.profile?.isSuperAdmin;
        const isGeneralStaff = currentUser?.role === 'EMPLOYEE' && !['PICKER', 'PACKER', 'COURIER'].includes(actualProcessingRole);
        return isSuperAdmin || isGeneralStaff;
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

    console.log('🔐 useOrderPermissions: результат', {
        userRole: currentUser?.role,
        actualProcessingRole,
        canViewAllOrders,
        relevantStatuses,
        historyStatuses,
        userProfile: currentUser?.profile,
        userEmployee: currentUser?.employee
    });

    return {
        canViewAllOrders,
        actualProcessingRole,
        relevantStatuses,
        historyStatuses
    };
};
