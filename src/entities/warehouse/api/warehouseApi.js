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

    // Добавить товар на склад
    addProductToWarehouse: (warehouseId, data) =>
        warehouseApi.post(`/${warehouseId}/products`, data),

    // Обновить остатки товара на складе
    updateProductStock: (warehouseId, productId, data) =>
        warehouseApi.put(`/${warehouseId}/products/${productId}`, data),
    
    // Обновить остатки товара на складе по ID записи ProductStock
    updateProductStockById: (productStockId, data) =>
        warehouseApi.put(`/products/${productStockId}`, data),

    // Массовое обновление остатков
    bulkUpdateStock: (warehouseId, products) =>
        warehouseApi.put(`/${warehouseId}/products/bulk`, { products }),

    // Получить статистику склада
    getWarehouseStats: (warehouseId) =>
        warehouseApi.get(`/${warehouseId}/stats`),

    // Поиск складов с товаром
    findWarehousesWithProduct: (productId, params = {}) => {
        console.log('[WarehouseService] Вызываем findWarehousesWithProduct для товара:', productId);
        console.log('[WarehouseService] URL:', `/find-with-product/${productId}`);
        console.log('[WarehouseService] Params:', params);
        return warehouseApi.get(`/find-with-product/${productId}`, params);
    },

    // ==================== Warehouse Sales & Statistics ====================
    
    // Получить продажи склада
    getWarehouseSales: (warehouseId, params = {}) =>
        warehouseApi.get(`/${warehouseId}/sales`, params),

    // Создать прямую продажу
    createDirectSale: (warehouseId, data) =>
        warehouseApi.post(`/${warehouseId}/direct-sales`, data),

    // Получить общую статистику склада
    getWarehouseStatistics: (warehouseId, params = {}) =>
        warehouseApi.get(`/${warehouseId}/statistics`, params),

    // Получить статистику продаж склада
    getSalesStatistics: (warehouseId, params = {}) =>
        warehouseApi.get(`/${warehouseId}/sales/statistics`, params),

    // Получить сравнительную статистику складов (только для админов)
    getComparisonStatistics: (params = {}) =>
        warehouseApi.get('/statistics/comparison', params),

    // Обновить цену товара на складе
    updateProductPrice: (warehouseId, productId, data) =>
        warehouseApi.put(`/${warehouseId}/products/${productId}/price`, data),

    // Массовое обновление цен товаров на складе
    bulkUpdatePrices: (warehouseId, data) =>
        warehouseApi.put(`/${warehouseId}/products/prices`, data),
    
    // Получить товары по оборачиваемости
    getProductsByTurnover: (warehouseId, type, params = {}) =>
        warehouseApi.get(`/${warehouseId}/products/turnover/${type}`, params)
};

export default WarehouseService; 