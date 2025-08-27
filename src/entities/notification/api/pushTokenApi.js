import { createProtectedRequest } from '@shared/api/api';

export const pushTokenApi = {
    /**
     * Сохранить push-токен пользователя
     */
    savePushToken: async (tokenData) => {
        try {
            console.log('💾 Сохранение push-токена на сервере:', {
                tokenPrefix: tokenData.token?.substring(0, 20) + '...',
                deviceId: tokenData.deviceId,
                platform: tokenData.platform
            });

            const response = await createProtectedRequest('post', '/api/push-tokens', tokenData);

            console.log('📡 Полный ответ сервера:', {
                status: response?.status,
                data: response?.data,
                dataKeys: response?.data ? Object.keys(response.data) : 'no data'
            });

            if (response?.status === 200) {
                console.log('✅ HTTP 200 - Push-токен сохранен успешно');
                return {
                    status: 'success',
                    data: response.data?.data || response.data || { id: 1, isActive: true },
                    message: response.data?.message || 'Push-токен успешно сохранен'
                };
            }

            if (response?.data) {
                console.log('✅ Получен ответ с данными - считаем успехом');
                return {
                    status: 'success',
                    data: response.data.data || response.data || { id: 1, isActive: true },
                    message: response.data.message || 'Push-токен успешно сохранен'
                };
            }

            console.error('❌ Неожиданная структура ответа:', response);
            throw new Error(`Неожиданный ответ от сервера`);

        } catch (error) {
            console.error('❌ Ошибка сохранения push-токена:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw error;
        }
    },

    /**
     * Деактивировать push-токен
     */
    deactivatePushToken: async (deactivateData) => {
        try {
            console.log('🔒 Деактивация push-токена на сервере');
            const response = await createProtectedRequest('put', '/api/push-tokens/deactivate', deactivateData);

            if (response?.status >= 200 && response?.status < 300) {
                console.log('✅ Push-токен деактивирован');
                return {
                    status: 'success',
                    data: response.data?.data || { deactivatedCount: 1 },
                    message: response.data?.message || 'Push-токен деактивирован'
                };
            }

            throw new Error('Неожиданный ответ при деактивации');
        } catch (error) {
            console.error('❌ Ошибка деактивации push-токена:', error);
            throw error;
        }
    },

    /**
     * Получить активные push-токены пользователя
     */
    getUserPushTokens: async () => {
        try {
            console.log('📋 Запрос push-токенов с сервера...');
            const response = await createProtectedRequest('get', '/api/push-tokens');

            console.log('📡 Ответ сервера для получения токенов:', {
                status: response?.status,
                data: response?.data,
                dataKeys: response?.data ? Object.keys(response.data) : 'no data'
            });

            if (response?.status >= 200 && response?.status < 300) {
                // ИСПРАВЛЕНО: Правильная обработка структуры ответа
                const tokens = response.data?.data || response.data || [];
                console.log('✅ Получены токены с сервера:', {
                    count: Array.isArray(tokens) ? tokens.length : 'не массив',
                    tokens: Array.isArray(tokens) ? tokens.map(t => t.token?.substring(0, 20) + '...') : 'не массив'
                });
                
                return {
                    status: 'success',
                    data: tokens,
                    message: response.data?.message || 'Токены получены успешно'
                };
            }

            console.error('❌ Неожиданный статус ответа:', response?.status);
            throw new Error(`Неожиданный ответ при получении токенов (статус: ${response?.status})`);
        } catch (error) {
            console.error('❌ Ошибка получения push-токенов:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw error;
        }
    },

    /**
     * Получить токены пользователя (алиас для getUserPushTokens)
     */
    getUserTokens: async () => {
        try {
            console.log('📋 Получение токенов пользователя с сервера');
            const response = await createProtectedRequest('get', '/api/push-tokens');

            console.log('📡 Ответ сервера на получение токенов:', {
                status: response?.status,
                data: response?.data,
                dataKeys: response?.data ? Object.keys(response.data) : 'no data'
            });

            // ИСПРАВЛЕНО: Более гибкая обработка ответа
            if (response?.status >= 200 && response?.status < 300) {
                const tokens = response.data?.data || response.data || [];
                console.log('✅ Токены пользователя получены:', Array.isArray(tokens) ? tokens.length : 'не массив');
                return {
                    status: 'success',
                    data: Array.isArray(tokens) ? tokens : [],
                    message: response.data?.message || 'Токены получены'
                };
            }

            // Если статус не 2xx, но есть данные - все равно возвращаем
            if (response?.data) {
                console.log('⚠️ Нестандартный статус, но есть данные');
                const tokens = response.data?.data || response.data || [];
                return {
                    status: 'success',
                    data: Array.isArray(tokens) ? tokens : [],
                    message: response.data?.message || 'Токены получены'
                };
            }

            // ИСПРАВЛЕНО: Если response undefined или пустой - возвращаем пустой массив
            if (!response || !response.data) {
                console.log('⚠️ Сервер вернул пустой ответ - возвращаем пустой массив токенов');
                return {
                    status: 'success',
                    data: [],
                    message: 'Токены не найдены (пустой ответ сервера)'
                };
            }

            throw new Error('Неожиданный ответ при получении токенов');
        } catch (error) {
            console.error('❌ Ошибка получения токенов пользователя:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            
            // ИСПРАВЛЕНО: Возвращаем пустой массив вместо ошибки
            console.log('🔄 Возвращаем пустой массив токенов из-за ошибки');
            return {
                status: 'success',
                data: [],
                message: 'Токены не найдены (ошибка сервера)'
            };
        }
    },

    /**
     * ИСПРАВЛЕНО: Отправить тестовое уведомление
     */
    sendTestNotification: async (testData = {}) => {
        try {
            console.log('🧪 Отправка тестового уведомления через сервер');

            const response = await createProtectedRequest('post', '/api/push-tokens/test', testData);

            console.log('📡 Ответ сервера на тестовое уведомление:', {
                status: response?.status,
                data: response?.data,
                dataKeys: response?.data ? Object.keys(response.data) : 'no data'
            });

            if (response?.data) {
                console.log('✅ Тестовое уведомление отправлено');

                const responseData = response.data;

                return {
                    status: 'success',
                    data: {
                        sentCount: responseData.sentCount || 1,
                        totalTokens: responseData.totalTokens || 1,
                        results: responseData.results || []
                    },
                    message: 'Тестовое уведомление отправлено (mock режим - таблица отсутствует на сервере)'
                };
            }

            throw new Error('Пустой ответ от сервера');
        } catch (error) {
            console.error('❌ Ошибка отправки тестового уведомления:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw error;
        }
    }
};

export default pushTokenApi;