import { createProtectedRequest } from '@shared/api/api';

// Основной объект API для администратора
export const adminApi = {
  // Получение списка всех пользователей
  async getAllUsers(options = {}) {
    const { page = 1, limit = 10, search, role, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder
    });
    
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    
    return createProtectedRequest('get', `/api/admin/users?${params}`);
  },

  // Получение списка администраторов
  async getAdmins() {
    return createProtectedRequest('get', '/api/admin/admins');
  },

  // Получение списка персонала (сотрудники, поставщики, водители)
  async getStaff(options = {}) {
    const { page = 1, limit = 10, search, role } = options;
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    
    return createProtectedRequest('get', `/api/admin/staff?${params}`);
  },

  // Создание администратора
  async createAdmin(data) {
    return createProtectedRequest('post', '/api/admin/create-admin', data);
  },

  // Создание сотрудника
  async createStaff(data) {
    return createProtectedRequest('post', '/api/admin/create-staff', data);
  },

  // Изменение роли пользователя
  async changeUserRole(userId, roleData) {
    return createProtectedRequest('patch', `/api/admin/change-role/${userId}`, roleData);
  },

  // Удаление администратора
  async deleteAdmin(adminId) {
    return createProtectedRequest('delete', `/api/admin/admins/${adminId}`);
  },

  // Удаление сотрудника
  async deleteStaff(userId) {
    return createProtectedRequest('delete', `/api/admin/staff/${userId}`);
  },

  // Получение складов для выбора
  async getWarehousesForSelection() {
    return createProtectedRequest('get', '/api/admin/warehouses/selection?includeInactive=true');
  },

  // Получение районов для выбора
  async getDistrictsForSelection() {
    return createProtectedRequest('get', '/api/admin/districts/selection');
  },

  // Получение списка сотрудников с должностями
  async getEmployeesWithProcessingRoles(options = {}) {
    const { page = 1, limit = 10, search, processingRole } = options;
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (search) params.append('search', search);
    if (processingRole) params.append('processingRole', processingRole);
    
    return createProtectedRequest('get', `/api/admin/employees/processing-roles?${params}`);
  },

  // Назначение должности сотруднику
  async assignProcessingRole(employeeId, processingRole) {
    return createProtectedRequest('patch', `/api/admin/employees/${employeeId}/processing-role`, {
      processingRole
    });
  },

  // Получение информации о пользователе по ID
  async getUserById(userId) {
    return createProtectedRequest('get', `/api/users/${userId}`);
  },

  // Удаление пользователя
  async deleteUser(userId) {
    return createProtectedRequest('delete', `/api/admin/staff/${userId}`);
  },

  // ===== МЕТОДЫ ДЛЯ РАБОТЫ С ЗАЯВКАМИ НА ПРИСОЕДИНЕНИЕ =====

  // Получение списка заявок
  async getStaffApplications(options = {}) {
    const { page = 1, limit = 20, status, desiredRole, search } = options;
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (status) params.append('status', status);
    if (desiredRole) params.append('desiredRole', desiredRole);
    if (search) params.append('search', search);
    
    return createProtectedRequest('get', `/api/admin/staff-applications?${params}`);
  },

  // Получение статистики по заявкам
  async getStaffApplicationsStatistics() {
    return createProtectedRequest('get', '/api/admin/staff-applications/statistics');
  },

  // Одобрение заявки
  async approveStaffApplication(applicationId, data) {
    return createProtectedRequest('post', `/api/admin/staff-applications/${applicationId}/approve`, data);
  },

  // Отклонение заявки
  async rejectStaffApplication(applicationId, data) {
    return createProtectedRequest('post', `/api/admin/staff-applications/${applicationId}/reject`, data);
  }
};

// Экспорт с большой буквы для обратной совместимости
export const AdminApi = adminApi;