import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { OrderApi } from '../api';
import { getStatusLabel } from '../lib/utils';

const CACHE_EXPIRY_TIME = 2 * 60 * 1000; // 2 минуты

const initialState = {
    // Списки заказов
    myOrders: {
        data: [],
        total: 0,
        page: 1,
        pages: 1,
        loading: false,
        error: null,
        lastFetchTime: null,
        hasMore: false
    },

    staffOrders: {
        // Активные заказы (без history флага)
        activeOrders: {
            data: [],
            total: 0,
            page: 1,
            pages: 1,
            lastFetchTime: null,
            hasMore: false
        },
        // Заказы ожидающие поставки (status=WAITING_STOCK)
        waitingStockOrders: {
            data: [],
            total: 0,
            page: 1,
            pages: 1,
            lastFetchTime: null,
            hasMore: false
        },
        // Исторические заказы (с history=true)
        historyOrders: {
            data: [],
            total: 0,
            page: 1,
            pages: 1,
            lastFetchTime: null,
            hasMore: false
        },
        // Общие состояния
        loading: false,
        error: null,
        filters: {
            status: null,
            warehouseId: null,
            assignedToMe: false,
            districtId: null,
            dateFrom: null,
            dateTo: null,
            priority: false,
            includeNearbyDistricts: false,
            availableForPickup: false
        }
    },

    // Заказы доступные для перехвата
    availableOrders: {
        data: [],
        loading: false,
        error: null,
        lastFetchTime: null
    },

    // Детали заказа
    orderDetails: {
        data: null,
        loading: false,
        error: null,
        lastFetchTime: null
    },

    // Статистика
    stats: {
        data: null,
        loading: false,
        error: null,
        lastFetchTime: null
    },

    // Счетчики заказов (для бейджей)
    orderCounts: {
        waitingStockCount: 0,
        total: 0,
        loading: false,
        error: null,
        lastFetchTime: null
    },

    // Состояния операций
    operations: {
        updating: [], // ID заказов, которые обновляются
        cancelling: [], // ID заказов, которые отменяются
        assigning: [], // ID заказов, которые назначаются
        taking: [], // ID заказов, которые берутся в работу
        pickingUp: [], // ID заказов, которые перехватываются
        creating: false, // Создание заказа
        bulkOperating: false,
        exporting: false
    },

    // Локальные действия сотрудников по заказам (для синхронизации между экранами)
    localOrderActions: {}, // orderId -> { taken: boolean, completed: boolean, timestamp: number }

    // Уведомления
    notifications: [],

    // Фильтры и настройки
    preferences: {
        defaultPageSize: 10,
        autoRefresh: false,
        refreshInterval: 30000, // 30 секунд
        soundNotifications: true
    },

    // Кеширование
    cache: {},

    // Общие состояния
    error: null,
    lastError: null
};

const isCacheValid = (lastFetchTime) => {
    return lastFetchTime && Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
};

const addToArray = (array, item) => {
    if (!array.includes(item)) {
        return [...array, item];
    }
    return array;
};

const removeFromArray = (array, item) => {
    return array.filter(x => x !== item);
};

// ===== ASYNC THUNKS =====

// Получение моих заказов (для клиентов)
export const fetchMyOrders = createAsyncThunk(
    'orders/fetchMyOrders',
    async (params = {}, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const userRole = state.auth?.user?.role;

            if (userRole !== 'CLIENT') {
                return rejectWithValue('Доступ запрещен');
            }

            const { forceRefresh = false, ...requestParams } = params;

            if (!forceRefresh && isCacheValid(state.order.myOrders.lastFetchTime)) {
                return { data: state.order.myOrders, fromCache: true };
            }

            const response = await OrderApi.getMyOrders(requestParams);

            if (response.status === 'success') {
                return { data: response.data, fromCache: false };
            } else {
                throw new Error(response.message || 'Ошибка при загрузке заказов');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при загрузке заказов');
        }
    }
);

// Получение счетчиков заказов (легковесный запрос для бейджей)
export const fetchOrderCounts = createAsyncThunk(
    'orders/fetchOrderCounts',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const userRole = state.auth?.user?.role;
            const currentUser = state.auth?.user;

            if (!['ADMIN', 'EMPLOYEE'].includes(userRole)) {
                return rejectWithValue('Доступ запрещен');
            }

            // Для EMPLOYEE требуем только employeeId (warehouseId может быть null для SUPERVISOR)
            if (userRole === 'EMPLOYEE') {
                if (!currentUser?.employee?.id) {
                    return rejectWithValue('Employee данные ещё не загружены');
                }
            }

            // Получаем только счетчики - сервер уже фильтрует по складу сотрудника
            const response = await OrderApi.getOrders({
                page: 1,
                limit: 100, // Достаточно для подсчета
                _t: Date.now()
            });

            if (response.status === 'success') {
                // Сервер может вернуть массив в response.data или response.data.data
                const orders = Array.isArray(response.data) ? response.data : (response.data?.data || []);

                // ВАЖНО: Используем waitingStockCount от СЕРВЕРА, а не считаем на клиенте!
                // Сервер возвращает правильное количество из всей базы, а не только из загруженных 100
                const waitingStockCount = response.waitingStockCount ??
                    orders.filter(order => order.status === 'WAITING_STOCK').length;

                return {
                    waitingStockCount,
                    total: orders.length
                };
            } else {
                throw new Error(response.message || 'Ошибка при загрузке счетчиков');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при загрузке счетчиков');
        }
    }
);

// Получение заказов (для персонала)
export const fetchStaffOrders = createAsyncThunk(
    'orders/fetchStaffOrders',
    async (params = {}, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const userRole = state.auth?.user?.role;

            if (!['ADMIN', 'EMPLOYEE'].includes(userRole)) {
                return rejectWithValue('Доступ запрещен');
            }

            const { forceRefresh = false, ...requestParams } = params;

            // Определяем, это запрос истории или активных заказов
            const isHistory = !!requestParams.history;
            const isWaitingStock = requestParams.status === 'WAITING_STOCK';
            const targetStorage = isHistory
                ? state.order.staffOrders.historyOrders
                : (isWaitingStock ? state.order.staffOrders.waitingStockOrders : state.order.staffOrders.activeOrders);

            // Кэш НЕ используется если запрашивается другая страница
            const requestedPage = requestParams.page || 1;
            const cachedPage = targetStorage.page || 1;
            const isPageChange = requestedPage !== cachedPage;

            if (!forceRefresh && !isPageChange && isCacheValid(targetStorage.lastFetchTime)) {
                return { data: targetStorage, fromCache: true, isHistory, isWaitingStock, filters: requestParams };
            }

            // Добавляем timestamp для обхода кэширования
            const requestParamsWithTimestamp = {
                ...requestParams,
                _t: Date.now()
            };

            const response = await OrderApi.getOrders(requestParamsWithTimestamp);

            if (response.status === 'success') {
                // Возвращаем весь ответ, включая data, pagination, waitingStockCount и isHistory
                return {
                    data: {
                        data: response.data,
                        pagination: response.pagination,
                        waitingStockCount: response.waitingStockCount
                    },
                    fromCache: false,
                    filters: requestParams,
                    isHistory,
                    isWaitingStock
                };
            } else {
                throw new Error(response.message || 'Ошибка при загрузке заказов');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при загрузке заказов');
        }
    }
);

// Получение деталей заказа
export const fetchOrderDetails = createAsyncThunk(
    'orders/fetchOrderDetails',
    async ({ orderId, forceRefresh = false }, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const cacheKey = `order_${orderId}`;

            if (!forceRefresh && isCacheValid(state.order.cache[cacheKey]?.lastFetchTime)) {
                return {
                    data: state.order.cache[cacheKey].data,
                    fromCache: true,
                    orderId
                };
            }

            const response = await OrderApi.getOrderById(orderId);

            if (response.status === 'success') {
                return {
                    data: response.data,
                    fromCache: false,
                    orderId
                };
            } else {
                throw new Error(response.message || 'Ошибка при загрузке заказа');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при загрузке заказа');
        }
    }
);

// Обновление статуса заказа
export const updateOrderStatus = createAsyncThunk(
    'orders/updateOrderStatus',
    async ({ orderId, statusData }, { rejectWithValue, dispatch }) => {
        try {
            const response = await OrderApi.updateOrderStatus(orderId, statusData);

            if (response.status === 'success') {
                // Обновляем детали заказа, если они загружены
                dispatch(fetchOrderDetails({ orderId, forceRefresh: true }));

                return {
                    orderId,
                    statusData,
                    updatedOrder: response.data
                };
            } else {
                throw new Error(response.message || 'Ошибка при обновлении статуса');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при обновлении статуса');
        }
    }
);

// Завершение этапа заказа (с автоматическим переходом)
export const completeOrderStage = createAsyncThunk(
    'orders/completeOrderStage',
    async ({ orderId, comment }, { rejectWithValue, dispatch }) => {
        try {
            const response = await OrderApi.completeOrderStage(orderId, comment);

            if (response.status === 'success') {
                // Обновляем детали заказа, если они загружены
                dispatch(fetchOrderDetails({ orderId, forceRefresh: true }));

                return {
                    orderId,
                    comment,
                    result: response.data
                };
            } else {
                throw new Error(response.message || 'Ошибка при завершении этапа');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при завершении этапа');
        }
    }
);

// Назначение заказа
export const assignOrder = createAsyncThunk(
    'orders/assignOrder',
    async ({ orderId, assignmentData }, { rejectWithValue, dispatch }) => {
        try {
            const response = await OrderApi.assignOrder(orderId, assignmentData);

            if (response.status === 'success') {
                // Обновляем детали заказа, если они загружены
                dispatch(fetchOrderDetails({ orderId, forceRefresh: true }));

                return {
                    orderId,
                    assignmentData,
                    updatedOrder: response.data
                };
            } else {
                throw new Error(response.message || 'Ошибка при назначении заказа');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при назначении заказа');
        }
    }
);

// Взять заказ в работу (самоназначение)
export const takeOrder = createAsyncThunk(
    'orders/takeOrder',
    async ({ orderId, reason }, { rejectWithValue, dispatch }) => {
        try {
            const response = await OrderApi.takeOrder(orderId, reason);

            if (response.status === 'success') {
                // Обновляем детали заказа, если они загружены
                dispatch(fetchOrderDetails({ orderId, forceRefresh: true }));

                return {
                    orderId,
                    reason,
                    updatedOrder: response.data
                };
            } else {
                throw new Error(response.message || 'Ошибка при взятии заказа в работу');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при взятии заказа в работу');
        }
    }
);

// Отмена заказа
export const cancelOrder = createAsyncThunk(
    'orders/cancelOrder',
    async ({ orderId, cancellationData, isMyOrder = false }, { rejectWithValue, dispatch }) => {
        try {
            const service = isMyOrder ? OrderApi.cancelMyOrder : OrderApi.cancelOrder;
            const params = isMyOrder ?
                [orderId, cancellationData.reason] :
                [orderId, cancellationData];

            const response = await service(...params);

            if (response.status === 'success') {
                // Обновляем детали заказа, если они загружены
                dispatch(fetchOrderDetails({ orderId, forceRefresh: true }));

                return {
                    orderId,
                    cancellationData,
                    isMyOrder,
                    cancelledOrder: response.data
                };
            } else {
                throw new Error(response.message || 'Ошибка при отмене заказа');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при отмене заказа');
        }
    }
);

// Создание заказа для клиента
export const createOrderForClient = createAsyncThunk(
    'orders/createOrderForClient',
    async (orderData, { rejectWithValue }) => {
        try {
            const response = await OrderApi.createOrderForClient(orderData);

            if (response.status === 'success') {
                return {
                    orderData,
                    createdOrder: response.data
                };
            } else {
                throw new Error(response.message || 'Ошибка при создании заказа');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при создании заказа');
        }
    }
);

// Массовые операции
export const bulkUpdateOrders = createAsyncThunk(
    'orders/bulkUpdateOrders',
    async (bulkData, { rejectWithValue }) => {
        try {
            const response = await OrderApi.bulkUpdateOrders(bulkData);

            if (response.status === 'success') {
                return {
                    bulkData,
                    result: response.data
                };
            } else {
                throw new Error(response.message || 'Ошибка при массовом обновлении');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при массовом обновлении');
        }
    }
);

// Получение статистики
export const fetchOrdersStats = createAsyncThunk(
    'orders/fetchOrdersStats',
    async (params = {}, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const userRole = state.auth?.user?.role;

            if (!['ADMIN', 'EMPLOYEE'].includes(userRole)) {
                return rejectWithValue('Доступ запрещен');
            }

            const { forceRefresh = false, ...requestParams } = params;

            if (!forceRefresh && isCacheValid(state.order.stats.lastFetchTime)) {
                return { data: state.order.stats.data, fromCache: true };
            }

            const response = await OrderApi.getOrdersStats(requestParams);

            if (response.status === 'success') {
                return { data: response.data, fromCache: false };
            } else {
                throw new Error(response.message || 'Ошибка при загрузке статистики');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при загрузке статистики');
        }
    }
);

// Экспорт заказов
export const exportOrders = createAsyncThunk(
    'orders/exportOrders',
    async (exportData, { rejectWithValue }) => {
        try {
            const response = await OrderApi.exportOrders(exportData);

            const filename = `orders_export_${new Date().toISOString().split('T')[0]}.${exportData.format || 'xlsx'}`;

            return {
                exportData,
                filename,
                data: response,
                success: true
            };
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при экспорте заказов');
        }
    }
);

// Перехватить заказ из соседнего района
export const pickupOrder = createAsyncThunk(
    'orders/pickupOrder',
    async ({ orderId, pickupData }, { rejectWithValue, dispatch }) => {
        try {
            const response = await OrderApi.pickupOrder(orderId, pickupData);

            if (response.status === 'success') {
                // Обновляем детали заказа, если они загружены
                dispatch(fetchOrderDetails({ orderId, forceRefresh: true }));

                return {
                    orderId,
                    pickupData,
                    updatedOrder: response.data
                };
            } else {
                throw new Error(response.message || 'Ошибка при перехвате заказа');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при перехвате заказа');
        }
    }
);

// Получить доступные заказы для перехвата
export const fetchAvailableOrdersForPickup = createAsyncThunk(
    'orders/fetchAvailableOrdersForPickup',
    async (params = {}, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const userRole = state.auth?.user?.role;

            if (!['ADMIN', 'EMPLOYEE'].includes(userRole)) {
                return rejectWithValue('Доступ запрещен');
            }

            const { forceRefresh = false, ...requestParams } = params;

            if (!forceRefresh && isCacheValid(state.order.availableOrders.lastFetchTime)) {
                return { data: state.order.availableOrders.data, fromCache: true };
            }

            const response = await OrderApi.getAvailableOrdersForPickup(requestParams);

            if (response.status === 'success') {
                return { data: response.data, fromCache: false };
            } else {
                throw new Error(response.message || 'Ошибка при загрузке доступных заказов');
            }
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при загрузке доступных заказов');
        }
    }
);

// Скачать накладную заказа в PDF - УБРАНО, так как обрабатывается напрямую в UI
// export const downloadOrderInvoice = ...

const orderSlice = createSlice({
    name: 'orders',
    initialState,
    reducers: {
        // Очистка ошибок
        clearError: (state) => {
            state.error = null;
            state.myOrders.error = null;
            state.staffOrders.error = null;
            state.orderDetails.error = null;
            state.stats.error = null;
        },

        // Очистка конкретной ошибки
        clearSpecificError: (state, action) => {
            const { section } = action.payload;
            if (state[section]) {
                state[section].error = null;
            }
        },

        // Очистка кеша
        clearCache: (state, action) => {
            if (action.payload) {
                // Очищаем конкретный кеш
                const { cacheKey } = action.payload;
                delete state.cache[cacheKey];
            } else {
                // Очищаем весь кеш
                state.cache = {};
                state.myOrders.lastFetchTime = null;
                state.staffOrders.lastFetchTime = null;
                state.orderDetails.lastFetchTime = null;
                state.stats.lastFetchTime = null;
            }
        },

        // Установка фильтров для заказов персонала
        setStaffOrdersFilters: (state, action) => {
            state.staffOrders.filters = {
                ...state.staffOrders.filters,
                ...action.payload
            };
        },

        // Сброс фильтров
        resetStaffOrdersFilters: (state) => {
            state.staffOrders.filters = initialState.staffOrders.filters;
        },

        // Очистка данных заказов персонала (при смене вкладки/фильтра)
        clearStaffOrdersData: (state, action) => {
            const target = action?.payload?.target; // 'active', 'history', или undefined (очистить оба)

            if (!target || target === 'active') {
                state.staffOrders.activeOrders.data = [];
                state.staffOrders.activeOrders.total = 0;
                state.staffOrders.activeOrders.page = 1;
                state.staffOrders.activeOrders.pages = 1;
                state.staffOrders.activeOrders.hasMore = false;
                // НЕ очищаем lastFetchTime - он нужен для кэша
            }

            if (!target || target === 'waiting') {
                state.staffOrders.waitingStockOrders.data = [];
                state.staffOrders.waitingStockOrders.total = 0;
                state.staffOrders.waitingStockOrders.page = 1;
                state.staffOrders.waitingStockOrders.pages = 1;
                state.staffOrders.waitingStockOrders.hasMore = false;
                // НЕ очищаем lastFetchTime - он нужен для кэша
            }

            if (!target || target === 'history') {
                state.staffOrders.historyOrders.data = [];
                state.staffOrders.historyOrders.total = 0;
                state.staffOrders.historyOrders.page = 1;
                state.staffOrders.historyOrders.pages = 1;
                state.staffOrders.historyOrders.hasMore = false;
                // НЕ очищаем lastFetchTime - он нужен для кэша
            }
        },

        // Добавление уведомления
        addNotification: (state, action) => {
            const newNotification = {
                id: action.payload.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...action.payload,
                timestamp: action.payload.timestamp || new Date().toISOString()
            };

            // Предотвращаем дублирование уведомлений
            const isDuplicate = state.notifications.some(notification => {
                const isSameMessage = notification.message === newNotification.message;
                const isSameType = notification.type === newNotification.type;
                const isRecent = (Date.now() - new Date(notification.timestamp).getTime()) < 1000;

                return isSameMessage && isSameType && isRecent;
            });

            if (!isDuplicate) {
                state.notifications.unshift(newNotification); // Добавляем в начало

                // Ограничиваем количество уведомлений до 50
                if (state.notifications.length > 50) {
                    state.notifications = state.notifications.slice(0, 50);
                }
            }
        },

        // Удаление уведомления
        removeNotification: (state, action) => {
            state.notifications = state.notifications.filter(
                notification => notification.id !== action.payload
            );
        },

        // Очистка всех уведомлений
        clearNotifications: (state) => {
            state.notifications = [];
        },

        // Обновление настроек
        updatePreferences: (state, action) => {
            state.preferences = {
                ...state.preferences,
                ...action.payload
            };
        },

        // Обновление заказа в списке (для реалтайм обновлений)
        updateOrderInList: (state, action) => {
            const { orderId, updates } = action.payload;

            // Обновляем в списке моих заказов
            const myOrderIndex = state.myOrders.data.findIndex(order => order.id === orderId);
            if (myOrderIndex !== -1) {
                state.myOrders.data[myOrderIndex] = {
                    ...state.myOrders.data[myOrderIndex],
                    ...updates
                };
            }

            // Обновляем в активных заказах персонала
            const activeOrderIndex = state.staffOrders.activeOrders.data.findIndex(order => order.id === orderId);
            if (activeOrderIndex !== -1) {
                state.staffOrders.activeOrders.data[activeOrderIndex] = {
                    ...state.staffOrders.activeOrders.data[activeOrderIndex],
                    ...updates
                };
            }

            // Обновляем в исторических заказах персонала
            const historyOrderIndex = state.staffOrders.historyOrders.data.findIndex(order => order.id === orderId);
            if (historyOrderIndex !== -1) {
                state.staffOrders.historyOrders.data[historyOrderIndex] = {
                    ...state.staffOrders.historyOrders.data[historyOrderIndex],
                    ...updates
                };
            }

            // Обновляем в деталях заказа, если он загружен
            if (state.orderDetails.data && state.orderDetails.data.id === orderId) {
                state.orderDetails.data = {
                    ...state.orderDetails.data,
                    ...updates
                };
            }
        },

        // Удаление заказа из списка
        removeOrderFromList: (state, action) => {
            const orderId = action.payload;

            // Удаляем из списка моих заказов
            state.myOrders.data = state.myOrders.data.filter(order => order.id !== orderId);
            state.myOrders.total = Math.max(0, state.myOrders.total - 1);

            // Удаляем из активных заказов персонала
            const wasInActive = state.staffOrders.activeOrders.data.some(order => order.id === orderId);
            if (wasInActive) {
                state.staffOrders.activeOrders.data = state.staffOrders.activeOrders.data.filter(order => order.id !== orderId);
                state.staffOrders.activeOrders.total = Math.max(0, state.staffOrders.activeOrders.total - 1);
            }

            // Удаляем из исторических заказов персонала
            const wasInHistory = state.staffOrders.historyOrders.data.some(order => order.id === orderId);
            if (wasInHistory) {
                state.staffOrders.historyOrders.data = state.staffOrders.historyOrders.data.filter(order => order.id !== orderId);
                state.staffOrders.historyOrders.total = Math.max(0, state.staffOrders.historyOrders.total - 1);
            }

            // Очищаем детали заказа, если он был загружен
            if (state.orderDetails.data && state.orderDetails.data.id === orderId) {
                state.orderDetails.data = null;
            }
        },

        // Управление локальными действиями сотрудников
        setLocalOrderAction: (state, action) => {
            const { orderId, action: orderAction, value } = action.payload;
            if (!state.localOrderActions[orderId]) {
                state.localOrderActions[orderId] = {
                    taken: false,
                    completed: false,
                    released: false,
                    timestamp: Date.now()
                };
            }
            state.localOrderActions[orderId][orderAction] = value;
            state.localOrderActions[orderId].timestamp = Date.now();
        },

        clearLocalOrderAction: (state, action) => {
            const { orderId } = action.payload;
            delete state.localOrderActions[orderId];
        },

        clearAllLocalOrderActions: (state) => {
            state.localOrderActions = {};
        }
    },
    extraReducers: (builder) => {
        builder
            // ===== ПОЛУЧЕНИЕ МОИХ ЗАКАЗОВ =====
            .addCase(fetchMyOrders.pending, (state) => {
                state.myOrders.loading = true;
                state.myOrders.error = null;
            })
            .addCase(fetchMyOrders.fulfilled, (state, action) => {
                state.myOrders.loading = false;
                const { data, fromCache } = action.payload;

                if (!fromCache) {
                    state.myOrders.data = data.data || [];
                    state.myOrders.total = data.total || 0;
                    state.myOrders.page = data.page || 1;
                    state.myOrders.pages = data.pages || 1;
                    state.myOrders.hasMore = data.page < data.pages;
                    state.myOrders.lastFetchTime = Date.now();
                }
            })
            .addCase(fetchMyOrders.rejected, (state, action) => {
                state.myOrders.loading = false;
                state.myOrders.error = action.payload;
            })

            // ===== ПОЛУЧЕНИЕ ЗАКАЗОВ ПЕРСОНАЛА =====
            .addCase(fetchStaffOrders.pending, (state) => {
                state.staffOrders.loading = true;
                state.staffOrders.error = null;
            })
            // В файле orderSlice.js, в extraReducers, секция fetchStaffOrders.fulfilled

            .addCase(fetchStaffOrders.fulfilled, (state, action) => {
                state.staffOrders.loading = false;
                const { data, fromCache, filters, isHistory, isWaitingStock } = action.payload;

                if (!fromCache) {
                    // Проверяем, что data.data является массивом
                    const ordersData = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

                    // Определяем, в какое хранилище сохранять данные
                    const targetStorage = isHistory
                        ? state.staffOrders.historyOrders
                        : (isWaitingStock ? state.staffOrders.waitingStockOrders : state.staffOrders.activeOrders);

                    const newPage = data.pagination?.page || data.page || 1;

                    // КРИТИЧНО: Проверяем, загружается ли это первая страница или подгрузка
                    const isFirstPage = newPage === 1;

                    // Сохраняем локальные изменения assignedToId при обновлении данных
                    const updatedOrdersData = ordersData.map(newOrder => {
                        const existingOrder = targetStorage.data.find(o => o.id === newOrder.id);

                        // Если заказ был локально взят в работу и новые данные показывают что он не назначен,
                        // сохраняем локальное назначение
                        if (existingOrder && state.localOrderActions[newOrder.id]?.taken && !newOrder.assignedToId) {
                            return {
                                ...newOrder,
                                assignedToId: existingOrder.assignedToId,
                                assignedTo: existingOrder.assignedTo
                            };
                        }

                        return newOrder;
                    });

                    // КРИТИЧНО: Логика объединения или замены данных
                    if (isFirstPage) {
                        // Если это первая страница - ЗАМЕНЯЕМ данные (обновление или смена фильтра)
                        targetStorage.data = updatedOrdersData;
                    } else {
                        // Если это не первая страница - ДОБАВЛЯЕМ к существующим (пагинация)
                        // Объединяем по ID, чтобы избежать дублей
                        const existingIds = new Set(targetStorage.data.map(o => o.id));
                        const newOrders = updatedOrdersData.filter(o => !existingIds.has(o.id));
                        targetStorage.data = [...targetStorage.data, ...newOrders];
                    }

                    targetStorage.total = data.pagination?.total || data.total || 0;
                    targetStorage.page = newPage;
                    targetStorage.pages = data.pagination?.pages || data.pages || 1;
                    targetStorage.hasMore = newPage < (data.pagination?.pages || data.pages || 1);
                    targetStorage.lastFetchTime = Date.now();

                    // Обновляем счётчик WAITING_STOCK из ответа сервера
                    const waitingStockCount = data.waitingStockCount || data.pagination?.waitingStockCount;
                    if (waitingStockCount !== undefined) {
                        state.orderCounts.waitingStockCount = waitingStockCount;
                        state.orderCounts.lastFetchTime = Date.now();
                    }

                    if (filters) {
                        // ВАЖНО: Если в новых фильтрах нет status, явно очищаем его
                        state.staffOrders.filters = {
                            ...state.staffOrders.filters,
                            ...filters,
                            // Если status не передан в новых фильтрах, явно устанавливаем null
                            status: filters.status !== undefined ? filters.status : null
                        };
                    }
                }
            })
            .addCase(fetchStaffOrders.rejected, (state, action) => {
                state.staffOrders.loading = false;
                state.staffOrders.error = action.payload;
            })

            // ===== ПОЛУЧЕНИЕ СЧЕТЧИКОВ ЗАКАЗОВ =====
            .addCase(fetchOrderCounts.pending, (state) => {
                state.orderCounts.loading = true;
                state.orderCounts.error = null;
            })
            .addCase(fetchOrderCounts.fulfilled, (state, action) => {
                state.orderCounts.loading = false;
                state.orderCounts.waitingStockCount = action.payload.waitingStockCount;
                state.orderCounts.total = action.payload.total;
                state.orderCounts.lastFetchTime = Date.now();
                state.orderCounts.error = null;
            })
            .addCase(fetchOrderCounts.rejected, (state, action) => {
                state.orderCounts.loading = false;
                state.orderCounts.error = action.payload;
            })

            // ===== ПОЛУЧЕНИЕ ДЕТАЛЕЙ ЗАКАЗА =====
            .addCase(fetchOrderDetails.pending, (state) => {
                state.orderDetails.loading = true;
                state.orderDetails.error = null;
            })
            .addCase(fetchOrderDetails.fulfilled, (state, action) => {
                state.orderDetails.loading = false;
                const { data, fromCache, orderId } = action.payload;

                if (!fromCache) {
                    state.orderDetails.data = data;
                    state.orderDetails.lastFetchTime = Date.now();

                    // Кешируем данные заказа
                    const cacheKey = `order_${orderId}`;
                    state.cache[cacheKey] = {
                        data: data,
                        lastFetchTime: Date.now()
                    };
                }
            })
            .addCase(fetchOrderDetails.rejected, (state, action) => {
                state.orderDetails.loading = false;
                state.orderDetails.error = action.payload;
            })

            // ===== ОБНОВЛЕНИЕ СТАТУСА ЗАКАЗА =====
            .addCase(updateOrderStatus.pending, (state, action) => {
                const orderId = action.meta.arg.orderId;
                state.operations.updating = addToArray(state.operations.updating, orderId);
                state.error = null;
            })
            .addCase(updateOrderStatus.fulfilled, (state, action) => {
                const { orderId, statusData, updatedOrder } = action.payload;
                state.operations.updating = removeFromArray(state.operations.updating, orderId);

                // Добавляем уведомление об успешном обновлении
                state.notifications.unshift({
                    id: `status_update_${Date.now()}`,
                    type: 'success',
                    message: `Статус заказа успешно изменен на "${getStatusLabel(statusData.status)}"`,
                    timestamp: new Date().toISOString(),
                    orderId: orderId,
                    autoHide: true,
                    duration: 3000
                });

                // Очищаем кеш для обновления данных
                state.myOrders.lastFetchTime = null;
                state.staffOrders.lastFetchTime = null;

                const cacheKey = `order_${orderId}`;
                if (state.cache[cacheKey]) {
                    state.cache[cacheKey].lastFetchTime = null;
                }
            })
            .addCase(updateOrderStatus.rejected, (state, action) => {
                const orderId = action.meta.arg.orderId;
                state.operations.updating = removeFromArray(state.operations.updating, orderId);
                state.error = action.payload;

                // Добавляем уведомление об ошибке
                state.notifications.unshift({
                    id: `status_error_${Date.now()}`,
                    type: 'error',
                    message: `Ошибка при обновлении статуса: ${action.payload}`,
                    timestamp: new Date().toISOString(),
                    orderId: orderId,
                    autoHide: true,
                    duration: 5000
                });
            })

            // ===== НАЗНАЧЕНИЕ ЗАКАЗА =====
            .addCase(assignOrder.pending, (state, action) => {
                const orderId = action.meta.arg.orderId;
                state.operations.assigning = addToArray(state.operations.assigning, orderId);
                state.error = null;
            })
            .addCase(assignOrder.fulfilled, (state, action) => {
                const { orderId, assignmentData } = action.payload;
                state.operations.assigning = removeFromArray(state.operations.assigning, orderId);

                // Добавляем уведомление
                const message = assignmentData.assignedToId
                    ? 'Заказ успешно назначен сотруднику'
                    : 'Назначение с заказа снято';

                state.notifications.unshift({
                    id: `assign_${Date.now()}`,
                    type: 'success',
                    message: message,
                    timestamp: new Date().toISOString(),
                    orderId: orderId,
                    autoHide: true,
                    duration: 3000
                });

                // Очищаем кеш
                state.staffOrders.lastFetchTime = null;
                const cacheKey = `order_${orderId}`;
                if (state.cache[cacheKey]) {
                    state.cache[cacheKey].lastFetchTime = null;
                }
            })
            .addCase(assignOrder.rejected, (state, action) => {
                const orderId = action.meta.arg.orderId;
                state.operations.assigning = removeFromArray(state.operations.assigning, orderId);
                state.error = action.payload;

                state.notifications.unshift({
                    id: `assign_error_${Date.now()}`,
                    type: 'error',
                    message: `Ошибка при назначении заказа: ${action.payload}`,
                    timestamp: new Date().toISOString(),
                    orderId: orderId,
                    autoHide: true,
                    duration: 5000
                });
            })

            // ===== ВЗЯТИЕ ЗАКАЗА В РАБОТУ =====
            .addCase(takeOrder.pending, (state, action) => {
                const orderId = action.meta.arg.orderId;
                state.operations.taking = addToArray(state.operations.taking, orderId);
                state.error = null;
            })
            .addCase(takeOrder.fulfilled, (state, action) => {
                const { orderId, reason } = action.payload;
                state.operations.taking = removeFromArray(state.operations.taking, orderId);

                state.notifications.unshift({
                    id: `take_${Date.now()}`,
                    type: 'success',
                    message: 'Заказ успешно взят в работу',
                    timestamp: new Date().toISOString(),
                    orderId: orderId,
                    autoHide: true,
                    duration: 3000
                });

                // Очищаем кеш
                state.staffOrders.lastFetchTime = null;
                const cacheKey = `order_${orderId}`;
                if (state.cache[cacheKey]) {
                    state.cache[cacheKey].lastFetchTime = null;
                }
            })
            .addCase(takeOrder.rejected, (state, action) => {
                const orderId = action.meta.arg.orderId;
                state.operations.taking = removeFromArray(state.operations.taking, orderId);
                state.error = action.payload;

                state.notifications.unshift({
                    id: `take_error_${Date.now()}`,
                    type: 'error',
                    message: `Ошибка при взятии заказа в работу: ${action.payload}`,
                    timestamp: new Date().toISOString(),
                    orderId: orderId,
                    autoHide: true,
                    duration: 5000
                });
            })

            // ===== ЗАВЕРШЕНИЕ ЭТАПА ЗАКАЗА =====
            .addCase(completeOrderStage.pending, (state, action) => {
                const orderId = action.meta.arg.orderId;
                state.operations.updating = addToArray(state.operations.updating, orderId);
                state.error = null;
            })
            .addCase(completeOrderStage.fulfilled, (state, action) => {
                const { orderId, comment, result } = action.payload;
                state.operations.updating = removeFromArray(state.operations.updating, orderId);

                state.notifications.unshift({
                    id: `complete_stage_${Date.now()}`,
                    type: 'success',
                    message: 'Этап заказа успешно завершен',
                    timestamp: new Date().toISOString(),
                    orderId: orderId,
                    autoHide: true,
                    duration: 3000
                });

                // Очищаем кеш для обновления данных
                state.staffOrders.lastFetchTime = null;
                const cacheKey = `order_${orderId}`;
                if (state.cache[cacheKey]) {
                    state.cache[cacheKey].lastFetchTime = null;
                }
            })
            .addCase(completeOrderStage.rejected, (state, action) => {
                const orderId = action.meta.arg.orderId;
                state.operations.updating = removeFromArray(state.operations.updating, orderId);
                state.error = action.payload;

                state.notifications.unshift({
                    id: `complete_stage_error_${Date.now()}`,
                    type: 'error',
                    message: `Ошибка при завершении этапа: ${action.payload}`,
                    timestamp: new Date().toISOString(),
                    orderId: orderId,
                    autoHide: true,
                    duration: 5000
                });
            })

            // ===== ОТМЕНА ЗАКАЗА =====
            .addCase(cancelOrder.pending, (state, action) => {
                const orderId = action.meta.arg.orderId;
                state.operations.cancelling = addToArray(state.operations.cancelling, orderId);
                state.error = null;
            })
            .addCase(cancelOrder.fulfilled, (state, action) => {
                const { orderId, isMyOrder } = action.payload;
                state.operations.cancelling = removeFromArray(state.operations.cancelling, orderId);

                state.notifications.unshift({
                    id: `cancel_${Date.now()}`,
                    type: 'success',
                    message: 'Заказ успешно отменен',
                    timestamp: new Date().toISOString(),
                    orderId: orderId,
                    autoHide: true,
                    duration: 3000
                });

                // Очищаем кеш
                if (isMyOrder) {
                    state.myOrders.lastFetchTime = null;
                } else {
                    state.staffOrders.lastFetchTime = null;
                }

                const cacheKey = `order_${orderId}`;
                if (state.cache[cacheKey]) {
                    state.cache[cacheKey].lastFetchTime = null;
                }
            })
            .addCase(cancelOrder.rejected, (state, action) => {
                const orderId = action.meta.arg.orderId;
                state.operations.cancelling = removeFromArray(state.operations.cancelling, orderId);
                state.error = action.payload;

                state.notifications.unshift({
                    id: `cancel_error_${Date.now()}`,
                    type: 'error',
                    message: `Ошибка при отмене заказа: ${action.payload}`,
                    timestamp: new Date().toISOString(),
                    orderId: orderId,
                    autoHide: true,
                    duration: 5000
                });
            })

            // ===== СОЗДАНИЕ ЗАКАЗА ДЛЯ КЛИЕНТА =====
            .addCase(createOrderForClient.pending, (state) => {
                state.operations.creating = true;
                state.error = null;
            })
            .addCase(createOrderForClient.fulfilled, (state, action) => {
                state.operations.creating = false;
                const { createdOrder } = action.payload;

                state.notifications.unshift({
                    id: `create_${Date.now()}`,
                    type: 'success',
                    message: `Заказ ${createdOrder.orderNumber} успешно создан`,
                    timestamp: new Date().toISOString(),
                    orderId: createdOrder.id,
                    autoHide: true,
                    duration: 4000
                });

                // Очищаем кеш для обновления списков
                state.staffOrders.lastFetchTime = null;
            })
            .addCase(createOrderForClient.rejected, (state, action) => {
                state.operations.creating = false;
                state.error = action.payload;

                state.notifications.unshift({
                    id: `create_error_${Date.now()}`,
                    type: 'error',
                    message: `Ошибка при создании заказа: ${action.payload}`,
                    timestamp: new Date().toISOString(),
                    autoHide: true,
                    duration: 5000
                });
            })

            // ===== МАССОВЫЕ ОПЕРАЦИИ =====
            .addCase(bulkUpdateOrders.pending, (state) => {
                state.operations.bulkOperating = true;
                state.error = null;
            })
            .addCase(bulkUpdateOrders.fulfilled, (state, action) => {
                state.operations.bulkOperating = false;
                const { result } = action.payload;

                const message = result.errorCount > 0
                    ? `Обновлено ${result.successCount} из ${result.successCount + result.errorCount} заказов`
                    : `Успешно обновлено ${result.successCount} заказов`;

                state.notifications.unshift({
                    id: `bulk_${Date.now()}`,
                    type: result.errorCount > 0 ? 'warning' : 'success',
                    message: message,
                    timestamp: new Date().toISOString(),
                    autoHide: true,
                    duration: 4000
                });

                // Очищаем кеш
                state.staffOrders.lastFetchTime = null;
                state.myOrders.lastFetchTime = null;
            })
            .addCase(bulkUpdateOrders.rejected, (state, action) => {
                state.operations.bulkOperating = false;
                state.error = action.payload;

                state.notifications.unshift({
                    id: `bulk_error_${Date.now()}`,
                    type: 'error',
                    message: `Ошибка при массовом обновлении: ${action.payload}`,
                    timestamp: new Date().toISOString(),
                    autoHide: true,
                    duration: 5000
                });
            })

            // ===== СТАТИСТИКА =====
            .addCase(fetchOrdersStats.pending, (state) => {
                state.stats.loading = true;
                state.stats.error = null;
            })
            .addCase(fetchOrdersStats.fulfilled, (state, action) => {
                state.stats.loading = false;
                const { data, fromCache } = action.payload;

                if (!fromCache) {
                    state.stats.data = data;
                    state.stats.lastFetchTime = Date.now();
                }
            })
            .addCase(fetchOrdersStats.rejected, (state, action) => {
                state.stats.loading = false;
                state.stats.error = action.payload;
            })

            // ===== ЭКСПОРТ =====
            .addCase(exportOrders.pending, (state) => {
                state.operations.exporting = true;
                state.error = null;
            })
            .addCase(exportOrders.fulfilled, (state, action) => {
                state.operations.exporting = false;
                const { filename } = action.payload;

                state.notifications.unshift({
                    id: `export_${Date.now()}`,
                    type: 'success',
                    message: `Файл ${filename} успешно скачан`,
                    timestamp: new Date().toISOString(),
                    autoHide: true,
                    duration: 4000
                });
            })
            .addCase(exportOrders.rejected, (state, action) => {
                state.operations.exporting = false;
                state.error = action.payload;

                state.notifications.unshift({
                    id: `export_error_${Date.now()}`,
                    type: 'error',
                    message: `Ошибка при экспорте: ${action.payload}`,
                    timestamp: new Date().toISOString(),
                    autoHide: true,
                    duration: 5000
                });
            })

            // ===== ПЕРЕХВАТ ЗАКАЗОВ =====
            .addCase(pickupOrder.pending, (state, action) => {
                const orderId = action.meta.arg.orderId;
                state.operations.pickingUp = addToArray(state.operations.pickingUp, orderId);
                state.error = null;
            })
            .addCase(pickupOrder.fulfilled, (state, action) => {
                const { orderId, pickupData } = action.payload;
                state.operations.pickingUp = removeFromArray(state.operations.pickingUp, orderId);

                state.notifications.unshift({
                    id: `pickup_${Date.now()}`,
                    type: 'success',
                    message: 'Заказ успешно принят для обработки',
                    timestamp: new Date().toISOString(),
                    orderId: orderId,
                    autoHide: true,
                    duration: 3000
                });

                // Очищаем кеш
                state.staffOrders.lastFetchTime = null;
                state.availableOrders.lastFetchTime = null;
                const cacheKey = `order_${orderId}`;
                if (state.cache[cacheKey]) {
                    state.cache[cacheKey].lastFetchTime = null;
                }
            })
            .addCase(pickupOrder.rejected, (state, action) => {
                const orderId = action.meta.arg.orderId;
                state.operations.pickingUp = removeFromArray(state.operations.pickingUp, orderId);
                state.error = action.payload;

                state.notifications.unshift({
                    id: `pickup_error_${Date.now()}`,
                    type: 'error',
                    message: `Ошибка при принятии заказа: ${action.payload}`,
                    timestamp: new Date().toISOString(),
                    orderId: orderId,
                    autoHide: true,
                    duration: 5000
                });
            })

            // ===== ДОСТУПНЫЕ ЗАКАЗЫ =====
            .addCase(fetchAvailableOrdersForPickup.pending, (state) => {
                state.availableOrders.loading = true;
                state.availableOrders.error = null;
            })
            .addCase(fetchAvailableOrdersForPickup.fulfilled, (state, action) => {
                state.availableOrders.loading = false;
                const { data, fromCache } = action.payload;

                if (!fromCache) {
                    state.availableOrders.data = data || [];
                    state.availableOrders.lastFetchTime = Date.now();
                }
            })
            .addCase(fetchAvailableOrdersForPickup.rejected, (state, action) => {
                state.availableOrders.loading = false;
                state.availableOrders.error = action.payload;
            })

        // ===== СКАЧИВАНИЕ НАКЛАДНОЙ - УБРАНО =====
        // Обработка скачивания накладной перенесена в UI компоненты
    },
});

export const {
    clearError,
    clearSpecificError,
    clearCache,
    setStaffOrdersFilters,
    resetStaffOrdersFilters,
    clearStaffOrdersData,
    addNotification,
    removeNotification,
    clearNotifications,
    updatePreferences,
    updateOrderInList,
    removeOrderFromList,
    setLocalOrderAction,
    clearLocalOrderAction,
    clearAllLocalOrderActions
} = orderSlice.actions;

export default orderSlice.reducer;