import { useMemo } from 'react';

export const useAdminPermissions = (currentUser, productSupplierId = null) => {
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
        const isSupplier = currentUser.role === 'SUPPLIER';
        const hasProductsPermission = currentUser.permissions?.includes('products:manage');

        // Проверка прав для админов и сотрудников
        const adminOrEmployeeRights = {
            canEdit: isAdmin || isEmployee || hasProductsPermission,
            canDelete: isAdmin || isEmployee || hasProductsPermission,
            canViewAnalytics: isAdmin || isEmployee,
            canManageStock: isAdmin || isEmployee || hasProductsPermission
        };

        // Если это админ или сотрудник, возвращаем их права
        if (isAdmin || isEmployee) {
            return adminOrEmployeeRights;
        }

        // Для поставщиков проверяем, является ли он владельцем продукта
        if (isSupplier && productSupplierId) {
            // Определяем ID поставщика из разных источников
            let supplierId = null;

            // 1. Сначала проверяем currentUser.supplier
            if (currentUser.supplier && currentUser.supplier.id) {
                supplierId = currentUser.supplier.id;
            }
            // 2. Если нет, проверяем profile данные
            else if (currentUser.profile && currentUser.profile.supplier && currentUser.profile.supplier.id) {
                supplierId = currentUser.profile.supplier.id;
            }
            // 3. Если нет, используем ID пользователя как supplier ID (для старой логики)
            else if (currentUser.id) {
                supplierId = currentUser.id;
            }

            // Проверяем, является ли поставщик владельцем продукта
            const isProductOwner = supplierId && String(supplierId) === String(productSupplierId);

            console.log('useAdminPermissions: Проверка прав поставщика', {
                userId: currentUser.id,
                supplierId: supplierId,
                productSupplierId: productSupplierId,
                isProductOwner: isProductOwner,
                userSupplier: !!currentUser.supplier,
                userProfileSupplier: !!(currentUser.profile && currentUser.profile.supplier)
            });

            return {
                canEdit: isProductOwner,
                canDelete: isProductOwner,
                canViewAnalytics: false,
                canManageStock: isProductOwner
            };
        }

        // Для остальных случаев возвращаем базовые права
        return {
            canEdit: hasProductsPermission,
            canDelete: hasProductsPermission,
            canViewAnalytics: false,
            canManageStock: hasProductsPermission
        };
    }, [currentUser, productSupplierId]);
};