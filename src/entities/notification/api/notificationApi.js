import { createProtectedRequest } from '@shared/api/api';

export const notificationApi = {
    /**
     * Получить все уведомления пользователя
     * @param {Object} params - Параметры запроса
     * @param {number} params.page - Номер страницы
     * @param {number} params.limit - Количество элементов на странице
     * @param {string} params.type - Тип уведомлений (SYSTEM, ORDER_STATUS, etc.)
     * @param {boolean} params.unreadOnly - Только непрочитанные
     * @param {number} params.stopId - Фильтр по ID остановки
     * @param {number} params.orderId - Фильтр по ID заказа
     * @param {boolean} params.includeData - Включать связанные данные
     */
    getAllNotifications: async (params = {}) => {
        try {
            console.log('📡 Fetching notifications with params:', params);

            const response = await createProtectedRequest('get', '/api/notifications', params);

            if (!response || !response.data) {
                throw new Error('Получен некорректный ответ от сервера');
            }

            // Логируем полученные данные для отладки
            console.log('✅ Notifications response:', {
                status: response.data.status,
                dataLength: response.data.data?.length,
                hasNavData: response.data.data?.some(n => n.stopId || n.orderId || n.productId),
                pagination: response.data.pagination
            });

            return response;
        } catch (error) {
            console.error('❌ Error in getAllNotifications API call:', error);
            throw error;
        }
    },

    /**
     * Получить количество непрочитанных уведомлений
     */
    getUnreadCount: async () => {
        try {
            const response = await createProtectedRequest('get', '/api/notifications/unread-count');
            return response;
        } catch (error) {
            console.error('❌ Error in getUnreadCount API call:', error);
            throw error;
        }
    },

    /**
     * Отметить уведомление как прочитанное
     * @param {number} notificationId - ID уведомления
     */
    markAsRead: async (notificationId) => {
        try {
            const response = await createProtectedRequest('put', `/api/notifications/${notificationId}/read`);
            return response;
        } catch (error) {
            console.error(`Error in markAsRead(${notificationId}) API call:`, error);
            throw error;
        }
    },

    /**
     * Отметить все уведомления как прочитанные
     */
    markAllAsRead: async () => {
        try {
            const response = await createProtectedRequest('put', '/api/notifications/mark-all-read');
            return response;
        } catch (error) {
            console.error('Error in markAllAsRead API call:', error);
            throw error;
        }
    },

    /**
     * Удалить уведомление
     * @param {number} notificationId - ID уведомления
     */
    deleteNotification: async (notificationId) => {
        try {
            const response = await createProtectedRequest('delete', `/api/notifications/${notificationId}`);
            return response;
        } catch (error) {
            console.error(`Error in deleteNotification(${notificationId}) API call:`, error);
            throw error;
        }
    },

    /**
     * Удалить все прочитанные уведомления
     */
    deleteAllRead: async () => {
        try {
            const response = await createProtectedRequest('delete', '/api/notifications/read');
            return response;
        } catch (error) {
            console.error('Error in deleteAllRead API call:', error);
            throw error;
        }
    },

    /**
     * Получить уведомления по типу
     * @param {string} type - Тип уведомлений
     */
    getNotificationsByType: async (type) => {
        try {
            const response = await createProtectedRequest('get', `/api/notifications/type/${type}`);
            return response;
        } catch (error) {
            console.error(`Error in getNotificationsByType(${type}) API call:`, error);
            throw error;
        }
    },

    /**
     * НОВЫЙ: Получить уведомления об остановке
     * @param {number} stopId - ID остановки
     */
    getStopNotifications: async (stopId) => {
        try {
            console.log('📡 Fetching stop notifications for stopId:', stopId);
            const response = await createProtectedRequest('get', `/api/notifications/stops/${stopId}`);
            return response;
        } catch (error) {
            console.error(`Error in getStopNotifications(${stopId}) API call:`, error);
            throw error;
        }
    },

    /**
     * НОВЫЙ: Получить уведомления о заказе
     * @param {number} orderId - ID заказа
     */
    getOrderNotifications: async (orderId) => {
        try {
            console.log('📡 Fetching order notifications for orderId:', orderId);
            const response = await createProtectedRequest('get', `/api/notifications/orders/${orderId}`);
            return response;
        } catch (error) {
            console.error(`Error in getOrderNotifications(${orderId}) API call:`, error);
            throw error;
        }
    },

    /**
     * НОВЫЙ: Массовые операции с уведомлениями
     * @param {Object} data - Данные для массовой операции
     * @param {number[]} data.notificationIds - Массив ID уведомлений
     * @param {string} data.action - Действие (markAsRead, markAsUnread, delete)
     */
    bulkOperations: async (data) => {
        try {
            console.log('📡 Performing bulk operation:', data);
            const response = await createProtectedRequest('post', '/api/notifications/bulk', data);
            return response;
        } catch (error) {
            console.error('Error in bulkOperations API call:', error);
            throw error;
        }
    },

    /**
     * НОВЫЙ: Создать уведомление (для админов)
     * @param {Object} data - Данные уведомления
     */
    createNotification: async (data) => {
        try {
            console.log('📡 Creating notification:', {
                title: data.title,
                type: data.type,
                hasStopId: !!data.stopId,
                hasOrderId: !!data.orderId,
                hasData: !!data.data
            });
            const response = await createProtectedRequest('post', '/api/notifications', data);
            return response;
        } catch (error) {
            console.error('Error in createNotification API call:', error);
            throw error;
        }
    }
};

export default notificationApi;