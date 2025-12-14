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
                return { supplierId, feedbacks: [] };
            }

            // Проверяем кэш и загружаем только те продукты, у которых нет отзывов или кэш устарел
            const CACHE_DURATION = 5 * 60 * 1000;
            const feedbackState = state.feedback;
            const loadedProductIds = feedbackState.loadedProductIds || [];
            const cacheTimestamps = feedbackState.cacheTimestamps || {};

            // Фильтруем продукты, для которых нужно загрузить отзывы
            const productsToLoad = supplierProducts.filter(product => {
                if (!product || !product.id) return false;
                
                const productId = product.id;
                const isLoaded = loadedProductIds.includes(productId);
                const cacheTimestamp = cacheTimestamps[productId];
                const isCacheValid = cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION);
                
                // Загружаем только если не загружено или кэш устарел
                return !isLoaded || !isCacheValid;
            });

            // Если все отзывы уже загружены и кэш актуален, возвращаем успех без загрузки
            if (productsToLoad.length === 0) {
                return { supplierId, success: true, skipped: true };
            }

            // ОПТИМИЗАЦИЯ: Ограничиваем количество продуктов для загрузки
            // Загружаем только первые 10 продуктов с отзывами для быстрой загрузки
            // Остальные будут загружаться по требованию
            // Сначала загружаем продукты, у которых точно есть отзывы (если есть информация)
            const MAX_PRODUCTS_TO_LOAD = 10;
            
            // Приоритет: сначала продукты с отзывами (если есть информация о feedbackCount)
            const productsWithFeedbacks = productsToLoad.filter(p => p.feedbackCount > 0);
            const productsWithoutFeedbacks = productsToLoad.filter(p => !p.feedbackCount || p.feedbackCount === 0);
            
            // Берем сначала продукты с отзывами, потом остальные
            const prioritizedProducts = [
                ...productsWithFeedbacks.slice(0, MAX_PRODUCTS_TO_LOAD),
                ...productsWithoutFeedbacks.slice(0, Math.max(0, MAX_PRODUCTS_TO_LOAD - productsWithFeedbacks.length))
            ];
            
            const limitedProducts = prioritizedProducts.slice(0, MAX_PRODUCTS_TO_LOAD);

            if (__DEV__) {
                console.log(`Загрузка отзывов: ${limitedProducts.length} из ${productsToLoad.length} продуктов (${productsWithFeedbacks.length} с отзывами, ограничено до ${MAX_PRODUCTS_TO_LOAD})`);
            }

            // Загружаем отзывы батчами по 5 продуктов для оптимизации (меньше запросов одновременно)
            const BATCH_SIZE = 5;
            const batches = [];
            for (let i = 0; i < limitedProducts.length; i += BATCH_SIZE) {
                batches.push(limitedProducts.slice(i, i + BATCH_SIZE));
            }

            if (__DEV__) {
                console.log(`Загрузка отзывов батчами: ${batches.length} батчей по ${BATCH_SIZE} продуктов`);
            }

            // Загружаем батчи параллельно для максимальной скорости
            const batchPromises = batches.map((batch, batchIndex) => {
                if (__DEV__) {
                    console.log(`Начало загрузки батча ${batchIndex + 1}/${batches.length} (${batch.length} продуктов)`);
                }
                return Promise.all(batch.map(product =>
                    dispatch(fetchProductFeedbacks(product.id))
                )).then(() => {
                    if (__DEV__) {
                        console.log(`Батч ${batchIndex + 1}/${batches.length} загружен`);
                    }
                });
            });
            
            await Promise.all(batchPromises);
            
            if (__DEV__) {
                console.log(`Все отзывы загружены для поставщика ${supplierId}`);
            }

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
                state.supplierLoadedIds = state.supplierLoadedIds || [];
                const supplierId = action.meta.arg;
                if (!state.supplierLoadedIds.includes(supplierId)) {
                    state.supplierLoadedIds.push(supplierId);
                }
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