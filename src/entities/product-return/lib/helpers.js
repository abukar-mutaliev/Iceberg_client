/**
 * Вспомогательные функции для работы с возвратами товаров
 * @module product-return/lib/helpers
 */

import { CONSTANTS } from './constants';

/**
 * Проверяет, нужно ли обновить кэшированные данные
 * @param {number|null} lastFetch - Время последней загрузки (timestamp)
 * @returns {boolean} true если кэш устарел
 */
export const shouldRefreshData = (lastFetch) => {
  if (!lastFetch) return true;
  return Date.now() - lastFetch > CONSTANTS.CACHE_DURATION;
};

/**
 * Проверяет валидность данных возврата для создания
 * @param {Object} data - Данные возврата
 * @returns {boolean} true если данные валидны
 */
const isValidReturnData = (data) => {
  return (
    data &&
    data.productId &&
    data.warehouseId &&
    data.quantity > 0 &&
    data.reason &&
    data.reason.trim().length >= 10
  );
};

/**
 * Форматирует данные возврата для отправки на сервер
 * @param {Object} data - Исходные данные
 * @returns {Object} Отформатированные данные
 */
const prepareReturnData = (data) => {
  return {
    productId: Number(data.productId),
    warehouseId: Number(data.warehouseId),
    quantity: Number(data.quantity),
    reason: data.reason.trim(),
    notes: data.notes ? data.notes.trim() : null,
  };
};

/**
 * Проверяет, истек ли кэш данных
 * @param {number|null} lastFetch - Время последней загрузки
 * @returns {boolean} true если кэш истек
 */
const isCacheExpired = (lastFetch) => {
  return shouldRefreshData(lastFetch);
};

/**
 * Вычисляет, сколько времени прошло с момента последнего обновления
 * @param {number|null} lastFetch - Время последней загрузки
 * @returns {number} Количество миллисекунд
 */
const getTimeSinceLastFetch = (lastFetch) => {
  if (!lastFetch) return Infinity;
  return Date.now() - lastFetch;
};

/**
 * Проверяет, нужно ли показывать индикатор загрузки
 * @param {boolean} isLoading - Флаг загрузки
 * @param {Array} items - Массив элементов
 * @returns {boolean} true если нужно показать индикатор
 */
const shouldShowLoader = (isLoading, items) => {
  return isLoading && (!items || items.length === 0);
};

/**
 * Проверяет, можно ли загрузить следующую страницу
 * @param {boolean} isLoading - Флаг загрузки
 * @param {number} currentPage - Текущая страница
 * @param {number} totalPages - Всего страниц
 * @returns {boolean} true если можно загрузить следующую страницу
 */
const canLoadMore = (isLoading, currentPage, totalPages) => {
  return !isLoading && currentPage < totalPages;
};

/**
 * Создает объект с метаинформацией о списке
 * @param {Array} items - Массив элементов
 * @param {boolean} isLoading - Флаг загрузки
 * @param {string|null} error - Ошибка
 * @returns {Object} Метаинформация
 */
const createListMeta = (items, isLoading, error) => {
  return {
    isEmpty: !isLoading && items.length === 0,
    hasError: Boolean(error),
    isLoading,
    count: items.length,
  };
};

/**
 * Хелперы для работы с состоянием возвратов
 * Экспортируется как объект для удобства использования
 */
export const returnStateHelpers = {
  // Кэширование
  shouldRefreshData,
  isCacheExpired,
  getTimeSinceLastFetch,
  
  // Валидация
  isValidReturnData,
  
  // Форматирование данных
  prepareReturnData,
  
  // UI хелперы
  shouldShowLoader,
  canLoadMore,
  createListMeta,
  
  /**
   * Проверяет, можно ли выполнить действие с возвратом
   * @param {Object} returnItem - Данные возврата
   * @param {string} action - Действие ('approve', 'reject', 'complete')
   * @param {string} userRole - Роль пользователя
   * @returns {boolean} true если действие доступно
   */
  canPerformAction: (returnItem, action, userRole) => {
    if (!returnItem) return false;
    
    const { status } = returnItem;
    
    switch (action) {
      case 'approve':
        return userRole === 'ADMIN' && status === 'PENDING';
      case 'reject':
        return userRole === 'ADMIN' && status === 'PENDING';
      case 'complete':
        return (
          ['ADMIN', 'EMPLOYEE'].includes(userRole) &&
          ['APPROVED', 'IN_PROGRESS'].includes(status)
        );
      case 'start':
        return (
          ['ADMIN', 'EMPLOYEE', 'SUPPLIER'].includes(userRole) &&
          status === 'APPROVED'
        );
      case 'cancel':
        return (
          userRole === 'ADMIN' &&
          ['PENDING', 'APPROVED'].includes(status)
        );
      default:
        return false;
    }
  },
  
  /**
   * Получает список доступных действий для возврата
   * @param {Object} returnItem - Данные возврата
   * @param {string} userRole - Роль пользователя
   * @returns {string[]} Массив доступных действий
   */
  getAvailableActions: (returnItem, userRole) => {
    if (!returnItem) return [];
    
    const actions = [];
    
    if (returnStateHelpers.canPerformAction(returnItem, 'approve', userRole)) {
      actions.push('approve');
    }
    if (returnStateHelpers.canPerformAction(returnItem, 'reject', userRole)) {
      actions.push('reject');
    }
    if (returnStateHelpers.canPerformAction(returnItem, 'complete', userRole)) {
      actions.push('complete');
    }
    if (returnStateHelpers.canPerformAction(returnItem, 'start', userRole)) {
      actions.push('start');
    }
    if (returnStateHelpers.canPerformAction(returnItem, 'cancel', userRole)) {
      actions.push('cancel');
    }
    
    return actions;
  },
  
  /**
   * Создает пустой объект фильтров с значениями по умолчанию
   * @returns {Object} Объект фильтров
   */
  createDefaultFilters: () => ({
    status: null,
    warehouseId: null,
    supplierId: null,
    dateFrom: null,
    dateTo: null,
    sortBy: 'requestedAt',
    sortOrder: 'desc',
    page: 1,
    limit: CONSTANTS.DEFAULT_PAGE_SIZE,
  }),
  
  /**
   * Объединяет фильтры, удаляя null и undefined значения
   * @param {Object} currentFilters - Текущие фильтры
   * @param {Object} newFilters - Новые фильтры
   * @returns {Object} Объединенные фильтры
   */
  mergeFilters: (currentFilters, newFilters) => {
    const merged = { ...currentFilters, ...newFilters };
    
    // Удаляем null и undefined
    Object.keys(merged).forEach(key => {
      if (merged[key] === null || merged[key] === undefined) {
        delete merged[key];
      }
    });
    
    return merged;
  },
};

