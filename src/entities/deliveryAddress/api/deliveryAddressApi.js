import { createProtectedRequest } from '../../../shared/api/api';

export const DeliveryAddressApi = {
    /**
     * Получить все адреса клиента
     */
    getAddresses: async (search = null) => {
        const params = search ? { search } : {};
        const response = await createProtectedRequest('get', '/api/delivery-addresses', {
            params
        });
        return response.data;
    },

    /**
     * Получить адрес по ID
     */
    getAddressById: async (addressId) => {
        const response = await createProtectedRequest('get', `/api/delivery-addresses/${addressId}`);
        return response.data;
    },

    /**
     * Получить адрес по умолчанию
     */
    getDefaultAddress: async () => {
        const response = await createProtectedRequest('get', '/api/delivery-addresses/default');
        return response.data;
    },

    /**
     * Получить список районов
     */
    getDistricts: async () => {
        const response = await createProtectedRequest('get', '/api/delivery-addresses/districts');
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
        const response = await createProtectedRequest('get', `/api/delivery-addresses/${addressId}/validate`);
        return response.data;
    },

    /**
     * Поиск адресов
     */
    searchAddresses: async (query) => {
        const response = await createProtectedRequest('get', '/api/delivery-addresses', {
            params: { search: query }
        });
        return response.data;
    }
}; 