import { api } from '../../../shared/api/api';

export const ProcessingNotificationApi = {
  // Получение уведомлений сотрудника
  async getEmployeeNotifications(unreadOnly = false) {
    const params = new URLSearchParams();
    if (unreadOnly) {
      params.append('unreadOnly', 'true');
    }
    
    return api.get(`/api/processing/notifications/employee?${params}`);
  },

  // Отметка уведомления как прочитанного
  async markAsRead(notificationId) {
    return api.put(`/api/processing/notifications/${notificationId}/mark-read`);
  },

  // Отметка всех уведомлений как прочитанных
  async markAllAsRead() {
    return api.put('/api/processing/notifications/mark-all-read');
  },

  // Получение количества непрочитанных уведомлений
  async getUnreadCount() {
    return api.get('/api/processing/notifications/unread-count');
  },

  // Обновление настроек уведомлений
  async updateNotificationSettings(settings) {
    return api.put('/api/processing/notifications/settings', settings);
  },

  // Получение настроек уведомлений
  async getNotificationSettings() {
    return api.get('/api/processing/notifications/settings');
  },

  // Получение уведомлений по типу
  async getNotificationsByType(type, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const params = new URLSearchParams({
      type,
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (unreadOnly) {
      params.append('unreadOnly', 'true');
    }
    
    return api.get(`/api/processing/notifications/by-type?${params}`);
  },

  // Получение уведомлений для конкретного заказа
  async getNotificationsByOrderId(orderId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const params = new URLSearchParams({
      orderId: orderId.toString(),
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (unreadOnly) {
      params.append('unreadOnly', 'true');
    }
    
    return api.get(`/api/processing/notifications/by-order?${params}`);
  },

  // Получение уведомлений по этапу
  async getNotificationsByStage(stage, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const params = new URLSearchParams({
      stage,
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (unreadOnly) {
      params.append('unreadOnly', 'true');
    }
    
    return api.get(`/api/processing/notifications/by-stage?${params}`);
  },

  // Получение уведомлений по дате
  async getNotificationsByDate(date, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const params = new URLSearchParams({
      date,
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (unreadOnly) {
      params.append('unreadOnly', 'true');
    }
    
    return api.get(`/api/processing/notifications/by-date?${params}`);
  },

  // Получение уведомлений с высоким приоритетом
  async getHighPriorityNotifications(options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const params = new URLSearchParams({
      priority: 'HIGH,URGENT',
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (unreadOnly) {
      params.append('unreadOnly', 'true');
    }
    
    return api.get(`/api/processing/notifications/by-priority?${params}`);
  },

  // Получение уведомлений о задержках
  async getDelayNotifications(options = {}) {
    const { page = 1, limit = 20, stage, employeeId, date } = options;
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (stage) params.append('stage', stage);
    if (employeeId) params.append('employeeId', employeeId.toString());
    if (date) params.append('date', date);
    
    return api.get(`/api/processing/notifications/delays?${params}`);
  },

  // Получение статистики уведомлений
  async getNotificationStatistics(options = {}) {
    const { startDate, endDate, employeeId, stage, type } = options;
    const params = new URLSearchParams();
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (employeeId) params.append('employeeId', employeeId.toString());
    if (stage) params.append('stage', stage);
    if (type) params.append('type', type);
    
    return api.get(`/api/processing/notifications/statistics?${params}`);
  },

  // Создание ручного уведомления
  async createManualNotification(notificationData) {
    return api.post('/api/processing/notifications/manual', notificationData);
  },

  // Удаление уведомления
  async deleteNotification(notificationId) {
    return api.delete(`/api/processing/notifications/${notificationId}`);
  },

  // Получение уведомлений в реальном времени (WebSocket)
  async getRealtimeNotifications() {
    return api.get('/api/processing/notifications/stream');
  },

  // Подписка на push-уведомления
  async subscribeToPushNotifications(deviceToken, settings = {}) {
    return api.post('/api/processing/notifications/push/subscribe', {
      deviceToken,
      settings
    });
  },

  // Отписка от push-уведомлений
  async unsubscribeFromPushNotifications(deviceToken) {
    return api.post('/api/processing/notifications/push/unsubscribe', {
      deviceToken
    });
  },

  // Получение истории уведомлений
  async getNotificationHistory(options = {}) {
    const { 
      startDate, 
      endDate, 
      employeeId, 
      stage, 
      type,
      page = 1,
      limit = 50
    } = options;
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (employeeId) params.append('employeeId', employeeId.toString());
    if (stage) params.append('stage', stage);
    if (type) params.append('type', type);
    
    return api.get(`/api/processing/notifications/history?${params}`);
  },

  // Экспорт уведомлений
  async exportNotifications(options = {}) {
    const { 
      startDate, 
      endDate, 
      employeeId, 
      stage, 
      type,
      format = 'csv'
    } = options;
    
    const params = new URLSearchParams({
      format
    });
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (employeeId) params.append('employeeId', employeeId.toString());
    if (stage) params.append('stage', stage);
    if (type) params.append('type', type);
    
    return api.get(`/api/processing/notifications/export?${params}`, {
      responseType: 'blob'
    });
  },

  // Получение уведомлений для мобильного приложения
  async getMobileNotifications(options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      unreadOnly = false,
      includeRead = true
    } = options;
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      includeRead: includeRead.toString()
    });
    
    if (unreadOnly) {
      params.append('unreadOnly', 'true');
    }
    
    return api.get(`/api/processing/notifications/mobile?${params}`);
  },

  // Получение уведомлений для конкретного сотрудника
  async getEmployeeSpecificNotifications(employeeId, options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      unreadOnly = false,
      stage,
      type
    } = options;
    
    const params = new URLSearchParams({
      employeeId: employeeId.toString(),
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (unreadOnly) {
      params.append('unreadOnly', 'true');
    }
    if (stage) {
      params.append('stage', stage);
    }
    if (type) {
      params.append('type', type);
    }
    
    return api.get(`/api/processing/notifications/employee-specific?${params}`);
  },

  // Получение уведомлений для склада
  async getWarehouseNotifications(warehouseId, options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      unreadOnly = false,
      stage,
      type
    } = options;
    
    const params = new URLSearchParams({
      warehouseId: warehouseId.toString(),
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (unreadOnly) {
      params.append('unreadOnly', 'true');
    }
    if (stage) {
      params.append('stage', stage);
    }
    if (type) {
      params.append('type', type);
    }
    
    return api.get(`/api/processing/notifications/warehouse?${params}`);
  }
}; 