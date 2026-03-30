import { createProtectedRequest } from '@shared/api/api';

export const pushTokenApi = {
    /**
     * Сохранить push-токен пользователя
     */
    savePushToken: async (tokenData) => {
        try {
            const response = await createProtectedRequest('post', '/api/push-tokens', tokenData);

            if (response) {
                return {
                    status: 'success',
                    data: response.data || response || { id: 1, isActive: true },
                    message: response.message || 'Push-токен успешно сохранен'
                };
            }

            throw new Error('Неожиданный ответ от сервера');
        } catch (error) {
            if (__DEV__) {
                console.warn('[pushTokenApi] savePushToken error:', error?.message);
            }
            throw error;
        }
    },

    /**
     * Деактивировать push-токен
     */
    deactivatePushToken: async (deactivateData) => {
        try {
            const response = await createProtectedRequest('put', '/api/push-tokens/deactivate', deactivateData);

            if (response) {
                return {
                    status: 'success',
                    data: response.data || response || { deactivatedCount: 1 },
                    message: response.message || 'Push-токен деактивирован'
                };
            }

            throw new Error('Пустой ответ при деактивации');
        } catch (error) {
            if (__DEV__) {
                console.warn('[pushTokenApi] deactivatePushToken error:', error?.message);
            }
            throw error;
        }
    },

    /**
     * Получить активные push-токены пользователя
     */
    getUserPushTokens: async () => {
        try {
            const response = await createProtectedRequest('get', '/api/push-tokens');
            const tokens = response?.data || response || [];
            return {
                status: 'success',
                data: Array.isArray(tokens) ? tokens : [],
                message: response?.message || 'Токены получены успешно'
            };
        } catch (error) {
            if (__DEV__) {
                console.warn('[pushTokenApi] getUserPushTokens error:', error?.message);
            }
            return { status: 'success', data: [], message: 'Токены не найдены' };
        }
    },

    /**
     * Отправить тестовое уведомление
     */
    sendTestNotification: async (testData = {}) => {
        try {
            const response = await createProtectedRequest('post', '/api/push-tokens/test', testData);

            if (response) {
                return {
                    status: 'success',
                    data: response,
                    message: 'Тестовое уведомление отправлено'
                };
            }

            throw new Error('Пустой ответ от сервера');
        } catch (error) {
            if (__DEV__) {
                console.warn('[pushTokenApi] sendTestNotification error:', error?.message);
            }
            throw error;
        }
    }
};

export default pushTokenApi;
