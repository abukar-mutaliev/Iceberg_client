import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userApi } from '../api/userApi';

// Начальное состояние
const initialState = {
    users: {
        items: [],
        total: 0,
        page: 1,
        pages: 1,
        isLoading: false,
        error: null
    },
    clients: {
        items: [],
        total: 0,
        page: 1,
        pages: 1,
        isLoading: false,
        error: null
    },
    employees: {
        items: [],
        total: 0,
        page: 1,
        pages: 1,
        isLoading: false,
        error: null
    },
    suppliers: {
        items: [],
        total: 0,
        page: 1,
        pages: 1,
        isLoading: false,
        error: null
    },
    drivers: {
        items: [],
        total: 0,
        page: 1,
        pages: 1,
        isLoading: false,
        error: null
    },
    allDrivers: {
        items: [],
        isLoading: false,
        error: null
    },
    currentUser: {
        data: null,
        isLoading: false,
        error: null
    },
    currentSupplier: {
        data: null,
        isLoading: false,
        error: null
    },
    currentDriver: {
        data: null,
        isLoading: false,
        error: null
    },
    driverStops: {
        items: [],
        isLoading: false,
        error: null
    }
};

// Вспомогательная функция для обработки ошибок
const handleError = (error) => {
    console.error('=== Error Debug ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error response:', error.response);
    console.error('Error config:', error.config);
    console.error('==================');

    if (error.code === 'ECONNABORTED') {
        return 'Превышено время ожидания. Проверьте подключение к сети.';
    }

    if (!error.response) {
        return 'Ошибка сети. Проверьте подключение.';
    }

    return error.response?.data?.message || 'Произошла ошибка';
};

// Асинхронные экшены

// 1. Получение всех пользователей (для админа)
export const fetchAllUsers = createAsyncThunk(
    'user/fetchAllUsers',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await userApi.getAllUsers(params);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка получения пользователей');
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 2. Получение пользователя по ID
export const fetchUserById = createAsyncThunk(
    'user/fetchUserById',
    async (id, { rejectWithValue }) => {
        try {
            const response = await userApi.getUserById(id);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Пользователь не найден');
            }

            return response.data.user;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 3. Получение клиентов
export const fetchClients = createAsyncThunk(
    'user/fetchClients',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await userApi.getClients(params);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка получения клиентов');
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 4. Получение сотрудников
export const fetchEmployees = createAsyncThunk(
    'user/fetchEmployees',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await userApi.getEmployees(params);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка получения сотрудников');
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 5. Получение поставщиков
export const fetchSuppliers = createAsyncThunk(
    'user/fetchSuppliers',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await userApi.getSuppliers(params);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка получения поставщиков');
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 6. Получение поставщика по ID
export const fetchSupplierById = createAsyncThunk(
    'user/fetchSupplierById',
    async (id, { rejectWithValue }) => {
        try {
            const response = await userApi.getSupplierById(id);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Поставщик не найден');
            }

            return response.data.user;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 7. Получение водителей
export const fetchDrivers = createAsyncThunk(
    'user/fetchDrivers',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await userApi.getDrivers(params);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка получения водителей');
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 8. Получение всех водителей без пагинации
export const fetchAllDrivers = createAsyncThunk(
    'user/fetchAllDrivers',
    async (_, { rejectWithValue }) => {
        try {
            const response = await userApi.getAllDrivers();

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка получения списка водителей');
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 9. Получение водителя по ID
export const fetchDriverById = createAsyncThunk(
    'user/fetchDriverById',
    async (id, { rejectWithValue }) => {
        try {
            const response = await userApi.getDriverById(id);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Водитель не найден');
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 10. Получение остановок водителя
export const fetchDriverStops = createAsyncThunk(
    'user/fetchDriverStops',
    async ({ id, params = {} }, { rejectWithValue }) => {
        try {
            const response = await userApi.getDriverStops(id, params);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка получения остановок водителя');
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// Создание slice
const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        clearUserErrors: (state) => {
            state.users.error = null;
            state.clients.error = null;
            state.employees.error = null;
            state.suppliers.error = null;
            state.drivers.error = null;
            state.allDrivers.error = null;
            state.currentUser.error = null;
            state.currentSupplier.error = null;
            state.currentDriver.error = null;
            state.driverStops.error = null;
        },
        clearCurrentUser: (state) => {
            state.currentUser.data = null;
            state.currentUser.error = null;
        },
        clearCurrentSupplier: (state) => {
            state.currentSupplier.data = null;
            state.currentSupplier.error = null;
        },
        clearCurrentDriver: (state) => {
            state.currentDriver.data = null;
            state.currentDriver.error = null;
            state.driverStops.items = [];
        },
        clearUserState: () => initialState
    },
    extraReducers: (builder) => {
        // Обработка fetchAllUsers
        builder
            .addCase(fetchAllUsers.pending, (state) => {
                state.users.isLoading = true;
                state.users.error = null;
            })
            .addCase(fetchAllUsers.fulfilled, (state, action) => {
                state.users.isLoading = false;
                state.users.items = action.payload.staff || [];
                state.users.total = action.payload.total || 0;
                state.users.page = action.payload.page || 1;
                state.users.pages = action.payload.pages || 1;
            })
            .addCase(fetchAllUsers.rejected, (state, action) => {
                state.users.isLoading = false;
                state.users.error = action.payload;
            })

            // Обработка fetchUserById
            .addCase(fetchUserById.pending, (state) => {
                state.currentUser.isLoading = true;
                state.currentUser.error = null;
            })
            .addCase(fetchUserById.fulfilled, (state, action) => {
                state.currentUser.isLoading = false;
                state.currentUser.data = action.payload;
            })
            .addCase(fetchUserById.rejected, (state, action) => {
                state.currentUser.isLoading = false;
                state.currentUser.error = action.payload;
            })

            // Обработка fetchClients
            .addCase(fetchClients.pending, (state) => {
                state.clients.isLoading = true;
                state.clients.error = null;
            })
            .addCase(fetchClients.fulfilled, (state, action) => {
                state.clients.isLoading = false;
                state.clients.items = action.payload.staff || [];
                state.clients.total = action.payload.total || 0;
                state.clients.page = action.payload.page || 1;
                state.clients.pages = action.payload.pages || 1;
            })
            .addCase(fetchClients.rejected, (state, action) => {
                state.clients.isLoading = false;
                state.clients.error = action.payload;
            })

            // Обработка fetchEmployees
            .addCase(fetchEmployees.pending, (state) => {
                state.employees.isLoading = true;
                state.employees.error = null;
            })
            .addCase(fetchEmployees.fulfilled, (state, action) => {
                state.employees.isLoading = false;
                state.employees.items = action.payload.staff || [];
                state.employees.total = action.payload.total || 0;
                state.employees.page = action.payload.page || 1;
                state.employees.pages = action.payload.pages || 1;
            })
            .addCase(fetchEmployees.rejected, (state, action) => {
                state.employees.isLoading = false;
                state.employees.error = action.payload;
            })

            // Обработка fetchSuppliers
            .addCase(fetchSuppliers.pending, (state) => {
                state.suppliers.isLoading = true;
                state.suppliers.error = null;
            })
            .addCase(fetchSuppliers.fulfilled, (state, action) => {
                state.suppliers.isLoading = false;
                state.suppliers.items = action.payload.staff || [];
                state.suppliers.total = action.payload.total || 0;
                state.suppliers.page = action.payload.page || 1;
                state.suppliers.pages = action.payload.pages || 1;
            })
            .addCase(fetchSuppliers.rejected, (state, action) => {
                state.suppliers.isLoading = false;
                state.suppliers.error = action.payload;
            })

            // Обработка fetchSupplierById
            .addCase(fetchSupplierById.pending, (state) => {
                state.currentSupplier.isLoading = true;
                state.currentSupplier.error = null;
            })
            .addCase(fetchSupplierById.fulfilled, (state, action) => {
                state.currentSupplier.isLoading = false;
                state.currentSupplier.data = action.payload;
            })
            .addCase(fetchSupplierById.rejected, (state, action) => {
                state.currentSupplier.isLoading = false;
                state.currentSupplier.error = action.payload;
            })

            // Обработка fetchDrivers
            .addCase(fetchDrivers.pending, (state) => {
                state.drivers.isLoading = true;
                state.drivers.error = null;
            })
            .addCase(fetchDrivers.fulfilled, (state, action) => {
                state.drivers.isLoading = false;
                state.drivers.items = action.payload.staff || [];
                state.drivers.total = action.payload.total || 0;
                state.drivers.page = action.payload.page || 1;
                state.drivers.pages = action.payload.pages || 1;
            })
            .addCase(fetchDrivers.rejected, (state, action) => {
                state.drivers.isLoading = false;
                state.drivers.error = action.payload;
            })

            // Обработка fetchAllDrivers
            .addCase(fetchAllDrivers.pending, (state) => {
                state.allDrivers.isLoading = true;
                state.allDrivers.error = null;
            })
            .addCase(fetchAllDrivers.fulfilled, (state, action) => {
                state.allDrivers.isLoading = false;
                state.allDrivers.items = action.payload || [];
            })
            .addCase(fetchAllDrivers.rejected, (state, action) => {
                state.allDrivers.isLoading = false;
                state.allDrivers.error = action.payload;
            })

            // Обработка fetchDriverById
            .addCase(fetchDriverById.pending, (state) => {
                state.currentDriver.isLoading = true;
                state.currentDriver.error = null;
            })
            .addCase(fetchDriverById.fulfilled, (state, action) => {
                state.currentDriver.isLoading = false;
                state.currentDriver.data = action.payload;
            })
            .addCase(fetchDriverById.rejected, (state, action) => {
                state.currentDriver.isLoading = false;
                state.currentDriver.error = action.payload;
            })

            // Обработка fetchDriverStops
            .addCase(fetchDriverStops.pending, (state) => {
                state.driverStops.isLoading = true;
                state.driverStops.error = null;
            })
            .addCase(fetchDriverStops.fulfilled, (state, action) => {
                state.driverStops.isLoading = false;
                state.driverStops.items = action.payload || [];
            })
            .addCase(fetchDriverStops.rejected, (state, action) => {
                state.driverStops.isLoading = false;
                state.driverStops.error = action.payload;
            });
    }
});

export const {
    clearUserErrors,
    clearCurrentUser,
    clearCurrentSupplier,
    clearCurrentDriver,
    clearUserState
} = userSlice.actions;

export default userSlice.reducer;