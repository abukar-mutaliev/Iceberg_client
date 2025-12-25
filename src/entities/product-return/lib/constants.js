/**
 * Константы для модуля возвратов товаров
 * @module product-return/lib/constants
 */

/**
 * Статусы возврата товара
 * @readonly
 * @enum {string}
 */
export const ProductReturnStatus = {
  PENDING: 'PENDING',           // Ожидает рассмотрения
  APPROVED: 'APPROVED',         // Одобрено
  IN_PROGRESS: 'IN_PROGRESS',   // В процессе
  COMPLETED: 'COMPLETED',       // Завершено
  REJECTED: 'REJECTED',         // Отклонено
  CANCELLED: 'CANCELLED'        // Отменено
};

/**
 * Уровни срочности для залежавшихся товаров
 * @readonly
 * @enum {string}
 */
export const UrgencyLevel = {
  CRITICAL: 'CRITICAL',  // 30+ дней без продаж
  HIGH: 'HIGH',          // 21-29 дней
  MEDIUM: 'MEDIUM',      // 14-20 дней
  LOW: 'LOW'             // <14 дней
};

/**
 * Лейблы статусов возврата на русском языке
 * @readonly
 */
export const RETURN_STATUS_LABELS = {
  [ProductReturnStatus.PENDING]: 'Ожидает рассмотрения',
  [ProductReturnStatus.APPROVED]: 'Одобрено',
  [ProductReturnStatus.IN_PROGRESS]: 'В процессе',
  [ProductReturnStatus.COMPLETED]: 'Завершено',
  [ProductReturnStatus.REJECTED]: 'Отклонено',
  [ProductReturnStatus.CANCELLED]: 'Отменено'
};

/**
 * Цвета для статусов возврата
 * @readonly
 */
export const RETURN_STATUS_COLORS = {
  [ProductReturnStatus.PENDING]: '#007AFF',
  [ProductReturnStatus.APPROVED]: '#34C759',
  [ProductReturnStatus.IN_PROGRESS]: '#FF9500',
  [ProductReturnStatus.COMPLETED]: '#5856D6',
  [ProductReturnStatus.REJECTED]: '#FF3B30',
  [ProductReturnStatus.CANCELLED]: '#8E8E93'
};

/**
 * Лейблы уровней срочности на русском языке
 * @readonly
 */
export const URGENCY_LEVEL_LABELS = {
  [UrgencyLevel.CRITICAL]: 'Критично',
  [UrgencyLevel.HIGH]: 'Высокий',
  [UrgencyLevel.MEDIUM]: 'Средний',
  [UrgencyLevel.LOW]: 'Низкий'
};

/**
 * Цвета для уровней срочности
 * @readonly
 */
export const URGENCY_LEVEL_COLORS = {
  [UrgencyLevel.CRITICAL]: '#FF3B30',
  [UrgencyLevel.HIGH]: '#FF9500',
  [UrgencyLevel.MEDIUM]: '#FFCC00',
  [UrgencyLevel.LOW]: '#34C759'
};

/**
 * Фоновые цвета для уровней срочности
 * @readonly
 */
export const URGENCY_LEVEL_BG_COLORS = {
  [UrgencyLevel.CRITICAL]: '#FFEBEE',
  [UrgencyLevel.HIGH]: '#FFF3E0',
  [UrgencyLevel.MEDIUM]: '#FFF9C4',
  [UrgencyLevel.LOW]: '#E8F5E9'
};

/**
 * Иконки (эмодзи) для уровней срочности
 * @readonly
 */
export const URGENCY_LEVEL_ICONS = {
  [UrgencyLevel.CRITICAL]: '🔴',
  [UrgencyLevel.HIGH]: '🟠',
  [UrgencyLevel.MEDIUM]: '🟡',
  [UrgencyLevel.LOW]: '🟢'
};

/**
 * Общие константы модуля
 * @readonly
 */
export const CONSTANTS = {
  // Пороговые значения
  DEFAULT_DAYS_THRESHOLD: 21,          // По умолчанию 21 день
  CRITICAL_DAYS_THRESHOLD: 30,         // Критичный порог
  HIGH_DAYS_THRESHOLD: 21,             // Высокий порог
  MEDIUM_DAYS_THRESHOLD: 14,           // Средний порог
  
  // Кэширование
  CACHE_DURATION: 5 * 60 * 1000,       // 5 минут
  
  // Пагинация
  DEFAULT_PAGE_SIZE: 20,               // Размер страницы по умолчанию
  MAX_PAGE_SIZE: 100,                  // Максимальный размер страницы
  
  // Автообновление
  AUTO_REFRESH_INTERVAL: 60000,        // 60 секунд
  AUTO_REFRESH_ENABLED: false,         // По умолчанию выключено
};

