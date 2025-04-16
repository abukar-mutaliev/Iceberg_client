import { createProtectedRequest } from '@/shared/api/api';
import { api } from '@/shared/api/api';

export const userApi = {
    getClients: async (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);

        const queryString = queryParams.toString();
        const url = `/api/users/clients${queryString ? `?${queryString}` : ''}`;

        try {
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Ошибка при получении клиентов:', error);
            throw error;
        }
    },

    getEmployees: async (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);
        if (params.position) queryParams.append('position', params.position);

        const queryString = queryParams.toString();
        const url = `/api/users/employees${queryString ? `?${queryString}` : ''}`;

        return await createProtectedRequest('get', url);
    },

    getAllUsers: async (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);
        if (params.role) queryParams.append('role', params.role);

        const queryString = queryParams.toString();
        const url = `/api/users${queryString ? `?${queryString}` : ''}`;

        return await createProtectedRequest('get', url);
    },

    getUserById: async (id) => {
        return await createProtectedRequest('get', `/api/users/${id}`);
    },

    createUser: async (userData) => {
        return await createProtectedRequest('post', '/api/users', userData);
    },

    updateUser: async (id, userData) => {
        return await createProtectedRequest('put', `/api/users/${id}`, userData);
    },

    deleteUser: async (id) => {
        return await createProtectedRequest('delete', `/api/users/${id}`);
    },
};

export default userApi;