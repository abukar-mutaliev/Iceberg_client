import { createProtectedRequest } from '@shared/api/api';

export const categoryApi = {
    // Создание новой категории (только для ADMIN)
    createCategory: async (data) => {
        const response = await createProtectedRequest('post', '/api/categories', data);
        return response; // Возвращаем весь ответ, так как в слайсе идет дополнительная проверка
    },

    getCategories: async () => {
        const response = await createProtectedRequest('get', '/api/categories');
        return response; // Возвращаем весь ответ
    },

    getCategoryById: async (id) => {
        const response = await createProtectedRequest('get', `/api/categories/${id}`);
        return response;
    },

    // Обновление категории (только для ADMIN)
    updateCategory: async (id, data) => {
        const response = await createProtectedRequest('put', `/api/categories/${id}`, data);
        return response;
    },

    // Удаление категории (только для ADMIN)
    deleteCategory: async (id) => {
        const response = await createProtectedRequest('delete', `/api/categories/${id}`);
        return response;
    },

    getProductsByCategory: async (id, params = {}) => {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

        const response = await createProtectedRequest('get', `/api/categories/${id}/products${queryString}`);
        return response;
    },
};

export default categoryApi;