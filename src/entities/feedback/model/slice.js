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
    async (supplierId, { rejectWithValue }) => {
        try {
            console.log(`🔄 Загрузка всех отзывов для поставщика ${supplierId} напрямую с сервера`);
            
            // Загружаем ВСЕ отзывы поставщика одним запросом с сервера
            const response = await feedbackApi.getSupplierFeedbacks(supplierId);
            
            if (response && response.status === 'success' && Array.isArray(response.data)) {
                console.log(`✅ Получено ${response.data.length} отзывов для поставщика ${supplierId}`);
                
                // Группируем отзывы по productId для сохранения в store
                const feedbacksByProduct = {};
                response.data.forEach(feedback => {
                    const productId = feedback.productId;
                    if (!feedbacksByProduct[productId]) {
                        feedbacksByProduct[productId] = [];
                    }
                    feedbacksByProduct[productId].push(feedback);
                });
                
                return { 
                    supplierId, 
                    feedbacks: response.data,
                    feedbacksByProduct 
                };
            }

            console.log('⚠️ Нет отзывов для поставщика');
            return { supplierId, feedbacks: [], feedbacksByProduct: {} };
        } catch (error) {
            console.error('❌ Ошибка при загрузке отзывов поставщика:', error);
            return rejectWithValue(error.message || 'Не удалось загрузить отзывы поставщика');
        }
    }
);

export const createFeedback = createAsyncThunk(
    'feedback/createFeedback',
    async (feedbackData, { rejectWithValue, dispatch, getState }) => {
        try {
            const state = getState();
            const userData = {
                ...state.auth?.user,
                profile: state.profile?.data,
            };

            const productId = feedbackData.productId;
            const clientId = userData?.profile?.id;

            console.log('createFeedback:', { productId, feedbackData });

            // Проверяем существующие отзывы
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

            // Создаем отзыв
            const response = await feedbackApi.createFeedback(feedbackInfo, userData);
            console.log('Created feedback:', response.data);

            // Загружаем фотографии, если они есть
            if (photos && photos.length > 0 && response.data && response.data.id) {
                const feedbackId = response.data.id;
                try {
                    await feedbackApi.uploadFeedbackPhotos(feedbackId, photos);
                    console.log('Photos uploaded for feedback:', feedbackId);
                } catch (photoError) {
                    console.warn('Ошибка загрузки фотографий:', photoError);
                    // Не прерываем выполнение, если фото не загрузились
                }
            }

            // Инвалидируем кэш для productId
            dispatch(invalidateFeedbackCache(productId));

            // Перезагружаем отзывы
            await dispatch(fetchProductFeedbacks(productId));

            return { productId, feedback: response.data };
        } catch (error) {
            console.error('Ошибка создания отзыва:', error);

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

            // Инвалидируем кэш и перезагружаем отзывы
            dispatch(invalidateFeedbackCache(productId));
            await dispatch(fetchProductFeedbacks(productId));

            return { productId, feedback: response.data };
        } catch (error) {
            console.error(`Ошибка при обновлении отзыва ${id}:`, error);
            return rejectWithValue(error.message || 'Не удалось обновить отзыв');
        }
    }
);

export const deleteFeedback = createAsyncThunk(
    'feedback/deleteFeedback',
    async ({ id, productId }, { rejectWithValue, dispatch }) => {
        try {
            await feedbackApi.deleteFeedback(id);

            // Инвалидируем кэш и перезагружаем отзывы
            dispatch(invalidateFeedbackCache(productId));
            await dispatch(fetchProductFeedbacks(productId));

            return { id, productId };
        } catch (error) {
            console.error(`Ошибка при удалении отзыва ${id}:`, error);
            return rejectWithValue(error.message || 'Не удалось удалить отзыв');
        }
    }
);

export const uploadFeedbackPhotos = createAsyncThunk(
    'feedback/uploadFeedbackPhotos',
    async ({ feedbackId, photos, productId }, { rejectWithValue, dispatch }) => {
        try {
            await feedbackApi.uploadFeedbackPhotos(feedbackId, photos);

            // Инвалидируем кэш и перезагружаем отзывы
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
    async ({ feedbackId, photoIndex, productId }, { rejectWithValue, dispatch }) => {
        try {
            await feedbackApi.deleteFeedbackPhoto(feedbackId, photoIndex);

            // Инвалидируем кэш и перезагружаем отзывы
            dispatch(invalidateFeedbackCache(productId));
            await dispatch(fetchProductFeedbacks(productId));

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
        // ИСПРАВЛЕНИЕ: Добавляем недостающий reducer
        invalidateFeedbackCache: (state, action) => {
            const productId = action.payload;
            if (productId) {
                delete state.items[productId];
                delete state.cacheTimestamps[productId];
                state.loadedProductIds = state.loadedProductIds.filter(id => id !== productId);
            }
        },
        // Дополнительные reducers для управления состоянием
        setFeedbacksLoading: (state, action) => {
            state.loading = action.payload;
        },
        setFeedbacksError: (state, action) => {
            state.error = action.payload;
        },
        setFeedbacksPhotoUploading: (state, action) => {
            state.photoUploading = action.payload;
        },
        setFeedbacksPhotoError: (state, action) => {
            state.photoError = action.payload;
        },
        // Для ручного добавления отзывов (если нужно)
        addFeedbackToProduct: (state, action) => {
            const { productId, feedback } = action.payload;
            if (!state.items[productId]) {
                state.items[productId] = [];
            }
            state.items[productId].push(feedback);
            state.cacheTimestamps[productId] = Date.now();
        },
        // Для обновления конкретного отзыва
        updateFeedbackInState: (state, action) => {
            const { productId, feedbackId, updatedFeedback } = action.payload;
            if (state.items[productId]) {
                const index = state.items[productId].findIndex(f => f.id === feedbackId);
                if (index !== -1) {
                    state.items[productId][index] = { ...state.items[productId][index], ...updatedFeedback };
                    state.cacheTimestamps[productId] = Date.now();
                }
            }
        },
        // Для удаления отзыва из состояния
        removeFeedbackFromState: (state, action) => {
            const { productId, feedbackId } = action.payload;
            if (state.items[productId]) {
                state.items[productId] = state.items[productId].filter(f => f.id !== feedbackId);
                state.cacheTimestamps[productId] = Date.now();
            }
        }
    },
    extraReducers: (builder) => {
        builder
            // fetchProductFeedbacks
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

            // fetchSupplierFeedbacks
            .addCase(fetchSupplierFeedbacks.pending, (state) => {
                state.supplierLoading = true;
                state.supplierError = null;
            })
            .addCase(fetchSupplierFeedbacks.fulfilled, (state, action) => {
                state.supplierLoading = false;
                const { supplierId, feedbacksByProduct } = action.payload;
                
                // Сохраняем отзывы по продуктам в items
                if (feedbacksByProduct) {
                    Object.keys(feedbacksByProduct).forEach(productId => {
                        state.items[productId] = feedbacksByProduct[productId];
                        state.cacheTimestamps[productId] = Date.now();
                        if (!state.loadedProductIds.includes(parseInt(productId))) {
                            state.loadedProductIds.push(parseInt(productId));
                        }
                    });
                }
                
                // Отмечаем что отзывы поставщика загружены
                state.supplierLoadedIds = state.supplierLoadedIds || [];
                if (!state.supplierLoadedIds.includes(supplierId)) {
                    state.supplierLoadedIds.push(supplierId);
                }
                
                console.log(`✅ Отзывы поставщика ${supplierId} сохранены в Redux store`);
            })
            .addCase(fetchSupplierFeedbacks.rejected, (state, action) => {
                state.supplierLoading = false;
                state.supplierError = action.payload;
            })

            // createFeedback
            .addCase(createFeedback.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createFeedback.fulfilled, (state, action) => {
                state.loading = false;
                const { productId } = action.payload;
                // Кэш будет обновлен через fetchProductFeedbacks
                state.cacheTimestamps[productId] = Date.now();
            })
            .addCase(createFeedback.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // updateFeedback
            .addCase(updateFeedback.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateFeedback.fulfilled, (state, action) => {
                state.loading = false;
                const { productId } = action.payload;
                state.cacheTimestamps[productId] = Date.now();
            })
            .addCase(updateFeedback.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // deleteFeedback
            .addCase(deleteFeedback.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteFeedback.fulfilled, (state, action) => {
                state.loading = false;
                const { productId } = action.payload;
                state.cacheTimestamps[productId] = Date.now();
            })
            .addCase(deleteFeedback.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // uploadFeedbackPhotos
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

            // deleteFeedbackPhoto
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

// ИСПРАВЛЕНИЕ: Экспортируем все actions, включая invalidateFeedbackCache
export const {
    clearFeedbacks,
    resetFeedbackLoadingState,
    invalidateFeedbackCache, // <- Это действие теперь экспортируется
    setFeedbacksLoading,
    setFeedbacksError,
    setFeedbacksPhotoUploading,
    setFeedbacksPhotoError,
    addFeedbackToProduct,
    updateFeedbackInState,
    removeFeedbackFromState
} = feedbackSlice.actions;

// Экспортируем reducer
export const feedbackReducer = feedbackSlice.reducer;
export default feedbackSlice.reducer;