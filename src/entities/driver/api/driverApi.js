import { createProtectedRequest } from '@/shared/api/api';

/**
 * API для работы с данными водителя
 */
export const driverApi = {
    /**
     * Получение профиля водителя
     * @returns {Promise} Promise с данными профиля водителя
     */
    getDriverProfile: async () => {
        try {
            const response = await createProtectedRequest('get', '/api/driver/profile');
            if (!response || !response.data) {
                throw new Error('Получен некорректный ответ от сервера');
            }
            return response;
        } catch (error) {
            console.error('Error in getDriverProfile API call:', error);
            throw error;
        }
    },

    /**
     * Обновление профиля водителя
     * @param {Object} data - Данные для обновления
     * @returns {Promise} Promise с обновленными данными профиля
     */
    updateDriverProfile: async (data) => {
        try {
            const response = await createProtectedRequest('put', '/api/driver/profile', data);
            return response;
        } catch (error) {
            console.error('Error in updateDriverProfile API call:', error);
            throw error;
        }
    },

    /**
     * Обновление аватара водителя
     * @param {FormData} formData - объект FormData с фотографией
     * @param {Object} options - дополнительные опции для запроса
     * @returns {Promise} Promise с данными обновленного аватара
     */
    updateDriverAvatar: async (formData, options = {}) => {
        try {
            const response = await createProtectedRequest(
                'post',
                '/api/driver/profile/avatar',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    ...options,
                }
            );
            return response;
        } catch (error) {
            console.error('Error in updateDriverAvatar API call:', error);
            throw error;
        }
    },

    /**
     * Получить список остановок водителя
     * @returns {Promise} Promise со списком остановок
     */
    getDriverStops: async () => {
        try {
            const response = await createProtectedRequest('get', '/api/driver/stops');
            if (!response || !response.data) {
                throw new Error('Получен некорректный ответ от сервера');
            }
            return response;
        } catch (error) {
            console.error('Error in getDriverStops API call:', error);
            throw error;
        }
    },

    /**
     * Получить информацию об одной остановке
     * @param {number} stopId - ID остановки
     * @returns {Promise} Promise с данными остановки
     */
    getDriverStop: async (stopId) => {
        try {
            const response = await createProtectedRequest('get', `/api/driver/stops/${stopId}`);
            return response;
        } catch (error) {
            console.error(`Error in getDriverStop(${stopId}) API call:`, error);
            throw error;
        }
    },

    /**
     * Создать новую остановку
     * @param {FormData} formData - данные остановки с возможным фото
     * @returns {Promise} Promise с данными созданной остановки
     */
    createDriverStop: async (formData) => {
        try {
            const response = await createProtectedRequest('post', '/api/driver/stops', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response;
        } catch (error) {
            console.error('Error in createDriverStop API call:', error);
            throw error;
        }
    },

    /**
     * Обновить существующую остановку
     * @param {number} stopId - ID остановки
     * @param {FormData} formData - обновленные данные остановки
     * @returns {Promise} Promise с обновленными данными остановки
     */
    updateDriverStop: async (stopId, formData) => {
        try {
            const response = await createProtectedRequest(
                'put',
                `/api/driver/stops/${stopId}`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return response;
        } catch (error) {
            console.error(`Error in updateDriverStop(${stopId}) API call:`, error);
            throw error;
        }
    },

    /**
     * Удалить остановку
     * @param {number} stopId - ID остановки для удаления
     * @returns {Promise} Promise с результатом операции
     */
    deleteDriverStop: async (stopId) => {
        try {
            const response = await createProtectedRequest('delete', `/api/driver/stops/${stopId}`);
            return response;
        } catch (error) {
            console.error(`Error in deleteDriverStop(${stopId}) API call:`, error);
            throw error;
        }
    },

    /**
     * Получить список районов, доступных водителю
     * @returns {Promise} Promise со списком районов
     */
    getDriverDistricts: async () => {
        try {
            const response = await createProtectedRequest('get', '/api/driver/districts');
            return response;
        } catch (error) {
            console.error('Error in getDriverDistricts API call:', error);
            throw error;
        }
    },

    /**
     * Обновить список районов, в которых работает водитель
     * @param {Array} districtIds - массив ID районов
     * @returns {Promise} Promise с обновленным списком районов
     */
    updateDriverDistricts: async (districtIds) => {
        try {
            const response = await createProtectedRequest('put', '/api/driver/districts', {
                districts: districtIds,
            });
            return response;
        } catch (error) {
            console.error('Error in updateDriverDistricts API call:', error);
            throw error;
        }
    },
};

export default driverApi;