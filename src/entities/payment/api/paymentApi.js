import { api } from '@shared/api/api';

/**
 * API для работы с платежами через ЮKassa
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
            paymentMethodType = 'sbp' // По умолчанию СБП
        } = options;
        
        console.log('💳 Creating payment:', {
            orderId,
            returnUrl,
            preauthorization,
            paymentMethodType
        });

        try {
            const response = await api.post(`/api/payments/orders/${orderId}/create`, {
                returnUrl,
                preauthorization,
                paymentMethodType
            });

            console.log('✅ Payment created:', response);
            return response;
        } catch (error) {
            console.error('❌ Payment creation error:', error);
            throw error;
        }
    },

    /**
     * Проверить статус платежа
     * @param {string} paymentId - ID платежа в ЮKassa
     * @returns {Promise<Object>} Статус платежа
     */
    checkPaymentStatus: async (paymentId) => {
        console.log('🔍 Checking payment status:', paymentId);

        try {
            const response = await api.get(`/api/payments/status/${paymentId}`);
            console.log('✅ Payment status:', response);
            return response;
        } catch (error) {
            console.error('❌ Error checking payment status:', error);
            throw error;
        }
    },

    /**
     * Отменить платеж
     * @param {string} paymentId - ID платежа в ЮKassa
     * @returns {Promise<Object>} Результат отмены
     */
    cancelPayment: async (paymentId) => {
        console.log('❌ Canceling payment:', paymentId);

        try {
            const response = await api.post(`/api/payments/${paymentId}/cancel`);
            console.log('✅ Payment canceled:', response);
            return response;
        } catch (error) {
            console.error('❌ Error canceling payment:', error);
            throw error;
        }
    }
};

