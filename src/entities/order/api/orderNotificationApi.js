import { createApiModule } from '@shared/services/ApiClient';

const orderNotificationApi = createApiModule('/api/order-notifications');

export const OrderNotificationApi = {
    // ===== ТЕСТОВЫЕ УВЕДОМЛЕНИЯ =====
    
    // Тестовое уведомление о назначении заказа сотруднику
    testEmployeeAssignment: (data) =>
        orderNotificationApi.post('/test/employee-assignment', {
            orderId: data.orderId,
            employeeUserId: data.employeeUserId,
            assignedBy: data.assignedBy
        }),

    // Тестовое уведомление клиенту об изменении статуса заказа
    testClientStatusChange: (data) =>
        orderNotificationApi.post('/test/client-status-change', {
            orderId: data.orderId,
            clientUserId: data.clientUserId,
            newStatus: data.newStatus,
            oldStatus: data.oldStatus
        }),

    // Тестовое уведомление о взятии заказа в работу
    testEmployeeTaken: (data) =>
        orderNotificationApi.post('/test/employee-taken', {
            orderId: data.orderId,
            employeeUserId: data.employeeUserId
        }),

    // Тестовое уведомление о новом заказе
    testNewOrder: (data) =>
        orderNotificationApi.post('/test/new-order', {
            orderId: data.orderId,
            warehouseId: data.warehouseId
        }),

    // Тестовое уведомление об отмене заказа
    testOrderCancelled: (data) =>
        orderNotificationApi.post('/test/order-cancelled', {
            orderId: data.orderId,
            clientUserId: data.clientUserId,
            employeeUserId: data.employeeUserId,
            reason: data.reason
        }),

    // ===== СТАТИСТИКА =====
    
    // Получить статистику уведомлений
    getStats: () =>
        orderNotificationApi.get('/stats'),

    // ===== РЕАЛЬНЫЕ УВЕДОМЛЕНИЯ (для будущего использования) =====
    
    // Получить уведомления пользователя
    getUserNotifications: (params = {}) => {
        const queryParams = {
            page: params.page || 1,
            limit: params.limit || 20,
            unreadOnly: params.unreadOnly || false,
            type: params.type,
            _t: Date.now()
        };

        const filteredParams = Object.fromEntries(
            Object.entries(queryParams).filter(([key, value]) => value !== undefined)
        );

        return orderNotificationApi.get('/user', filteredParams);
    },

    // Отметить уведомление как прочитанное
    markAsRead: (notificationId) =>
        orderNotificationApi.patch(`/${notificationId}/read`),

    // Отметить все уведомления как прочитанные
    markAllAsRead: () =>
        orderNotificationApi.patch('/mark-all-read'),

    // Получить количество непрочитанных уведомлений
    getUnreadCount: () =>
        orderNotificationApi.get('/unread-count')
};

export default OrderNotificationApi;