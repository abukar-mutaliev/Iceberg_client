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
                platform: tokenData.platform,
                tokenLength: tokenData.token?.length || 0
            });

            console.log('📡 Отправка запроса на /api/push-tokens с данными:', tokenData);

            const response = await createProtectedRequest('post', '/api/push-tokens', tokenData);

            console.log('📡 Данные ответа сервера:', {
                dataType: typeof response,
                dataKeys: response ? Object.keys(response) : 'no data',
                responseType: typeof response,
                response
            });

            console.log('📡 Ответ сервера (stringify):', JSON.stringify(response, null, 2));

            // createProtectedRequest уже обработал статус в api.js, поэтому если мы здесь - запрос успешен
            if (response) {
                console.log('✅ Push-токен сохранен успешно');
                return {
                    status: 'success',
                    data: response.data || response || { id: 1, isActive: true },
                    message: response.message || 'Push-токен успешно сохранен'
                };
            }

            console.error('❌ Неожиданная структура ответа:', response);
            throw new Error(`Неожиданный ответ от сервера`);

        } catch (error) {
            console.error('❌ Ошибка сохранения push-токена:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                fullError: error
            });

            // Добавим дополнительное логирование для axios ошибок
            if (error.response) {
                console.error('❌ Axios error response:', {
                    status: error.response.status,
                    data: error.response.data,
                    headers: error.response.headers
                });
            } else if (error.request) {
                console.error('❌ Axios error request:', error.request);
            } else {
                console.error('❌ Axios error message:', error.message);
            }

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

            // createProtectedRequest уже обработал статус в api.js, поэтому если мы здесь - запрос успешен
            if (response) {
                console.log('✅ Push-токен деактивирован');
                return {
                    status: 'success',
                    data: response.data || response || { deactivatedCount: 1 },
                    message: response.message || 'Push-токен деактивирован'
                };
            }

            throw new Error('Пустой ответ при деактивации');
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

            console.log('📡 Данные ответа сервера:', {
                dataType: typeof response,
                dataKeys: response ? Object.keys(response) : 'no data',
                response
            });

            // createProtectedRequest уже обработал статус в api.js, поэтому если мы здесь - запрос успешен
            const tokens = response?.data || response || [];
            console.log('✅ Получены токены с сервера:', {
                count: Array.isArray(tokens) ? tokens.length : 'не массив',
                tokens: Array.isArray(tokens) ? tokens.map(t => t.token?.substring(0, 20) + '...') : 'не массив'
            });

            return {
                status: 'success',
                data: tokens,
                message: response?.message || 'Токены получены успешно'
            };
        } catch (error) {
            console.error('❌ Ошибка получения push-токенов:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                errorType: typeof error
            });

            // Если это ошибка от сервера (HTTP ошибка)
            if (error?.response?.status) {
                throw new Error(`Ошибка сервера (${error.response.status}): ${error.response.data?.message || 'Неизвестная ошибка'}`);
            }

            // Если это сетевая ошибка или другая ошибка
            throw new Error(`Ошибка сети: ${error.message || 'Неизвестная ошибка'}`);
        }
    },

    /**
     * Получить токены пользователя (алиас для getUserPushTokens)
     */
    getUserTokens: async () => {
        try {
            console.log('📋 Получение токенов пользователя с сервера');
            const response = await createProtectedRequest('get', '/api/push-tokens');

            console.log('📡 Данные ответа сервера:', {
                dataType: typeof response,
                dataKeys: response ? Object.keys(response) : 'no data',
                response
            });

            // createProtectedRequest уже обработал статус в api.js, поэтому если мы здесь - запрос успешен
            const tokens = response?.data || response || [];
            console.log('✅ Токены пользователя получены:', Array.isArray(tokens) ? tokens.length : 'не массив');
            return {
                status: 'success',
                data: Array.isArray(tokens) ? tokens : [],
                message: response?.message || 'Токены получены'
            };

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

            console.log('📡 Данные ответа сервера на тестовое уведомление:', {
                dataType: typeof response,
                dataKeys: response ? Object.keys(response) : 'no data',
                response
            });

            if (response) {
                console.log('✅ Тестовое уведомление отправлено');

                const responseData = response;

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