import { createApiModule } from '@shared/services/ApiClient';

const deliveryApi = createApiModule('/api/delivery');

/**
 * API доставки — контракт совпадает с server/src/controllers/delivery/delivery.controller.js
 * и server/src/services/delivery/deliveryFee.service.js.
 */
const DeliveryService = {
    /**
     * POST /api/delivery/calculate
     * @param {Object} params
     * @param {string} [params.deliveryType='DELIVERY'] - 'DELIVERY' | 'PICKUP'
     * @returns {Promise<{ status: string, data: DeliveryCalculation }>}
     */
    calculateDeliveryFee: ({ deliveryType = 'DELIVERY' } = {}) =>
        deliveryApi.post('/calculate', { deliveryType }),

    /**
     * POST /api/delivery/calculate-multiple
     * @param {Object} params
     * @param {string} [params.deliveryType='DELIVERY']
     * @param {number[]} [params.addressIds=[]]
     */
    calculateMultipleDeliveryFees: ({ deliveryType = 'DELIVERY', addressIds = [] } = {}) =>
        deliveryApi.post('/calculate-multiple', { deliveryType, addressIds }),

    /** GET /api/delivery/tariff */
    getActiveTariff: () => deliveryApi.get('/tariff'),

    /** GET /api/delivery/free-delivery-info */
    getFreeDeliveryInfo: () => deliveryApi.get('/free-delivery-info')
};

export default DeliveryService;
