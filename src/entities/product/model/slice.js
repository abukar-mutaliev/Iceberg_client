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
    totalItems: 0
};

const CACHE_EXPIRY_TIME = 5 * 60 * 1000;

const isCacheValid = (lastFetchTime) => {
    return lastFetchTime && Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
};

export const fetchProducts = createAsyncThunk(
    'products/fetchProducts',
    async ({ page = 1, limit = 10, refresh = false } = {}, { rejectWithValue, getState }) => {
        try {
            const state = getState();

            if (page === 1 && !refresh && isCacheValid(state.products.lastFetchTime)) {
                return { 
                    data: state.products.items, 
                    pagination: {
                        currentPage: state.products.currentPage,
                        totalPages: state.products.totalPages,
                        totalItems: state.products.totalItems,
                        hasMore: state.products.hasMore
                    },
                    fromCache: true 
                };
            }

            const params = { page, limit };
            const response = await productsApi.getProducts(params);

            if (!response) {
                return { 
                    data: [], 
                    pagination: { currentPage: 1, totalPages: 1, totalItems: 0, hasMore: false },
                    fromCache: false 
                };
            }

            let products = [];
            let pagination = { currentPage: 1, totalPages: 1, totalItems: 0, hasMore: false };

            if (response.data?.status === 'success') {
                products = response.data.data || [];
                if (response.data.pagination) {
                    pagination = {
                        currentPage: response.data.pagination.currentPage || page,
                        totalPages: response.data.pagination.totalPages || 1,
                        totalItems: response.data.pagination.totalItems || products.length,
                        hasMore: response.data.pagination.hasMore || (page < (response.data.pagination.totalPages || 1))
                    };
                } else {
                    pagination = {
                        currentPage: page,
                        totalPages: page,
                        totalItems: products.length,
                        hasMore: false
                    };
                }
            } else if (Array.isArray(response.data)) {
                products = response.data;
                pagination = {
                    currentPage: page,
                    totalPages: page,
                    totalItems: products.length,
                    hasMore: false
                };
            }

            return { 
                data: products, 
                pagination,
                page,
                fromCache: false 
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
            const product = response.data.status === 'success' ? response.data.data : response.data;

            if (!product?.id) {
                return rejectWithValue('Продукт не найден');
            }

            return { data: product, fromCache: false };
        } catch (error) {
            console.error(`Ошибка запроса продукта ${productId}:`, error);
            return rejectWithValue(error.message || 'Ошибка при загрузке продукта');
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
        clearProductsCache: (state) => {
            state.lastFetchTime = null;
            state.fetchCompleted = false;
            state.hasMore = true;
            state.currentPage = 1;
            state.totalPages = 1;
            state.totalItems = 0;
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

                state.currentProduct = data;
                state.byId[data.id] = data;

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
                state.error = action.payload;
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
                        console.warn('Обновленный продукт не содержит ID:', updatedProduct);
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
                const deletedProductId = action.payload;
                state.items = state.items.filter(item => item?.id !== deletedProductId);
                delete state.byId[deletedProductId];
                state.lastFetchTime = Date.now();
                if (state.currentProduct?.id === deletedProductId) {
                    state.currentProduct = null;
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
    updateProductOptimistic
} = productsSlice.actions;
export default productsSlice.reducer;