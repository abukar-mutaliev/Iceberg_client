import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { stopApi } from '../api/stopApi';
import {driverApi} from "@entities/driver";

const initialState = {
    stops: [],
    currentStop: null,
    loading: false,
    error: null,
    lastFetchTime: null,
    selectedDistrict: null,
};

// Время жизни кэша (5 минут)
const CACHE_EXPIRY_TIME = 5 * 60 * 1000;

// Проверка валидности кэша
const isCacheValid = (lastFetchTime) => {
    return lastFetchTime && Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
};

// Обработчик ошибок для более дружественных сообщений
const handleError = (error) => {
    // Если ошибка уже является объектом с данными (после createProtectedRequest)
    // createProtectedRequest выбрасывает error.response?.data || error
    if (error && typeof error === 'object' && !error.response) {
        // Проверяем, есть ли массив ошибок
        if (error.errors && Array.isArray(error.errors)) {
            return {
                status: error.status || 'error',
                message: error.message || 'Произошла ошибка',
                errors: error.errors,
                code: error.code || 400
            };
        }
        
        // Если это объект с ошибкой, возвращаем его полностью
        if (error.status || error.message) {
            return error;
        }
    }
    
    // Если это стандартная axios ошибка с response
    if (error.code === 'ECONNABORTED') {
        return 'Превышено время ожидания. Проверьте подключение к сети.';
    }
    
    if (!error.response) {
        return 'Ошибка сети. Проверьте подключение.';
    }
    
    const responseData = error.response?.data;
    
    // Если есть массив ошибок, возвращаем полную структуру (независимо от status)
    if (responseData?.errors && Array.isArray(responseData.errors)) {
        return {
            status: responseData.status || 'error',
            message: responseData.message || 'Произошла ошибка',
            errors: responseData.errors,
            code: error.response?.status || responseData.code
        };
    }
    
    // Если это объект с ошибкой, возвращаем его полностью
    if (responseData && typeof responseData === 'object' && responseData.status) {
        return responseData;
    }
    
    // Иначе возвращаем строку с сообщением
    return responseData?.message || 'Произошла ошибка';
};

export const fetchAllStops = createAsyncThunk(
    'stop/fetchAllStops',
    async (districtId = null, { rejectWithValue, getState }) => {
        try {
            const state = getState();

            if (
                isCacheValid(state.stop.lastFetchTime) &&
                state.stop.stops.length > 0 &&
                state.stop.selectedDistrict === districtId
            ) {
                return {
                    data: state.stop.stops,
                    fromCache: true,
                    selectedDistrict: districtId
                };
            }

            const params = {};
            if (districtId) {
                params.districtId = districtId;
            }

            const response = await stopApi.getAllStops(params);
            return {
                data: response.data.status === 'success' ? response.data.data : response.data,
                fromCache: false,
                selectedDistrict: districtId
            };
        } catch (error) {
            console.error('Ошибка получения списка остановок:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const fetchDriverStops = createAsyncThunk(
    'stop/fetchDriverStops',
    async (driverId = null, { rejectWithValue }) => {
        try {
            const response = await driverApi.getDriverStops(driverId);
            return response.data.status === 'success' ? response.data.data : response.data;
        } catch (error) {
            console.error('Ошибка запроса остановок водителя:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const createStop = createAsyncThunk(
    'stop/createStop',
    async (stopData, { rejectWithValue }) => {
        try {
            const formData = new FormData();

            // Добавляем данные остановки в FormData
            for (const [key, value] of Object.entries(stopData)) {
                if (key !== 'photo' && value !== null && value !== undefined) {
                    // Если это массив products, преобразуем в JSON строку
                    if (key === 'products' && Array.isArray(value)) {
                        formData.append(key, JSON.stringify(value));
                    } else {
                        formData.append(key, value);
                    }
                }
            }

            // Если есть фото, добавляем его
            if (stopData.photo instanceof Object && stopData.photo !== null) {
                formData.append('photo', stopData.photo);
            }

            const response = await stopApi.createStop(formData);
            return response.data.status === 'success' ? response.data.data : response.data;
        } catch (error) {
            console.error('Ошибка создания остановки:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const updateStop = createAsyncThunk(
    'stop/updateStop',
    async ({ stopId, stopData }, { rejectWithValue }) => {
        try {
            let formData = stopData;

            if (!(stopData instanceof FormData)) {
                formData = new FormData();

                for (const [key, value] of Object.entries(stopData)) {
                    if (key !== 'photo' && value !== null && value !== undefined) {
                        if (key === 'mapLocation') {
                            // Import the normalizeCoordinates helper
                            const { normalizeCoordinates } = require('@/shared/lib/coordinatesHelper');
                            const normalizedCoords = normalizeCoordinates(value);
                            if (normalizedCoords) {
                                formData.append(key, normalizedCoords);
                            } else {
                                formData.append(key, value);
                            }
                        } else if (key === 'products' && Array.isArray(value)) {
                            // Если это массив products, преобразуем в JSON строку
                            formData.append(key, JSON.stringify(value));
                        } else {
                            formData.append(key, value);
                        }
                    }
                }

                if (stopData.photo instanceof Object && stopData.photo !== null) {
                    formData.append('photo', stopData.photo);
                }
            }

            const response = await stopApi.updateStop(stopId, formData);
            return response.data.status === 'success' ? response.data.data : response.data;
        } catch (error) {
            console.error('Ошибка обновления остановки:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const deleteStop = createAsyncThunk(
    'stop/deleteStop',
    async (stopId, { rejectWithValue }) => {
        try {
            await stopApi.deleteStop(stopId);
            return stopId;
        } catch (error) {
            console.error('Ошибка удаления остановки:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const filterStopsByDistrict = createAsyncThunk(
    'stop/filterStopsByDistrict',
    async (districtId, { rejectWithValue, getState }) => {
        try {
            const state = getState();

            if (state.stop.stops.length > 0) {
                const filteredStops = districtId
                    ? state.stop.stops.filter(stop => stop.districtId === parseInt(districtId))
                    : state.stop.stops;

                return {
                    data: filteredStops,
                    fromCache: true,
                    selectedDistrict: districtId
                };
            }

            const params = districtId ? { districtId } : {};
            const response = await stopApi.getAllStops(params);

            return {
                data: response.data.status === 'success' ? response.data.data : response.data,
                fromCache: false,
                selectedDistrict: districtId
            };
        } catch (error) {
            console.error('Ошибка фильтрации остановок по району:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

const stopSlice = createSlice({
    name: 'stop',
    initialState,
    reducers: {
        clearStopCache: (state) => {
            state.lastFetchTime = null;
        },
        clearStopError: (state) => {
            state.error = null;
        },
        setCurrentStop: (state, action) => {
            state.currentStop = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllStops.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllStops.fulfilled, (state, action) => {
                state.loading = false;
                if (!action.payload.fromCache) {
                    state.stops = action.payload.data;
                    state.lastFetchTime = Date.now();
                    state.selectedDistrict = action.payload.selectedDistrict;
                }
            })
            .addCase(fetchAllStops.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(fetchDriverStops.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDriverStops.fulfilled, (state, action) => {
                state.loading = false;
                state.stops = action.payload;
            })
            .addCase(fetchDriverStops.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(createStop.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createStop.fulfilled, (state, action) => {
                state.loading = false;
                // Добавляем новую остановку в начало списка
                state.stops.unshift(action.payload);
                // Обновляем время последней загрузки чтобы сбросить кэш
                state.lastFetchTime = Date.now();
                console.log('✅ Новая остановка добавлена в список:', action.payload.id);
            })
            .addCase(createStop.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(updateStop.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateStop.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.stops.findIndex(stop => stop.id === action.payload.id);
                if (index !== -1) {
                    // Сохраняем текущие координаты для логирования
                    const oldLocation = state.stops[index].mapLocation;
                    const newLocation = action.payload.mapLocation;
                    
                    // Обновляем остановку в массиве
                    state.stops[index] = {
                        ...state.stops[index],
                        ...action.payload,
                    };
                    
                    // Для обработки случая, когда координаты изменились
                    if (oldLocation !== newLocation) {
                        console.log('Координаты остановки изменились:', {
                            stopId: action.payload.id,
                            oldLocation,
                            newLocation
                        });
                    }
                    
                    // Обновляем текущую остановку, если она выбрана
                    if (state.currentStop && state.currentStop.id === action.payload.id) {
                        state.currentStop = {
                            ...state.currentStop,
                            ...action.payload
                        };
                    }
                }
            })
            .addCase(updateStop.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(deleteStop.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteStop.fulfilled, (state, action) => {
                state.loading = false;
                state.stops = state.stops.filter(stop => stop.id !== action.payload);
            })
            .addCase(deleteStop.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(filterStopsByDistrict.fulfilled, (state, action) => {
                state.loading = false;
                state.stops = action.payload.data;
                state.selectedDistrict = action.payload.selectedDistrict;
            });
    },
});

export const {
    clearStopCache,
    clearStopError,
    setCurrentStop
} = stopSlice.actions;

export default stopSlice.reducer;