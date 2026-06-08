import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {categoryApi} from '@entities/category/api/categoryApi';
import {
    logCategoryProducts,
    summarizeProducts,
    summarizePagination,
    summarizeReduxProductsByCategory,
} from '@entities/category/lib/categoryProductsDebug';

const PRODUCTS_BY_CATEGORY_PAGE_SIZE = 20;

/** Единый ключ для Redux — number; иначе "1" и 1 дают разные записи в memo/cache. */
export const normalizeCategoryId = (categoryId) => {
    if (categoryId === null || categoryId === undefined || categoryId === '') {
        return null;
    }
    const numericId = Number(categoryId);
    return Number.isFinite(numericId) ? numericId : null;
};

const initialState = {
    categories: [],
    currentCategory: null,
    productsByCategory: {},
    productsPaginationByCategory: {},
    productsLoadingByCategory: {},
    productsLoadingMoreByCategory: {},
    productsErrorByCategory: {},
    isLoading: false,
    error: null,
    lastFetchTime: null,
};

const CACHE_EXPIRY_TIME = 15 * 60 * 1000; // 15 минут

const applyCategoryProductsResult = (state, { categoryId, products, pagination, page = 1 }) => {
    const normalizedId = normalizeCategoryId(categoryId);
    if (!normalizedId) {
        return;
    }

    state.productsLoadingByCategory[normalizedId] = false;
    state.productsLoadingMoreByCategory[normalizedId] = false;

    const incomingCount = Array.isArray(products) ? products.length : 0;
    const validProducts = Array.isArray(products)
        ? products.filter((product) => product?.id)
        : [];
    const droppedCount = incomingCount - validProducts.length;
    const previousCount = state.productsByCategory[normalizedId]?.length ?? 0;

    if (page === 1) {
        state.productsByCategory[normalizedId] = validProducts;
    } else {
        const existing = state.productsByCategory[normalizedId] || [];
        const existingIds = new Set(existing.map((product) => product.id));
        const newProducts = validProducts.filter((product) => !existingIds.has(product.id));
        state.productsByCategory[normalizedId] = [...existing, ...newProducts];
    }

    if (pagination) {
        state.productsPaginationByCategory[normalizedId] = {
            currentPage: pagination.currentPage,
            totalPages: pagination.totalPages,
            totalItems: pagination.totalItems,
            hasMore: pagination.hasMore,
        };
    }

    logCategoryProducts('redux.productsApplied', {
        normalizedId,
        page,
        incomingCount,
        storedCount: state.productsByCategory[normalizedId]?.length ?? 0,
        previousCount,
        droppedWithoutId: droppedCount,
        pagination: state.productsPaginationByCategory[normalizedId],
        allCategoryKeys: Object.keys(state.productsByCategory),
    });
};

const isCacheValid = (lastFetchTime) => {
    return lastFetchTime && Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
};

const handleError = (error) => {
    console.error('Category API Error:', error);

    if (error?.name === 'TypeError' && error.message.includes('undefined')) {
        return 'Ошибка формата данных от сервера. Пожалуйста, повторите попытку.';
    }

    if (error.code === 'ECONNABORTED') {
        return 'Превышено время ожидания. Проверьте подключение к сети.';
    }

    if (!error.response) {
        return 'Ошибка сети. Проверьте подключение.';
    }

    return error.response?.data?.message || 'Произошла ошибка';
};

export const createCategory = createAsyncThunk(
    'category/createCategory',
    async (categoryData, {rejectWithValue}) => {
        try {

            if (!categoryData.slug || categoryData.slug.trim() === '') {
                categoryData.slug = categoryData.name
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^\wа-яё-]/gi, '')
                    .replace(/^-+|-+$/g, '')
                    .replace(/-+/g, '-');
            }

            const response = await categoryApi.createCategory(categoryData);

            // Проверяем структуру ответа
            if (response?.status === 'success' && response?.data) {
                // Возвращаем категорию из ответа или сформированный объект
                return response.data.category || {
                    id: response.data.id || Date.now(),
                    name: categoryData.name,
                    slug: categoryData.slug,
                    description: categoryData.description,
                    ...response.data
                };
            }

            return rejectWithValue('Некорректный формат ответа от сервера');
        } catch (error) {
            console.error('Create category error:', error);

            // Если ошибка имеет формат API (со свойством errors)
            if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                const validationErrors = error.response.data.errors;
                const errorMessage = validationErrors.map(err => err.msg).join(', ');
                return rejectWithValue(errorMessage);
            }

            return rejectWithValue(handleError(error));
        }
    }
);

export const fetchCategories = createAsyncThunk(
    'categories/fetchCategories',
    async (params = {}, {rejectWithValue, getState}) => {
        try {
            const state = getState();
            const { refresh = false } = params;
            
            // Проверяем кэш если не принудительное обновление
            if (!refresh && isCacheValid(state.category.lastFetchTime) && state.category.categories && state.category.categories.length > 0) {
                return { 
                    data: state.category.categories, 
                    fromCache: true 
                };
            }

            const response = await categoryApi.getCategories();

            // Проверка разных возможных форматов ответа API
            if (response && response.status === 'success') {
                let categories = [];
                // Проверяем наличие данных в разных форматах
                if (Array.isArray(response.data)) {
                    categories = response.data;
                } else if (response.data && response.data.categories) {
                    categories = response.data.categories;
                }
                
                return { data: categories, fromCache: false };
            } else {
                console.error('Invalid categories response format:', response);
                return rejectWithValue('Некорректный формат ответа от сервера');
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const fetchCategoryById = createAsyncThunk(
    'category/fetchCategoryById',
    async (id, {rejectWithValue}) => {
        try {
            const response = await categoryApi.getCategoryById(id);

            // Проверяем структуру ответа
            if (response?.status === 'success' && response?.data) {
                return response.data.category || response.data;
            }

            return rejectWithValue('Некорректный формат ответа от сервера');
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);


export const fetchProductsByCategory = createAsyncThunk(
    'category/fetchProductsByCategory',
    async (
        {
            categoryId,
            categoryName = null,
            page = 1,
            limit = PRODUCTS_BY_CATEGORY_PAGE_SIZE,
            refresh = false,
            params = {},
        },
        { rejectWithValue, getState }
    ) => {
        try {
            const normalizedCategoryId = normalizeCategoryId(categoryId);
            if (!normalizedCategoryId) {
                logCategoryProducts('thunk.reject.invalidCategoryId', {
                    rawCategoryId: categoryId,
                    categoryName,
                    page,
                    limit,
                });
                return rejectWithValue('Некорректный идентификатор категории');
            }

            const requestParams = {
                page,
                limit,
                ...params,
            };

            logCategoryProducts('thunk.start', {
                rawCategoryId: categoryId,
                normalizedCategoryId,
                categoryName,
                page,
                limit,
                refresh,
                requestParams,
            });

            const response = await categoryApi.getProductsByCategory(normalizedCategoryId, requestParams);

            const buildPagination = (serverPagination, productsCount) => {
                const currentPage = serverPagination?.page || page;
                const totalPages = serverPagination?.totalPages || 1;
                const totalItems = serverPagination?.totalItems ?? productsCount;
                const hasMore = currentPage < totalPages;

                return {
                    currentPage,
                    totalPages,
                    totalItems,
                    hasMore: serverPagination?.hasMore ?? hasMore,
                };
            };

            const matchesCategory = (product) => {
                if (!Array.isArray(product?.categories)) {
                    return false;
                }

                const normalizedName = typeof categoryName === 'string'
                    ? categoryName.trim().toLowerCase()
                    : '';

                return product.categories.some((cat) => {
                    const catId = normalizeCategoryId(cat?.id);
                    if (catId === normalizedCategoryId) {
                        return true;
                    }
                    if (!normalizedName) {
                        return false;
                    }
                    const catName = (cat?.name || '').trim().toLowerCase();
                    const catDescription = (cat?.description || '').trim().toLowerCase();
                    return catName === normalizedName
                        || catDescription === normalizedName;
                });
            };

            const pickFallbackProducts = () => {
                const catalogProducts = getState()?.products?.items;
                if (!Array.isArray(catalogProducts) || catalogProducts.length === 0) {
                    return [];
                }
                return catalogProducts.filter(matchesCategory);
            };

            if (response && response.status === 'success') {
                if (response.data && response.data.products) {
                    const apiProducts = response.data.products || [];
                    let products = apiProducts;
                    let usedFallback = false;

                    logCategoryProducts('thunk.apiProducts', {
                        normalizedCategoryId,
                        categoryName,
                        page,
                        apiProducts: summarizeProducts(apiProducts),
                        pagination: summarizePagination(response.data.pagination),
                    });

                    if (page === 1 && products.length === 0) {
                        products = pickFallbackProducts();
                        usedFallback = products.length > 0;
                        logCategoryProducts('thunk.fallbackCatalog', {
                            normalizedCategoryId,
                            categoryName,
                            fallback: summarizeProducts(products),
                            catalogTotal: getState()?.products?.items?.length ?? 0,
                        });
                    }

                    const pagination = buildPagination(response.data.pagination, products.length);
                    const withoutId = products.filter((product) => !product?.id).length;

                    logCategoryProducts('thunk.return', {
                        normalizedCategoryId,
                        categoryName,
                        page,
                        usedFallback,
                        finalProducts: summarizeProducts(products),
                        pagination: summarizePagination(pagination),
                        droppedWithoutId: withoutId,
                    });

                    return {
                        categoryId: normalizedCategoryId,
                        products,
                        pagination,
                        page,
                        refresh,
                    };
                }

                if (response.data && Array.isArray(response.data)) {
                    const products = response.data;
                    const inferredHasMore = products.length >= limit;

                    logCategoryProducts('thunk.return.arrayFormat', {
                        normalizedCategoryId,
                        products: summarizeProducts(products),
                    });

                    return {
                        categoryId: normalizedCategoryId,
                        products,
                        pagination: {
                            currentPage: page,
                            totalPages: inferredHasMore ? page + 1 : page,
                            totalItems: products.length,
                            hasMore: inferredHasMore,
                        },
                        page,
                        refresh,
                    };
                }
            }

            logCategoryProducts('thunk.invalidResponse', {
                normalizedCategoryId,
                responseStatus: response?.status,
                responseKeys: response ? Object.keys(response) : [],
                dataKeys: response?.data ? Object.keys(response.data) : [],
            });
            return rejectWithValue('Некорректный формат ответа от сервера');
        } catch (error) {
            logCategoryProducts('thunk.error', {
                normalizedCategoryId: normalizeCategoryId(categoryId),
                categoryName,
                page,
                message: error?.message || String(error),
            });
            return rejectWithValue(handleError(error));
        }
    }
);

export const updateCategory = createAsyncThunk(
    'category/updateCategory',
    async ({id, categoryData}, {rejectWithValue, getState}) => {
        try {
            const response = await categoryApi.updateCategory(id, categoryData);

            // Проверяем структуру ответа
            if (response?.status === 'success' && response?.data) {
                // Возвращаем категорию из ответа или объединяем с данными из запроса
                return response.data.category || {
                    id: id,
                    ...categoryData,
                    ...response.data
                };
            }

            // Если ответ некорректный, но запрос успешен, создаем объект категории из отправленных данных
            // и ID, который мы уже знаем
            const currentState = getState();
            const existingCategory = currentState.category.categories.find(cat => cat.id === id);

            if (existingCategory) {
                return {
                    ...existingCategory,
                    ...categoryData
                };
            }

            return rejectWithValue('Некорректный формат ответа от сервера');
        } catch (error) {
            console.error('Update category error:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const deleteCategory = createAsyncThunk(
    'category/deleteCategory',
    async (id, {rejectWithValue}) => {
        try {
            const response = await categoryApi.deleteCategory(id);

            if (response?.status === 'success') {
                return id;
            }

            return rejectWithValue('Не удалось удалить категорию');
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

const categorySlice = createSlice({
        name: 'category',
        initialState,
        reducers: {
            clearError: (state) => {
                state.error = null;
            },
            setCurrentCategory: (state, action) => {
                state.currentCategory = action.payload;
            },
            clearCurrentCategory: (state) => {
                state.currentCategory = null;
            },
            setCategories: (state, action) => {
                state.categories = action.payload;
                state.isLoading = false;
                state.error = null;
            },
            clearProductsByCategory: (state, action) => {
                const normalizedId = normalizeCategoryId(action.payload);
                if (normalizedId) {
                    delete state.productsByCategory[normalizedId];
                    delete state.productsPaginationByCategory[normalizedId];
                    delete state.productsLoadingByCategory[normalizedId];
                    delete state.productsLoadingMoreByCategory[normalizedId];
                    delete state.productsErrorByCategory[normalizedId];
                } else {
                    state.productsByCategory = {};
                    state.productsPaginationByCategory = {};
                    state.productsLoadingByCategory = {};
                    state.productsLoadingMoreByCategory = {};
                    state.productsErrorByCategory = {};
                }
            },
            setCategoryProductsLoading: (state, action) => {
                const { categoryId, page = 1 } = action.payload || {};
                const normalizedId = normalizeCategoryId(categoryId);
                if (!normalizedId) {
                    return;
                }

                logCategoryProducts('redux.loading', { normalizedId, page });

                if (page === 1) {
                    state.productsLoadingByCategory[normalizedId] = true;
                } else {
                    state.productsLoadingMoreByCategory[normalizedId] = true;
                }
                delete state.productsErrorByCategory[normalizedId];
            },
            setCategoryProductsResult: (state, action) => {
                applyCategoryProductsResult(state, action.payload);
            },
            setCategoryProductsError: (state, action) => {
                const { categoryId, page = 1, error } = action.payload || {};
                const normalizedId = normalizeCategoryId(categoryId);
                if (!normalizedId) {
                    return;
                }

                if (page === 1) {
                    state.productsLoadingByCategory[normalizedId] = false;
                } else {
                    state.productsLoadingMoreByCategory[normalizedId] = false;
                }

                logCategoryProducts('redux.error', { normalizedId, page, error });
                state.productsErrorByCategory[normalizedId] = error;
            },
        },

        extraReducers: (builder) => {
            const setPending = (state) => {
                state.isLoading = true;
                state.error = null;
            };
            const setRejected = (state, action) => {
                state.isLoading = false;
                state.error = action.payload || 'Произошла неизвестная ошибка';
            };

            builder
                .addCase(createCategory.pending, setPending)
                .addCase(createCategory.fulfilled, (state, action) => {
                    state.isLoading = false;
                    state.categories.push(action.payload);
                })
                .addCase(createCategory.rejected, setRejected)

                .addCase(fetchCategories.pending, setPending)
                .addCase(fetchCategories.fulfilled, (state, action) => {
                    state.isLoading = false;
                    state.error = null;

                    if (!action.payload.fromCache) {
                        state.categories = action.payload.data;
                        state.lastFetchTime = Date.now();
                    }
                })
                .addCase(fetchCategories.rejected, setRejected)

                .addCase(fetchCategoryById.pending, setPending)
                .addCase(fetchCategoryById.fulfilled, (state, action) => {
                    state.isLoading = false;
                    state.currentCategory = action.payload;
                })
                .addCase(fetchCategoryById.rejected, setRejected)

                .addCase(fetchProductsByCategory.pending, (state, action) => {
                    const { categoryId, categoryName, page = 1 } = action.meta.arg || {};
                    const normalizedId = normalizeCategoryId(categoryId);
                    if (!normalizedId) {
                        return;
                    }

                    logCategoryProducts('redux.pending', {
                        normalizedId,
                        categoryName,
                        page,
                        previousCount: state.productsByCategory[normalizedId]?.length ?? 0,
                    });

                    if (page === 1) {
                        state.productsLoadingByCategory[normalizedId] = true;
                    } else {
                        state.productsLoadingMoreByCategory[normalizedId] = true;
                    }
                    delete state.productsErrorByCategory[normalizedId];
                })
                .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
                    applyCategoryProductsResult(state, action.payload);
                })
                .addCase(fetchProductsByCategory.rejected, (state, action) => {
                    const { categoryId, categoryName, page = 1 } = action.meta.arg || {};
                    const normalizedId = normalizeCategoryId(categoryId);
                    if (!normalizedId) {
                        return;
                    }

                    if (page === 1) {
                        state.productsLoadingByCategory[normalizedId] = false;
                    } else {
                        state.productsLoadingMoreByCategory[normalizedId] = false;
                    }

                    logCategoryProducts('redux.rejected', {
                        normalizedId,
                        categoryName,
                        page,
                        aborted: !!action.meta.aborted,
                        error: action.payload,
                    });

                    if (action.meta.aborted) {
                        return;
                    }

                    state.productsErrorByCategory[normalizedId] = action.payload;
                })

                .addCase(updateCategory.pending, setPending)
                .addCase(updateCategory.fulfilled, (state, action) => {
                    state.isLoading = false;
                    const index = state.categories.findIndex(
                        (cat) => cat.id === action.payload.id
                    );
                    if (index !== -1) {
                        state.categories[index] = action.payload;
                    }
                    if (state.currentCategory?.id === action.payload.id) {
                        state.currentCategory = action.payload;
                    }
                })
                .addCase(updateCategory.rejected, setRejected)

                .addCase(deleteCategory.pending, setPending)
                .addCase(deleteCategory.fulfilled, (state, action) => {
                    state.isLoading = false;
                    state.categories = state.categories.filter(
                        (cat) => cat.id !== action.payload
                    );
                    if (state.currentCategory?.id === action.payload) {
                        state.currentCategory = null;
                    }
                })
                .addCase(deleteCategory.rejected, setRejected);
        }
    }
);

export const {
    clearError,
    setCurrentCategory,
    clearCurrentCategory,
    setCategories,
    clearProductsByCategory,
    setCategoryProductsLoading,
    setCategoryProductsResult,
    setCategoryProductsError,
} = categorySlice.actions;

// Экспортируем reducer как default и именованный экспорт для поддержки совместимости
export const categoryReducer = categorySlice.reducer;
export default categorySlice.reducer;