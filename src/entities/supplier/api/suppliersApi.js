import { createProtectedRequest } from '@/shared/api/api';

export const suppliersApi = {
    // Методы для работы с данными поставщиков

    getSuppliers: async (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);

        const queryString = queryParams.toString();
        const url = `/api/users/suppliers${queryString ? `?${queryString}` : ''}`;

        return await createProtectedRequest('get', url);
    },

    getSupplierById: async (supplierId) => {
        try {
            console.log(`Отправка запроса на получение поставщика с ID: ${supplierId}`);
            const response = await createProtectedRequest('get', `/api/users/suppliers/${supplierId}`);
            console.log(`Получен ответ для поставщика ${supplierId}:`, response);

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
        return await createProtectedRequest('get', `/api/products/supplier/${supplierId}`);
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
            console.log(`Получение поставщика с продуктами для ID: ${supplierId}`);
            const supplierResponse = await suppliersApi.getSupplierById(supplierId);

            console.log('Ответ от API getSupplierById:', supplierResponse);

            // Извлекаем данные поставщика из ответа
            let supplier;

            if (supplierResponse && supplierResponse.status === 'success' && supplierResponse.data && supplierResponse.data.user) {
                supplier = supplierResponse.data.user;
            } else if (supplierResponse && supplierResponse.user) {
                supplier = supplierResponse.user;
            } else {
                supplier = supplierResponse;
            }

            console.log('Извлеченные данные поставщика:', supplier);

            if (!supplier) {
                throw new Error('Поставщик не найден');
            }

            try {
                const productsResponse = await suppliersApi.getSupplierProducts(supplierId);
                console.log('Ответ от API getSupplierProducts:', productsResponse);

                // Форматируем данные продуктов
                let products = [];
                if (productsResponse && productsResponse.status === 'success' && productsResponse.data) {
                    products = productsResponse.data;
                } else if (Array.isArray(productsResponse)) {
                    products = productsResponse;
                } else if (productsResponse) {
                    products = productsResponse.data || [];
                }

                // Если у поставщика нет поля supplier с данными компании,
                // создаем фиктивное поле supplier с данными по умолчанию
                if (!supplier.supplier) {
                    supplier.supplier = {
                        id: parseInt(supplierId),
                        companyName: supplier.companyName || "Марзо", // Используем значение по умолчанию
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

                // Даже если не удалось получить продукты, возвращаем поставщика
                // с фиктивным полем supplier, если его нет
                if (!supplier.supplier) {
                    supplier.supplier = {
                        id: parseInt(supplierId),
                        companyName: supplier.companyName || "Марзо", // Используем значение по умолчанию
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
        return await createProtectedRequest('get', `/api/products?supplierId=${supplierId}`);
    },
};

export default suppliersApi;