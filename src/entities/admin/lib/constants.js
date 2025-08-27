// Должности обработки заказов
export const PROCESSING_ROLES = {
  PICKER: 'PICKER',
  PACKER: 'PACKER',
  QUALITY_CHECKER: 'QUALITY_CHECKER',
  COURIER: 'COURIER',
  SUPERVISOR: 'SUPERVISOR'
};

// Лейблы для должностей
export const PROCESSING_ROLE_LABELS = {
  [PROCESSING_ROLES.PICKER]: 'Сборщик',
  [PROCESSING_ROLES.PACKER]: 'Упаковщик',
  [PROCESSING_ROLES.QUALITY_CHECKER]: 'Контролер качества',
  [PROCESSING_ROLES.COURIER]: 'Курьер',
  [PROCESSING_ROLES.SUPERVISOR]: 'Начальник смены'
};

// Цвета для должностей
export const PROCESSING_ROLE_COLORS = {
  [PROCESSING_ROLES.PICKER]: '#ffc107',
  [PROCESSING_ROLES.PACKER]: '#28a745',
  [PROCESSING_ROLES.QUALITY_CHECKER]: '#dc3545',
  [PROCESSING_ROLES.COURIER]: '#fd7e14',
  [PROCESSING_ROLES.SUPERVISOR]: '#6f42c1'
};

// Иконки для должностей
export const PROCESSING_ROLE_ICONS = {
  [PROCESSING_ROLES.PICKER]: '📦',
  [PROCESSING_ROLES.PACKER]: '📋',
  [PROCESSING_ROLES.QUALITY_CHECKER]: '✅',
  [PROCESSING_ROLES.COURIER]: '🚚',
  [PROCESSING_ROLES.SUPERVISOR]: '👨‍💼'
};

// Описания должностей
export const PROCESSING_ROLE_DESCRIPTIONS = {
  [PROCESSING_ROLES.PICKER]: 'Собирает товары по заказу',
  [PROCESSING_ROLES.PACKER]: 'Упаковывает собранные товары',
  [PROCESSING_ROLES.QUALITY_CHECKER]: 'Проверяет качество упаковки',
  [PROCESSING_ROLES.COURIER]: 'Доставляет заказы клиентам',
  [PROCESSING_ROLES.SUPERVISOR]: 'Управляет процессом обработки заказов'
}; 