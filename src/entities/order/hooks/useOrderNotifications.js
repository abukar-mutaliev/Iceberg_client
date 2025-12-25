import { useCallback, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { OrderNotificationApi } from '../api/orderNotificationApi';
import { selectUser, selectIsAuthenticated } from '@entities/auth';

export const useOrderNotifications = () => {
    const user = useSelector(selectUser);
    const isAuthenticated = useSelector(selectIsAuthenticated);
    
    // Локальное состояние
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ===== ТЕСТОВЫЕ ФУНКЦИИ =====

    const testEmployeeAssignment = useCallback(async (data) => {
        try {
            setError(null);
            const response = await OrderNotificationApi.testEmployeeAssignment(data);
            return { success: true, data: response.data };
        } catch (error) {
            const errorMessage = error.message || 'Ошибка отправки тестового уведомления о назначении';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }, []);

    const testClientStatusChange = useCallback(async (data) => {
        try {
            setError(null);
            const response = await OrderNotificationApi.testClientStatusChange(data);
            return { success: true, data: response.data };
        } catch (error) {
            const errorMessage = error.message || 'Ошибка отправки тестового уведомления об изменении статуса';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }, []);

    const testEmployeeTaken = useCallback(async (data) => {
        try {
            setError(null);
            const response = await OrderNotificationApi.testEmployeeTaken(data);
            return { success: true, data: response.data };
        } catch (error) {
            const errorMessage = error.message || 'Ошибка отправки тестового уведомления о взятии заказа';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }, []);

    const testNewOrder = useCallback(async (data) => {
        try {
            setError(null);
            const response = await OrderNotificationApi.testNewOrder(data);
            return { success: true, data: response.data };
        } catch (error) {
            const errorMessage = error.message || 'Ошибка отправки тестового уведомления о новом заказе';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }, []);

    const testOrderCancelled = useCallback(async (data) => {
        try {
            setError(null);
            const response = await OrderNotificationApi.testOrderCancelled(data);
            return { success: true, data: response.data };
        } catch (error) {
            const errorMessage = error.message || 'Ошибка отправки тестового уведомления об отмене заказа';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }, []);

    // ===== РЕАЛЬНЫЕ ФУНКЦИИ =====

    const loadNotifications = useCallback(async (params = {}) => {
        if (!isAuthenticated) {
            setError('Пользователь не авторизован');
            return { success: false, error: 'Пользователь не авторизован' };
        }

        try {
            setLoading(true);
            setError(null);
            
            const response = await OrderNotificationApi.getUserNotifications(params);
            const notificationsData = response.data.notifications || [];
            
            setNotifications(notificationsData);
            return { success: true, data: notificationsData };
        } catch (error) {
            const errorMessage = error.message || 'Ошибка загрузки уведомлений';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const markAsRead = useCallback(async (notificationId) => {
        try {
            setError(null);
            
            await OrderNotificationApi.markAsRead(notificationId);
            
            // Обновляем локальное состояние
            setNotifications(prev => 
                prev.map(notification => 
                    notification.id === notificationId 
                        ? { ...notification, isRead: true }
                        : notification
                )
            );
            
            // Уменьшаем счетчик непрочитанных
            setUnreadCount(prev => Math.max(0, prev - 1));
            
            return { success: true };
        } catch (error) {
            const errorMessage = error.message || 'Ошибка отметки уведомления';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            setError(null);
            
            await OrderNotificationApi.markAllAsRead();
            
            // Обновляем локальное состояние
            setNotifications(prev => 
                prev.map(notification => ({ ...notification, isRead: true }))
            );
            
            // Сбрасываем счетчик непрочитанных
            setUnreadCount(0);
            
            return { success: true };
        } catch (error) {
            const errorMessage = error.message || 'Ошибка отметки всех уведомлений';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }, []);

    const loadUnreadCount = useCallback(async () => {
        if (!isAuthenticated) return { success: false, error: 'Пользователь не авторизован' };

        try {
            setError(null);
            
            const response = await OrderNotificationApi.getUnreadCount();
            const count = response.data.count || 0;
            
            setUnreadCount(count);
            return { success: true, data: count };
        } catch (error) {
            const errorMessage = error.message || 'Ошибка получения количества уведомлений';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }, [isAuthenticated]);

    const getStats = useCallback(async () => {
        try {
            setError(null);
            const response = await OrderNotificationApi.getStats();
            return { success: true, data: response.data };
        } catch (error) {
            const errorMessage = error.message || 'Ошибка получения статистики уведомлений';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }, []);

    // ===== УТИЛИТАРНЫЕ ФУНКЦИИ =====

    const getNotificationsByType = useCallback((type) => {
        return notifications.filter(notification => notification.type === type);
    }, [notifications]);

    const getNotificationsByOrderId = useCallback((orderId) => {
        return notifications.filter(notification => notification.orderId === orderId);
    }, [notifications]);

    const getUnreadNotifications = useCallback(() => {
        return notifications.filter(notification => !notification.isRead);
    }, [notifications]);

    const getReadNotifications = useCallback(() => {
        return notifications.filter(notification => notification.isRead);
    }, [notifications]);

    // ===== АВТОМАТИЧЕСКАЯ ЗАГРУЗКА =====

    useEffect(() => {
        if (isAuthenticated && user?.id) {
            loadUnreadCount();
        }
    }, [isAuthenticated, user?.id, loadUnreadCount]);

    // Обновляем счетчик при изменении уведомлений
    useEffect(() => {
        const unread = notifications.filter(notification => !notification.isRead).length;
        setUnreadCount(unread);
    }, [notifications]);

    return {
        // Данные
        notifications,
        unreadCount,
        
        // Состояние
        loading,
        error,
        
        // Тестовые функции
        testEmployeeAssignment,
        testClientStatusChange,
        testEmployeeTaken,
        testNewOrder,
        testOrderCancelled,
        
        // Основные функции
        loadNotifications,
        markAsRead,
        markAllAsRead,
        loadUnreadCount,
        getStats,
        
        // Утилитарные функции
        getNotificationsByType,
        getNotificationsByOrderId,
        getUnreadNotifications,
        getReadNotifications
    };
};

export default useOrderNotifications;