import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import suppliersApi from '@/entities/supplier/api/suppliersApi';
import {calculateSupplierRating} from "@services/supplierRatingService";

const initialState = {
    list: [],
    total: 0,
    page: 1,
    pages: 1,
    currentSupplierId: null,
    supplierDetails: {},
    supplierProducts: {},
    ratings: {},
    loading: false,
    error: null,
    lastFetchTime: {}
};

const CACHE_EXPIRY_TIME = 5 * 60 * 1000;

const isCacheValid = (lastFetchTime) => {
    return lastFetchTime && (Date.now() - lastFetchTime < CACHE_EXPIRY_TIME);
};

export const fetchSuppliersList = createAsyncThunk(
    'suppliers/fetchSuppliersList',
    async (params = { page: 1, limit: 10 }, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const cacheKey = `list_${params.page}_${params.limit}_${params.search || ''}`;

            if (isCacheValid(state.suppliers.lastFetchTime[cacheKey])) {
                return { fromCache: true, cacheKey };
            }

            const response = await suppliersApi.getSuppliers(params);

            if (response && response.data) {
                return {
                    data: response.data,
                    cacheKey,
                    fromCache: false
                };
            } else {
                console.error('Некорректный формат ответа:', response);
                return rejectWithValue('Некорректный формат ответа от сервера');
            }
        } catch (error) {
            console.error('Ошибка при получении поставщиков:', error);
            return rejectWithValue(error.message || 'Ошибка при загрузке поставщиков');
        }
    }
);

export const fetchSupplierById = createAsyncThunk(
    'suppliers/fetchSupplierById',
    async (supplierId, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            if (state.suppliers.supplierDetails[supplierId] &&
                isCacheValid(state.suppliers.lastFetchTime[`supplier_${supplierId}`])) {
                return {
                    supplier: state.suppliers.supplierDetails[supplierId],
                    fromCache: true,
                    supplierId
                };
            }

            const response = await suppliersApi.getSupplierById(supplierId);

            // Извлекаем данные поставщика из ответа
            let supplier;

            if (response.data && response.data.user) {
                supplier = response.data.user;
            } else if (response.data) {
                supplier = response.data;
            } else if (response.user) {
                supplier = response.user;
            } else {
                supplier = response;
            }

            // Если у поставщика нет информации о компании
            if (supplier && supplier.role === 'SUPPLIER' && !supplier.supplier) {
                try {
                    // Попытка получить данные о компании поставщика
                    const companyData = await suppliersApi.getSupplierById(supplierId);
                    if (companyData && companyData.data) {
                        supplier.supplier = companyData.data;
                    }
                } catch (e) {
                    console.warn(`Не удалось получить данные о компании поставщика ${supplierId}:`, e);
                }
            }

            return {
                supplier,
                fromCache: false,
                supplierId
            };
        } catch (error) {
            console.error(`Ошибка при получении поставщика ${supplierId}:`, error);
            return rejectWithValue(error.message || 'Ошибка при загрузке данных поставщика');
        }
    }
);

export const fetchSupplierProducts = createAsyncThunk(
    'suppliers/fetchSupplierProducts',
    async (supplierId, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            if (state.suppliers.supplierProducts[supplierId] &&
                isCacheValid(state.suppliers.lastFetchTime[`products_${supplierId}`])) {
                return {
                    products: state.suppliers.supplierProducts[supplierId],
                    fromCache: true,
                    supplierId
                };
            }

            const response = await suppliersApi.getSupplierProducts(supplierId);

            let products = [];
            if (response.data && response.data.data) {
                products = response.data.data;
            } else if (response.data) {
                products = response.data;
            }

            return {
                products: Array.isArray(products) ? products : [],
                fromCache: false,
                supplierId
            };
        } catch (error) {
            console.error(`Ошибка при получении продуктов поставщика ${supplierId}:`, error);
            return rejectWithValue(error.message || 'Ошибка при загрузке продуктов поставщика');
        }
    }
);

export const fetchSupplierWithProducts = createAsyncThunk(
    'suppliers/fetchSupplierWithProducts',
    async (supplierId, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const hasValidSupplierCache = state.suppliers.supplierDetails[supplierId] &&
                isCacheValid(state.suppliers.lastFetchTime[`supplier_${supplierId}`]);
            const hasValidProductsCache = state.suppliers.supplierProducts[supplierId] &&
                isCacheValid(state.suppliers.lastFetchTime[`products_${supplierId}`]);

            if (hasValidSupplierCache && hasValidProductsCache) {
                return {
                    supplier: state.suppliers.supplierDetails[supplierId],
                    products: state.suppliers.supplierProducts[supplierId],
                    fromCache: true,
                    supplierId
                };
            }

            const response = await suppliersApi.getSupplierWithProducts(supplierId);

            const { supplier, products } = response.data;

            return {
                supplier,
                products: Array.isArray(products) ? products : [],
                fromCache: false,
                supplierId
            };
        } catch (error) {
            console.error(`Ошибка при получении данных поставщика ${supplierId}:`, error);
            return rejectWithValue(error.message || 'Ошибка при загрузке данных поставщика');
        }
    }
);

export const fetchSupplierRating = createAsyncThunk(
    'suppliers/fetchRating',
    async (supplierId, { rejectWithValue }) => {
        try {
            const response = await suppliersApi.getSupplierProductsForRating(supplierId);

            if (!response.data || !response.data.data || !Array.isArray(response.data.data.products)) {
                throw new Error('Некорректный формат ответа');
            }

            const products = response.data.data.products;

            if (products.length === 0) {
                return { supplierId, rating: 0, totalFeedbacks: 0 };
            }

            const result = calculateSupplierRating(products);

            return {
                supplierId,
                rating: result.rating,
                totalFeedbacks: result.totalFeedbacks
            };
        } catch (error) {
            return rejectWithValue(
                error.response?.data?.message ||
                error.message ||
                'Не удалось получить рейтинг поставщика'
            );
        }
    }
);
const suppliersSlice = createSlice({
    name: 'suppliers',
    initialState,
    reducers: {
        setCurrentSupplierId: (state, action) => {
            state.currentSupplierId = action.payload;
        },
        clearSupplierError: (state) => {
            state.error = null;
        },
        clearSupplierCache: (state, action) => {
            const { supplierId } = action.payload || {};

            if (supplierId) {
                delete state.lastFetchTime[`supplier_${supplierId}`];
                delete state.lastFetchTime[`products_${supplierId}`];
                delete state.supplierDetails[supplierId];
                delete state.supplierProducts[supplierId];
            } else {
                state.lastFetchTime = {};
                state.supplierDetails = {};
                state.supplierProducts = {};
            }
        },
        clearRatings: (state) => {
            state.ratings = {};
        },

        setSupplierRating: (state, action) => {
            const { supplierId, rating, totalFeedbacks } = action.payload;
            state.ratings[supplierId] = { rating, totalFeedbacks };
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchSuppliersList.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSuppliersList.fulfilled, (state, action) => {
                state.loading = false;

                if (action.payload.fromCache) return;

                const { data, cacheKey } = action.payload;

                if (data.status === 'success' && data.data) {
                    state.list = data.data.staff || [];
                    state.total = data.data.total || 0;
                    state.page = data.data.page || 1;
                    state.pages = data.data.pages || 1;

                    data.data.staff.forEach(supplier => {
                        if (supplier && supplier.id) {
                            state.supplierDetails[supplier.id] = supplier;
                            state.lastFetchTime[`supplier_${supplier.id}`] = Date.now();

                            if (supplier.supplier && supplier.supplier.products) {
                                const productsList = supplier.supplier.products.map(product => ({
                                    id: product.id,
                                    name: product.name,
                                    supplierId: supplier.id
                                }));

                                state.supplierProducts[supplier.id] = productsList;
                                state.lastFetchTime[`products_${supplier.id}`] = Date.now();
                            }
                        }
                    });

                    state.lastFetchTime[cacheKey] = Date.now();
                }
            })
            .addCase(fetchSuppliersList.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(fetchSupplierById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSupplierById.fulfilled, (state, action) => {
                state.loading = false;

                if (action.payload.fromCache) return;

                const { supplier, supplierId } = action.payload;

                state.supplierDetails[supplierId] = supplier;
                state.lastFetchTime[`supplier_${supplierId}`] = Date.now();

                const existingIndex = state.list.findIndex(item => item.id === supplierId);
                if (existingIndex !== -1) {
                    state.list[existingIndex] = supplier;
                }
            })
            .addCase(fetchSupplierById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(fetchSupplierProducts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSupplierProducts.fulfilled, (state, action) => {
                state.loading = false;

                if (action.payload.fromCache) return;

                const { products, supplierId } = action.payload;

                state.supplierProducts[supplierId] = products;
                state.lastFetchTime[`products_${supplierId}`] = Date.now();
            })
            .addCase(fetchSupplierProducts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(fetchSupplierWithProducts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSupplierWithProducts.fulfilled, (state, action) => {
                state.loading = false;

                if (action.payload.fromCache) return;

                const { supplier, products, supplierId } = action.payload;

                state.supplierDetails[supplierId] = supplier;
                state.lastFetchTime[`supplier_${supplierId}`] = Date.now();

                state.supplierProducts[supplierId] = products;
                state.lastFetchTime[`products_${supplierId}`] = Date.now();

                state.currentSupplierId = supplierId;

                const existingIndex = state.list.findIndex(item => item.id === supplierId);
                if (existingIndex !== -1) {
                    state.list[existingIndex] = supplier;
                }
            })
            .addCase(fetchSupplierWithProducts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchSupplierRating.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSupplierRating.fulfilled, (state, action) => {
                state.loading = false;
                const { supplierId } = action.meta.arg;
                const { rating, totalFeedbacks } = action.payload;

                state.ratings[supplierId] = { rating, totalFeedbacks };
            })
            .addCase(fetchSupplierRating.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Не удалось получить рейтинг поставщика';
            });
    },
});

export const { setCurrentSupplierId, clearSupplierError, setSupplierRating, clearRatings, clearSupplierCache } = suppliersSlice.actions;
export default suppliersSlice.reducer;