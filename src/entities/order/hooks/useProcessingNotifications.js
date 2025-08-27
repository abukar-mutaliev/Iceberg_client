import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ProcessingNotificationApi } from '../api/processingNotificationApi';
import { PROCESSING_NOTIFICATION_TYPES } from '../lib/constants';

export const useProcessingNotifications = () => {
  const dispatch = useDispatch();
  const employee = useSelector(state => state.auth?.user?.employee);
  
  // Локальное состояние для уведомлений
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Получение уведомлений сотрудника
  const loadNotifications = useCallback(async (unreadOnly = false) => {
    if (!employee?.id) {
      setError('Employee not found');
      return { success: false, error: 'Employee not found' };
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await ProcessingNotificationApi.getEmployeeNotifications(unreadOnly);
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
  }, [employee?.id]);

  // Отметка уведомления как прочитанного
  const markAsRead = useCallback(async (notificationId) => {
    try {
      setError(null);
      
      await ProcessingNotificationApi.markAsRead(notificationId);
      
      // Обновляем локальное состояние
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
      
      // Обновляем счетчик непрочитанных
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.message || 'Ошибка отметки уведомления';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Отметка всех уведомлений как прочитанных
  const markAllAsRead = useCallback(async () => {
    try {
      setError(null);
      
      await ProcessingNotificationApi.markAllAsRead();
      
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

  // Получение количества непрочитанных уведомлений
  const getUnreadCount = useCallback(async () => {
    try {
      setError(null);
      
      const response = await ProcessingNotificationApi.getUnreadCount();
      const count = response.data.count || 0;
      
      setUnreadCount(count);
      return { success: true, data: count };
    } catch (error) {
      const errorMessage = error.message || 'Ошибка получения количества уведомлений';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Фильтрация уведомлений по типу
  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(notification => notification.type === type);
  }, [notifications]);

  // Получение уведомлений для конкретного заказа
  const getNotificationsByOrderId = useCallback((orderId) => {
    return notifications.filter(notification => notification.orderId === orderId);
  }, [notifications]);

  // Получение уведомлений о задержках
  const getDelayNotifications = useCallback(() => {
    return notifications.filter(notification => 
      notification.type === PROCESSING_NOTIFICATION_TYPES.ORDER_DELAYED
    );
  }, [notifications]);

  // Получение уведомлений о назначениях
  const getAssignmentNotifications = useCallback(() => {
    return notifications.filter(notification => 
      notification.type === PROCESSING_NOTIFICATION_TYPES.ORDER_ASSIGNMENT
    );
  }, [notifications]);

  // Получение уведомлений о завершении этапов
  const getCompletionNotifications = useCallback(() => {
    return notifications.filter(notification => 
      notification.type === PROCESSING_NOTIFICATION_TYPES.STAGE_COMPLETION
    );
  }, [notifications]);

  // Получение уведомлений о начале этапов
  const getStartedNotifications = useCallback(() => {
    return notifications.filter(notification => 
      notification.type === PROCESSING_NOTIFICATION_TYPES.STAGE_STARTED
    );
  }, [notifications]);

  // Получение ручных уведомлений
  const getManualNotifications = useCallback(() => {
    return notifications.filter(notification => 
      notification.type === PROCESSING_NOTIFICATION_TYPES.MANUAL
    );
  }, [notifications]);

  // Получение непрочитанных уведомлений
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(notification => !notification.isRead);
  }, [notifications]);

  // Получение прочитанных уведомлений
  const getReadNotifications = useCallback(() => {
    return notifications.filter(notification => notification.isRead);
  }, [notifications]);

  // Фильтрация уведомлений по дате
  const getNotificationsByDate = useCallback((date) => {
    const targetDate = new Date(date);
    return notifications.filter(notification => {
      const notificationDate = new Date(notification.createdAt);
      return notificationDate.toDateString() === targetDate.toDateString();
    });
  }, [notifications]);

  // Фильтрация уведомлений по этапу
  const getNotificationsByStage = useCallback((stage) => {
    return notifications.filter(notification => notification.stage === stage);
  }, [notifications]);

  // Получение уведомлений за последние N дней
  const getNotificationsByDays = useCallback((days) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return notifications.filter(notification => {
      const notificationDate = new Date(notification.createdAt);
      return notificationDate >= cutoffDate;
    });
  }, [notifications]);

  // Получение уведомлений с высоким приоритетом
  const getHighPriorityNotifications = useCallback(() => {
    return notifications.filter(notification => 
      notification.priority === 'HIGH' || notification.priority === 'URGENT'
    );
  }, [notifications]);

  // Получение уведомлений с задержками
  const getDelayedNotifications = useCallback(() => {
    return notifications.filter(notification => 
      notification.isDelayed || notification.type === PROCESSING_NOTIFICATION_TYPES.ORDER_DELAYED
    );
  }, [notifications]);

  // Сортировка уведомлений по дате (новые сначала)
  const getSortedNotifications = useCallback(() => {
    return [...notifications].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [notifications]);

  // Сортировка уведомлений по приоритету
  const getNotificationsByPriority = useCallback(() => {
    const priorityOrder = {
      'URGENT': 1,
      'HIGH': 2,
      'MEDIUM': 3,
      'LOW': 4
    };
    
    return [...notifications].sort((a, b) => {
      const priorityA = priorityOrder[a.priority] || 5;
      const priorityB = priorityOrder[b.priority] || 5;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Если приоритеты одинаковые, сортируем по дате
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [notifications]);

  // Получение статистики уведомлений
  const getNotificationStats = useCallback(() => {
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      read: notifications.filter(n => n.isRead).length,
      byType: {},
      byPriority: {},
      byStage: {}
    };

    // Статистика по типам
    notifications.forEach(notification => {
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
      if (notification.stage) {
        stats.byStage[notification.stage] = (stats.byStage[notification.stage] || 0) + 1;
      }
    });

    return stats;
  }, [notifications]);

  // Автоматическая загрузка уведомлений при монтировании
  useEffect(() => {
    if (employee?.id) {
      loadNotifications();
      getUnreadCount();
    }
  }, [employee?.id, loadNotifications, getUnreadCount]);

  // Обновление счетчика непрочитанных при изменении уведомлений
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
    
    // Основные функции
    loadNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    
    // Функции фильтрации
    getNotificationsByType,
    getNotificationsByOrderId,
    getDelayNotifications,
    getAssignmentNotifications,
    getCompletionNotifications,
    getStartedNotifications,
    getManualNotifications,
    getUnreadNotifications,
    getReadNotifications,
    getNotificationsByDate,
    getNotificationsByStage,
    getNotificationsByDays,
    getHighPriorityNotifications,
    getDelayedNotifications,
    
    // Функции сортировки
    getSortedNotifications,
    getNotificationsByPriority,
    
    // Статистика
    getNotificationStats
  };
}; 