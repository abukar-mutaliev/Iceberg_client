import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productsApi } from '@entities/product/api/productsApi';

const initialState = {
    items: [],
    currentProduct: null,
    loading: false,
    error: null,
    lastFetchTime: null
};

const CACHE_EXPIRY_TIME = 5 * 60 * 1000;

const isCacheValid = (lastFetchTime) => {
    return lastFetchTime && Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
};

export const fetchProducts = createAsyncThunk(
    'products/fetchProducts',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState();

            // Проверяем кэш
            if (isCacheValid(state.products.lastFetchTime)) {
                return { data: state.products.items, fromCache: true };
            }

            const response = await productsApi.getProducts();
            const products = response.data.status === 'success' ? response.data.data : response.data;
            return { data: products, fromCache: false };
        } catch (error) {
            console.error('Ошибка запроса всех продуктов:', error);
            return rejectWithValue(error.message || 'Ошибка при загрузке продуктов');
        }
    }
);

export const fetchProductById = createAsyncThunk(
    'products/fetchProductById',
    async (productId, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const cachedProduct = state.products.items.find(p => p?.id === productId);

            if (cachedProduct) {
                return { data: cachedProduct, fromCache: true };
            }

            const response = await productsApi.getProductById(productId);
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

export const createProduct = createAsyncThunk(
    'products/createProduct',
    async (formData, { rejectWithValue }) => {
        try {
            const response = await productsApi.createProduct(formData);
            return response.data.status === 'success' ? response.data.data.product : response.data.product;
        } catch (error) {
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
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProducts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProducts.fulfilled, (state, action) => {
                state.loading = false;
                if (!action.payload.fromCache) {
                    state.items = action.payload.data.filter(item => item?.id);
                    state.lastFetchTime = Date.now();
                }
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(fetchProductById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProductById.fulfilled, (state, action) => {
                state.loading = false;
                const { data } = action.payload;
                state.currentProduct = data;

                if (!action.payload.fromCache) {
                    const index = state.items.findIndex(p => p?.id === data.id);
                    if (index !== -1) {
                        state.items[index] = data;
                    } else {
                        state.items.push(data);
                    }
                }
            })
            .addCase(fetchProductById.rejected, (state, action) => {
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
                const updatedProduct = action.payload;
                const index = state.items.findIndex(item => item?.id === updatedProduct.id);
                if (index !== -1) {
                    state.items[index] = updatedProduct;
                } else {
                    state.items.push(updatedProduct);
                }
                state.currentProduct = updatedProduct;
                state.lastFetchTime = Date.now();
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

export const { clearCurrentProduct, clearProductsCache } = productsSlice.actions;
export default productsSlice.reducer;