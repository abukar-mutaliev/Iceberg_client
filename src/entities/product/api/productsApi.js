import { createProtectedRequest } from '@/shared/api/api';

export const productsApi = {
    getProducts: () =>
        createProtectedRequest('get', '/api/products'),

    getProductById: (productId) =>
        createProtectedRequest('get', `/api/products/${productId}`),

    createProduct: (formData) =>
        createProtectedRequest('post', '/api/products', formData),

    updateProduct: (productId, formData) =>
        createProtectedRequest('put', `/api/products/${productId}`, formData),

    deleteProduct: (productId) =>
        createProtectedRequest('delete', `/api/products/${productId}`),
};

export default productsApi;