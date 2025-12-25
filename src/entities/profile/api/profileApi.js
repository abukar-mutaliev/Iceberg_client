import { createApiModule } from '@shared/services/ApiClient';

const profileApi = createApiModule('/api/profile');

export const profileApiMethods = {
    // Получение профиля
    getProfile: () => profileApi.get(),

    // Обновление профиля
    updateProfile: (data) => profileApi.put('', data),

    // Обновление аватара
    updateAvatar: (formData, options = {}) => {
        const timestamp = new Date().getTime();
        const config = {
            ...options,
            headers: {
                ...options.headers,
                'Content-Type': 'multipart/form-data',
            },
            timeout: options.timeout || 120000,
        };

        return profileApi.post(`/avatar?_t=${timestamp}`, formData, config);
    },

    // Смена пароля
    changePassword: (data) => profileApi.put('/password', data),

    // Удаление профиля
    deleteProfile: (passwordData) => profileApi.delete('', passwordData)
};

export { profileApiMethods as profileApi };