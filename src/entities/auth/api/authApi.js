import { createProtectedRequest } from '@shared/api/api';

export const authApi = {
    initiateRegister: (data) =>
        createProtectedRequest('post', '/api/auth/register/initiate', data),

// Полностью исправленный метод completeRegister для authApi.js
    completeRegister: async (data) => {
        try {
            // Более подробное логирование запроса
            console.log('Отправка запроса на завершение регистрации:', {
                registrationToken: data.registrationToken?.slice(0, 10) + '...',
                verificationCode: data.verificationCode
            });

            const response = await createProtectedRequest('post', '/api/auth/register/complete', {
                registrationToken: data.registrationToken,
                verificationCode: data.verificationCode,
            });

            // Добавляем подробное логирование ответа
            console.log('Ответ от сервера при завершении регистрации:', JSON.stringify(response));

            // Проверка формата ответа
            if (response && response.status === 'success' && response.data) {
                // Важно: возвращаем ответ без модификаций
                return response;
            } else {
                console.error('Некорректный формат ответа:', response);
                throw new Error('Некорректный формат ответа от сервера');
            }
        } catch (error) {
            console.error('Ошибка при завершении регистрации:', error);
            throw error;
        }
    },

    login: (data) =>
        createProtectedRequest('post', '/api/auth/login', data),

    verify2FALogin: ({ tempToken, twoFactorCode }) =>
        createProtectedRequest('post', '/api/2fa/verify-login', {
            tempToken,
            twoFactorCode
        }),

    logout: (refreshToken) =>
        createProtectedRequest('post', '/api/auth/logout', { refreshToken }),

    refreshToken: (refreshToken) =>
        createProtectedRequest('post', '/api/auth/refresh-token', { refreshToken }),

    getMe: () =>
        createProtectedRequest('get', '/api/auth/me')
};