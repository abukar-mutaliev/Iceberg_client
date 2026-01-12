import { createProtectedRequest } from '@shared/api/api';

const WarehouseService = {
  // Получение всех складов (с фильтрацией и пагинацией)
  async getWarehouses(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/api/warehouses?${queryString}` : '/api/warehouses';
    return createProtectedRequest('get', url);
  },

  // Получение склада по ID
  async getWarehouseById(warehouseId) {
    return createProtectedRequest('get', `/api/warehouses/${warehouseId}`);
  },

  // Получение складов по району
  async getWarehousesByDistrict(districtId) {
    return createProtectedRequest('get', `/api/warehouses/district/${districtId}`);
  },

  // Получение товаров на складе
  async getWarehouseProducts(warehouseId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString 
      ? `/api/warehouses/${warehouseId}/products?${queryString}` 
      : `/api/warehouses/${warehouseId}/products`;
    return createProtectedRequest('get', url);
  },

  // Получение остатков товара на всех складах
  async getProductStock(productId) {
    return createProtectedRequest('get', `/api/warehouses/product-stock/${productId}`);
  },

  // Поиск складов с товаром
  async findWarehousesWithProduct(productId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString 
      ? `/api/warehouses/find-with-product/${productId}?${queryString}` 
      : `/api/warehouses/find-with-product/${productId}`;
    return createProtectedRequest('get', url);
  },

  // Создание склада
  async createWarehouse(data) {
    return createProtectedRequest('post', '/api/warehouses', data);
  },

  // Обновление склада
  async updateWarehouse(warehouseId, data) {
    return createProtectedRequest('put', `/api/warehouses/${warehouseId}`, data);
  },

  // Удаление склада
  async deleteWarehouse(warehouseId) {
    return createProtectedRequest('delete', `/api/warehouses/${warehouseId}`);
  },

  // Получение складов для выбора (admin)
  async getWarehousesForSelection() {
    return createProtectedRequest('get', '/api/admin/warehouses/selection');
  },

  // Получение информации о складе (admin)
  async getWarehouseInfo(warehouseId) {
    return createProtectedRequest('get', `/api/admin/warehouses/${warehouseId}/info`);
  }
};

export default WarehouseService;
