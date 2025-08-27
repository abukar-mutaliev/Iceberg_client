import { useMemo } from 'react';

export const useAdminPermissions = (currentUser) => {
    return useMemo(() => {
        if (!currentUser) {
            return {
                canEdit: false,
                canDelete: false,
                canViewAnalytics: false,
                canManageStock: false
            };
        }

        const isAdmin = currentUser.role === 'ADMIN';
        const isEmployee = currentUser.role === 'EMPLOYEE';
        const hasProductsPermission = currentUser.permissions?.includes('products:manage');

        return {
            canEdit: isAdmin || isEmployee || hasProductsPermission,
            canDelete: isAdmin || isEmployee || hasProductsPermission,
            canViewAnalytics: isAdmin || isEmployee,
            canManageStock: isAdmin || isEmployee || hasProductsPermission
        };
    }, [currentUser]);
};