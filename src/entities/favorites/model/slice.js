import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { favoritesApi } from '../api/favoritesApi';
import {authService} from "@shared/api/api";

const initialState = {
    items: [],
    loading: false,
    error: null,
    actionLoading: false,
    actionError: null,
    productStatuses: {},
};

// Асинхронные действия
export const fetchFavorites = createAsyncThunk(
    'favorites/fetchFavorites',
    async (_, { rejectWithValue }) => {
        try {
            return await favoritesApi.getFavorites();
        } catch (error) {
            return rejectWithValue(
                error.message || 'Ошибка при получении избранных товаров'
            );
        }
    }
);

export const addToFavorites = createAsyncThunk(
    'favorites/addToFavorites',
    async (productId, { rejectWithValue }) => {
        try {
            const response = await favoritesApi.addToFavorites(productId);
            return {
                productId,
                data: response.data
            };
        } catch (error) {
            return rejectWithValue({
                message: error.message || 'Ошибка при добавлении товара в избранное',
                productId
            });
        }
    }
);

export const removeFromFavorites = createAsyncThunk(
    'favorites/removeFromFavorites',
    async (productId, { rejectWithValue }) => {
        try {
            await favoritesApi.removeFromFavorites(productId);
            return { productId };
        } catch (error) {
            return rejectWithValue({
                message: error.message || 'Ошибка при удалении товара из избранного',
                productId
            });
        }
    }
);

// Добавьте в favoritesSlice.js
export const checkIsFavorite = createAsyncThunk(
    'favorites/checkIsFavorite',
    async (productId, { rejectWithValue, getState }) => {
        try {
            const tokens = await authService.getStoredTokens();
            if (!tokens || (!tokens.accessToken && !tokens.refreshToken)) {
                return {
                    productId: Number(productId),
                    isFavorite: false
                };
            }

            const state = getState();

            // Проверяем, есть ли уже информация о статусе товара
            const productStatus = state.favorites.productStatuses[productId];

            // Если статус уже получен и это не ошибка, возвращаем кэшированный результат
            if (productStatus === 'success') {
                // Проверяем, есть ли товар в избранном
                const isInFavorites = state.favorites.items.some(item => {
                    const itemId = item.product?.id || item.productId;
                    return Number(itemId) === Number(productId);
                });

                console.log('Используем кэшированный статус избранного для', productId);
                return {
                    productId,
                    isFavorite: isInFavorites
                };
            }

            // Если статуса нет или была ошибка, выполняем запрос
            console.log('Checking favorite status, productId:', productId);
            const response = await favoritesApi.checkIsFavorite(productId);

            // Извлекаем isFavorite из ответа, с защитой от неправильной структуры
            const isFavorite = response?.data?.isFavorite ||
                response?.data?.data?.isFavorite || false;

            return {
                productId: Number(productId),
                isFavorite
            };
        } catch (error) {
            return rejectWithValue({
                message: error.message || 'Ошибка при проверке статуса товара',
                productId
            });
        }
    },
    {
        // Проверяем, нужно ли запускать запрос, если он уже в процессе
        condition: (productId, { getState }) => {
            const state = getState();
            const isPending = state.favorites.productStatuses[productId] === 'loading';

            // Не запускаем запрос, если он уже в процессе
            return !isPending;
        }
    }
);




const favoritesSlice = createSlice({
    name: 'favorites',
    initialState,
    reducers: {
        clearFavoritesError: (state) => {
            state.error = null;
        },
        clearActionError: (state) => {
            state.actionError = null;
        },
        // Локальный toggle для оптимистичного UI без ожидания API
        toggleFavoriteOptimistic: (state, action) => {
            const productId = action.payload;

            // Устанавливаем статус загрузки для данного товара
            state.productStatuses[productId] = 'loading';

            const existingIndex = state.items.findIndex(item =>
                item.product?.id === productId || item.productId === productId
            );

            if (existingIndex >= 0) {
                // Если товар уже в избранном - удаляем его
                state.items = state.items.filter(item =>
                    (item.product?.id !== productId) && (item.productId !== productId)
                );
            } else {
                // Иначе добавляем заглушку товара (API вернет полные данные позже)
                state.items.push({
                    productId: productId,
                    isPlaceholder: true,
                    addedAt: new Date().toISOString()
                });
            }
        },
        // Обновление статуса товара
        setProductStatus: (state, action) => {
            const { productId, status } = action.payload;
            state.productStatuses[productId] = status;
        },
        // Очистка всех избранных товаров (например, при выходе из аккаунта)
        clearFavorites: (state) => {
            state.items = [];
            state.productStatuses = {};
        }
    },
    extraReducers: (builder) => {
        builder
            // Получение списка избранных
            .addCase(fetchFavorites.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchFavorites.fulfilled, (state, action) => {
                state.loading = false;
                // Обрабатываем правильную структуру ответа от API
                state.items = Array.isArray(action.payload) ? action.payload : [];
            })
            .addCase(fetchFavorites.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Добавление в избранное
            .addCase(addToFavorites.pending, (state, action) => {
                state.actionLoading = true;
                state.actionError = null;
                // Устанавливаем статус для конкретного товара
                state.productStatuses[action.meta.arg] = 'loading';
            })
            .addCase(addToFavorites.fulfilled, (state, action) => {
                state.actionLoading = false;

                // Получаем productId из payload
                const productId = Number(action.payload.productId);

                // Устанавливаем статус успеха для товара
                state.productStatuses[productId] = 'success';

                // Проверяем, есть ли товар уже в списке
                const existingIndex = state.items.findIndex(item => {
                    const itemId = item.product?.id ? Number(item.product.id) :
                        item.productId ? Number(item.productId) : 0;
                    return itemId === productId;
                });

                if (existingIndex >= 0) {
                    // Обновляем существующий элемент
                    state.items[existingIndex] = {
                        ...state.items[existingIndex],
                        ...action.payload.data,
                        isPlaceholder: false,
                        productId // Явно добавляем productId
                    };
                } else {
                    // Добавляем новый элемент
                    state.items.push({
                        productId,
                        isPlaceholder: false,
                        addedAt: new Date().toISOString(),
                        ...action.payload.data
                    });
                }

                // Логируем состояние для отладки
                console.log('[Favorites Slice] After add:', state.items.length, 'items');
            })
            .addCase(addToFavorites.rejected, (state, action) => {
                state.actionLoading = false;
                state.actionError = action.payload?.message;

                // Устанавливаем статус ошибки для конкретного товара
                if (action.payload?.productId) {
                    state.productStatuses[action.payload.productId] = 'error';

                    // Удаляем временную заглушку в случае ошибки
                    state.items = state.items.filter(item =>
                        !item.isPlaceholder ||
                        item.productId !== action.payload.productId
                    );
                }
            })

            // Удаление из избранного
            .addCase(removeFromFavorites.pending, (state, action) => {
                state.actionLoading = true;
                state.actionError = null;
                // Устанавливаем статус для конкретного товара
                state.productStatuses[action.meta.arg] = 'loading';
            })
            .addCase(removeFromFavorites.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.productStatuses[action.payload.productId] = 'success';

                // Удаляем товар из списка
                state.items = state.items.filter(item =>
                    (item.product?.id !== action.payload.productId) &&
                    (item.productId !== action.payload.productId)
                );
            })
            .addCase(removeFromFavorites.rejected, (state, action) => {
                state.actionLoading = false;
                state.actionError = action.payload?.message;

                // Устанавливаем статус ошибки для конкретного товара
                if (action.payload?.productId) {
                    state.productStatuses[action.payload.productId] = 'error';
                }
            })

            // Проверка избранного
            .addCase(checkIsFavorite.fulfilled, (state, action) => {
                // Проверяем наличие данных в payload
                if (!action.payload) {
                    console.error('Invalid payload in checkIsFavorite.fulfilled');
                    return;
                }

                const {productId, isFavorite} = action.payload;
                const safeProductId = Number(productId);

                // Устанавливаем статус товара
                state.productStatuses[safeProductId] = 'success';

                // Проверяем текущее наличие товара в списке
                const existingItemIndex = state.items.findIndex(item => {
                    const itemId = item.product?.id ? Number(item.product.id) :
                        item.productId ? Number(item.productId) : 0;
                    return itemId === safeProductId;
                });

                const isInList = existingItemIndex >= 0;

                // Если товар должен быть в избранном, но его там нет - добавляем
                if (isFavorite && !isInList) {
                    state.items.push({
                        productId: safeProductId,
                        isPlaceholder: false,
                        addedAt: new Date().toISOString()
                    });
                    console.log(`[Favorites Slice] Added item ${safeProductId} to favorites`);
                }
                // Если товар не должен быть в избранном, но он там есть - удаляем
                else if (!isFavorite && isInList) {
                    state.items = state.items.filter(item => {
                        const itemId = item.product?.id ? Number(item.product.id) :
                            item.productId ? Number(item.productId) : 0;
                        return itemId !== safeProductId;
                    });
                    console.log(`[Favorites Slice] Removed item ${safeProductId} from favorites`);
                }
            })
    }
});

export const {
    clearFavoritesError,
    clearActionError,
    toggleFavoriteOptimistic,
    setProductStatus,
    clearFavorites
} = favoritesSlice.actions;

export default favoritesSlice.reducer;