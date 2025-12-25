import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminApi } from '../api/adminApi';

// Начальное состояние
const initialState = {
    users: {
        items: [],
        total: 0,
        page: 1,
        pages: 1,
        limit: 10,
        isLoading: false,
        error: null
    },
    admins: {
        items: [],
        isLoading: false,
        error: null
    },
    staff: {
        items: [],
        total: 0,
        page: 1,
        pages: 1,
        isLoading: false,
        error: null
    },
    warehouses: {
        items: [],
        isLoading: false,
        error: null
    },
    districts: {
        items: [],
        isLoading: false,
        error: null
    },
    operation: {
        isLoading: false,
        error: null,
        success: null
    }
};

// Вспомогательная функция для обработки ошибок
const handleError = (error) => {
    console.error('=== Error Debug ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error response:', error.response);
    console.error('Error config:', error.config);
    console.error('Error data:', error.data);
    console.error('Error status:', error.status);
    console.error('Full error object:', error);
    console.error('==================');

    if (error.message && typeof error.message === 'string' && error.message !== 'Network Error') {
        return error.message;
    }

    if (error.data?.message) {
        return error.data.message;
    }

    if (error.response?.data?.message) {
        return error.response.data.message;
    }

    if (error.response?.data && typeof error.response.data === 'string') {
        return error.response.data;
    }

    if (error.code === 'ECONNABORTED') {
        return 'Превышено время ожидания. Проверьте подключение к сети.';
    }

    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        return 'Ошибка сети. Проверьте подключение.';
    }

    const statusCode = error.status || error.response?.status;
    if (statusCode) {
        switch (statusCode) {
            case 400:
                return error.message || 'Неверные данные запроса';
            case 401:
                return 'Ошибка авторизации';
            case 403:
                return 'Доступ запрещен';
            case 404:
                return 'Ресурс не найден';
            case 409:
                return error.message || 'Конфликт данных';
            case 422:
                return error.message || 'Ошибка валидации данных';
            case 500:
                return 'Внутренняя ошибка сервера';
            default:
                return error.message || `Ошибка сервера (код ${statusCode})`;
        }
    }

    return error.message || error.data?.message || 'Произошла неизвестная ошибка';
};

// Асинхронные экшены

// 1. Получение всех пользователей
export const fetchAllUsers = createAsyncThunk(
    'admin/fetchAllUsers',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await adminApi.getAllUsers(params);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка получения пользователей');
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 2. Получение списка администраторов
export const fetchAdmins = createAsyncThunk(
    'admin/fetchAdmins',
    async (_, { rejectWithValue }) => {
        try {
            const response = await adminApi.getAdmins();

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка получения администраторов');
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 3. Получение списка сотрудников, поставщиков и водителей
export const fetchStaff = createAsyncThunk(
    'admin/fetchStaff',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await adminApi.getStaff(params);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка получения персонала');
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 4. Создание администратора
export const createAdmin = createAsyncThunk(
    'admin/createAdmin',
    async (data, { rejectWithValue }) => {
        try {
            const response = await adminApi.createAdmin(data);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка создания администратора');
            }

            return {
                admin: response.data.admin,
                message: response.message || 'Администратор успешно создан'
            };
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 5. Создание сотрудника, поставщика или водителя
export const createStaff = createAsyncThunk(
    'admin/createStaff',
    async (data, { rejectWithValue }) => {
        try {
            const response = await adminApi.createStaff(data);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка создания сотрудника');
            }

            return {
                staff: response.data.staff,
                message: response.message || 'Сотрудник успешно создан'
            };
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 6. Изменение роли пользователя
export const changeUserRole = createAsyncThunk(
    'admin/changeUserRole',
    async ({ userId, data }, { rejectWithValue }) => {
        try {
            const response = await adminApi.changeUserRole(userId, data);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка изменения роли');
            }

            return {
                user: response.data?.user,
                message: response.message || 'Роль пользователя успешно изменена'
            };
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 7. Удаление администратора
export const deleteAdmin = createAsyncThunk(
    'admin/deleteAdmin',
    async (adminId, { rejectWithValue }) => {
        try {
            const response = await adminApi.deleteAdmin(adminId);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка удаления администратора');
            }

            return {
                adminId,
                message: response.message || 'Администратор успешно удален'
            };
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 8. Удаление сотрудника, поставщика или водителя
export const deleteStaff = createAsyncThunk(
    'admin/deleteStaff',
    async (userId, { rejectWithValue }) => {
        try {
            const response = await adminApi.deleteStaff(userId);

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка удаления сотрудника');
            }

            return {
                userId,
                message: response.message || 'Сотрудник успешно удален'
            };
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 9. Получение складов для выбора при создании сотрудника
export const fetchWarehousesForSelection = createAsyncThunk(
    'admin/fetchWarehousesForSelection',
    async (_, { rejectWithValue }) => {
        try {
            const response = await adminApi.getWarehousesForSelection();

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка получения складов');
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// 10. Получение районов для выбора при создании сотрудника
export const fetchDistrictsForSelection = createAsyncThunk(
    'admin/fetchDistrictsForSelection',
    async (_, { rejectWithValue }) => {
        try {
            const response = await adminApi.getDistrictsForSelection();

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Ошибка получения районов');
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// Создание slice
const adminSlice = createSlice({
    name: 'admin',
    initialState,
    reducers: {
        clearAdminErrors: (state) => {
            state.users.error = null;
            state.admins.error = null;
            state.staff.error = null;
            state.operation.error = null;
        },
        clearOperationState: (state) => {
            state.operation.isLoading = false;
            state.operation.error = null;
            state.operation.success = null;
        },
        clearUsersList: (state) => {
            state.users.items = [];
            state.users.page = 1;
            state.users.total = 0;
            state.users.pages = 1;
        },
        clearAdminState: () => initialState
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllUsers.pending, (state) => {
                state.users.isLoading = true;
                state.users.error = null;
            })
            .addCase(fetchAllUsers.fulfilled, (state, action) => {
                state.users.isLoading = false;
                const newPage = action.payload.page || 1;
                
                if (newPage === 1) {
                    state.users.items = action.payload.users || [];
                } else {
                    const existingItems = state.users.items || [];
                    const newItems = action.payload.users || [];
                    state.users.items = [...existingItems, ...newItems];
                }
                
                state.users.total = action.payload.total || 0;
                state.users.page = newPage;
                state.users.pages = action.payload.pages || 1;
                state.users.limit = action.payload.limit || 10;
            })
            .addCase(fetchAllUsers.rejected, (state, action) => {
                state.users.isLoading = false;
                state.users.error = action.payload;
            })

            // Обработка fetchAdmins
            .addCase(fetchAdmins.pending, (state) => {
                state.admins.isLoading = true;
                state.admins.error = null;
            })
            .addCase(fetchAdmins.fulfilled, (state, action) => {
                state.admins.isLoading = false;
                state.admins.items = action.payload.admins || [];
            })
            .addCase(fetchAdmins.rejected, (state, action) => {
                state.admins.isLoading = false;
                state.admins.error = action.payload;
            })

            // Обработка fetchStaff
            .addCase(fetchStaff.pending, (state) => {
                state.staff.isLoading = true;
                state.staff.error = null;
            })
            .addCase(fetchStaff.fulfilled, (state, action) => {
                state.staff.isLoading = false;
                state.staff.items = action.payload.staff || [];
                state.staff.total = action.payload.total || 0;
                state.staff.page = action.payload.page || 1;
                state.staff.pages = action.payload.pages || 1;
            })
            .addCase(fetchStaff.rejected, (state, action) => {
                state.staff.isLoading = false;
                state.staff.error = action.payload;
            })

            // Обработка createAdmin
            .addCase(createAdmin.pending, (state) => {
                state.operation.isLoading = true;
                state.operation.error = null;
                state.operation.success = null;
            })
            .addCase(createAdmin.fulfilled, (state, action) => {
                state.operation.isLoading = false;
                state.operation.success = action.payload.message;
                if (state.admins.items.length > 0) {
                    state.admins.items.unshift(action.payload.admin);
                }
            })
            .addCase(createAdmin.rejected, (state, action) => {
                state.operation.isLoading = false;
                state.operation.error = action.payload;
            })

            // Обработка createStaff
            .addCase(createStaff.pending, (state) => {
                state.operation.isLoading = true;
                state.operation.error = null;
                state.operation.success = null;
            })
            .addCase(createStaff.fulfilled, (state, action) => {
                state.operation.isLoading = false;
                state.operation.success = action.payload.message;
                if (state.staff.items.length > 0) {
                    state.staff.items.unshift(action.payload.staff);
                }
            })
            .addCase(createStaff.rejected, (state, action) => {
                state.operation.isLoading = false;
                state.operation.error = action.payload;
            })

            // Обработка changeUserRole
            .addCase(changeUserRole.pending, (state) => {
                state.operation.isLoading = true;
                state.operation.error = null;
                state.operation.success = null;
            })
            .addCase(changeUserRole.fulfilled, (state, action) => {
                state.operation.isLoading = false;
                state.operation.success = action.payload.message;
                if (action.payload.user) {
                    const userIndex = state.users.items.findIndex(user => user.id === action.payload.user.id);
                    if (userIndex !== -1) {
                        state.users.items[userIndex] = action.payload.user;
                    }
                }
            })
            .addCase(changeUserRole.rejected, (state, action) => {
                state.operation.isLoading = false;
                state.operation.error = action.payload;
            })

            // Обработка deleteAdmin
            .addCase(deleteAdmin.pending, (state) => {
                state.operation.isLoading = true;
                state.operation.error = null;
                state.operation.success = null;
            })
            .addCase(deleteAdmin.fulfilled, (state, action) => {
                state.operation.isLoading = false;
                state.operation.success = action.payload.message;
                state.admins.items = state.admins.items.filter(admin => admin.id !== action.payload.adminId);
                state.users.items = state.users.items.filter(user => user.id !== action.payload.adminId);
            })
            .addCase(deleteAdmin.rejected, (state, action) => {
                state.operation.isLoading = false;
                state.operation.error = action.payload;
            })

            // Обработка deleteStaff
            .addCase(deleteStaff.pending, (state) => {
                state.operation.isLoading = true;
                state.operation.error = null;
                state.operation.success = null;
            })
            .addCase(deleteStaff.fulfilled, (state, action) => {
                state.operation.isLoading = false;
                state.operation.success = action.payload.message;
                state.staff.items = state.staff.items.filter(staff => staff.id !== action.payload.userId);
                state.users.items = state.users.items.filter(user => user.id !== action.payload.userId);
            })
            .addCase(deleteStaff.rejected, (state, action) => {
                state.operation.isLoading = false;
                state.operation.error = action.payload;
            })

            // Обработка fetchWarehousesForSelection
            .addCase(fetchWarehousesForSelection.pending, (state) => {
                state.warehouses.isLoading = true;
                state.warehouses.error = null;
            })
            .addCase(fetchWarehousesForSelection.fulfilled, (state, action) => {
                state.warehouses.isLoading = false;
                state.warehouses.items = action.payload.warehouses || [];
            })
            .addCase(fetchWarehousesForSelection.rejected, (state, action) => {
                state.warehouses.isLoading = false;
                state.warehouses.error = action.payload;
            })

            // Обработка fetchDistrictsForSelection
            .addCase(fetchDistrictsForSelection.pending, (state) => {
                state.districts.isLoading = true;
                state.districts.error = null;
            })
            .addCase(fetchDistrictsForSelection.fulfilled, (state, action) => {
                state.districts.isLoading = false;
                state.districts.items = action.payload.districts || [];
            })
            .addCase(fetchDistrictsForSelection.rejected, (state, action) => {
                state.districts.isLoading = false;
                state.districts.error = action.payload;
            });
    }
});

export const {
    clearAdminErrors,
    clearOperationState,
    clearUsersList,
    clearAdminState
} = adminSlice.actions;

export default adminSlice.reducer;
