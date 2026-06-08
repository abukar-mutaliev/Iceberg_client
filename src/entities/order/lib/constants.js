// Константы для системы обработки заказов.
//
// После упрощения логики:
//  - Этап упаковки (PACKER/PACKING) и проверки качества (QUALITY_CHECKER/QUALITY_CHECK)
//    удалены из рабочего флоу. Сборщик (PICKER) сразу переводит заказ к курьеру.
//  - READY_FOR_DELIVERY больше не используется как промежуточный статус.
//  - Старые константы оставлены как deprecated-стабы (значения, которые могли
//    встречаться в исторических заказах), чтобы экраны истории не падали.

export const CONSTANTS = {
    // Cache settings
    CACHE_KEY: 'staff_orders_cache',
    CACHE_EXPIRY: 5 * 60 * 1000,

    // Auto refresh
    AUTO_REFRESH_INTERVAL: 30 * 1000,

    // Timing
    RECENT_ACTION_THRESHOLD: 30 * 1000,
    STATUS_UPDATE_DELAY: 1500,
    RELEASE_ORDER_DELAY: 1000,

    // Rendering optimization
    RENDER_BATCH_SIZE: 10,
    INITIAL_RENDER_COUNT: 8,
    WINDOW_SIZE: 10,
    UPDATE_CELLS_BATCHING_PERIOD: 100,

    // Text limits
    COMMENT_MAX_LENGTH: 500,

    // Status mappings — упрощённый флоу.
    // PICKING — основной рабочий статус после авто-назначения курьера/сборщика.
    ROLE_STATUS_MAPPING: {
        PICKER: ['PENDING', 'CONFIRMED', 'PICKING'],
        COURIER: ['PICKING', 'IN_DELIVERY']
    },

    ROLE_HISTORY_MAPPING: {
        PICKER: ['DELIVERED', 'CANCELLED', 'RETURNED'],
        COURIER: ['DELIVERED', 'CANCELLED', 'RETURNED'],
        SUPERVISOR: ['DELIVERED', 'CANCELLED', 'RETURNED'],
        null: ['DELIVERED', 'CANCELLED', 'RETURNED']
    },

    COMPLETED_STATUSES: ['DELIVERED', 'CANCELLED', 'RETURNED'],
    CANCELLABLE_STATUSES: ['PENDING', 'CONFIRMED', 'PICKING', 'IN_DELIVERY']
};

// Статусы заказа, используемые в упрощённом флоу.
export const PROCESSING_STAGES = {
    ORDER_RECEIVED: 'ORDER_RECEIVED',
    PICKING: 'PICKING',
    IN_DELIVERY: 'IN_DELIVERY',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED'
};

// Роли обработки.
export const PROCESSING_ROLES = {
    PICKER: 'PICKER',
    COURIER: 'COURIER',
    SUPERVISOR: 'SUPERVISOR',
    MANAGER: 'MANAGER'
};

// Приоритеты заказов (используются в UI-фильтрах).
export const ORDER_PRIORITIES = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    URGENT: 'URGENT'
};

// Цвета для статусов.
export const PROCESSING_STAGE_COLORS = {
    [PROCESSING_STAGES.ORDER_RECEIVED]: '#17a2b8',
    [PROCESSING_STAGES.PICKING]: '#ffc107',
    [PROCESSING_STAGES.IN_DELIVERY]: '#fd7e14',
    [PROCESSING_STAGES.DELIVERED]: '#20c997',
    [PROCESSING_STAGES.CANCELLED]: '#6c757d'
};

// Лейблы для статусов.
export const PROCESSING_STAGE_LABELS = {
    [PROCESSING_STAGES.ORDER_RECEIVED]: 'Заказ получен',
    [PROCESSING_STAGES.PICKING]: 'Сборка товаров',
    [PROCESSING_STAGES.IN_DELIVERY]: 'В доставке',
    [PROCESSING_STAGES.DELIVERED]: 'Доставлен',
    [PROCESSING_STAGES.CANCELLED]: 'Отменён'
};

// Иконки для статусов.
export const PROCESSING_STAGE_ICONS = {
    [PROCESSING_STAGES.ORDER_RECEIVED]: '📋',
    [PROCESSING_STAGES.PICKING]: '🛒',
    [PROCESSING_STAGES.IN_DELIVERY]: '🚛',
    [PROCESSING_STAGES.DELIVERED]: '🎉',
    [PROCESSING_STAGES.CANCELLED]: '❌'
};

// Лейблы ролей.
export const PROCESSING_ROLE_LABELS = {
    [PROCESSING_ROLES.PICKER]: 'Сборщик',
    [PROCESSING_ROLES.COURIER]: 'Курьер',
    [PROCESSING_ROLES.SUPERVISOR]: 'Начальник смены',
    [PROCESSING_ROLES.MANAGER]: 'Менеджер'
};

// Маппинг ролей к статусам, в которые они переводят заказ.
export const ROLE_STAGE_MAPPING = {
    [PROCESSING_ROLES.PICKER]: PROCESSING_STAGES.PICKING,
    [PROCESSING_ROLES.COURIER]: PROCESSING_STAGES.IN_DELIVERY,
    [PROCESSING_ROLES.SUPERVISOR]: null
};
