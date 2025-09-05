import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationApi } from '../api/notificationApi';
import { notificationSettingsApi } from '../api/notificationSettingsApi';

const initialState = {
    // Список уведомлений
    notifications: [],
    pagination: {},
    hasNextPage: false,
    currentPage: 1,
    lastFetchTime: null,

    // Настройки уведомлений
    settings: {
        chatMessages: true,
        orderUpdates: true,
        stopNotifications: true,
        promotions: true,
        systemAlerts: true
    },
    unreadCount: 0,
    isLoading: false,
    error: null
};

// Получение количества непрочитанных уведомлений
export const fetchUnreadCount = createAsyncThunk(
    'notification/fetchUnreadCount',
    async (_, { rejectWithValue }) => {
        try {
            const response = await notificationApi.getUnreadCount();
            return response.data?.data?.count || 0;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка загрузки количества уведомлений');
        }
    }
);

// Получение списка уведомлений
export const fetchNotifications = createAsyncThunk(
    'notification/fetchNotifications',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await notificationApi.getAllNotifications(params);
            return {
                notifications: response.data?.data || [],
                pagination: response.data?.pagination || {},
                hasNextPage: response.data?.pagination?.hasNextPage || false,
                currentPage: response.data?.pagination?.currentPage || 1,
            };
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка загрузки уведомлений');
        }
    }
);

// Отметить уведомление как прочитанное
export const markNotificationAsRead = createAsyncThunk(
    'notification/markAsRead',
    async (notificationId, { rejectWithValue }) => {
        try {
            await notificationApi.markAsRead(notificationId);
            return notificationId;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка при отметке уведомления');
        }
    }
);

// Отметить все уведомления как прочитанные
export const markAllNotificationsAsRead = createAsyncThunk(
    'notification/markAllAsRead',
    async (_, { rejectWithValue }) => {
        try {
            await notificationApi.markAllAsRead();
            return true;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка при отметке уведомлений');
        }
    }
);

// Удалить уведомление
export const deleteNotification = createAsyncThunk(
    'notification/delete',
    async (notificationId, { rejectWithValue }) => {
        try {
            await notificationApi.delete(notificationId);
            return notificationId;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка при удалении уведомления');
        }
    }
);

// Удалить все прочитанные уведомления
export const deleteAllReadNotifications = createAsyncThunk(
    'notification/deleteAllRead',
    async (_, { rejectWithValue }) => {
        try {
            await notificationApi.deleteAllRead();
            return true;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка при удалении уведомлений');
        }
    }
);

// Получение настроек уведомлений
export const fetchNotificationSettings = createAsyncThunk(
    'notification/fetchSettings',
    async (_, { rejectWithValue }) => {
        try {
            const settings = await notificationSettingsApi.getSettings();
            return settings;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка загрузки настроек');
        }
    }
);

// Обновление настроек уведомлений
export const updateNotificationSettings = createAsyncThunk(
    'notification/updateSettings',
    async (settings, { rejectWithValue }) => {
        try {
            const updatedSettings = await notificationSettingsApi.updateSettings(settings);
            return updatedSettings;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка обновления настроек');
        }
    }
);

// Сброс настроек к дефолтным
export const resetNotificationSettings = createAsyncThunk(
    'notification/resetSettings',
    async (_, { rejectWithValue }) => {
        try {
            const defaultSettings = await notificationSettingsApi.resetToDefaults();
            return defaultSettings;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка сброса настроек');
        }
    }
);

const notificationSlice = createSlice({
    name: 'notification',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearNotificationError: (state) => {
            state.error = null;
        },
        clearNotificationCache: (state) => {
            state.notifications = [];
            state.pagination = {};
            state.hasNextPage = false;
            state.currentPage = 1;
            state.lastFetchTime = null;
        },
        addNotification: (state, action) => {
            state.notifications.unshift(action.payload);
            state.unreadCount += 1;
        },
        updateUnreadCount: (state, action) => {
            state.unreadCount = action.payload;
        },
        markAsReadLocally: (state, action) => {
            const notification = state.notifications.find(n => n.id === action.payload);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },
        // Локальное обновление настройки (для оптимистичных обновлений)
        updateSettingLocally: (state, action) => {
            const { key, value } = action.payload;
            if (state.settings.hasOwnProperty(key)) {
                state.settings[key] = value;
            }
        }
    },
    extraReducers: (builder) => {
        builder
            // fetchUnreadCount
            .addCase(fetchUnreadCount.pending, (state) => {
                // Не устанавливаем loading для быстрого запроса
            })
            .addCase(fetchUnreadCount.fulfilled, (state, action) => {
                state.unreadCount = action.payload;
                console.log('🔔 Unread count updated:', action.payload);
            })
            .addCase(fetchUnreadCount.rejected, (state, action) => {
                console.error('❌ Failed to load unread count:', action.payload);
            })

            // fetchNotifications
            .addCase(fetchNotifications.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.isLoading = false;
                // Если это первая страница, заменяем уведомления, иначе добавляем
                if (action.payload.currentPage === 1) {
                    state.notifications = action.payload.notifications;
                } else {
                    state.notifications = [...state.notifications, ...action.payload.notifications];
                }
                state.pagination = action.payload.pagination;
                state.hasNextPage = action.payload.hasNextPage;
                state.currentPage = action.payload.currentPage;
                state.lastFetchTime = Date.now();
                console.log('🔔 Notifications loaded:', action.payload.notifications.length);
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
                console.error('❌ Failed to load notifications:', action.payload);
            })

            // markNotificationAsRead
            .addCase(markNotificationAsRead.fulfilled, (state, action) => {
                const notification = state.notifications.find(n => n.id === action.payload);
                if (notification && !notification.isRead) {
                    notification.isRead = true;
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            })

            // markAllNotificationsAsRead
            .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
                state.notifications.forEach(notification => {
                    notification.isRead = true;
                });
                state.unreadCount = 0;
            })

            // deleteNotification
            .addCase(deleteNotification.fulfilled, (state, action) => {
                const index = state.notifications.findIndex(n => n.id === action.payload);
                if (index !== -1) {
                    const wasUnread = !state.notifications[index].isRead;
                    state.notifications.splice(index, 1);
                    if (wasUnread) {
                        state.unreadCount = Math.max(0, state.unreadCount - 1);
                    }
                }
            })

            // deleteAllReadNotifications
            .addCase(deleteAllReadNotifications.fulfilled, (state) => {
                state.notifications = state.notifications.filter(n => !n.isRead);
            })

            // fetchNotificationSettings
            .addCase(fetchNotificationSettings.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchNotificationSettings.fulfilled, (state, action) => {
                state.isLoading = false;
                state.settings = action.payload;
                state.error = null;
                console.log('🔔 Notification settings loaded:', action.payload);
            })
            .addCase(fetchNotificationSettings.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
                console.error('❌ Failed to load notification settings:', action.payload);
            })

            // updateNotificationSettings
            .addCase(updateNotificationSettings.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateNotificationSettings.fulfilled, (state, action) => {
                state.isLoading = false;
                state.settings = action.payload;
                state.error = null;
            })
            .addCase(updateNotificationSettings.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // resetNotificationSettings
            .addCase(resetNotificationSettings.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(resetNotificationSettings.fulfilled, (state, action) => {
                state.isLoading = false;
                state.settings = action.payload;
                state.error = null;
            })
            .addCase(resetNotificationSettings.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Обработка сброса состояния приложения
            .addCase('RESET_APP_STATE', (state) => {
                console.log('🔔 Resetting notification state');
                // Сброс всех полей к начальному состоянию
                Object.assign(state, initialState);
            });
    }
});

export const {
    clearError,
    clearNotificationError,
    clearNotificationCache,
    addNotification,
    updateUnreadCount,
    markAsReadLocally,
    updateSettingLocally
} = notificationSlice.actions;

export const selectNotificationSettings = (state) => state.notificationSettings.settings;
export const selectNotificationLoading = (state) => state.notificationSettings.isLoading;
export const selectNotificationError = (state) => state.notificationSettings.error;

// Экспортируем slice целиком
export { notificationSlice };

export default notificationSlice.reducer;