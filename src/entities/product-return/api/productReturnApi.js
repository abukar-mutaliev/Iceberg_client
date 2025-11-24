/**
 * API клиент для работы с возвратами товаров
 * @module product-return/api/productReturnApi
 */

import { api } from '@shared/api/api';

/**
 * API клиент для работы с возвратами товаров
 */
class ProductReturnApi {
  constructor() {
    this.baseUrl = '/api/product-returns';
  }

  /**
   * Получить список залежавшихся товаров
   * @param {Object} [filters={}] - Фильтры
   * @param {number} [filters.daysThreshold] - Минимум дней без продаж
   * @param {number} [filters.warehouseId] - ID склада
   * @param {number} [filters.supplierId] - ID поставщика
   * @param {string} [filters.urgencyLevel] - Уровень срочности
   * @param {string} [filters.sortBy] - Поле для сортировки
   * @param {string} [filters.sortOrder] - Порядок сортировки
   * @returns {Promise<Array>} Список залежавшихся товаров
   */
  async getStagnantProducts(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.daysThreshold) {
      params.append('daysThreshold', filters.daysThreshold.toString());
    }
    if (filters.warehouseId) {
      params.append('warehouseId', filters.warehouseId.toString());
    }
    if (filters.supplierId) {
      params.append('supplierId', filters.supplierId.toString());
    }
    if (filters.urgencyLevel) {
      params.append('urgencyLevel', filters.urgencyLevel);
    }
    if (filters.sortBy) {
      params.append('sortBy', filters.sortBy);
    }
    if (filters.sortOrder) {
      params.append('sortOrder', filters.sortOrder);
    }

    const response = await api.get(
      `${this.baseUrl}/stagnant?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Получить список возвратов
   * @param {Object} [filters={}] - Фильтры
   * @param {string|string[]} [filters.status] - Статус или массив статусов
   * @param {number} [filters.warehouseId] - ID склада
   * @param {number} [filters.supplierId] - ID поставщика
   * @param {string} [filters.dateFrom] - Дата от (ISO)
   * @param {string} [filters.dateTo] - Дата до (ISO)
   * @param {string} [filters.sortBy] - Поле для сортировки
   * @param {string} [filters.sortOrder] - Порядок сортировки
   * @param {number} [filters.page] - Номер страницы
   * @param {number} [filters.limit] - Размер страницы
   * @returns {Promise<{returns: Array, pagination: Object}>} Список возвратов с пагинацией
   */
  async getReturns(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        filters.status.forEach(s => params.append('status[]', s));
      } else {
        params.append('status', filters.status);
      }
    }
    if (filters.warehouseId) {
      params.append('warehouseId', filters.warehouseId.toString());
    }
    if (filters.supplierId) {
      params.append('supplierId', filters.supplierId.toString());
    }
    if (filters.dateFrom) {
      params.append('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      params.append('dateTo', filters.dateTo);
    }
    if (filters.sortBy) {
      params.append('sortBy', filters.sortBy);
    }
    if (filters.sortOrder) {
      params.append('sortOrder', filters.sortOrder);
    }
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }

    const response = await api.get(`${this.baseUrl}?${params.toString()}`);
    return response.data;
  }

  /**
   * Получить детали конкретного возврата
   * @param {number} returnId - ID возврата
   * @returns {Promise<Object>} Детали возврата
   */
  async getReturnById(returnId) {
    const response = await api.get(`${this.baseUrl}/${returnId}`);
    return response.data;
  }

  /**
   * Создать запрос на возврат
   * @param {Object} data - Данные для создания возврата
   * @param {number} data.productId - ID продукта
   * @param {number} data.warehouseId - ID склада
   * @param {number} data.quantity - Количество коробок
   * @param {string} data.reason - Причина возврата
   * @param {string} [data.notes] - Дополнительные заметки
   * @returns {Promise<Object>} Созданный возврат
   */
  async createReturn(data) {
    const response = await api.post(this.baseUrl, data);
    return response.data;
  }

  /**
   * Одобрить возврат (только ADMIN)
   * @param {Object} data - Данные для одобрения
   * @param {number} data.returnId - ID возврата
   * @param {string} [data.notes] - Заметки при одобрении
   * @returns {Promise<Object>} Обновленный возврат
   */
  async approveReturn(data) {
    const { returnId, ...body } = data;
    const response = await api.put(
      `${this.baseUrl}/${returnId}/approve`,
      body
    );
    return response.data;
  }

  /**
   * Отклонить возврат (только ADMIN)
   * @param {Object} data - Данные для отклонения
   * @param {number} data.returnId - ID возврата
   * @param {string} data.rejectionReason - Причина отклонения
   * @returns {Promise<Object>} Обновленный возврат
   */
  async rejectReturn(data) {
    const { returnId, ...body } = data;
    const response = await api.put(
      `${this.baseUrl}/${returnId}/reject`,
      body
    );
    return response.data;
  }

  /**
   * Начать процесс возврата (ADMIN, EMPLOYEE, SUPPLIER)
   * @param {number} returnId - ID возврата
   * @returns {Promise<Object>} Обновленный возврат
   */
  async startReturn(returnId) {
    const response = await api.put(`${this.baseUrl}/${returnId}/start`);
    return response.data;
  }

  /**
   * Завершить возврат (ADMIN, EMPLOYEE)
   * @param {Object} data - Данные для завершения
   * @param {number} data.returnId - ID возврата
   * @param {string} [data.notes] - Заметки при завершении
   * @returns {Promise<Object>} Обновленный возврат
   */
  async completeReturn(data) {
    const { returnId, ...body } = data;
    const response = await api.put(
      `${this.baseUrl}/${returnId}/complete`,
      body
    );
    return response.data;
  }

  /**
   * Отменить возврат (только ADMIN)
   * @param {number} returnId - ID возврата
   * @param {string} [reason] - Причина отмены
   * @returns {Promise<Object>} Обновленный возврат
   */
  async cancelReturn(returnId, reason) {
    const response = await api.put(`${this.baseUrl}/${returnId}/cancel`, {
      reason
    });
    return response.data;
  }

  /**
   * Получить статистику возвратов
   * @param {Object} [filters={}] - Фильтры для статистики
   * @param {number} [filters.supplierId] - ID поставщика
   * @param {string} [filters.dateFrom] - Дата от (ISO)
   * @param {string} [filters.dateTo] - Дата до (ISO)
   * @returns {Promise<Object>} Статистика возвратов
   */
  async getStatistics(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.supplierId) {
      params.append('supplierId', filters.supplierId.toString());
    }
    if (filters.dateFrom) {
      params.append('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      params.append('dateTo', filters.dateTo);
    }

    const response = await api.get(
      `${this.baseUrl}/statistics?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Запустить ручную проверку залежавшихся товаров (только ADMIN)
   * @returns {Promise<Object>} Результаты проверки
   */
  async runStagnantCheck() {
    const response = await api.post(`${this.baseUrl}/check-stagnant`);
    return response.data;
  }

  /**
   * Получить историю изменений возврата
   * @param {number} returnId - ID возврата
   * @returns {Promise<Array>} История изменений
   */
  async getReturnHistory(returnId) {
    const response = await api.get(`${this.baseUrl}/${returnId}/history`);
    return response.data;
  }
}

// Создаем и экспортируем единственный экземпляр
export const productReturnApi = new ProductReturnApi();

// Экспортируем также класс для возможности создания новых экземпляров (если потребуется)
export default ProductReturnApi;

