import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchMyOrders,
    fetchStaffOrders,
    fetchOrderDetails,
    fetchOrdersStats,
    updateOrderStatus,
    assignOrder,
    cancelOrder,
    createOrderForClient,
    bulkUpdateOrders,
    exportOrders,
    clearError,
    clearSpecificError,
    clearCache,
    setStaffOrdersFilters,
    resetStaffOrdersFilters,
    addNotification,
    removeNotification,
    clearNotifications,
    updatePreferences,
    updateOrderInList,
    removeOrderFromList
} from '../model/slice';

import orderSelectors from '../model/selectors';
import OrderService from '@shared/services/OrderService';

// ===== ОСНОВНОЙ ХУК ДЛЯ РАБОТЫ С ЗАКАЗАМИ =====
export const useOrders = () => {
    const dispatch = useDispatch();
    const userRole = useSelector(state => state.auth?.user?.role);
    const accessRights = useSelector(orderSelectors.selectOrderAccessRights);

    // Основные данные
    const myOrders = useSelector(orderSelectors.selectMyOrders);
    const staffOrders = useSelector(orderSelectors.selectStaffOrders);
    const orderDetails = useSelector(orderSelectors.selectOrderDetails);
    const stats = useSelector(orderSelectors.selectOrdersStats);

    // Состояния загрузки
    const loading = useSelector(orderSelectors.selectOrdersUIState);
    const operations = useSelector(orderSelectors.selectOrderOperations);

    // Фильтры и настройки
    const staffFilters = useSelector(orderSelectors.selectStaffOrdersFilters);
    const preferences = useSelector(orderSelectors.selectOrdersPreferences);

    // Уведомления
    const notifications = useSelector(orderSelectors.selectOrderNotifications);
    const activeNotifications = useSelector(orderSelectors.selectActiveOrderNotifications);

    // ===== ЗАГРУЗКА ДАННЫХ =====

    const loadMyOrders = useCallback((params = {}) => {
        if (!accessRights.canViewMyOrders) {
            console.warn('Access denied: Cannot view my orders');
            return Promise.reject(new Error('Access denied'));
        }
        return dispatch(fetchMyOrders(params));
    }, [dispatch, accessRights.canViewMyOrders]);

    const loadStaffOrders = useCallback((params = {}) => {
        if (!accessRights.canViewStaffOrders) {
            console.warn('Access denied: Cannot view staff orders');
            return Promise.reject(new Error('Access denied'));
        }
        return dispatch(fetchStaffOrders(params));
    }, [dispatch, accessRights.canViewStaffOrders]);

    const loadOrderDetails = useCallback((orderId, forceRefresh = false) => {
        return dispatch(fetchOrderDetails({ orderId, forceRefresh }));
    }, [dispatch]);

    const loadOrdersStats = useCallback((params = {}) => {
        if (!accessRights.canViewStats) {
            console.warn('Access denied: Cannot view stats');
            return Promise.reject(new Error('Access denied'));
        }
        return dispatch(fetchOrdersStats(params));
    }, [dispatch, accessRights.canViewStats]);

    // ===== УПРАВЛЕНИЕ ЗАКАЗАМИ =====

    const updateStatus = useCallback(async (orderId, statusData) => {
        if (!accessRights.canUpdateOrderStatus) {
            throw new Error('Access denied: Cannot update order status');
        }

        try {
            const result = await dispatch(updateOrderStatus({ orderId, statusData })).unwrap();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при обновлении статуса' };
        }
    }, [dispatch, accessRights.canUpdateOrderStatus]);

    const assignOrderToEmployee = useCallback(async (orderId, assignmentData) => {
        if (!accessRights.canAssignOrders) {
            throw new Error('Access denied: Cannot assign orders');
        }

        try {
            const result = await dispatch(assignOrder({ orderId, assignmentData })).unwrap();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при назначении заказа' };
        }
    }, [dispatch, accessRights.canAssignOrders]);

    const cancelOrderById = useCallback(async (orderId, cancellationData, isMyOrder = false) => {
        const canCancel = isMyOrder ? accessRights.canCancelMyOrders : accessRights.canCancelOrders;

        if (!canCancel) {
            throw new Error('Access denied: Cannot cancel order');
        }

        try {
            const result = await dispatch(cancelOrder({
                orderId,
                cancellationData,
                isMyOrder
            })).unwrap();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при отмене заказа' };
        }
    }, [dispatch, accessRights.canCancelOrders, accessRights.canCancelMyOrders]);

    const createOrder = useCallback(async (orderData) => {
        if (!accessRights.canCreateOrders) {
            throw new Error('Access denied: Cannot create orders');
        }

        try {
            const result = await dispatch(createOrderForClient(orderData)).unwrap();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при создании заказа' };
        }
    }, [dispatch, accessRights.canCreateOrders]);

    // ===== МАССОВЫЕ ОПЕРАЦИИ =====

    const bulkUpdate = useCallback(async (bulkData) => {
        if (!accessRights.canBulkUpdate) {
            throw new Error('Access denied: Cannot perform bulk updates');
        }

        try {
            const result = await dispatch(bulkUpdateOrders(bulkData)).unwrap();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при массовом обновлении' };
        }
    }, [dispatch, accessRights.canBulkUpdate]);

    const exportOrdersData = useCallback(async (exportData) => {
        if (!accessRights.canExportOrders) {
            throw new Error('Access denied: Cannot export orders');
        }

        try {
            const result = await dispatch(exportOrders(exportData)).unwrap();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при экспорте' };
        }
    }, [dispatch, accessRights.canExportOrders]);

    // ===== ФИЛЬТРЫ И НАСТРОЙКИ =====

    const setFilters = useCallback((filters) => {
        dispatch(setStaffOrdersFilters(filters));
    }, [dispatch]);

    const resetFilters = useCallback(() => {
        dispatch(resetStaffOrdersFilters());
    }, [dispatch]);

    const updateUserPreferences = useCallback((newPreferences) => {
        dispatch(updatePreferences(newPreferences));
    }, [dispatch]);

    // ===== УТИЛИТЫ =====

    const clearErrors = useCallback((section = null) => {
        if (section) {
            dispatch(clearSpecificError({ section }));
        } else {
            dispatch(clearError());
        }
    }, [dispatch]);

    const clearCacheData = useCallback((cacheKey = null) => {
        if (cacheKey) {
            dispatch(clearCache({ cacheKey }));
        } else {
            dispatch(clearCache());
        }
    }, [dispatch]);

    const addOrderNotification = useCallback((notification) => {
        const notificationWithId = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...notification,
            timestamp: new Date().toISOString()
        };
        dispatch(addNotification(notificationWithId));
        return notificationWithId.id;
    }, [dispatch]);

    const removeOrderNotification = useCallback((notificationId) => {
        dispatch(removeNotification(notificationId));
    }, [dispatch]);

    const clearAllNotifications = useCallback(() => {
        dispatch(clearNotifications());
    }, [dispatch]);

    // ===== АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ =====

    const refreshData = useCallback(async (sections = ['myOrders', 'staffOrders']) => {
        const promises = [];

        if (sections.includes('myOrders') && accessRights.canViewMyOrders) {
            promises.push(dispatch(fetchMyOrders({ forceRefresh: true })));
        }

        if (sections.includes('staffOrders') && accessRights.canViewStaffOrders) {
            promises.push(dispatch(fetchStaffOrders({ forceRefresh: true })));
        }

        if (sections.includes('stats') && accessRights.canViewStats) {
            promises.push(dispatch(fetchOrdersStats({ forceRefresh: true })));
        }

        try {
            await Promise.all(promises);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }, [dispatch, accessRights]);

    return {
        // Данные
        myOrders,
        staffOrders,
        orderDetails,
        stats,

        // Состояния
        loading,
        operations,
        accessRights,

        // Фильтры и настройки
        staffFilters,
        preferences,

        // Уведомления
        notifications,
        activeNotifications,

        // Операции загрузки
        loadMyOrders,
        loadStaffOrders,
        loadOrderDetails,
        loadOrdersStats,

        // Управление заказами
        updateStatus,
        assignOrderToEmployee,
        cancelOrderById,
        createOrder,

        // Массовые операции
        bulkUpdate,
        exportOrdersData,

        // Фильтры и настройки
        setFilters,
        resetFilters,
        updateUserPreferences,

        // Утилиты
        clearErrors,
        clearCacheData,
        addOrderNotification,
        removeOrderNotification,
        clearAllNotifications,
        refreshData
    };
};

// ===== ХУК ДЛЯ РАБОТЫ С КОНКРЕТНЫМ ЗАКАЗОМ =====
export const useOrder = (orderId) => {
    const dispatch = useDispatch();
    const order = useSelector(state => orderSelectors.selectOrderById(state, orderId));
    const orderDetails = useSelector(orderSelectors.selectOrderDetailsFormatted);
    const isLoading = useSelector(state => orderSelectors.selectIsOrderLoading(state, orderId));
    const accessRights = useSelector(orderSelectors.selectOrderAccessRights);

    // Загружаем детали заказа
    const loadDetails = useCallback((forceRefresh = false) => {
        return dispatch(fetchOrderDetails({ orderId, forceRefresh }));
    }, [dispatch, orderId]);

    // Обновление статуса заказа
    const updateStatus = useCallback(async (statusData) => {
        if (!accessRights.canUpdateOrderStatus) {
            throw new Error('Access denied: Cannot update order status');
        }

        try {
            const result = await dispatch(updateOrderStatus({ orderId, statusData })).unwrap();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при обновлении статуса' };
        }
    }, [dispatch, orderId, accessRights.canUpdateOrderStatus]);

    // Назначение заказа
    const assign = useCallback(async (assignmentData) => {
        if (!accessRights.canAssignOrders) {
            throw new Error('Access denied: Cannot assign orders');
        }

        try {
            const result = await dispatch(assignOrder({ orderId, assignmentData })).unwrap();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при назначении заказа' };
        }
    }, [dispatch, orderId, accessRights.canAssignOrders]);

    // Отмена заказа
    const cancel = useCallback(async (cancellationData, isMyOrder = false) => {
        const canCancel = isMyOrder ? accessRights.canCancelMyOrders : accessRights.canCancelOrders;

        if (!canCancel) {
            throw new Error('Access denied: Cannot cancel order');
        }

        try {
            const result = await dispatch(cancelOrder({
                orderId,
                cancellationData,
                isMyOrder
            })).unwrap();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при отмене заказа' };
        }
    }, [dispatch, orderId, accessRights.canCancelOrders, accessRights.canCancelMyOrders]);

    // Получаем подробные данные о заказе
    const orderData = useMemo(() => {
        const currentOrder = orderDetails?.id === orderId ? orderDetails : order;

        if (!currentOrder) return null;

        return {
            ...currentOrder,
            // Добавляем вычисляемые поля
            statusLabel: OrderService.getStatusLabel(currentOrder.status),
            statusColor: OrderService.getStatusColor(currentOrder.status),
            formattedOrderNumber: OrderService.formatOrderNumber(currentOrder.orderNumber),
            canCancel: OrderService.canCancelOrder(currentOrder.status, accessRights.canCancelMyOrders ? 'CLIENT' : 'STAFF'),
            canLeaveReview: OrderService.canLeaveReview(currentOrder.status),
            availableStatuses: OrderService.getAvailableStatuses(currentOrder.status),
            estimatedDelivery: currentOrder.expectedDeliveryDate
                ? new Date(currentOrder.expectedDeliveryDate)
                : OrderService.calculateEstimatedDelivery(currentOrder),
            formattedAmount: new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB'
            }).format(currentOrder.totalAmount || 0)
        };
    }, [order, orderDetails, orderId, accessRights]);

    return {
        order: orderData,
        isLoading,
        loadDetails,
        updateStatus,
        assign,
        cancel,
        accessRights
    };
};

// ===== ХУК ДЛЯ АВТОМАТИЧЕСКОЙ ЗАГРУЗКИ ЗАКАЗОВ =====
export const useOrdersAutoLoad = (options = {}) => {
    const {
        loadOnMount = true,
        loadMyOrdersOnMount = true,
        loadStaffOrdersOnMount = true,
        autoRefresh = false,
        refreshInterval = 30000, // 30 секунд
        loadStatsOnMount = false
    } = options;

    const dispatch = useDispatch();
    const userRole = useSelector(state => state.auth?.user?.role);
    const accessRights = useSelector(orderSelectors.selectOrderAccessRights);
    const intervalRef = useRef(null);

    // Загрузка при монтировании
    useEffect(() => {
        if (!loadOnMount) return;

        const loadPromises = [];

        if (loadMyOrdersOnMount && accessRights.canViewMyOrders) {
            loadPromises.push(dispatch(fetchMyOrders()));
        }

        if (loadStaffOrdersOnMount && accessRights.canViewStaffOrders) {
            loadPromises.push(dispatch(fetchStaffOrders()));
        }

        if (loadStatsOnMount && accessRights.canViewStats) {
            loadPromises.push(dispatch(fetchOrdersStats()));
        }

        Promise.all(loadPromises).catch(error => {
            console.error('Error loading orders on mount:', error);
        });
    }, [
        loadOnMount,
        loadMyOrdersOnMount,
        loadStaffOrdersOnMount,
        loadStatsOnMount,
        dispatch,
        accessRights.canViewMyOrders,
        accessRights.canViewStaffOrders,
        accessRights.canViewStats
    ]);

    // Автоматическое обновление
    useEffect(() => {
        if (!autoRefresh) return;

        intervalRef.current = setInterval(() => {
            const refreshPromises = [];

            if (accessRights.canViewMyOrders) {
                refreshPromises.push(dispatch(fetchMyOrders({ forceRefresh: true })));
            }

            if (accessRights.canViewStaffOrders) {
                refreshPromises.push(dispatch(fetchStaffOrders({ forceRefresh: true })));
            }

            Promise.all(refreshPromises).catch(error => {
                console.error('Error during auto refresh:', error);
            });
        }, refreshInterval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [
        autoRefresh,
        refreshInterval,
        dispatch,
        accessRights.canViewMyOrders,
        accessRights.canViewStaffOrders
    ]);

    // Очистка интервала при размонтировании
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);
};

// ===== ХУК ДЛЯ ФИЛЬТРАЦИИ И ПОИСКА ЗАКАЗОВ =====
export const useOrdersFilter = () => {
    const dispatch = useDispatch();
    const myOrders = useSelector(orderSelectors.selectMyOrders);
    const staffOrders = useSelector(orderSelectors.selectStaffOrders);
    const currentFilters = useSelector(orderSelectors.selectStaffOrdersFilters);

    const filterMyOrders = useCallback((filters) => {
        return useSelector(state => orderSelectors.selectFilteredMyOrders(state, filters));
    }, []);

    const filterStaffOrders = useCallback(() => {
        return useSelector(orderSelectors.selectFilteredStaffOrders);
    }, []);

    const sortOrders = useCallback((orders, sortBy = 'createdAt', sortOrder = 'desc') => {
        return useSelector(state => orderSelectors.selectSortedOrders(state, orders, sortBy, sortOrder));
    }, []);

    const setStaffFilters = useCallback((filters) => {
        dispatch(setStaffOrdersFilters(filters));
    }, [dispatch]);

    const resetStaffFilters = useCallback(() => {
        dispatch(resetStaffOrdersFilters());
    }, [dispatch]);

    const searchOrders = useCallback((orders, searchTerm) => {
        if (!searchTerm || !orders.length) return orders;

        const searchLower = searchTerm.toLowerCase();

        return orders.filter(order => {
            const searchableText = [
                order.orderNumber,
                order.client?.name,
                order.comment,
                order.deliveryAddress,
                order.status,
                OrderService.getStatusLabel(order.status)
            ].filter(Boolean).join(' ').toLowerCase();

            return searchableText.includes(searchLower);
        });
    }, []);

    return {
        myOrders,
        staffOrders,
        currentFilters,
        filterMyOrders,
        filterStaffOrders,
        sortOrders,
        setStaffFilters,
        resetStaffFilters,
        searchOrders
    };
};

// ===== ХУК ДЛЯ СТАТИСТИКИ И АНАЛИТИКИ =====
export const useOrdersAnalytics = () => {
    const dispatch = useDispatch();
    const stats = useSelector(orderSelectors.selectOrdersStatsFormatted);
    const myOrders = useSelector(orderSelectors.selectMyOrders);
    const staffOrders = useSelector(orderSelectors.selectStaffOrders);
    const dashboardData = useSelector(orderSelectors.selectOrdersDashboardData);
    const loading = useSelector(orderSelectors.selectOrdersStatsLoading);

    const loadStats = useCallback((params = {}) => {
        return dispatch(fetchOrdersStats(params));
    }, [dispatch]);

    const getMyOrdersAnalytics = useCallback(() => {
        return useSelector(orderSelectors.selectMyOrdersStats);
    }, []);

    const getStaffOrdersAnalytics = useCallback(() => {
        return useSelector(orderSelectors.selectStaffOrdersStats);
    }, []);

    const getOrdersAnalytics = useCallback((orders) => {
        return useSelector(state => orderSelectors.selectOrdersAnalytics(state, orders));
    }, []);

    const calculateMetrics = useCallback((orders, period = 'month') => {
        if (!orders.length) return null;

        const now = new Date();
        let startDate;

        switch (period) {
            case 'day':
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'year':
                startDate = new Date(now);
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate = new Date(0);
        }

        const periodOrders = orders.filter(order =>
            new Date(order.createdAt) >= startDate
        );

        const totalRevenue = periodOrders.reduce((sum, order) =>
            sum + (order.totalAmount || 0), 0
        );

        const completedOrders = periodOrders.filter(order =>
            order.status === 'DELIVERED'
        );

        const conversionRate = periodOrders.length > 0
            ? (completedOrders.length / periodOrders.length) * 100
            : 0;

        const averageOrderValue = periodOrders.length > 0
            ? totalRevenue / periodOrders.length
            : 0;

        return {
            period,
            totalOrders: periodOrders.length,
            completedOrders: completedOrders.length,
            totalRevenue,
            averageOrderValue,
            conversionRate,
            startDate,
            endDate: now
        };
    }, []);

    return {
        stats,
        dashboardData,
        loading,
        loadStats,
        getMyOrdersAnalytics,
        getStaffOrdersAnalytics,
        getOrdersAnalytics,
        calculateMetrics
    };
};

// ===== ХУК ДЛЯ УВЕДОМЛЕНИЙ =====
export const useOrderNotifications = () => {
    const dispatch = useDispatch();
    const notifications = useSelector(orderSelectors.selectOrderNotifications);
    const activeNotifications = useSelector(orderSelectors.selectActiveOrderNotifications);

    const addNotification = useCallback((notification) => {
        const notificationWithId = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...notification,
            timestamp: new Date().toISOString()
        };
        dispatch(addNotification(notificationWithId));
        return notificationWithId.id;
    }, [dispatch]);

    const removeNotification = useCallback((notificationId) => {
        dispatch(removeNotification(notificationId));
    }, [dispatch]);

    const clearAllNotifications = useCallback(() => {
        dispatch(clearNotifications());
    }, [dispatch]);

    // Стабилизируем функции создания уведомлений
    const addSuccessNotification = useCallback((message, orderId = null) => {
        if (!message || typeof message !== 'string') return null;

        return addNotification({
            type: 'success',
            message,
            orderId,
            autoHide: true,
            duration: 3000
        });
    }, [addNotification]);

    const addErrorNotification = useCallback((message, orderId = null) => {
        if (!message || typeof message !== 'string') return null;

        return addNotification({
            type: 'error',
            message,
            orderId,
            autoHide: true,
            duration: 5000
        });
    }, [addNotification]);

    const addWarningNotification = useCallback((message, orderId = null) => {
        if (!message || typeof message !== 'string') return null;

        return addNotification({
            type: 'warning',
            message,
            orderId,
            autoHide: true,
            duration: 4000
        });
    }, [addNotification]);

    const addInfoNotification = useCallback((message, orderId = null) => {
        if (!message || typeof message !== 'string') return null;

        return addNotification({
            type: 'info',
            message,
            orderId,
            autoHide: true,
            duration: 3000
        });
    }, [addNotification]);

    // Фильтрация уведомлений
    const getNotificationsByType = useCallback((type) => {
        return useSelector(state => orderSelectors.selectOrderNotificationsByType(state, type));
    }, []);

    const getNotificationsByOrderId = useCallback((orderId) => {
        return useSelector(state => orderSelectors.selectOrderNotificationsByOrderId(state, orderId));
    }, []);

    return {
        notifications,
        activeNotifications,
        addNotification,
        removeNotification,
        clearAllNotifications,
        addSuccessNotification,
        addErrorNotification,
        addWarningNotification,
        addInfoNotification,
        getNotificationsByType,
        getNotificationsByOrderId
    };
};

// ===== ХУК ДЛЯ МАССОВЫХ ОПЕРАЦИЙ =====
export const useBulkOrderOperations = () => {
    const dispatch = useDispatch();
    const accessRights = useSelector(orderSelectors.selectOrderAccessRights);
    const isBulkOperating = useSelector(orderSelectors.selectIsBulkOperating);

    const bulkUpdateStatus = useCallback(async (orderIds, status, comment = null) => {
        if (!accessRights.canBulkUpdate) {
            throw new Error('Access denied: Cannot perform bulk updates');
        }

        try {
            const result = await dispatch(bulkUpdateOrders({
                orderIds,
                action: 'updateStatus',
                data: { status, comment }
            })).unwrap();

            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при массовом обновлении статуса' };
        }
    }, [dispatch, accessRights.canBulkUpdate]);

    const bulkAssign = useCallback(async (orderIds, assignedToId, reason = null) => {
        if (!accessRights.canBulkUpdate) {
            throw new Error('Access denied: Cannot perform bulk updates');
        }

        try {
            const result = await dispatch(bulkUpdateOrders({
                orderIds,
                action: 'assign',
                data: { assignedToId, reason }
            })).unwrap();

            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при массовом назначении' };
        }
    }, [dispatch, accessRights.canBulkUpdate]);

    const bulkCancel = useCallback(async (orderIds, reason, refundAmount = null) => {
        if (!accessRights.canBulkUpdate) {
            throw new Error('Access denied: Cannot perform bulk updates');
        }

        try {
            const result = await dispatch(bulkUpdateOrders({
                orderIds,
                action: 'cancel',
                data: { reason, refundAmount }
            })).unwrap();

            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при массовой отмене' };
        }
    }, [dispatch, accessRights.canBulkUpdate]);

    return {
        isBulkOperating,
        bulkUpdateStatus,
        bulkAssign,
        bulkCancel,
        canBulkUpdate: accessRights.canBulkUpdate
    };
};

// ===== ХУК ДЛЯ ЭКСПОРТА =====
export const useOrdersExport = () => {
    const dispatch = useDispatch();
    const accessRights = useSelector(orderSelectors.selectOrderAccessRights);
    const isExporting = useSelector(orderSelectors.selectIsExporting);

    const exportOrders = useCallback(async (exportData) => {
        if (!accessRights.canExportOrders) {
            throw new Error('Access denied: Cannot export orders');
        }

        try {
            const result = await dispatch(exportOrders(exportData)).unwrap();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при экспорте' };
        }
    }, [dispatch, accessRights.canExportOrders]);

    return {
        isExporting,
        exportOrders,
        canExport: accessRights.canExportOrders
    };
};

export default {
    useOrders,
    useOrder,
    useOrdersAutoLoad,
    useOrdersFilter,
    useOrdersAnalytics,
    useOrderNotifications,
    useBulkOrderOperations,
    useOrdersExport
};