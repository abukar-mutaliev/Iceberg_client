import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { driverApi } from '../api/driverApi';

const initialState = {
    profile: null,
    allDrivers: [],
    routeAssignees: [],
    districts: [],
    loading: false,
    error: null,
};

// Обработчик ошибок для более дружественных сообщений
const handleError = (error) => {
    if (error.code === 'ECONNABORTED') {
        return 'Превышено время ожидания. Проверьте подключение к сети.';
    }
    if (!error.response) {
        return 'Ошибка сети. Проверьте подключение.';
    }
    return error.response?.data?.message || 'Произошла ошибка';
};

export const fetchAllDrivers = createAsyncThunk(
    'driver/fetchAllDrivers',
    async (_, { rejectWithValue }) => {
        try {
            const response = await driverApi.getAllDrivers();
            return response.data.status === 'success' ? response.data.data : response.data;
        } catch (error) {
            console.error('Ошибка получения списка водителей:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const fetchRouteAssignees = createAsyncThunk(
    'driver/fetchRouteAssignees',
    async (_, { rejectWithValue }) => {
        try {
            const [driversResponse, employeesResponse] = await Promise.all([
                driverApi.getAllDrivers(),
                driverApi.getAllEmployees({ page: 1, limit: 50 })
            ]);

            const drivers = driversResponse.data.status === 'success'
                ? driversResponse.data.data
                : driversResponse.data;
            const employeesPayload = employeesResponse.data.status === 'success'
                ? employeesResponse.data.data
                : employeesResponse.data;
            let employees = Array.isArray(employeesPayload?.employees)
                ? employeesPayload.employees
                : [];
            const employeePages = Number(employeesPayload?.pages) || 1;

            if (employeePages > 1) {
                const restResponses = await Promise.all(
                    Array.from({ length: employeePages - 1 }, (_, index) =>
                        driverApi.getAllEmployees({ page: index + 2, limit: 50 })
                    )
                );
                employees = restResponses.reduce((acc, response) => {
                    const payload = response.data.status === 'success'
                        ? response.data.data
                        : response.data;
                    return Array.isArray(payload?.employees)
                        ? acc.concat(payload.employees)
                        : acc;
                }, employees);
            }

            return [
                ...(Array.isArray(drivers) ? drivers : []).map(driver => ({
                    ...driver,
                    id: `DRIVER:${driver.id}`,
                    rawId: driver.id,
                    type: 'DRIVER',
                    roleLabel: 'Водитель'
                })),
                ...employees.map(employee => ({
                    ...employee,
                    id: `EMPLOYEE:${employee.id}`,
                    rawId: employee.id,
                    type: 'EMPLOYEE',
                    roleLabel: 'Сотрудник'
                }))
            ];
        } catch (error) {
            console.error('Ошибка получения списка ответственных за маршрут:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const fetchDriverById = createAsyncThunk(
    'driver/fetchDriverById',
    async (driverId, { rejectWithValue }) => {
        try {
            const response = await driverApi.getDriverById(driverId);
            return response.data.status === 'success' ? response.data.data : response.data;
        } catch (error) {
            console.error(`Ошибка получения данных водителя ${driverId}:`, error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const fetchDriverDistricts = createAsyncThunk(
    'driver/fetchDistricts',
    async (driverId = null, { rejectWithValue }) => {
        try {
            const response = await driverApi.getDriverDistricts(driverId);
            return response.data.status === 'success' ? response.data.data : response.data;
        } catch (error) {
            console.error('Ошибка получения списка районов:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const updateDriverDistrictsList = createAsyncThunk(
    'driver/updateDistrictsList',
    async ({ districtIds, driverId = null }, { rejectWithValue }) => {
        try {
            const response = await driverApi.updateDriverDistricts(districtIds, driverId);
            return response.data.status === 'success' ? response.data.data : response.data;
        } catch (error) {
            console.error('Ошибка обновления списка районов водителя:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

const driverSlice = createSlice({
    name: 'driver',
    initialState,
    reducers: {
        clearDriverError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllDrivers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllDrivers.fulfilled, (state, action) => {
                state.loading = false;
                state.allDrivers = action.payload;
            })
            .addCase(fetchAllDrivers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(fetchRouteAssignees.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchRouteAssignees.fulfilled, (state, action) => {
                state.loading = false;
                state.routeAssignees = action.payload;
            })
            .addCase(fetchRouteAssignees.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(fetchDriverById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDriverById.fulfilled, (state, action) => {
                state.loading = false;
                state.profile = action.payload;
            })
            .addCase(fetchDriverById.rejected, (state, action) => {
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
            })
            .addCase(fetchDriverDistricts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            .addCase(updateDriverDistrictsList.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateDriverDistrictsList.fulfilled, (state, action) => {
                state.loading = false;
                state.districts = action.payload;
            })
            .addCase(updateDriverDistrictsList.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const {
    clearDriverError
} = driverSlice.actions;

export default driverSlice.reducer;