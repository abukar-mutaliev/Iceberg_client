import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// Импортируем напрямую из API, чтобы избежать циклической зависимости
import { districtApi } from "../api/districtsApi";

const initialState = {
    districts: [],
    selectedDistrict: null,
    loading: false,
    error: null,
    lastFetchTime: null
};

const CACHE_EXPIRY_TIME = 5 * 60 * 1000;

const isCacheValid = (lastFetchTime) => {
    return lastFetchTime && Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
};

const handleError = (error) => {
    if (error.code === 'ECONNABORTED') {
        return 'Превышено время ожидания. Проверьте подключение к сети.';
    }
    if (!error.response) {
        return 'Ошибка сети. Проверьте подключение.';
    }
    return error.message || 'Произошла ошибка';
};

/**
 * ДОБАВЛЕНО: Функция нормализации данных района
 * Обеспечивает единообразную структуру данных
 */
const normalizeDistrictData = (district) => {
    // Проверяем разные возможные форматы ответа сервера
    const counts = district._count || district.counts || district.statistics || {};

    return {
        ...district,
        // Нормализуем статистику
        driversCount: counts.drivers || district.driversCount || 0,
        clientsCount: counts.clients || district.clientsCount || 0,
        stopsCount: counts.stops || district.stopsCount || 0,
        // Сохраняем оригинальные данные для отладки
        _count: counts,
        // Подсчитываем общее количество
        totalCount: (counts.drivers || district.driversCount || 0) +
            (counts.clients || district.clientsCount || 0) +
            (counts.stops || district.stopsCount || 0)
    };
};

/**
 * Получение списка всех районов
 */
export const fetchAllDistricts = createAsyncThunk(
    'district/fetchAll',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState();

            if (
                isCacheValid(state.district.lastFetchTime) &&
                state.district.districts.length > 0
            ) {
                return {
                    data: state.district.districts,
                    fromCache: true
                };
            }

            // Получаем базовый список районов
            const response = await districtApi.getAllDistricts();
            // ДОБАВЛЕНО: Нормализуем данные
            const normalizedData = Array.isArray(response.data)
                ? response.data.map(normalizeDistrictData)
                : [];

            return {
                data: normalizedData,
                fromCache: false
            };
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

/**
 * Получение района по ID
 */
export const fetchDistrictById = createAsyncThunk(
    'district/fetchById',
    async (id, { rejectWithValue }) => {
        try {
            const response = await districtApi.getDistrictById(id);

            // ДОБАВЛЕНО: Нормализуем данные
            const normalizedDistrict = normalizeDistrictData(response.data);

            return normalizedDistrict;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

/**
 * Создание нового района
 */
export const createDistrict = createAsyncThunk(
    'district/create',
    async (districtData, { rejectWithValue }) => {
        try {
            const response = await districtApi.createDistrict(districtData);

            // ДОБАВЛЕНО: Нормализуем данные
            const normalizedDistrict = normalizeDistrictData(response.data);

            return normalizedDistrict;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

/**
 * Обновление района
 */
export const updateDistrict = createAsyncThunk(
    'district/update',
    async ({ id, districtData }, { rejectWithValue }) => {
        try {
            const response = await districtApi.updateDistrict(id, districtData);

            // ДОБАВЛЕНО: Нормализуем данные
            const normalizedDistrict = normalizeDistrictData(response.data);

            return normalizedDistrict;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

/**
 * Удаление района
 */
export const deleteDistrict = createAsyncThunk(
    'district/delete',
    async (id, { rejectWithValue }) => {
        try {
            await districtApi.deleteDistrict(id);
            return id;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

/**
 * Получение районов водителя
 */
export const fetchDriverDistricts = createAsyncThunk(
    'district/fetchDriverDistricts',
    async (driverId = null, { rejectWithValue }) => {
        try {
            const response = await districtApi.getDriverDistricts(driverId);

            // ДОБАВЛЕНО: Нормализуем данные
            const normalizedData = Array.isArray(response.data)
                ? response.data.map(normalizeDistrictData)
                : [];

            return normalizedData;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

/**
 * Обновление районов водителя
 */
export const updateDriverDistrictsList = createAsyncThunk(
    'district/updateDriverDistricts',
    async ({ districtIds, driverId = null }, { rejectWithValue }) => {
        try {
            const response = await districtApi.updateDriverDistricts(districtIds, driverId);
            return response.data;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

const districtSlice = createSlice({
    name: 'district',
    initialState,
    reducers: {
        clearDistrictCache: (state) => {
            state.lastFetchTime = null;
        },
        clearDistrictError: (state) => {
            state.error = null;
        },
        selectDistrict: (state, action) => {
            state.selectedDistrict = action.payload;
        },
        // ДОБАВЛЕНО: Обновление статистики конкретного района
        updateDistrictStats: (state, action) => {
            const { districtId, stats } = action.payload;
            const districtIndex = state.districts.findIndex(d => d.id === districtId);

            if (districtIndex !== -1) {
                state.districts[districtIndex] = {
                    ...state.districts[districtIndex],
                    ...normalizeDistrictData({ ...state.districts[districtIndex], ...stats })
                };
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllDistricts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllDistricts.fulfilled, (state, action) => {
                state.loading = false;

                if (!action.payload.fromCache) {
                    state.districts = action.payload.data;
                    state.lastFetchTime = Date.now();
                }
            })
            .addCase(fetchAllDistricts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(fetchDistrictById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDistrictById.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedDistrict = action.payload;

                const index = state.districts.findIndex((d) => d.id === action.payload.id);
                if (index !== -1) {
                    state.districts[index] = action.payload;
                }
            })
            .addCase(fetchDistrictById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(createDistrict.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createDistrict.fulfilled, (state, action) => {
                state.loading = false;
                state.districts.push(action.payload);
                state.selectedDistrict = action.payload;
            })
            .addCase(createDistrict.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(updateDistrict.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateDistrict.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.districts.findIndex((d) => d.id === action.payload.id);
                if (index !== -1) {
                    state.districts[index] = action.payload;
                }
                if (state.selectedDistrict && state.selectedDistrict.id === action.payload.id) {
                    state.selectedDistrict = action.payload;
                }
            })
            .addCase(updateDistrict.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(deleteDistrict.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteDistrict.fulfilled, (state, action) => {
                state.loading = false;
                state.districts = state.districts.filter((d) => d.id !== action.payload);
                if (state.selectedDistrict && state.selectedDistrict.id === action.payload) {
                    state.selectedDistrict = null;
                }
            })
            .addCase(deleteDistrict.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(fetchDriverDistricts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDriverDistricts.fulfilled, (state, action) => {
                state.loading = false;
                state.districts = action.payload;
                state.lastFetchTime = Date.now();
            })
            .addCase(fetchDriverDistricts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export const {
    clearDistrictCache,
    clearDistrictError,
    selectDistrict,
    updateDistrictStats
} = districtSlice.actions;

export default districtSlice.reducer;