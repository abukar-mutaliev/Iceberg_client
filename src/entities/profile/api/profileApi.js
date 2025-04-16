// entities/profile/api/profileApi.js
import { createProtectedRequest } from '@/shared/api/api';

export const profileApi = {
    getProfile: async () => {
        try {
            const response = await createProtectedRequest('get', '/api/profile');

            if (!response || !response.data) {
                console.error('Invalid response format in getProfile:', response);
                throw new Error('Получен некорректный формат ответа от сервера');
            }

            return response;
        } catch (error) {
            console.error('Error in getProfile API call:', error);
            throw error;
        }
    },

    updateProfile: async (data) => {
        try {
            const response = await createProtectedRequest('put', '/api/profile', data);
            return response;
        } catch (error) {
            console.error('Error in updateProfile API call:', error);
            throw error;
        }
    },

    updateAvatar: async (formData, options = {}) => {
        try {
            const response = await createProtectedRequest(
                'patch',
                '/api/profile/avatar',
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
            console.error('Error in updateAvatar API call:', error);
            throw error;
        }
    },

    changePassword: async (data) => {
        try {
            const response = await createProtectedRequest('put', '/api/profile/password', data);
            return response;
        } catch (error) {
            console.error('Error in changePassword API call:', error);
            throw error;
        }
    },
};
