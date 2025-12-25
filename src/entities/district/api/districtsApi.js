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
            logData('API Запрос: Получение списка районов');
            const response = await apiClient.get(BASE_URL);
            logData('API Ответ: Получение списка районов', { status: response.status, count: response.data?.length });
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
            logData('API Запрос: Получение района по ID', { id });
            const response = await apiClient.get(`${BASE_URL}/${id}`);
            logData('API Ответ: Получение района по ID', { id, status: response.status });
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
            logData('API Запрос: Создание района', { data });
            const response = await createProtectedRequest('post', BASE_URL, data);
            logData('API Ответ: Создание района', { status: response.status, id: response.data?.id });
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
            logData('API Запрос: Обновление района', { id, data });
            const response = await createProtectedRequest('put', `${BASE_URL}/${id}`, data);
            logData('API Ответ: Обновление района', { id, status: response.status });
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
            logData('API Запрос: Удаление района', { id });
            const response = await createProtectedRequest('delete', `${BASE_URL}/${id}`);
            logData('API Ответ: Удаление района', { id, status: response.status });
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

            logData('API Запрос: Получение районов водителя', { driverId: driverId || 'текущий' });
            const response = await createProtectedRequest('get', url);
            logData('API Ответ: Получение районов водителя', {
                driverId: driverId || 'текущий',
                status: response.status,
                count: response.data?.length
            });
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

            logData('API Запрос: Обновление районов водителя', {
                driverId: driverId || 'текущий',
                districtIds
            });

            const response = await createProtectedRequest('put', url, { districtIds });

            logData('API Ответ: Обновление районов водителя', {
                driverId: driverId || 'текущий',
                status: response.status
            });

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