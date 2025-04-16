import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userApi } from '@entities/user/api/userApi';

const initialState = {
    clients: [],
    employees: [],
    allUsers: [],
    currentUser: null,
    isLoading: false,
    error: null,

    usersMap: {
        clients: {},
        employees: {},
        all: {}
    }
};

const handleApiError = (error) => {
    console.error('API Error:', error);

    if (error.code === 'ECONNABORTED') {
        return 'Превышено время ожидания. Проверьте подключение к сети.';
    }
    if (!error.response) {
        return error.message || 'Ошибка сети. Проверьте подключение.';
    }

    const status = error.response?.status;
    const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        'Неизвестная ошибка';

    if (status === 404) {
        return 'Данные не найдены на сервере';
    } else if (status === 403) {
        return 'Нет доступа к данным';
    } else if (status >= 500) {
        return 'Внутренняя ошибка сервера. Попробуйте позже.';
    }

    return errorMessage;
};

export const createUser = createAsyncThunk(
    'user/createUser',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await userApi.createUser(userData);
            return response.data.data.user;
        } catch (error) {
            return rejectWithValue(handleApiError(error));
        }
    }
);

export const fetchClients = createAsyncThunk(
    'user/fetchClients',
    async (params = {}, { rejectWithValue }) => {
        try {
            console.log('Отправка запроса на получение клиентов...');
            const response = await userApi.getClients(params);
            console.log('Получен ответ:', response);

            if (response && response.status === 'success' && response.data) {
                return response.data;
            } else {
                console.error('Некорректный формат ответа:', response);
                return rejectWithValue('Некорректный формат ответа от сервера');
            }
        } catch (error) {
            console.error('Ошибка при получении клиентов:', error);
            return rejectWithValue(handleApiError(error));
        }
    }
);

export const fetchEmployees = createAsyncThunk(
    'user/fetchEmployees',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await userApi.getEmployees(params);

            if (response && response.status === 'success' && response.data) {
                return response.data;
            } else {
                console.error('Некорректный формат ответа:', response);
                return rejectWithValue('Некорректный формат ответа от сервера');
            }
        } catch (error) {
            console.error('Ошибка при получении сотрудников:', error);
            return rejectWithValue(handleApiError(error));
        }
    }
);

export const fetchAllUsers = createAsyncThunk(
    'user/fetchAllUsers',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await userApi.getAllUsers(params);

            if (response && response.status === 'success' && response.data) {
                return response.data;
            } else {
                console.error('Некорректный формат ответа:', response);
                return rejectWithValue('Некорректный формат ответа от сервера');
            }
        } catch (error) {
            console.error('Ошибка при получении всех пользователей:', error);
            return rejectWithValue(handleApiError(error));
        }
    }
);

export const fetchUserById = createAsyncThunk(
    'user/fetchUserById',
    async (id, { rejectWithValue }) => {
        try {
            console.log(`Запрос пользователя с ID: ${id}`);

            if (!id) {
                return rejectWithValue('ID пользователя не указан');
            }

            const response = await userApi.getUserById(id);
            console.log(`Получен ответ для пользователя ${id}:`, response);

            if (response && response.data && response.data.data && response.data.data.user) {
                return response.data.data.user;
            } else if (response && response.data && response.data.user) {
                return response.data.user;
            } else if (response && response.data) {
                return response.data;
            } else {
                console.error('Неожиданный формат ответа:', response);
                return rejectWithValue('Неверный формат данных от сервера');
            }
        } catch (error) {
            const errorMessage = handleApiError(error);
            return rejectWithValue(errorMessage);
        }
    }
);

export const updateUser = createAsyncThunk(
    'user/updateUser',
    async ({ id, userData }, { rejectWithValue }) => {
        try {
            const response = await userApi.updateUser(id, userData);
            return response.data.data.user;
        } catch (error) {
            return rejectWithValue(handleApiError(error));
        }
    }
);

export const deleteUser = createAsyncThunk(
    'user/deleteUser',
    async (id, { rejectWithValue }) => {
        try {
            await userApi.deleteUser(id);
            return id;
        } catch (error) {
            return rejectWithValue(handleApiError(error));
        }
    }
);

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        setCurrentUser: (state, action) => {
            state.currentUser = action.payload;
        },
        clearCurrentUser: (state) => {
            state.currentUser = null;
        },
    },

    extraReducers: (builder) => {
        const setPending = (state) => {
            state.isLoading = true;
            state.error = null;
        };
        const setRejected = (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        };

        builder
            .addCase(createUser.pending, setPending)
            .addCase(createUser.fulfilled, (state, action) => {
                state.isLoading = false;
                const user = action.payload;

                if (user.role === 'CLIENT') {
                    state.clients.push(user);
                    state.usersMap.clients[user.id] = user;
                } else if (user.role === 'EMPLOYEE') {
                    state.employees.push(user);
                    state.usersMap.employees[user.id] = user;
                }

                state.usersMap.all[user.id] = user;
            })
            .addCase(createUser.rejected, setRejected)

            .addCase(fetchClients.pending, setPending)
            .addCase(fetchClients.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null;

                console.log('Обработка ответа fetchClients:', action.payload);

                if (action.payload && action.payload.staff) {
                    state.clients = action.payload.staff;

                    state.usersMap.clients = {};
                    action.payload.staff.forEach(user => {
                        if (user) {
                            state.usersMap.all[user.id] = user;
                            state.usersMap.clients[user.id] = user;
                            console.log(`Сохранен клиент ${user.id} с email ${user.email}`);
                        } else {
                            console.warn('Получен некорректный клиент:', user);
                        }
                    });

                    console.log('Обновлена мапа клиентов. Количество клиентов:', Object.keys(state.usersMap.clients).length);
                    const clientKeys = Object.keys(state.usersMap.clients);
                    if (clientKeys.length > 0) {
                        console.log('Примеры ключей в мапе клиентов:', clientKeys.slice(0, 3));
                    }
                } else {
                    console.error('Неожиданный формат ответа в fetchClients:', action.payload);
                    state.error = 'Ошибка при получении данных';
                }
            })
            .addCase(fetchClients.rejected, setRejected)

            .addCase(fetchEmployees.pending, setPending)
            .addCase(fetchEmployees.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null;

                if (action.payload && action.payload.staff) {
                    state.employees = action.payload.staff;

                    state.usersMap.employees = {};
                    action.payload.staff.forEach(employee => {
                        state.usersMap.employees[employee.id] = employee;
                        state.usersMap.all[employee.id] = employee;
                    });
                } else {
                    console.error('Неожиданный формат ответа в fetchEmployees:', action.payload);
                    state.error = 'Ошибка при получении данных';
                }
            })
            .addCase(fetchEmployees.rejected, setRejected)

            .addCase(fetchAllUsers.pending, setPending)
            .addCase(fetchAllUsers.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null;

                if (action.payload && action.payload.staff) {
                    state.allUsers = action.payload.staff;

                    action.payload.staff.forEach(user => {
                        state.usersMap.all[user.id] = user;

                        if (user.role === 'CLIENT') {
                            state.usersMap.clients[user.id] = user;
                        } else if (user.role === 'EMPLOYEE') {
                            state.usersMap.employees[user.id] = user;
                        }
                    });
                } else {
                    console.error('Неожиданный формат ответа в fetchAllUsers:', action.payload);
                    state.error = 'Ошибка при получении данных';
                }
            })
            .addCase(fetchAllUsers.rejected, setRejected)

            .addCase(fetchUserById.pending, setPending)
            .addCase(fetchUserById.fulfilled, (state, action) => {
                state.isLoading = false;
                const user = action.payload;
                console.log('Сохранение пользователя в Redux:', user);

                state.usersMap.all[user.id] = user;
                state.currentUser = user;

                if (user.role === 'CLIENT') {
                    const clientIndex = state.clients.findIndex(client => client.id === user.id);
                    if (clientIndex !== -1) {
                        state.clients[clientIndex] = user;
                    } else {
                        state.clients.push(user);
                    }
                    state.usersMap.clients[user.id] = user;
                } else if (user.role === 'EMPLOYEE') {
                    const employeeIndex = state.employees.findIndex(employee => employee.id === user.id);
                    if (employeeIndex !== -1) {
                        state.employees[employeeIndex] = user;
                    } else {
                        state.employees.push(user);
                    }
                    state.usersMap.employees[user.id] = user;
                }
            })
            .addCase(fetchUserById.rejected, setRejected)

            .addCase(updateUser.pending, setPending)
            .addCase(updateUser.fulfilled, (state, action) => {
                state.isLoading = false;
                const user = action.payload;

                state.usersMap.all[user.id] = user;
                const allUserIndex = state.allUsers.findIndex(u => u.id === user.id);
                if (allUserIndex !== -1) {
                    state.allUsers[allUserIndex] = user;
                }

                if (user.role === 'CLIENT') {
                    const clientIndex = state.clients.findIndex(client => client.id === user.id);
                    if (clientIndex !== -1) {
                        state.clients[clientIndex] = user;
                    }
                    state.usersMap.clients[user.id] = user;
                } else if (user.role === 'EMPLOYEE') {
                    const employeeIndex = state.employees.findIndex(employee => employee.id === user.id);
                    if (employeeIndex !== -1) {
                        state.employees[employeeIndex] = user;
                    }
                    state.usersMap.employees[user.id] = user;
                }

                if (state.currentUser?.id === user.id) {
                    state.currentUser = user;
                }
            })
            .addCase(updateUser.rejected, setRejected)

            .addCase(deleteUser.pending, setPending)
            .addCase(deleteUser.fulfilled, (state, action) => {
                state.isLoading = false;
                const userId = action.payload;

                const user = state.usersMap.all[userId];

                if (user) {
                    if (user.role === 'CLIENT') {
                        state.clients = state.clients.filter(client => client.id !== userId);
                        delete state.usersMap.clients[userId];
                    } else if (user.role === 'EMPLOYEE') {
                        state.employees = state.employees.filter(employee => employee.id !== userId);
                        delete state.usersMap.employees[userId];
                    }

                    state.allUsers = state.allUsers.filter(u => u.id !== userId);
                    delete state.usersMap.all[userId];

                    if (state.currentUser?.id === userId) {
                        state.currentUser = null;
                    }
                }
            })
            .addCase(deleteUser.rejected, setRejected);
    },
});

export const { clearError, setCurrentUser, clearCurrentUser } = userSlice.actions;
export default userSlice.reducer;