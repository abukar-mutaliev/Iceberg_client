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
        data: [],
        total: 0,
        page: 1,
        pages: 1,
        loading: false,
        error: null,
        lastFetchTime: null,
        hasMore: false,
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
            console.error('Ошибка при загрузке моих заказов:', error);
            return rejectWithValue(error.message || 'Ошибка при загрузке заказов');
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

            console.log('fetchStaffOrders: параметры запроса', {
                forceRefresh,
                requestParams,
                cacheValid: isCacheValid(state.order.staffOrders.lastFetchTime),
                lastFetchTime: state.order.staffOrders.lastFetchTime
            });

            if (!forceRefresh && isCacheValid(state.order.staffOrders.lastFetchTime)) {
                console.log('fetchStaffOrders: возвращаем данные из кэша');
                return { data: state.order.staffOrders, fromCache: true };
            }

            console.log('fetchStaffOrders: делаем запрос к серверу');

            // Добавляем timestamp для обхода кэширования
            const requestParamsWithTimestamp = {
                ...requestParams,
                _t: Date.now()
            };

            const response = await OrderApi.getOrders(requestParamsWithTimestamp);

            if (response.status === 'success') {
                return { data: response.data, fromCache: false, filters: requestParams };
            } else {
                throw new Error(response.message || 'Ошибка при загрузке заказов');
            }
        } catch (error) {
            console.error('Ошибка при загрузке заказов персонала:', error);
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
            console.error('Ошибка при загрузке деталей заказа:', error);
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
            console.error('Ошибка при обновлении статуса заказа:', error);
            return rejectWithValue(error.message || 'Ошибка при обновлении статуса');
        }
    }
);

// Завершение этапа заказа (с автоматическим переходом)
export const completeOrderStage = createAsyncThunk(
    'orders/completeOrderStage',
    async ({ orderId, comment }, { rejectWithValue, dispatch }) => {
        try {
            console.log('completeOrderStage: начинаем завершение этапа', { orderId, comment });
            const response = await OrderApi.completeOrderStage(orderId, comment);

            console.log('completeOrderStage: ответ сервера', {
                orderId,
                status: response.status,
                data: response.data
            });

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
            console.error('Ошибка при завершении этапа заказа:', error);
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
            console.error('Ошибка при назначении заказа:', error);
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
            console.error('Ошибка при взятии заказа в работу:', error);
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
            console.error('Ошибка при отмене заказа:', error);
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
            console.error('Ошибка при создании заказа:', error);
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
            console.error('Ошибка при массовом обновлении заказов:', error);
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
            console.error('Ошибка при загрузке статистики заказов:', error);
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
            console.error('Ошибка при экспорте заказов:', error);
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
            console.error('Ошибка при перехвате заказа:', error);
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
            console.error('Ошибка при загрузке доступных заказов:', error);
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

            // Обновляем в списке заказов персонала
            const staffOrderIndex = state.staffOrders.data.findIndex(order => order.id === orderId);
            if (staffOrderIndex !== -1) {
                state.staffOrders.data[staffOrderIndex] = {
                    ...state.staffOrders.data[staffOrderIndex],
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

            // Удаляем из списка заказов персонала
            state.staffOrders.data = state.staffOrders.data.filter(order => order.id !== orderId);
            state.staffOrders.total = Math.max(0, state.staffOrders.total - 1);

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
                console.log('fetchStaffOrders.pending');
                state.staffOrders.loading = true;
                state.staffOrders.error = null;
            })
            .addCase(fetchStaffOrders.fulfilled, (state, action) => {
                state.staffOrders.loading = false;
                const { data, fromCache, filters } = action.payload;

                console.log('fetchStaffOrders.fulfilled:', {
                    fromCache,
                    dataLength: data?.data?.length || 0,
                    total: data?.total || 0,
                    page: data?.page || 1,
                    pages: data?.pages || 1,
                    filters,
                    data: data,
                    dataKeys: data ? Object.keys(data) : []
                });

                if (!fromCache) {
                    state.staffOrders.data = data.data || [];
                    state.staffOrders.total = data.total || 0;
                    state.staffOrders.page = data.page || 1;
                    state.staffOrders.pages = data.pages || 1;
                    state.staffOrders.hasMore = data.page < data.pages;
                    state.staffOrders.lastFetchTime = Date.now();

                    if (filters) {
                        state.staffOrders.filters = {
                            ...state.staffOrders.filters,
                            ...filters
                        };
                    }
                }
            })
            .addCase(fetchStaffOrders.rejected, (state, action) => {
                console.log('fetchStaffOrders.rejected:', action.payload);
                state.staffOrders.loading = false;
                state.staffOrders.error = action.payload;
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