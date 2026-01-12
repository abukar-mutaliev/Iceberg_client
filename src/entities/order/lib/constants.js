// Константы для системы обработки заказов
export const CONSTANTS = {
  // Cache settings
  CACHE_KEY: 'staff_orders_cache',
  CACHE_EXPIRY: 5 * 60 * 1000, // 5 minutes
  
  // Auto refresh
  AUTO_REFRESH_INTERVAL: 30 * 1000, // 30 seconds
  
  // Timing
  RECENT_ACTION_THRESHOLD: 30 * 1000, // 30 seconds
  STATUS_UPDATE_DELAY: 1500, // 1.5 seconds
  RELEASE_ORDER_DELAY: 1000, // 1 second
  
  // Rendering optimization
  RENDER_BATCH_SIZE: 10,
  INITIAL_RENDER_COUNT: 8,
  WINDOW_SIZE: 10,
  UPDATE_CELLS_BATCHING_PERIOD: 100,
  
  // Text limits
  COMMENT_MAX_LENGTH: 500,
  
  // Status mappings - обновлено для пропуска этапа упаковки
  ROLE_STATUS_MAPPING: {
      'PICKER': ['PENDING', 'CONFIRMED'], // Сборщик работает с новыми и подтвержденными заказами (БЕЗ WAITING_STOCK!)
      'PACKER': [], // Этап упаковки убран - сборщик сразу передает курьерам
      'COURIER': ['IN_DELIVERY'] // Курьеры работают с заказами в доставке (БЕЗ WAITING_STOCK!)
  },

  ROLE_HISTORY_MAPPING: {
      'PICKER': ['DELIVERED', 'CANCELLED', 'RETURNED'], // Сборщик видит только завершенные заказы
      'PACKER': [], // Этап упаковки убран
      'COURIER': ['DELIVERED', 'CANCELLED', 'RETURNED'], // Курьеры видят завершенные заказы
      'SUPERVISOR': ['DELIVERED', 'CANCELLED', 'RETURNED'], // Обычные сотрудники видят завершенные заказы
      'null': ['DELIVERED', 'CANCELLED', 'RETURNED'] // По умолчанию для сотрудников без processingRole
  },
  
  COMPLETED_STATUSES: ['DELIVERED', 'CANCELLED', 'RETURNED'],
  CANCELLABLE_STATUSES: ['PENDING', 'CONFIRMED', 'IN_DELIVERY'],
};

// Новые статусы обработки заказов
export const PROCESSING_STAGES = {
  ORDER_RECEIVED: 'ORDER_RECEIVED',
  PICKING: 'PICKING',
  PACKING: 'PACKING',
  QUALITY_CHECK: 'QUALITY_CHECK',
  READY_FOR_DELIVERY: 'READY_FOR_DELIVERY',
  IN_DELIVERY: 'IN_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
};

// Роли обработки
export const PROCESSING_ROLES = {
  PICKER: 'PICKER',
  PACKER: 'PACKER',
  QUALITY_CHECKER: 'QUALITY_CHECKER',
  COURIER: 'COURIER',
  SUPERVISOR: 'SUPERVISOR',
  MANAGER: 'MANAGER'
};

// Приоритеты заказов
export const ORDER_PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

// Типы уведомлений обработки
export const PROCESSING_NOTIFICATION_TYPES = {
  ORDER_ASSIGNMENT: 'ORDER_ASSIGNMENT',
  STAGE_COMPLETION: 'STAGE_COMPLETION',
  ORDER_DELAYED: 'ORDER_DELAYED',
  STAGE_STARTED: 'STAGE_STARTED',
  MANUAL: 'MANUAL'
};

// Цвета для этапов обработки
export const PROCESSING_STAGE_COLORS = {
  [PROCESSING_STAGES.ORDER_RECEIVED]: '#17a2b8',
  [PROCESSING_STAGES.PICKING]: '#ffc107',
  [PROCESSING_STAGES.PACKING]: '#28a745',
  [PROCESSING_STAGES.QUALITY_CHECK]: '#dc3545',
  [PROCESSING_STAGES.READY_FOR_DELIVERY]: '#6f42c1',
  [PROCESSING_STAGES.IN_DELIVERY]: '#fd7e14',
  [PROCESSING_STAGES.DELIVERED]: '#20c997',
  [PROCESSING_STAGES.CANCELLED]: '#6c757d'
};

// Лейблы для этапов
export const PROCESSING_STAGE_LABELS = {
  [PROCESSING_STAGES.ORDER_RECEIVED]: 'Заказ получен',
  [PROCESSING_STAGES.PICKING]: 'Сборка товаров',
  [PROCESSING_STAGES.PACKING]: 'Упаковка',
  [PROCESSING_STAGES.QUALITY_CHECK]: 'Проверка качества',
  [PROCESSING_STAGES.READY_FOR_DELIVERY]: 'Готов к доставке',
  [PROCESSING_STAGES.IN_DELIVERY]: 'В доставке',
  [PROCESSING_STAGES.DELIVERED]: 'Доставлен',
  [PROCESSING_STAGES.CANCELLED]: 'Отменен'
};

// Иконки для этапов
export const PROCESSING_STAGE_ICONS = {
  [PROCESSING_STAGES.ORDER_RECEIVED]: '📋',
  [PROCESSING_STAGES.PICKING]: '🛒',
  [PROCESSING_STAGES.PACKING]: '📦',
  [PROCESSING_STAGES.QUALITY_CHECK]: '✅',
  [PROCESSING_STAGES.READY_FOR_DELIVERY]: '🚚',
  [PROCESSING_STAGES.IN_DELIVERY]: '🚛',
  [PROCESSING_STAGES.DELIVERED]: '🎉',
  [PROCESSING_STAGES.CANCELLED]: '❌'
};

// Статусы этапов
export const STAGE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  PAUSED: 'paused'
};

// Лейблы статусов
export const STAGE_STATUS_LABELS = {
  [STAGE_STATUS.PENDING]: 'Ожидает',
  [STAGE_STATUS.IN_PROGRESS]: 'В работе',
  [STAGE_STATUS.COMPLETED]: 'Завершен',
  [STAGE_STATUS.PAUSED]: 'Приостановлен'
};

// Цвета статусов
export const STAGE_STATUS_COLORS = {
  [STAGE_STATUS.PENDING]: '#6c757d',
  [STAGE_STATUS.IN_PROGRESS]: '#007bff',
  [STAGE_STATUS.COMPLETED]: '#28a745',
  [STAGE_STATUS.PAUSED]: '#ffc107'
};

// Лейблы ролей
export const PROCESSING_ROLE_LABELS = {
  [PROCESSING_ROLES.PICKER]: 'Сборщик',
  [PROCESSING_ROLES.PACKER]: 'Упаковщик',
  [PROCESSING_ROLES.QUALITY_CHECKER]: 'Контролер качества',
  [PROCESSING_ROLES.COURIER]: 'Курьер',
  [PROCESSING_ROLES.SUPERVISOR]: 'Начальник смены',
  [PROCESSING_ROLES.MANAGER]: 'Менеджер'
};

// Маппинг ролей к этапам - обновлено для пропуска этапа упаковки
export const ROLE_STAGE_MAPPING = {
  [PROCESSING_ROLES.PICKER]: PROCESSING_STAGES.PICKING, // Сборщик работает на этапе сборки
  [PROCESSING_ROLES.PACKER]: null, // Этап упаковки убран - сборщик сразу передает курьерам
  [PROCESSING_ROLES.QUALITY_CHECKER]: PROCESSING_STAGES.QUALITY_CHECK,
  [PROCESSING_ROLES.COURIER]: PROCESSING_STAGES.IN_DELIVERY, // Курьеры работают на этапе доставки
  [PROCESSING_ROLES.SUPERVISOR]: null // Супервизор видит все этапы
}; 