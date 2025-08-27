import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {categoryApi} from '@entities/category/api/categoryApi';

const initialState = {
    categories: [],
    currentCategory: null,
    productsByCategory: {},
    isLoading: false,
    error: null,
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
    async (_, {rejectWithValue}) => {
        try {
            const response = await categoryApi.getCategories();

            // Проверка разных возможных форматов ответа API
            if (response && response.status === 'success') {
                // Проверяем наличие данных в разных форматах
                if (Array.isArray(response.data)) {
                    return response.data;
                }
                
                if (response.data && response.data.categories) {
                    return response.data.categories;
                }
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
    async ({categoryId, params}, {rejectWithValue}) => {
        try {
            const response = await categoryApi.getProductsByCategory(categoryId, params);
            
            // Проверяем разные возможные форматы ответа API
            if (response && response.status === 'success') {
                // Вариант 1: { data: { products: [...], pagination: {...} } }
                if (response.data && response.data.products) {
                    return {
                        categoryId,
                        products: response.data.products || [],
                        pagination: response.data.pagination || {}
                    };
                }
                
                // Вариант 2: { data: [...] } - массив продуктов напрямую
                if (response.data && Array.isArray(response.data)) {
                    return {
                        categoryId,
                        products: response.data,
                        pagination: {}
                    };
                }
            }
            
            console.error('Invalid response format:', response);
            return rejectWithValue('Некорректный формат ответа от сервера');
        } catch (error) {
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
                if (action.payload) {
                    delete state.productsByCategory[action.payload];
                } else {
                    state.productsByCategory = {};
                }
            }
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

                    state.categories = action.payload;
                })
                .addCase(fetchCategories.rejected, setRejected)

                .addCase(fetchCategoryById.pending, setPending)
                .addCase(fetchCategoryById.fulfilled, (state, action) => {
                    state.isLoading = false;
                    state.currentCategory = action.payload;
                })
                .addCase(fetchCategoryById.rejected, setRejected)

                .addCase(fetchProductsByCategory.pending, (state) => {
                    state.productsLoading = true;
                    state.productsError = null;
                })
                .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
                    state.productsLoading = false;
                    state.productsByCategory[action.payload.categoryId] = action.payload.products;
                })
                .addCase(fetchProductsByCategory.rejected, (state, action) => {
                    state.productsLoading = false;
                    state.productsError = action.payload;
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
    clearProductsByCategory
} = categorySlice.actions;

// Экспортируем reducer как default и именованный экспорт для поддержки совместимости
export const categoryReducer = categorySlice.reducer;
export default categorySlice.reducer;