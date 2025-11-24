// ===== ОСНОВНЫЕ ЭКСПОРТЫ МОДУЛЯ ВОЗВРАТОВ ТОВАРОВ =====

// Импорты утилит для использования в функциях
import {
  ProductReturnStatus,
  UrgencyLevel,
  getUrgencyLevel,
  formatReturnNumber,
  formatDaysSinceLastSale,
  canApproveReturn,
  canRejectReturn,
  canCompleteReturn,
  getReturnStatusLabel,
  getReturnStatusColor,
  getUrgencyLevelLabel,
  getUrgencyLevelColor,
  getUrgencyLevelIcon,
  validateReturnData,
  groupReturnsByStatus,
  filterReturns,
  sortReturns,
  calculateReturnsStats,
  formatDate,
  isActiveReturn,
  isCompletedReturn,
} from './lib/utils';

import { CONSTANTS } from './lib/constants';
import { returnStateHelpers } from './lib/helpers';

// ===== REDUCER =====

// Экспорт reducer
export { default as productReturnReducer } from './model/slice';

// ===== ACTIONS =====

// Actions из slice
export {
  // Async thunks
  fetchStagnantProducts,
  fetchProductReturns,
  fetchReturnDetail,
  createProductReturn,
  approveProductReturn,
  rejectProductReturn,
  completeProductReturn,
  startProductReturn,
  cancelProductReturn,
  fetchReturnStatistics,
  runStagnantCheck,
  
  // Sync actions
  setStagnantProductsFilters,
  resetStagnantProductsFilters,
  setProductReturnsFilters,
  resetProductReturnsFilters,
  clearStagnantProducts,
  clearProductReturns,
  clearReturnDetail,
  clearReturnStatistics,
  toggleProductSelection,
  clearProductSelection,
  selectAllProducts,
  toggleReturnSelection,
  clearReturnSelection,
  selectAllReturns,
  clearErrors,
} from './model/slice';

// ===== SELECTORS =====

// Основные селекторы для быстрого доступа
export {
  // Базовые селекторы
  selectProductReturnState,
  selectStagnantProducts,
  selectStagnantProductsLoading,
  selectStagnantProductsError,
  selectStagnantProductsFilters,
  selectStagnantProductsLastFetch,
  selectProductReturns,
  selectProductReturnsFormatted,
  selectProductReturnsLoading,
  selectProductReturnsError,
  selectProductReturnsFilters,
  selectProductReturnsPagination,
  selectProductReturnsLastFetch,
  selectReturnDetail,
  selectReturnDetailFormatted,
  selectReturnDetailLoading,
  selectReturnDetailError,
  selectReturnStatistics,
  selectReturnStatisticsLoading,
  selectReturnStatisticsError,
  selectProductReturnUI,
  selectIsCreatingReturn,
  selectIsApprovingReturn,
  selectIsRejectingReturn,
  selectIsCompletingReturn,
  selectSelectedProductIds,
  selectSelectedReturnIds,
  
  // Производные селекторы
  selectStagnantProductsByUrgency,
  selectStagnantProductsCounts,
  selectCriticalStagnantProducts,
  selectReturnsByStatus,
  selectReturnsCounts,
  selectActiveReturns,
  selectCompletedReturns,
  selectPendingReturns,
  selectSelectedStagnantProducts,
  selectSelectedReturns,
  selectHasSelectedProducts,
  selectHasSelectedReturns,
  selectTotalStagnantQuantity,
  selectTotalReturnsQuantity,
  selectHasCriticalProducts,
  selectHasPendingReturns,
  selectCanApproveReturn,
  selectCanCompleteReturn,
  selectCanRejectReturn,
  selectCanCancelReturn,
  selectStagnantProductsMeta,
  selectProductReturnsMeta,
  selectCanLoadMoreReturns,
  selectHasAnyData,
  selectHasAnyActivity,
} from './model/selectors';

// ===== API =====

// API клиенты
export { productReturnApi, default as ProductReturnApi } from './api/productReturnApi';

// Обработчики ошибок
export {
  ProductReturnApiError,
  handleApiError,
  createApiError,
  isAuthError,
  isForbiddenError,
  isValidationError,
  isNetworkError,
  getValidationErrors,
} from './api/errorHandler';

// ===== HOOKS =====

// Экспорт всех хуков
export {
  useReturnPermissions,
  useStagnantProducts,
  useProductReturns,
  useProductReturn,
  useCreateReturn,
} from './hooks';

// ===== UI COMPONENTS =====

// Экспорт UI компонентов
export {
  UrgencyLevelBadge,
  ReturnStatusBadge,
  StagnantProductCard,
  ProductReturnCard,
} from './ui';

// ===== КОНСТАНТЫ =====

// Экспорт констант
export {
  ProductReturnStatus,
  UrgencyLevel,
  CONSTANTS,
} from './lib/constants';

// ===== УТИЛИТЫ =====

// Утилиты форматирования и валидации
export {
  getUrgencyLevel,
  formatReturnNumber,
  formatDaysSinceLastSale,
  canApproveReturn,
  canRejectReturn,
  canCompleteReturn,
  getReturnStatusLabel,
  getReturnStatusColor,
  getUrgencyLevelLabel,
  getUrgencyLevelColor,
  getUrgencyLevelIcon,
  validateReturnData,
  groupReturnsByStatus,
  filterReturns,
  sortReturns,
  calculateReturnsStats,
  formatDate,
  isActiveReturn,
  isCompletedReturn,
} from './lib/utils';

// Хелперы для работы с состоянием
export { returnStateHelpers } from './lib/helpers';

// ===== ТИПЫ (JSDoc) =====

/**
 * @typedef {Object} StagnantProduct
 * @property {number} productId
 * @property {string} productName
 * @property {string} productImage
 * @property {number} supplierId
 * @property {string} supplierName
 * @property {number} warehouseId
 * @property {string} warehouseName
 * @property {number} quantity
 * @property {number} daysSinceLastSale
 * @property {string} urgencyLevel
 * @property {string|null} lastSaleDate
 * @property {string} firstStockedDate
 */

/**
 * @typedef {Object} ProductReturn
 * @property {number} id
 * @property {number} productId
 * @property {Object} [product]
 * @property {number} supplierId
 * @property {Object} [supplier]
 * @property {number} warehouseId
 * @property {Object} [warehouse]
 * @property {number} quantity
 * @property {string} status
 * @property {string} reason
 * @property {number|null} daysSinceLastSale
 * @property {number|null} requestedBy
 * @property {string} requestedAt
 * @property {number|null} approvedBy
 * @property {string|null} approvedAt
 * @property {number|null} completedBy
 * @property {string|null} completedAt
 * @property {number|null} rejectedBy
 * @property {string|null} rejectedAt
 * @property {string|null} rejectionReason
 * @property {string|null} notes
 */

/**
 * @typedef {Object} ReturnStatistics
 * @property {number} totalReturns
 * @property {Object} byStatus
 * @property {number} totalQuantityReturned
 * @property {Array<Object>} [topSuppliers]
 * @property {Array<Object>} [topProducts]
 * @property {Array<Object>} [byWarehouse]
 */

/**
 * @typedef {Object} StagnantProductsFilters
 * @property {number} [daysThreshold]
 * @property {number} [warehouseId]
 * @property {number} [supplierId]
 * @property {string} [urgencyLevel]
 * @property {string} [sortBy]
 * @property {string} [sortOrder]
 */

/**
 * @typedef {Object} ProductReturnsFilters
 * @property {string|string[]} [status]
 * @property {number} [warehouseId]
 * @property {number} [supplierId]
 * @property {string} [dateFrom]
 * @property {string} [dateTo]
 * @property {string} [sortBy]
 * @property {string} [sortOrder]
 * @property {number} [page]
 * @property {number} [limit]
 */

// ===== КОНФИГУРАЦИЯ ПО УМОЛЧАНИЮ =====

export const DEFAULT_RETURN_CONFIG = {
  // Кэширование
  cache: {
    expiryTime: 5 * 60 * 1000, // 5 минут
  },
  
  // Пагинация
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
  
  // Фильтры
  filters: {
    defaultDaysThreshold: 21,
  },
  
  // Автообновление
  autoRefresh: {
    enabled: false,
    interval: 60000, // 60 секунд
  },
};

// ===== ЭКСПОРТ ПО УМОЛЧАНИЮ =====

export default {
  // Константы
  ProductReturnStatus,
  UrgencyLevel,
  CONSTANTS,
  DEFAULT_RETURN_CONFIG,
  
  // Утилиты
  getUrgencyLevel,
  formatReturnNumber,
  formatDaysSinceLastSale,
  canApproveReturn,
  canRejectReturn,
  canCompleteReturn,
  getReturnStatusLabel,
  getReturnStatusColor,
  getUrgencyLevelLabel,
  getUrgencyLevelColor,
  getUrgencyLevelIcon,
  validateReturnData,
  groupReturnsByStatus,
  filterReturns,
  sortReturns,
  calculateReturnsStats,
  formatDate,
  isActiveReturn,
  isCompletedReturn,
  
  // Хелперы
  returnStateHelpers,
};

