import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '@entities/auth/api/authApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api, authService, getBaseUrl, createProtectedRequest} from '@shared/api/api';
import { fetchNotificationSettings } from '@entities/notification/model/slice';

const STORAGE_KEYS = {
    TOKENS: 'tokens',
};

const saveTokensToStorage = async (tokens) => {
    try {
        if (!tokens) {
            throw new Error('Токены не предоставлены');
        }

        if (!tokens.accessToken || typeof tokens.accessToken !== 'string') {
            throw new Error('Отсутствует или некорректный accessToken');
        }

        if (!tokens.refreshToken || typeof tokens.refreshToken !== 'string') {
            throw new Error('Отсутствует или некорректный refreshToken');
        }

        const tokensToSave = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };

        const tokensString = JSON.stringify(tokensToSave);
        await AsyncStorage.setItem(STORAGE_KEYS.TOKENS, tokensString);

        if (api && api.defaults) {
            api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
        }

        return true;
    } catch (error) {
        throw error;
    }
};

export const removeTokensFromStorage = async () => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS.TOKENS);
    } catch (error) {
        // Ошибка при удалении токенов игнорируется
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
    districtId: null,
    customDistrict: '',
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
    if (error.message === 'Refresh token отсутствует') {
        return null;
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
            const { email, password, name, phone, address, gender, districtId, customDistrict } = data;
            const payload = {
                email,
                password,
                name,
                phone,
                address,
                gender: gender || 'PREFER_NOT_TO_SAY', // Устанавливаем значение по умолчанию, если gender пустой
                ...(districtId && { districtId: parseInt(districtId) }),
                ...(customDistrict && { customDistrict })
            };
            const response = await authApi.initiateRegister(payload);

            if (!response || !response.status) {
                return rejectWithValue('Неожиданный формат ответа');
            }

            if (response.status === 'error') {
                // Передаём полную структуру ошибки
                return rejectWithValue({
                    message: response.message || 'Ошибка при инициализации регистрации',
                    errors: response.errors || [],
                    code: response.code || 400
                });
            }

            return response;
        } catch (error) {
            // Передаём полную структуру ошибки для обработки на клиенте
            const errorData = {
                message: error?.message || handleError(error),
                errors: error?.errors || error?.response?.data?.errors || [],
                code: error?.code || error?.response?.status
            };
            return rejectWithValue(errorData);
        }
    }
);

export const completeRegister = createAsyncThunk(
    'auth/completeRegister',
    async (data, { rejectWithValue }) => {
        try {
            const response = await authApi.completeRegister(data);

            if (!response || typeof response !== 'object') {
                return rejectWithValue('Сервер вернул некорректный ответ');
            }

            if (response.status !== 'success') {
                return rejectWithValue(response.message || 'Произошла ошибка при регистрации');
            }

            const responseData = response.data;
            if (!responseData) {
                return rejectWithValue('Сервер вернул некорректный ответ');
            }

            const { accessToken, refreshToken, user } = responseData;

            if (!accessToken || !refreshToken) {
                return rejectWithValue('Токены авторизации не получены от сервера');
            }

            const tokens = { accessToken, refreshToken };

            try {
                await saveTokensToStorage(tokens);
            } catch (storageError) {
                // Ошибка сохранения токенов игнорируется
            }

            return {
                user,
                tokens
            };
        } catch (error) {
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

            if (response && response.data && typeof response.data === 'object') {
                const nestedData = response.data.data || response.data;

                if (nestedData.accessToken && nestedData.refreshToken) {
                    const accessToken = nestedData.accessToken;
                    const refreshToken = nestedData.refreshToken;
                    const user = nestedData.user || { id: 'unknown' };

                    await authService.saveTokens({ accessToken, refreshToken });

                    return {
                        requiresTwoFactor: false,
                        tokens: { accessToken, refreshToken },
                        user,
                    };
                }
            }

            return rejectWithValue('Неожиданный формат ответа от сервера');
        } catch (error) {

            if (error.response?.data) {
                return rejectWithValue(error.response.data.message || 'Произошла ошибка при входе');
            }

            return rejectWithValue(error.message || 'Произошла ошибка при входе');
        }
    }
);

export const logout = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue, getState, dispatch }) => {
        try {
            // Деактивируем OneSignal токен перед выходом
            try {
                const OneSignalService = require('@shared/services/OneSignalService').default;
                await OneSignalService.clearUserContext();
            } catch (oneSignalError) {
                // Ошибка деактивации OneSignal игнорируется
            }

            // Очищаем кэш чатов
            try {
                await AsyncStorage.removeItem('chat.rooms');
            } catch (cacheError) {
                // Ошибка очистки кэша игнорируется
            }

            dispatch({ type: 'RESET_APP_STATE' });

            const { auth } = getState();
            const refreshToken = auth?.tokens?.refreshToken;

            if (!refreshToken) {
                await removeTokensFromStorage();
                return null;
            }

            try {
                await authApi.logout(refreshToken);
            } catch (error) {
                // Ошибка серверного выхода игнорируется, продолжаем локальный выход
            }

            await removeTokensFromStorage();

            return null;
        } catch (error) {
            await removeTokensFromStorage();

            dispatch({ type: 'RESET_APP_STATE' });
            return rejectWithValue(handleError(error));
        }
    }
);



export const refreshToken = createAsyncThunk(
    'auth/refreshToken',
    async (_, { rejectWithValue, getState, dispatch }) => {
        try {
            const { auth } = getState();
            const tokens = auth.tokens;

            if (!tokens || !tokens.refreshToken) {
                await removeTokensFromStorage();
                dispatch({ type: 'auth/resetState' });
                throw new Error('Необходима повторная авторизация');
            }

            // Проверяем валидность refresh-токена
            try {
                const decoded = authService.decodeToken(tokens.refreshToken);
                const currentTime = Math.floor(Date.now() / 1000);

                if (!decoded || !decoded.exp || decoded.exp <= currentTime) {
                    await removeTokensFromStorage();
                    // НЕ сбрасываем RESET_APP_STATE - только auth
                    dispatch({ type: 'auth/resetState' });
                    throw new Error('Ваша сессия истекла. Пожалуйста, войдите снова для продолжения работы.');
                }
            } catch (decodeError) {
                await removeTokensFromStorage();
                // НЕ сбрасываем RESET_APP_STATE - только auth
                dispatch({ type: 'auth/resetState' });
                throw new Error('Проблема с токеном авторизации. Пожалуйста, войдите снова.');
            }

            const response = await authApi.refreshToken(tokens.refreshToken);

            // Проверяем структуру ответа
            let accessToken, refreshToken;

            if (response?.status === 'success' && response.data) {
                accessToken = response.data.accessToken || response.data.data?.accessToken;
                refreshToken = response.data.refreshToken || response.data.data?.refreshToken;
            }

            if (!accessToken || !refreshToken) {
                throw new Error('Некорректный ответ от сервера при обновлении токена');
            }

            const newTokens = { accessToken, refreshToken };
            await saveTokensToStorage(newTokens);

            return newTokens;
        } catch (error) {

            if (error.response?.status === 401 || error.code === 'ERR_NETWORK') {
                await removeTokensFromStorage();
                // НЕ сбрасываем RESET_APP_STATE - только auth
                dispatch({ type: 'auth/resetState' });
            }

            return rejectWithValue(
                error.message || 'Произошла ошибка при обновлении сессии'
            );
        }
    }
);
export const loadUserProfile = createAsyncThunk(
    'auth/loadUserProfile',
    async (_, { rejectWithValue, dispatch, getState }) => {
        try {
            const state = getState();
            const currentUser = state.auth?.user;

            if (!currentUser?.id) {
                throw new Error('Пользователь не авторизован');
            }

            // Загружаем полный профиль через API
            const response = await createProtectedRequest('get', '/api/profile');

            if (!response || !response.data) {
                throw new Error('Не удалось получить данные профиля');
            }

            const profileData = response.data;

            // Обновляем пользователя полными данными
            dispatch(updateUserWithProfile(profileData));

            return profileData;

        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка загрузки профиля');
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
        resetState: () => {
            return initialState;
        },
        clearProfile: (state) => {
            Object.assign(state, initialState);
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
                        token: action.payload.accessToken,
                    };
                }
            } catch (error) {
                // Ошибка декодирования токена игнорируется
            }
        },
        setUser: (state, action) => {
            // Сохраняем токен при обновлении пользователя
            const currentToken = state.user?.token;
            state.user = {
                ...action.payload,
                token: currentToken || action.payload?.token
            };
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
        setDistrictId: (state, action) => {
            state.districtId = action.payload;
            // Если выбран район из списка, очищаем кастомный район
            if (action.payload) {
                state.customDistrict = '';
            }
        },
        setCustomDistrict: (state, action) => {
            state.customDistrict = action.payload;
            // Если введён кастомный район, очищаем выбранный из списка
            if (action.payload) {
                state.districtId = null;
            }
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
            state.districtId = null;
            state.customDistrict = '';
            state.tempToken = null;
            state.error = null;
        },
        updateUserWithProfile: (state, action) => {
            const profileData = action.payload;

            if (profileData && state.user) {
                state.user = {
                    id: profileData.id,
                    email: profileData.email,
                    role: profileData.role,
                    avatar: profileData.avatar,
                    gender: profileData.gender,
                    twoFactorEnabled: profileData.twoFactorEnabled,
                    twoFactorSecret: profileData.twoFactorSecret,
                    createdAt: profileData.createdAt,
                    updatedAt: profileData.updatedAt,
                    client: profileData.client ? {
                        id: profileData.client.id,
                        name: profileData.client.name,
                        phone: profileData.client.phone,
                        address: profileData.client.address,
                        districtId: profileData.client.districtId,
                        district: profileData.client.district,
                        orders: profileData.client.orders || []
                    } : null,
                    admin: profileData.admin || null,
                    employee: profileData.employee || null,
                    supplier: profileData.supplier || null,
                    driver: profileData.driver || null
                };
            }
        },
        updateUserClient: (state, action) => {
            const clientData = action.payload;

            if (state.user && clientData) {
                state.user.client = {
                    id: clientData.id,
                    name: clientData.name,
                    phone: clientData.phone,
                    address: clientData.address,
                    districtId: clientData.districtId,
                    district: clientData.district,
                    orders: clientData.orders || []
                };
            }
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
                // Ошибка декодирования токена игнорируется
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

                    // Устанавливаем токены в API заголовки
                    if (action.payload.tokens?.accessToken) {
                        try {
                            if (api && api.defaults) {
                                api.defaults.headers.common['Authorization'] = `Bearer ${action.payload.tokens.accessToken}`;
                            }
                        } catch (error) {
                            // Ошибка установки заголовка игнорируется
                        }
                    }
                }
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;

                state.error = typeof action.payload === 'string'
                    ? action.payload
                    : action.payload?.message || 'Произошла ошибка при входе';

                state.isAuthenticated = false;
            })
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
            })

            .addCase('auth/setTokens', (state, action) => {
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
                    // Ошибка декодирования токена игнорируется
                }
            })
            .addCase(refreshToken.pending, setPending)
            .addCase(refreshToken.fulfilled, (state, action) => {
                state.isLoading = false;
                state.tokens = action.payload;
                state.isAuthenticated = true;
            })
            .addCase(refreshToken.rejected, setRejected)
            .addCase(loadUserProfile.fulfilled, (state, action) => {
                // Профиль уже обновлен через updateUserWithProfile dispatch
            })
            .addCase(loadUserProfile.rejected, (state, action) => {
                state.error = action.payload;
            })
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
    setDistrictId,
    setCustomDistrict,
    setTwoFactorRequired,
    clearTwoFactorRequired,
    clearAuthForm,
    resetState,
    clearProfile,
    updateUserWithProfile,
    updateUserClient,
} = authSlice.actions;

export default authSlice.reducer;
