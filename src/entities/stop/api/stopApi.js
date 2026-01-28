import { api, createProtectedRequest } from '@shared/api/api';
export const stopApi = {
    getAllStops: async (params = {}) => {
        try {
            // Публичный эндпоинт: доступен гостям, поэтому НЕ используем createProtectedRequest
            const response = await api.get('/api/stops/all', { params });
            if (!response || !response.data) {
                throw new Error('Получен некорректный ответ от сервера');
            }
            return response;
        } catch (error) {
            console.error('Error in getAllStops API call:', error);
            if (error.response) {
                console.error('Error details:', JSON.stringify({
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data,
                    headers: error.response.headers
                }));
            } else if (error.request) {
                console.error('No response received:', error.request);
            } else {
                console.error('Error setting up request:', error.message);
            }
            throw error; // Всегда пробрасываем ошибку
        }
    },

    getAllStopsAdmin: async (params = {}) => {
        try {
            const response = await createProtectedRequest('get', '/api/stops/admin', params);
            if (!response || !response.data) {
                throw new Error('Получен некорректный ответ от сервера');
            }
            return response;
        } catch (error) {
            console.error('Error in getAllStopsAdmin API call:', error);
            throw error; // Всегда пробрасываем ошибку
        }
    },

    getStopById: async (stopId) => {
        try {
            const response = await createProtectedRequest('get', `/api/stops/${stopId}`);
            return response;
        } catch (error) {
            console.error(`Error in getStopById(${stopId}) API call:`, error);
            throw error; // Всегда пробрасываем ошибку
        }
    },

    createStop: async (formData, onRetryCallback = null) => {
        const { retryFileUpload } = await import('@shared/api/retryHelper');
        
        try {
            // Используем retryFileUpload для автоматических повторных попыток
            const response = await retryFileUpload(
                () => createProtectedRequest('post', '/api/stops', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    // Увеличенный timeout до 5 минут для медленных соединений
                    timeout: 300000,
                }),
                {
                    maxRetries: 5,
                    waitForConnection: true,
                    connectionTimeoutMs: 20000,
                    baseDelayMs: 1500,
                    maxDelayMs: 15000,
                    onRetry: (attempt, error) => {
                        console.log(`🔄 Повторная попытка загрузки остановки ${attempt}/5`, {
                            error: error.message,
                            code: error.code
                        });
                        
                        // Вызываем callback если передан
                        if (onRetryCallback) {
                            onRetryCallback(attempt, error);
                        }
                    }
                }
            );
            return response;
        } catch (error) {
            console.error('Error in createStop API call:', error);
            
            // Улучшенное сообщение об ошибке для разных типов ошибок
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                const enhancedError = new Error(
                    'Проблема с сетевым подключением при загрузке файла. ' +
                    'Пожалуйста, проверьте подключение к интернету и попробуйте снова.'
                );
                enhancedError.originalError = error;
                throw enhancedError;
            }
            
            // Обработка timeout ошибок
            if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
                const enhancedError = new Error(
                    'Превышено время ожидания загрузки. ' +
                    'Возможно, ваше интернет-соединение слишком медленное. ' +
                    'Попробуйте загрузить изображение меньшего размера или подключитесь к более быстрому Wi-Fi.'
                );
                enhancedError.originalError = error;
                enhancedError.code = 'TIMEOUT';
                throw enhancedError;
            }
            
            throw error; // Всегда пробрасываем ошибку
        }
    },

    updateStop: async (stopId, formData, onRetryCallback = null) => {
        const { retryFileUpload } = await import('@shared/api/retryHelper');
        
        try {
            // Проверяем и преобразуем координаты перед отправкой
            if (formData instanceof FormData) {
                // Получаем текущее значение mapLocation, если оно есть
                const mapLocationValue = formData.get('mapLocation');

                if (mapLocationValue) {
                    try {
                        // Проверяем, является ли это JSON-массивом
                        if (typeof mapLocationValue === 'string' &&
                            mapLocationValue.trim().startsWith('[') &&
                            mapLocationValue.trim().endsWith(']')) {

                            const coords = JSON.parse(mapLocationValue);

                            // Заменяем значение в FormData на строку с запятой
                            formData.delete('mapLocation');
                            formData.append('mapLocation', `${coords[0]},${coords[1]}`);

                            console.log('[stopApi] Преобразованы координаты из JSON в строку:',
                                `${coords[0]},${coords[1]}`);
                        }
                    } catch (e) {
                        console.log('[stopApi] Ошибка при обработке координат:', e);
                        // Просто продолжаем с существующим значением
                    }
                }
            }

            // Добавляем timestamp для предотвращения кэширования
            const url = `/api/stops/${stopId}?_t=${Date.now()}`;

            console.log(`[stopApi] Отправка запроса на обновление остановки ${stopId}`, {
                url,
                contentType: formData instanceof FormData ? 'multipart/form-data' : typeof formData
            });

            const response = await createProtectedRequest(
                'put',
                url,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            return response;
        } catch (error) {
            console.error(`Error in updateStop(${stopId}) API call:`, error);

            // Всегда возвращаем Promise.reject для поддержания цепочки промисов
            return Promise.reject(error);
        }
    },

    deleteStop: async (stopId) => {
        try {
            const response = await createProtectedRequest('delete', `/api/stops/${stopId}`);
            return response;
        } catch (error) {
            console.error(`Error in deleteStop(${stopId}) API call:`, error);
            throw error; // Всегда пробрасываем ошибку
        }
    },

    activateStop: async (stopId) => {
        try {
            const response = await createProtectedRequest('patch', `/api/stops/${stopId}/activate`);
            return response;
        } catch (error) {
            console.error(`Error in activateStop(${stopId}) API call:`, error);
            throw error;
        }
    },

    skipStop: async (stopId, reason = null) => {
        try {
            const payload = reason ? { reason } : {};
            const response = await createProtectedRequest('patch', `/api/stops/${stopId}/skip`, payload);
            return response;
        } catch (error) {
            console.error(`Error in skipStop(${stopId}) API call:`, error);
            throw error;
        }
    },

    completeStop: async (stopId) => {
        try {
            const response = await createProtectedRequest('patch', `/api/stops/${stopId}/complete`);
            return response;
        } catch (error) {
            console.error(`Error in completeStop(${stopId}) API call:`, error);
            throw error;
        }
    },

    cancelStop: async (stopId, reason = null) => {
        try {
            const payload = reason ? { reason } : {};
            const response = await createProtectedRequest('patch', `/api/stops/${stopId}/cancel`, payload);
            return response;
        } catch (error) {
            console.error(`Error in cancelStop(${stopId}) API call:`, error);
            throw error;
        }
    },

    getStopProducts: async (stopId) => {
        try {
            // Эндпоинт с optionalAuth: должен работать и для гостей
            // Добавляем timestamp для предотвращения кеширования
            const timestamp = Date.now();
            const response = await api.get(`/api/stops/${stopId}/products?_t=${timestamp}`);
            return response;
        } catch (error) {
            console.error(`Error in getStopProducts(${stopId}) API call:`, error);
            throw error;
        }
    }
};

// Вспомогательная функция для обработки координат из разных форматов
export const parseCoordinates = (coordinates) => {
    try {
        // Если координаты уже в виде объекта с latitude и longitude
        if (coordinates && typeof coordinates === 'object' &&
            'latitude' in coordinates && 'longitude' in coordinates) {
            return {
                latitude: parseFloat(coordinates.latitude),
                longitude: parseFloat(coordinates.longitude)
            };
        }

        // Если координаты в виде массива [lat, lng]
        if (coordinates && Array.isArray(coordinates) && coordinates.length >= 2) {
            return {
                latitude: parseFloat(coordinates[0]),
                longitude: parseFloat(coordinates[1])
            };
        }

        // Если координаты в виде строки
        if (typeof coordinates === 'string') {
            // Проверяем, не JSON ли это
            if (coordinates.trim().startsWith('{') || coordinates.trim().startsWith('[')) {
                try {
                    const parsed = JSON.parse(coordinates);

                    // Если распарсилось в массив [lat, lng]
                    if (Array.isArray(parsed) && parsed.length >= 2) {
                        return {
                            latitude: parseFloat(parsed[0]),
                            longitude: parseFloat(parsed[1])
                        };
                    }

                    // Если распарсилось в объект с lat/lng
                    if (parsed && typeof parsed === 'object') {
                        if ('lat' in parsed && 'lng' in parsed) {
                            return {
                                latitude: parseFloat(parsed.lat),
                                longitude: parseFloat(parsed.lng)
                            };
                        } else if ('latitude' in parsed && 'longitude' in parsed) {
                            return {
                                latitude: parseFloat(parsed.latitude),
                                longitude: parseFloat(parsed.longitude)
                            };
                        }
                    }
                } catch (e) {
                    console.log('Ошибка при парсинге JSON координат:', e);
                    // Продолжаем с другими форматами
                }
            }

            // Пробуем формат "lat,lng"
            if (coordinates.includes(',')) {
                const [lat, lng] = coordinates.split(',').map(part => parseFloat(part.trim()));

                if (!isNaN(lat) && !isNaN(lng)) {
                    return {
                        latitude: lat,
                        longitude: lng
                    };
                }
            }
        }

        console.log('Не удалось распарсить координаты:', coordinates);
        return null;
    } catch (error) {
        console.log('Ошибка при обработке координат:', error);
        return null;
    }
};

export default stopApi;