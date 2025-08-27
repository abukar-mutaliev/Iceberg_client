import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationApi } from '../api/notificationApi';

const initialState = {
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    lastFetchTime: null,
    hasNextPage: true,
    currentPage: 1,
    // НОВЫЕ ПОЛЯ для отслеживания операций
    bulkOperationLoading: false,
    createNotificationLoading: false,
};

const CACHE_EXPIRY_TIME = 2 * 60 * 1000;

const isCacheValid = (lastFetchTime) => {
    return lastFetchTime && Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
};

const handleError = (error) => {
    if (error.code === 'ECONNABORTED') {
        return 'Превышено время ожидания. Проверьте подключение к сети.';
    }

    if (!error.response) {
        return 'Ошибка сети. Проверьте подключение.';
    }

    return error.response?.data?.message || 'Произошла ошибка';
};

// Вспомогательная функция для нормализации уведомлений
const normalizeNotification = (notification) => {
    // Парсим data поле если оно в виде строки
    if (notification.data && typeof notification.data === 'string') {
        try {
            notification.data = JSON.parse(notification.data);
        } catch (e) {
            console.warn('Failed to parse notification data:', notification.data);
            notification.data = null;
        }
    }

    // Убеждаемся, что навигационные поля правильного типа
    if (notification.stopId) {
        notification.stopId = parseInt(notification.stopId);
    }
    if (notification.orderId) {
        notification.orderId = parseInt(notification.orderId);
    }
    if (notification.productId) {
        notification.productId = parseInt(notification.productId);
    }

    return notification;
};

export const fetchNotifications = createAsyncThunk(
    'notification/fetchNotifications',
    async (params = {}, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const { page = 1, limit = 20, refresh = false, includeData = true } = params;

            if (
                page === 1 &&
                !refresh &&
                isCacheValid(state.notification.lastFetchTime) &&
                state.notification.notifications.length > 0
            ) {
                return {
                    data: state.notification.notifications,
                    fromCache: true,
                    hasNextPage: state.notification.hasNextPage
                };
            }

            const response = await notificationApi.getAllNotifications({
                page,
                limit,
                includeData, // ВАЖНО: Включаем связанные данные
                ...params
            });

            let notifications = [];
            let hasNextPage = false;

            if (response?.data?.status === 'success' && Array.isArray(response.data.data)) {
                // Нормализуем каждое уведомление
                notifications = response.data.data.map(normalizeNotification);
                hasNextPage = response.data.pagination ?
                    (response.data.pagination.page < response.data.pagination.pages) :
                    (notifications.length === limit);
            } else if (Array.isArray(response?.data)) {
                notifications = response.data.map(normalizeNotification);
                hasNextPage = notifications.length === limit;
            } else {
                console.error('Unexpected API response structure:', response);
                throw new Error('Получена некорректная структура данных от сервера');
            }

            // Подсчитываем непрочитанные уведомления
            const unreadCount = notifications.filter(n => !n.isRead).length;

            console.log('✅ Normalized notifications:', {
                count: notifications.length,
                withStopId: notifications.filter(n => n.stopId).length,
                withOrderId: notifications.filter(n => n.orderId).length,
                withData: notifications.filter(n => n.data).length,
                unreadCount
            });

            return {
                data: notifications,
                fromCache: false,
                hasNextPage,
                page,
                unreadCount
            };
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const fetchUnreadCount = createAsyncThunk(
    'notification/fetchUnreadCount',
    async (_, { rejectWithValue }) => {
        try {
            const response = await notificationApi.getUnreadCount();

            const count = response?.data?.status === 'success' ?
                response.data.data?.count :
                response.data.count;

            return count || 0;
        } catch (error) {
            console.error('Error fetching unread count:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

// НОВЫЙ: Получить уведомления об остановке
export const fetchStopNotifications = createAsyncThunk(
    'notification/fetchStopNotifications',
    async (stopId, { rejectWithValue }) => {
        try {
            const response = await notificationApi.getStopNotifications(stopId);

            let notifications = [];
            if (response?.data?.status === 'success' && Array.isArray(response.data.data)) {
                notifications = response.data.data.map(normalizeNotification);
            }

            return {
                stopId,
                notifications
            };
        } catch (error) {
            console.error('Error fetching stop notifications:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

// НОВЫЙ: Получить уведомления о заказе
export const fetchOrderNotifications = createAsyncThunk(
    'notification/fetchOrderNotifications',
    async (orderId, { rejectWithValue }) => {
        try {
            const response = await notificationApi.getOrderNotifications(orderId);

            let notifications = [];
            if (response?.data?.status === 'success' && Array.isArray(response.data.data)) {
                notifications = response.data.data.map(normalizeNotification);
            }

            return {
                orderId,
                notifications
            };
        } catch (error) {
            console.error('Error fetching order notifications:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

// НОВЫЙ: Массовые операции
export const performBulkOperation = createAsyncThunk(
    'notification/performBulkOperation',
    async ({ notificationIds, action }, { rejectWithValue }) => {
        try {
            const response = await notificationApi.bulkOperations({
                notificationIds,
                action
            });

            return {
                notificationIds,
                action,
                affectedCount: response.data?.data?.affectedCount || notificationIds.length
            };
        } catch (error) {
            console.error('Error performing bulk operation:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const markNotificationAsRead = createAsyncThunk(
    'notification/markAsRead',
    async (notificationId, { rejectWithValue }) => {
        try {
            await notificationApi.markAsRead(notificationId);
            return notificationId;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const markAllNotificationsAsRead = createAsyncThunk(
    'notification/markAllAsRead',
    async (_, { rejectWithValue }) => {
        try {
            await notificationApi.markAllAsRead();
            return true;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const deleteNotification = createAsyncThunk(
    'notification/deleteNotification',
    async (notificationId, { rejectWithValue }) => {
        try {
            await notificationApi.deleteNotification(notificationId);
            return notificationId;
        } catch (error) {
            console.error('Error deleting notification:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

export const deleteAllReadNotifications = createAsyncThunk(
    'notification/deleteAllRead',
    async (_, { rejectWithValue }) => {
        try {
            await notificationApi.deleteAllRead();
            return true;
        } catch (error) {
            console.error('Error deleting all read notifications:', error);
            return rejectWithValue(handleError(error));
        }
    }
);

const notificationSlice = createSlice({
    name: 'notification',
    initialState,
    reducers: {
        clearNotificationError: (state) => {
            state.error = null;
        },
        clearNotificationCache: (state) => {
            state.lastFetchTime = null;
            state.notifications = [];
            state.currentPage = 1;
            state.hasNextPage = true;
        },
        addNotification: (state, action) => {
            // Нормализуем новое уведомление
            const notification = normalizeNotification(action.payload);
            state.notifications.unshift(notification);
            state.unreadCount += 1;
        },
        updateUnreadCount: (state, action) => {
            state.unreadCount = action.payload;
        },
        markAsReadLocally: (state, action) => {
            const notificationId = action.payload;
            const notification = state.notifications.find(n => n.id === notificationId);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },
        // НОВЫЙ: Обновить навигационные данные уведомления
        updateNotificationData: (state, action) => {
            const { notificationId, data } = action.payload;
            const notification = state.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.data = { ...notification.data, ...data };
            }
        }
    },
    extraReducers: (builder) => {
        builder
            // Существующие обработчики
            .addCase(fetchNotifications.pending, (state, action) => {
                state.loading = true;
                state.error = null;
                if (action.meta.arg?.page === 1 || action.meta.arg?.refresh) {
                    state.notifications = [];
                }
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.loading = false;
                const { data, fromCache, hasNextPage, page, unreadCount } = action.payload;

                if (!fromCache) {
                    let notifications = [];

                    if (Array.isArray(data)) {
                        notifications = data;
                    } else {
                        notifications = [];
                    }

                    if (page === 1 || action.meta.arg?.refresh) {
                        state.notifications = notifications;
                    } else {
                        state.notifications = [...state.notifications, ...notifications];
                    }

                    if (typeof unreadCount === 'number') {
                        state.unreadCount = unreadCount;
                    } else {
                        const localUnreadCount = state.notifications.filter(n => !n.isRead).length;
                        state.unreadCount = localUnreadCount;
                    }

                    state.lastFetchTime = Date.now();
                    state.hasNextPage = hasNextPage;
                    state.currentPage = page || 1;
                }
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Новые обработчики для массовых операций
            .addCase(performBulkOperation.pending, (state) => {
                state.bulkOperationLoading = true;
            })
            .addCase(performBulkOperation.fulfilled, (state, action) => {
                state.bulkOperationLoading = false;
                const { notificationIds, action: operationAction } = action.payload;

                switch (operationAction) {
                    case 'markAsRead':
                        state.notifications.forEach(notification => {
                            if (notificationIds.includes(notification.id) && !notification.isRead) {
                                notification.isRead = true;
                                state.unreadCount = Math.max(0, state.unreadCount - 1);
                            }
                        });
                        break;

                    case 'markAsUnread':
                        state.notifications.forEach(notification => {
                            if (notificationIds.includes(notification.id) && notification.isRead) {
                                notification.isRead = false;
                                state.unreadCount += 1;
                            }
                        });
                        break;

                    case 'delete':
                        const initialLength = state.notifications.length;
                        state.notifications = state.notifications.filter(notification => {
                            if (notificationIds.includes(notification.id)) {
                                if (!notification.isRead) {
                                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                                }
                                return false;
                            }
                            return true;
                        });
                        break;
                }
            })
            .addCase(performBulkOperation.rejected, (state, action) => {
                state.bulkOperationLoading = false;
                state.error = action.payload;
            })

            // Обработчики для уведомлений об остановках
            .addCase(fetchStopNotifications.fulfilled, (state, action) => {
                // Можно добавить специальную логику для кэширования уведомлений об остановке
                console.log('✅ Stop notifications loaded:', action.payload);
            })

            // Обработчики для уведомлений о заказах
            .addCase(fetchOrderNotifications.fulfilled, (state, action) => {
                // Можно добавить специальную логику для кэширования уведомлений о заказе
                console.log('✅ Order notifications loaded:', action.payload);
            })

            // Остальные существующие обработчики
            .addCase(fetchUnreadCount.fulfilled, (state, action) => {
                state.unreadCount = action.payload;
            })

            .addCase(markNotificationAsRead.fulfilled, (state, action) => {
                const notificationId = action.payload;
                const notification = state.notifications.find(n => n.id === notificationId);
                if (notification && !notification.isRead) {
                    notification.isRead = true;
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            })

            .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
                state.notifications.forEach(notification => {
                    notification.isRead = true;
                });
                state.unreadCount = 0;
            })

            .addCase(deleteNotification.fulfilled, (state, action) => {
                const notificationId = action.payload;
                const notificationIndex = state.notifications.findIndex(n => n.id === notificationId);

                if (notificationIndex !== -1) {
                    const notification = state.notifications[notificationIndex];
                    if (!notification.isRead) {
                        state.unreadCount = Math.max(0, state.unreadCount - 1);
                    }
                    state.notifications.splice(notificationIndex, 1);
                }
            })

            .addCase(deleteAllReadNotifications.fulfilled, (state) => {
                state.notifications = state.notifications.filter(n => !n.isRead);
            });
    },
});

export const {
    clearNotificationError,
    clearNotificationCache,
    addNotification,
    updateUnreadCount,
    markAsReadLocally,
    updateNotificationData
} = notificationSlice.actions;

export default notificationSlice.reducer;