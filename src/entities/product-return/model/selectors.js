/**
 * Селекторы для доступа к состоянию возвратов товаров
 * @module product-return/model/selectors
 */

import { createSelector } from '@reduxjs/toolkit';
import { ProductReturnStatus, UrgencyLevel } from '../lib/constants';
import { getBaseUrl } from '@shared/api/api';

// ==================== БАЗОВЫЕ СЕЛЕКТОРЫ ====================

/**
 * Получить всё состояние модуля возвратов
 * @param {Object} state - Root state
 * @returns {Object} Состояние модуля возвратов
 */
export const selectProductReturnState = (state) => state.productReturn;

/**
 * Получить список залежавшихся товаров
 * @param {Object} state - Root state
 * @returns {Array} Список залежавшихся товаров
 */
export const selectStagnantProducts = (state) =>
  state.productReturn.stagnantProducts.items;

/**
 * Получить статус загрузки залежавшихся товаров
 * @param {Object} state - Root state
 * @returns {boolean} true если идёт загрузка
 */
export const selectStagnantProductsLoading = (state) =>
  state.productReturn.stagnantProducts.loading;

/**
 * Получить ошибку загрузки залежавшихся товаров
 * @param {Object} state - Root state
 * @returns {string|null} Сообщение об ошибке
 */
export const selectStagnantProductsError = (state) =>
  state.productReturn.stagnantProducts.error;

/**
 * Получить фильтры залежавшихся товаров
 * @param {Object} state - Root state
 * @returns {Object} Фильтры
 */
export const selectStagnantProductsFilters = (state) =>
  state.productReturn.stagnantProducts.filters;

/**
 * Получить время последней загрузки залежавшихся товаров
 * @param {Object} state - Root state
 * @returns {number|null} Timestamp
 */
export const selectStagnantProductsLastFetch = (state) =>
  state.productReturn.stagnantProducts.lastFetch;

/**
 * Получить список возвратов
 * @param {Object} state - Root state
 * @returns {Array} Список возвратов
 */
export const selectProductReturns = (state) =>
  state.productReturn.returns.items;

/**
 * Форматированный список возвратов с обработанными изображениями
 */
export const selectProductReturnsFormatted = createSelector(
  [selectProductReturns],
  (returns) => {
    return returns.map((returnItem) => {
      // Обрабатываем изображение товара
      let productImage = null;
      if (returnItem.product?.images) {
        const images = returnItem.product.images;
        if (Array.isArray(images) && images.length > 0) {
          productImage = formatImageUrl(images[0]);
        } else if (typeof images === 'string') {
          try {
            const parsed = JSON.parse(images);
            if (Array.isArray(parsed) && parsed.length > 0) {
              productImage = formatImageUrl(parsed[0]);
            }
          } catch {
            productImage = formatImageUrl(images);
          }
        }
      }

      return {
        ...returnItem,
        product: returnItem.product ? {
          ...returnItem.product,
          image: productImage,
        } : null,
      };
    });
  }
);

/**
 * Получить статус загрузки возвратов
 * @param {Object} state - Root state
 * @returns {boolean} true если идёт загрузка
 */
export const selectProductReturnsLoading = (state) =>
  state.productReturn.returns.loading;

/**
 * Получить ошибку загрузки возвратов
 * @param {Object} state - Root state
 * @returns {string|null} Сообщение об ошибке
 */
export const selectProductReturnsError = (state) =>
  state.productReturn.returns.error;

/**
 * Получить фильтры возвратов
 * @param {Object} state - Root state
 * @returns {Object} Фильтры
 */
export const selectProductReturnsFilters = (state) =>
  state.productReturn.returns.filters;

/**
 * Получить пагинацию возвратов
 * @param {Object} state - Root state
 * @returns {Object} Пагинация
 */
export const selectProductReturnsPagination = (state) =>
  state.productReturn.returns.pagination;

/**
 * Получить время последней загрузки возвратов
 * @param {Object} state - Root state
 * @returns {number|null} Timestamp
 */
export const selectProductReturnsLastFetch = (state) =>
  state.productReturn.returns.lastFetch;

/**
 * Получить детали возврата
 * @param {Object} state - Root state
 * @returns {Object|null} Данные возврата
 */
export const selectReturnDetail = (state) =>
  state.productReturn.returnDetail.data;

/**
 * Форматированные детали возврата с обработанными изображениями
 */
export const selectReturnDetailFormatted = createSelector(
  [selectReturnDetail],
  (returnDetail) => {
    if (!returnDetail) return null;

    // Обрабатываем изображение товара
    let productImage = null;
    if (returnDetail.product?.images) {
      const images = returnDetail.product.images;
      if (Array.isArray(images) && images.length > 0) {
        productImage = formatImageUrl(images[0]);
      } else if (typeof images === 'string') {
        try {
          const parsed = JSON.parse(images);
          if (Array.isArray(parsed) && parsed.length > 0) {
            productImage = formatImageUrl(parsed[0]);
          }
        } catch {
          productImage = formatImageUrl(images);
        }
      }
    }

    return {
      ...returnDetail,
      product: returnDetail.product ? {
        ...returnDetail.product,
        image: productImage,
      } : null,
    };
  }
);

/**
 * Получить статус загрузки деталей возврата
 * @param {Object} state - Root state
 * @returns {boolean} true если идёт загрузка
 */
export const selectReturnDetailLoading = (state) =>
  state.productReturn.returnDetail.loading;

/**
 * Получить ошибку загрузки деталей возврата
 * @param {Object} state - Root state
 * @returns {string|null} Сообщение об ошибке
 */
export const selectReturnDetailError = (state) =>
  state.productReturn.returnDetail.error;

/**
 * Получить статистику возвратов
 * @param {Object} state - Root state
 * @returns {Object|null} Статистика
 */
export const selectReturnStatistics = (state) =>
  state.productReturn.statistics.data;

/**
 * Получить статус загрузки статистики
 * @param {Object} state - Root state
 * @returns {boolean} true если идёт загрузка
 */
export const selectReturnStatisticsLoading = (state) =>
  state.productReturn.statistics.loading;

/**
 * Получить ошибку загрузки статистики
 * @param {Object} state - Root state
 * @returns {string|null} Сообщение об ошибке
 */
export const selectReturnStatisticsError = (state) =>
  state.productReturn.statistics.error;

/**
 * Получить UI состояние
 * @param {Object} state - Root state
 * @returns {Object} UI состояние
 */
export const selectProductReturnUI = (state) =>
  state.productReturn.ui;

/**
 * Получить статус создания возврата
 * @param {Object} state - Root state
 * @returns {boolean} true если идёт создание
 */
export const selectIsCreatingReturn = (state) =>
  state.productReturn.ui.isCreatingReturn;

/**
 * Получить статус одобрения возврата
 * @param {Object} state - Root state
 * @returns {boolean} true если идёт одобрение
 */
export const selectIsApprovingReturn = (state) =>
  state.productReturn.ui.isApprovingReturn;

/**
 * Получить статус отклонения возврата
 * @param {Object} state - Root state
 * @returns {boolean} true если идёт отклонение
 */
export const selectIsRejectingReturn = (state) =>
  state.productReturn.ui.isRejectingReturn;

/**
 * Получить статус завершения возврата
 * @param {Object} state - Root state
 * @returns {boolean} true если идёт завершение
 */
export const selectIsCompletingReturn = (state) =>
  state.productReturn.ui.isCompletingReturn;

/**
 * Получить ID выбранных продуктов
 * @param {Object} state - Root state
 * @returns {Array<number>} Массив ID продуктов
 */
export const selectSelectedProductIds = (state) =>
  state.productReturn.ui.selectedProductIds;

/**
 * Получить ID выбранных возвратов
 * @param {Object} state - Root state
 * @returns {Array<number>} Массив ID возвратов
 */
export const selectSelectedReturnIds = (state) =>
  state.productReturn.ui.selectedReturnIds;

// ==================== ПРОИЗВОДНЫЕ СЕЛЕКТОРЫ С МЕМОИЗАЦИЕЙ ====================

/**
 * Форматировать URL изображения
 */
const formatImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // Если уже полный URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Используем базовый URL из конфигурации API
  const baseUrl = getBaseUrl();
  return `${baseUrl}/uploads/${imagePath}`;
};

/**
 * Форматированные залежавшиеся товары с преобразованными полями для UI
 */
export const selectStagnantProductsFormatted = createSelector(
  [selectStagnantProducts],
  (products) => {
    return products.map((stock) => {
      // Получаем первое изображение
      let imageUrl = null;
      if (stock.product?.images) {
        if (Array.isArray(stock.product.images) && stock.product.images.length > 0) {
          imageUrl = stock.product.images[0];
        } else if (typeof stock.product.images === 'string') {
          try {
            const parsed = JSON.parse(stock.product.images);
            imageUrl = Array.isArray(parsed) ? parsed[0] : null;
          } catch {
            imageUrl = stock.product.images;
          }
        }
      }

      return {
        ...stock,
        // ID
        productId: stock.product?.id || stock.productId,
        warehouseId: stock.warehouseId || stock.warehouse?.id,
        // Изображение товара (первое из массива)
        productImage: formatImageUrl(imageUrl),
        // Название товара
        productName: stock.product?.name || 'Без названия',
        // Имя поставщика
        supplierName: stock.product?.supplier?.companyName || 'Неизвестный поставщик',
        // Название склада (с районом если есть)
        warehouseName: stock.warehouse?.district?.name 
          ? `${stock.warehouse.name} (${stock.warehouse.district.name})`
          : stock.warehouse?.name || 'Неизвестный склад',
        // Явно передаем критические поля
        daysSinceLastSale: stock.daysSinceLastSale || 0,
        urgencyLevel: stock.urgencyLevel || 'LOW',
        quantity: stock.quantity || 0,
        lastSaleDate: stock.lastSaleDate,
        firstStockedDate: stock.firstStockedDate,
      };
    });
  }
);

/**
 * Сгруппированные залежавшиеся товары по productId
 * Один товар может быть на нескольких складах - объединяем их в одну карточку
 */
export const selectGroupedStagnantProducts = createSelector(
  [selectStagnantProductsFormatted],
  (products) => {
    const grouped = {};
    
    products.forEach((stock) => {
      const productId = stock.productId;
      
      if (!grouped[productId]) {
        // Первая запись для этого товара
        grouped[productId] = {
          ...stock,
          warehouses: [{
            id: stock.warehouseId,
            name: stock.warehouseName,
            quantity: stock.quantity,
            daysSinceLastSale: stock.daysSinceLastSale,
            urgencyLevel: stock.urgencyLevel,
            lastSaleDate: stock.lastSaleDate,
            firstStockedDate: stock.firstStockedDate,
          }],
          // Берем максимальный уровень срочности
          maxUrgencyLevel: stock.urgencyLevel,
          // Максимальное количество дней без продаж
          maxDaysSinceLastSale: stock.daysSinceLastSale,
          // Общее количество на всех складах
          totalQuantity: stock.quantity,
        };
      } else {
        // Добавляем склад к существующему товару
        grouped[productId].warehouses.push({
          id: stock.warehouseId,
          name: stock.warehouseName,
          quantity: stock.quantity,
          daysSinceLastSale: stock.daysSinceLastSale,
          urgencyLevel: stock.urgencyLevel,
          lastSaleDate: stock.lastSaleDate,
          firstStockedDate: stock.firstStockedDate,
        });
        
        // Обновляем максимальные значения
        if (stock.daysSinceLastSale > grouped[productId].maxDaysSinceLastSale) {
          grouped[productId].maxDaysSinceLastSale = stock.daysSinceLastSale;
        }
        
        // Обновляем максимальный уровень срочности
        const urgencyPriority = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const currentPriority = urgencyPriority[grouped[productId].maxUrgencyLevel] || 0;
        const newPriority = urgencyPriority[stock.urgencyLevel] || 0;
        if (newPriority > currentPriority) {
          grouped[productId].maxUrgencyLevel = stock.urgencyLevel;
        }
        
        // Суммируем количество
        grouped[productId].totalQuantity += stock.quantity;
      }
    });
    
    // Преобразуем объект обратно в массив
    return Object.values(grouped).map(item => ({
      ...item,
      // Используем максимальные значения для отображения
      urgencyLevel: item.maxUrgencyLevel,
      daysSinceLastSale: item.maxDaysSinceLastSale,
      quantity: item.totalQuantity,
      warehousesCount: item.warehouses.length,
    }));
  }
);

/**
 * Залежавшиеся товары, сгруппированные по уровню критичности (на основе сгруппированных товаров)
 */
export const selectStagnantProductsByUrgency = createSelector(
  [selectGroupedStagnantProducts],
  (products) => {
    return {
      critical: products.filter((p) => p.urgencyLevel === UrgencyLevel.CRITICAL),
      high: products.filter((p) => p.urgencyLevel === UrgencyLevel.HIGH),
      medium: products.filter((p) => p.urgencyLevel === UrgencyLevel.MEDIUM),
      low: products.filter((p) => p.urgencyLevel === UrgencyLevel.LOW),
    };
  }
);

/**
 * Фильтрованные залежавшиеся товары (по уровню срочности на клиенте)
 */
export const selectFilteredStagnantProducts = createSelector(
  [selectGroupedStagnantProducts, selectStagnantProductsFilters],
  (products, filters) => {
    // Если фильтр по urgencyLevel не установлен, возвращаем все товары
    if (!filters.urgencyLevel) {
      return products;
    }
    
    // Фильтруем товары по уровню срочности на клиенте
    return products.filter((p) => p.urgencyLevel === filters.urgencyLevel);
  }
);

/**
 * Количество залежавшихся товаров по уровням критичности (на основе сгруппированных товаров)
 */
export const selectStagnantProductsCounts = createSelector(
  [selectGroupedStagnantProducts],
  (products) => {
    const critical = products.filter((p) => p.urgencyLevel === UrgencyLevel.CRITICAL).length;
    const high = products.filter((p) => p.urgencyLevel === UrgencyLevel.HIGH).length;
    const medium = products.filter((p) => p.urgencyLevel === UrgencyLevel.MEDIUM).length;
    const low = products.filter((p) => p.urgencyLevel === UrgencyLevel.LOW).length;
    
    return {
      critical,
      high,
      medium,
      low,
      total: critical + high + medium + low,
    };
  }
);

/**
 * Только критичные залежавшиеся товары (30+ дней)
 */
export const selectCriticalStagnantProducts = createSelector(
  [selectStagnantProducts],
  (products) => products.filter((p) => p.urgencyLevel === UrgencyLevel.CRITICAL)
);

/**
 * Возвраты, сгруппированные по статусу
 */
export const selectReturnsByStatus = createSelector(
  [selectProductReturns],
  (returns) => {
    return {
      pending: returns.filter((r) => r.status === ProductReturnStatus.PENDING),
      approved: returns.filter((r) => r.status === ProductReturnStatus.APPROVED),
      inProgress: returns.filter(
        (r) => r.status === ProductReturnStatus.IN_PROGRESS
      ),
      completed: returns.filter(
        (r) => r.status === ProductReturnStatus.COMPLETED
      ),
      rejected: returns.filter((r) => r.status === ProductReturnStatus.REJECTED),
      cancelled: returns.filter(
        (r) => r.status === ProductReturnStatus.CANCELLED
      ),
    };
  }
);

/**
 * Количество возвратов по статусам
 */
export const selectReturnsCounts = createSelector(
  [selectReturnsByStatus],
  (grouped) => ({
    total: Object.values(grouped).flat().length,
    pending: grouped.pending.length,
    approved: grouped.approved.length,
    inProgress: grouped.inProgress.length,
    completed: grouped.completed.length,
    rejected: grouped.rejected.length,
    cancelled: grouped.cancelled.length,
  })
);

/**
 * Активные возвраты (PENDING, APPROVED, IN_PROGRESS)
 */
export const selectActiveReturns = createSelector(
  [selectProductReturns],
  (returns) =>
    returns.filter((r) =>
      [
        ProductReturnStatus.PENDING,
        ProductReturnStatus.APPROVED,
        ProductReturnStatus.IN_PROGRESS,
      ].includes(r.status)
    )
);

/**
 * Завершенные возвраты (COMPLETED, REJECTED, CANCELLED)
 */
export const selectCompletedReturns = createSelector(
  [selectProductReturns],
  (returns) =>
    returns.filter((r) =>
      [
        ProductReturnStatus.COMPLETED,
        ProductReturnStatus.REJECTED,
        ProductReturnStatus.CANCELLED,
      ].includes(r.status)
    )
);

/**
 * Возвраты, ожидающие одобрения (только PENDING)
 */
export const selectPendingReturns = createSelector(
  [selectProductReturns],
  (returns) => returns.filter((r) => r.status === ProductReturnStatus.PENDING)
);

/**
 * Выбранные залежавшиеся товары
 */
export const selectSelectedStagnantProducts = createSelector(
  [selectStagnantProducts, selectSelectedProductIds],
  (products, selectedIds) =>
    products.filter((p) => selectedIds.includes(p.productId))
);

/**
 * Выбранные возвраты
 */
export const selectSelectedReturns = createSelector(
  [selectProductReturns, selectSelectedReturnIds],
  (returns, selectedIds) =>
    returns.filter((r) => selectedIds.includes(r.id))
);

/**
 * Есть ли выбранные продукты
 */
export const selectHasSelectedProducts = createSelector(
  [selectSelectedProductIds],
  (ids) => ids.length > 0
);

/**
 * Есть ли выбранные возвраты
 */
export const selectHasSelectedReturns = createSelector(
  [selectSelectedReturnIds],
  (ids) => ids.length > 0
);

/**
 * Общее количество коробок в залежавшихся товарах
 */
export const selectTotalStagnantQuantity = createSelector(
  [selectStagnantProducts],
  (products) => products.reduce((sum, p) => sum + p.quantity, 0)
);

/**
 * Общее количество коробок в возвратах
 */
export const selectTotalReturnsQuantity = createSelector(
  [selectProductReturns],
  (returns) => returns.reduce((sum, r) => sum + r.quantity, 0)
);

/**
 * Есть ли критичные залежавшиеся товары
 */
export const selectHasCriticalProducts = createSelector(
  [selectCriticalStagnantProducts],
  (products) => products.length > 0
);

/**
 * Есть ли возвраты, ожидающие одобрения
 */
export const selectHasPendingReturns = createSelector(
  [selectPendingReturns],
  (returns) => returns.length > 0
);

/**
 * Проверка, можно ли одобрить возврат (фабрика селектора)
 * @param {number} returnId - ID возврата
 */
export const selectCanApproveReturn = (returnId) =>
  createSelector([selectReturnDetail], (returnDetail) => {
    if (!returnDetail || returnDetail.id !== returnId) return false;
    return returnDetail.status === ProductReturnStatus.PENDING;
  });

/**
 * Проверка, можно ли завершить возврат (фабрика селектора)
 * @param {number} returnId - ID возврата
 */
export const selectCanCompleteReturn = (returnId) =>
  createSelector([selectReturnDetail], (returnDetail) => {
    if (!returnDetail || returnDetail.id !== returnId) return false;
    return [
      ProductReturnStatus.APPROVED,
      ProductReturnStatus.IN_PROGRESS,
    ].includes(returnDetail.status);
  });

/**
 * Проверка, можно ли отклонить возврат (фабрика селектора)
 * @param {number} returnId - ID возврата
 */
export const selectCanRejectReturn = (returnId) =>
  createSelector([selectReturnDetail], (returnDetail) => {
    if (!returnDetail || returnDetail.id !== returnId) return false;
    return returnDetail.status === ProductReturnStatus.PENDING;
  });

/**
 * Проверка, можно ли отменить возврат (фабрика селектора)
 * @param {number} returnId - ID возврата
 */
export const selectCanCancelReturn = (returnId) =>
  createSelector([selectReturnDetail], (returnDetail) => {
    if (!returnDetail || returnDetail.id !== returnId) return false;
    return [
      ProductReturnStatus.PENDING,
      ProductReturnStatus.APPROVED,
    ].includes(returnDetail.status);
  });

/**
 * Метаинформация о списке залежавшихся товаров
 */
export const selectStagnantProductsMeta = createSelector(
  [
    selectStagnantProducts,
    selectStagnantProductsLoading,
    selectStagnantProductsError,
  ],
  (products, loading, error) => ({
    isEmpty: !loading && products.length === 0,
    hasError: Boolean(error),
    isLoading: loading,
    count: products.length,
  })
);

/**
 * Метаинформация о списке возвратов
 */
export const selectProductReturnsMeta = createSelector(
  [
    selectProductReturns,
    selectProductReturnsLoading,
    selectProductReturnsError,
    selectProductReturnsPagination,
  ],
  (returns, loading, error, pagination) => ({
    isEmpty: !loading && returns.length === 0,
    hasError: Boolean(error),
    isLoading: loading,
    count: returns.length,
    hasMore: pagination.currentPage < pagination.totalPages,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
  })
);

/**
 * Можно ли загрузить следующую страницу возвратов
 */
export const selectCanLoadMoreReturns = createSelector(
  [selectProductReturnsLoading, selectProductReturnsPagination],
  (loading, pagination) =>
    !loading && pagination.currentPage < pagination.totalPages
);

/**
 * Есть ли какие-либо данные (для отображения пустого состояния)
 */
export const selectHasAnyData = createSelector(
  [selectStagnantProducts, selectProductReturns],
  (stagnantProducts, returns) =>
    stagnantProducts.length > 0 || returns.length > 0
);

/**
 * Есть ли какая-либо активность (загрузка или операции)
 */
export const selectHasAnyActivity = createSelector(
  [
    selectStagnantProductsLoading,
    selectProductReturnsLoading,
    selectReturnDetailLoading,
    selectIsCreatingReturn,
    selectIsApprovingReturn,
    selectIsRejectingReturn,
    selectIsCompletingReturn,
  ],
  (...activities) => activities.some(Boolean)
);

