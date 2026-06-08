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
let refreshPromise = null;
/** Set from store.js so token reads can heal AsyncStorage from Redux after rehydrate. */
let getReduxState = null;

// ============================================================================
// 🔍 AUTH DIAGNOSTIC LOGGER
// Designed to trace token lifecycle issues caused by flaky network / VPN switching.
// Logs to console AND keeps a circular buffer that can be inspected via getAuthLogs().
// ============================================================================

const AUTH_LOG_BUFFER = [];
const AUTH_LOG_MAX = 200;

const _shortToken = (t) => {
    if (!t || typeof t !== 'string') return 'none';
    if (t.length < 20) return t;
    return `${t.substring(0, 8)}...${t.substring(t.length - 6)}`;
};

const _tokenExpiresIn = (token) => {
    try {
        if (!token) return null;
        const part = token.split('.')[1];
        if (!part) return null;
        const padded = part.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(padded));
        if (!decoded?.exp) return null;
        const now = Math.floor(Date.now() / 1000);
        return decoded.exp - now;
    } catch (e) {
        return null;
    }
};

// Fills an in-memory ring buffer. Inspect via authService.getAuthLogs() or
// authService.debugSnapshot() when investigating auth issues. Console output is
// produced ONLY for failure/recovery events so production logs stay clean while
// real auth problems are immediately visible.
const AUTH_NOISY_EVENTS = /(:fail|:rejected|:serverRejected|:expired|:noRefresh|:noTokens|recoveredAfter401|WATCHDOG_FIRED)/;

const logAuth = (event, data = {}) => {
    const entry = {
        ts: new Date().toISOString(),
        event,
        isRefreshing,
        queueSize: failedQueue.length,
        hasRefreshPromise: !!refreshPromise,
        ...data,
    };

    AUTH_LOG_BUFFER.push(entry);
    if (AUTH_LOG_BUFFER.length > AUTH_LOG_MAX) {
        AUTH_LOG_BUFFER.shift();
    }

    if (__DEV__ && AUTH_NOISY_EVENTS.test(event)) {
        const dataStr = Object.keys(data).length > 0 ? ' ' + JSON.stringify(data) : '';
        console.warn(`[AUTH] ${event}${dataStr}`);
    }
};

export const getAuthLogs = () => [...AUTH_LOG_BUFFER];

export const clearAuthLogs = () => {
    AUTH_LOG_BUFFER.length = 0;
};

/** True when failure is almost certainly transport/offline (no HTTP body to interpret). */
export const isNetworkError = (error) => {
    if (!error) return false;
    if (error.isNetworkError) return true;
    if (error.isWatchdogTimeout) return true;
    if (error.response) return false;
    const code = error.code;
    if (
        code === 'ERR_NETWORK' ||
        code === 'ECONNABORTED' ||
        code === 'ENOTFOUND' ||
        code === 'ECONNREFUSED' ||
        code === 'ENETUNREACH' ||
        code === 'EHOSTUNREACH' ||
        code === 'EAI_AGAIN' ||
        code === 'ETIMEDOUT'
    ) {
        return true;
    }
    const msg = String(error.message || '').toLowerCase();
    return (
        msg.includes('network') ||
        msg.includes('timeout') ||
        msg.includes('internet') ||
        msg.includes('failed to fetch')
    );
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// 🛡️ WATCHDOG: protect against stuck `isRefreshing` / `refreshPromise` flags.
// If a refresh promise hangs (e.g. JS suspended mid-await due to backgrounding,
// or a network call that never resolves under VPN switching), all subsequent
// requests get queued forever and the user sees "data won't load". Force-clear
// after a hard timeout so the next request can retry from scratch.
// ============================================================================

const REFRESH_WATCHDOG_MS = 75_000;
let isRefreshingWatchdog = null;
let refreshPromiseWatchdog = null;

const armIsRefreshingWatchdog = () => {
    if (isRefreshingWatchdog) clearTimeout(isRefreshingWatchdog);
    isRefreshingWatchdog = setTimeout(() => {
        if (isRefreshing) {
            logAuth('WATCHDOG_FIRED:isRefreshing', {
                reason: 'isRefreshing stuck for >75s, force-clearing',
                queueSize: failedQueue.length,
            });
            isRefreshing = false;
            const stuckErr = new Error('Auth refresh timed out (watchdog)');
            stuckErr.isWatchdogTimeout = true;
            processQueue(stuckErr, null);
        }
        isRefreshingWatchdog = null;
    }, REFRESH_WATCHDOG_MS);
};

const disarmIsRefreshingWatchdog = () => {
    if (isRefreshingWatchdog) {
        clearTimeout(isRefreshingWatchdog);
        isRefreshingWatchdog = null;
    }
};

const armRefreshPromiseWatchdog = () => {
    if (refreshPromiseWatchdog) clearTimeout(refreshPromiseWatchdog);
    refreshPromiseWatchdog = setTimeout(() => {
        if (refreshPromise) {
            logAuth('WATCHDOG_FIRED:refreshPromise', {
                reason: 'refreshPromise stuck for >75s, force-clearing',
            });
            refreshPromise = null;
        }
        refreshPromiseWatchdog = null;
    }, REFRESH_WATCHDOG_MS);
};

const disarmRefreshPromiseWatchdog = () => {
    if (refreshPromiseWatchdog) {
        clearTimeout(refreshPromiseWatchdog);
        refreshPromiseWatchdog = null;
    }
};

const refreshWithRetry = async (refreshTokenValue, maxRetries = 3) => {
    let lastError;
    const startTs = Date.now();
    logAuth('refreshWithRetry:start', {
        refreshToken: _shortToken(refreshTokenValue),
        refreshExpiresIn: _tokenExpiresIn(refreshTokenValue),
        maxRetries,
    });

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const attemptStart = Date.now();
        try {
            const response = await axios.post(
                `${getBaseUrl()}/api/auth/refresh-token`,
                { refreshToken: refreshTokenValue },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    timeout: 15000,
                }
            );

            let accessToken, newRefreshToken;
            if (response.data?.data?.accessToken) {
                accessToken = response.data.data.accessToken;
                newRefreshToken = response.data.data.refreshToken;
            } else if (response.data?.accessToken) {
                accessToken = response.data.accessToken;
                newRefreshToken = response.data.refreshToken;
            }

            if (accessToken && newRefreshToken) {
                logAuth('refreshWithRetry:success', {
                    attempt: attempt + 1,
                    durationMs: Date.now() - startTs,
                    newAccess: _shortToken(accessToken),
                    newAccessExpiresIn: _tokenExpiresIn(accessToken),
                    newRefresh: _shortToken(newRefreshToken),
                    newRefreshExpiresIn: _tokenExpiresIn(newRefreshToken),
                });
                return { accessToken, refreshToken: newRefreshToken };
            }

            throw new Error('Токены не найдены в ответе сервера');
        } catch (error) {
            lastError = error;
            const attemptMs = Date.now() - attemptStart;

            if (error.response?.status === 401 || error.response?.status === 403) {
                logAuth('refreshWithRetry:rejectedByServer', {
                    attempt: attempt + 1,
                    status: error.response.status,
                    serverMessage: error.response?.data?.message,
                    attemptMs,
                });
                throw error;
            }

            if (isNetworkError(error) && attempt < maxRetries - 1) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
                logAuth('refreshWithRetry:networkErrorRetry', {
                    attempt: attempt + 1,
                    nextDelayMs: delay,
                    code: error.code,
                    message: error.message,
                    attemptMs,
                });
                await sleep(delay);
                continue;
            }

            logAuth('refreshWithRetry:fail', {
                attempt: attempt + 1,
                code: error.code,
                status: error.response?.status,
                message: error.message,
                isNetworkError: isNetworkError(error),
                totalMs: Date.now() - startTs,
            });
            throw error;
        }
    }
    throw lastError;
};

// ============================================================================
// 🔁 SHARED REFRESH — single in-flight HTTP request per refresh token value.
// Eliminates race when interceptor + WebSocket reconnect + refreshAccessToken
// all try to refresh simultaneously. Without this, the slowest one gets a 401
// because the server already rotated the token in response to the faster one.
// ============================================================================

/**
 * Poll AsyncStorage every 100ms for up to `timeoutMs` for a valid access token.
 * Used by recovery flows to detect that another path just succeeded refreshing.
 */
const pollForValidStoredTokens = async (timeoutMs) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const t = await getStoredTokens();
        if (t?.accessToken && isTokenValid(t.accessToken)) {
            return t;
        }
        await sleep(100);
    }
    return null;
};

let sharedRefreshPromise = null;
let sharedRefreshToken = null;

const sharedRefresh = (refreshTokenValue) => {
    if (sharedRefreshPromise && sharedRefreshToken === refreshTokenValue) {
        logAuth('sharedRefresh:dedupe', {
            token: _shortToken(refreshTokenValue),
        });
        return sharedRefreshPromise;
    }

    if (sharedRefreshPromise && sharedRefreshToken !== refreshTokenValue) {
        // Another refresh is in flight for a different (older) token. Wait for it
        // first, then return its result if it produced a still-valid access.
        logAuth('sharedRefresh:waitOther', {
            requestedToken: _shortToken(refreshTokenValue),
            inflightToken: _shortToken(sharedRefreshToken),
        });
        return sharedRefreshPromise.catch(() => null).then(async () => {
            const stored = await getStoredTokens();
            if (stored?.accessToken && isTokenValid(stored.accessToken)) {
                return stored;
            }
            // Inflight refresh either failed or produced unusable tokens —
            // start a fresh one with whatever we have now.
            const latestRefresh = stored?.refreshToken || refreshTokenValue;
            return sharedRefresh(latestRefresh);
        });
    }

    sharedRefreshToken = refreshTokenValue;
    logAuth('sharedRefresh:start', { token: _shortToken(refreshTokenValue) });

    sharedRefreshPromise = (async () => {
        try {
            return await refreshWithRetry(refreshTokenValue);
        } finally {
            sharedRefreshPromise = null;
            sharedRefreshToken = null;
            logAuth('sharedRefresh:done', {});
        }
    })();

    return sharedRefreshPromise;
};

export const setDispatch = (dispatch) => {
    dispatchAction = dispatch;
};

export const setGetState = (getStateFn) => {
    getReduxState = typeof getStateFn === 'function' ? getStateFn : null;
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
    if (failedQueue.length > 0) {
        logAuth('processQueue', {
            queueSize: failedQueue.length,
            outcome: error ? `reject(${error.message})` : `resolve(${_shortToken(token)})`,
        });
    }
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
    
    // Изображения складов и товаров — из S3 (как на экранах WarehouseDetailsContent и каталога)
    const S3_UPLOADS_BASE = 'https://iceberg-uploads.hb.ru-msk.vkcloud-storage.ru';
    const storagePath = imagePath.replace(/^\/+/, '').replace(/^uploads\//, '');
    if (storagePath.startsWith('warehouses/') || storagePath.startsWith('products/')) {
        return `${S3_UPLOADS_BASE}/${storagePath}`;
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
        let tokens = tokensStr ? JSON.parse(tokensStr) : null;

        // После cold start redux-persist уже отдал auth.tokens, а ключ `tokens` в
        // AsyncStorage может быть пустым или рассинхронизированным — без этого
        // axios уходит без Authorization, а чат/категории падают до повторного входа.
        const needsHeal = !tokens?.accessToken || !tokens?.refreshToken;
        if (needsHeal && getReduxState) {
            try {
                const authTokens = getReduxState()?.auth?.tokens;
                if (authTokens?.accessToken && authTokens?.refreshToken) {
                    const healed = {
                        accessToken: authTokens.accessToken,
                        refreshToken: authTokens.refreshToken,
                    };
                    await AsyncStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(healed));
                    api.defaults.headers.common['Authorization'] = `Bearer ${healed.accessToken}`;
                    tokens = healed;
                }
            } catch (healErr) {
                console.warn('⚠️ [API] Не удалось восстановить токены из Redux:', healErr?.message);
            }
        }

        return tokens;
    } catch (error) {
        console.error('❌ [API] Ошибка получения токенов:', error);
        return null;
    }
};

const saveTokens = async (tokens) => {
    try {
        if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
            logAuth('saveTokens:invalid', {
                hasAccessToken: !!tokens?.accessToken,
                hasRefreshToken: !!tokens?.refreshToken,
            });
            return;
        }

        await AsyncStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
        api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
        logAuth('saveTokens:ok', {
            access: _shortToken(tokens.accessToken),
            accessExpiresIn: _tokenExpiresIn(tokens.accessToken),
            refresh: _shortToken(tokens.refreshToken),
            refreshExpiresIn: _tokenExpiresIn(tokens.refreshToken),
        });
    } catch (error) {
        logAuth('saveTokens:error', { message: error?.message });
    }
};

const removeTokens = async (reason = 'unknown') => {
    try {
        await AsyncStorage.removeItem(STORAGE_KEYS.TOKENS);
        delete api.defaults.headers.common['Authorization'];
        logAuth('removeTokens', { reason });
    } catch (error) {
        logAuth('removeTokens:error', { reason, message: error?.message });
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
        originalRequest.url?.includes('/api/auth/login') ||
        originalRequest.url?.includes('/api/auth/register') ||
        originalRequest.url?.includes('/api/auth/refresh-token')
    ) {
        return Promise.reject(error);
    }

    logAuth('handleRefreshToken:enter', {
        url: originalRequest.url,
        status: error?.response?.status,
        retried: !!originalRequest._retry,
    });

    // Prevent infinite retry loops: if we already retried this request, don't refresh again
    if (originalRequest._retry) {
        logAuth('handleRefreshToken:alreadyRetried', { url: originalRequest.url });
        return Promise.reject(error);
    }

    // Check if tokens were already refreshed by another path (request interceptor
    // or refreshAccessToken). Compare the token that failed with the current stored token.
    const failedToken = originalRequest.headers?.['Authorization']?.replace('Bearer ', '');
    if (failedToken) {
        const currentTokens = await getStoredTokens();
        if (currentTokens?.accessToken && currentTokens.accessToken !== failedToken && isTokenValid(currentTokens.accessToken)) {
            logAuth('handleRefreshToken:tokenAlreadyRefreshed', {
                url: originalRequest.url,
                failed: _shortToken(failedToken),
                current: _shortToken(currentTokens.accessToken),
            });
            originalRequest._retry = true;
            originalRequest.headers['Authorization'] = `Bearer ${currentTokens.accessToken}`;
            return api(originalRequest);
        }
    }

    if (isRefreshing) {
        logAuth('handleRefreshToken:queued', {
            url: originalRequest.url,
            queueSizeBefore: failedQueue.length,
        });
        return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
        })
            .then((token) => {
                originalRequest._retry = true;
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                logAuth('handleRefreshToken:dequeueSuccess', { url: originalRequest.url });
                return api(originalRequest);
            })
            .catch((err) => {
                logAuth('handleRefreshToken:dequeueReject', {
                    url: originalRequest.url,
                    message: err?.message,
                });
                return Promise.reject(err);
            });
    }

    isRefreshing = true;
    armIsRefreshingWatchdog();
    logAuth('handleRefreshToken:lockAcquired', { url: originalRequest.url });

    try {
        const tokens = await getStoredTokens();

        if (!tokens || !tokens.refreshToken) {
            await removeTokens('handleRefreshToken:noTokens');
            if (dispatchAction) {
                dispatchAction({ type: 'auth/resetState' });
            }
            throw new Error('Отсутствуют сохраненные токены');
        }

        const decoded = decodeToken(tokens.refreshToken);
        const currentTime = Math.floor(Date.now() / 1000);
        if (!decoded || !decoded.exp || decoded.exp < currentTime) {
            await removeTokens('handleRefreshToken:refreshExpired');
            if (dispatchAction) {
                dispatchAction({ type: 'auth/resetState' });
            }
            throw new Error('Ваша сессия истекла. Пожалуйста, войдите снова');
        }

        const newTokens = await sharedRefresh(tokens.refreshToken);
        await saveTokens(newTokens);
        setTokensAndUser(newTokens);

        processQueue(null, newTokens.accessToken);

        originalRequest._retry = true;
        originalRequest.headers['Authorization'] = `Bearer ${newTokens.accessToken}`;

        logAuth('handleRefreshToken:retryOriginal', { url: originalRequest.url });
        return api(originalRequest);
    } catch (refreshError) {
        logAuth('handleRefreshToken:fail', {
            url: originalRequest.url,
            message: refreshError?.message,
            status: refreshError?.response?.status,
            isNetworkError: isNetworkError(refreshError),
            isWatchdogTimeout: !!refreshError?.isWatchdogTimeout,
        });

        processQueue(refreshError, null);

        if (isNetworkError(refreshError)) {
            return Promise.reject(Object.assign(refreshError, {
                isNetworkError: true,
                message: 'Нет подключения к интернету. Попробуйте позже.'
            }));
        }

        // 401/403 от сервера — токен действительно невалиден
        if (refreshError.response?.status === 401 || refreshError.response?.status === 403) {
            await removeTokens(`handleRefreshToken:server${refreshError.response.status}`);
            if (dispatchAction) {
                dispatchAction({ type: 'auth/resetState' });
            }
        }

        return Promise.reject(refreshError);
    } finally {
        isRefreshing = false;
        disarmIsRefreshingWatchdog();
        logAuth('handleRefreshToken:lockReleased');
    }
};

// ============================================================================
// 🔥 CHAOS MODE — artificially flake the network for race-condition testing.
// Toggle via authService.setChaos({ delayMs: 4000, dropRate: 0.3 }) in dev.
// delayMs: extra latency added to EVERY request before it goes out.
// dropRate: 0..1 probability that a request fails with a fake network error.
// hangRefresh: when true, refresh-token requests hang for 8s (extreme test).
// ============================================================================
let chaosConfig = { delayMs: 0, dropRate: 0, hangRefresh: false };

export const setChaos = (cfg = {}) => {
    chaosConfig = { ...chaosConfig, ...cfg };
    if (__DEV__) {
        console.log('🔥 CHAOS:', chaosConfig);
    }
};

const applyChaos = async (config) => {
    if (!chaosConfig) return;
    const { delayMs, dropRate, hangRefresh } = chaosConfig;
    const isRefresh = config.url?.includes('/api/auth/refresh-token');
    if (hangRefresh && isRefresh) {
        await sleep(8000);
    } else if (delayMs > 0) {
        await sleep(delayMs);
    }
    if (dropRate > 0 && Math.random() < dropRate) {
        const err = new Error('Network Error (chaos)');
        err.code = 'ERR_NETWORK';
        err.isAxiosError = true;
        err.config = config;
        throw err;
    }
};

api.interceptors.request.use(async (config) => {
    const requestId = Date.now().toString();
    config.requestId = requestId;

    try {
        await applyChaos(config);

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
                const decoded = decodeToken(tokens.accessToken);
                const currentTime = Math.floor(Date.now() / 1000);
                const isExpired = !decoded || !decoded.exp || decoded.exp <= currentTime;

                if (isExpired) {
                    const decodedRefresh = decodeToken(tokens.refreshToken);
                    const refreshExpired = !decodedRefresh || !decodedRefresh.exp || decodedRefresh.exp <= currentTime;

                    logAuth('reqInterceptor:accessExpired', {
                        url: config.url,
                        accessExpiresIn: decoded?.exp ? decoded.exp - currentTime : null,
                        refreshExpiresIn: decodedRefresh?.exp ? decodedRefresh.exp - currentTime : null,
                        refreshExpired,
                    });

                    if (refreshExpired) {
                        await removeTokens('reqInterceptor:refreshExpired');
                        if (dispatchAction) {
                            dispatchAction({ type: 'auth/resetState' });
                        }
                        return Promise.reject(new Error('Ваша сессия истекла. Пожалуйста, войдите снова для продолжения работы'));
                    }

                    if (!refreshExpired) {
                        if (isRefreshing) {
                            logAuth('reqInterceptor:queued', {
                                url: config.url,
                                queueSizeBefore: failedQueue.length,
                            });
                            return new Promise((resolve, reject) => {
                                failedQueue.push({ resolve, reject });
                            }).then((token) => {
                                config.headers.Authorization = `Bearer ${token}`;
                                logAuth('reqInterceptor:dequeueSuccess', { url: config.url });
                                return config;
                            }).catch((err) => {
                                logAuth('reqInterceptor:dequeueReject', {
                                    url: config.url,
                                    message: err?.message,
                                });
                                return Promise.reject(err);
                            });
                        }

                        isRefreshing = true;
                        armIsRefreshingWatchdog();
                        logAuth('reqInterceptor:proactiveRefreshStart', { url: config.url });

                        try {
                            const newTokens = await sharedRefresh(tokens.refreshToken);
                            await saveTokens(newTokens);
                            setTokensAndUser(newTokens);

                            config.headers.Authorization = `Bearer ${newTokens.accessToken}`;
                            processQueue(null, newTokens.accessToken);
                            logAuth('reqInterceptor:proactiveRefreshOk', { url: config.url });
                        } catch (refreshError) {
                            logAuth('reqInterceptor:proactiveRefreshFail', {
                                url: config.url,
                                message: refreshError?.message,
                                code: refreshError?.code,
                                status: refreshError?.response?.status,
                                isNetworkError: isNetworkError(refreshError),
                            });
                            processQueue(refreshError, null);
                            // Don't send request with expired token on non-network errors
                            // (would trigger 401 → handleRefreshToken with rotated token).
                            if (!isNetworkError(refreshError)) {
                                // Server explicitly rejected refresh token (e.g. token was
                                // rotated and grace period passed) — trust the server and
                                // log the user out so navigation redirects to login screen.
                                const serverStatus = refreshError?.response?.status;
                                if (serverStatus === 401 || serverStatus === 403) {
                                    await removeTokens(`reqInterceptor:server${serverStatus}`);
                                    if (dispatchAction) {
                                        dispatchAction({ type: 'auth/resetState' });
                                    }
                                }
                                return Promise.reject(refreshError);
                            }
                            // Network error: fall through with old token, server may
                            // refresh from grace period or 401 will retry once.
                            config.headers.Authorization = `Bearer ${tokens.accessToken}`;
                        } finally {
                            isRefreshing = false;
                            disarmIsRefreshingWatchdog();
                        }
                    }
                } else {
                    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
                }
            } else {
                logAuth('reqInterceptor:noTokens', { url: config.url });
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
            logAuth('respInterceptor:401', {
                url: originalRequest.url,
                hasAccess: !!tokens?.accessToken,
                hasRefresh: !!tokens?.refreshToken,
                serverMessage: error.response?.data?.message,
            });
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
    removeTokens('handleLogout');
};

export const authService = {
    decodeToken,
    setTokensAndUser,
    getStoredTokens,
    saveTokens,
    removeTokens,
    initializeAuth,
    handleRefreshToken,
    getAuthLogs,
    clearAuthLogs,
    /** Включить chaos-mode для воспроизведения race conditions */
    setChaos,
    /** Дамп текущего auth-состояния — для проверки в проблемный момент */
    debugSnapshot: async () => {
        const tokens = await getStoredTokens();
        return {
            ts: new Date().toISOString(),
            isRefreshing,
            failedQueueSize: failedQueue.length,
            hasRefreshPromise: !!refreshPromise,
            hasSharedRefresh: !!sharedRefreshPromise,
            sharedRefreshTokenShort: _shortToken(sharedRefreshToken),
            chaos: chaosConfig,
            hasAuthHeader: !!api.defaults.headers.common['Authorization'],
            authHeader: _shortToken(api.defaults.headers.common['Authorization']?.replace('Bearer ', '')),
            stored: {
                hasAccess: !!tokens?.accessToken,
                hasRefresh: !!tokens?.refreshToken,
                accessShort: _shortToken(tokens?.accessToken),
                refreshShort: _shortToken(tokens?.refreshToken),
                accessExpiresIn: _tokenExpiresIn(tokens?.accessToken),
                refreshExpiresIn: _tokenExpiresIn(tokens?.refreshToken),
            },
            recentLogs: AUTH_LOG_BUFFER.slice(-30),
        };
    },
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
            await removeTokens('authService.clearTokens');
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
        if (refreshPromise) {
            logAuth('refreshAccessToken:reuse', {});
            return refreshPromise;
        }

        logAuth('refreshAccessToken:start', {});
        armRefreshPromiseWatchdog();

        refreshPromise = (async () => {
            try {
                const tokens = await getStoredTokens();

                if (!tokens?.refreshToken) {
                    logAuth('refreshAccessToken:noRefresh', {});
                    return null;
                }

                const decoded = decodeToken(tokens.refreshToken);
                const currentTime = Math.floor(Date.now() / 1000);
                if (!decoded || !decoded.exp || decoded.exp <= currentTime) {
                    logAuth('refreshAccessToken:refreshExpired', {
                        expiresIn: decoded?.exp ? decoded.exp - currentTime : null,
                    });
                    await removeTokens('refreshAccessToken:refreshExpired');
                    if (dispatchAction) {
                        dispatchAction({ type: 'auth/resetState' });
                    }
                    return null;
                }

                // sharedRefresh handles deduplication automatically — if interceptor
                // is already refreshing the same token, we'll get its result.
                const newTokens = await sharedRefresh(tokens.refreshToken);
                await saveTokens(newTokens);
                setTokensAndUser(newTokens);

                logAuth('refreshAccessToken:ok', {});
                return newTokens;
            } catch (error) {
                logAuth('refreshAccessToken:fail', {
                    message: error?.message,
                    code: error?.code,
                    status: error?.response?.status,
                    isNetworkError: isNetworkError(error),
                });

                if (isNetworkError(error)) {
                    return null;
                }

                if (error.response?.status === 401 || error.response?.status === 403) {
                    // Race-recovery: maybe a parallel path just refreshed successfully.
                    // Poll for up to 3 seconds checking storage for valid tokens.
                    const recovered = await pollForValidStoredTokens(3000);
                    if (recovered) {
                        logAuth('refreshAccessToken:recoveredAfter401', {});
                        return recovered;
                    }

                    // Server explicitly rejected the refresh token (e.g. it was rotated
                    // and grace period expired). Trust the server unconditionally —
                    // the JWT may still be valid by client-side decoding, but the server
                    // is the source of truth. Force a logout so user re-authenticates.
                    logAuth('refreshAccessToken:serverRejected', {
                        status: error.response.status,
                        serverMessage: error.response?.data?.message,
                    });
                    await removeTokens(`refreshAccessToken:server${error.response.status}`);
                    if (dispatchAction) {
                        dispatchAction({ type: 'auth/resetState' });
                    }
                }

                return null;
            } finally {
                refreshPromise = null;
                disarmRefreshPromiseWatchdog();
            }
        })();

        return refreshPromise;
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