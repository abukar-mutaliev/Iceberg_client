import { api } from '@shared/api/api';

/**
 * API для работы с альтернативными предложениями заказов
 */
export class OrderAlternativesApi {
    /**
     * Получить активные предложения выбора для клиента
     * @returns {Promise<Object>}
     */
    static async getMyChoices() {
        try {
            console.log('📱 OrderAlternativesApi: Получение моих предложений выбора');
            
            const response = await api.get('/api/order-alternatives/my-choices');
            
            console.log('✅ OrderAlternativesApi: Предложения получены', {
                choicesCount: response.data?.data?.length || 0
            });
            
            return {
                success: true,
                data: response.data?.data || []
            };
        } catch (error) {
            console.error('❌ OrderAlternativesApi: Ошибка получения предложений', error);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Не удалось получить предложения выбора'
            };
        }
    }

    /**
     * Ответить на предложение выбора
     * @param {number} choiceId - ID предложения
     * @param {string} response - Ответ ('ACCEPTED' или 'REJECTED')
     * @param {number} selectedAlternativeId - ID выбранной альтернативы
     * @param {Object} responseData - Дополнительные данные ответа
     * @returns {Promise<Object>}
     */
    static async respondToChoice(choiceId, response, selectedAlternativeId = null, responseData = {}) {
        try {
            console.log('📱 OrderAlternativesApi: Отправка ответа на предложение', {
                choiceId,
                response,
                selectedAlternativeId,
                responseData
            });
            
            const requestData = {
                response,
                selectedAlternativeId,
                responseData
            };
            
            const apiResponse = await api.post(`/api/order-alternatives/choices/${choiceId}/respond`, requestData);
            
            console.log('✅ OrderAlternativesApi: Ответ успешно отправлен', apiResponse.data);
            
            return {
                success: true,
                data: apiResponse.data?.data,
                message: apiResponse.data?.message || 'Ваш выбор успешно обработан'
            };
        } catch (error) {
            console.error('❌ OrderAlternativesApi: Ошибка отправки ответа', error);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Не удалось обработать ваш выбор'
            };
        }
    }

    /**
     * Получить детали предложения выбора
     * @param {number} choiceId - ID предложения
     * @returns {Promise<Object>}
     */
    static async getChoiceDetails(choiceId) {
        try {
            console.log('📱 OrderAlternativesApi: Получение деталей предложения', { choiceId });
            
            const response = await api.get(`/api/order-alternatives/choices/${choiceId}`);
            
            console.log('✅ OrderAlternativesApi: Детали предложения получены');
            
            return {
                success: true,
                data: response.data?.data
            };
        } catch (error) {
            console.error('❌ OrderAlternativesApi: Ошибка получения деталей', error);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Не удалось получить детали предложения'
            };
        }
    }

    /**
     * Получить товары-заменители для продукта
     * @param {number} productId - ID товара
     * @param {number} districtId - ID района
     * @returns {Promise<Object>}
     */
    static async getProductSubstitutes(productId, districtId) {
        try {
            console.log('📱 OrderAlternativesApi: Поиск товаров-заменителей', {
                productId,
                districtId
            });
            
            const response = await api.get(`/api/order-alternatives/products/${productId}/substitutes`, {
                params: { districtId }
            });
            
            console.log('✅ OrderAlternativesApi: Заменители найдены', {
                substitutesCount: response.data?.data?.substitutes?.length || 0
            });
            
            return {
                success: true,
                data: response.data?.data
            };
        } catch (error) {
            console.error('❌ OrderAlternativesApi: Ошибка поиска заменителей', error);
            
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Не удалось найти товары-заменители'
            };
        }
    }
}

/**
 * Типы предложений выбора.
 * После упрощения: DELIVERY_DISTANCE больше не используется.
 */
export const CHOICE_TYPES = {
    STOCK_UNAVAILABLE: 'STOCK_UNAVAILABLE',
    PARTIAL_AVAILABILITY: 'PARTIAL_AVAILABILITY',
    PRODUCT_SUBSTITUTE: 'PRODUCT_SUBSTITUTE'
};

/**
 * Статусы предложений
 */
export const CHOICE_STATUS = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED'
};

/**
 * Типы альтернатив.
 * После упрощения: DISTANT_DELIVERY больше не используется.
 */
export const ALTERNATIVE_TYPES = {
    WAIT_STOCK: 'WAIT_STOCK',
    SUBSTITUTE: 'SUBSTITUTE',
    PARTIAL_ORDER: 'PARTIAL_ORDER',
    CANCEL_ORDER: 'CANCEL_ORDER',
    REMOVE_UNAVAILABLE: 'REMOVE_UNAVAILABLE'
};

/**
 * Переводы для типов предложений
 */
export const CHOICE_TYPE_LABELS = {
    [CHOICE_TYPES.STOCK_UNAVAILABLE]: 'Товар недоступен',
    [CHOICE_TYPES.PARTIAL_AVAILABILITY]: 'Товар доступен частично',
    [CHOICE_TYPES.PRODUCT_SUBSTITUTE]: 'Предложение замены'
};

/**
 * Переводы для типов альтернатив
 */
export const ALTERNATIVE_TYPE_LABELS = {
    [ALTERNATIVE_TYPES.WAIT_STOCK]: 'Подождать поступления',
    [ALTERNATIVE_TYPES.SUBSTITUTE]: 'Заменить товар',
    [ALTERNATIVE_TYPES.PARTIAL_ORDER]: 'Частичный заказ',
    [ALTERNATIVE_TYPES.CANCEL_ORDER]: 'Отменить заказ',
    [ALTERNATIVE_TYPES.REMOVE_UNAVAILABLE]: 'Убрать недоступные товары'
};

/**
 * Иконки для типов альтернатив
 */
export const ALTERNATIVE_TYPE_ICONS = {
    [ALTERNATIVE_TYPES.WAIT_STOCK]: 'schedule',
    [ALTERNATIVE_TYPES.SUBSTITUTE]: 'swap-horiz',
    [ALTERNATIVE_TYPES.PARTIAL_ORDER]: 'playlist-remove',
    [ALTERNATIVE_TYPES.CANCEL_ORDER]: 'cancel',
    [ALTERNATIVE_TYPES.REMOVE_UNAVAILABLE]: 'delete-outline'
};

/**
 * Цвета для типов альтернатив
 */
export const ALTERNATIVE_TYPE_COLORS = {
    [ALTERNATIVE_TYPES.WAIT_STOCK]: '#fd7e14',
    [ALTERNATIVE_TYPES.SUBSTITUTE]: '#007bff',
    [ALTERNATIVE_TYPES.PARTIAL_ORDER]: '#ffc107',
    [ALTERNATIVE_TYPES.CANCEL_ORDER]: '#dc3545',
    [ALTERNATIVE_TYPES.REMOVE_UNAVAILABLE]: '#e83e8c'
};

export default OrderAlternativesApi;
