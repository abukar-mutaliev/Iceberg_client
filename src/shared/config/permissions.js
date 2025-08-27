// Убираем импорт useAuth для избежания циклической зависимости
// import {useAuth} from "@entities/auth/hooks/useAuth";

export const PERMISSIONS = {
    // Управление пользователями
    USER_CREATE: 'user:create',
    USER_READ: 'user:read',
    USER_UPDATE: 'user:update',
    USER_DELETE: 'user:delete',
    USER_MANAGE_ROLES: 'user:manage-roles',

    // Управление профилем
    PROFILE_UPDATE: 'profile:update',
    PROFILE_DELETE: 'profile:delete',

    // Управление сотрудниками
    STAFF_MANAGE: 'staff:manage',
    STAFF_CREATE: 'staff:create',
    STAFF_DELETE: 'staff:delete',

    // Управление администраторами
    ADMIN_MANAGE: 'admin:manage',
    ADMIN_CREATE: 'admin:create',
    ADMIN_VIEW_LIST: 'admin:view-list',

    // Управление водителями
    DRIVER_VIEW: 'driver:view',
    DRIVER_MANAGE: 'driver:manage',
    DRIVER_STOPS_MANAGE: 'driver:stops-manage',

    // Управление поставщиками
    SUPPLIER_VIEW: 'supplier:view',
    SUPPLIER_MANAGE: 'supplier:manage',

    // Управление заказами
    ORDER_CREATE: 'order:create',
    ORDER_VIEW: 'order:view',
    ORDER_UPDATE: 'order:update',
    ORDER_DELETE: 'order:delete',

    // Системные разрешения
    VIEW_STATISTICS: 'system:view-statistics',
    VIEW_REPORTS: 'system:view-reports',
};

// Роли и их разрешения
export const ROLE_PERMISSIONS = {
    CLIENT: [
        PERMISSIONS.PROFILE_UPDATE,
        PERMISSIONS.PROFILE_DELETE,
        PERMISSIONS.ORDER_CREATE,
        PERMISSIONS.ORDER_VIEW,
    ],

    EMPLOYEE: [
        PERMISSIONS.PROFILE_UPDATE,
        PERMISSIONS.PROFILE_DELETE,
        PERMISSIONS.USER_READ,
        PERMISSIONS.USER_UPDATE,
        PERMISSIONS.DRIVER_VIEW,
        PERMISSIONS.SUPPLIER_VIEW,
        PERMISSIONS.ORDER_VIEW,
        PERMISSIONS.ORDER_UPDATE,
    ],

    DRIVER: [
        PERMISSIONS.PROFILE_UPDATE,
        PERMISSIONS.PROFILE_DELETE,
        PERMISSIONS.DRIVER_STOPS_MANAGE,
    ],

    SUPPLIER: [
        PERMISSIONS.PROFILE_UPDATE,
        PERMISSIONS.PROFILE_DELETE,
        PERMISSIONS.SUPPLIER_VIEW,
    ],

    ADMIN: [
        PERMISSIONS.USER_READ,
        PERMISSIONS.USER_UPDATE,
        PERMISSIONS.USER_CREATE,
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.USER_MANAGE_ROLES,
        PERMISSIONS.PROFILE_UPDATE,
        PERMISSIONS.STAFF_MANAGE,
        PERMISSIONS.STAFF_CREATE,
        PERMISSIONS.STAFF_DELETE,
        PERMISSIONS.ADMIN_VIEW_LIST,
        PERMISSIONS.DRIVER_VIEW,
        PERMISSIONS.DRIVER_MANAGE,
        PERMISSIONS.SUPPLIER_VIEW,
        PERMISSIONS.SUPPLIER_MANAGE,
        PERMISSIONS.ORDER_VIEW,
        PERMISSIONS.ORDER_UPDATE,
        PERMISSIONS.ORDER_DELETE,
        PERMISSIONS.VIEW_STATISTICS,
        PERMISSIONS.VIEW_REPORTS,
    ],

    SUPER_ADMIN: [
        ...Object.values(PERMISSIONS), // Все разрешения
    ],
};

// Функция получения разрешений по роли
export const getPermissionsByRole = (role) => {
    if (!role) return [];
    return ROLE_PERMISSIONS[role] || [];
};

// Проверка наличия разрешения
export const hasPermission = (userPermissions, requiredPermission) => {
    return userPermissions.includes(requiredPermission);
};

// Проверка наличия любого из разрешений
export const hasAnyPermission = (userPermissions, requiredPermissions) => {
    return requiredPermissions.some(permission => userPermissions.includes(permission));
};

// Проверка наличия всех разрешений
export const hasAllPermissions = (userPermissions, requiredPermissions) => {
    return requiredPermissions.every(permission => userPermissions.includes(permission));
};

// HOC для проверки разрешений компонентов
export const withPermission = (permission) => (Component) => {
    return (props) => {
        // const { hasPermission } = useAuth(); // Удалено

        // if (!hasPermission(permission)) { // Удалено
        //     return null; // или компонент "Нет доступа" // Удалено
        // } // Удалено

        return <Component {...props} />;
    };
};