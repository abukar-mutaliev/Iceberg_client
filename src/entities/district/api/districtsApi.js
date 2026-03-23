import { logData } from '@shared/lib/logger';
import { apiClient } from '@shared/services/ApiClient';
import { createProtectedRequest } from "@shared/api/api";

const BASE_URL = '/api/districts';

export const districtApi = {
    /**
     * Получение списка всех районов
     * @returns {Promise<Object>} - Ответ от сервера с данными районов
     */
    getAllDistricts: async () => {
        try {
            const response = await apiClient.get(BASE_URL);
            return response;
        } catch (error) {
            logData('API Ошибка: Получение списка районов', error);
            throw error;
        }
    },

    /**
     * Получение информации о конкретном районе
     * @param {number|string} id - ID района
     * @returns {Promise<Object>} - Ответ от сервера с данными района
     */
    getDistrictById: async (id) => {
        try {
            const response = await apiClient.get(`${BASE_URL}/${id}`);
            return response;
        } catch (error) {
            logData('API Ошибка: Получение района по ID', { id, error });
            throw error;
        }
    },

    /**
     * Создание нового района
     * @param {Object} data - Данные нового района
     * @param {string} data.name - Название района
     * @param {string} [data.description] - Описание района
     * @returns {Promise<Object>} - Ответ от сервера с данными созданного района
     */
    createDistrict: async (data) => {
        try {
            const response = await createProtectedRequest('post', BASE_URL, data);
            return response;
        } catch (error) {
            logData('API Ошибка: Создание района', { data, error });
            throw error;
        }
    },

    /**
     * Обновление района
     * @param {number|string} id - ID района
     * @param {Object} data - Данные для обновления
     * @param {string} [data.name] - Новое название района
     * @param {string} [data.description] - Новое описание района
     * @returns {Promise<Object>} - Ответ от сервера с данными обновленного района
     */
    updateDistrict: async (id, data) => {
        try {
            const response = await createProtectedRequest('put', `${BASE_URL}/${id}`, data);
            return response;
        } catch (error) {
            logData('API Ошибка: Обновление района', { id, data, error });
            throw error;
        }
    },

    /**
     * Удаление района
     * @param {number|string} id - ID района
     * @returns {Promise<Object>} - Ответ от сервера о результате удаления
     */
    deleteDistrict: async (id) => {
        try {
            const response = await createProtectedRequest('delete', `${BASE_URL}/${id}`);
            return response;
        } catch (error) {
            logData('API Ошибка: Удаление района', { id, error });
            throw error;
        }
    },

    /**
     * Получение районов, назначенных водителю
     * @param {number|string} driverId - ID водителя
     * @returns {Promise<Object>} - Ответ от сервера с районами водителя
     */
    getDriverDistricts: async (driverId) => {
        try {
            const url = driverId
                ? `/api/stops/${driverId}/districts`
                : '/api/stops/districts';
            const response = await createProtectedRequest('get', url);
            return response;
        } catch (error) {
            logData('API Ошибка: Получение районов водителя', { driverId: driverId || 'текущий', error });
            throw error;
        }
    },

    /**
     * Обновление списка районов водителя
     * @param {number[]|string[]} districtIds - Массив ID районов
     * @param {number|string} [driverId] - ID водителя (если не указан, изменяет районы текущего водителя)
     * @returns {Promise<Object>} - Ответ от сервера о результате обновления
     */
    updateDriverDistricts: async (districtIds, driverId) => {
        try {
            const url = driverId
                ? `/api/stops/${driverId}/districts`
                : '/api/stops/districts';
            const response = await createProtectedRequest('put', url, { districtIds });
            return response;
        } catch (error) {
            logData('API Ошибка: Обновление районов водителя', {
                driverId: driverId || 'текущий',
                districtIds,
                error
            });
            throw error;
        }
    }
};