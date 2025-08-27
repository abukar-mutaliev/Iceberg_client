import { createProtectedRequest } from '@shared/api/api';

export const OrderProcessingApi = {
  // Получение заказов по этапу
  async getOrdersByStage(stage, options = {}) {
    const { page = 1, limit = 20, priority, employeeId } = options;
    const params = new URLSearchParams({
      stage,
      page: page.toString(),
      limit: limit.toString()
    });
    if (priority) params.append('priority', priority);
    if (employeeId) params.append('employeeId', employeeId.toString());
    return createProtectedRequest('get', `/api/processing/orders/by-stage?${params}`);
  },

  // Назначение заказа на этап
  async assignOrderToStage(orderId, stage, employeeId, priority = 'MEDIUM') {
    return createProtectedRequest('post', '/api/processing/orders/assign', {
      orderId,
      stage,
      employeeId,
      priority
    });
  },

  // Обновление статуса этапа
  async updateStageStatus(orderId, stage, status, notes = null) {
    return createProtectedRequest('put', '/api/processing/orders/stage-status', {
      orderId,
      stage,
      status,
      notes
    });
  },

  // Получение статистики по этапам
  async getStageStatistics(date, warehouseId = null) {
    const params = new URLSearchParams({ date });
    if (warehouseId) params.append('warehouseId', warehouseId.toString());
    return createProtectedRequest('get', `/api/processing/statistics/stage?${params}`);
  },

  // Получение доступных сотрудников
  async getAvailableEmployees(stage) {
    return createProtectedRequest('get', `/api/processing/employees/available?stage=${stage}`);
  },

  // Получение загруженности сотрудника
  async getEmployeeWorkload(employeeId, stage) {
    return createProtectedRequest('get', `/api/processing/employees/workload?employeeId=${employeeId}&stage=${stage}`);
  },

  // Получение информации о обработке заказа
  async getOrderProcessingInfo(orderId) {
    return createProtectedRequest('get', `/api/processing/orders/${orderId}/processing-info`);
  },

  // Принудительное завершение этапа
  async forceCompleteStage(stageId, notes = null) {
    return createProtectedRequest('put', `/api/processing/stages/${stageId}/force-complete`, {
      notes
    });
  },

  // Автоматическое переназначение
  async autoReassignOrders() {
    return createProtectedRequest('post', '/api/processing/orders/auto-reassign');
  },

  // Получение статистики производительности
  async getPerformanceStats(startDate, endDate, employeeId = null) {
    const params = new URLSearchParams({
      startDate,
      endDate
    });
    if (employeeId) params.append('employeeId', employeeId.toString());
    return createProtectedRequest('get', `/api/processing/statistics/performance?${params}`);
  },

  // Получение всех этапов обработки
  async getAllProcessingStages(options = {}) {
    const { page = 1, limit = 20, status } = options;
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    if (status) params.append('status', status);
    return createProtectedRequest('get', `/api/processing/stages?${params}`);
  },

  // Переход к следующему этапу
  async moveToNextStage(orderId, currentStage) {
    return createProtectedRequest('post', '/api/processing/orders/move-to-next', {
      orderId,
      currentStage
    });
  },

  // Получение уведомлений обработки
  async getProcessingNotifications(unreadOnly = false) {
    const params = new URLSearchParams();
    if (unreadOnly) params.append('unreadOnly', 'true');
    return createProtectedRequest('get', `/api/processing/notifications?${params}`);
  },

  // Отметка уведомления как прочитанного
  async markNotificationAsRead(notificationId) {
    return createProtectedRequest('put', `/api/processing/notifications/${notificationId}/read`);
  },

  // Отметка всех уведомлений как прочитанных
  async markAllNotificationsAsRead() {
    return createProtectedRequest('put', '/api/processing/notifications/mark-all-read');
  }
}; 