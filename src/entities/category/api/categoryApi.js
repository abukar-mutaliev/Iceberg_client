import { createProtectedRequest } from '@shared/api/api';

export const categoryApi = {
    // Создание новой категории (только для ADMIN)
    createCategory: (data) =>
        createProtectedRequest('post', '/api/categories', data),

    getCategories: () =>
        createProtectedRequest('get', '/api/categories'),

    getCategoryById: (id) =>
        createProtectedRequest('get', `/api/categories/${id}`),

    // Обновление категории (только для ADMIN)
    updateCategory: (id, data) =>
        createProtectedRequest('put', `/api/categories/${id}`, data),

    // Удаление категории (только для ADMIN)
    deleteCategory: (id) =>
        createProtectedRequest('delete', `/api/categories/${id}`),

    getProductsByCategory: (id, params = {}) => {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

        return createProtectedRequest('get', `/api/categories/${id}/products${queryString}`);
    },
};


export default categoryApi;