import { createProtectedRequest } from '../../../shared/api/api';

// ВАЖНО: createProtectedRequest имеет сигнатуру (method, url, data, config).
// Раньше для GET-запросов мы передавали { params } третьим аргументом,
// и оно попадало в `data` (тело запроса), а не в URL. На iOS NSURLSession
// отказывается отправлять GET с телом — реквест валился с Network Error
// за ~50 мс ещё до достижения сервера. Поэтому для GET-запросов всегда
// передаём `null` как data и `{ params }` четвёртым аргументом.

// _t — банальное cache-busting: Expo Go на iOS иногда отдаёт стейл-копию
// предыдущего ответа. Уникальный URL гарантирует cache miss и на клиенте,
// и на любом промежуточном кэше.
const cacheBust = () => ({ _t: Date.now() });

export const DeliveryAddressApi = {
    /**
     * Получить все адреса клиента
     */
    getAddresses: async (search = null) => {
        const params = { ...cacheBust(), ...(search ? { search } : {}) };
        const response = await createProtectedRequest(
            'get',
            '/api/delivery-addresses',
            null,
            { params }
        );
        return response.data;
    },

    /**
     * Получить адрес по ID
     */
    getAddressById: async (addressId) => {
        const response = await createProtectedRequest(
            'get',
            `/api/delivery-addresses/${addressId}`,
            null,
            { params: cacheBust() }
        );
        return response.data;
    },

    /**
     * Получить адрес по умолчанию
     */
    getDefaultAddress: async () => {
        const response = await createProtectedRequest(
            'get',
            '/api/delivery-addresses/default',
            null,
            { params: cacheBust() }
        );
        return response.data;
    },

    /**
     * Получить список районов
     */
    getDistricts: async () => {
        const response = await createProtectedRequest(
            'get',
            '/api/delivery-addresses/districts',
            null,
            { params: cacheBust() }
        );
        return response.data;
    },

    /**
     * Создать новый адрес
     */
    createAddress: async (addressData) => {
        const response = await createProtectedRequest('post', '/api/delivery-addresses', addressData);
        return response.data;
    },

    /**
     * Обновить адрес
     */
    updateAddress: async (addressId, addressData) => {
        const response = await createProtectedRequest('put', `/api/delivery-addresses/${addressId}`, addressData);
        return response.data;
    },

    /**
     * Удалить адрес
     */
    deleteAddress: async (addressId) => {
        const response = await createProtectedRequest('delete', `/api/delivery-addresses/${addressId}`);
        return response.data;
    },

    /**
     * Установить адрес по умолчанию
     */
    setDefaultAddress: async (addressId) => {
        const response = await createProtectedRequest('patch', `/api/delivery-addresses/${addressId}/set-default`);
        return response.data;
    },

    /**
     * Валидировать адрес для заказа
     */
    validateAddress: async (addressId) => {
        const response = await createProtectedRequest(
            'get',
            `/api/delivery-addresses/${addressId}/validate`,
            null,
            { params: cacheBust() }
        );
        return response.data;
    },

    /**
     * Поиск адресов
     */
    searchAddresses: async (query) => {
        const response = await createProtectedRequest(
            'get',
            '/api/delivery-addresses',
            null,
            { params: { ...cacheBust(), search: query } }
        );
        return response.data;
    }
};
