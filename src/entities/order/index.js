// ===== ОСНОВНЫЕ ЭКСПОРТЫ МОДУЛЯ ЗАКАЗОВ =====

// Импорты утилит для использования в функциях
import {
    ORDER_STATUSES,
    ORDER_STATUS_LABELS,
    ORDER_STATUS_COLORS,
    getStatusLabel,
    getStatusColor,
    formatOrderNumber,
    formatAmount,
    isPriorityOrder,
    canCancelOrder,
    canLeaveReview,
    getAvailableStatuses,
    calculateEstimatedDelivery
} from './lib/utils';

// Slice и actions
export { default as orderReducer } from './model/slice';
export { default as orderProcessingReducer } from './model/slice';

// Actions
export {
    fetchMyOrders,
    fetchStaffOrders,
    fetchOrderDetails,
    fetchOrdersStats,
    updateOrderStatus,
    completeOrderStage,
    assignOrder,
    cancelOrder,
    createOrderForClient,
    bulkUpdateOrders,
    exportOrders,
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
    removeOrderFromList

} from './model/slice';

// Селекторы
// export { default as orderSelectors } from './model/selectors';

// Основные селекторы для быстрого доступа
export {
    selectMyOrders,
    selectStaffOrders,
    selectOrderDetails,
    selectOrdersStats,
    selectMyOrdersLoading,
    selectStaffOrdersLoading,
    selectOrderDetailsLoading,
    selectOrdersStatsLoading,
    selectOrderOperations,
    selectStaffOrdersFilters,
    selectOrderNotifications,
    selectActiveOrderNotifications,
    selectOrderAccessRights,
    selectOrdersDashboardData
} from './model/selectors';

// Хуки
export {
    useOrders,
    useOrder,
    useOrdersAutoLoad,
    useOrdersFilter,
    useOrdersAnalytics,
    useOrderNotifications,
    useBulkOrderOperations,
    useOrdersExport
} from './hooks/useOrders';

export { useOrderNotifications as useOrderNotificationsNew } from './hooks/useOrderNotifications';

export { OrderCard } from './ui/OrderCard';
export { default as OrderNotificationTester } from './ui/OrderNotificationTester';

// API
export { OrderApi } from './api';
export { OrderNotificationApi } from './api/orderNotificationApi';

// Утилиты
export {
    ORDER_STATUSES,
    ORDER_STATUS_LABELS,
    ORDER_STATUS_COLORS,
    getStatusLabel,
    getStatusColor,
    formatOrderNumber,
    formatAmount,
    isPriorityOrder,
    canCancelOrder,
    canLeaveReview,
    getAvailableStatuses,
    calculateEstimatedDelivery
} from './lib/utils';

// Сервис для работы с API

// ===== ТИПЫ И КОНСТАНТЫ =====

// ORDER_STATUS_COLORS теперь экспортируется из ./lib/utils

export const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

export const BULK_ACTIONS = {
    UPDATE_STATUS: 'updateStatus',
    ASSIGN: 'assign',
    CANCEL: 'cancel'
};

export const EXPORT_FORMATS = {
    EXCEL: 'excel',
    CSV: 'csv',
    PDF: 'pdf'
};

// ===== УТИЛИТЫ =====

/**
 * Проверяет, можно ли оставить отзыв на заказ
 * @param {string} status - Статус заказа
 * @returns {boolean}
 */
// canLeaveReview теперь экспортируется из ./lib/utils

/**
 * Получает доступные статусы для перехода
 * @param {string} currentStatus - Текущий статус заказа
 * @returns {Array}
 */
// getAvailableStatuses теперь экспортируется из ./lib/utils



/**
 * Вычисляет примерное время доставки
 * @param {Object} orderData - Данные заказа
 * @returns {Date}
 */
// calculateEstimatedDelivery теперь экспортируется из ./lib/utils



/**
 * Группирует заказы по статусу
 * @param {Array} orders - Массив заказов
 * @returns {Object}
 */
export const groupOrdersByStatus = (orders) => {
    return orders.reduce((acc, order) => {
        const status = order.status;
        if (!acc[status]) {
            acc[status] = [];
        }
        acc[status].push(order);
        return acc;
    }, {});
};

/**
 * Фильтрует заказы по различным критериям
 * @param {Array} orders - Массив заказов
 * @param {Object} filters - Объект с фильтрами
 * @returns {Array}
 */
export const filterOrders = (orders, filters = {}) => {
    return orders.filter(order => {
        // Фильтр по статусу
        if (filters.status && order.status !== filters.status) {
            return false;
        }

        // Фильтр по дате
        if (filters.dateFrom) {
            const orderDate = new Date(order.createdAt);
            const fromDate = new Date(filters.dateFrom);
            if (orderDate < fromDate) return false;
        }

        if (filters.dateTo) {
            const orderDate = new Date(order.createdAt);
            const toDate = new Date(filters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (orderDate > toDate) return false;
        }

        // Фильтр по сумме
        if (filters.minAmount && order.totalAmount < filters.minAmount) {
            return false;
        }

        if (filters.maxAmount && order.totalAmount > filters.maxAmount) {
            return false;
        }

        // Фильтр по складу
        if (filters.warehouseId && order.warehouseId !== filters.warehouseId) {
            return false;
        }

        // Фильтр "назначенные мне"
        if (filters.assignedToMe && !order.assignedTo) {
            return false;
        }

        // Фильтр по району
        if (filters.districtId && order.client?.districtId !== filters.districtId) {
            return false;
        }

        // Фильтр приоритетных заказов
        if (filters.priority && !isPriorityOrder(order)) {
            return false;
        }

        // Поиск по тексту
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            const searchableText = [
                order.orderNumber,
                order.client?.name,
                order.comment,
                order.deliveryAddress,
                ORDER_STATUS_LABELS[order.status]
            ].filter(Boolean).join(' ').toLowerCase();

            if (!searchableText.includes(searchLower)) {
                return false;
            }
        }

        return true;
    });
};

/**
 * Сортирует заказы по различным критериям
 * @param {Array} orders - Массив заказов
 * @param {string} sortBy - Поле для сортировки
 * @param {string} sortOrder - Порядок сортировки (asc/desc)
 * @returns {Array}
 */
export const sortOrders = (orders, sortBy = 'createdAt', sortOrder = 'desc') => {
    const sortedOrders = [...orders];

    sortedOrders.sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
            case 'orderNumber':
                aValue = a.orderNumber || '';
                bValue = b.orderNumber || '';
                break;
            case 'status':
                aValue = a.status || '';
                bValue = b.status || '';
                break;
            case 'totalAmount':
                aValue = a.totalAmount || 0;
                bValue = b.totalAmount || 0;
                break;
            case 'clientName':
                aValue = a.client?.name || '';
                bValue = b.client?.name || '';
                break;
            case 'createdAt':
                aValue = new Date(a.createdAt || 0);
                bValue = new Date(b.createdAt || 0);
                break;
            case 'updatedAt':
                aValue = new Date(a.updatedAt || 0);
                bValue = new Date(b.updatedAt || 0);
                break;
            case 'expectedDeliveryDate':
                aValue = a.expectedDeliveryDate ? new Date(a.expectedDeliveryDate) : new Date(0);
                bValue = b.expectedDeliveryDate ? new Date(b.expectedDeliveryDate) : new Date(0);
                break;
            case 'assignedTo':
                aValue = a.assignedTo?.name || '';
                bValue = b.assignedTo?.name || '';
                break;
            default:
                return 0;
        }

        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (sortOrder === 'desc') {
            return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        } else {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
    });

    return sortedOrders;
};

/**
 * Вычисляет статистику для массива заказов
 * @param {Array} orders - Массив заказов
 * @returns {Object}
 */
export const calculateOrdersStats = (orders) => {
    if (!orders.length) {
        return {
            totalOrders: 0,
            totalRevenue: 0,
            averageOrderValue: 0,
            statusCounts: {},
            revenueByStatus: {},
            completionRate: 0
        };
    }

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const averageOrderValue = totalRevenue / totalOrders;

    const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
    }, {});

    const revenueByStatus = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + (order.totalAmount || 0);
        return acc;
    }, {});

    const completedOrders = statusCounts[ORDER_STATUSES.DELIVERED] || 0;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        statusCounts,
        revenueByStatus,
        completionRate
    };
};

/**
 * Валидирует данные заказа перед отправкой
 * @param {Object} orderData - Данные заказа
 * @returns {Object} { isValid: boolean, errors: Array }
 */
export const validateOrderData = (orderData) => {
    const errors = [];

    if (!orderData.clientId) {
        errors.push('Не указан клиент');
    }

    if (!orderData.items || !orderData.items.length) {
        errors.push('Не указаны товары для заказа');
    }

    if (orderData.items) {
        orderData.items.forEach((item, index) => {
            if (!item.productId) {
                errors.push(`Товар ${index + 1}: не указан ID продукта`);
            }
            if (!item.quantity || item.quantity <= 0) {
                errors.push(`Товар ${index + 1}: некорректное количество`);
            }
        });
    }

    if (orderData.expectedDeliveryDate) {
        const deliveryDate = new Date(orderData.expectedDeliveryDate);
        const now = new Date();

        if (deliveryDate <= now) {
            errors.push('Дата доставки должна быть в будущем');
        }

        const maxDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // +60 дней
        if (deliveryDate > maxDate) {
            errors.push('Дата доставки не должна превышать 60 дней от текущей даты');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Создает уведомление с предустановленными настройками
 * @param {string} type - Тип уведомления
 * @param {string} message - Сообщение
 * @param {number|null} orderId - ID заказа (опционально)
 * @param {Object} options - Дополнительные опции
 * @returns {Object}
 */
export const createNotification = (type, message, orderId = null, options = {}) => {
    const defaultDurations = {
        [NOTIFICATION_TYPES.SUCCESS]: 3000,
        [NOTIFICATION_TYPES.ERROR]: 5000,
        [NOTIFICATION_TYPES.WARNING]: 4000,
        [NOTIFICATION_TYPES.INFO]: 3000
    };

    return {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        message,
        orderId,
        timestamp: new Date().toISOString(),
        autoHide: true,
        duration: defaultDurations[type] || 3000,
        ...options
    };
};

/**
 * Генерирует конфигурацию для экспорта заказов
 * @param {string} format - Формат экспорта
 * @param {Object} filters - Фильтры для экспорта
 * @param {Array} fields - Поля для экспорта
 * @returns {Object}
 */
export const createExportConfig = (format = EXPORT_FORMATS.EXCEL, filters = {}, fields = []) => {
    const defaultFields = [
        'orderNumber',
        'status',
        'clientName',
        'totalAmount',
        'createdAt',
        'deliveryAddress'
    ];

    return {
        format,
        filters,
        fields: fields.length > 0 ? fields : defaultFields
    };
};

/**
 * Проверяет права доступа пользователя к операциям с заказами
 * @param {string} userRole - Роль пользователя
 * @returns {Object}
 */
export const getOrderAccessRights = (userRole) => ({
    canViewMyOrders: userRole === 'CLIENT',
    canViewStaffOrders: ['ADMIN', 'EMPLOYEE'].includes(userRole),
    canUpdateOrderStatus: ['ADMIN', 'EMPLOYEE'].includes(userRole),
    canAssignOrders: ['ADMIN', 'EMPLOYEE'].includes(userRole),
    canCancelOrders: ['ADMIN', 'EMPLOYEE'].includes(userRole),
    canCreateOrders: ['ADMIN', 'EMPLOYEE'].includes(userRole),
    canViewStats: ['ADMIN', 'EMPLOYEE'].includes(userRole),
    canExportOrders: ['ADMIN', 'EMPLOYEE'].includes(userRole),
    canBulkUpdate: userRole === 'ADMIN',
    canCancelMyOrders: userRole === 'CLIENT'
});

// ===== ТИПЫ ДЛЯ TYPESCRIPT (если используется) =====

/**
 * @typedef {Object} Order
 * @property {number} id - ID заказа
 * @property {string} orderNumber - Номер заказа
 * @property {string} status - Статус заказа
 * @property {number} totalAmount - Общая сумма
 * @property {string} createdAt - Дата создания
 * @property {string} updatedAt - Дата обновления
 * @property {string|null} deliveryAddress - Адрес доставки
 * @property {string|null} comment - Комментарий
 * @property {string|null} expectedDeliveryDate - Ожидаемая дата доставки
 * @property {Object} client - Данные клиента
 * @property {Array} items - Товары в заказе
 * @property {Object|null} assignedTo - Назначенный сотрудник
 * @property {Object|null} warehouse - Склад
 */

/**
 * @typedef {Object} OrderFilters
 * @property {string|null} status - Статус заказа
 * @property {number|null} warehouseId - ID склада
 * @property {boolean} assignedToMe - Назначенные мне
 * @property {number|null} districtId - ID района
 * @property {string|null} dateFrom - Дата от
 * @property {string|null} dateTo - Дата до
 * @property {boolean} priority - Только приоритетные
 * @property {string|null} search - Поисковый запрос
 * @property {number|null} minAmount - Минимальная сумма
 * @property {number|null} maxAmount - Максимальная сумма
 */

/**
 * @typedef {Object} OrderNotification
 * @property {string} id - ID уведомления
 * @property {string} type - Тип уведомления
 * @property {string} message - Сообщение
 * @property {number|null} orderId - ID заказа
 * @property {string} timestamp - Время создания
 * @property {boolean} autoHide - Автоскрытие
 * @property {number} duration - Длительность показа
 */

// ===== КОНФИГУРАЦИЯ ПО УМОЛЧАНИЮ =====

export const DEFAULT_ORDER_CONFIG = {
    pagination: {
        defaultPageSize: 10,
        maxPageSize: 100
    },
    cache: {
        expiryTime: 2 * 60 * 1000, // 2 минуты
    },
    autoRefresh: {
        interval: 30000, // 30 секунд
        enabled: false
    },
    notifications: {
        maxCount: 50,
        defaultDuration: 3000
    },
    export: {
        defaultFormat: EXPORT_FORMATS.EXCEL,
        maxRecords: 10000
    }
};

// ===== ХЕЛПЕРЫ ДЛЯ ИНТЕГРАЦИИ С REDUX STORE =====

/**
 * Конфигурация для добавления в Redux store
 */
export const orderStoreConfig = {
    reducer: {
        // orders: orderReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [
                    'orders/exportOrders/fulfilled' // Игнорируем blob данные при экспорте
                ]
            }
        })
};

/**
 * Начальная загрузка данных заказов
 * @param {Function} dispatch - Redux dispatch функция
 * @param {string} userRole - Роль пользователя
 * @returns {Promise}
 */
export const initializeOrders = async (dispatch, userRole) => {
    // Временно отключено
    // const accessRights = getOrderAccessRights(userRole);
    // const promises = [];

    // if (accessRights.canViewMyOrders) {
    //     promises.push(dispatch(fetchMyOrders()));
    // }

    // if (accessRights.canViewStaffOrders) {
    //     promises.push(dispatch(fetchStaffOrders()));
    // }

    // if (accessRights.canViewStats) {
    //     promises.push(dispatch(fetchOrdersStats()));
    // }

    try {
        // await Promise.all(promises);
        return { success: true };
    } catch (error) {
        console.error('Error initializing orders:', error);
        return { success: false, error: error.message };
    }
};

export default {
    // Основные компоненты
    // orderReducer,
    // orderSelectors,
    // OrderService,

    // Константы
    ORDER_STATUS_COLORS,
    NOTIFICATION_TYPES,
    BULK_ACTIONS,
    EXPORT_FORMATS,
    DEFAULT_ORDER_CONFIG,

    // Утилиты
    getAvailableStatuses,
    calculateEstimatedDelivery,
    groupOrdersByStatus,
    filterOrders,
    sortOrders,
    calculateOrdersStats,
    validateOrderData,
    createNotification,
    createExportConfig,
    getOrderAccessRights,

    // Хелперы для интеграции
    orderStoreConfig,
    initializeOrders
};