import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { feedbackApi } from '../api/feedbackApi';

const initialState = {
    items: {},
    cacheTimestamps: {},
    loading: false,
    error: null,
    photoUploading: false,
    photoError: null,
    loadedProductIds: [],
    supplierLoading: false,
    supplierError: null,
    supplierLoadedIds: []
};

export const fetchProductFeedbacks = createAsyncThunk(
    'feedback/fetchProductFeedbacks',
    async (productId, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const alreadyLoaded = state.feedback.loadedProductIds.includes(productId);
            const isLoading = state.feedback.loading;
            const cacheTimestamp = state.feedback.cacheTimestamps[productId];

            const CACHE_DURATION = 5 * 60 * 1000;
            const isCacheValid = cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION);

            if (alreadyLoaded && !isLoading && isCacheValid) {
                return { productId, feedbacks: state.feedback.items[productId] || [] };
            }

            const userData = {
                ...state.auth?.user,
                profile: state.profile?.data,
            };

            const response = await feedbackApi.getProductFeedbacks(productId, userData);

            return { productId, feedbacks: response.data };
        } catch (error) {
            console.error('Ошибка при загрузке отзывов:', error);
            return rejectWithValue(error.message || 'Не удалось загрузить отзывы');
        }
    }
);

export const fetchSupplierFeedbacks = createAsyncThunk(
    'feedback/fetchSupplierFeedbacks',
    async (supplierId, { rejectWithValue, getState, dispatch }) => {
        try {
            const state = getState();
            const supplierProducts = state.suppliers.supplierProducts[supplierId] || [];

            if (!supplierProducts.length) {
                console.log('Нет продуктов для загрузки отзывов');
                return { supplierId, feedbacks: [] };
            }

            console.log(`Загрузка отзывов для ${supplierProducts.length} продуктов поставщика`);

            // Запускаем загрузку отзывов для каждого продукта поставщика
            const feedbackPromises = supplierProducts.map(product =>
                dispatch(fetchProductFeedbacks(product.id))
            );

            await Promise.all(feedbackPromises);

            // После загрузки всех отзывов, возвращаем успешный результат
            return { supplierId, success: true };
        } catch (error) {
            console.error('Ошибка при загрузке отзывов поставщика:', error);
            return rejectWithValue(error.message || 'Не удалось загрузить отзывы поставщика');
        }
    }
);


export const createFeedback = createAsyncThunk(
    'feedback/createFeedback',
    async (feedbackData, { rejectWithValue, dispatch, getState }) => {
        try {
            const userData = {
                ...getState().auth?.user,
                profile: getState().profile?.data,
            };

            const state = getState();
            const productId = feedbackData.productId;
            const clientId = userData?.profile?.id;

            console.log('createFeedback:', { productId, feedbackData });

            if (state.feedback.loadedProductIds.includes(productId) && clientId) {
                const feedbacks = state.feedback.items[productId] || [];
                const hasExistingFeedback = feedbacks.some(
                    feedback => feedback.clientId === clientId
                );

                if (hasExistingFeedback) {
                    return rejectWithValue('Вы уже оставили отзыв к этому продукту');
                }
            }

            const { photos, ...feedbackInfo } = feedbackData;

            const response = await feedbackApi.createFeedback(feedbackInfo, userData);
            console.log('Created feedback:', response.data);

            if (photos && photos.length > 0 && response.data && response.data.id) {
                const feedbackId = response.data.id;
                await feedbackApi.uploadFeedbackPhotos(feedbackId, photos);
                console.log('Photos uploaded for feedback:', feedbackId);
            }

            // Инвалидируем кэш для productId
            dispatch(invalidateFeedbackCache(productId));

            // Теперь fetchProductFeedbacks отправит новый запрос
            await dispatch(fetchProductFeedbacks(feedbackData.productId));

            return { productId, feedback: response.data };
        } catch (error) {
            if (error.response && error.response.data) {
                const errorMessage = error.response.data.message;
                if (errorMessage && errorMessage.includes('уже оставили отзыв')) {
                    return rejectWithValue('Вы уже оставили отзыв к этому продукту');
                }
            }
            return rejectWithValue(error.message || 'Не удалось создать отзыв');
        }
    }
);

export const updateFeedback = createAsyncThunk(
    'feedback/updateFeedback',
    async ({ id, feedbackData, productId }, { rejectWithValue, dispatch, getState }) => {
        try {
            const userData = {
                ...getState().auth?.user,
                profile: getState().profile?.data,
            };

            const response = await feedbackApi.updateFeedback(id, feedbackData, userData);

            dispatch(fetchProductFeedbacks(productId));

            return { productId, feedback: response.data };
        } catch (error) {
            console.error(`Ошибка при обновлении отзыва ${id}:`, error);
            return rejectWithValue(error.message || 'Не удалось обновить отзыв');
        }
    }
);

export const deleteFeedback = createAsyncThunk(
    'feedback/deleteFeedback',
    async ({ id, productId }, { rejectWithValue, dispatch, getState }) => {
        try {
            await feedbackApi.deleteFeedback(id);

            dispatch(fetchProductFeedbacks(productId));

            return { id, productId };
        } catch (error) {
            console.error(`Ошибка при удалении отзыва ${id}:`, error);
            return rejectWithValue(error.message || 'Не удалось удалить отзыв');
        }
    }
);

export const uploadFeedbackPhotos = createAsyncThunk(
    'feedback/uploadFeedbackPhotos',
    async ({ feedbackId, photos, productId }, { rejectWithValue, dispatch, getState }) => {
        try {
            await feedbackApi.uploadFeedbackPhotos(feedbackId, photos);

            dispatch(invalidateFeedbackCache(productId));

            await dispatch(fetchProductFeedbacks(productId));

            return { feedbackId, success: true };
        } catch (error) {
            console.error(`Ошибка при загрузке фотографий к отзыву ${feedbackId}:`, error);
            return rejectWithValue(error.message || 'Не удалось загрузить фотографии');
        }
    }
);

export const deleteFeedbackPhoto = createAsyncThunk(
    'feedback/deleteFeedbackPhoto',
    async ({ feedbackId, photoIndex, productId }, { rejectWithValue, dispatch, getState }) => {
        try {
            await feedbackApi.deleteFeedbackPhoto(feedbackId, photoIndex);

            dispatch(fetchProductFeedbacks(productId));

            return { feedbackId, photoIndex };
        } catch (error) {
            console.error(`Ошибка при удалении фотографии ${photoIndex} из отзыва ${feedbackId}:`, error);
            return rejectWithValue(error.message || 'Не удалось удалить фотографию');
        }
    }
);

const feedbackSlice = createSlice({
    name: 'feedback',
    initialState,
    reducers: {
        clearFeedbacks: (state) => {
            state.items = {};
            state.loadedProductIds = [];
            state.cacheTimestamps = {};
        },
        resetFeedbackLoadingState: (state) => {
            state.loading = false;
            state.error = null;
        },
        invalidateFeedbackCache: (state, action) => {
            const productId = action.payload;
            delete state.items[productId];
            delete state.cacheTimestamps[productId];
            state.loadedProductIds = state.loadedProductIds.filter(id => id !== productId);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProductFeedbacks.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProductFeedbacks.fulfilled, (state, action) => {
                const { productId, feedbacks } = action.payload;
                state.loading = false;
                state.items[productId] = feedbacks;
                state.cacheTimestamps[productId] = Date.now();

                if (!state.loadedProductIds.includes(productId)) {
                    state.loadedProductIds.push(productId);
                }
            })
            .addCase(fetchProductFeedbacks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(fetchSupplierFeedbacks.pending, (state) => {
                state.supplierLoading = true; // Можно добавить отдельное поле для отслеживания загрузки по поставщику
                state.supplierError = null;
            })
            .addCase(fetchSupplierFeedbacks.fulfilled, (state, action) => {
                state.supplierLoading = false;
                // Можно добавить информацию о том, что отзывы поставщика были загружены
                state.supplierLoadedIds = state.supplierLoadedIds || [];
                const supplierId = action.meta.arg; // Получаем ID поставщика из аргументов
                if (!state.supplierLoadedIds.includes(supplierId)) {
                    state.supplierLoadedIds.push(supplierId);
                }
            })
            .addCase(fetchSupplierFeedbacks.rejected, (state, action) => {
                state.supplierLoading = false;
                state.supplierError = action.payload;
            })

            .addCase(createFeedback.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createFeedback.fulfilled, (state, action) => {
                state.loading = false;
                const { productId, feedback } = action.payload;
                if (state.items[productId]) {
                    state.items[productId].push(feedback);
                } else {
                    state.items[productId] = [feedback];
                }
            })
            .addCase(createFeedback.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                const { productId } = action.meta.arg;
                delete state.items[productId];
                delete state.cacheTimestamps[productId];
                state.loadedProductIds = state.loadedProductIds.filter(id => id !== productId);
            })

            .addCase(updateFeedback.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateFeedback.fulfilled, (state, action) => {
                state.loading = false;
                const { productId, feedback } = action.payload;
                if (state.items[productId]) {
                    const index = state.items[productId].findIndex(f => f.id === feedback.id);
                    if (index !== -1) {
                        state.items[productId][index] = feedback;
                    }
                }
                state.cacheTimestamps[productId] = Date.now();
            })
            .addCase(updateFeedback.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                const { productId } = action.meta.arg;
                delete state.items[productId];
                delete state.cacheTimestamps[productId];
                state.loadedProductIds = state.loadedProductIds.filter(id => id !== productId);
            })

            .addCase(deleteFeedback.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteFeedback.fulfilled, (state, action) => {
                state.loading = false;
                const { id, productId } = action.payload;
                if (state.items[productId]) {
                    state.items[productId] = state.items[productId].filter(f => f.id !== id);
                }
                state.cacheTimestamps[productId] = Date.now();
            })
            .addCase(deleteFeedback.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                const { productId } = action.meta.arg;
                delete state.items[productId];
                delete state.cacheTimestamps[productId];
                state.loadedProductIds = state.loadedProductIds.filter(id => id !== productId);
            })

            .addCase(uploadFeedbackPhotos.pending, (state) => {
                state.photoUploading = true;
                state.photoError = null;
            })
            .addCase(uploadFeedbackPhotos.fulfilled, (state) => {
                state.photoUploading = false;
            })
            .addCase(uploadFeedbackPhotos.rejected, (state, action) => {
                state.photoUploading = false;
                state.photoError = action.payload;
            })

            .addCase(deleteFeedbackPhoto.pending, (state) => {
                state.photoUploading = true;
                state.photoError = null;
            })
            .addCase(deleteFeedbackPhoto.fulfilled, (state) => {
                state.photoUploading = false;
            })
            .addCase(deleteFeedbackPhoto.rejected, (state, action) => {
                state.photoUploading = false;
                state.photoError = action.payload;
            });
    },
});

export const { clearFeedbacks, resetFeedbackLoadingState, invalidateFeedbackCache } = feedbackSlice.actions;
export default feedbackSlice.reducer;