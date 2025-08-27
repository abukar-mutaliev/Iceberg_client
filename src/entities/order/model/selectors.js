// ===== ИСПРАВЛЕННЫЕ СЕЛЕКТОРЫ =====
// selectors.js

import { createSelector } from "@reduxjs/toolkit";

// Константы для предотвращения создания новых ссылок
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

// ===== БАЗОВЫЕ СЕЛЕКТОРЫ С ПРОВЕРКАМИ =====
export const selectOrdersState = (state) => {
    // Добавляем дополнительные проверки
    if (!state || !state.order) {
        console.warn('Orders state is undefined, returning empty object');
        return {
            myOrders: {
                data: EMPTY_ARRAY,
                total: 0,
                page: 1,
                pages: 1,
                loading: false,
                error: null,
                lastFetchTime: null,
                hasMore: false
            },
            staffOrders: {
                data: EMPTY_ARRAY,
                total: 0,
                page: 1,
                pages: 1,
                loading: false,
                error: null,
                lastFetchTime: null,
                hasMore: false,
                filters: EMPTY_OBJECT
            },
            orderDetails: {
                data: null,
                loading: false,
                error: null,
                lastFetchTime: null
            },
            stats: {
                data: null,
                loading: false,
                error: null,
                lastFetchTime: null
            },
            operations: EMPTY_OBJECT,
            notifications: EMPTY_ARRAY,
            preferences: EMPTY_OBJECT,
            cache: EMPTY_OBJECT,
            error: null,
            lastError: null
        };
    }
    return state.order;
};

export const selectMyOrdersState = (state) => {
    const ordersState = selectOrdersState(state);
    return ordersState.myOrders || EMPTY_OBJECT;
};

export const selectStaffOrdersState = (state) => {
    const ordersState = selectOrdersState(state);
    return ordersState.staffOrders || EMPTY_OBJECT;
};

export const selectOrderDetailsState = (state) => {
    const ordersState = selectOrdersState(state);
    return ordersState.orderDetails || EMPTY_OBJECT;
};

export const selectOrdersStatsState = (state) => {
    const ordersState = selectOrdersState(state);
    return ordersState.stats || EMPTY_OBJECT;
};

export const selectOrdersOperations = (state) => {
    const ordersState = selectOrdersState(state);
    return ordersState.operations || EMPTY_OBJECT;
};

export const selectOrdersNotifications = (state) => {
    const ordersState = selectOrdersState(state);
    return ordersState.notifications || EMPTY_ARRAY;
};



// ===== СЕЛЕКТОРЫ ДЛЯ ЗАКАЗОВ ПЕРСОНАЛА =====
export const selectStaffOrders = createSelector(
    [selectStaffOrdersState],
    (staffOrders) => {
        // Дополнительная проверка на случай, если data не определена
        if (!staffOrders || !Array.isArray(staffOrders.data)) {
            console.warn('Staff orders data is not an array, returning empty array');
            return EMPTY_ARRAY;
        }
        return staffOrders.data;
    }
);

export const selectStaffOrdersLoading = createSelector(
    [selectStaffOrdersState],
    (staffOrders) => {
        return Boolean(staffOrders?.loading);
    }
);

export const selectStaffOrdersError = createSelector(
    [selectStaffOrdersState],
    (staffOrders) => {
        return staffOrders?.error || null;
    }
);

// ===== ДОПОЛНИТЕЛЬНЫЕ СЕЛЕКТОРЫ =====
export const selectMyOrders = createSelector(
    [selectMyOrdersState],
    (myOrders) => {
        if (!myOrders || !Array.isArray(myOrders.data)) {
            return EMPTY_ARRAY;
        }
        return myOrders.data;
    }
);

export const selectMyOrdersLoading = createSelector(
    [selectMyOrdersState],
    (myOrders) => {
        return Boolean(myOrders?.loading);
    }
);

export const selectOrderDetailsLoading = createSelector(
    [selectOrderDetailsState],
    (orderDetails) => {
        return Boolean(orderDetails?.loading);
    }
);

export const selectOrderDetails = createSelector(
    [selectOrderDetailsState],
    (orderDetails) => {
        return orderDetails?.data || null;
    }
);

export const selectOrdersStats = createSelector(
    [selectOrdersStatsState],
    (stats) => {
        return stats?.data || null;
    }
);

// Create stable UI state object
const createUIState = (myOrdersLoading, staffOrdersLoading, orderDetailsLoading, statsLoading) => ({
    myOrders: myOrdersLoading,
    staffOrders: staffOrdersLoading,
    orderDetails: orderDetailsLoading,
    stats: statsLoading
});

export const selectOrdersUIState = createSelector(
    [
        (state) => selectOrdersState(state).myOrders?.loading || false,
        (state) => selectOrdersState(state).staffOrders?.loading || false,
        (state) => selectOrdersState(state).orderDetails?.loading || false,
        (state) => selectOrdersState(state).stats?.loading || false
    ],
    createUIState
);

export const selectOrderOperations = createSelector(
    [selectOrdersState],
    (ordersState) => {
        return ordersState.operations || EMPTY_OBJECT;
    }
);

export const selectStaffOrdersFilters = createSelector(
    [selectStaffOrdersState],
    (staffOrders) => {
        return staffOrders?.filters || EMPTY_OBJECT;
    }
);

export const selectOrderNotifications = createSelector(
    [selectOrdersState],
    (ordersState) => {
        return ordersState.notifications || EMPTY_ARRAY;
    }
);

export const selectOrdersPreferences = createSelector(
    [selectOrdersState],
    (ordersState) => {
        return ordersState.preferences || EMPTY_OBJECT;
    }
);

export const selectActiveOrderNotifications = createSelector(
    [selectOrderNotifications],
    (notifications) => {
        if (notifications === EMPTY_ARRAY) return EMPTY_ARRAY;
        const activeNotifications = notifications.filter(notification => !notification.dismissed);
        return activeNotifications.length === 0 ? EMPTY_ARRAY : activeNotifications;
    }
);

// Pre-defined access rights objects to avoid creating new references
const ADMIN_ACCESS_RIGHTS = {
    canViewMyOrders: false,
    canViewStaffOrders: true,
    canUpdateOrderStatus: true,
    canAssignOrders: true,
    canCancelOrders: true,
    canCancelMyOrders: false,
    canCreateOrders: true,
    canBulkUpdate: true,
    canExportOrders: true,
    canViewStats: true
};

const EMPLOYEE_ACCESS_RIGHTS = {
    canViewMyOrders: false,
    canViewStaffOrders: true,
    canUpdateOrderStatus: true,
    canAssignOrders: true,
    canCancelOrders: true,
    canCancelMyOrders: false,
    canCreateOrders: true,
    canBulkUpdate: false,
    canExportOrders: true,
    canViewStats: true
};

const CLIENT_ACCESS_RIGHTS = {
    canViewMyOrders: true,
    canViewStaffOrders: false,
    canUpdateOrderStatus: false,
    canAssignOrders: false,
    canCancelOrders: false,
    canCancelMyOrders: true,
    canCreateOrders: false,
    canBulkUpdate: false,
    canExportOrders: false,
    canViewStats: false
};

const DEFAULT_ACCESS_RIGHTS = {
    canViewMyOrders: false,
    canViewStaffOrders: false,
    canUpdateOrderStatus: false,
    canAssignOrders: false,
    canCancelOrders: false,
    canCancelMyOrders: false,
    canCreateOrders: false,
    canBulkUpdate: false,
    canExportOrders: false,
    canViewStats: false
};

export const selectOrderAccessRights = createSelector(
    [(state) => state.auth?.user?.role],
    (userRole) => {
        switch (userRole) {
            case 'ADMIN':
                return ADMIN_ACCESS_RIGHTS;
            case 'EMPLOYEE':
                return EMPLOYEE_ACCESS_RIGHTS;
            case 'CLIENT':
                return CLIENT_ACCESS_RIGHTS;
            default:
                return DEFAULT_ACCESS_RIGHTS;
        }
    }
);

export const selectOrderById = createSelector(
    [selectMyOrders, selectStaffOrders, (state, orderId) => orderId],
    (myOrders, staffOrders, orderId) => {
        // Search in myOrders first
        const myOrder = myOrders.find(order => order.id === orderId);
        if (myOrder) return myOrder;
        
        // Then search in staffOrders
        const staffOrder = staffOrders.find(order => order.id === orderId);
        return staffOrder || null;
    }
);

export const selectOrderDetailsFormatted = createSelector(
    [selectOrderDetails],
    (orderDetails) => {
        if (!orderDetails) return null;
        
        // Добавляем форматированные поля
        return {
            ...orderDetails,
            formattedAmount: new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB'
            }).format(orderDetails.totalAmount || 0),
            formattedOrderNumber: orderDetails.orderNumber?.startsWith('ORD-')
                ? orderDetails.orderNumber
                : `№${orderDetails.orderNumber}`,
        };
    }
);

export const selectIsOrderLoading = createSelector(
    [selectOrdersUIState, (state, orderId) => orderId],
    (uiState, orderId) => {
        return uiState.orderDetails;
    }
);

export const selectFilteredMyOrders = createSelector(
    [selectMyOrders, (state, filters) => filters],
    (orders, filters) => {
        if (!filters || Object.keys(filters).length === 0) return orders;
        
        return orders.filter(order => {
            if (filters.status && order.status !== filters.status) return false;
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const searchableText = [
                    order.orderNumber,
                    order.comment,
                    order.deliveryAddress
                ].filter(Boolean).join(' ').toLowerCase();
                
                if (!searchableText.includes(searchTerm)) return false;
            }
            return true;
        });
    }
);

export const selectFilteredStaffOrders = createSelector(
    [selectStaffOrders, selectStaffOrdersFilters],
    (orders, filters) => {
        if (!filters || Object.keys(filters).length === 0) return orders;
        
        return orders.filter(order => {
            if (filters.status && order.status !== filters.status) return false;
            if (filters.warehouseId && order.warehouseId !== filters.warehouseId) return false;
            if (filters.districtId && order.client?.districtId !== filters.districtId) return false;
            if (filters.assignedToMe && !order.assignedToMe) return false;
            if (filters.priority && !isPriorityOrder(order)) return false;
            return true;
        });
    }
);

export const selectSortedOrders = createSelector(
    [(state, orders) => orders, (state, orders, sortBy) => sortBy, (state, orders, sortBy, sortOrder) => sortOrder],
    (orders, sortBy = 'createdAt', sortOrder = 'desc') => {
        if (!Array.isArray(orders)) return EMPTY_ARRAY;
        
        const sorted = [...orders].sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];
            
            if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        
        return sorted;
    }
);

export const selectOrdersStatsFormatted = createSelector(
    [selectOrdersStats],
    (stats) => {
        if (!stats) return null;
        
        return {
            ...stats,
            formattedTotalRevenue: new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB'
            }).format(stats.totalRevenue || 0)
        };
    }
);

export const selectOrdersDashboardData = createSelector(
    [selectOrdersStats, selectStaffOrders],
    (stats, orders) => {
        const today = new Date();
        const todaysOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate.toDateString() === today.toDateString();
        });
        
        return {
            todayOrders: {
                count: todaysOrders.length,
                revenue: todaysOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
            },
            pendingOrders: {
                count: orders.filter(order => order.status === 'PENDING').length
            },
            stats
        };
    }
);

export const selectOrdersStatsLoading = createSelector(
    [selectOrdersStatsState],
    (stats) => {
        return Boolean(stats?.loading);
    }
);

export const selectMyOrdersStats = createSelector(
    [selectMyOrders],
    (orders) => {
        return {
            totalCount: orders.length,
            totalAmount: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
            statusCounts: orders.reduce((acc, order) => {
                acc[order.status] = (acc[order.status] || 0) + 1;
                return acc;
            }, {})
        };
    }
);

export const selectStaffOrdersStats = createSelector(
    [selectStaffOrders],
    (orders) => {
        return {
            totalCount: orders.length,
            totalAmount: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
            statusCounts: orders.reduce((acc, order) => {
                acc[order.status] = (acc[order.status] || 0) + 1;
                return acc;
            }, {})
        };
    }
);

export const selectOrdersAnalytics = createSelector(
    [(state, orders) => orders],
    (orders) => {
        if (!Array.isArray(orders) || orders.length === 0) return null;
        
        const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const averageOrderValue = totalRevenue / orders.length;
        const completedOrders = orders.filter(order => order.status === 'DELIVERED');
        const conversionRate = (completedOrders.length / orders.length) * 100;
        
        return {
            totalOrders: orders.length,
            totalRevenue,
            averageOrderValue,
            completedOrders: completedOrders.length,
            conversionRate
        };
    }
);

export const selectOrderNotificationsByType = createSelector(
    [selectOrderNotifications, (state, type) => type],
    (notifications, type) => {
        return notifications.filter(notification => notification.type === type);
    }
);

export const selectOrderNotificationsByOrderId = createSelector(
    [selectOrderNotifications, (state, orderId) => orderId],
    (notifications, orderId) => {
        return notifications.filter(notification => notification.orderId === orderId);
    }
);

export const selectIsBulkOperating = createSelector(
    [selectOrderOperations],
    (operations) => {
        return Boolean(operations?.bulkOperating);
    }
);

export const selectIsExporting = createSelector(
    [selectOrderOperations],
    (operations) => {
        return Boolean(operations?.exporting);
    }
);

// Утилитарная функция для проверки приоритетности заказа
const isPriorityOrder = (order) => {
    if (order.status === 'PENDING') {
        return true;
    }
    
    if (order.expectedDeliveryDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);
        
        return new Date(order.expectedDeliveryDate) <= tomorrow;
    }
    
    return false;
};
