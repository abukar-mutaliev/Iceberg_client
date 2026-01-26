import { createProtectedRequest, createPublicRequest } from '@shared/api/api';

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

  // Получение товаров на складе (публичный доступ)
  async getWarehouseProducts(warehouseId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString 
      ? `/api/warehouses/${warehouseId}/products?${queryString}` 
      : `/api/warehouses/${warehouseId}/products`;
    // Используем публичный запрос, так как эндпоинт теперь доступен без авторизации
    return createPublicRequest('get', url);
  },

  // Получение остатков товара на всех складах
  async getProductStock(productId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString
      ? `/api/warehouses/product-stock/${productId}?${queryString}`
      : `/api/warehouses/product-stock/${productId}`;
    return createProtectedRequest('get', url);
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
    // Проверяем, является ли data FormData
    const isFormData = data instanceof FormData;
    
    // Если это FormData, устанавливаем Content-Type (как в продуктах)
    // axios автоматически установит правильный boundary
    const config = isFormData ? {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 120000
    } : {};
    
    return createProtectedRequest('post', '/api/warehouses', data, config);
  },

  // Обновление склада
  async updateWarehouse(warehouseId, data) {
    // Проверяем, является ли data FormData
    const isFormData = data instanceof FormData;
    
    // Если это FormData, устанавливаем Content-Type (как в продуктах)
    // axios автоматически установит правильный boundary
    const config = isFormData ? {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 120000
    } : {};
    
    return createProtectedRequest('put', `/api/warehouses/${warehouseId}`, data, config);
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
  },

  // Получение сотрудников склада
  async getWarehouseEmployees(warehouseId) {
    return createProtectedRequest('get', `/api/warehouses/${warehouseId}/employees`);
  },

  // Обновление цены товара на складе
  async updateProductPrice(warehouseId, productId, data) {
    return createProtectedRequest(
      'put',
      `/api/warehouses/${warehouseId}/products/${productId}/price`,
      data
    );
  }
};

export default WarehouseService;
