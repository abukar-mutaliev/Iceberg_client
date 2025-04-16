import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { profileApi } from '../api/profileApi';

const initialState = {
    data: null,
    isLoading: false,
    error: null,
    avatarUploadProgress: 0,
    isAvatarUploading: false,
    avatarError: null,
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

export const fetchProfile = createAsyncThunk(
    'profile/fetchProfile',
    async (_, { rejectWithValue }) => {
        try {
            const response = await profileApi.getProfile();
            return response;
        } catch (error) {
            console.error('Error in fetchProfile:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const updateProfile = createAsyncThunk(
    'profile/updateProfile',
    async (data, { rejectWithValue }) => {
        try {
            const response = await profileApi.updateProfile(data);
            return response;
        } catch (error) {
            return rejectWithValue(handleError(error));
        }
    }
);

// Новый thunk для загрузки аватара
export const updateAvatar = createAsyncThunk(
    'profile/updateAvatar',
    async (formData, { rejectWithValue, dispatch }) => {
        try {
            dispatch(setAvatarUploadProgress(0));

            // Создаем обработчик прогресса загрузки, если API поддерживает
            const onUploadProgress = (progressEvent) => {
                if (progressEvent.lengthComputable) {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    dispatch(setAvatarUploadProgress(percentCompleted));
                }
            };

            // Добавляем обработчик прогресса в опции, если API поддерживает
            const options = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress,
            };

            const response = await profileApi.updateAvatar(formData, options);

            // После успешной загрузки обновляем профиль
            dispatch(fetchProfile());

            return response;
        } catch (error) {
            console.error('Error in updateAvatar:', error);
            return rejectWithValue(handleError(error));
        }
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
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.data = action.payload.data;
                console.log('Профиль сохранен в state:', state.data);
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
            });
    },
});

export const { clearError, clearAvatarError, setAvatarUploadProgress } = profileSlice.actions;


export default profileSlice.reducer;