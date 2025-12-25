import { createApiModule } from '@shared/services/ApiClient';
import { createPublicRequest } from '@shared/api/api';

// Используем обычный модуль для методов, требующих авторизации
const authApi = createApiModule('/api/auth');
const staffApplicationsApi = createApiModule('/api/staff-applications');

// Базовый URL для auth API
const BASE_AUTH_URL = '/api/auth';

export const authApiMethods = {
    // ========================================
    // РЕГИСТРАЦИЯ ПО EMAIL
    // ========================================
    
    // Инициация регистрации - публичный запрос
    initiateRegister: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/register/initiate`, data),

    // Завершение регистрации - публичный запрос
    completeRegister: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/register/complete`, {
            registrationToken: data.registrationToken,
            verificationCode: data.verificationCode,
        }),

    // ========================================
    // РЕГИСТРАЦИЯ ПО ТЕЛЕФОНУ
    // ========================================
    
    // Инициация регистрации по телефону - публичный запрос
    initiatePhoneRegister: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/initiate-register-phone`, data),

    // Завершение регистрации по телефону - публичный запрос
    completePhoneRegister: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/complete-register-phone`, {
            registrationToken: data.registrationToken,
            verificationCode: data.verificationCode,
        }),

    // ========================================
    // ВХОД В СИСТЕМУ
    // ========================================
    
    // Вход в систему (email + пароль) - публичный запрос
    login: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/login`, data),

    // Инициация входа по телефону - публичный запрос
    initiatePhoneLogin: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/initiate-phone-login`, data),

    // Завершение входа по телефону - публичный запрос
    verifyPhoneLogin: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/verify-phone-login`, data),

    // Вход по телефону + пароль - публичный запрос
    loginPhone: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/login-phone`, data),

    // Верификация 2FA - публичный запрос
    verify2FALogin: ({ tempToken, twoFactorCode }) =>
        createPublicRequest('post', `${BASE_AUTH_URL}/2fa/verify-login`, 
            { tempToken, twoFactorCode: twoFactorCode.toString() }),

    // ========================================
    // ОБЩИЕ МЕТОДЫ
    // ========================================
    
    // Выход из системы - требует авторизации
    logout: (refreshToken) => authApi.post('/logout', { refreshToken }),

    // Обновление токена - публичный запрос
    refreshToken: (refreshToken) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/refresh-token`, { refreshToken }),

    // Получение текущего пользователя - требует авторизации
    getMe: () => authApi.get('/me'),

    // Подача заявки на роль сотрудника - требует авторизации
    applyForStaff: (data) => staffApplicationsApi.post('/apply', data),

    // ========================================
    // ВОССТАНОВЛЕНИЕ ПАРОЛЯ
    // ========================================
    
    // Инициация сброса пароля (email или телефон) - публичный запрос
    initiatePasswordReset: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/password/reset/initiate`, data),

    // Проверка кода сброса пароля - публичный запрос
    verifyResetCode: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/password/reset/verify`, {
            resetToken: data.resetToken,
            verificationCode: data.verificationCode,
        }),

    // Установка нового пароля - публичный запрос
    completePasswordReset: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/password/reset/complete`, {
            confirmResetToken: data.confirmResetToken,
            password: data.password,
        }),
};

export { authApiMethods as authApi };