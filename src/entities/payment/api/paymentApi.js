import { api } from '@shared/api/api';

/**
 * API для работы с платежами через Т-Бизнес
 */
export const PaymentApi = {
    /**
     * Создать платеж для заказа
     * @param {number} orderId - ID заказа
     * @param {Object} options - Опции платежа
     * @param {string} options.returnUrl - URL для возврата после оплаты
     * @param {boolean} options.preauthorization - Использовать предавторизацию
     * @param {string} options.paymentMethodType - Тип платежа (sbp, bank_card)
     * @returns {Promise<Object>} Данные платежа с confirmationUrl
     */
    createPayment: async (orderId, options = {}) => {
        const { 
            returnUrl = 'icebergapp://payment-result', 
            preauthorization = false,
            paymentMethodType = 'sbp'
        } = options;

        try {
            return await api.post(`/api/payments/orders/${orderId}/create`, {
                returnUrl,
                preauthorization,
                paymentMethodType
            });
        } catch (error) {
            console.error('❌ Payment creation error:', {
                status: error?.response?.status,
                message: error?.response?.data?.message || error.message
            });
            throw error;
        }
    },

    /**
     * Проверить статус платежа
     * @param {string} paymentId - ID платежа в Т-Бизнес
     * @returns {Promise<Object>} Статус платежа
     */
    checkPaymentStatus: async (paymentId) => {
        try {
            return await api.get(`/api/payments/status/${paymentId}`);
        } catch (error) {
            console.error('❌ Error checking payment status:', error?.response?.data?.message || error.message);
            throw error;
        }
    },

    /**
     * Отменить платеж
     * @param {string} paymentId - ID платежа в Т-Бизнес
     * @returns {Promise<Object>} Результат отмены
     */
    cancelPayment: async (paymentId) => {
        try {
            return await api.post(`/api/payments/${paymentId}/cancel`);
        } catch (error) {
            console.error('❌ Error canceling payment:', error?.response?.data?.message || error.message);
            throw error;
        }
    }
};

