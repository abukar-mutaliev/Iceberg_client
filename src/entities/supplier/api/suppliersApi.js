import { createProtectedRequest, createPublicRequest } from '@shared/api/api';

export const suppliersApi = {

    getSuppliers: async (params = {}) => {
        try {
            const queryParams = new URLSearchParams();
            if (params.page) queryParams.append('page', params.page);
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.search) queryParams.append('search', params.search);

            const queryString = queryParams.toString();
            const url = `/api/users/suppliers${queryString ? `?${queryString}` : ''}`;

            const response = await createProtectedRequest('get', url);

            return response;
        } catch (error) {
            console.error('Ошибка в getSuppliers:', error);
            throw error;
        }
    },

    getSupplierById: async (supplierId) => {
        try {
            // Публичный эндпоинт - не требует авторизации
            const response = await createPublicRequest('get', `/api/users/suppliers/${supplierId}`);

            if (response && response.status === 'success' && response.data && response.data.user) {
                return response;
            }

            if (response && response.user) {
                return {
                    status: 'success',
                    data: {
                        user: response.user
                    }
                };
            }

            return {
                status: 'success',
                data: {
                    user: response
                }
            };
        } catch (error) {
            console.error(`Ошибка при запросе поставщика ${supplierId}:`, error);
            throw error;
        }
    },

    updateSupplier: async (supplierId, supplierData) => {
        return await createProtectedRequest('put', `/api/users/${supplierId}`, supplierData);
    },


    getSupplierProducts: async (supplierId) => {
        // Публичный эндпоинт - не требует авторизации
        return await createPublicRequest('get', `/api/products/supplier/${supplierId}`);
    },

    createSupplierProduct: async (productData) => {
        return await createProtectedRequest('post', '/api/products', productData);
    },

    updateSupplierProduct: async (productId, productData) => {
        return await createProtectedRequest('put', `/api/products/${productId}`, productData);
    },

    deleteSupplierProduct: async (productId) => {
        return await createProtectedRequest('delete', `/api/products/${productId}`);
    },

    // Комбинированные методы

    getSupplierWithProducts: async (supplierId) => {
        try {
            const supplierResponse = await suppliersApi.getSupplierById(supplierId);

            let supplier;

            if (supplierResponse && supplierResponse.status === 'success' && supplierResponse.data && supplierResponse.data.user) {
                supplier = supplierResponse.data.user;
            } else if (supplierResponse && supplierResponse.user) {
                supplier = supplierResponse.user;
            } else {
                supplier = supplierResponse;
            }


            if (!supplier) {
                throw new Error('Поставщик не найден');
            }

            try {
                const productsResponse = await suppliersApi.getSupplierProducts(supplierId);

                // Форматируем данные продуктов
                let products = [];
                if (productsResponse && productsResponse.status === 'success' && productsResponse.data) {
                    products = productsResponse.data;
                } else if (Array.isArray(productsResponse)) {
                    products = productsResponse;
                } else if (productsResponse) {
                    products = productsResponse.data || [];
                }

                if (!supplier.supplier) {
                    supplier.supplier = {
                        id: parseInt(supplierId),
                        companyName: supplier.companyName || "Айсберг",
                        contactPerson: "Представитель",
                        phone: supplier.phone || "",
                        address: supplier.address || ""
                    };
                }

                return {
                    data: {
                        supplier,
                        products: Array.isArray(products) ? products : []
                    },
                    status: 'success'
                };
            } catch (productsError) {
                console.warn(`Не удалось получить продукты поставщика ${supplierId}:`, productsError);

                if (!supplier.supplier) {
                    supplier.supplier = {
                        id: parseInt(supplierId),
                        companyName: supplier.companyName || "Айсберг",
                        contactPerson: "Представитель",
                        phone: supplier.phone || "",
                        address: supplier.address || ""
                    };
                }

                return {
                    data: {
                        supplier,
                        products: []
                    },
                    status: 'success',
                    productsError: productsError.message
                };
            }
        } catch (error) {
            console.error(`Ошибка при получении данных поставщика ${supplierId}:`, error);
            throw error;
        }
    },

    getSupplierProductsForRating: async (supplierId) => {
        // Публичный эндпоинт - не требует авторизации
        return await createPublicRequest('get', `/api/products?supplierId=${supplierId}`);
    },
};

export default suppliersApi;