import {createApiModule} from "@shared/services/ApiClient";

const productsApi = createApiModule('/api/products');

const ProductsService = {
    getProducts: (params = {}) =>
        productsApi.get('', params),

    getProductById: (productId) =>
        productsApi.get(`/${productId}`),

    getSupplierProducts: (supplierId) =>
        productsApi.get(`/supplier/${supplierId}`),

    createProduct: (data) => {
        const formData = new FormData();

        Object.keys(data.formData).forEach(key => {
            if (data.formData[key] !== undefined && data.formData[key] !== null) {
                if (key === 'warehouses' && Array.isArray(data.formData[key])) {
                    // Обрабатываем массив складов
                    if (data.formData[key].length > 0) {
                        data.formData[key].forEach(warehouseId => {
                            formData.append('warehouses[]', String(warehouseId));
                        });
                    } else {
                        formData.append('warehouses', 'all');
                    }
                } else {
                    formData.append(key, data.formData[key].toString());
                }
            }
        });

        if (data.images && data.images.length > 0) {
            data.images.forEach((image, index) => {
                if (typeof image === 'string') {
                    if (image.startsWith('file://')) {
                        const fileName = image.split('/').pop();
                        formData.append('images', {
                            uri: image,
                            type: 'image/jpeg',
                            name: fileName
                        });
                    }
                } else if (image.uri) {
                    const fileName = image.uri.split('/').pop();
                    formData.append('images', {
                        uri: image.uri,
                        type: image.type || 'image/jpeg',
                        name: fileName
                    });
                }
            });
        }

        return productsApi.post('', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            timeout: 60000
        });
    },

    updateProduct: (productId, data) => {
        const formData = new FormData();

        Object.keys(data.formData).forEach(key => {
            if (data.formData[key] !== undefined && data.formData[key] !== null) {
                if (key === 'warehouses' && Array.isArray(data.formData[key])) {
                    // Обрабатываем массив складов
                    if (data.formData[key].length > 0) {
                        data.formData[key].forEach(warehouseId => {
                            formData.append('warehouses[]', String(warehouseId));
                        });
                    } else {
                        formData.append('warehouses', 'all');
                    }
                } else {
                    formData.append(key, data.formData[key].toString());
                }
            }
        });

        if (data.images && data.images.length > 0) {
            data.images.forEach(image => {
                if (typeof image === 'string') {
                    if (image.startsWith('file://')) {
                        const fileName = image.split('/').pop();
                        formData.append('images', {
                            uri: image,
                            type: 'image/jpeg',
                            name: fileName
                        });
                    }
                } else if (image.uri) {
                    const fileName = image.uri.split('/').pop();
                    formData.append('images', {
                        uri: image.uri,
                        type: image.type || 'image/jpeg',
                        name: fileName
                    });
                }
            });
        }

        if (data.removeImages && data.removeImages.length > 0) {
            formData.append('removeImages', data.removeImages.join(','));
        }

        console.log('Отправка updateProduct запроса:', {
            productId,
            formFields: Object.keys(data.formData),
            imagesCount: data.images?.length || 0,
            removeImagesCount: data.removeImages?.length || 0
        });

        return productsApi.put(`/${productId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            timeout: 120000
        });
    },

    deleteProduct: (productId) =>
        productsApi.delete(`/${productId}`)
};

export default ProductsService;