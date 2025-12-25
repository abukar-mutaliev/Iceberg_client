import { createSelector } from '@reduxjs/toolkit';

// Константы для предотвращения создания новых ссылок
const EMPTY_ARRAY = [];

// Базовые селекторы
export const selectNotifications = (state) => {
    const notifications = state.notification?.notifications || EMPTY_ARRAY;

    // Временная отладка
    if (__DEV__) {
        console.log('🔍 selectNotifications debug:', {
            stateNotification: state.notification,
            notifications: notifications,
            length: notifications.length,
            type: typeof notifications,
            isArray: Array.isArray(notifications),
            // НОВОЕ: Отладка навигационных данных
            withStopId: notifications.filter(n => n.stopId).length,
            withOrderId: notifications.filter(n => n.orderId).length,
            withProductId: notifications.filter(n => n.productId).length,
            withData: notifications.filter(n => n.data).length
        });
    }

    return notifications;
};

export const selectNotificationLoading = (state) => state.notification?.loading || false;
export const selectNotificationError = (state) => state.notification?.error || null;
export const selectUnreadCount = (state) => state.notification?.unreadCount || 0;
export const selectHasNextPage = (state) => state.notification?.hasNextPage || false;
export const selectCurrentPage = (state) => state.notification?.currentPage || 1;

// НОВЫЕ селекторы для массовых операций
export const selectBulkOperationLoading = (state) => state.notification?.bulkOperationLoading || false;
export const selectCreateNotificationLoading = (state) => state.notification?.createNotificationLoading || false;

// Производные селекторы
export const selectUnreadNotifications = createSelector(
    [selectNotifications],
    (notifications) => {
        return notifications.filter(notification => !notification.isRead);
    }
);

export const selectReadNotifications = createSelector(
    [selectNotifications],
    (notifications) => {
        return notifications.filter(notification => notification.isRead);
    }
);

export const selectNotificationsByType = createSelector(
    [selectNotifications, (_, type) => type],
    (notifications, type) => {
        if (!type) return notifications;
        return notifications.filter(notification => notification.type === type);
    }
);

export const selectSystemNotifications = createSelector(
    [selectNotifications],
    (notifications) => {
        return notifications.filter(notification => notification.type === 'SYSTEM');
    }
);

export const selectOrderNotifications = createSelector(
    [selectNotifications],
    (notifications) => {
        return notifications.filter(notification => notification.type === 'ORDER_STATUS');
    }
);

export const selectPromotionNotifications = createSelector(
    [selectNotifications],
    (notifications) => {
        return notifications.filter(notification => notification.type === 'PROMOTION');
    }
);

export const selectSecurityNotifications = createSelector(
    [selectNotifications],
    (notifications) => {
        return notifications.filter(notification => notification.type === 'SECURITY_ALERT');
    }
);

// НОВЫЕ селекторы для навигационных данных

/**
 * Селектор для уведомлений с навигационными данными
 */
export const selectNotificationsWithNavigation = createSelector(
    [selectNotifications],
    (notifications) => {
        return notifications.filter(notification =>
            notification.stopId || notification.orderId || notification.productId || notification.data
        );
    }
);

/**
 * Селектор для уведомлений об остановках (с stopId)
 */
export const selectStopNotifications = createSelector(
    [selectNotifications],
    (notifications) => {
        return notifications.filter(notification =>
            notification.stopId ||
            (notification.type === 'SYSTEM' &&
                (notification.title.toLowerCase().includes('остановка') ||
                    notification.content.toLowerCase().includes('остановка')))
        );
    }
);

/**
 * Селектор для уведомлений об определенной остановке
 */
export const selectNotificationsByStopId = createSelector(
    [selectNotifications, (_, stopId) => stopId],
    (notifications, stopId) => {
        if (!stopId) return EMPTY_ARRAY;
        const targetStopId = parseInt(stopId);

        return notifications.filter(notification =>
            notification.stopId === targetStopId ||
            (notification.data && parseInt(notification.data.stopId) === targetStopId)
        );
    }
);

/**
 * Селектор для уведомлений о заказах (с orderId)
 */
export const selectOrderNotificationsWithId = createSelector(
    [selectNotifications],
    (notifications) => {
        return notifications.filter(notification =>
            notification.orderId ||
            (notification.type === 'ORDER_STATUS')
        );
    }
);

/**
 * Селектор для уведомлений об определенном заказе
 */
export const selectNotificationsByOrderId = createSelector(
    [selectNotifications, (_, orderId) => orderId],
    (notifications, orderId) => {
        if (!orderId) return EMPTY_ARRAY;
        const targetOrderId = parseInt(orderId);

        return notifications.filter(notification =>
            notification.orderId === targetOrderId ||
            (notification.data && parseInt(notification.data.orderId) === targetOrderId)
        );
    }
);

/**
 * Селектор для уведомлений о продуктах (с productId)
 */
export const selectProductNotifications = createSelector(
    [selectNotifications],
    (notifications) => {
        return notifications.filter(notification =>
            notification.productId ||
            (notification.type === 'PROMOTION')
        );
    }
);

/**
 * Селектор для уведомлений об определенном продукте
 */
export const selectNotificationsByProductId = createSelector(
    [selectNotifications, (_, productId) => productId],
    (notifications, productId) => {
        if (!productId) return EMPTY_ARRAY;
        const targetProductId = parseInt(productId);

        return notifications.filter(notification =>
            notification.productId === targetProductId ||
            (notification.data && parseInt(notification.data.productId) === targetProductId)
        );
    }
);

export const selectRecentNotifications = createSelector(
    [selectNotifications],
    (notifications) => {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        return notifications.filter(notification =>
            new Date(notification.createdAt) > oneDayAgo
        );
    }
);

export const selectNotificationById = createSelector(
    [selectNotifications, (_, notificationId) => notificationId],
    (notifications, notificationId) => {
        return notifications.find(notification => notification.id === parseInt(notificationId));
    }
);

// Селектор для группировки уведомлений по дням
export const selectNotificationsByDay = createSelector(
    [selectNotifications],
    (notifications) => {
        const groupedByDay = {};

        notifications.forEach(notification => {
            const date = new Date(notification.createdAt);
            const dayKey = date.toDateString();

            if (!groupedByDay[dayKey]) {
                groupedByDay[dayKey] = [];
            }

            groupedByDay[dayKey].push(notification);
        });

        // Преобразуем в массив и сортируем по дате (новые сверху)
        return Object.entries(groupedByDay)
            .map(([date, notifications]) => ({
                date,
                notifications: notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }
);

// РАСШИРЕННЫЙ селектор для статистики уведомлений
export const selectNotificationStats = createSelector(
    [selectNotifications],
    (notifications) => {
        const stats = {
            total: notifications.length,
            unread: 0,
            byType: {
                SYSTEM: 0,
                ORDER_STATUS: 0,
                PROMOTION: 0,
                TASK: 0,
                SUPPLY: 0,
                SECURITY_ALERT: 0
            },
            // НОВЫЕ статистики навигации
            navigation: {
                withStopId: 0,
                withOrderId: 0,
                withProductId: 0,
                withData: 0,
                total: 0
            },
            today: 0,
            thisWeek: 0,
            thisMonth: 0
        };

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        notifications.forEach(notification => {
            // Подсчет непрочитанных
            if (!notification.isRead) {
                stats.unread++;
            }

            // Подсчет по типам
            if (stats.byType.hasOwnProperty(notification.type)) {
                stats.byType[notification.type]++;
            }

            // НОВОЕ: Подсчет навигационных данных
            if (notification.stopId) {
                stats.navigation.withStopId++;
            }
            if (notification.orderId) {
                stats.navigation.withOrderId++;
            }
            if (notification.productId) {
                stats.navigation.withProductId++;
            }
            if (notification.data) {
                stats.navigation.withData++;
            }
            if (notification.stopId || notification.orderId || notification.productId || notification.data) {
                stats.navigation.total++;
            }

            // Подсчет по времени
            const notificationDate = new Date(notification.createdAt);

            if (notificationDate >= today) {
                stats.today++;
            }

            if (notificationDate >= oneWeekAgo) {
                stats.thisWeek++;
            }

            if (notificationDate >= oneMonthAgo) {
                stats.thisMonth++;
            }
        });

        return stats;
    }
);

/**
 * НОВЫЙ: Селектор для определения доступности навигации
 */
export const selectNavigationAvailability = createSelector(
    [selectNotifications],
    (notifications) => {
        const navStats = {
            canNavigate: 0,
            cannotNavigate: 0,
            total: notifications.length
        };

        notifications.forEach(notification => {
            const hasNavigation = !!(
                notification.stopId ||
                notification.orderId ||
                notification.productId ||
                (notification.data && (notification.data.stopId || notification.data.orderId || notification.data.productId || notification.data.url))
            );

            if (hasNavigation) {
                navStats.canNavigate++;
            } else {
                navStats.cannotNavigate++;
            }
        });

        return navStats;
    }
);

/**
 * НОВЫЙ: Селектор для поиска уведомлений
 */
export const selectNotificationsBySearch = createSelector(
    [selectNotifications, (_, searchQuery) => searchQuery],
    (notifications, searchQuery) => {
        if (!searchQuery || searchQuery.trim() === '') {
            return notifications;
        }

        const query = searchQuery.toLowerCase().trim();

        return notifications.filter(notification =>
            notification.title.toLowerCase().includes(query) ||
            notification.content.toLowerCase().includes(query) ||
            notification.type.toLowerCase().includes(query) ||
            // Поиск по навигационным данным
            (notification.stopId && notification.stopId.toString().includes(query)) ||
            (notification.orderId && notification.orderId.toString().includes(query)) ||
            (notification.productId && notification.productId.toString().includes(query)) ||
            // Поиск в data объекте
            (notification.data && JSON.stringify(notification.data).toLowerCase().includes(query))
        );
    }
);

/**
 * НОВЫЙ: Селектор для фильтрации уведомлений с возможностью навигации
 */
export const selectNavigableNotifications = createSelector(
    [selectNotifications],
    (notifications) => {
        return notifications.filter(notification => {
            // Проверяем наличие любых навигационных данных
            return !!(
                notification.stopId ||
                notification.orderId ||
                notification.productId ||
                (notification.data && (
                    notification.data.stopId ||
                    notification.data.orderId ||
                    notification.data.productId ||
                    notification.data.url
                ))
            );
        });
    }
);

/**
 * НОВЫЙ: Селектор для группировки по типу навигации
 */
export const selectNotificationsByNavigationType = createSelector(
    [selectNotifications],
    (notifications) => {
        const grouped = {
            stops: [],
            orders: [],
            products: [],
            other: [],
            noNavigation: []
        };

        notifications.forEach(notification => {
            if (notification.stopId || (notification.data && notification.data.stopId)) {
                grouped.stops.push(notification);
            } else if (notification.orderId || (notification.data && notification.data.orderId)) {
                grouped.orders.push(notification);
            } else if (notification.productId || (notification.data && notification.data.productId)) {
                grouped.products.push(notification);
            } else if (notification.data && notification.data.url) {
                grouped.other.push(notification);
            } else {
                grouped.noNavigation.push(notification);
            }
        });

        return grouped;
    }
);

// Селектор для проверки валидности кэша
export const selectIsNotificationCacheValid = createSelector(
    [(state) => state.notification.lastFetchTime],
    (lastFetchTime) => {
        const CACHE_EXPIRY_TIME = 2 * 60 * 1000; // 2 минуты
        return lastFetchTime && Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
    }
);

/**
 * НОВЫЙ: Мета-селектор для полной информации о навигации
 */
export const selectNotificationNavigationMeta = createSelector(
    [selectNotifications],
    (notifications) => {
        const meta = {
            total: notifications.length,
            navigable: 0,
            byType: {
                stop: 0,
                order: 0,
                product: 0,
                url: 0,
                none: 0
            },
            dataQuality: {
                complete: 0,    // Есть все необходимые поля
                partial: 0,     // Есть некоторые навигационные данные
                minimal: 0,     // Только базовая информация
                none: 0         // Нет навигационных данных
            }
        };

        notifications.forEach(notification => {
            let hasNavigation = false;
            let navigationQuality = 'none';

            // Анализируем тип навигации
            if (notification.stopId || (notification.data && notification.data.stopId)) {
                meta.byType.stop++;
                hasNavigation = true;
                navigationQuality = notification.data && notification.data.url ? 'complete' : 'partial';
            }

            if (notification.orderId || (notification.data && notification.data.orderId)) {
                meta.byType.order++;
                hasNavigation = true;
                navigationQuality = notification.data && notification.data.url ? 'complete' : 'partial';
            }

            if (notification.productId || (notification.data && notification.data.productId)) {
                meta.byType.product++;
                hasNavigation = true;
                navigationQuality = notification.data && notification.data.url ? 'complete' : 'partial';
            }

            if (notification.data && notification.data.url && !hasNavigation) {
                meta.byType.url++;
                hasNavigation = true;
                navigationQuality = 'minimal';
            }

            if (!hasNavigation) {
                meta.byType.none++;
                navigationQuality = 'none';
            }

            // Подсчет качества данных
            meta.dataQuality[navigationQuality]++;

            if (hasNavigation) {
                meta.navigable++;
            }
        });

        return meta;
    }
);