import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { logData } from '@shared/lib/logger';
import { districtApi } from "@entities/district";

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
            logData('Запрос на получение списка всех районов');

            const state = getState();

            if (
                isCacheValid(state.district.lastFetchTime) &&
                state.district.districts.length > 0
            ) {
                logData('Возвращены районы из кэша', { count: state.district.districts.length });
                return {
                    data: state.district.districts,
                    fromCache: true
                };
            }

            // Получаем базовый список районов
            const response = await districtApi.getAllDistricts();
            logData('Получен список районов с сервера', { count: response.data?.length });

            // ДОБАВЛЕНО: Нормализуем данные
            const normalizedData = Array.isArray(response.data)
                ? response.data.map(normalizeDistrictData)
                : [];

            logData('Нормализованные данные районов', {
                count: normalizedData.length,
                sample: normalizedData[0]
            });

            return {
                data: normalizedData,
                fromCache: false
            };
        } catch (error) {
            logData('Ошибка при получении списка районов', error);
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
            logData('Запрос на получение района по ID', { id });
            const response = await districtApi.getDistrictById(id);

            // ДОБАВЛЕНО: Нормализуем данные
            const normalizedDistrict = normalizeDistrictData(response.data);

            logData('Получен район по ID', { id, data: normalizedDistrict });
            return normalizedDistrict;
        } catch (error) {
            logData('Ошибка при получении района по ID', { id, error });
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
            logData('Запрос на создание нового района', { data: districtData });
            const response = await districtApi.createDistrict(districtData);

            // ДОБАВЛЕНО: Нормализуем данные
            const normalizedDistrict = normalizeDistrictData(response.data);

            logData('Район успешно создан', { district: normalizedDistrict });
            return normalizedDistrict;
        } catch (error) {
            logData('Ошибка при создании района', { data: districtData, error });
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
            logData('Запрос на обновление района', { id, data: districtData });
            const response = await districtApi.updateDistrict(id, districtData);

            // ДОБАВЛЕНО: Нормализуем данные
            const normalizedDistrict = normalizeDistrictData(response.data);

            logData('Район успешно обновлен', { id, district: normalizedDistrict });
            return normalizedDistrict;
        } catch (error) {
            logData('Ошибка при обновлении района', { id, data: districtData, error });
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
            logData('Запрос на удаление района', { id });
            await districtApi.deleteDistrict(id);
            logData('Район успешно удален', { id });
            return id;
        } catch (error) {
            logData('Ошибка при удалении района', { id, error });
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
            logData('Запрос на получение районов водителя', { driverId: driverId || 'текущий' });
            const response = await districtApi.getDriverDistricts(driverId);

            // ДОБАВЛЕНО: Нормализуем данные
            const normalizedData = Array.isArray(response.data)
                ? response.data.map(normalizeDistrictData)
                : [];

            logData('Получены районы водителя', {
                driverId: driverId || 'текущий',
                count: normalizedData.length
            });

            return normalizedData;
        } catch (error) {
            logData('Ошибка при получении районов водителя', { driverId: driverId || 'текущий', error });
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
            logData('Запрос на обновление районов водителя', {
                districtIds,
                driverId: driverId || 'текущий'
            });
            const response = await districtApi.updateDriverDistricts(districtIds, driverId);
            logData('Районы водителя успешно обновлены', {
                driverId: driverId || 'текущий'
            });
            return response.data;
        } catch (error) {
            logData('Ошибка при обновлении районов водителя', {
                districtIds,
                driverId: driverId || 'текущий',
                error
            });
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