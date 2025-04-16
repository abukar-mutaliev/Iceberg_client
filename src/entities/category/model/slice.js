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
            const response = await categoryApi.createCategory(categoryData);
            return response.data.data.category;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

export const fetchCategories = createAsyncThunk(
    'categories/fetchCategories',
    async (_, {rejectWithValue}) => {
        try {
            const response = await categoryApi.getCategories();
            console.log('Raw API response in fetchCategories:', response);
            console.log('Типы данных:', {
                responseType: typeof response,
                hasData: 'data' in response,
                dataType: typeof response.data,
                hasCategories: response.data && 'categories' in response.data,
                categoriesType: response.data && response.data.categories ? Array.isArray(response.data.categories) : null
            });

            if (response && response.status === 'success' && response.data && response.data.categories) {
                console.log('Возвращаемые категории:', response.data.categories);
                return response.data.categories;
            } else {
                console.error('Invalid response format:', response);
                return rejectWithValue('Некорректный формат ответа от сервера');
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            return rejectWithValue(error.message || 'Ошибка при получении категорий');
        }
    }
);

export const fetchCategoryById = createAsyncThunk(
    'category/fetchCategoryById',
    async (id, {rejectWithValue}) => {
        try {
            const response = await categoryApi.getCategoryById(id);
            return response.data.data.category;
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
            if (response && response.status === 'success' && response.data) {
                return {
                    categoryId,
                    products: response.data.products || [],
                    pagination: response.data.pagination || {}
                };
            } else {
                console.error('Invalid response format:', response);
                return rejectWithValue('Некорректный формат ответа от сервера');
            }
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

export const updateCategory = createAsyncThunk(
    'category/updateCategory',
    async ({id, categoryData}, {rejectWithValue}) => {
        try {
            const response = await categoryApi.updateCategory(id, categoryData);
            return response.data.data.category;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

export const deleteCategory = createAsyncThunk(
    'category/deleteCategory',
    async (id, {rejectWithValue}) => {
        try {
            await categoryApi.deleteCategory(id);
            return id;
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
                state.error = action.payload;
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
    clearProductsByCategory
} = categorySlice.actions;
export default categoryReducer = categorySlice.reducer;