export { useNotifications, useBadgeSync } from '@entities/notification/hooks/useNotifications';

export {
    default as notificationReducer,
    fetchNotifications,
    fetchUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllReadNotifications,
    clearNotificationError,
    clearNotificationCache,
    addNotification,
    updateUnreadCount,
    markAsReadLocally
} from './model/slice';

export * from './model/selectors';

export * from './api/notificationApi';