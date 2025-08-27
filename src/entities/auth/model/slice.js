import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '@entities/auth/api/authApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {api, authService, getBaseUrl, createProtectedRequest} from '@shared/api/api';

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

export const removeTokensFromStorage = async () => {
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

    console.error('=== Error Debug ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error response:', error.response);
    console.error('Error config:', error.config);
    console.error('==================');

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
            console.log('Attempting login with credentials:', {
                email: credentials.email,
                passwordProvided: !!credentials.password
            });

            const response = await authApi.login(credentials);

            console.log('Login raw response:', response);

            if (response && response.status === 'success' && response.data) {
                const { accessToken, refreshToken, user } = response.data;

                if (!accessToken || !refreshToken) {
                    console.error('Missing tokens in response:', response.data);
                    return rejectWithValue('Токены не найдены в ответе сервера');
                }

                await authService.saveTokens({ accessToken, refreshToken });

                console.log('Login successful with user:', { userId: user?.id });

                return {
                    requiresTwoFactor: false,
                    tokens: { accessToken, refreshToken },
                    user,
                };
            }

            if (response && response.status === 'pending' && response.requiresTwoFactor) {
                console.log('Two-factor authentication required');
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

            console.error('Unexpected response format:', response);
            return rejectWithValue('Неожиданный формат ответа от сервера');
        } catch (error) {
            console.error('Login error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });

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
            console.log('Logout: начало процесса выхода');

            dispatch({ type: 'RESET_APP_STATE' });

            const { auth } = getState();
            const refreshToken = auth?.tokens?.refreshToken;

            if (!refreshToken) {
                console.log('Logout: refreshToken отсутствует, локальный выход');
                await removeTokensFromStorage();
                return null;
            }

            try {
                console.log('Logout: отправка запроса на сервер');
                await authApi.logout(refreshToken);
                console.log('Logout: успешный запрос на выход');
            } catch (error) {
                console.warn('Logout: ошибка серверного выхода, продолжаем локальный выход', error);
            }

            console.log('Logout: удаление токенов из хранилища');
            await removeTokensFromStorage();

            console.log('Logout: выход завершен успешно');
            return null;
        } catch (error) {
            console.error('Logout: ошибка при выходе', error);
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

            console.log('refreshToken thunk: Проверка наличия refresh token');

            if (!tokens || !tokens.refreshToken) {
                console.error('refreshToken thunk: токены или refresh token отсутствуют');
                await removeTokensFromStorage();
                dispatch({ type: 'auth/resetState' });
                throw new Error('Необходима повторная авторизация');
            }

            // Проверяем валидность refresh-токена
            try {
                const decoded = authService.decodeToken(tokens.refreshToken);
                const currentTime = Math.floor(Date.now() / 1000);

                console.log('refreshToken thunk: Проверка валидности токена', {
                    hasExp: !!decoded?.exp,
                    tokenExp: decoded?.exp,
                    currentTime,
                    isExpired: decoded?.exp < currentTime,
                });

                if (!decoded || !decoded.exp || decoded.exp < currentTime) {
                    console.error('refreshToken thunk: refresh token истек или некорректен');
                    await removeTokensFromStorage();
                    dispatch({ type: 'auth/resetState' });
                    throw new Error('Истёк срок действия сессии. Пожалуйста, войдите в систему снова.');
                }
            } catch (decodeError) {
                console.error('refreshToken thunk: Ошибка декодирования refresh token:', decodeError);
                await removeTokensFromStorage();
                dispatch({ type: 'auth/resetState' });
                throw new Error('Проблема с токеном авторизации. Пожалуйста, войдите в систему снова.');
            }

            console.log('refreshToken thunk: Отправка запроса на обновление токена');

            const response = await authApi.refreshToken(tokens.refreshToken);

            console.log('refreshToken thunk: Ответ от сервера:', response);

            // Проверяем структуру ответа
            let accessToken, refreshToken;

            if (response?.status === 'success' && response.data) {
                accessToken = response.data.accessToken || response.data.data?.accessToken;
                refreshToken = response.data.refreshToken || response.data.data?.refreshToken;
            }

            if (!accessToken || !refreshToken) {
                console.error('refreshToken thunk: Неожиданная структура ответа:', response);
                throw new Error('Некорректный ответ от сервера при обновлении токена');
            }

            const newTokens = { accessToken, refreshToken };
            await saveTokensToStorage(newTokens);

            console.log('refreshToken thunk: Токены успешно обновлены');

            return newTokens;
        } catch (error) {
            console.error('refreshToken thunk: Ошибка обновления токена:', error);

            if (error.response?.status === 401 || error.code === 'ERR_NETWORK') {
                await removeTokensFromStorage();
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
            console.log('🔄 Загрузка полного профиля пользователя...');

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

            console.log('📥 Профиль загружен:', {
                userId: profileData.id,
                hasClient: !!profileData.client,
                clientId: profileData.client?.id,
                districtId: profileData.client?.districtId,
                districtName: profileData.client?.district?.name
            });

            // Обновляем пользователя полными данными
            dispatch(updateUserWithProfile(profileData));

            return profileData;

        } catch (error) {
            console.error('❌ Ошибка загрузки профиля:', error);
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

                console.log('✅ Пользователь обновлен полными данными профиля:', {
                    userId: state.user.id,
                    clientId: state.user.client?.id,
                    districtId: state.user.client?.districtId,
                    districtName: state.user.client?.district?.name
                });
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

                console.log('✅ Данные клиента обновлены:', {
                    clientId: state.user.client.id,
                    districtId: state.user.client.districtId
                });
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

                    if (action.payload.tokens?.accessToken) {
                        api.defaults.headers.common['Authorization'] = `Bearer ${action.payload.tokens.accessToken}`;
                        console.log('Заголовок Authorization установлен после входа');
                    }

                    console.log('🔄 Требуется загрузка полного профиля для пользователя:', state.user?.id);
                }
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;

                state.error = typeof action.payload === 'string'
                    ? action.payload
                    : action.payload?.message || 'Произошла ошибка при входе';

                state.isAuthenticated = false;
                console.log('Set rejected error:', state.error);
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
                    console.error('Ошибка при декодировании токена:', error);
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
                console.log('✅ Профиль успешно загружен и обновлен');
            })
            .addCase(loadUserProfile.rejected, (state, action) => {
                console.error('❌ Ошибка загрузки профиля:', action.payload);
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
    setTwoFactorRequired,
    clearTwoFactorRequired,
    clearAuthForm,
    resetState,
    clearProfile,
    updateUserWithProfile,
    updateUserClient,
} = authSlice.actions;

export default authSlice.reducer;
