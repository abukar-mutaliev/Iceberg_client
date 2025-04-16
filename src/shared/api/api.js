import axios from "axios";
import { Platform } from 'react-native';
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { store } from '@/app/store/store';
import { setTokens, logout, setUser } from '@/entities/auth';

const STORAGE_KEYS = {
    TOKENS: 'tokens',
    CSRF: 'csrf-token'
};

let isRefreshing = false;
let failedQueue = [];

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
    if (__DEV__) {
        if (Platform.OS === 'android') {
            // return 'http://10.0.1.4:5000'; // для эмулятора андроид
            return 'http://10.8.1.4:5000'; // для устройства на андроиде,
        }
        return 'http://localhost:5000';
    }
    return 'https://your-production-api.com';
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
        store.dispatch(setTokens(tokens));
        store.dispatch(setUser({
            id: decoded.userId,
            role: decoded.role,
            supplierId: decoded.supplierId
        }));
    }
};

const getStoredTokens = async () => {
    try {
        const tokensStr = await AsyncStorage.getItem(STORAGE_KEYS.TOKENS);
        return tokensStr ? JSON.parse(tokensStr) : null;
    } catch (error) {
        console.error('Ошибка получения токенов:', error);
        return null;
    }
};

const saveTokens = async (tokens) => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
        api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
    } catch (error) {
        console.error('Ошибка сохранения токенов:', error);
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
        if (tokens?.accessToken) {
            const decoded = decodeToken(tokens.accessToken);
            if (decoded) {
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

const handleRefreshToken = async (error, originalRequest) => {
    if (isRefreshing) {
        return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
        })
            .then(token => {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                return api(originalRequest);
            })
            .catch(err => Promise.reject(err));
    }

    isRefreshing = true;
    const tokens = await getStoredTokens();

    try {
        if (!tokens?.refreshToken) {
            throw new Error('Отсутствует refresh token');
        }

        const response = await api.post('/api/auth/refresh-token', {
            refreshToken: tokens.refreshToken
        });

        const newTokens = {
            accessToken: response.data.data.accessToken,
            refreshToken: response.data.data.refreshToken
        };

        await saveTokens(newTokens);
        setTokensAndUser(newTokens);

        processQueue(null, newTokens.accessToken);
        originalRequest.headers['Authorization'] = `Bearer ${newTokens.accessToken}`;

        return api(originalRequest);
    } catch (refreshError) {
        processQueue(refreshError, null);
        await removeTokens();
        store.dispatch(logout());
        throw refreshError;
    } finally {
        isRefreshing = false;
    }
};

const getCsrfToken = async () => {
    try {
        return await AsyncStorage.getItem(STORAGE_KEYS.CSRF);
    } catch (error) {
        return null;
    }
};

const initializeCsrf = async (retryCount = 3) => {
    for (let i = 0; i < retryCount; i++) {
        try {
            const response = await api.get('/api/auth/csrf-token');
            const token = response.data.csrfToken;

            if (!token) {
                throw new Error('CSRF токен не получен от сервера');
            }

            api.defaults.headers.common['X-CSRF-Token'] = token;
            await AsyncStorage.setItem(STORAGE_KEYS.CSRF, token);

            return token;
        } catch (error) {
            console.error(`Попытка ${i + 1} не удалась:`, error);
            if (i === retryCount - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
};

api.interceptors.request.use(async (config) => {
    try {
        const netInfo = await NetInfo.fetch();
        // console.log('Base URL:', config.baseURL);
        // console.log('Network state:', netInfo);
        // console.log('Request config:', {
        //     url: config.url,
        //     method: config.method,
        //     headers: config.headers,
        //     data: config.data,
        // });
        const tokens = await getStoredTokens();

        if (tokens?.accessToken) {
            config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }

        if (config.method !== 'get' && !config.url.includes('/csrf-token')) {
            const csrfToken = await getCsrfToken();
            if (csrfToken) {
                config.headers['x-csrf-token'] = csrfToken;
            }
        }
        if (config.method === 'delete' && (!config.data || config.data === null)) {
            delete config.headers['Content-Type'];
        }
        // console.log('Full request config:', {
        //     method: config.method,
        //     headers: config.headers,
        //     timeout: config.timeout
        // });
    } catch (error) {
        console.error('Request interceptor error:', error);
    }
    return config;
});

api.interceptors.response.use(
    response => response,
    async (error) => {
        const originalRequest = error.config;

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

        if (error.response?.status === 403 &&
            error.response?.data?.error === 'Недействительный CSRF токен' &&
            !originalRequest._retryCSRF) {

            originalRequest._retryCSRF = true;
            await AsyncStorage.removeItem(STORAGE_KEYS.CSRF);

            try {
                const newCsrfToken = await initializeCsrf();
                await AsyncStorage.setItem(STORAGE_KEYS.CSRF, newCsrfToken);
                originalRequest.headers['x-csrf-token'] = newCsrfToken;
                return api(originalRequest);
            } catch (retryError) {
                return Promise.reject(retryError);
            }
        }
        if (error.response?.status === 401 && originalRequest.url === '/api/auth/login') {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            return handleRefreshToken(error, originalRequest);
        }

        if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            error.response.data = {
                ...error.response.data,
                message: `Слишком много попыток. Пожалуйста, подождите ${retryAfter || 'некоторое время'} "секунд" перед следующей попыткой.`
            };
        }

        console.log('Error details:', {
            message: error.message,
            code: error.code,
            config: error.config,
            response: error.response
        });

        return Promise.reject(error);
    }
);

export const authService = {
    decodeToken,
    setTokensAndUser,
    getStoredTokens,
    saveTokens,
    removeTokens,
    initializeAuth,
    handleRefreshToken
};

export const csrfService = {
    initialize: initializeCsrf,
    getToken: async (forceRefresh = false) => {
        try {
            if (!forceRefresh) {
                const savedToken = await AsyncStorage.getItem(STORAGE_KEYS.CSRF);
                if (savedToken) {
                    api.defaults.headers.common['X-CSRF-Token'] = savedToken;
                    return savedToken;
                }
            }

            return await initializeCsrf();
        } catch (error) {
            console.error('Ошибка получения CSRF токена:', error);
            throw error;
        }
    }
};
export const createProtectedRequest = async (method, url, data = null, config = {}) => {
    try {
        const isFileUpload = config.headers &&
            config.headers['Content-Type'] &&
            config.headers['Content-Type'].includes('multipart/form-data');

        if (isFileUpload) {
            // Не трансформируем данные для multipart/form-data
            config.transformRequest = [(data) => data];

            // Добавляем таймаут побольше для загрузки файлов
            config.timeout = config.timeout || 120000; // 2 минуты для загрузки файлов
        }
        const requestConfig = {
            method,
            url,
            ...config
        };

        if (data !== null && data !== undefined) {
            requestConfig.data = data;
        }

        if (method.toLowerCase() === 'delete' && (!data || data === null)) {
            delete api.defaults.headers.common['Content-Type'];
            requestConfig.data = undefined;
        }

        const response = await api(requestConfig);

        // console.log('Ответ сервера (статус):', response.status);

        if (response.data) {
            const responseStr = JSON.stringify(response.data);
            // console.log('Ответ сервера (данные):', responseStr.length > 500
            //     ? responseStr.slice(0, 500) + '...'
            //     : responseStr
            // );
        } else {
            console.log('Ответ сервера не содержит данных');
        }

        if (typeof response.data === 'string') {
            try {
                return JSON.parse(response.data);
            } catch (e) {
                console.warn(`Ответ получен как строка и не может быть распарсен как JSON: ${response.data.slice(0, 100)}...`);
                return response.data;
            }
        }

        return response.data;
    } catch (error) {
        console.error(`Ошибка при выполнении запроса ${method.toUpperCase()} ${url}:`, {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data ? JSON.stringify(error.response.data).slice(0, 200) : 'нет данных',
            code: error.code
        });
        throw error;
    }
};