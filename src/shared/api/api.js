import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {Platform} from "react-native";

const STORAGE_KEYS = {
    TOKENS: 'tokens',
};

let isRefreshing = false;
let failedQueue = [];
let dispatchAction = null;

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

    console.log(`[API-${type}] ${message}`, data || '');
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

export const getBaseUrl = () => {
    // Сервер работает на порту 5001 (5000 занят)
    // const baseUrl = 'http://212.67.11.134';
    // const port = 5001; // Сервер запустился на порту 5001
    //
    // const serverUrl = `${baseUrl}:${port}`;
    //
    // console.log('🌐 [API] Using server URL:', serverUrl);
    // console.log('🌐 [API] Server is running on port 5001 (5000 is busy)');
    //
    // return serverUrl;

    // // Старый код на случай, если нужно будет вернуться к локальной разработке

    // if (__DEV__) {
    //     if (Platform.OS === 'android') {
    //         return 'http://192.168.1.226:5000';
    //     }
    //     return 'http://localhost:5000';
    // }
    return 'http://212.67.11.134:5000';

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

        console.log('📖 [API] Retrieved tokens:', {
            hasStoredData: !!tokensStr,
            hasTokens: !!tokens,
            hasAccessToken: !!tokens?.accessToken,
            hasRefreshToken: !!tokens?.refreshToken,
            accessTokenLength: tokens?.accessToken?.length || 0,
            refreshTokenLength: tokens?.refreshToken?.length || 0
        });

        return tokens;
    } catch (error) {
        console.error('❌ [API] Ошибка получения токенов:', error);
        return null;
    }
};

const saveTokens = async (tokens) => {
    try {
        console.log('💾 [API] Saving tokens:', {
            hasAccessToken: !!tokens.accessToken,
            hasRefreshToken: !!tokens.refreshToken,
            accessTokenLength: tokens.accessToken?.length || 0,
            refreshTokenLength: tokens.refreshToken?.length || 0
        });

        await AsyncStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
        api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;

        console.log('💾 [API] Tokens saved successfully, Authorization header set');
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
                    console.error('Ошибка обновления токена:', err.message);
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
            console.error('handleRefreshToken: Токены или refresh token отсутствуют');
            throw new Error('Отсутствуют сохраненные токены');
        }

        const decoded = authService.decodeToken(tokens.refreshToken);
        const currentTime = Math.floor(Date.now() / 1000);
        if (!decoded || !decoded.exp || decoded.exp < currentTime) {
            console.error('handleRefreshToken: Refresh token истек');
            throw new Error('Refresh token истек');
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

        await removeTokens();
        if (dispatchAction) {
            dispatchAction({ type: 'auth/resetState' });
            dispatchAction({ type: 'RESET_APP_STATE' });
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
            url: config.url
        });

        const tokens = await getStoredTokens();
        if (tokens?.accessToken) {
            config.headers.Authorization = `Bearer ${tokens.accessToken}`;
            console.log('🔑 [API REQUEST] Authorization header set:', {
                hasToken: !!tokens.accessToken,
                tokenPrefix: `${tokens.accessToken.substring(0, 20)}...`,
                url: config.url
            });
        } else {
            console.warn('⚠️ [API REQUEST] No access token found for request:', config.url);
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
        const duration = Date.now() - response.config.metadata.startTime;

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
        const duration = originalRequest?.metadata ? Date.now() - originalRequest.metadata.startTime : 0;

        // Всегда логируем ошибки
        apiDebugLog('ERROR', `Request failed: ${originalRequest?.url}`, {
            requestId: originalRequest?.requestId,
            status: error.response?.status,
            duration: `${duration}ms`,
            message: error.message,
            url: originalRequest?.url
        });

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
    }
};

export const createProtectedRequest = async (method, url, data = null, config = {}) => {
    const isFileUpload = config.headers &&
        config.headers['Content-Type'] &&
        config.headers['Content-Type'].includes('multipart/form-data');
    
    const isBlobResponse = config.responseType === 'blob';

    try {
        let finalUrl = url;
        if (isFileUpload) {
            config.transformRequest = [(data) => data];
            config.timeout = config.timeout || 120000;
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
            console.log('createProtectedRequest blob response:', {
                status: response.status,
                headers: response.headers,
                dataType: typeof response.data,
                isBlob: response.data instanceof Blob,
                dataSize: response.data?.size || 'unknown'
            });
            
            // Если получили не blob, но ожидали blob - что-то пошло не так
            if (!(response.data instanceof Blob)) {
                console.warn('Expected Blob but got:', typeof response.data, response.data);
                
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
        console.error(`Error in ${method.toUpperCase()} ${url}:`, error.message || 'Unknown error');

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
        console.error(`Error in ${method.toUpperCase()} ${url}:`, error.message || 'Unknown error');
        throw error.response?.data || error;
    }
};

// Остальные функции остаются без изменений...
export const validateTokensStatus = async () => {
    try {
        console.log('🔍 [VALIDATE] Starting token validation...');

        const tokens = await getStoredTokens();
        console.log('🔍 [VALIDATE] Tokens retrieved:', !!tokens);

        if (!tokens) {
            console.log('🔍 [VALIDATE] Result: No tokens found');
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
                console.log('🔍 [VALIDATE] Access token:', {
                    valid: accessTokenValid,
                    exp: accessTokenExpiry,
                    timeToExpiry: accessTokenExpiry ? accessTokenExpiry - currentTime : null
                });
            } catch (e) {
                console.error('🔍 [VALIDATE] Ошибка декодирования access token:', e);
            }
        }

        if (tokens.refreshToken) {
            try {
                const decoded = decodeToken(tokens.refreshToken);
                refreshTokenValid = decoded && decoded.exp > currentTime;
                refreshTokenExpiry = decoded ? decoded.exp : null;
                console.log('🔍 [VALIDATE] Refresh token:', {
                    valid: refreshTokenValid,
                    exp: refreshTokenExpiry,
                    timeToExpiry: refreshTokenExpiry ? refreshTokenExpiry - currentTime : null
                });
            } catch (e) {
                console.error('🔍 [VALIDATE] Ошибка декодирования refresh token:', e);
            }
        }

        const authHeader = api.defaults.headers.common['Authorization'];
        console.log('🔍 [VALIDATE] Auth header present:', !!authHeader);

        const result = {
            status: 'success',
            accessTokenValid,
            refreshTokenValid,
            authHeaderPresent: !!authHeader,
            accessTokenExpiry,
            refreshTokenExpiry,
            currentTime
        };

        console.log('🔍 [VALIDATE] Final result:', result);
        return result;
    } catch (error) {
        console.error('🔍 [VALIDATE] Ошибка при проверке токенов:', error);
        return { status: 'error', message: error.message };
    }
};



export const testNetworkConnection = async () => {
    try {
        const baseUrl = getBaseUrl();

        if (baseUrl.startsWith('http://')) {
            console.log('WARNING: Using HTTP (cleartext) connection');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Request timeout'));
            }, 10000);

            const testUrl = `${baseUrl}/api/health`;

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

                    if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
                        console.log('ERROR: This is likely a CORS/cleartext traffic issue');
                    }

                    reject(new Error(`Network request failed: ${error.message}`));
                });
        });

    } catch (error) {
        console.log('ERROR in testNetworkConnection setup:', error.message);
        throw error;
    }
};