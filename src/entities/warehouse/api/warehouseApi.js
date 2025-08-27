import { createApiModule } from "@shared/services/ApiClient";

const warehouseApi = createApiModule('/api/warehouses');

const WarehouseService = {
    // Получить все склады
    getWarehouses: (params = {}) =>
        warehouseApi.get('', params),

    // Получить склад по ID
    getWarehouseById: (warehouseId) =>
        warehouseApi.get(`/${warehouseId}`),

    // Получить склады по району
    getWarehousesByDistrict: (districtId) =>
        warehouseApi.get(`/district/${districtId}`),

    // Получить товары на складе
    getWarehouseProducts: (warehouseId, params = {}) =>
        warehouseApi.get(`/${warehouseId}/products`, params),

    // Получить остатки товара по всем складам
    getProductStock: (productId) =>
        warehouseApi.get(`/product-stock/${productId}`),

    // Создать склад (для админов)
    createWarehouse: (data) =>
        warehouseApi.post('', data),

    // Обновить склад (для админов)
    updateWarehouse: (warehouseId, data) =>
        warehouseApi.put(`/${warehouseId}`, data),

    // Удалить склад (для админов)
    deleteWarehouse: (warehouseId) =>
        warehouseApi.delete(`/${warehouseId}`),

    // Обновить остатки товара на складе
    updateProductStock: (warehouseId, productId, data) =>
        warehouseApi.put(`/${warehouseId}/products/${productId}`, data),

    // Массовое обновление остатков
    bulkUpdateStock: (warehouseId, products) =>
        warehouseApi.put(`/${warehouseId}/products/bulk`, { products }),

    // Получить статистику склада
    getWarehouseStats: (warehouseId) =>
        warehouseApi.get(`/${warehouseId}/stats`),

    // Поиск складов с товаром
    findWarehousesWithProduct: (productId, params = {}) =>
        warehouseApi.get(`/find-with-product/${productId}`, params)
};

export default WarehouseService; 