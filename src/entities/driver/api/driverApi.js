import {createProtectedRequest, createPublicRequest} from '@shared/api/api';

export const driverApi = {
    getAllDrivers: async () => {
        try {
            const response = await createProtectedRequest('get', '/api/users/drivers/all');
            if (!response || !response.data) {
                throw new Error('Получен некорректный ответ от сервера');
            }
            return response;
        } catch (error) {
            console.error('Error in getAllDrivers API call:', error);
            throw error;
        }
    },

    getDriverById: async (driverId) => {
        try {
            const response = await createProtectedRequest('get', `/api/users/drivers/${driverId}`);
            if (!response || !response.data) {
                throw new Error('Получен некорректный ответ от сервера');
            }
            return response;
        } catch (error) {
            console.error(`Error in getDriverById(${driverId}) API call:`, error);
            throw error;
        }
    },

    getDriverStops: async (driverId = null) => {
        try {
            const url = driverId
                ? `/api/drivers/stops?driverId=${driverId}`
                : '/api/drivers/stops';

            const response = await createPublicRequest('get', url);
            if (!response || !response.data) {
                throw new Error('Получен некорректный ответ от сервера');
            }
            return response;
        } catch (error) {
            console.error('Error in getDriverStops API call:', error);
            throw error;
        }
    },

    getDriverDistricts: async (driverId = null) => {
        try {
            const url = driverId
                ? `/api/drivers/districts?driverId=${driverId}`
                : '/api/drivers/districts';

            const response = await createProtectedRequest('get', url);
            if (!response || !response.data) {
                throw new Error('Получен некорректный ответ от сервера');
            }
            return response;
        } catch (error) {
            console.error('Error in getDriverDistricts API call:', error);
            throw error;
        }
    },

    updateDriverDistricts: async (districtIds, driverId = null) => {
        try {
            const payload = { districts: districtIds };
            if (driverId) {
                payload.driverId = driverId;
            }

            const response = await createProtectedRequest('put', '/api/drivers/districts', payload);
            if (!response || !response.data) {
                throw new Error('Получен некорректный ответ от сервера');
            }
            return response;
        } catch (error) {
            console.error('Error in updateDriverDistricts API call:', error);
            throw error;
        }
    }
};

export default driverApi;