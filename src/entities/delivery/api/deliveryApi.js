import { createApiModule } from "@shared/services/ApiClient";

const deliveryApi = createApiModule('/api/delivery');

/**
 * API модуль для работы с доставкой
 */
const DeliveryService = {
    /**
     * Рассчитать стоимость доставки для одного адреса
     * @param {number} warehouseId - ID склада
     * @param {number} deliveryAddressId - ID адреса доставки
     * @param {number} orderAmount - Сумма заказа
     * @returns {Promise} - Результат расчета
     */
    calculateDeliveryFee: (warehouseId, deliveryAddressId, orderAmount) =>
        deliveryApi.post('/calculate', { 
            warehouseId, 
            addressId: deliveryAddressId,  // API ожидает addressId
            orderAmount 
        }),

    /**
     * Рассчитать стоимость доставки для нескольких складов
     * @param {number[]} warehouseIds - Массив ID складов
     * @param {number} deliveryAddressId - ID адреса доставки
     * @param {number} orderAmount - Сумма заказа
     * @returns {Promise} - Результаты расчета для всех складов
     */
    calculateMultipleDeliveryFees: (warehouseIds, deliveryAddressId, orderAmount) =>
        deliveryApi.post('/calculate-multiple', { 
            warehouseIds, 
            addressId: deliveryAddressId,  // API ожидает addressId
            orderAmount 
        }),

    /**
     * Получить информацию о бесплатной доставке
     * @param {number} distance - Расстояние в км
     * @param {number} orderAmount - Сумма заказа
     * @returns {Promise} - Информация о бесплатной доставке
     */
    getFreeDeliveryInfo: (distance, orderAmount = 0) =>
        deliveryApi.get('/free-delivery-info', { distance, orderAmount }),

    /**
     * Получить активный тариф доставки
     * @returns {Promise} - Активный тариф
     */
    getActiveTariff: () =>
        deliveryApi.get('/tariff'),
};

export default DeliveryService;

