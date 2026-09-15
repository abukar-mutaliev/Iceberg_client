import { createApiModule } from '@shared/services/ApiClient';
import { createPublicRequest } from '@shared/api/api';
import { withDeviceId } from '@shared/lib/deviceId';

// Используем обычный модуль для методов, требующих авторизации
const authApi = createApiModule('/api/auth');
const staffApplicationsApi = createApiModule('/api/staff-applications');

// Базовый URL для auth API
const BASE_AUTH_URL = '/api/auth';

export const authApiMethods = {
    // ========================================
    // ЕДИНЫЙ ПОТОК ВХОДА И РЕГИСТРАЦИИ ПО НОМЕРУ
    // ========================================

    // Шаг 1: запрос кода. Ответ одинаков и для зарегистрированного номера,
    // и для нового — приложение заранее не знает, вход это или регистрация.
    // Ответ: { challengeToken, codeLength, expiresAt, resendAfter }
    phoneAuthStart: (data) =>
        createPublicRequest('post', `${BASE_AUTH_URL}/phone/start`, data),

    // Шаг 2: подтверждение кода. Здесь и выясняется исход:
    //   isNewUser: true  → аккаунт только что создан, needsProfile тоже true
    //   needsProfile     → нужен онбординг (имя и район)
    //   requiresTwoFactor → вместо сессии приходит tempToken
    phoneAuthVerify: async ({ challengeToken, verificationCode }) =>
        createPublicRequest('post', `${BASE_AUTH_URL}/phone/verify`, await withDeviceId({
            challengeToken,
            verificationCode,
        })),

    // ========================================
    // РЕГИСТРАЦИЯ ПО EMAIL
    // ========================================
    
    // Инициация регистрации - публичный запрос
    initiateRegister: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/register/initiate`, data),

    // Завершение регистрации - публичный запрос
    completeRegister: async (data) =>
        createPublicRequest('post', `${BASE_AUTH_URL}/register/complete`, await withDeviceId({
            registrationToken: data.registrationToken,
            verificationCode: data.verificationCode,
        })),

    // ========================================
    // РЕГИСТРАЦИЯ ПО ТЕЛЕФОНУ
    // ========================================
    
    // Инициация регистрации по телефону - публичный запрос
    initiatePhoneRegister: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/initiate-register-phone`, data),

    // Завершение регистрации по телефону - публичный запрос
    completePhoneRegister: async (data) =>
        createPublicRequest('post', `${BASE_AUTH_URL}/complete-register-phone`, await withDeviceId({
            registrationToken: data.registrationToken,
            verificationCode: data.verificationCode,
        })),

    // ========================================
    // ВХОД В СИСТЕМУ
    // ========================================
    
    // Вход в систему (email + пароль) - публичный запрос
    login: async (data) =>
        createPublicRequest('post', `${BASE_AUTH_URL}/login`, await withDeviceId(data)),

    // Инициация входа по телефону - публичный запрос
    initiatePhoneLogin: (data) => 
        createPublicRequest('post', `${BASE_AUTH_URL}/initiate-phone-login`, data),

    // Завершение входа по телефону - публичный запрос
    verifyPhoneLogin: async (data) =>
        createPublicRequest('post', `${BASE_AUTH_URL}/verify-phone-login`, await withDeviceId(data)),

    // Вход по телефону + пароль - публичный запрос
    loginPhone: async (data) =>
        createPublicRequest('post', `${BASE_AUTH_URL}/login-phone`, await withDeviceId(data)),

    // Верификация 2FA - публичный запрос
    verify2FALogin: async ({ tempToken, twoFactorCode }) =>
        createPublicRequest('post', `${BASE_AUTH_URL}/2fa/verify-login`, await withDeviceId({
            tempToken,
            twoFactorCode: twoFactorCode.toString(),
        })),

    // ========================================
    // МОБИЛЬНАЯ АВТОРИЗАЦИЯ (MobileID / SMS Aero)
    // Каскад Seamless → SIM-PUSH → SMS выполняет виджет SMS Aero,
    // сервер проверяет результат server-to-server.
    // ========================================

    // Server-to-server проверка результата верификации.
    // Вызывать после события onVerified виджета MobileID.
    // Ответ: status = 'success' (вход выполнен) | 'pending' (нужна 2FA)
    //        | 'registration_required' (номер подтверждён, нужна регистрация)
    mobileIdVerify: async ({ sessionId, verifyToken }) =>
        createPublicRequest('post', `${BASE_AUTH_URL}/mobileid/verify`, await withDeviceId({
            session_id: sessionId,
            verify_token: verifyToken,
            // Это приложение умеет онбординг, поэтому просим сервер создать
            // аккаунт сразу, а не отдавать токен на заполнение анкеты.
            supports_onboarding: true,
        })),

    // Завершение регистрации после верификации через MobileID (без SMS-кода)
    mobileIdCompleteRegister: async (data) =>
        createPublicRequest('post', `${BASE_AUTH_URL}/mobileid/complete-register`, await withDeviceId({
            registrationToken: data.registrationToken,
            name: data.name,
            address: data.address,
            gender: data.gender,
            districtId: data.districtId,
            customDistrict: data.customDistrict,
            password: data.password,
        })),

    // ========================================
    // ОБЩИЕ МЕТОДЫ
    // ========================================
    
    // Выход из системы - требует авторизации
    logout: (refreshToken) => authApi.post('/logout', { refreshToken }),

    // Обновление токена - публичный запрос
    refreshToken: async (refreshToken) =>
        createPublicRequest(
            'post',
            `${BASE_AUTH_URL}/refresh-token`,
            await withDeviceId({ refreshToken })
        ),

    // Получение текущего пользователя - требует авторизации
    getMe: () => authApi.get('/me'),

    // Подача заявки на роль сотрудника - требует авторизации
    applyForStaff: (data) => staffApplicationsApi.post('/apply', data),

    // Получение заявки текущего пользователя
    getMyStaffApplication: () => staffApplicationsApi.get('/me'),

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