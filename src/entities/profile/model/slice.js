import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {profileApi} from '../api/profileApi';

const initialState = {
    data: null,
    isLoading: false,
    error: null,
    avatarUploadProgress: 0,
    isAvatarUploading: false,
    avatarError: null,
};

const handleError = (error) => {
    // Обработка таймаута
    if (error.code === 'ECONNABORTED') {
        return 'Превышено время ожидания. Проверьте подключение к сети.';
    }
    
    // Логируем структуру ошибки для отладки
    if (__DEV__) {
        console.log('handleError - error structure:', {
            hasResponse: !!error.response,
            responseStatus: error.response?.status,
            responseData: error.response?.data,
            errorMessage: error.message,
            errorCode: error.code,
            errorKeys: Object.keys(error || {}),
            directMessage: error.message,
            directCode: error.code,
            directStatus: error.status
        });
    }
    
    // СЛУЧАЙ 1: Если это axios error с response (стандартный случай)
    if (error.response) {
        const responseData = error.response.data;
        
        // Если есть массив errors с детальными сообщениями валидации
        if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
            const firstError = responseData.errors[0];
            if (firstError?.msg) {
                return firstError.msg;
            }
            if (firstError?.message) {
                return firstError.message;
            }
        }
        
        // Извлекаем сообщение об ошибке
        const errorMessage = 
            responseData?.message || 
            responseData?.error?.message ||
            error.message ||
            'Произошла ошибка';
        
        return errorMessage;
    }
    
    // СЛУЧАЙ 2: Если это объект данных ошибки напрямую (из createProtectedRequest)
    // createProtectedRequest выбрасывает error.response?.data || error
    // Поэтому error может быть объектом {code: 400, message: "Неверный пароль", errors: [], status: "error"}
    if (error && typeof error === 'object' && !error.response) {
        // Если есть массив errors с детальными сообщениями валидации
        if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
            const firstError = error.errors[0];
            if (firstError?.msg) {
                return firstError.msg;
            }
            if (firstError?.message) {
                return firstError.message;
            }
        }
        
        // Извлекаем сообщение об ошибке
        const errorMessage = 
            error.message || 
            error.error?.message ||
            'Произошла ошибка';
        
        if (errorMessage && errorMessage !== 'Произошла ошибка') {
            return errorMessage;
        }
    }
    
    // СЛУЧАЙ 3: Если есть data вложенный объект
    if (error.data) {
        const errorMessage = 
            error.data?.message ||
            error.data?.error?.message;
        if (errorMessage) {
            return errorMessage;
        }
    }
    
    // СЛУЧАЙ 4: Если это строка или есть message напрямую
    if (typeof error === 'string') {
        return error;
    }
    
    if (error.message && !error.message.includes('Network Error') && !error.message.includes('timeout')) {
        return error.message;
    }
    
    // СЛУЧАЙ 5: Сетевая ошибка
    return 'Ошибка сети. Проверьте подключение.';
};

export const fetchProfile = createAsyncThunk(
    'profile/fetchProfile',
    async (_, {rejectWithValue, getState}) => {
        try {
            const {auth} = getState();
            const userRole = auth?.user?.role;
            const userId = auth?.user?.id;

            console.log(`Загрузка профиля для пользователя ID: ${userId}, роль: ${userRole}`);

            // Проверка текущего профиля
            const currentProfile = getState().profile.data;
            if (currentProfile && currentProfile.id && currentProfile.id !== userId) {
                console.log(`Несоответствие ID профиля (${currentProfile.id}) и пользователя (${userId}). Сбрасываем профиль.`);
            }

            // Остальной код функции без изменений
            if (userRole === 'ADMIN') {
                try {
                    const response = await profileApi.getProfile();
                    // Проверяем соответствие ID профиля и пользователя
                    if (response.data && userId && response.data.id !== userId) {
                        console.warn(`Загруженный профиль (ID: ${response.data.id}) не соответствует текущему пользователю (ID: ${userId})`);
                    }
                    return response;
                } catch (error) {
                    if (error.response?.status === 404 &&
                        error.response?.data?.message?.includes('Профиль admin не найден')) {
                        return {
                            data: {
                                id: userId, // Добавляем ID пользователя
                                user: {
                                    ...auth.user,
                                    name: 'Администратор'
                                }
                            }
                        };
                    }
                    throw error;
                }
            }

            const response = await profileApi.getProfile();
            // Проверяем соответствие ID профиля и пользователя
            if (response.data && userId && response.data.id !== userId) {
                console.warn(`Загруженный профиль (ID: ${response.data.id}) не соответствует текущему пользователю (ID: ${userId})`);
            }
            return response;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);


export const updateProfile = createAsyncThunk(
    'profile/updateProfile',
    async (data, {rejectWithValue}) => {
        try {
            const response = await profileApi.updateProfile(data);
            return response;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);


export const updateAvatar = createAsyncThunk(
    'profile/updateAvatar',
    async (formData, {rejectWithValue, dispatch}) => {
        try {
            dispatch(setAvatarUploadProgress(0));

            const onUploadProgress = (progressEvent) => {
                try {
                    if (progressEvent && progressEvent.lengthComputable) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );

                        if (percentCompleted % 10 === 0 || percentCompleted === 100) {
                            dispatch(setAvatarUploadProgress(percentCompleted));
                        }
                    }
                } catch (error) {
                }
            };

            if (!(formData instanceof FormData)) {
                throw new Error('Неверный формат данных для загрузки аватара');
            }

            const options = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress,
                timeout: 120000,
            };

            let retries = 2;
            let response;

            while (retries >= 0) {
                try {
                    response = await profileApi.updateAvatar(formData, options);
                    break;
                } catch (err) {
                    if (retries === 0 || !err.message?.includes('подключением')) {
                        throw err;
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    retries--;
                }
            }

            dispatch(setAvatarUploadProgress(100));
            await dispatch(fetchProfile()).unwrap();

            return response;
        } catch (error) {
            dispatch(setAvatarUploadProgress(0));

            return rejectWithValue(
                typeof error === 'object' && error.message
                    ? error.message
                    : 'Произошла ошибка при обновлении аватара'
            );
        }
    }
);

export const changePassword = createAsyncThunk(
    'profile/changePassword',
    async (passwordData, {rejectWithValue}) => {
        try {
            const response = await profileApi.changePassword(passwordData);
            return response;
        } catch (error) {
            console.error('Error in changePassword:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const deleteProfile = createAsyncThunk(
    'profile/deleteProfile',
    async (passwordData, {rejectWithValue}) => {
        try {
            const response = await profileApi.deleteProfile(passwordData);
            return response;
        } catch (error) {
            console.error('Error in deleteProfile:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const syncSupplierWithUser = createAsyncThunk(
    'profile/syncSupplierWithUser',
    async (_, { getState, dispatch }) => {
        const state = getState();
        const profile = state.profile.data;
        const user = state.auth.user;

        if (user?.role === 'SUPPLIER' && profile && profile.id) {
            dispatch({
                type: 'auth/updateSupplierInfo',
                payload: {
                    supplier: {
                        id: profile.id,
                        name: profile.companyName,
                        contactPerson: profile.contactPerson,
                        phone: profile.phone,
                        address: profile.address,
                        inn: profile.inn,
                        ogrn: profile.ogrn,
                        bankAccount: profile.bankAccount,
                        bik: profile.bik
                    }
                }
            });

            console.log('Данные поставщика синхронизированы с объектом пользователя');
            return profile;
        }

        return null;
    }
);

const profileSlice = createSlice({
    name: 'profile',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearAvatarError: (state) => {
            state.avatarError = null;
        },
        setAvatarUploadProgress: (state, action) => {
            state.avatarUploadProgress = action.payload;
        },
        updateSupplierInfo: (state, action) => {
            if (state.user && state.user.role === 'SUPPLIER') {
                state.user.supplier = action.payload.supplier;
                console.log('User supplier info updated:', state.user.supplier);
            }
        },
        clearProfile: () => {
            console.log('Очистка профиля');
            return initialState;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase('auth/updateSupplierInfo', (state, action) => {
                if (state.user && state.user.role === 'SUPPLIER') {
                    state.user.supplier = action.payload.supplier;
                    console.log('User supplier info updated:', state.user.supplier);
                }
            })
            .addCase(fetchProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;

            })
            .addCase(fetchProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.data = action.payload.data;
                state.error = null;
            })
            .addCase(fetchProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            .addCase(updateProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.data = action.payload.data;
            })
            .addCase(updateProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Обработка состояний для updateAvatar
            .addCase(updateAvatar.pending, (state) => {
                state.isAvatarUploading = true;
                state.avatarError = null;
            })
            .addCase(updateAvatar.fulfilled, (state, action) => {
                state.isAvatarUploading = false;
                state.avatarUploadProgress = 100;

                // Если ответ содержит обновленную ссылку на аватар, обновляем её в стейте
                if (action.payload?.data?.avatar && state.data) {
                    if (state.data.user) {
                        state.data.user.avatar = action.payload.data.avatar;
                    } else if (state.data.avatar) {
                        state.data.avatar = action.payload.data.avatar;
                    }
                }
            })
            .addCase(updateAvatar.rejected, (state, action) => {
                state.isAvatarUploading = false;
                state.avatarError = action.payload;
                state.avatarUploadProgress = 0;
            })

            // Обработка состояний для changePassword
            .addCase(changePassword.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(changePassword.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(changePassword.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Удаление аккаунта
            .addCase(deleteProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(deleteProfile.fulfilled, (state) => {
                state.isLoading = false;
                state.data = null;
            })
            .addCase(deleteProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const {clearError, clearProfile, clearAvatarError, setAvatarUploadProgress} = profileSlice.actions;

export const profileReducer = profileSlice.reducer;
export default profileSlice.reducer;