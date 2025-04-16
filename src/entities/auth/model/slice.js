import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '@entities/auth/api/authApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api, authService} from '@shared/api/api';

const STORAGE_KEYS = {
    TOKENS: 'tokens',
};

const saveTokensToStorage = async (tokens) => {
    try {
        if (!tokens) {
            console.error('saveTokensToStorage: токены не предоставлены');
            throw new Error('Токены не предоставлены');
        }

        if (!tokens.accessToken || typeof tokens.accessToken !== 'string') {
            console.error('saveTokensToStorage: отсутствует или некорректный accessToken', tokens);
            throw new Error('Отсутствует или некорректный accessToken');
        }

        if (!tokens.refreshToken || typeof tokens.refreshToken !== 'string') {
            console.error('saveTokensToStorage: отсутствует или некорректный refreshToken', tokens);
            throw new Error('Отсутствует или некорректный refreshToken');
        }

        const tokensToSave = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };

        const tokensString = JSON.stringify(tokensToSave);
        await AsyncStorage.setItem(STORAGE_KEYS.TOKENS, tokensString);

        console.log('Токены успешно сохранены, длина строки:', tokensString.length);

        if (api && api.defaults) {
            api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
            console.log('Токен доступа установлен в заголовки API');
        }

        return true;
    } catch (error) {
        console.error('Ошибка при сохранении токенов:', error);
        throw error;
    }
};

const removeTokensFromStorage = async () => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS.TOKENS);
    } catch (error) {
        console.error('Error removing tokens:', error);
    }
};

const initialState = {
    user: null,
    tokens: null,
    email: '',
    password: '',
    name: '',
    phone: '',
    address: '',
    gender: '',
    isLoading: false,
    error: null,
    isAuthenticated: false,
    requiresTwoFactor: false,
    tempToken: null,
};

const handleError = (error) => {
    if (error.code === 'ECONNABORTED') {
        return 'Превышено время ожидания. Проверьте подключение к сети.';
    }
    if (!error.response) {
        return 'Ошибка сети. Проверьте подключение.';
    }
    return error.response?.data?.message || 'Произошла ошибка';
};

export const initiateRegister = createAsyncThunk(
    'auth/initiateRegister',
    async (data, { rejectWithValue }) => {
        try {
            const { email, password, name, phone, address, gender } = data;
            const payload = {
                email,
                password,
                name,
                phone,
                address,
                gender: gender || 'PREFER_NOT_TO_SAY' // Устанавливаем значение по умолчанию, если gender пустой
            };
            console.log('Отправка запроса на инициацию регистрации:', payload); // Логирование для отладки
            const response = await authApi.initiateRegister(payload);

            if (!response || !response.status) {
                console.error('Неожиданный формат ответа при инициации регистрации:', response);
                return rejectWithValue('Неожиданный формат ответа');
            }

            if (response.status === 'error') {
                return rejectWithValue(response.message || 'Ошибка при инициализации регистрации');
            }

            console.log('Ответ от сервера при инициации регистрации:', response);
            return response;
        } catch (error) {
            console.error('Registration initiation error:', error);
            return rejectWithValue(error?.message || handleError(error));
        }
    }
);

export const completeRegister = createAsyncThunk(
    'auth/completeRegister',
    async (data, { rejectWithValue }) => {
        try {
            console.log('Отправка запроса на завершение регистрации:', data);
            const response = await authApi.completeRegister(data);

            if (!response || typeof response !== 'object') {
                console.error('Получен некорректный ответ:', response);
                return rejectWithValue('Сервер вернул некорректный ответ');
            }

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Произошла ошибка при регистрации');
            }

            const responseData = response.data;
            if (!responseData) {
                console.error('Данные отсутствуют в ответе:', response);
                return rejectWithValue('Сервер вернул некорректный ответ');
            }

            const { accessToken, refreshToken, user } = responseData;

            if (!accessToken || !refreshToken) {
                console.error('Токены отсутствуют в ответе:', responseData);
                return rejectWithValue('Токены авторизации не получены от сервера');
            }

            const tokens = { accessToken, refreshToken };

            try {
                await saveTokensToStorage(tokens);
            } catch (storageError) {
                console.error('Ошибка при сохранении токенов:', storageError);
            }

            console.log('Ответ от сервера при завершении регистрации:', response);
            return {
                user,
                tokens
            };
        } catch (error) {
            console.error('Complete registration error:', error);
            if (error.response?.data) {
                const serverError = error.response.data;
                return rejectWithValue(serverError.message || 'Произошла ошибка при подтверждении кода');
            }

            return rejectWithValue(error.message || 'Произошла неизвестная ошибка при регистрации');
        }
    }
);

export const verify2FALogin = createAsyncThunk(
    'auth/verify2FALogin',
    async ({ tempToken, twoFactorCode }, { rejectWithValue }) => {
        try {
            const response = await authApi.verify2FALogin({
                tempToken,
                twoFactorCode: twoFactorCode.toString(),
            });

            if (response.status === 'error') {
                throw new Error(response.message);
            }

            if (!response || !response.status || response.status !== 'success') {
                console.error('Неожиданная структура ответа при 2FA:', response);
                return rejectWithValue('Неожиданный формат ответа');
            }

            const data = response.data;

            if (!data || !data.accessToken || !data.refreshToken) {
                return rejectWithValue('Токены не получены');
            }

            const { accessToken, refreshToken, user } = data;
            await authService.saveTokens({ accessToken, refreshToken });

            return {
                user,
                tokens: { accessToken, refreshToken },
            };
        } catch (error) {
            if (error.response?.data?.message) {
                return rejectWithValue(error.response.data.message);
            }
            if (error.message) {
                return rejectWithValue(error.message);
            }
            return rejectWithValue('Произошла ошибка при проверке кода');
        }
    }
);

export const login = createAsyncThunk(
    'auth/login',
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await authApi.login(credentials);

            if (response && response.status === 'success' && response.data) {
                const { accessToken, refreshToken, user } = response.data;

                if (!accessToken || !refreshToken) {
                    return rejectWithValue('Токены не найдены в ответе сервера');
                }

                await authService.saveTokens({ accessToken, refreshToken });

                return {
                    requiresTwoFactor: false,
                    tokens: { accessToken, refreshToken },
                    user,
                };
            }

            if (response && response.status === 'pending' && response.requiresTwoFactor) {
                return {
                    requiresTwoFactor: true,
                    tempToken: response.tempToken,
                    message: response.message,
                };
            }

            return rejectWithValue('Неожиданный формат ответа от сервера');
        } catch (error) {
            if (error.response?.data) {
                console.log('Error response data:', error.response.data);
            }
            return rejectWithValue(error.response?.data?.message || 'Произошла ошибка при входе');
        }
    }
);

export const logout = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue, getState }) => {
        try {
            const { auth } = getState();
            const refreshToken = auth.tokens?.refreshToken;

            if (!refreshToken) {
                console.warn('Попытка выхода без refresh token');
                await removeTokensFromStorage();
                return null;
            }

            console.log('Attempting logout with refreshToken:', refreshToken);
            const response = await authApi.logout(refreshToken);

            console.log('Logout response:', response);
            await removeTokensFromStorage();
            return null;
        } catch (error) {
            console.error('Logout failed:', error);
            await removeTokensFromStorage();
            return rejectWithValue(handleError(error));
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        setTokens: (state, action) => {
            state.tokens = action.payload;
            state.isAuthenticated = true;
            try {
                const decoded = authService.decodeToken(action.payload.accessToken);
                if (decoded) {
                    state.user = {
                        id: decoded.userId,
                        role: decoded.role,
                    };
                }
            } catch (error) {
                console.error('Error in setTokens:', error);
            }
        },
        setUser: (state, action) => {
            state.user = action.payload;
        },
        setEmail: (state, action) => {
            state.email = action.payload;
        },
        setPassword: (state, action) => {
            state.password = action.payload;
        },
        setName: (state, action) => {
            state.name = action.payload;
        },
        setPhone: (state, action) => {
            state.phone = action.payload;
        },
        setAddress: (state, action) => {
            state.address = action.payload;
        },
        setGender: (state, action) => {
            state.gender = action.payload;
        },
        setTwoFactorRequired: (state, action) => {
            state.requiresTwoFactor = true;
            state.tempToken = action.payload;
        },
        clearTwoFactorRequired: (state) => {
            state.requiresTwoFactor = false;
            state.tempToken = null;
        },
        clearAuthForm: (state) => {
            state.email = '';
            state.password = '';
            state.name = '';
            state.phone = '';
            state.address = '';
            state.gender = '';
            state.tempToken = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        const setPending = (state) => {
            state.isLoading = true;
            state.error = null;
        };

        const setRejected = (state, action) => {
            state.isLoading = false;

            const errorMessage =
                typeof action.payload === 'string' ? action.payload :
                    action.payload?.message ||
                    action.payload?.data?.message ||
                    action.payload?.error ||
                    'Произошла ошибка';

            state.error = errorMessage;
            state.isAuthenticated = false;
            console.log('Set rejected error:', errorMessage);
        };

        const setTokens = (state, action) => {
            state.tokens = action.payload;
            state.isAuthenticated = true;
            try {
                const decoded = JSON.parse(atob(action.payload.accessToken.split('.')[1]));
                state.user = {
                    id: decoded.userId,
                    role: decoded.role,
                };
            } catch (error) {
                console.error('Error decoding token:', error);
            }
            authService.saveTokens(action.payload);
        };

        builder
            .addCase(login.pending, setPending)
            .addCase(login.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null;
                if (action.payload.requiresTwoFactor) {
                    state.requiresTwoFactor = true;
                    state.tempToken = action.payload.tempToken;
                } else {
                    state.tokens = action.payload.tokens;
                    state.user = action.payload.user;
                    state.isAuthenticated = true;
                }
            })
            .addCase(login.rejected, setRejected)
            .addCase(verify2FALogin.pending, setPending)
            .addCase(verify2FALogin.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null;
                state.user = action.payload.user;
                state.tokens = action.payload.tokens;
                state.isAuthenticated = true;
                state.requiresTwoFactor = false;
                state.tempToken = null;
            })
            .addCase(verify2FALogin.rejected, setRejected)
            .addCase(initiateRegister.pending, setPending)
            .addCase(initiateRegister.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null;
                state.tempToken = action.payload?.registrationToken || null;
            })
            .addCase(initiateRegister.rejected, setRejected)
            .addCase(completeRegister.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(completeRegister.fulfilled, (state, action) => {
                state.isLoading = false;
                state.error = null;

                if (action.payload && action.payload.user && action.payload.tokens) {
                    state.user = action.payload.user;
                    state.tokens = action.payload.tokens;
                    state.isAuthenticated = true;
                    state.tempToken = null;
                } else {
                    state.error = 'Ошибка авторизации: недостаточно данных';
                    state.isAuthenticated = false;
                }
            })
            .addCase(completeRegister.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || 'Произошла ошибка при завершении регистрации';
                state.isAuthenticated = false;
            })
            .addCase(logout.fulfilled, (state) => {
                Object.assign(state, initialState);
            })
            .addCase(logout.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || 'Произошла ошибка при выходе';
                state.isAuthenticated = false;
            });
    },
});

export const {
    clearError,
    setTokens,
    setUser,
    setEmail,
    setPassword,
    setName,
    setPhone,
    setAddress,
    setGender,
    setTwoFactorRequired,
    clearTwoFactorRequired,
    clearAuthForm,
} = authSlice.actions;

export default authSlice.reducer;
