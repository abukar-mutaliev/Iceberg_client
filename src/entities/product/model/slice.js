import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import productsApi from "@entities/product/api/productsApi";
import ProductsService from "@shared/services/ProductsService";

const initialState = {
    items: [],
    byId: {},
    currentProduct: null,
    loading: false,
    loadingMore: false,
    error: null,
    lastFetchTime: null,
    fetchCompleted: false,
    hasMore: true,
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    lastFetchScope: 'default',
    // Tracks product IDs that are actually deleted/not found.
    // Temporarily unavailable products must not be stored here,
    // otherwise detail navigation breaks for the whole session.
    deletedProductIds: []
};

const CACHE_EXPIRY_TIME = 5 * 60 * 1000;

const isCacheValid = (lastFetchTime) => {
    return lastFetchTime && Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
};

export const fetchProducts = createAsyncThunk(
    'products/fetchProducts',
    async ({ page = 1, limit = 10, refresh = false, usePublicCatalog = false } = {}, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const requestScope = usePublicCatalog ? 'publicCatalog' : 'default';

            // Используем кэш только если:
            // 1. Это первая страница
            // 2. Не принудительное обновление
            // 3. Кэш валиден
            // 4. В state есть валидные данные пагинации
            // 5. Данные выглядят полными (totalPages > 1 или hasMore === true, или totalItems > items.length)
            const hasValidPagination = state.products.hasMore !== undefined && 
                                       state.products.totalPages !== undefined &&
                                       state.products.totalItems !== undefined;
            
            const looksComplete = hasValidPagination && (
                state.products.totalPages > 1 || 
                state.products.hasMore === true ||
                (state.products.totalItems > 0 && state.products.totalItems > (state.products.items?.length || 0))
            );
            
            if (page === 1 && !refresh && isCacheValid(state.products.lastFetchTime) && 
                state.products.items?.length > 0 && 
                hasValidPagination &&
                looksComplete &&
                state.products.lastFetchScope === requestScope) {
                return { 
                    data: state.products.items, 
                    pagination: {
                        currentPage: state.products.currentPage,
                        totalPages: state.products.totalPages,
                        totalItems: state.products.totalItems,
                        hasMore: state.products.hasMore
                    },
                    fromCache: true,
                    requestScope
                };
            }
            
            const params = { page, limit };
            const response = await productsApi.getProducts(params, { usePublicCatalog });

            if (!response) {
                return { 
                    data: [], 
                    pagination: { currentPage: 1, totalPages: 1, totalItems: 0, hasMore: false },
                    fromCache: false 
                };
            }

            let products = [];
            let pagination = { currentPage: 1, totalPages: 1, totalItems: 0, hasMore: false };

            // API клиент уже возвращает response.data от axios, поэтому response это объект {status, data, pagination}
            if (response?.status === 'success') {
                products = Array.isArray(response.data) ? response.data : [];
                if (response.pagination) {
                    const serverHasMore = response.pagination.hasMore;
                    const calculatedHasMore = page < (response.pagination.totalPages || 1);
                    const finalHasMore = serverHasMore !== undefined ? serverHasMore : calculatedHasMore;
                    
                    pagination = {
                        currentPage: response.pagination.currentPage || page,
                        totalPages: response.pagination.totalPages || 1,
                        totalItems: response.pagination.totalItems || products.length,
                        hasMore: finalHasMore
                    };
                } else {
                    // Нет поля pagination — определяем hasMore по количеству полученных товаров:
                    // если вернулась полная страница (limit штук), значит данные ещё есть
                    const inferredHasMore = products.length >= limit;
                    pagination = {
                        currentPage: page,
                        totalPages: inferredHasMore ? page + 1 : page,
                        totalItems: products.length,
                        hasMore: inferredHasMore
                    };
                }
            } else if (Array.isArray(response)) {
                // Если ответ - массив напрямую (старый формат)
                products = response;
                const inferredHasMore = products.length >= limit;
                pagination = {
                    currentPage: page,
                    totalPages: inferredHasMore ? page + 1 : page,
                    totalItems: products.length,
                    hasMore: inferredHasMore
                };
            } else {
                // Если ответ пустой или неожиданный, используем значения по умолчанию
                products = [];
                pagination = {
                    currentPage: page,
                    totalPages: 1,
                    totalItems: 0,
                    hasMore: false
                };
            }

            return { 
                data: products, 
                pagination,
                page,
                limit,
                fromCache: false,
                requestScope
            };
        } catch (error) {
            console.error('Ошибка запроса продуктов:', error);
            return rejectWithValue(error.message || 'Ошибка при загрузке продуктов');
        }
    }
);

export const fetchProductById = createAsyncThunk(
    'products/fetchProductById',
    async (productId, { rejectWithValue, getState }) => {
        try {
            let numericProductId, force = false;
            
            if (typeof productId === 'object' && productId.productId) {
                numericProductId = parseInt(productId.productId, 10);
                force = productId.force || false;
            } else {
                numericProductId = parseInt(productId, 10);
            }
            
            if (isNaN(numericProductId)) {
                return rejectWithValue('Некорректный ID продукта');
            }

            const state = getState();

            if (!force) {
                const cachedProduct = state.products.items.find(p => p?.id === numericProductId);
                if (cachedProduct && !state.products.error) {
                    return { data: cachedProduct, fromCache: true };
                }
                
                const cachedProductById = state.products.byId[numericProductId];
                if (cachedProductById && !state.products.error) {
                    return { data: cachedProductById, fromCache: true };
                }
            }


            const response = await productsApi.getProductById(numericProductId);

            let product = null;
            if (response?.status === 'success') {
                product = response.data;
            } else if (response?.data?.status === 'success') {
                // Fallback for legacy callers that still return axios-like response.
                product = response.data.data;
            } else if (response?.data && response?.id === undefined) {
                product = response.data;
            } else {
                product = response;
            }

            if (!product?.id) {
                return rejectWithValue({ 
                    message: 'Продукт не найден', 
                    isDeleted: true, 
                    productId: numericProductId 
                });
            }

            return { data: product, fromCache: false };
        } catch (error) {
            const requestedProductId = typeof productId === 'object' ? productId.productId : productId;
            const errorMessage =
                error?.message ||
                error?.response?.data?.message ||
                'Ошибка при загрузке товара';
            const errorCode =
                error?.code ||
                error?.response?.status ||
                error?.response?.data?.code;
            const normalizedMessage = String(errorMessage).toLowerCase();
            const isTemporarilyUnavailable =
                (errorCode === 404 || normalizedMessage.includes('404')) &&
                normalizedMessage.includes('временно недоступ');
            const isDeletedOrNotFound =
                errorCode === 404 ||
                normalizedMessage.includes('404') ||
                normalizedMessage.includes('не найден') ||
                normalizedMessage.includes('удален');

            if (isTemporarilyUnavailable) {
                return rejectWithValue({
                    message: errorMessage,
                    isUnavailable: true,
                    productId: requestedProductId
                });
            }

            if (isDeletedOrNotFound) {
                // Return structured error for really deleted/missing products
                return rejectWithValue({
                    message: errorMessage,
                    isDeleted: true,
                    productId: requestedProductId
                });
            }
            
            // Only log unexpected errors, not 404s for deleted products
            console.error(`Ошибка запроса продукта ${productId}:`, error);
            return rejectWithValue(errorMessage);
        }
    }
);

export const createProductChunked = createAsyncThunk(
    'products/createProductChunked',
    async ({ formData, images, onProgress }, { rejectWithValue }) => {
        try {
            const result = await ProductsService.createProductChunked({
                formData,
                images
            }, onProgress);

            if (result.status === 'error') {
                return rejectWithValue(result.message || 'Ошибка при создании продукта');
            }

            return result.data.product;
        } catch (error) {
            console.error('createProductChunked: Ошибка:', error);
            return rejectWithValue(error.message || 'Ошибка при создании продукта');
        }
    }
);

export const createProduct = createAsyncThunk(
    'products/createProduct',
    async (payload, { rejectWithValue }) => {
        try {
            const formData = payload.formData || payload;

            const response = await productsApi.createProduct(formData);
            return response.data.status === 'success' ? response.data.data.product : response.data.product;
        } catch (error) {
            console.error('createProduct: Ошибка:', error);
            return rejectWithValue(error.message || 'Ошибка при создании продукта');
        }
    }
);

export const updateProduct = createAsyncThunk(
    'products/updateProduct',
    async ({ productId, formData }, { rejectWithValue }) => {
        try {
            const response = await productsApi.updateProduct(productId, formData);
            return response.data.status === 'success' ? response.data.data.product : response.data.product;
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при обновлении продукта');
        }
    }
);

export const deleteProduct = createAsyncThunk(
    'products/deleteProduct',
    async (productId, { rejectWithValue }) => {
        try {
            await productsApi.deleteProduct(productId);
            return productId;
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при удалении продукта');
        }
    }
);

const productsSlice = createSlice({
    name: 'products',
    initialState,
    reducers: {
        clearCurrentProduct: (state) => {
            state.currentProduct = null;
        },
        setProducts: (state, action) => {
            const products = action.payload;
            state.items = products;
            state.byId = {};
            products.forEach(product => {
                if (product?.id) {
                    state.byId[product.id] = product;
                }
            });
            state.lastFetchTime = Date.now();
            state.fetchCompleted = true;
            state.loading = false;
        },
        clearProductsCache: (state) => {
            state.lastFetchTime = null;
            state.fetchCompleted = false;
            state.hasMore = true;
            state.currentPage = 1;
            state.totalPages = 1;
            state.totalItems = 0;
            state.lastFetchScope = 'default';
        },
        resetFetchCompleted: (state) => {
            state.fetchCompleted = false;
            state.hasMore = true;
            state.currentPage = 1;
        },
        resetCurrentProduct: (state) => {
            state.currentProduct = null;
        },
        setCurrentProductFromCache: (state, action) => {
            const productId = action.payload;
            // Сначала проверяем byId (быстрее)
            const cachedById = state.byId?.[productId];
            if (cachedById) {
                state.currentProduct = { ...cachedById };
                return;
            }
            // Fallback: ищем в items
            const cachedProduct = state.items.find(p => p?.id === productId);
            if (cachedProduct) {
                state.currentProduct = { ...cachedProduct };
            }
        },
        updateProductOptimistic: (state, action) => {
            const updatedProduct = action.payload;
            if (!updatedProduct?.id) return;

            const index = state.items.findIndex(item => item && item.id === updatedProduct.id);
            if (index !== -1) {
                state.items[index] = { ...state.items[index], ...updatedProduct };
            }

            if (state.currentProduct && state.currentProduct.id === updatedProduct.id) {
                state.currentProduct = { ...state.currentProduct, ...updatedProduct };
            }
        },
        clearProductsError: (state) => {
            state.error = null;
        },
        markProductAsDeleted: (state, action) => {
            const productId = parseInt(action.payload, 10);
            if (!isNaN(productId) && !state.deletedProductIds.includes(productId)) {
                state.deletedProductIds.push(productId);
            }
        },
        clearDeletedProductIds: (state) => {
            state.deletedProductIds = [];
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProducts.pending, (state, action) => {
                const { page = 1 } = action.meta.arg || {};
                if (page === 1) {
                    state.loading = true;
                } else {
                    state.loadingMore = true;
                }
                state.error = null;
            })
            .addCase(fetchProducts.fulfilled, (state, action) => {

                
                state.loading = false;
                state.loadingMore = false;
                state.fetchCompleted = true;

                if (!action.payload.fromCache) {
                    const { data: products, pagination, page = 1 } = action.payload;
                    
                    const validProducts = Array.isArray(products)
                        ? products.filter(item => item?.id)
                        : [];
                    
                    if (page === 1) {
                        state.items = validProducts;
                        state.byId = {};
                        validProducts.forEach(product => {
                            if (product?.id) {
                                state.byId[product.id] = product;
                            }
                        });
                    } else {
                        const existingIds = new Set(state.items.map(item => item.id));
                        const newProducts = validProducts.filter(product => !existingIds.has(product.id));
                        state.items = [...state.items, ...newProducts];
                        
                        newProducts.forEach(product => {
                            if (product?.id) {
                                state.byId[product.id] = product;
                            }
                        });
                    }
                    
                    if (pagination) {
                        state.currentPage = pagination.currentPage;
                        state.totalPages = pagination.totalPages;
                        state.totalItems = pagination.totalItems;
                        state.hasMore = pagination.hasMore;
                    }
                    
                    state.lastFetchTime = Date.now();
                    state.lastFetchScope = action.payload.requestScope || 'default';
                }
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.loading = false;
                state.loadingMore = false;
                state.error = action.payload;
                state.fetchCompleted = true;
            })

            .addCase(fetchProductById.pending, (state) => {
                if (!state.currentProduct) {
                    state.loading = true;
                }
                state.error = null;
            })
            .addCase(fetchProductById.fulfilled, (state, action) => {
                state.loading = false;
                const { data, fromCache } = action.payload;

                state.byId[data.id] = data;
                state.deletedProductIds = state.deletedProductIds.filter(id => id !== data.id);

                if (!fromCache) {
                    const index = state.items.findIndex(p => p?.id === data.id);
                    if (index !== -1) {
                        state.items[index] = data;
                    } else {
                        state.items.push(data);
                    }
                    state.lastFetchTime = Date.now();
                } else {
                    const index = state.items.findIndex(p => p?.id === data.id);
                    if (index === -1) {
                        state.items.push(data);
                    }
                }
            })
            .addCase(fetchProductById.rejected, (state, action) => {
                state.loading = false;
                
                // Check if this is a deleted product error
                const payload = action.payload;
                if (payload?.isDeleted && payload?.productId) {
                    const productId = parseInt(payload.productId, 10);
                    if (!isNaN(productId)) {
                        // Помечаем как удаленный
                        if (!state.deletedProductIds.includes(productId)) {
                            state.deletedProductIds.push(productId);
                        }
                        // Удаляем из списков
                        state.items = state.items.filter(item => item?.id !== productId);
                        delete state.byId[productId];
                        // Очищаем currentProduct если это удаленный продукт
                        if (state.currentProduct?.id === productId) {
                            state.currentProduct = null;
                        }
                    }
                    // Don't set global error for deleted products - it's expected
                    return;
                }

                if (payload?.isUnavailable && payload?.productId) {
                    const productId = parseInt(payload.productId, 10);
                    if (!isNaN(productId)) {
                        state.deletedProductIds = state.deletedProductIds.filter(id => id !== productId);
                        if (state.currentProduct?.id === productId) {
                            state.currentProduct = null;
                        }
                    }
                    state.error = payload.message;
                    return;
                }
                
                state.error = typeof payload === 'object' ? payload.message : payload;
            })

            .addCase(createProductChunked.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createProductChunked.fulfilled, (state, action) => {
                state.loading = false;
                const newProduct = action.payload;
                state.items.push(newProduct);
                if (newProduct?.id) {
                    state.byId[newProduct.id] = newProduct;
                }
                state.lastFetchTime = Date.now();
            })
            .addCase(createProductChunked.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(createProduct.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createProduct.fulfilled, (state, action) => {
                state.loading = false;
                const newProduct = action.payload;
                state.items.push(newProduct);
                if (newProduct?.id) {
                    state.byId[newProduct.id] = newProduct;
                }
                state.lastFetchTime = Date.now();
            })
            .addCase(createProduct.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(updateProduct.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateProduct.fulfilled, (state, action) => {
                state.loading = false;

                try {
                    const updatePayload = action.payload;
                    if (!updatePayload) {
                        console.warn('Пустой payload в updateProduct.fulfilled');
                        return;
                    }

                    const updatedProduct = updatePayload.product || updatePayload;

                    if (!updatedProduct?.id) {
                        return;
                    }

                    if (!Array.isArray(state.items)) {
                        state.items = [];
                    }

                    const index = state.items.findIndex(item => item && item.id === updatedProduct.id);
                    if (index !== -1) {
                        const currentItem = state.items[index] || {};
                        state.items[index] = {
                            ...currentItem,
                            ...updatedProduct
                        };
                    } else {
                        state.items.push(updatedProduct);
                    }

                    if (state.currentProduct && state.currentProduct.id === updatedProduct.id) {
                        state.currentProduct = {
                            ...state.currentProduct,
                            ...updatedProduct
                        };
                    }

                    if (updatedProduct?.id) {
                        state.byId[updatedProduct.id] = {
                            ...state.byId[updatedProduct.id],
                            ...updatedProduct
                        };
                    }

                    state.lastFetchTime = Date.now();
                } catch (error) {
                    console.error('Ошибка в reducer при обновлении продукта:', error);
                }
            })
            .addCase(updateProduct.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(deleteProduct.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteProduct.fulfilled, (state, action) => {
                state.loading = false;
                const deletedProductId = parseInt(action.payload, 10);
                if (!isNaN(deletedProductId)) {
                    // Помечаем как удаленный
                    if (!state.deletedProductIds.includes(deletedProductId)) {
                        state.deletedProductIds.push(deletedProductId);
                    }
                    // Удаляем из списков
                    state.items = state.items.filter(item => item?.id !== deletedProductId);
                    delete state.byId[deletedProductId];
                    state.lastFetchTime = Date.now();
                    if (state.currentProduct?.id === deletedProductId) {
                        state.currentProduct = null;
                    }
                }
            })
            .addCase(deleteProduct.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const {
    clearCurrentProduct,
    resetCurrentProduct,
    clearProductsCache,
    resetFetchCompleted,
    setCurrentProductFromCache,
    updateProductOptimistic,
    setProducts,
    clearProductsError,
    markProductAsDeleted,
    clearDeletedProductIds
} = productsSlice.actions;
export default productsSlice.reducer;