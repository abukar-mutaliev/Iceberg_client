# Product Returns System - Technical Design Document (JavaScript)

## 📋 Содержание

1. [Обзор системы](#обзор-системы)
2. [Архитектура](#архитектура)
3. [Структура данных](#структура-данных)
4. [API интеграция](#api-интеграция)
5. [State Management](#state-management)
6. [Компоненты](#компоненты)
7. [Навигация](#навигация)
8. [Уведомления](#уведомления)
9. [Права доступа](#права-доступа)
10. [Производительность](#производительность)
11. [Тестирование](#тестирование)
12. [Чеклист реализации](#чеклист-реализации)

---

## 1. Обзор системы

### Цель
Система управления возвратом залежавшихся товаров поставщикам для освобождения складского пространства.

### Ключевые функции
- Автоматическое обнаружение залежавшихся товаров (21+ дней без продаж)
- Создание и управление запросами на возврат
- Уведомления для всех участников процесса
- Статистика и аналитика возвратов

### Роли пользователей
- **SUPPLIER** - просмотр своих залежавшихся товаров и возвратов
- **EMPLOYEE** - создание запросов, завершение возвратов
- **ADMIN** - полный доступ, одобрение/отклонение возвратов

---

## 2. Архитектура

### 2.1 Архитектура проекта (по образцу entities/order и entities/product)

```
mobile/src/
├── app/                          # Инициализация приложения
│   └── providers/
│       └── navigation/           # Роутинг для новых экранов
│
├── entities/                     # Бизнес-сущности
│   └── product-return/
│       ├── api/                  # API клиенты
│       │   ├── productReturnApi.js
│       │   ├── stagnantProductsApi.js
│       │   └── index.js
│       │
│       ├── hooks/                # Хуки для работы с возвратами
│       │   ├── useProductReturns.js
│       │   ├── useProductReturn.js
│       │   ├── useStagnantProducts.js
│       │   ├── useReturnPermissions.js
│       │   ├── useReturnStatistics.js
│       │   ├── useCreateReturn.js
│       │   ├── useApproveReturn.js
│       │   ├── useRejectReturn.js
│       │   ├── useCompleteReturn.js
│       │   └── index.js
│       │
│       ├── lib/                  # Утилиты и константы
│       │   ├── constants.js      # ProductReturnStatus, UrgencyLevel
│       │   ├── utils.js          # Форматирование, валидация
│       │   ├── helpers.js        # Вспомогательные функции
│       │   └── index.js
│       │
│       ├── model/                # Redux state management
│       │   ├── slice.js          # Redux slice с thunks
│       │   ├── selectors.js      # Мемоизированные селекторы
│       │   └── index.js
│       │
│       ├── ui/                   # UI компоненты
│       │   ├── UrgencyLevelBadge.jsx
│       │   ├── ReturnStatusBadge.jsx
│       │   ├── StagnantProductCard.jsx
│       │   ├── ProductReturnCard.jsx
│       │   ├── StagnantProductsList.jsx
│       │   ├── ProductReturnsList.jsx
│       │   ├── CreateReturnModal.jsx
│       │   ├── ApproveReturnModal.jsx
│       │   ├── RejectReturnModal.jsx
│       │   ├── CompleteReturnModal.jsx
│       │   ├── ReturnFilters.jsx
│       │   ├── ReturnStatistics.jsx
│       │   └── index.js
│       │
│       └── index.js              # Главный файл с экспортами
│
├── widgets/                      # Композитные блоки
│   ├── admin/
│   │   └── AdminReturnsSection/
│   │       ├── ui/
│   │       │   └── AdminReturnsSection.jsx
│   │       └── index.js
│   │
│   └── supplier/
│       └── SupplierReturnsWidget/
│           ├── ui/
│           │   └── SupplierReturnsWidget.jsx
│           └── index.js
│
└── screens/                      # Страницы
    └── product-return/
        ├── StagnantProductsScreen/
        │   ├── ui/
        │   │   └── StagnantProductsScreen.jsx
        │   └── index.js
        ├── ProductReturnsListScreen/
        │   ├── ui/
        │   │   └── ProductReturnsListScreen.jsx
        │   └── index.js
        ├── ProductReturnDetailScreen/
        │   ├── ui/
        │   │   └── ProductReturnDetailScreen.jsx
        │   └── index.js
        └── ReturnStatisticsScreen/
            ├── ui/
            │   └── ReturnStatisticsScreen.jsx
            └── index.js
```

### 2.2 Структура файлов entities/product-return/

```
entities/product-return/
│
├── api/                          # API клиенты
│   ├── productReturnApi.js       # Основной API для работы с возвратами
│   ├── stagnantProductsApi.js    # API для залежавшихся товаров
│   └── index.js                  # Экспорт всех API
│
├── hooks/                        # Хуки
│   ├── useProductReturns.js      # Хук для списка возвратов
│   ├── useProductReturn.js       # Хук для одного возврата
│   ├── useStagnantProducts.js    # Хук для залежавшихся товаров
│   ├── useReturnPermissions.js   # Хук для проверки прав
│   ├── useReturnStatistics.js    # Хук для статистики
│   ├── useCreateReturn.js        # Хук для создания возврата
│   ├── useApproveReturn.js       # Хук для одобрения
│   ├── useRejectReturn.js        # Хук для отклонения
│   ├── useCompleteReturn.js      # Хук для завершения
│   └── index.js                  # Экспорт всех хуков
│
├── lib/                          # Утилиты и константы
│   ├── constants.js              # Константы (статусы, уровни)
│   ├── utils.js                  # Утилиты (форматирование, валидация)
│   ├── helpers.js                # Вспомогательные функции
│   └── index.js                  # Экспорт утилит
│
├── model/                        # Redux state
│   ├── slice.js                  # Redux slice с async thunks
│   ├── selectors.js              # Селекторы с мемоизацией
│   └── index.js                  # Экспорт slice и actions
│
├── ui/                           # UI компоненты
│   ├── UrgencyLevelBadge.jsx     # Бейдж уровня критичности
│   ├── ReturnStatusBadge.jsx     # Бейдж статуса возврата
│   ├── StagnantProductCard.jsx   # Карточка залежавшегося товара
│   ├── ProductReturnCard.jsx     # Карточка возврата
│   ├── StagnantProductsList.jsx  # Список залежавшихся товаров
│   ├── ProductReturnsList.jsx    # Список возвратов
│   ├── CreateReturnModal.jsx     # Модалка создания возврата
│   ├── ApproveReturnModal.jsx    # Модалка одобрения
│   ├── RejectReturnModal.jsx     # Модалка отклонения
│   ├── CompleteReturnModal.jsx   # Модалка завершения
│   ├── ReturnFilters.jsx         # Фильтры для возвратов
│   ├── ReturnStatistics.jsx      # Статистика возвратов
│   └── index.js                  # Экспорт всех UI
│
└── index.js                      # ГЛАВНЫЙ файл с публичными экспортами
```

### 2.2 Диаграмма потоков данных

```
Server API
    ↓ HTTP/REST
API Client (productReturnApi.js)
    ↓
Redux Store (slice.js)
    ↓
Selectors (selectors.js)
    ↓
React Components
    ↓ User Actions
Action Creators
    ↓
Thunks (createAsyncThunk)
    ↓
API Client
    
Push Notifications → Notification Handler → Navigation → Components
```

---

## 3. Структура данных

### 3.1 Константы

```javascript
// mobile/src/entities/product-return/lib/constants.js

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
  CRITICAL: 'CRITICAL',  // 30+ дней
  HIGH: 'HIGH',          // 21-29 дней
  MEDIUM: 'MEDIUM',      // <21 дней
  LOW: 'LOW'             // <14 дней (опционально)
};

/**
 * Преобразование дней без продаж в уровень срочности
 * @param {number} daysSinceLastSale
 * @returns {string} UrgencyLevel
 */
export const getUrgencyLevel = (daysSinceLastSale) => {
  if (daysSinceLastSale >= 30) return UrgencyLevel.CRITICAL;
  if (daysSinceLastSale >= 21) return UrgencyLevel.HIGH;
  if (daysSinceLastSale >= 14) return UrgencyLevel.MEDIUM;
  return UrgencyLevel.LOW;
};
```

### 3.2 JSDoc типы

```javascript
// mobile/src/entities/product-return/lib/utils.js
// JSDoc типы определяются в этом файле вместе с утилитами

/**
 * @typedef {Object} StagnantProduct
 * @property {number} productId
 * @property {string} productName
 * @property {string} productImage
 * @property {number} supplierId
 * @property {string} supplierName
 * @property {number} warehouseId
 * @property {string} warehouseName
 * @property {number} quantity - Количество коробок
 * @property {number} daysSinceLastSale - Дней без продаж
 * @property {string} urgencyLevel - Уровень критичности (UrgencyLevel)
 * @property {string|null} lastSaleDate - ISO дата последней продажи
 * @property {string} firstStockedDate - ISO дата поступления на склад
 */

/**
 * @typedef {Object} ProductReturnProduct
 * @property {number} id
 * @property {string} name
 * @property {string} image
 * @property {string[]} [images]
 */

/**
 * @typedef {Object} ProductReturnSupplier
 * @property {number} id
 * @property {string} companyName
 * @property {string} contactPerson
 * @property {string} phone
 * @property {Object} user
 * @property {number} user.id
 * @property {string} user.email
 */

/**
 * @typedef {Object} ProductReturnWarehouse
 * @property {number} id
 * @property {string} name
 * @property {string} address
 * @property {Object} [district]
 * @property {string} district.name
 */

/**
 * @typedef {Object} ProductReturn
 * @property {number} id
 * @property {number} productId
 * @property {ProductReturnProduct} [product]
 * @property {number} supplierId
 * @property {ProductReturnSupplier} [supplier]
 * @property {number} warehouseId
 * @property {ProductReturnWarehouse} [warehouse]
 * @property {number} quantity - Количество коробок для возврата
 * @property {string} status - ProductReturnStatus
 * @property {string} reason - Причина возврата
 * @property {number|null} daysSinceLastSale - Дней без продаж на момент создания
 * @property {number|null} requestedBy
 * @property {string} requestedAt - ISO дата
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
 * @property {number} byStatus.PENDING
 * @property {number} byStatus.APPROVED
 * @property {number} byStatus.IN_PROGRESS
 * @property {number} byStatus.COMPLETED
 * @property {number} byStatus.REJECTED
 * @property {number} byStatus.CANCELLED
 * @property {number} totalQuantityReturned
 * @property {Array<{supplierId: number, supplierName: string, returnsCount: number, quantityReturned: number}>} [topSuppliers]
 * @property {Array<{productId: number, productName: string, returnsCount: number, quantityReturned: number}>} [topProducts]
 * @property {Array<{warehouseId: number, warehouseName: string, returnsCount: number}>} [byWarehouse]
 */

/**
 * @typedef {Object} StagnantProductsFilters
 * @property {number} [daysThreshold=21] - Минимум дней без продаж
 * @property {number} [warehouseId] - Фильтр по складу
 * @property {number} [supplierId] - Фильтр по поставщику
 * @property {string} [urgencyLevel] - UrgencyLevel
 * @property {'daysSinceLastSale'|'quantity'|'supplierName'} [sortBy]
 * @property {'asc'|'desc'} [sortOrder]
 */

/**
 * @typedef {Object} ProductReturnsFilters
 * @property {string|string[]} [status] - ProductReturnStatus
 * @property {number} [warehouseId]
 * @property {number} [supplierId]
 * @property {string} [dateFrom] - ISO дата
 * @property {string} [dateTo] - ISO дата
 * @property {'requestedAt'|'status'|'quantity'} [sortBy]
 * @property {'asc'|'desc'} [sortOrder]
 * @property {number} [page]
 * @property {number} [limit]
 */

/**
 * @typedef {Object} CreateReturnRequest
 * @property {number} productId
 * @property {number} warehouseId
 * @property {number} quantity - Количество коробок
 * @property {string} reason
 * @property {string} [notes]
 */

/**
 * @typedef {Object} ApproveReturnRequest
 * @property {number} returnId
 * @property {string} [notes]
 */

/**
 * @typedef {Object} RejectReturnRequest
 * @property {number} returnId
 * @property {string} rejectionReason
 */

/**
 * @typedef {Object} CompleteReturnRequest
 * @property {number} returnId
 * @property {string} [notes]
 */
```

### 3.3 Главный index.js (по образцу entities/order/index.js)

```javascript
// mobile/src/entities/product-return/index.js

// ===== ОСНОВНЫЕ ЭКСПОРТЫ МОДУЛЯ ВОЗВРАТОВ ТОВАРОВ =====

// Импорты для использования в функциях
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
  getUrgencyLevelColor
} from './lib/utils';

import { CONSTANTS } from './lib/constants';

// Slice и reducer
export { default as productReturnReducer } from './model/slice';

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
  fetchReturnStatistics,
  
  // Sync actions
  setStagnantProductsFilters,
  setProductReturnsFilters,
  clearReturnDetail,
  toggleProductSelection,
  clearProductSelection,
  toggleReturnSelection,
  clearReturnSelection,
} from './model/slice';

// Selectors
export {
  selectProductReturnState,
  selectStagnantProducts,
  selectStagnantProductsLoading,
  selectStagnantProductsError,
  selectProductReturns,
  selectProductReturnsLoading,
  selectProductReturnsPagination,
  selectReturnDetail,
  selectReturnDetailLoading,
  selectReturnStatistics,
  selectReturnStatisticsLoading,
  selectStagnantProductsByUrgency,
  selectStagnantProductsCounts,
  selectReturnsByStatus,
  selectReturnsCounts,
  selectActiveReturns,
  selectCompletedReturns,
  selectCanApproveReturn,
  selectCanCompleteReturn,
} from './model/selectors';

// Хуки
export {
  useProductReturns,
  useProductReturn,
  useStagnantProducts,
  useReturnPermissions,
  useReturnStatistics,
  useCreateReturn,
  useApproveReturn,
  useRejectReturn,
  useCompleteReturn,
} from './hooks';

// UI компоненты
export {
  UrgencyLevelBadge,
  ReturnStatusBadge,
  StagnantProductCard,
  ProductReturnCard,
  StagnantProductsList,
  ProductReturnsList,
  CreateReturnModal,
  ApproveReturnModal,
  RejectReturnModal,
  CompleteReturnModal,
  ReturnFilters,
  ReturnStatistics,
} from './ui';

// API
export { ProductReturnApi } from './api/productReturnApi';
export { StagnantProductsApi } from './api/stagnantProductsApi';

// Константы
export {
  ProductReturnStatus,
  UrgencyLevel,
  CONSTANTS,
} from './lib/constants';

// Утилиты
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
  validateReturnData,
  groupReturnsByStatus,
  filterReturns,
  sortReturns,
  calculateReturnsStats,
} from './lib/utils';

// Helpers
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

// ===== КОНФИГУРАЦИЯ ПО УМОЛЧАНИЮ =====

export const DEFAULT_RETURN_CONFIG = {
  cache: {
    expiryTime: 5 * 60 * 1000, // 5 минут
  },
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100
  },
  filters: {
    defaultDaysThreshold: 21,
  },
  autoRefresh: {
    enabled: false,
    interval: 60000, // 60 секунд
  }
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
};
```

---

## 4. API интеграция

### 4.1 API Client

```javascript
// mobile/src/entities/product-return/api/productReturnApi.js

import { api } from '@shared/api/api';

/**
 * API клиент для работы с возвратами товаров
 */
class ProductReturnApi {
  constructor() {
    this.baseUrl = '/product-returns';
  }

  /**
   * Получить список залежавшихся товаров
   * @param {import('../model/types').StagnantProductsFilters} [filters={}]
   * @returns {Promise<import('../model/types').StagnantProduct[]>}
   */
  async getStagnantProducts(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.daysThreshold) {
      params.append('daysThreshold', filters.daysThreshold.toString());
    }
    if (filters.warehouseId) {
      params.append('warehouseId', filters.warehouseId.toString());
    }
    if (filters.supplierId) {
      params.append('supplierId', filters.supplierId.toString());
    }
    if (filters.urgencyLevel) {
      params.append('urgencyLevel', filters.urgencyLevel);
    }
    if (filters.sortBy) {
      params.append('sortBy', filters.sortBy);
    }
    if (filters.sortOrder) {
      params.append('sortOrder', filters.sortOrder);
    }

    const response = await api.get(
      `${this.baseUrl}/stagnant?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Получить список возвратов
   * @param {import('../model/types').ProductReturnsFilters} [filters={}]
   * @returns {Promise<{returns: import('../model/types').ProductReturn[], pagination: {currentPage: number, totalPages: number, totalItems: number}}>}
   */
  async getReturns(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        filters.status.forEach(s => params.append('status[]', s));
      } else {
        params.append('status', filters.status);
      }
    }
    if (filters.warehouseId) {
      params.append('warehouseId', filters.warehouseId.toString());
    }
    if (filters.supplierId) {
      params.append('supplierId', filters.supplierId.toString());
    }
    if (filters.dateFrom) {
      params.append('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      params.append('dateTo', filters.dateTo);
    }
    if (filters.page) {
      params.append('page', filters.page.toString());
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }

    const response = await api.get(`${this.baseUrl}?${params.toString()}`);
    return response.data;
  }

  /**
   * Получить детали возврата
   * @param {number} returnId
   * @returns {Promise<import('../model/types').ProductReturn>}
   */
  async getReturnById(returnId) {
    const response = await api.get(`${this.baseUrl}/${returnId}`);
    return response.data;
  }

  /**
   * Создать запрос на возврат
   * @param {import('../model/types').CreateReturnRequest} data
   * @returns {Promise<import('../model/types').ProductReturn>}
   */
  async createReturn(data) {
    const response = await api.post(this.baseUrl, data);
    return response.data;
  }

  /**
   * Одобрить возврат (только ADMIN)
   * @param {import('../model/types').ApproveReturnRequest} data
   * @returns {Promise<import('../model/types').ProductReturn>}
   */
  async approveReturn(data) {
    const { returnId, ...body } = data;
    const response = await api.put(
      `${this.baseUrl}/${returnId}/approve`,
      body
    );
    return response.data;
  }

  /**
   * Отклонить возврат (только ADMIN)
   * @param {import('../model/types').RejectReturnRequest} data
   * @returns {Promise<import('../model/types').ProductReturn>}
   */
  async rejectReturn(data) {
    const { returnId, ...body } = data;
    const response = await api.put(
      `${this.baseUrl}/${returnId}/reject`,
      body
    );
    return response.data;
  }

  /**
   * Начать процесс возврата
   * @param {number} returnId
   * @returns {Promise<import('../model/types').ProductReturn>}
   */
  async startReturn(returnId) {
    const response = await api.put(`${this.baseUrl}/${returnId}/start`);
    return response.data;
  }

  /**
   * Завершить возврат (ADMIN, EMPLOYEE)
   * @param {import('../model/types').CompleteReturnRequest} data
   * @returns {Promise<import('../model/types').ProductReturn>}
   */
  async completeReturn(data) {
    const { returnId, ...body } = data;
    const response = await api.put(
      `${this.baseUrl}/${returnId}/complete`,
      body
    );
    return response.data;
  }

  /**
   * Получить статистику возвратов
   * @param {{supplierId?: number, dateFrom?: string, dateTo?: string}} [filters={}]
   * @returns {Promise<import('../model/types').ReturnStatistics>}
   */
  async getStatistics(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.supplierId) {
      params.append('supplierId', filters.supplierId.toString());
    }
    if (filters.dateFrom) {
      params.append('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      params.append('dateTo', filters.dateTo);
    }

    const response = await api.get(
      `${this.baseUrl}/statistics?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Запустить ручную проверку залежавшихся товаров (только ADMIN)
   * @returns {Promise<{totalStagnant: number, warningsSent: number, criticalAlertsSent: number}>}
   */
  async runStagnantCheck() {
    const response = await api.post(`${this.baseUrl}/check-stagnant`);
    return response.data;
  }
}

export const productReturnApi = new ProductReturnApi();
```

### 4.2 Error Handler

```javascript
// mobile/src/entities/product-return/api/errorHandler.js

/**
 * Класс ошибки API возвратов
 */
export class ProductReturnApiError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode]
   * @param {any} [response]
   */
  constructor(message, statusCode, response) {
    super(message);
    this.name = 'ProductReturnApiError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * Обработчик ошибок API
 * @param {any} error
 * @returns {string} Сообщение об ошибке
 */
export const handleApiError = (error) => {
  if (error.response) {
    // Сервер вернул ошибку
    const message = error.response.data?.message;
    
    switch (error.response.status) {
      case 400:
        return message || 'Неверные данные запроса';
      case 401:
        return 'Требуется авторизация';
      case 403:
        return 'Недостаточно прав для выполнения операции';
      case 404:
        return message || 'Запрашиваемый ресурс не найден';
      case 409:
        return message || 'Конфликт данных';
      case 500:
        return 'Ошибка сервера. Попробуйте позже';
      default:
        return message || 'Произошла ошибка';
    }
  } else if (error.request) {
    // Запрос не получил ответа
    return 'Нет связи с сервером. Проверьте подключение к интернету';
  } else {
    // Ошибка при настройке запроса
    return error.message || 'Произошла неизвестная ошибка';
  }
};
```

---

## 5. State Management (Redux)

### 5.1 Redux Slice

```javascript
// mobile/src/entities/product-return/model/slice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productReturnApi } from '../api/productReturnApi';
import { handleApiError } from '../api/errorHandler';

// ==================== НАЧАЛЬНОЕ СОСТОЯНИЕ ====================

const initialState = {
  // Залежавшиеся товары
  stagnantProducts: {
    items: [],
    filters: { daysThreshold: 21 },
    loading: false,
    error: null,
    lastFetch: null,
  },
  
  // Список возвратов
  returns: {
    items: [],
    filters: {},
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 20,
    },
    loading: false,
    error: null,
    lastFetch: null,
  },
  
  // Детали конкретного возврата
  returnDetail: {
    data: null,
    loading: false,
    error: null,
  },
  
  // Статистика
  statistics: {
    data: null,
    loading: false,
    error: null,
    filters: {},
  },
  
  // UI состояние
  ui: {
    isCreatingReturn: false,
    isApprovingReturn: false,
    isRejectingReturn: false,
    isCompletingReturn: false,
    selectedProductIds: [],
    selectedReturnIds: [],
  },
};

// ==================== ASYNC THUNKS ====================

/**
 * Загрузить залежавшиеся товары
 */
export const fetchStagnantProducts = createAsyncThunk(
  'productReturn/fetchStagnantProducts',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const data = await productReturnApi.getStagnantProducts(filters);
      return { data, filters };
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Загрузить список возвратов
 */
export const fetchProductReturns = createAsyncThunk(
  'productReturn/fetchProductReturns',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await productReturnApi.getReturns(filters);
      return { ...response, filters };
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Загрузить детали возврата
 */
export const fetchReturnDetail = createAsyncThunk(
  'productReturn/fetchReturnDetail',
  async (returnId, { rejectWithValue }) => {
    try {
      const data = await productReturnApi.getReturnById(returnId);
      return data;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Создать запрос на возврат
 */
export const createProductReturn = createAsyncThunk(
  'productReturn/createProductReturn',
  async (data, { rejectWithValue }) => {
    try {
      const result = await productReturnApi.createReturn(data);
      return result;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Одобрить возврат
 */
export const approveProductReturn = createAsyncThunk(
  'productReturn/approveProductReturn',
  async (data, { rejectWithValue }) => {
    try {
      const result = await productReturnApi.approveReturn(data);
      return result;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Отклонить возврат
 */
export const rejectProductReturn = createAsyncThunk(
  'productReturn/rejectProductReturn',
  async (data, { rejectWithValue }) => {
    try {
      const result = await productReturnApi.rejectReturn(data);
      return result;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Завершить возврат
 */
export const completeProductReturn = createAsyncThunk(
  'productReturn/completeProductReturn',
  async (data, { rejectWithValue }) => {
    try {
      const result = await productReturnApi.completeReturn(data);
      return result;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Загрузить статистику
 */
export const fetchReturnStatistics = createAsyncThunk(
  'productReturn/fetchReturnStatistics',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const data = await productReturnApi.getStatistics(filters);
      return { data, filters };
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// ==================== SLICE ====================

const productReturnSlice = createSlice({
  name: 'productReturn',
  initialState,
  reducers: {
    // Обновить фильтры залежавшихся товаров
    setStagnantProductsFilters: (state, action) => {
      state.stagnantProducts.filters = {
        ...state.stagnantProducts.filters,
        ...action.payload,
      };
    },

    // Обновить фильтры возвратов
    setProductReturnsFilters: (state, action) => {
      state.returns.filters = {
        ...state.returns.filters,
        ...action.payload,
      };
    },

    // Очистить детали возврата
    clearReturnDetail: (state) => {
      state.returnDetail = initialState.returnDetail;
    },

    // UI действия - выбор продуктов
    toggleProductSelection: (state, action) => {
      const index = state.ui.selectedProductIds.indexOf(action.payload);
      if (index > -1) {
        state.ui.selectedProductIds.splice(index, 1);
      } else {
        state.ui.selectedProductIds.push(action.payload);
      }
    },

    clearProductSelection: (state) => {
      state.ui.selectedProductIds = [];
    },

    // UI действия - выбор возвратов
    toggleReturnSelection: (state, action) => {
      const index = state.ui.selectedReturnIds.indexOf(action.payload);
      if (index > -1) {
        state.ui.selectedReturnIds.splice(index, 1);
      } else {
        state.ui.selectedReturnIds.push(action.payload);
      }
    },

    clearReturnSelection: (state) => {
      state.ui.selectedReturnIds = [];
    },
  },
  extraReducers: (builder) => {
    // ===== Залежавшиеся товары =====
    builder
      .addCase(fetchStagnantProducts.pending, (state) => {
        state.stagnantProducts.loading = true;
        state.stagnantProducts.error = null;
      })
      .addCase(fetchStagnantProducts.fulfilled, (state, action) => {
        state.stagnantProducts.loading = false;
        state.stagnantProducts.items = action.payload.data;
        state.stagnantProducts.filters = action.payload.filters;
        state.stagnantProducts.lastFetch = Date.now();
      })
      .addCase(fetchStagnantProducts.rejected, (state, action) => {
        state.stagnantProducts.loading = false;
        state.stagnantProducts.error = action.payload;
      });

    // ===== Список возвратов =====
    builder
      .addCase(fetchProductReturns.pending, (state) => {
        state.returns.loading = true;
        state.returns.error = null;
      })
      .addCase(fetchProductReturns.fulfilled, (state, action) => {
        state.returns.loading = false;
        state.returns.items = action.payload.returns;
        state.returns.pagination = action.payload.pagination;
        state.returns.filters = action.payload.filters;
        state.returns.lastFetch = Date.now();
      })
      .addCase(fetchProductReturns.rejected, (state, action) => {
        state.returns.loading = false;
        state.returns.error = action.payload;
      });

    // ===== Детали возврата =====
    builder
      .addCase(fetchReturnDetail.pending, (state) => {
        state.returnDetail.loading = true;
        state.returnDetail.error = null;
      })
      .addCase(fetchReturnDetail.fulfilled, (state, action) => {
        state.returnDetail.loading = false;
        state.returnDetail.data = action.payload;
      })
      .addCase(fetchReturnDetail.rejected, (state, action) => {
        state.returnDetail.loading = false;
        state.returnDetail.error = action.payload;
      });

    // ===== Создание возврата =====
    builder
      .addCase(createProductReturn.pending, (state) => {
        state.ui.isCreatingReturn = true;
      })
      .addCase(createProductReturn.fulfilled, (state, action) => {
        state.ui.isCreatingReturn = false;
        // Добавляем в начало списка
        state.returns.items.unshift(action.payload);
        state.returns.pagination.totalItems += 1;
      })
      .addCase(createProductReturn.rejected, (state) => {
        state.ui.isCreatingReturn = false;
      });

    // ===== Одобрение возврата =====
    builder
      .addCase(approveProductReturn.pending, (state) => {
        state.ui.isApprovingReturn = true;
      })
      .addCase(approveProductReturn.fulfilled, (state, action) => {
        state.ui.isApprovingReturn = false;
        // Обновляем в списке
        const index = state.returns.items.findIndex(
          (r) => r.id === action.payload.id
        );
        if (index > -1) {
          state.returns.items[index] = action.payload;
        }
        // Обновляем детали если открыты
        if (state.returnDetail.data?.id === action.payload.id) {
          state.returnDetail.data = action.payload;
        }
      })
      .addCase(approveProductReturn.rejected, (state) => {
        state.ui.isApprovingReturn = false;
      });

    // ===== Отклонение возврата =====
    builder
      .addCase(rejectProductReturn.pending, (state) => {
        state.ui.isRejectingReturn = true;
      })
      .addCase(rejectProductReturn.fulfilled, (state, action) => {
        state.ui.isRejectingReturn = false;
        const index = state.returns.items.findIndex(
          (r) => r.id === action.payload.id
        );
        if (index > -1) {
          state.returns.items[index] = action.payload;
        }
        if (state.returnDetail.data?.id === action.payload.id) {
          state.returnDetail.data = action.payload;
        }
      })
      .addCase(rejectProductReturn.rejected, (state) => {
        state.ui.isRejectingReturn = false;
      });

    // ===== Завершение возврата =====
    builder
      .addCase(completeProductReturn.pending, (state) => {
        state.ui.isCompletingReturn = true;
      })
      .addCase(completeProductReturn.fulfilled, (state, action) => {
        state.ui.isCompletingReturn = false;
        const index = state.returns.items.findIndex(
          (r) => r.id === action.payload.id
        );
        if (index > -1) {
          state.returns.items[index] = action.payload;
        }
        if (state.returnDetail.data?.id === action.payload.id) {
          state.returnDetail.data = action.payload;
        }
      })
      .addCase(completeProductReturn.rejected, (state) => {
        state.ui.isCompletingReturn = false;
      });

    // ===== Статистика =====
    builder
      .addCase(fetchReturnStatistics.pending, (state) => {
        state.statistics.loading = true;
        state.statistics.error = null;
      })
      .addCase(fetchReturnStatistics.fulfilled, (state, action) => {
        state.statistics.loading = false;
        state.statistics.data = action.payload.data;
        state.statistics.filters = action.payload.filters;
      })
      .addCase(fetchReturnStatistics.rejected, (state, action) => {
        state.statistics.loading = false;
        state.statistics.error = action.payload;
      });
  },
});

export const {
  setStagnantProductsFilters,
  setProductReturnsFilters,
  clearReturnDetail,
  toggleProductSelection,
  clearProductSelection,
  toggleReturnSelection,
  clearReturnSelection,
} = productReturnSlice.actions;

export default productReturnSlice.reducer;
```

### 5.2 Selectors

```javascript
// mobile/src/entities/product-return/model/selectors.js

import { createSelector } from '@reduxjs/toolkit';
import { ProductReturnStatus, UrgencyLevel } from './constants';

// ==================== БАЗОВЫЕ СЕЛЕКТОРЫ ====================

/** @param {import('@app/store/rootReducer').RootState} state */
export const selectProductReturnState = (state) => state.productReturn;

/** @param {import('@app/store/rootReducer').RootState} state */
export const selectStagnantProducts = (state) =>
  state.productReturn.stagnantProducts.items;

/** @param {import('@app/store/rootReducer').RootState} state */
export const selectStagnantProductsLoading = (state) =>
  state.productReturn.stagnantProducts.loading;

/** @param {import('@app/store/rootReducer').RootState} state */
export const selectStagnantProductsError = (state) =>
  state.productReturn.stagnantProducts.error;

/** @param {import('@app/store/rootReducer').RootState} state */
export const selectProductReturns = (state) =>
  state.productReturn.returns.items;

/** @param {import('@app/store/rootReducer').RootState} state */
export const selectProductReturnsLoading = (state) =>
  state.productReturn.returns.loading;

/** @param {import('@app/store/rootReducer').RootState} state */
export const selectProductReturnsPagination = (state) =>
  state.productReturn.returns.pagination;

/** @param {import('@app/store/rootReducer').RootState} state */
export const selectReturnDetail = (state) =>
  state.productReturn.returnDetail.data;

/** @param {import('@app/store/rootReducer').RootState} state */
export const selectReturnDetailLoading = (state) =>
  state.productReturn.returnDetail.loading;

/** @param {import('@app/store/rootReducer').RootState} state */
export const selectReturnStatistics = (state) =>
  state.productReturn.statistics.data;

/** @param {import('@app/store/rootReducer').RootState} state */
export const selectReturnStatisticsLoading = (state) =>
  state.productReturn.statistics.loading;

// ==================== ПРОИЗВОДНЫЕ СЕЛЕКТОРЫ ====================

/**
 * Залежавшиеся товары сгруппированные по уровню критичности
 */
export const selectStagnantProductsByUrgency = createSelector(
  [selectStagnantProducts],
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
 * Количество залежавшихся товаров по уровням
 */
export const selectStagnantProductsCounts = createSelector(
  [selectStagnantProductsByUrgency],
  (grouped) => ({
    total: Object.values(grouped).flat().length,
    critical: grouped.critical.length,
    high: grouped.high.length,
    medium: grouped.medium.length,
    low: grouped.low.length,
  })
);

/**
 * Возвраты сгруппированные по статусу
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
 * Проверка, можно ли одобрить возврат (только для ADMIN)
 * @param {number} returnId
 */
export const selectCanApproveReturn = (returnId) =>
  createSelector([selectReturnDetail], (returnDetail) => {
    if (!returnDetail || returnDetail.id !== returnId) return false;
    return returnDetail.status === ProductReturnStatus.PENDING;
  });

/**
 * Проверка, можно ли завершить возврат (ADMIN, EMPLOYEE)
 * @param {number} returnId
 */
export const selectCanCompleteReturn = (returnId) =>
  createSelector([selectReturnDetail], (returnDetail) => {
    if (!returnDetail || returnDetail.id !== returnId) return false;
    return [
      ProductReturnStatus.APPROVED,
      ProductReturnStatus.IN_PROGRESS,
    ].includes(returnDetail.status);
  });
```

---

## 6. Компоненты

### 6.1 UrgencyLevelBadge

```javascript
// mobile/src/entities/product-return/ui/UrgencyLevelBadge.jsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UrgencyLevel } from '../model/constants';

const URGENCY_STYLES = {
  [UrgencyLevel.CRITICAL]: {
    color: '#FF3B30',
    bg: '#FFEBEE',
    icon: '🔴',
    label: 'Критично',
  },
  [UrgencyLevel.HIGH]: {
    color: '#FF9500',
    bg: '#FFF3E0',
    icon: '🟠',
    label: 'Высокий',
  },
  [UrgencyLevel.MEDIUM]: {
    color: '#FFCC00',
    bg: '#FFF9C4',
    icon: '🟡',
    label: 'Средний',
  },
  [UrgencyLevel.LOW]: {
    color: '#34C759',
    bg: '#E8F5E9',
    icon: '🟢',
    label: 'Низкий',
  },
};

/**
 * Бейдж уровня критичности
 * @param {Object} props
 * @param {string} props.level - UrgencyLevel
 * @param {boolean} [props.showLabel=true]
 * @param {'small'|'medium'|'large'} [props.size='medium']
 */
export const UrgencyLevelBadge = ({
  level,
  showLabel = true,
  size = 'medium',
}) => {
  const config = URGENCY_STYLES[level];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg },
        size === 'small' && styles.containerSmall,
        size === 'large' && styles.containerLarge,
      ]}
    >
      <Text style={[styles.icon, size === 'small' && styles.iconSmall]}>
        {config.icon}
      </Text>
      {showLabel && (
        <Text
          style={[
            styles.label,
            { color: config.color },
            size === 'small' && styles.labelSmall,
          ]}
        >
          {config.label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  containerSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  containerLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  icon: {
    fontSize: 12,
    marginRight: 4,
  },
  iconSmall: {
    fontSize: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 10,
  },
});
```

### 6.2 ReturnStatusBadge

```javascript
// mobile/src/entities/product-return/ui/ReturnStatusBadge.jsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProductReturnStatus } from '../model/constants';

const STATUS_STYLES = {
  [ProductReturnStatus.PENDING]: {
    color: '#007AFF',
    bg: '#E3F2FD',
    icon: '⏳',
    label: 'Ожидает',
  },
  [ProductReturnStatus.APPROVED]: {
    color: '#34C759',
    bg: '#E8F5E9',
    icon: '✅',
    label: 'Одобрено',
  },
  [ProductReturnStatus.IN_PROGRESS]: {
    color: '#FF9500',
    bg: '#FFF3E0',
    icon: '🔄',
    label: 'В процессе',
  },
  [ProductReturnStatus.COMPLETED]: {
    color: '#5856D6',
    bg: '#EDE7F6',
    icon: '✨',
    label: 'Завершено',
  },
  [ProductReturnStatus.REJECTED]: {
    color: '#FF3B30',
    bg: '#FFEBEE',
    icon: '❌',
    label: 'Отклонено',
  },
  [ProductReturnStatus.CANCELLED]: {
    color: '#8E8E93',
    bg: '#F5F5F5',
    icon: '🚫',
    label: 'Отменено',
  },
};

/**
 * Бейдж статуса возврата
 * @param {Object} props
 * @param {string} props.status - ProductReturnStatus
 * @param {boolean} [props.showIcon=true]
 * @param {'small'|'medium'|'large'} [props.size='medium']
 */
export const ReturnStatusBadge = ({
  status,
  showIcon = true,
  size = 'medium',
}) => {
  const config = STATUS_STYLES[status];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg },
        size === 'small' && styles.containerSmall,
        size === 'large' && styles.containerLarge,
      ]}
    >
      {showIcon && (
        <Text style={[styles.icon, size === 'small' && styles.iconSmall]}>
          {config.icon}
        </Text>
      )}
      <Text
        style={[
          styles.label,
          { color: config.color },
          size === 'small' && styles.labelSmall,
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  containerSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  containerLarge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  icon: {
    fontSize: 14,
    marginRight: 5,
  },
  iconSmall: {
    fontSize: 12,
    marginRight: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 11,
  },
});
```

---

## 7. Навигация

### 7.1 Типы навигации

```javascript
// Добавить в mobile/src/app/providers/navigation/types.js

/**
 * @typedef {Object} AdminStackParamList
 * @property {Object} [StagnantProducts]
 * @property {number} [StagnantProducts.supplierId]
 * @property {number} [StagnantProducts.warehouseId]
 * @property {number} [StagnantProducts.daysThreshold]
 * 
 * @property {Object} [ProductReturnsList]
 * @property {string} [ProductReturnsList.status]
 * @property {number} [ProductReturnsList.supplierId]
 * 
 * @property {Object} ProductReturnDetail
 * @property {number} ProductReturnDetail.returnId
 * @property {string} [ProductReturnDetail.fromScreen]
 * 
 * @property {Object} [CreateReturnRequest]
 * @property {number} [CreateReturnRequest.productId]
 * @property {number} [CreateReturnRequest.warehouseId]
 * @property {boolean} [CreateReturnRequest.fromStagnantProducts]
 * 
 * @property {Object} [ReturnStatistics]
 * @property {number} [ReturnStatistics.supplierId]
 */

/**
 * @typedef {Object} ProfileStackParamList
 * @property {undefined} SupplierStagnantProducts
 * @property {undefined} SupplierReturns
 */
```

### 7.2 Добавление роутов

```javascript
// В mobile/src/app/providers/navigation/AppNavigator.jsx

// Импорты
import { StagnantProductsScreen } from '@screens/product-return/StagnantProductsScreen';
import { ProductReturnsListScreen } from '@screens/product-return/ProductReturnsListScreen';
import { ProductReturnDetailScreen } from '@screens/product-return/ProductReturnDetailScreen';
import { CreateReturnRequestScreen } from '@screens/product-return/CreateReturnRequestScreen';
import { ReturnStatisticsScreen } from '@screens/product-return/ReturnStatisticsScreen';

// Добавить в AdminStack
<AdminStack.Screen
  name="StagnantProducts"
  component={StagnantProductsScreen}
  options={{
    ...slideFromRight,
    headerShown: false,
    gestureEnabled: true,
  }}
/>
<AdminStack.Screen
  name="ProductReturnsList"
  component={ProductReturnsListScreen}
  options={{
    ...slideFromRight,
    headerShown: false,
    gestureEnabled: true,
  }}
/>
<AdminStack.Screen
  name="ProductReturnDetail"
  component={ProductReturnDetailScreen}
  options={{
    ...slideFromRight,
    headerShown: false,
    gestureEnabled: true,
  }}
/>
<AdminStack.Screen
  name="CreateReturnRequest"
  component={CreateReturnRequestScreen}
  options={{
    ...modalSlideFromBottom,
    headerShown: false,
    gestureEnabled: true,
    presentation: 'modal',
  }}
/>
<AdminStack.Screen
  name="ReturnStatistics"
  component={ReturnStatisticsScreen}
  options={{
    ...slideFromRight,
    headerShown: false,
    gestureEnabled: true,
  }}
/>

// Добавить в ProfileStack для поставщиков
<ProfileStack.Screen
  name="SupplierStagnantProducts"
  component={StagnantProductsScreen}
  options={{
    ...slideFromRight,
    headerShown: false,
    gestureEnabled: true,
  }}
/>
<ProfileStack.Screen
  name="SupplierReturns"
  component={ProductReturnsListScreen}
  options={{
    ...slideFromRight,
    headerShown: false,
    gestureEnabled: true,
  }}
/>
```

---

## 8. Права доступа

### 8.1 Hook для проверки прав

```javascript
// mobile/src/entities/product-return/hooks/useReturnPermissions.js

import { useAuth } from '@entities/auth/hooks/useAuth';
import { ProductReturnStatus } from '../lib/constants';

/**
 * Хук для проверки прав доступа к операциям с возвратами
 * @param {import('@entities/product-return/model/types').ProductReturn} [productReturn]
 */
export const useReturnPermissions = (productReturn) => {
  const { currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'ADMIN';
  const isEmployee = currentUser?.role === 'EMPLOYEE';
  const isSupplier = currentUser?.role === 'SUPPLIER';

  // Права на просмотр
  const canView = isAdmin || isEmployee || isSupplier;

  // Права на создание запроса
  const canCreate = isAdmin || isEmployee;

  // Права на одобрение (только ADMIN)
  const canApprove = 
    isAdmin && 
    productReturn?.status === ProductReturnStatus.PENDING;

  // Права на отклонение (только ADMIN)
  const canReject = 
    isAdmin && 
    productReturn?.status === ProductReturnStatus.PENDING;

  // Права на завершение (ADMIN, EMPLOYEE)
  const canComplete =
    (isAdmin || isEmployee) &&
    (productReturn?.status === ProductReturnStatus.APPROVED ||
      productReturn?.status === ProductReturnStatus.IN_PROGRESS);

  // Права на начало процесса
  const canStart =
    (isAdmin || isEmployee || isSupplier) &&
    productReturn?.status === ProductReturnStatus.APPROVED;

  return {
    canView,
    canCreate,
    canApprove,
    canReject,
    canComplete,
    canStart,
    isAdmin,
    isEmployee,
    isSupplier,
  };
};
```

---

## 9. Производительность

### 9.1 Кэширование и Helpers

```javascript
// mobile/src/entities/product-return/lib/helpers.js

const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

/**
 * Проверяет, нужно ли обновить кэшированные данные
 * @param {number|null} lastFetch
 * @returns {boolean}
 */
export const shouldRefreshData = (lastFetch) => {
  if (!lastFetch) return true;
  return Date.now() - lastFetch > CACHE_DURATION;
};

/**
 * Хелперы для работы с состоянием возвратов
 */
export const returnStateHelpers = {
  shouldRefreshData,
  
  /**
   * Проверяет валидность данных возврата
   */
  isValidReturnData: (data) => {
    return data && data.productId && data.warehouseId && data.quantity > 0;
  },
  
  /**
   * Форматирует данные для отправки на сервер
   */
  prepareReturnData: (data) => {
    return {
      productId: data.productId,
      warehouseId: data.warehouseId,
      quantity: data.quantity,
      reason: data.reason || '',
      notes: data.notes || null,
    };
  },
};
```

### 9.2 Хук с кэшированием

```javascript
// mobile/src/entities/product-return/hooks/useStagnantProducts.js

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStagnantProducts } from '../model/slice';
import {
  selectStagnantProducts,
  selectStagnantProductsLoading,
  selectStagnantProductsError,
} from '../model/selectors';
import { shouldRefreshData } from '../lib/helpers';

/**
 * Хук для работы с залежавшимися товарами с кэшированием
 * @param {import('@entities/product-return/model/types').StagnantProductsFilters} [filters]
 * @param {boolean} [forceRefresh=false]
 */
export const useStagnantProducts = (filters = {}, forceRefresh = false) => {
  const dispatch = useDispatch();
  
  const products = useSelector(selectStagnantProducts);
  const loading = useSelector(selectStagnantProductsLoading);
  const error = useSelector(selectStagnantProductsError);
  const lastFetch = useSelector(
    (state) => state.productReturn.stagnantProducts.lastFetch
  );

  useEffect(() => {
    if (forceRefresh || shouldRefreshData(lastFetch)) {
      dispatch(fetchStagnantProducts(filters));
    }
  }, [dispatch, forceRefresh, lastFetch]);

  const refresh = () => {
    dispatch(fetchStagnantProducts(filters));
  };

  return {
    products,
    loading,
    error,
    refresh,
  };
};
```

---

## 10. Тестирование

### 10.1 Unit тесты для Redux

```javascript
// mobile/src/entities/product-return/model/__tests__/slice.test.js

import reducer, {
  fetchStagnantProducts,
  createProductReturn,
} from '../slice';
import { initialState } from '../initialState';

describe('productReturnSlice', () => {
  describe('fetchStagnantProducts', () => {
    it('should handle fetchStagnantProducts.pending', () => {
      const state = reducer(initialState, fetchStagnantProducts.pending());
      expect(state.stagnantProducts.loading).toBe(true);
      expect(state.stagnantProducts.error).toBe(null);
    });

    it('should handle fetchStagnantProducts.fulfilled', () => {
      const mockData = [
        { productId: 1, productName: 'Test', daysSinceLastSale: 25 },
      ];
      const action = {
        type: fetchStagnantProducts.fulfilled.type,
        payload: { data: mockData, filters: {} },
      };
      const state = reducer(initialState, action);
      
      expect(state.stagnantProducts.loading).toBe(false);
      expect(state.stagnantProducts.items).toEqual(mockData);
      expect(state.stagnantProducts.lastFetch).toBeGreaterThan(0);
    });

    it('should handle fetchStagnantProducts.rejected', () => {
      const action = {
        type: fetchStagnantProducts.rejected.type,
        payload: 'Test error',
      };
      const state = reducer(initialState, action);
      
      expect(state.stagnantProducts.loading).toBe(false);
      expect(state.stagnantProducts.error).toBe('Test error');
    });
  });
});
```

---

## 11. Чеклист реализации

### ✅ Фаза 1 - Основа (Week 1)
- [ ] Создать структуру папок `entities/product-return/`
- [ ] Создать константы (`constants.js`)
- [ ] Создать JSDoc типы (`types.js`)
- [ ] Создать API клиент (`productReturnApi.js`)
- [ ] Создать Error Handler (`errorHandler.js`)
- [ ] Создать Redux slice (`slice.js`)
- [ ] Создать Selectors (`selectors.js`)
- [ ] Интегрировать в root reducer
- [ ] Создать базовые UI компоненты (бейджи)

### ✅ Фаза 2 - Админ-панель (Week 2)
- [ ] Создать виджет `AdminReturnsSection`
- [ ] Интегрировать виджет в `AdminPanelScreen`
- [ ] Создать `StagnantProductsScreen`
- [ ] Создать `StagnantProductsList` компонент
- [ ] Создать `StagnantProductCard` компонент
- [ ] Создать `ProductReturnsListScreen`
- [ ] Создать `CreateReturnRequestScreen`
- [ ] Добавить навигацию в `AppNavigator`

### ✅ Фаза 3 - Детали и действия (Week 3)
- [ ] Создать `ProductReturnDetailScreen`
- [ ] Создать `ApproveReturnModal`
- [ ] Создать `RejectReturnModal`
- [ ] Создать `CompleteReturnModal`
- [ ] Реализовать hook `useReturnPermissions`
- [ ] Добавить обработку уведомлений
- [ ] Тестирование workflows

### ✅ Фаза 4 - Поставщики (Week 4)
- [ ] Создать `SupplierReturnsWidget`
- [ ] Интегрировать виджет в `SupplierScreen`
- [ ] Адаптировать экраны для поставщиков
- [ ] Добавить фильтрацию по поставщику
- [ ] Тестирование прав доступа

### ✅ Фаза 5 - Статистика (Week 5)
- [ ] Создать `ReturnStatisticsScreen`
- [ ] Создать `StatisticsCards` компонент
- [ ] Создать `StatisticsCharts` (графики)
- [ ] Создать `StatisticsTable` (таблицы)
- [ ] Добавить экспорт данных (опционально)

### ✅ Фаза 6 - Полировка (Week 6)
- [ ] Оптимизация производительности
- [ ] Добавить кэширование
- [ ] Unit тесты для Redux
- [ ] Integration тесты для компонентов
- [ ] Написать документацию
- [ ] QA тестирование
- [ ] Финальные правки

---

## Заключение

Данный технический документ описывает полную архитектуру системы управления возвратами товаров для мобильного приложения на **JavaScript с использованием JSDoc** для типизации.

**Ключевые принципы:**
- ✅ JavaScript с JSDoc для IDE подсказок
- ✅ Feature-Sliced Design для модульности
- ✅ Redux Toolkit для state management
- ✅ Мемоизация и кэширование для производительности
- ✅ Гибкая система прав доступа
- ✅ Понятная структура файлов

**Следующие шаги:**
1. ✅ Ревью архитектуры с командой
2. 📝 Создание прототипов UI
3. 🚀 Начало реализации по фазам
4. 👀 Регулярные code review
5. 🧪 Тестирование на каждом этапе

---

**Версия документа:** 2.0 (JavaScript)  
**Дата создания:** 28 октября 2025  
**Статус:** Ready for Implementation ✅
