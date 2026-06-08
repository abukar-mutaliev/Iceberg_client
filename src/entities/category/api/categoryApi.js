import { createProtectedRequest } from '@shared/api/api';
import { logCategoryProducts } from '@entities/category/lib/categoryProductsDebug';

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
        const url = `/api/categories/${id}/products${queryString}`;

        logCategoryProducts('API.request', {
            categoryId: id,
            params,
            url,
        });

        const response = await createProtectedRequest('get', url);

        const apiProducts = response?.data?.products;
        logCategoryProducts('API.response', {
            categoryId: id,
            status: response?.status,
            productsCount: Array.isArray(apiProducts) ? apiProducts.length : 0,
            productIds: Array.isArray(apiProducts) ? apiProducts.map((p) => p?.id) : [],
            pagination: response?.data?.pagination ?? null,
            responseCategory: response?.data?.category ?? null,
        });

        return response;
    },
};

export default categoryApi;