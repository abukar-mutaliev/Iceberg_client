import { createProtectedRequest, createPublicRequest, authService } from '@shared/api/api';

export const apiClient = {
    // Базовый метод для всех HTTP запросов - автоматически выбирает защищенный или публичный запрос
    request: async (method, endpoint, data = null, config = {}) => {
        try {
            // Проверяем, есть ли токены для защищенного запроса
            const tokens = await authService.getStoredTokens();
            const hasValidTokens = tokens?.accessToken || tokens?.refreshToken;

            // Если есть токены - используем защищенный запрос, иначе - публичный
            if (hasValidTokens) {
                return await createProtectedRequest(method, endpoint, data, config);
            } else {
                return await createPublicRequest(method, endpoint, data, config);
            }
        } catch (error) {
            // Если ошибка связана с авторизацией (401), пробуем публичный запрос
            if (error.response?.status === 401 || error.message?.includes('токены')) {
                try {
                    return await createPublicRequest(method, endpoint, data, config);
                } catch (publicError) {
                    // Если и публичный запрос не работает, выбрасываем исходную ошибку
                    throw error;
                }
            }

            throw error;
        }
    },

    // GET запрос с query параметрами
    get: async (endpoint, params = {}, config = {}) => {
        const queryString = new URLSearchParams(
            Object.entries(params).filter(([_, value]) => value !== undefined && value !== null)
        ).toString();

        const url = `${endpoint}${queryString ? `?${queryString}` : ''}`;
        return apiClient.request('get', url, null, config);
    },

    // POST запрос
    post: async (endpoint, data, config = {}) => {
        return apiClient.request('post', endpoint, data, config);
    },

    // PUT запрос
    put: async (endpoint, data, config = {}) => {
        return apiClient.request('put', endpoint, data, config);
    },

    // DELETE запрос
    delete: async (endpoint, data = null, config = {}) => {
        return apiClient.request('delete', endpoint, data, config);
    },

    // PATCH запрос
    patch: async (endpoint, data, config = {}) => {
        return apiClient.request('patch', endpoint, data, config);
    }
};

// Обертка для создания API модулей
export const createApiModule = (baseEndpoint) => {
    return {
        get: (path = '', params = {}, config = {}) =>
            apiClient.get(`${baseEndpoint}${path}`, params, config),

        post: (path = '', data, config = {}) =>
            apiClient.post(`${baseEndpoint}${path}`, data, config),

        put: (path = '', data, config = {}) =>
            apiClient.put(`${baseEndpoint}${path}`, data, config),

        delete: (path = '', data = null, config = {}) =>
            apiClient.delete(`${baseEndpoint}${path}`, data, config),

        patch: (path = '', data, config = {}) =>
            apiClient.patch(`${baseEndpoint}${path}`, data, config)
    };
};

// Обработчик ошибок
export const handleApiError = (error) => {
    const errorResponse = {
        message: 'Произошла неизвестная ошибка',
        status: 500,
        data: null
    };

    if (error.response) {
        // Ошибка от сервера
        errorResponse.status = error.response.status;
        errorResponse.message = error.response.data?.message || error.message;
        errorResponse.data = error.response.data;
    } else if (error.request) {
        // Запрос был сделан, но ответ не получен
        errorResponse.message = 'Ошибка сети. Проверьте подключение к интернету.';
        errorResponse.status = 0;
    } else {
        // Ошибка при настройке запроса
        errorResponse.message = error.message;
    }

    return errorResponse;
};