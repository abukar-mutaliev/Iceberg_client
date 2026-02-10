import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {Platform} from "react-native";
import Constants from "expo-constants";

const STORAGE_KEYS = {
    TOKENS: 'tokens',
};

let isRefreshing = false;
let failedQueue = [];
let dispatchAction = null;
let refreshPromise = null; // Добавляем для предотвращения множественных запросов

export const setDispatch = (dispatch) => {
    dispatchAction = dispatch;
};

const DEBUG = __DEV__;
const DEBUG_LOGS = [];

const SILENT_ENDPOINTS = [
    '/api/notifications/unread-count',
    '/api/notifications',
    '/api/health',
    "/api/banners",
    "/api/banners"
    // "/api/push-tokens" - временно убрали для отладки сохранения токенов
];

const shouldSilenceErrorLog = (error, url) => {
    const isNotFound =
        error?.response?.status === 404 ||
        error?.status === 404 ||
        error?.response?.data?.status === 404;
    const isMyFeedback = typeof url === 'string' && url.includes('/api/app-feedback/my');
    return isNotFound && isMyFeedback;
};

const apiDebugLog = (type, message, data) => {
    if (!DEBUG) return;

    const shouldLog = !SILENT_ENDPOINTS.some(endpoint =>
        message.includes(endpoint) || data?.url?.includes(endpoint)
    );

    if (!shouldLog && type !== 'ERROR') {
        return;
    }

    const logEntry = {
        timestamp: new Date().toISOString(),
        type,
        message,
        data: data ? JSON.stringify(data, null, 2) : null
    };

    // console.log(`[API-${type}] ${message}`, data || '');
    DEBUG_LOGS.push(logEntry);

    if (DEBUG_LOGS.length > 50) {
        DEBUG_LOGS.shift();
    }
};

export const getApiDebugLogs = () => DEBUG_LOGS;

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// ============================================================================
// ЕДИНАЯ ТОЧКА ПОДКЛЮЧЕНИЯ К СЕРВЕРУ
// Используйте эти функции везде в приложении вместо прямых URL
// ============================================================================

/**
 * Получить базовый URL сервера
 * @returns {string} Базовый URL (например: http://85.192.33.223:5000)
 */
export const getBaseUrl = () => {
    // ВАЖНО: Всегда используем production сервер для всех типов сборок Android
    // Не используем локальные IP даже в dev режиме
    const productionUrl = 'http://85.192.33.223:5000';

    return productionUrl;
};

/**
 * Получить полный URL для API endpoint
 * @param {string} endpoint - Путь к endpoint (например: '/api/products')
 * @returns {string} Полный URL
 */
export const getApiUrl = (endpoint) => {
    const baseUrl = getBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
};

/**
 * Получить URL для загрузки изображений
 * @param {string} imagePath - Путь к изображению (например: 'products/image.jpg' или '/uploads/products/image.jpg')
 * @returns {string|null} Полный URL к изображению или null
 */
export const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // Если уже полный URL
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        const baseUrl = getBaseUrl();
        try {
            const url = new URL(imagePath);
            const base = new URL(baseUrl);

            // Если это НЕ наш API домен — возвращаем как есть (например S3/CDN)
            if (url.host !== base.host) {
                return imagePath;
            }

            const origin = url.origin;
            const path = url.pathname;
            // Если путь начинается с /uploads/, используем его, иначе добавляем /uploads/
            if (path.startsWith('/uploads/')) {
                return `${origin}${path}`;
            } else if (path.startsWith('/')) {
                return `${origin}/uploads${path}`;
            } else {
                return `${origin}/uploads/${path}`;
            }
        } catch (e) {
            // Если не удалось распарсить URL, возвращаем как есть
            return imagePath;
        }
    }
    
    // Изображения складов — всегда из S3 (как на экране WarehouseDetailsContent)
    const S3_UPLOADS_BASE = 'https://iceberg-uploads.hb.ru-msk.vkcloud-storage.ru';
    const warehousePath = imagePath.replace(/^\/+/, '').replace(/^uploads\//, '');
    if (warehousePath.startsWith('warehouses/')) {
        return `${S3_UPLOADS_BASE}/${warehousePath}`;
    }

    const baseUrl = getBaseUrl();

    // Если путь уже начинается с /uploads/, просто добавляем базовый URL
    if (imagePath.startsWith('/uploads/')) {
        return `${baseUrl}${imagePath}`;
    }

    // Если путь начинается с uploads/ (без слеша), добавляем слеш
    if (imagePath.startsWith('uploads/')) {
        return `${baseUrl}/${imagePath}`;
    }
    
    // Если путь начинается с /, но не с /uploads/, проверяем, может это уже полный путь
    if (imagePath.startsWith('/')) {
        // Если путь начинается с /api/, это API endpoint, не изображение
        if (imagePath.startsWith('/api/')) {
            return `${baseUrl}${imagePath}`;
        }
        // Иначе считаем, что это путь к файлу в uploads
        return `${baseUrl}/uploads${imagePath}`;
    }
    
    // Убираем лишние слеши в начале и добавляем /uploads/
    const cleanPath = imagePath.replace(/^\/+/, '');
    return `${baseUrl}/uploads/${cleanPath}`;
};

/**
 * Получить базовый URL для папки uploads
 * @returns {string} Базовый URL для uploads (например: http://85.192.33.223:5000/uploads/)
 */
export const getUploadsBaseUrl = () => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/uploads/`;
};

/**
 * Форматировать URL изображения (совместимость со старым кодом)
 * @param {string} imagePath - Путь к изображению
 * @returns {string|null} Полный URL или null
 */
export const formatImageUrl = (imagePath) => {
    return getImageUrl(imagePath);
};


export const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true,
    timeout: 60000,
});

const decodeToken = (accessToken) => {
    try {
        const base64Url = accessToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Ошибка декодирования токена:', error);
        return null;
    }
};

const isTokenValid = (token) => {
    try {
        const decoded = decodeToken(token);
        if (!decoded?.exp) return false;
        const currentTime = Date.now() / 1000;
        return decoded.exp > currentTime;
    } catch (error) {
        console.error('Ошибка проверки токена:', error);
        return false;
    }
};

const setTokensAndUser = (tokens) => {
    const decoded = decodeToken(tokens.accessToken);
    if (decoded) {
        handleAuthTokens(tokens);
    }
};

const getStoredTokens = async () => {
    try {
        const tokensStr = await AsyncStorage.getItem(STORAGE_KEYS.TOKENS);
        const tokens = tokensStr ? JSON.parse(tokensStr) : null;

        return tokens;
    } catch (error) {
        console.error('❌ [API] Ошибка получения токенов:', error);
        return null;
    }
};

const saveTokens = async (tokens) => {
    try {
        if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
            console.error('❌ [API] Попытка сохранить неполные токены:', {
                hasAccessToken: !!tokens?.accessToken,
                hasRefreshToken: !!tokens?.refreshToken
            });
            return;
        }

        await AsyncStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
        api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
    } catch (error) {
        console.error('❌ [API] Ошибка сохранения токенов:', error);
    }
};

const removeTokens = async () => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS.TOKENS);
        delete api.defaults.headers.common['Authorization'];
    } catch (error) {
        console.error('Ошибка удаления токенов:', error);
    }
};

const initializeAuth = async () => {
    try {
        const tokens = await getStoredTokens();

        if (tokens?.accessToken && tokens?.refreshToken) {
            const decodedAccess = decodeToken(tokens.accessToken);
            const decodedRefresh = decodeToken(tokens.refreshToken);

            const currentTime = Math.floor(Date.now() / 1000);
            const accessTokenValid = decodedAccess && decodedAccess.exp > currentTime;
            const refreshTokenValid = decodedRefresh && decodedRefresh.exp > currentTime;

            if (accessTokenValid) {
                api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
                setTokensAndUser(tokens);
                return true;
            } else if (refreshTokenValid) {
                api.defaults.headers.common['X-Token-Refresh-Required'] = 'true';
                api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
                setTokensAndUser(tokens);
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Ошибка инициализации auth:', error);
        return false;
    }
};

export const setAuthorizationHeader = async (forceRefresh = false) => {
    try {
        const tokens = await getStoredTokens();

        if (tokens?.accessToken) {
            api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;

            const decoded = decodeToken(tokens.accessToken);
            const currentTime = Math.floor(Date.now() / 1000);
            const isValid = decoded && decoded.exp > currentTime;

            if (!isValid && forceRefresh && tokens.refreshToken) {
                try {
                    const response = await axios.post(
                        `${getBaseUrl()}/api/auth/refresh-token`,
                        { refreshToken: tokens.refreshToken },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            }
                        }
                    );

                    if (response.data) {
                        let newTokens = null;

                        if (response.data.data?.accessToken) {
                            newTokens = {
                                accessToken: response.data.data.accessToken,
                                refreshToken: response.data.data.refreshToken
                            };
                        } else if (response.data.accessToken) {
                            newTokens = {
                                accessToken: response.data.accessToken,
                                refreshToken: response.data.refreshToken
                            };
                        }

                        if (newTokens) {
                            await saveTokens(newTokens);
                            return true;
                        }
                    }
                } catch (err) {
                    const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
                    const errorStatus = err.response?.status;
                    console.error('Ошибка обновления токена:', {
                        message: errorMessage,
                        status: errorStatus,
                        hasRefreshToken: !!tokens.refreshToken,
                        error: err
                    });
                    // Не пробрасываем ошибку дальше, чтобы не блокировать работу приложения
                }
            }

            return true;
        }

        return false;
    } catch (error) {
        console.error('Ошибка установки заголовка авторизации:', error);
        return false;
    }
};

const handleRefreshToken = async (error, originalRequest) => {
    if (
        originalRequest.url.includes('/api/auth/login') ||
        originalRequest.url.includes('/api/auth/register') ||
        originalRequest.url.includes('/api/auth/refresh-token')
    ) {
        return Promise.reject(error);
    }

    if (isRefreshing) {
        return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
        })
            .then((token) => {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                return api(originalRequest);
            })
            .catch((err) => Promise.reject(err));
    }

    isRefreshing = true;

    try {
        const tokens = await getStoredTokens();

        if (!tokens || !tokens.refreshToken) {
            await removeTokens();
            if (dispatchAction) {
                // Только сбрасываем auth, но НЕ полностью приложение
                dispatchAction({ type: 'auth/resetState' });
            }
            throw new Error('Отсутствуют сохраненные токены');
        }

        const decoded = decodeToken(tokens.refreshToken);
        const currentTime = Math.floor(Date.now() / 1000);
        if (!decoded || !decoded.exp || decoded.exp < currentTime) {
            await removeTokens();
            if (dispatchAction) {
                // Только сбрасываем auth, но НЕ полностью приложение
                dispatchAction({ type: 'auth/resetState' });
            }
            throw new Error('Ваша сессия истекла. Пожалуйста, войдите снова');
        }

        const response = await axios.post(
            `${getBaseUrl()}/api/auth/refresh-token`,
            { refreshToken: tokens.refreshToken },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            }
        );

        let accessToken, refreshToken;

        if (response.data?.data?.accessToken) {
            accessToken = response.data.data.accessToken;
            refreshToken = response.data.data.refreshToken;
        } else if (response.data.accessToken) {
            accessToken = response.data.accessToken;
            refreshToken = response.data.refreshToken;
        }

        if (!accessToken || !refreshToken) {
            console.error('Не удалось извлечь токены из ответа:', response.data);
            throw new Error('Токены не найдены в ответе сервера');
        }

        const newTokens = { accessToken, refreshToken };
        await saveTokens(newTokens);
        setTokensAndUser(newTokens);

        processQueue(null, newTokens.accessToken);

        originalRequest.headers['Authorization'] = `Bearer ${newTokens.accessToken}`;

        return api(originalRequest);
    } catch (refreshError) {
        console.error('Ошибка при обновлении токена:', refreshError.message);

        processQueue(refreshError, null);

        // НЕ сбрасываем состояние сразу для критичных операций (заказы, оплата)
        const isCriticalOperation = originalRequest.url && (
            originalRequest.url.includes('/checkout') ||
            originalRequest.url.includes('/order-alternatives') ||
            originalRequest.url.includes('/payments') ||
            originalRequest.url.includes('/orders/my')
        );

        if (isCriticalOperation) {
            // Для критичных операций возвращаем ошибку но НЕ выбрасываем пользователя
            return Promise.reject(Object.assign(refreshError, {
                isCriticalOperation: true,
                message: 'Сессия истекла. Пожалуйста, войдите снова для продолжения'
            }));
        }

        // Для остальных операций только сбрасываем auth (НЕ полностью приложение)
        await removeTokens();
        if (dispatchAction) {
            // НЕ сбрасываем RESET_APP_STATE - пусть пользователь войдет снова
            dispatchAction({ type: 'auth/resetState' });
        }

        return Promise.reject(refreshError);
    } finally {
        isRefreshing = false;
    }
};

api.interceptors.request.use(async (config) => {
    const requestId = Date.now().toString();
    config.requestId = requestId;

    try {
        // Логируем только важные запросы
        apiDebugLog('REQUEST', `${config.method?.toUpperCase()} ${config.url}`, {
            requestId,
            url: config.url,
            baseURL: config.baseURL || api.defaults.baseURL
        });

        // Пропускаем проверку токена для endpoints авторизации
        const isAuthEndpoint = 
            config.url?.includes('/api/auth/login') ||
            config.url?.includes('/api/auth/register') ||
            config.url?.includes('/api/auth/refresh-token');

        if (!isAuthEndpoint) {
            const tokens = await getStoredTokens();
            
            if (tokens?.accessToken && tokens?.refreshToken) {
                // Проверяем истечение access token ДО отправки запроса
                const decoded = decodeToken(tokens.accessToken);
                const currentTime = Math.floor(Date.now() / 1000);
                const isExpired = !decoded || !decoded.exp || decoded.exp <= currentTime;

                if (isExpired) {
                    // console.log('⏰ [API REQUEST] Access token expired, refreshing before request:', config.url);
                    
                    // Проверяем refresh token
                    const decodedRefresh = decodeToken(tokens.refreshToken);
                    const refreshExpired = !decodedRefresh || !decodedRefresh.exp || decodedRefresh.exp <= currentTime;

                    if (refreshExpired) {
                        await removeTokens();
                        if (dispatchAction) {
                            // НЕ сбрасываем полностью состояние приложения (RESET_APP_STATE)
                            // Только очищаем auth состояние - пользователь увидит экран входа
                            dispatchAction({ type: 'auth/resetState' });
                        }
                        return Promise.reject(new Error('Ваша сессия истекла. Пожалуйста, войдите снова для продолжения работы'));
                    }

                    if (!refreshExpired) {
                        // Если токен уже обновляется, ждем завершения
                        if (isRefreshing) {
                            return new Promise((resolve, reject) => {
                                failedQueue.push({ resolve, reject });
                            }).then((token) => {
                                config.headers.Authorization = `Bearer ${token}`;
                                return config;
                            }).catch((err) => {
                                return Promise.reject(err);
                            });
                        }

                        isRefreshing = true;

                        try {
                            // Обновляем токен ПЕРЕД отправкой запроса
                            const response = await axios.post(
                                `${getBaseUrl()}/api/auth/refresh-token`,
                                { refreshToken: tokens.refreshToken },
                                {
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Accept': 'application/json',
                                    },
                                }
                            );

                            let newAccessToken, newRefreshToken;
                            if (response.data?.data?.accessToken) {
                                newAccessToken = response.data.data.accessToken;
                                newRefreshToken = response.data.data.refreshToken;
                            } else if (response.data.accessToken) {
                                newAccessToken = response.data.accessToken;
                                newRefreshToken = response.data.refreshToken;
                            }

                            if (newAccessToken && newRefreshToken) {
                                const newTokens = { accessToken: newAccessToken, refreshToken: newRefreshToken };
                                await saveTokens(newTokens);
                                setTokensAndUser(newTokens);

                                config.headers.Authorization = `Bearer ${newAccessToken}`;

                                // Обрабатываем очередь ожидающих запросов
                                processQueue(null, newAccessToken);
                            }
                        } catch (refreshError) {
                            console.error('❌ [API REQUEST] Failed to refresh token proactively:', refreshError.message);
                            processQueue(refreshError, null);
                            // Продолжаем с текущим токеном, пусть response interceptor обработает 401
                            config.headers.Authorization = `Bearer ${tokens.accessToken}`;
                        } finally {
                            isRefreshing = false;
                        }
                    } else {
                        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
                    }
                } else {
                    // Токен валидный, используем его
                    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
                }

               
            } else {
            }
        }

        if (config.method === 'delete' && (!config.data || config.data === null)) {
            delete config.headers['Content-Type'];
        }

    } catch (error) {
        apiDebugLog('ERROR', 'Request interceptor error', {
            requestId,
            error: error.message
        });
    }

    config.metadata = { startTime: Date.now() };
    return config;
});

api.interceptors.response.use(
    response => {
        const duration = response.config?.metadata?.startTime 
            ? Date.now() - response.config.metadata.startTime 
            : 0;

        // Логируем только важные ответы или ошибки
        apiDebugLog('RESPONSE', `${response.status} ${response.config.url}`, {
            requestId: response.config.requestId,
            status: response.status,
            duration: `${duration}ms`,
            url: response.config.url
        });

        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const duration = originalRequest?.metadata?.startTime 
            ? Date.now() - originalRequest.metadata.startTime 
            : 0;

        // Проверяем, не является ли это ошибкой корзины со статусом 401 (корзина скрыта в первой версии)
        const isCart401Error = error.response?.status === 401 && 
                              originalRequest?.url?.includes('/api/cart');
        
        // Всегда логируем ошибки (кроме 401 для корзины, так как она скрыта)
        const errorDetails = {
            requestId: originalRequest?.requestId,
            status: error.response?.status,
            duration: `${duration}ms`,
            message: error.message,
            url: originalRequest?.url,
            code: error.code,
            baseURL: api.defaults.baseURL
        };
        
        // Дополнительное логирование для сетевых ошибок
        if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
            const detailedError = {
                ...errorDetails,
                fullError: error.message,
                baseURL: api.defaults.baseURL,
                fullUrl: `${api.defaults.baseURL}${originalRequest?.url}`,
                errorCode: error.code,
                errorName: error.name,
                isExpoGo: Constants?.executionEnvironment === 'storeClient',
                suggestion: 'Проверьте подключение к интернету и убедитесь что сервер доступен'
            };
            
            console.error('🌐 [API ERROR] Network connection error:', detailedError);
        }
        
        // Не логируем 401 ошибки для корзины (корзина скрыта в первой версии приложения)
        if (!isCart401Error) {
            apiDebugLog('ERROR', `Request failed: ${originalRequest?.url}`, errorDetails);
        }

        // Обработка ошибок загрузки файлов
        if (error.config && error.config.headers &&
            error.config.headers['Content-Type'] &&
            error.config.headers['Content-Type'].includes('multipart/form-data')) {

            if (error.code === 'ECONNABORTED') {
                error.response = {
                    ...error.response,
                    data: {
                        message: 'Превышено время загрузки файла. Попробуйте загрузить файл меньшего размера или проверьте скорость вашего интернет-соединения.'
                    }
                };
            } else if (error.code === 'ERR_NETWORK') {
                error.response = {
                    ...error.response,
                    data: {
                        message: 'Проблема с сетевым подключением при загрузке файла. Пожалуйста, проверьте подключение к интернету и попробуйте снова.'
                    }
                };
            }
        }

        // Не обрабатываем ошибки авторизации для логина
        if (error.response?.status === 401 && originalRequest.url === '/api/auth/login') {
            return Promise.reject(error);
        }

        // Не обрабатываем 401 ошибки для endpoints избранного, если нет токенов
        if (error.response?.status === 401 && originalRequest.url?.includes('/api/favorites/')) {
            const tokens = await getStoredTokens();
            if (!tokens || (!tokens.accessToken && !tokens.refreshToken)) {
                return Promise.reject(error);
            }
        }

        // Обработка 401 с попыткой обновления токена только если есть refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            const tokens = await getStoredTokens();
            if (tokens && (tokens.accessToken || tokens.refreshToken)) {
                return handleRefreshToken(error, originalRequest);
            }
        }

        if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            error.response.data = {
                ...error.response.data,
                message: `Слишком много попыток. Пожалуйста, подождите ${retryAfter || 'некоторое время'} "секунд" перед следующей попыткой.`
            };
        }

        return Promise.reject(error);
    }
);

// Остальной код остается без изменений...
export const handleAuthTokens = (tokens) => {
    if (dispatchAction) {
        dispatchAction({ type: 'auth/setTokens', payload: tokens });
    }
};

export const handleLogout = () => {
    if (dispatchAction) {
        dispatchAction({ type: 'auth/resetState' });
    }
    removeTokens();
};

export const authService = {
    decodeToken,
    setTokensAndUser,
    getStoredTokens,
    saveTokens,
    removeTokens,
    initializeAuth,
    handleRefreshToken,
    getRefreshToken: async () => {
        try {
            const tokens = await getStoredTokens();
            return tokens?.refreshToken || null;
        } catch (error) {
            console.error('Ошибка получения refresh token:', error);
            return null;
        }
    },
    getAccessToken: async () => {
        try {
            const tokens = await getStoredTokens();
            return tokens?.accessToken || null;
        } catch (error) {
            console.error('Ошибка получения access token:', error);
            return null;
        }
    },
    clearTokens: async () => {
        try {
            await removeTokens();
            handleLogout();
        } catch (error) {
            console.error('Ошибка очистки токенов:', error);
        }
    },
    isTokenValid: (token) => {
        try {
            const decoded = decodeToken(token);
            if (!decoded?.exp) return false;
            const currentTime = Date.now() / 1000;
            return decoded.exp > currentTime;
        } catch (error) {
            console.error('Ошибка проверки токена:', error);
            return false;
        }
    },
    refreshAccessToken: async () => {
        try {
            // Если токен уже обновляется, возвращаем существующий промис
            if (refreshPromise) {
                return refreshPromise;
            }

            // Создаем новый промис для обновления
            refreshPromise = (async () => {
                try {
                    const tokens = await getStoredTokens();
                    
                    if (!tokens?.refreshToken) {
                        console.error('❌ refreshAccessToken: No refresh token available');
                        return null;
                    }

                    // Проверяем валидность refresh token перед обновлением
                    const decoded = decodeToken(tokens.refreshToken);
                    const currentTime = Math.floor(Date.now() / 1000);
                    if (!decoded || !decoded.exp || decoded.exp <= currentTime) {
                        await removeTokens();
                        if (dispatchAction) {
                            dispatchAction({ type: 'auth/resetState' });
                        }
                        return null;
                    }

                    // Проверяем, не обновляются ли токены в request interceptor
                    if (isRefreshing) {
                        // Ждем немного и проверяем токены еще раз
                        await new Promise(resolve => setTimeout(resolve, 200));
                        const updatedTokens = await getStoredTokens();
                        const updatedAccessValid = updatedTokens?.accessToken ? isTokenValid(updatedTokens.accessToken) : false;
                        
                        if (updatedAccessValid && updatedTokens) {
                            return updatedTokens;
                        }
                    }
                    
                    const response = await axios.post(
                        `${getBaseUrl()}/api/auth/refresh-token`,
                        { refreshToken: tokens.refreshToken },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                            },
                        }
                    );

                    let accessToken, refreshToken;
                    if (response.data?.data?.accessToken) {
                        accessToken = response.data.data.accessToken;
                        refreshToken = response.data.data.refreshToken;
                    } else if (response.data.accessToken) {
                        accessToken = response.data.accessToken;
                        refreshToken = response.data.refreshToken;
                    }

                    if (!accessToken || !refreshToken) {
                        console.error('❌ refreshAccessToken: Failed to extract tokens from response');
                        return null;
                    }

                    const newTokens = { accessToken, refreshToken };
                    await saveTokens(newTokens);
                    setTokensAndUser(newTokens);

                    return newTokens;
                } finally {
                    // Сбрасываем промис после завершения (успешного или нет)
                    refreshPromise = null;
                }
            })();

            return refreshPromise;
        } catch (error) {
            refreshPromise = null; // Сбрасываем промис при ошибке
            console.error('❌ refreshAccessToken: Error refreshing token:', error.message);
            
            // При ошибке 401/403 - это может означать что токены уже были использованы другим процессом
            if (error.response?.status === 401 || error.response?.status === 403) {
                // Проверяем, не были ли токены обновлены request interceptor'ом
                await new Promise(resolve => setTimeout(resolve, 300)); // Даем время interceptor'у завершиться
                const checkTokens = await getStoredTokens();
                const checkAccessValid = checkTokens?.accessToken ? isTokenValid(checkTokens.accessToken) : false;
                
                if (checkAccessValid && checkTokens) {
                    return checkTokens;
                }
                
                // Токены не обновлены, проверяем refresh token
                const checkRefreshValid = checkTokens?.refreshToken ? isTokenValid(checkTokens.refreshToken) : false;
                if (!checkRefreshValid) {
                    await removeTokens();
                    if (dispatchAction) {
                        dispatchAction({ type: 'auth/resetState' });
                    }
                }
            }
            
            return null;
        }
    }
};

export const createProtectedRequest = async (method, url, data = null, config = {}) => {
    const isFileUpload = config.headers &&
        config.headers['Content-Type'] &&
        config.headers['Content-Type'].includes('multipart/form-data');
    
    const isBlobResponse = config.responseType === 'blob';
    let finalUrl = url;

    try {
        if (isFileUpload) {
            config.transformRequest = [(data) => data];
            // Увеличиваем timeout до 5 минут для медленных соединений
            config.timeout = config.timeout || 300000;
            const timestamp = Date.now();
            if (!finalUrl.includes('?')) {
                finalUrl = `${finalUrl}?_t=${timestamp}`;
            } else {
                finalUrl = `${finalUrl}&_t=${timestamp}`;
            }
        }

        const requestConfig = {
            method,
            url: finalUrl,
            ...config
        };

        if (data !== null && data !== undefined) {
            requestConfig.data = data;
        }

        const response = await api(requestConfig);
        
        // Для blob ответов возвращаем response.data (который должен быть Blob)
        // Но добавляем дополнительную проверку и логирование
        if (isBlobResponse) {
            // Если получили не blob, но ожидали blob - что-то пошло не так
            if (!(response.data instanceof Blob)) {
                // Попытаемся создать blob из полученных данных
                if (typeof response.data === 'string' || response.data instanceof ArrayBuffer) {
                    const blob = new Blob([response.data], { type: 'application/pdf' });
                    return blob;
                }
                
                throw new Error('Server returned non-blob data for blob request');
            }
            
            return response.data;
        }
        
        return response.data;

    } catch (error) {
        if (!shouldSilenceErrorLog(error, finalUrl)) {
            console.error(`Error in ${method.toUpperCase()} ${finalUrl}:`, error.message || 'Unknown error');
        }

        if (isFileUpload && error.code === 'ERR_NETWORK') {
            throw {
                message: 'Проблема с сетевым подключением при загрузке файла. Пожалуйста, проверьте подключение к интернету и попробуйте снова.'
            };
        }

        throw error.response?.data || error;
    }
};

export const createPublicRequest = async (method, url, data = null, config = {}) => {
    try {
        const requestConfig = {
            method,
            url,
            ...config
        };

        if (data !== null && data !== undefined) {
            requestConfig.data = data;
        }

        const response = await api(requestConfig);
        return response.data;

    } catch (error) {
        if (!shouldSilenceErrorLog(error, url)) {
            console.error(`Error in ${method.toUpperCase()} ${url}:`, error.message || 'Unknown error');
        }
        throw error.response?.data || error;
    }
};

// Остальные функции остаются без изменений...
export const validateTokensStatus = async () => {
    try {
        const tokens = await getStoredTokens();

        if (!tokens) {
            return { status: 'error', message: 'Токены не найдены' };
        }

        const currentTime = Math.floor(Date.now() / 1000);
        let accessTokenValid = false;
        let refreshTokenValid = false;
        let accessTokenExpiry = null;
        let refreshTokenExpiry = null;

        if (tokens.accessToken) {
            try {
                const decoded = decodeToken(tokens.accessToken);
                accessTokenValid = decoded && decoded.exp > currentTime;
                accessTokenExpiry = decoded ? decoded.exp : null;
            } catch (e) {
                console.error('🔍 [VALIDATE] Ошибка декодирования access token:', e);
            }
        }

        if (tokens.refreshToken) {
            try {
                const decoded = decodeToken(tokens.refreshToken);
                refreshTokenValid = decoded && decoded.exp > currentTime;
                refreshTokenExpiry = decoded ? decoded.exp : null;
            } catch (e) {
                console.error('🔍 [VALIDATE] Ошибка декодирования refresh token:', e);
            }
        }

        const authHeader = api.defaults.headers.common['Authorization'];

        const result = {
            status: 'success',
            accessTokenValid,
            refreshTokenValid,
            authHeaderPresent: !!authHeader,
            accessTokenExpiry,
            refreshTokenExpiry,
            currentTime
        };

        return result;
    } catch (error) {
        console.error('🔍 [VALIDATE] Ошибка при проверке токенов:', error);
        return { status: 'error', message: error.message };
    }
};



/**
 * Выполнить fetch запрос к API (используйте вместо прямого fetch)
 * @param {string} endpoint - Путь к endpoint (например: '/api/products')
 * @param {RequestInit} options - Опции для fetch
 * @returns {Promise<Response>} Promise с ответом
 */
export const apiFetch = async (endpoint, options = {}) => {
    const url = getApiUrl(endpoint);
    
    const defaultOptions = {
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    return fetch(url, defaultOptions);
};

/**
 * Тест подключения к серверу
 * @returns {Promise<boolean>} true если подключение успешно
 */
export const testNetworkConnection = async () => {
    try {
        const baseUrl = getBaseUrl();

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Request timeout'));
            }, 10000);

            const testUrl = getApiUrl('/api/health');

            fetch(testUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            })
                .then(response => {
                    clearTimeout(timeout);

                    if (response.status >= 200 && response.status < 500) {
                        resolve(true);
                    } else {
                        reject(new Error(`Server error: ${response.status}`));
                    }
                })
                .catch(error => {
                    clearTimeout(timeout);

                    reject(new Error(`Network request failed: ${error.message}`));
                });
        });

    } catch (error) {
        throw error;
    }
};