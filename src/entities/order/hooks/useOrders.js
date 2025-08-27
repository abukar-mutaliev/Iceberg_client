import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { downloadPDFFile } from '../../../shared/lib/fileUtils';
import {
    fetchMyOrders,
    fetchStaffOrders,
    fetchOrderDetails,
    fetchOrdersStats,
    updateOrderStatus,
    assignOrder,
    takeOrder as takeOrderThunk,
    completeOrderStage,
    cancelOrder,
    createOrderForClient,
    bulkUpdateOrders,
    exportOrders,
    pickupOrder,
    fetchAvailableOrdersForPickup,
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

import {
    selectMyOrders,
    selectStaffOrders,
    selectOrderDetails,
    selectOrdersStats,
    selectOrdersUIState,
    selectOrderOperations,
    selectStaffOrdersFilters,
    selectOrdersPreferences,
    selectOrderNotifications,
    selectActiveOrderNotifications,
    selectOrderAccessRights,
    selectOrderById,
    selectOrderDetailsFormatted,
    selectIsOrderLoading,
    selectFilteredMyOrders,
    selectFilteredStaffOrders,
    selectSortedOrders,
    selectOrdersStatsFormatted,
    selectOrdersDashboardData,
    selectOrdersStatsLoading,
    selectMyOrdersStats,
    selectStaffOrdersStats,
    selectOrdersAnalytics,
    selectOrderNotificationsByType,
    selectOrderNotificationsByOrderId,
    selectIsBulkOperating,
    selectIsExporting
} from '../model/selectors';
import { OrderApi } from '../api';
import {
    getStatusLabel,
    getStatusColor,
    formatOrderNumber,
    canCancelOrder as canCancelOrderUtil,
    canLeaveReview as canLeaveReviewUtil,
    getAvailableStatuses,
    calculateEstimatedDelivery
} from '../lib/utils';

// ===== ОСНОВНОЙ ХУК ДЛЯ РАБОТЫ С ЗАКАЗАМИ =====
export const useOrders = () => {
    const dispatch = useDispatch();
    const userRole = useSelector(state => state.auth?.user?.role);
    const accessRights = useSelector(selectOrderAccessRights);

    // Основные данные
    const myOrders = useSelector(selectMyOrders);
    const staffOrders = useSelector(selectStaffOrders);
    const orderDetails = useSelector(selectOrderDetails);
    const stats = useSelector(selectOrdersStats);
    const availableOrders = useSelector(state => state.order?.availableOrders || { data: [], loading: false, error: null });

    // Состояния загрузки
    const loading = useSelector(selectOrdersUIState);
    const operations = useSelector(selectOrderOperations);

    // Фильтры и настройки
    const staffFilters = useSelector(selectStaffOrdersFilters);
    const preferences = useSelector(selectOrdersPreferences);

    // Уведомления
    const notifications = useSelector(selectOrderNotifications);
    const activeNotifications = useSelector(selectActiveOrderNotifications);

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

    const takeOrder = useCallback(async (orderId, reason = null) => {
        if (!accessRights.canAssignOrders) {
            throw new Error('Access denied: Cannot take orders');
        }

        try {
            const result = await dispatch(takeOrderThunk({ orderId, reason })).unwrap();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при взятии заказа в работу' };
        }
    }, [dispatch, accessRights.canAssignOrders]);

    const completeOrderStageAction = useCallback(async (orderId, comment = null) => {
        if (!accessRights.canUpdateOrderStatus) {
            throw new Error('Access denied: Cannot complete order stage');
        }

        try {
            const result = await dispatch(completeOrderStage({ orderId, comment })).unwrap();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при завершении этапа заказа' };
        }
    }, [dispatch, accessRights.canUpdateOrderStatus]);

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

    const pickupOrderFromNearby = useCallback(async (orderId, pickupData) => {
        if (!accessRights.canAssignOrders) {
            throw new Error('Access denied: Cannot pickup orders');
        }

        try {
            const result = await dispatch(pickupOrder({ orderId, pickupData })).unwrap();
            return { success: true, data: result };
        } catch (error) {
            return { success: false, error: error.message || 'Ошибка при принятии заказа' };
        }
    }, [dispatch, accessRights.canAssignOrders]);

    const loadAvailableOrders = useCallback((params = {}) => {
        if (!accessRights.canViewStaffOrders) {
            console.warn('Access denied: Cannot view available orders');
            return Promise.reject(new Error('Access denied'));
        }
        return dispatch(fetchAvailableOrdersForPickup(params));
    }, [dispatch, accessRights.canViewStaffOrders]);

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

    const downloadInvoice = useCallback(async (orderId) => {
        if (!accessRights.canViewStaffOrders) {
            throw new Error('Access denied: Cannot download invoice');
        }

        try {
            console.log('Начинаем скачивание накладной для заказа:', orderId);
            
            // Сначала пробуем альтернативный метод с fetch API
            let response;
            try {
                console.log('Пробуем downloadInvoiceDirect...');
                response = await OrderApi.downloadInvoiceDirect(orderId);
            } catch (directError) {
                console.warn('downloadInvoiceDirect не сработал, пробуем обычный метод:', directError.message);
                // Fallback к обычному методу
                response = await OrderApi.downloadInvoice(orderId);
            }
            
            const filename = `nakladnaya_zakaz_${orderId}_${new Date().toISOString().split('T')[0]}.pdf`;
            
            console.log('Получен ответ от API, тип:', typeof response, 'является Blob:', response instanceof Blob);
            
            if (!(response instanceof Blob)) {
                throw new Error('Ответ сервера не является PDF файлом');
            }
            
            console.log('Размер Blob:', response.size, 'байт');
            
            // Обрабатываем скачивание файла напрямую
            await downloadPDFFile(response, filename);
            
            return { success: true, filename };
        } catch (error) {
            console.error('Ошибка при скачивании накладной:', error);
            return { success: false, error: error.message || 'Ошибка при скачивании накладной' };
        }
    }, [accessRights.canViewStaffOrders]);

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
        availableOrders,

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
        loadAvailableOrders,

        // Управление заказами
        updateStatus,
        assignOrderToEmployee,
        takeOrder,
        completeOrderStage: completeOrderStageAction,
        cancelOrderById,
        createOrder,
        pickupOrderFromNearby,

        // Массовые операции
        bulkUpdate,
        exportOrdersData,
        downloadInvoice,

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
    const order = useSelector(state => selectOrderById(state, orderId));
    const orderDetails = useSelector(selectOrderDetailsFormatted);
    const isLoading = useSelector(state => selectIsOrderLoading(state, orderId));
    const accessRights = useSelector(selectOrderAccessRights);

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
            statusLabel: getStatusLabel(currentOrder.status),
            statusColor: getStatusColor(currentOrder.status),
            formattedOrderNumber: formatOrderNumber(currentOrder.orderNumber),
            canCancel: canCancelOrderUtil(currentOrder.status, accessRights.canCancelMyOrders ? 'CLIENT' : 'STAFF'),
            canLeaveReview: canLeaveReviewUtil(currentOrder.status),
            availableStatuses: getAvailableStatuses(currentOrder.status),
            estimatedDelivery: currentOrder.expectedDeliveryDate
                ? new Date(currentOrder.expectedDeliveryDate)
                : calculateEstimatedDelivery(currentOrder),
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
    const accessRights = useSelector(selectOrderAccessRights);
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
    const myOrders = useSelector(selectMyOrders);
    const staffOrders = useSelector(selectStaffOrders);
    const currentFilters = useSelector(selectStaffOrdersFilters);

    // Прямые функции фильтрации без неправильного использования хуков
    const filterMyOrders = useCallback((filters) => {
        if (!filters || Object.keys(filters).length === 0) return myOrders;
        
        return myOrders.filter(order => {
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
    }, [myOrders]);

    const filterStaffOrders = useCallback((filters = null) => {
        const filtersToUse = filters || currentFilters;
        if (!filtersToUse || Object.keys(filtersToUse).length === 0) return staffOrders;
        
        return staffOrders.filter(order => {
            if (filtersToUse.status && order.status !== filtersToUse.status) return false;
            if (filtersToUse.warehouseId && order.warehouseId !== filtersToUse.warehouseId) return false;
            if (filtersToUse.districtId && order.client?.districtId !== filtersToUse.districtId) return false;
            if (filtersToUse.assignedToMe && !order.assignedToMe) return false;
            if (filtersToUse.priority && !isPriorityOrder(order)) return false;
            return true;
        });
    }, [staffOrders, currentFilters]);

    const sortOrders = useCallback((orders, sortBy = 'createdAt', sortOrder = 'desc') => {
        if (!Array.isArray(orders)) return [];
        
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
                getStatusLabel(order.status)
            ].filter(Boolean).join(' ').toLowerCase();

            return searchableText.includes(searchLower);
        });
    }, []);

    // Утилитарная функция для проверки приоритетности заказа
    const isPriorityOrder = useCallback((order) => {
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
    const stats = useSelector(selectOrdersStatsFormatted);
    const myOrders = useSelector(selectMyOrders);
    const staffOrders = useSelector(selectStaffOrders);
    const dashboardData = useSelector(selectOrdersDashboardData);
    const loading = useSelector(selectOrdersStatsLoading);

    const loadStats = useCallback((params = {}) => {
        return dispatch(fetchOrdersStats(params));
    }, [dispatch]);

    const myOrdersAnalytics = useSelector(selectMyOrdersStats);
    const staffOrdersAnalytics = useSelector(selectStaffOrdersStats);

    const getMyOrdersAnalytics = useCallback(() => {
        return myOrdersAnalytics;
    }, [myOrdersAnalytics]);

    const getStaffOrdersAnalytics = useCallback(() => {
        return staffOrdersAnalytics;
    }, [staffOrdersAnalytics]);

    const getOrdersAnalytics = useCallback((orders) => {
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
    const notifications = useSelector(selectOrderNotifications);
    const activeNotifications = useSelector(selectActiveOrderNotifications);

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
        return notifications.filter(notification => notification.type === type);
    }, [notifications]);

    const getNotificationsByOrderId = useCallback((orderId) => {
        return notifications.filter(notification => notification.orderId === orderId);
    }, [notifications]);

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
    const accessRights = useSelector(selectOrderAccessRights);
    const isBulkOperating = useSelector(selectIsBulkOperating);

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
    const accessRights = useSelector(selectOrderAccessRights);
    const isExporting = useSelector(selectIsExporting);

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
    useOrder: useOrders,
    useOrdersAutoLoad,
    useOrdersFilter,
    useOrdersAnalytics,
    useOrderNotifications,
    useBulkOrderOperations,
    useOrdersExport
};