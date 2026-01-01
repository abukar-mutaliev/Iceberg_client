import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AppFeedbackApi from '../api/appFeedbackApi';

const initialState = {
    feedback: null,
    allFeedbacks: [],
    loading: false,
    loadingAll: false,
    submitting: false,
    error: null,
    lastFetchTime: null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

/**
 * Получить свой отзыв о приложении
 */
export const fetchMyAppFeedback = createAsyncThunk(
    'appFeedback/fetchMyAppFeedback',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            
            // Проверка кэша
            if (
                state.appFeedback.feedback &&
                state.appFeedback.lastFetchTime &&
                Date.now() - state.appFeedback.lastFetchTime < CACHE_DURATION
            ) {
                return state.appFeedback.feedback;
            }

            const response = await AppFeedbackApi.getMyFeedback();
            
            if (response?.status === 'success') {
                return response.data;
            }
            
            // Если отзыв не найден (404), возвращаем null
            if (response?.status === 'error' && response?.message?.includes('не найден')) {
                return null;
            }
            
            throw new Error(response?.message || 'Не удалось загрузить отзыв');
        } catch (error) {
            // Если это 404 (отзыв не найден), возвращаем null - это нормальная ситуация
            const is404 = error.response?.status === 404 || 
                         error?.status === 404 ||
                         (error.response?.data?.status === 'error' && 
                          error.response?.data?.message?.includes('не найден')) ||
                         (error?.status === 'error' && 
                          error?.message?.includes('не найден'));
            
            if (is404) {
                // Не логируем 404 - это нормально, если отзыва еще нет
                // Просто возвращаем null без логирования
                return null;
            }
            
            // Логируем только реальные ошибки, не 404
            console.error('Ошибка при загрузке отзыва о приложении:', error);
            return rejectWithValue(error.response?.data?.message || error.message || 'Не удалось загрузить отзыв');
        }
    }
);

/**
 * Создать отзыв о приложении
 */
export const createAppFeedback = createAsyncThunk(
    'appFeedback/createAppFeedback',
    async (feedbackData, { rejectWithValue }) => {
        try {
            const response = await AppFeedbackApi.createFeedback(feedbackData);
            
            if (response?.status === 'success') {
                return response.data;
            }
            
            throw new Error(response?.message || 'Не удалось создать отзыв');
        } catch (error) {
            console.error('Ошибка при создании отзыва о приложении:', error);
            
            const errorMessage = error.response?.data?.message || 
                                error.message || 
                                'Не удалось создать отзыв';
            
            return rejectWithValue(errorMessage);
        }
    }
);

/**
 * Обновить отзыв о приложении
 */
export const updateAppFeedback = createAsyncThunk(
    'appFeedback/updateAppFeedback',
    async ({ id, ...feedbackData }, { rejectWithValue }) => {
        try {
            const response = await AppFeedbackApi.updateFeedback(id, feedbackData);
            
            if (response?.status === 'success') {
                return response.data;
            }
            
            throw new Error(response?.message || 'Не удалось обновить отзыв');
        } catch (error) {
            console.error('Ошибка при обновлении отзыва о приложении:', error);
            
            const errorMessage = error.response?.data?.message || 
                                error.message || 
                                'Не удалось обновить отзыв';
            
            return rejectWithValue(errorMessage);
        }
    }
);

/**
 * Удалить отзыв о приложении
 */
export const deleteAppFeedback = createAsyncThunk(
    'appFeedback/deleteAppFeedback',
    async (id, { rejectWithValue }) => {
        try {
            const response = await AppFeedbackApi.deleteFeedback(id);
            
            if (response?.status === 'success') {
                return { id };
            }
            
            throw new Error(response?.message || 'Не удалось удалить отзыв');
        } catch (error) {
            console.error('Ошибка при удалении отзыва о приложении:', error);
            
            const errorMessage = error.response?.data?.message || 
                                error.message || 
                                'Не удалось удалить отзыв';
            
            return rejectWithValue(errorMessage);
        }
    }
);

/**
 * Получить все отзывы о приложении (для всех пользователей)
 */
export const fetchAllAppFeedbacks = createAsyncThunk(
    'appFeedback/fetchAllAppFeedbacks',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await AppFeedbackApi.getAllFeedbacks(params);
            
            if (response?.status === 'success') {
                return response.data || [];
            }
            
            throw new Error(response?.message || 'Не удалось загрузить отзывы');
        } catch (error) {
            console.error('Ошибка при загрузке всех отзывов о приложении:', error);
            
            const errorMessage = error.response?.data?.message || 
                                error.message || 
                                'Не удалось загрузить отзывы';
            
            return rejectWithValue(errorMessage);
        }
    }
);

const appFeedbackSlice = createSlice({
    name: 'appFeedback',
    initialState,
    reducers: {
        clearAppFeedback: (state) => {
            state.feedback = null;
            state.error = null;
            state.lastFetchTime = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // fetchMyAppFeedback
        builder
            .addCase(fetchMyAppFeedback.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMyAppFeedback.fulfilled, (state, action) => {
                state.loading = false;
                state.feedback = action.payload; // null если отзыва нет - это нормально
                state.error = null; // Очищаем ошибку при успешной загрузке (даже если отзыва нет)
                state.lastFetchTime = Date.now();
            })
            .addCase(fetchMyAppFeedback.rejected, (state, action) => {
                state.loading = false;
                // Устанавливаем ошибку только если это не 404 (404 - это нормально, отзыва просто нет)
                if (action.payload && !action.payload.includes('не найден')) {
                    state.error = action.payload;
                } else {
                    state.error = null;
                    state.feedback = null; // Явно устанавливаем null для 404
                }
            });

        // createAppFeedback
        builder
            .addCase(createAppFeedback.pending, (state) => {
                state.submitting = true;
                state.error = null;
            })
            .addCase(createAppFeedback.fulfilled, (state, action) => {
                state.submitting = false;
                state.feedback = action.payload;
                state.lastFetchTime = Date.now();
            })
            .addCase(createAppFeedback.rejected, (state, action) => {
                state.submitting = false;
                state.error = action.payload;
            });

        // updateAppFeedback
        builder
            .addCase(updateAppFeedback.pending, (state) => {
                state.submitting = true;
                state.error = null;
            })
            .addCase(updateAppFeedback.fulfilled, (state, action) => {
                state.submitting = false;
                state.feedback = action.payload;
                state.lastFetchTime = Date.now();
            })
            .addCase(updateAppFeedback.rejected, (state, action) => {
                state.submitting = false;
                state.error = action.payload;
            });

        // deleteAppFeedback
        builder
            .addCase(deleteAppFeedback.pending, (state) => {
                state.submitting = true;
                state.error = null;
            })
            .addCase(deleteAppFeedback.fulfilled, (state) => {
                state.submitting = false;
                state.feedback = null;
                state.lastFetchTime = null;
            })
            .addCase(deleteAppFeedback.rejected, (state, action) => {
                state.submitting = false;
                state.error = action.payload;
            });

        // fetchAllAppFeedbacks
        builder
            .addCase(fetchAllAppFeedbacks.pending, (state) => {
                state.loadingAll = true;
                state.error = null;
            })
            .addCase(fetchAllAppFeedbacks.fulfilled, (state, action) => {
                state.loadingAll = false;
                state.allFeedbacks = action.payload || [];
                state.error = null;
            })
            .addCase(fetchAllAppFeedbacks.rejected, (state, action) => {
                state.loadingAll = false;
                state.error = action.payload;
            });
    },
});

export const { clearAppFeedback, clearError } = appFeedbackSlice.actions;
export const appFeedbackSliceReducer = appFeedbackSlice.reducer;
export { appFeedbackSlice };

