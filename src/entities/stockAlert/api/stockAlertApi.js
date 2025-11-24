import { createApiModule } from "@shared/services/ApiClient";

const stockAlertApi = createApiModule('/api/stock-alerts');

/**
 * API клиент для работы с уведомлениями об остатках товаров
 */
const StockAlertApi = {
    /**
     * Получение статистики по остаткам товаров
     */
    getStockStats: (warehouseId = null) => {
        const params = warehouseId ? { warehouseId, _t: Date.now() } : { _t: Date.now() };
        return stockAlertApi.get('/stats', params);
    },

    /**
     * Получение списка товаров с критически низкими остатками
     */
    getCriticalStock: (warehouseId = null, limit = 50) => {
        const params = { limit, _t: Date.now() }; // Добавляем timestamp для избежания кэширования
        if (warehouseId) params.warehouseId = warehouseId;
        return stockAlertApi.get('/critical', params);
    },

    /**
     * Получение истории уведомлений об остатках
     */
    getAlertHistory: (page = 1, limit = 20, filters = {}) => {
        const params = { page, limit, ...filters };
        return stockAlertApi.get('/history', params);
    },

    /**
     * Ручная проверка остатков товаров
     */
    checkAllStock: () => {
        return stockAlertApi.post('/check-all');
    },

    /**
     * Проверка остатков конкретного товара
     */
    checkProductStock: (productId, warehouseId) => {
        return stockAlertApi.post('/check-product', {
            productId,
            warehouseId
        });
    }
}

export default StockAlertApi;
