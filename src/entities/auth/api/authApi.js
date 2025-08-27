import { createApiModule } from '@shared/services/ApiClient';
import { createPublicRequest } from '@shared/api/api';

// Используем обычный модуль для методов, требующих авторизации
const authApi = createApiModule('/api/auth');
const staffApplicationsApi = createApiModule('/api/staff-applications');

// Базовый URL для auth API
const BASE_AUTH_URL = '/api/auth';

export const authApiMethods = {
    // Инициация регистрации - публичный запрос
    initiateRegister: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/register/initiate`, data),

    // Завершение регистрации - публичный запрос
    completeRegister: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/register/complete`, {
            registrationToken: data.registrationToken,
            verificationCode: data.verificationCode,
        }),

    // Вход в систему - публичный запрос
    login: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/login`, data),

    // Верификация 2FA - публичный запрос
    verify2FALogin: ({ tempToken, twoFactorCode }) =>
        createPublicRequest('post', `${BASE_AUTH_URL}/2fa/verify-login`, 
            { tempToken, twoFactorCode: twoFactorCode.toString() }),

    // Выход из системы - требует авторизации
    logout: (refreshToken) => authApi.post('/logout', { refreshToken }),

    // Обновление токена - публичный запрос
    refreshToken: (refreshToken) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/refresh-token`, { refreshToken }),

    // Получение текущего пользователя - требует авторизации
    getMe: () => authApi.get('/me'),

    // Подача заявки на роль сотрудника - требует авторизации
    applyForStaff: (data) => staffApplicationsApi.post('/apply', data),
};

export { authApiMethods as authApi };