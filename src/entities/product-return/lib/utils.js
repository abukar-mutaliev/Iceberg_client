/**
 * Утилиты для работы с возвратами товаров
 * @module product-return/lib/utils
 */

import {
  ProductReturnStatus,
  UrgencyLevel,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_COLORS,
  URGENCY_LEVEL_LABELS,
  URGENCY_LEVEL_COLORS,
  URGENCY_LEVEL_ICONS
} from './constants';

// ==================== JSDOC ТИПЫ ====================

/**
 * @typedef {Object} StagnantProduct
 * @property {number} productId - ID продукта
 * @property {string} productName - Название продукта
 * @property {string} productImage - URL изображения продукта
 * @property {number} supplierId - ID поставщика
 * @property {string} supplierName - Название компании поставщика
 * @property {number} warehouseId - ID склада
 * @property {string} warehouseName - Название склада
 * @property {number} quantity - Количество коробок на складе
 * @property {number} daysSinceLastSale - Количество дней без продаж
 * @property {string} urgencyLevel - Уровень срочности (UrgencyLevel)
 * @property {string|null} lastSaleDate - ISO дата последней продажи
 * @property {string} firstStockedDate - ISO дата поступления на склад
 */

/**
 * @typedef {Object} ProductReturnProduct
 * @property {number} id - ID продукта
 * @property {string} name - Название продукта
 * @property {string} image - URL основного изображения
 * @property {string[]} [images] - Массив всех изображений
 */

/**
 * @typedef {Object} ProductReturnSupplier
 * @property {number} id - ID поставщика
 * @property {string} companyName - Название компании
 * @property {string} contactPerson - Контактное лицо
 * @property {string} phone - Телефон
 * @property {Object} user - Данные пользователя
 * @property {number} user.id - ID пользователя
 * @property {string} user.email - Email пользователя
 */

/**
 * @typedef {Object} ProductReturnWarehouse
 * @property {number} id - ID склада
 * @property {string} name - Название склада
 * @property {string} address - Адрес склада
 * @property {Object} [district] - Район
 * @property {string} district.name - Название района
 */

/**
 * @typedef {Object} ProductReturn
 * @property {number} id - ID возврата
 * @property {number} productId - ID продукта
 * @property {ProductReturnProduct} [product] - Данные продукта
 * @property {number} supplierId - ID поставщика
 * @property {ProductReturnSupplier} [supplier] - Данные поставщика
 * @property {number} warehouseId - ID склада
 * @property {ProductReturnWarehouse} [warehouse] - Данные склада
 * @property {number} quantity - Количество коробок для возврата
 * @property {string} status - Статус возврата (ProductReturnStatus)
 * @property {string} reason - Причина возврата
 * @property {number|null} daysSinceLastSale - Дней без продаж на момент создания
 * @property {number|null} requestedBy - ID пользователя, создавшего запрос
 * @property {string} requestedAt - ISO дата создания запроса
 * @property {number|null} approvedBy - ID пользователя, одобрившего
 * @property {string|null} approvedAt - ISO дата одобрения
 * @property {number|null} completedBy - ID пользователя, завершившего
 * @property {string|null} completedAt - ISO дата завершения
 * @property {number|null} rejectedBy - ID пользователя, отклонившего
 * @property {string|null} rejectedAt - ISO дата отклонения
 * @property {string|null} rejectionReason - Причина отклонения
 * @property {string|null} notes - Дополнительные заметки
 */

/**
 * @typedef {Object} ReturnStatistics
 * @property {number} totalReturns - Общее количество возвратов
 * @property {Object} byStatus - Количество возвратов по статусам
 * @property {number} byStatus.PENDING
 * @property {number} byStatus.APPROVED
 * @property {number} byStatus.IN_PROGRESS
 * @property {number} byStatus.COMPLETED
 * @property {number} byStatus.REJECTED
 * @property {number} byStatus.CANCELLED
 * @property {number} totalQuantityReturned - Общее количество коробок возвращено
 * @property {Array<Object>} [topSuppliers] - Топ поставщиков по возвратам
 * @property {Array<Object>} [topProducts] - Топ товаров по возвратам
 * @property {Array<Object>} [byWarehouse] - Статистика по складам
 */

// ==================== УТИЛИТЫ ====================

/**
 * Определяет уровень срочности по количеству дней без продаж
 * @param {number} daysSinceLastSale - Количество дней без продаж
 * @returns {string} Уровень срочности из UrgencyLevel
 */
export const getUrgencyLevel = (daysSinceLastSale) => {
  if (daysSinceLastSale >= 30) return UrgencyLevel.CRITICAL;
  if (daysSinceLastSale >= 21) return UrgencyLevel.HIGH;
  if (daysSinceLastSale >= 14) return UrgencyLevel.MEDIUM;
  return UrgencyLevel.LOW;
};

/**
 * Получает русский лейбл для статуса возврата
 * @param {string} status - Статус из ProductReturnStatus
 * @returns {string} Русский лейбл статуса
 */
export const getReturnStatusLabel = (status) => {
  return RETURN_STATUS_LABELS[status] || 'Неизвестный статус';
};

/**
 * Получает цвет для статуса возврата
 * @param {string} status - Статус из ProductReturnStatus
 * @returns {string} Hex-код цвета
 */
export const getReturnStatusColor = (status) => {
  return RETURN_STATUS_COLORS[status] || '#8E8E93';
};

/**
 * Получает русский лейбл для уровня срочности
 * @param {string} level - Уровень из UrgencyLevel
 * @returns {string} Русский лейбл уровня
 */
export const getUrgencyLevelLabel = (level) => {
  return URGENCY_LEVEL_LABELS[level] || 'Неизвестный';
};

/**
 * Получает цвет для уровня срочности
 * @param {string} level - Уровень из UrgencyLevel
 * @returns {string} Hex-код цвета
 */
export const getUrgencyLevelColor = (level) => {
  return URGENCY_LEVEL_COLORS[level] || '#8E8E93';
};

/**
 * Получает иконку (эмодзи) для уровня срочности
 * @param {string} level - Уровень из UrgencyLevel
 * @returns {string} Эмодзи иконка
 */
export const getUrgencyLevelIcon = (level) => {
  return URGENCY_LEVEL_ICONS[level] || '⚪';
};

/**
 * Форматирует номер возврата в читаемый формат
 * @param {number} returnId - ID возврата
 * @returns {string} Отформатированный номер (например, "RET-000123")
 */
export const formatReturnNumber = (returnId) => {
  return `RET-${String(returnId).padStart(6, '0')}`;
};

/**
 * Форматирует количество дней без продаж в читаемую строку
 * @param {number} days - Количество дней
 * @returns {string} Отформатированная строка
 */
export const formatDaysSinceLastSale = (days) => {
  if (days === 0) return 'Сегодня';
  if (days === 1) return '1 день назад';
  if (days >= 2 && days <= 4) return `${days} дня назад`;
  if (days >= 5 && days < 21) return `${days} дней назад`;
  if (days >= 21 && days < 30) return `${days} дней назад ⚠️`;
  return `${days} дней назад 🔴`;
};

/**
 * Проверяет, может ли пользователь одобрить возврат
 * @param {ProductReturn} productReturn - Данные возврата
 * @param {string} userRole - Роль пользователя
 * @returns {boolean} true если может одобрить
 */
export const canApproveReturn = (productReturn, userRole) => {
  return (
    userRole === 'ADMIN' &&
    productReturn?.status === ProductReturnStatus.PENDING
  );
};

/**
 * Проверяет, может ли пользователь отклонить возврат
 * @param {ProductReturn} productReturn - Данные возврата
 * @param {string} userRole - Роль пользователя
 * @returns {boolean} true если может отклонить
 */
export const canRejectReturn = (productReturn, userRole) => {
  return (
    userRole === 'ADMIN' &&
    productReturn?.status === ProductReturnStatus.PENDING
  );
};

/**
 * Проверяет, может ли пользователь завершить возврат
 * @param {ProductReturn} productReturn - Данные возврата
 * @param {string} userRole - Роль пользователя
 * @returns {boolean} true если может завершить
 */
export const canCompleteReturn = (productReturn, userRole) => {
  return (
    ['ADMIN', 'EMPLOYEE'].includes(userRole) &&
    [ProductReturnStatus.APPROVED, ProductReturnStatus.IN_PROGRESS].includes(
      productReturn?.status
    )
  );
};

/**
 * Валидирует данные возврата перед отправкой на сервер
 * @param {Object} returnData - Данные возврата для валидации
 * @param {number} returnData.productId - ID продукта
 * @param {number} returnData.warehouseId - ID склада
 * @param {number} returnData.quantity - Количество
 * @param {string} returnData.reason - Причина
 * @returns {{isValid: boolean, errors: string[]}} Результат валидации
 */
export const validateReturnData = (returnData) => {
  const errors = [];

  if (!returnData.productId) {
    errors.push('Не указан продукт');
  }

  if (!returnData.warehouseId) {
    errors.push('Не указан склад');
  }

  if (!returnData.quantity || returnData.quantity <= 0) {
    errors.push('Некорректное количество');
  }

  if (!returnData.reason || returnData.reason.trim().length === 0) {
    errors.push('Не указана причина возврата');
  }

  if (returnData.reason && returnData.reason.trim().length < 10) {
    errors.push('Причина возврата слишком короткая (минимум 10 символов)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Группирует возвраты по статусу
 * @param {ProductReturn[]} returns - Массив возвратов
 * @returns {Object<string, ProductReturn[]>} Объект с группами возвратов по статусам
 */
export const groupReturnsByStatus = (returns) => {
  return returns.reduce((acc, returnItem) => {
    const status = returnItem.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(returnItem);
    return acc;
  }, {});
};

/**
 * Фильтрует возвраты по различным критериям
 * @param {ProductReturn[]} returns - Массив возвратов
 * @param {Object} filters - Объект с фильтрами
 * @param {string|string[]} [filters.status] - Статус или массив статусов
 * @param {number} [filters.warehouseId] - ID склада
 * @param {number} [filters.supplierId] - ID поставщика
 * @param {string} [filters.dateFrom] - Дата от (ISO)
 * @param {string} [filters.dateTo] - Дата до (ISO)
 * @returns {ProductReturn[]} Отфильтрованный массив возвратов
 */
export const filterReturns = (returns, filters = {}) => {
  return returns.filter(returnItem => {
    // Фильтр по статусу
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        if (!filters.status.includes(returnItem.status)) return false;
      } else if (returnItem.status !== filters.status) {
        return false;
      }
    }

    // Фильтр по складу
    if (filters.warehouseId && returnItem.warehouseId !== filters.warehouseId) {
      return false;
    }

    // Фильтр по поставщику
    if (filters.supplierId && returnItem.supplierId !== filters.supplierId) {
      return false;
    }

    // Фильтр по дате (от)
    if (filters.dateFrom) {
      const returnDate = new Date(returnItem.requestedAt);
      const fromDate = new Date(filters.dateFrom);
      if (returnDate < fromDate) return false;
    }

    // Фильтр по дате (до)
    if (filters.dateTo) {
      const returnDate = new Date(returnItem.requestedAt);
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (returnDate > toDate) return false;
    }

    return true;
  });
};

/**
 * Сортирует возвраты по указанному полю
 * @param {ProductReturn[]} returns - Массив возвратов
 * @param {string} sortBy - Поле для сортировки
 * @param {string} sortOrder - Порядок сортировки ('asc' | 'desc')
 * @returns {ProductReturn[]} Отсортированный массив
 */
export const sortReturns = (returns, sortBy = 'requestedAt', sortOrder = 'desc') => {
  const sortedReturns = [...returns];

  sortedReturns.sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
      case 'requestedAt':
        aValue = new Date(a.requestedAt || 0);
        bValue = new Date(b.requestedAt || 0);
        break;
      case 'status':
        aValue = a.status || '';
        bValue = b.status || '';
        break;
      case 'quantity':
        aValue = a.quantity || 0;
        bValue = b.quantity || 0;
        break;
      case 'daysSinceLastSale':
        aValue = a.daysSinceLastSale || 0;
        bValue = b.daysSinceLastSale || 0;
        break;
      default:
        return 0;
    }

    if (sortOrder === 'desc') {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    } else {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    }
  });

  return sortedReturns;
};

/**
 * Вычисляет статистику для массива возвратов
 * @param {ProductReturn[]} returns - Массив возвратов
 * @returns {Object} Объект со статистикой
 */
export const calculateReturnsStats = (returns) => {
  if (!returns || !returns.length) {
    return {
      totalReturns: 0,
      totalQuantity: 0,
      byStatus: {},
    };
  }

  const totalReturns = returns.length;
  const totalQuantity = returns.reduce((sum, r) => sum + (r.quantity || 0), 0);

  const byStatus = returns.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return {
    totalReturns,
    totalQuantity,
    byStatus,
  };
};

/**
 * Форматирует дату в читаемый формат
 * @param {string|Date} date - Дата для форматирования
 * @param {boolean} [includeTime=false] - Включать ли время
 * @returns {string} Отформатированная дата
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return '';
  
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  if (includeTime) {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }
  
  return `${day}.${month}.${year}`;
};

/**
 * Проверяет, является ли возврат активным (не завершен)
 * @param {ProductReturn} productReturn - Данные возврата
 * @returns {boolean} true если возврат активный
 */
export const isActiveReturn = (productReturn) => {
  return [
    ProductReturnStatus.PENDING,
    ProductReturnStatus.APPROVED,
    ProductReturnStatus.IN_PROGRESS
  ].includes(productReturn?.status);
};

/**
 * Проверяет, является ли возврат завершенным
 * @param {ProductReturn} productReturn - Данные возврата
 * @returns {boolean} true если возврат завершен
 */
export const isCompletedReturn = (productReturn) => {
  return [
    ProductReturnStatus.COMPLETED,
    ProductReturnStatus.REJECTED,
    ProductReturnStatus.CANCELLED
  ].includes(productReturn?.status);
};

// Экспорт всех констант для удобства использования
export {
  ProductReturnStatus,
  UrgencyLevel,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_COLORS,
  URGENCY_LEVEL_LABELS,
  URGENCY_LEVEL_COLORS,
  URGENCY_LEVEL_ICONS
};

