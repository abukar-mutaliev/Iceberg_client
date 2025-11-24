# Product Returns System - Implementation Tasks

**Дата создания:** 28 октября 2025  
**Статус:** В разработке  
**Основа:** `PRODUCT_RETURNS_DESIGN.md`

---

## 📋 Содержание

1. [Обзор задач](#обзор-задач)
2. [Фаза 1: Базовая инфраструктура](#фаза-1-базовая-инфраструктура)
3. [Фаза 2: Redux State Management](#фаза-2-redux-state-management)
4. [Фаза 3: API интеграция](#фаза-3-api-интеграция)
5. [Фаза 4: UI компоненты](#фаза-4-ui-компоненты)
6. [Фаза 5: Хуки](#фаза-5-хуки)
7. [Фаза 6: Экраны](#фаза-6-экраны)
8. [Фаза 7: Интеграция в админ-панель](#фаза-7-интеграция-в-админ-панель)
9. [Фаза 8: Интеграция для поставщиков](#фаза-8-интеграция-для-поставщиков)
10. [Фаза 9: Навигация](#фаза-9-навигация)
11. [Фаза 10: Тестирование и полировка](#фаза-10-тестирование-и-полировка)

---

## Обзор задач

### Общая статистика
- **Всего задач:** ~50
- **Файлов для создания:** ~35
- **Файлов для модификации:** ~5
- **Оценка времени:** 6-8 недель

### Приоритеты
1. 🔴 **Критично** - Базовая функциональность
2. 🟡 **Высокий** - Важные функции
3. 🟢 **Средний** - Улучшения UX
4. ⚪ **Низкий** - Дополнительные функции

---

## Фаза 1: Базовая инфраструктура

**Цель:** Создать базовую структуру entity `product-return`  
**Время:** 2-3 дня  
**Приоритет:** 🔴 Критично

### Задача 1.1: Создать структуру папок
**Файл:** Структура директорий  
**Действие:** Создать

```bash
mkdir -p mobile/src/entities/product-return/api
mkdir -p mobile/src/entities/product-return/hooks
mkdir -p mobile/src/entities/product-return/lib
mkdir -p mobile/src/entities/product-return/model
mkdir -p mobile/src/entities/product-return/ui
```

**Проверка:** Все папки созданы

---

### Задача 1.2: Создать константы
**Файл:** `mobile/src/entities/product-return/lib/constants.js`  
**Действие:** Создать

**Содержимое:**
```javascript
/**
 * Статусы возврата товара
 */
export const ProductReturnStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
};

/**
 * Уровни срочности
 */
export const UrgencyLevel = {
  CRITICAL: 'CRITICAL',  // 30+ дней
  HIGH: 'HIGH',          // 21-29 дней
  MEDIUM: 'MEDIUM',      // 14-20 дней
  LOW: 'LOW'             // <14 дней
};

/**
 * Лейблы статусов на русском
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
 * Цвета статусов
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
 * Лейблы уровней срочности
 */
export const URGENCY_LEVEL_LABELS = {
  [UrgencyLevel.CRITICAL]: 'Критично',
  [UrgencyLevel.HIGH]: 'Высокий',
  [UrgencyLevel.MEDIUM]: 'Средний',
  [UrgencyLevel.LOW]: 'Низкий'
};

/**
 * Цвета уровней срочности
 */
export const URGENCY_LEVEL_COLORS = {
  [UrgencyLevel.CRITICAL]: '#FF3B30',
  [UrgencyLevel.HIGH]: '#FF9500',
  [UrgencyLevel.MEDIUM]: '#FFCC00',
  [UrgencyLevel.LOW]: '#34C759'
};

/**
 * Иконки для уровней срочности
 */
export const URGENCY_LEVEL_ICONS = {
  [UrgencyLevel.CRITICAL]: '🔴',
  [UrgencyLevel.HIGH]: '🟠',
  [UrgencyLevel.MEDIUM]: '🟡',
  [UrgencyLevel.LOW]: '🟢'
};

/**
 * Общие константы
 */
export const CONSTANTS = {
  DEFAULT_DAYS_THRESHOLD: 21,
  CACHE_DURATION: 5 * 60 * 1000, // 5 минут
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};
```

**Проверка:** 
- ✅ Все константы экспортированы
- ✅ Нет опечаток в названиях

---

### Задача 1.3: Создать утилиты
**Файл:** `mobile/src/entities/product-return/lib/utils.js`  
**Действие:** Создать

**Содержимое:**
```javascript
import {
  ProductReturnStatus,
  UrgencyLevel,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_COLORS,
  URGENCY_LEVEL_LABELS,
  URGENCY_LEVEL_COLORS,
  URGENCY_LEVEL_ICONS
} from './constants';

// ===== JSDOC ТИПЫ =====

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

// ===== УТИЛИТЫ =====

/**
 * Определяет уровень срочности по количеству дней без продаж
 * @param {number} daysSinceLastSale
 * @returns {string} UrgencyLevel
 */
export const getUrgencyLevel = (daysSinceLastSale) => {
  if (daysSinceLastSale >= 30) return UrgencyLevel.CRITICAL;
  if (daysSinceLastSale >= 21) return UrgencyLevel.HIGH;
  if (daysSinceLastSale >= 14) return UrgencyLevel.MEDIUM;
  return UrgencyLevel.LOW;
};

/**
 * Получает лейбл статуса возврата
 * @param {string} status - ProductReturnStatus
 * @returns {string}
 */
export const getReturnStatusLabel = (status) => {
  return RETURN_STATUS_LABELS[status] || 'Неизвестный статус';
};

/**
 * Получает цвет статуса возврата
 * @param {string} status - ProductReturnStatus
 * @returns {string}
 */
export const getReturnStatusColor = (status) => {
  return RETURN_STATUS_COLORS[status] || '#8E8E93';
};

/**
 * Получает лейбл уровня срочности
 * @param {string} level - UrgencyLevel
 * @returns {string}
 */
export const getUrgencyLevelLabel = (level) => {
  return URGENCY_LEVEL_LABELS[level] || 'Неизвестный';
};

/**
 * Получает цвет уровня срочности
 * @param {string} level - UrgencyLevel
 * @returns {string}
 */
export const getUrgencyLevelColor = (level) => {
  return URGENCY_LEVEL_COLORS[level] || '#8E8E93';
};

/**
 * Получает иконку уровня срочности
 * @param {string} level - UrgencyLevel
 * @returns {string}
 */
export const getUrgencyLevelIcon = (level) => {
  return URGENCY_LEVEL_ICONS[level] || '⚪';
};

/**
 * Форматирует номер возврата
 * @param {number} returnId
 * @returns {string}
 */
export const formatReturnNumber = (returnId) => {
  return `RET-${String(returnId).padStart(6, '0')}`;
};

/**
 * Форматирует количество дней без продаж
 * @param {number} days
 * @returns {string}
 */
export const formatDaysSinceLastSale = (days) => {
  if (days === 0) return 'Сегодня';
  if (days === 1) return '1 день';
  if (days < 5) return `${days} дня`;
  if (days < 21) return `${days} дней`;
  if (days < 30) return `${days} дней (⚠️ требует внимания)`;
  return `${days} дней (🔴 критично!)`;
};

/**
 * Проверяет, можно ли одобрить возврат
 * @param {ProductReturn} productReturn
 * @param {string} userRole
 * @returns {boolean}
 */
export const canApproveReturn = (productReturn, userRole) => {
  return (
    userRole === 'ADMIN' &&
    productReturn?.status === ProductReturnStatus.PENDING
  );
};

/**
 * Проверяет, можно ли отклонить возврат
 * @param {ProductReturn} productReturn
 * @param {string} userRole
 * @returns {boolean}
 */
export const canRejectReturn = (productReturn, userRole) => {
  return (
    userRole === 'ADMIN' &&
    productReturn?.status === ProductReturnStatus.PENDING
  );
};

/**
 * Проверяет, можно ли завершить возврат
 * @param {ProductReturn} productReturn
 * @param {string} userRole
 * @returns {boolean}
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
 * Валидирует данные возврата перед отправкой
 * @param {Object} returnData
 * @returns {{isValid: boolean, errors: string[]}}
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

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Группирует возвраты по статусу
 * @param {ProductReturn[]} returns
 * @returns {Object}
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
 * @param {ProductReturn[]} returns
 * @param {Object} filters
 * @returns {ProductReturn[]}
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

    // Фильтр по дате
    if (filters.dateFrom) {
      const returnDate = new Date(returnItem.requestedAt);
      const fromDate = new Date(filters.dateFrom);
      if (returnDate < fromDate) return false;
    }

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
 * Сортирует возвраты
 * @param {ProductReturn[]} returns
 * @param {string} sortBy
 * @param {string} sortOrder
 * @returns {ProductReturn[]}
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
 * Вычисляет статистику возвратов
 * @param {ProductReturn[]} returns
 * @returns {Object}
 */
export const calculateReturnsStats = (returns) => {
  if (!returns.length) {
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
 * Экспорт всех констант для удобства
 */
export {
  ProductReturnStatus,
  UrgencyLevel,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_COLORS,
  URGENCY_LEVEL_LABELS,
  URGENCY_LEVEL_COLORS,
  URGENCY_LEVEL_ICONS
};
```

**Проверка:**
- ✅ Все утилиты работают корректно
- ✅ JSDoc типы определены
- ✅ Функции экспортированы

---

### Задача 1.4: Создать helpers
**Файл:** `mobile/src/entities/product-return/lib/helpers.js`  
**Действие:** Создать

**Содержимое:**
```javascript
import { CONSTANTS } from './constants';

/**
 * Проверяет, нужно ли обновить кэшированные данные
 * @param {number|null} lastFetch
 * @returns {boolean}
 */
export const shouldRefreshData = (lastFetch) => {
  if (!lastFetch) return true;
  return Date.now() - lastFetch > CONSTANTS.CACHE_DURATION;
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
  
  /**
   * Проверяет, истек ли кэш
   */
  isCacheExpired: (lastFetch) => {
    return shouldRefreshData(lastFetch);
  },
};
```

**Проверка:**
- ✅ Helpers экспортированы
- ✅ Функции соответствуют дизайну

---

### Задача 1.5: Создать index.js для lib
**Файл:** `mobile/src/entities/product-return/lib/index.js`  
**Действие:** Создать

**Содержимое:**
```javascript
export * from './constants';
export * from './utils';
export * from './helpers';
```

**Проверка:**
- ✅ Все экспорты работают

---

## Фаза 2: Redux State Management

**Цель:** Создать Redux slice и selectors  
**Время:** 3-4 дня  
**Приоритет:** 🔴 Критично

### Задача 2.1: Создать Redux slice
**Файл:** `mobile/src/entities/product-return/model/slice.js`  
**Действие:** Создать

**Ключевые моменты:**
- Определить `initialState` в начале файла
- Создать async thunks для всех операций:
  - `fetchStagnantProducts` - загрузка залежавшихся товаров
  - `fetchProductReturns` - загрузка списка возвратов
  - `fetchReturnDetail` - загрузка деталей возврата
  - `createProductReturn` - создание возврата
  - `approveProductReturn` - одобрение
  - `rejectProductReturn` - отклонение
  - `completeProductReturn` - завершение
  - `fetchReturnStatistics` - статистика
- Создать sync actions для фильтров и UI
- Обработать все pending/fulfilled/rejected случаи

**Источник:** Раздел 5.1 в PRODUCT_RETURNS_DESIGN.md

**Проверка:**
- ✅ Все thunks созданы
- ✅ Все reducers обрабатывают состояния
- ✅ initialState соответствует дизайну

---

### Задача 2.2: Создать selectors
**Файл:** `mobile/src/entities/product-return/model/selectors.js`  
**Действие:** Создать

**Ключевые моменты:**
- Базовые селекторы для доступа к данным
- Мемоизированные селекторы через `createSelector`:
  - `selectStagnantProductsByUrgency` - группировка по уровню
  - `selectStagnantProductsCounts` - подсчет
  - `selectReturnsByStatus` - группировка по статусу
  - `selectReturnsCounts` - подсчет возвратов
  - `selectActiveReturns` - активные возвраты
  - `selectCompletedReturns` - завершенные
- Фабрики селекторов для проверки прав

**Источник:** Раздел 5.2 в PRODUCT_RETURNS_DESIGN.md

**Проверка:**
- ✅ Все селекторы мемоизированы
- ✅ Нет лишних ререндеров

---

### Задача 2.3: Создать index.js для model
**Файл:** `mobile/src/entities/product-return/model/index.js`  
**Действие:** Создать

**Содержимое:**
```javascript
export { default as productReturnReducer } from './slice';
export * from './slice';
export * from './selectors';
```

**Проверка:**
- ✅ Экспорты работают

---

## Фаза 3: API интеграция

**Цель:** Создать API клиенты  
**Время:** 2-3 дня  
**Приоритет:** 🔴 Критично

### Задача 3.1: Создать основной API клиент
**Файл:** `mobile/src/entities/product-return/api/productReturnApi.js`  
**Действие:** Создать

**Ключевые методы:**
- `getReturns(filters)` - получить список возвратов
- `getReturnById(returnId)` - получить детали
- `createReturn(data)` - создать возврат
- `approveReturn(data)` - одобрить
- `rejectReturn(data)` - отклонить
- `startReturn(returnId)` - начать процесс
- `completeReturn(data)` - завершить
- `getStatistics(filters)` - получить статистику

**Источник:** Раздел 4.1 в PRODUCT_RETURNS_DESIGN.md

**Проверка:**
- ✅ Все методы реализованы
- ✅ Обработка ошибок работает
- ✅ URLSearchParams для фильтров

---

### Задача 3.2: Создать API для залежавшихся товаров
**Файл:** `mobile/src/entities/product-return/api/stagnantProductsApi.js`  
**Действие:** Создать

**Ключевые методы:**
- `getStagnantProducts(filters)` - получить список
- `runStagnantCheck()` - запустить проверку (для админа)

**Проверка:**
- ✅ Методы работают
- ✅ Фильтры применяются корректно

---

### Задача 3.3: Создать обработчик ошибок
**Файл:** `mobile/src/entities/product-return/api/errorHandler.js`  
**Действие:** Создать

**Функции:**
- `ProductReturnApiError` - класс ошибки
- `handleApiError(error)` - обработчик

**Источник:** Раздел 4.2 в PRODUCT_RETURNS_DESIGN.md

**Проверка:**
- ✅ Ошибки обрабатываются правильно

---

### Задача 3.4: Создать index.js для api
**Файл:** `mobile/src/entities/product-return/api/index.js`  
**Действие:** Создать

**Содержимое:**
```javascript
export { productReturnApi } from './productReturnApi';
export { stagnantProductsApi } from './stagnantProductsApi';
export * from './errorHandler';
```

**Проверка:**
- ✅ Экспорты работают

---

## Фаза 4: UI компоненты

**Цель:** Создать базовые UI компоненты  
**Время:** 4-5 дней  
**Приоритет:** 🔴 Критично

### Задача 4.1: UrgencyLevelBadge
**Файл:** `mobile/src/entities/product-return/ui/UrgencyLevelBadge.jsx`  
**Действие:** Создать

**Функционал:**
- Отображение иконки и лейбла уровня срочности
- Поддержка размеров: small, medium, large
- Цветовое кодирование

**Источник:** Раздел 6.1 в PRODUCT_RETURNS_DESIGN.md

**Проверка:**
- ✅ Корректные цвета для всех уровней
- ✅ Размеры работают

---

### Задача 4.2: ReturnStatusBadge
**Файл:** `mobile/src/entities/product-return/ui/ReturnStatusBadge.jsx`  
**Действие:** Создать

**Функционал:**
- Отображение статуса возврата
- Иконки и цвета
- Размеры

**Источник:** Раздел 6.2 в PRODUCT_RETURNS_DESIGN.md

**Проверка:**
- ✅ Все статусы отображаются

---

### Задача 4.3: StagnantProductCard
**Файл:** `mobile/src/entities/product-return/ui/StagnantProductCard.jsx`  
**Действие:** Создать

**Функционал:**
- Карточка залежавшегося товара
- Фото, название, поставщик
- Уровень срочности
- Дни без продаж
- Кнопка действия

**Проверка:**
- ✅ Нажатие работает
- ✅ Мемоизация для производительности

---

### Задача 4.4: ProductReturnCard
**Файл:** `mobile/src/entities/product-return/ui/ProductReturnCard.jsx`  
**Действие:** Создать

**Функционал:**
- Карточка возврата
- Номер возврата
- Статус
- Информация о продукте
- Даты

**Проверка:**
- ✅ Отображение корректно
- ✅ Навигация работает

---

### Задача 4.5: StagnantProductsList
**Файл:** `mobile/src/entities/product-return/ui/StagnantProductsList.jsx`  
**Действие:** Создать

**Функционал:**
- FlatList с оптимизацией
- Pull-to-refresh
- Загрузка
- Пустое состояние

**Проверка:**
- ✅ Производительность хорошая
- ✅ Pull-to-refresh работает

---

### Задача 4.6: ProductReturnsList
**Файл:** `mobile/src/entities/product-return/ui/ProductReturnsList.jsx`  
**Действие:** Создать

**Функционал:**
- Аналогично StagnantProductsList
- Пагинация

**Проверка:**
- ✅ Пагинация работает

---

### Задача 4.7: CreateReturnModal
**Файл:** `mobile/src/entities/product-return/ui/CreateReturnModal.jsx`  
**Действие:** Создать

**Функционал:**
- Модальное окно для создания возврата
- Выбор продукта
- Выбор склада
- Количество
- Причина
- Заметки
- Валидация

**Проверка:**
- ✅ Валидация работает
- ✅ Отправка данных

---

### Задача 4.8: ApproveReturnModal
**Файл:** `mobile/src/entities/product-return/ui/ApproveReturnModal.jsx`  
**Действие:** Создать

**Функционал:**
- Подтверждение одобрения
- Опциональные заметки

**Проверка:**
- ✅ Модалка открывается/закрывается

---

### Задача 4.9: RejectReturnModal
**Файл:** `mobile/src/entities/product-return/ui/RejectReturnModal.jsx`  
**Действие:** Создать

**Функционал:**
- Причина отклонения (обязательно)
- Подтверждение

**Проверка:**
- ✅ Валидация причины

---

### Задача 4.10: CompleteReturnModal
**Файл:** `mobile/src/entities/product-return/ui/CompleteReturnModal.jsx`  
**Действие:** Создать

**Функционал:**
- Подтверждение завершения
- Заметки

**Проверка:**
- ✅ Завершение работает

---

### Задача 4.11: ReturnFilters
**Файл:** `mobile/src/entities/product-return/ui/ReturnFilters.jsx`  
**Действие:** Создать

**Функционал:**
- Фильтр по статусу
- Фильтр по дате
- Фильтр по складу
- Фильтр по поставщику
- Сброс фильтров

**Проверка:**
- ✅ Фильтры применяются

---

### Задача 4.12: ReturnStatistics
**Файл:** `mobile/src/entities/product-return/ui/ReturnStatistics.jsx`  
**Действие:** Создать

**Функционал:**
- Общая статистика
- Графики (опционально)
- Топ товаров/поставщиков

**Проверка:**
- ✅ Данные корректно отображаются

---

### Задача 4.13: Создать index.js для ui
**Файл:** `mobile/src/entities/product-return/ui/index.js`  
**Действие:** Создать

**Содержимое:**
```javascript
export { UrgencyLevelBadge } from './UrgencyLevelBadge';
export { ReturnStatusBadge } from './ReturnStatusBadge';
export { StagnantProductCard } from './StagnantProductCard';
export { ProductReturnCard } from './ProductReturnCard';
export { StagnantProductsList } from './StagnantProductsList';
export { ProductReturnsList } from './ProductReturnsList';
export { CreateReturnModal } from './CreateReturnModal';
export { ApproveReturnModal } from './ApproveReturnModal';
export { RejectReturnModal } from './RejectReturnModal';
export { CompleteReturnModal } from './CompleteReturnModal';
export { ReturnFilters } from './ReturnFilters';
export { ReturnStatistics } from './ReturnStatistics';
```

**Проверка:**
- ✅ Все компоненты экспортируются

---

## Фаза 5: Хуки

**Цель:** Создать хуки для работы с возвратами  
**Время:** 3-4 дня  
**Приоритет:** 🔴 Критично

### Задача 5.1: useStagnantProducts
**Файл:** `mobile/src/entities/product-return/hooks/useStagnantProducts.js`  
**Действие:** Создать

**Функционал:**
- Загрузка залежавшихся товаров
- Кэширование
- Обновление

**Источник:** Раздел 9.2 в PRODUCT_RETURNS_DESIGN.md

**Проверка:**
- ✅ Кэш работает
- ✅ Обновление по запросу

---

### Задача 5.2: useProductReturns
**Файл:** `mobile/src/entities/product-return/hooks/useProductReturns.js`  
**Действие:** Создать

**Функционал:**
- Загрузка списка возвратов
- Фильтрация
- Пагинация
- Кэширование

**Проверка:**
- ✅ Пагинация работает
- ✅ Фильтры применяются

---

### Задача 5.3: useProductReturn
**Файл:** `mobile/src/entities/product-return/hooks/useProductReturn.js`  
**Действие:** Создать

**Функционал:**
- Загрузка одного возврата
- Обновление

**Проверка:**
- ✅ Детали загружаются

---

### Задача 5.4: useReturnPermissions
**Файл:** `mobile/src/entities/product-return/hooks/useReturnPermissions.js`  
**Действие:** Создать

**Функционал:**
- Проверка прав на операции
- Роль пользователя
- Статус возврата

**Источник:** Раздел 8.1 в PRODUCT_RETURNS_DESIGN.md

**Проверка:**
- ✅ Права проверяются корректно

---

### Задача 5.5: useReturnStatistics
**Файл:** `mobile/src/entities/product-return/hooks/useReturnStatistics.js`  
**Действие:** Создать

**Функционал:**
- Загрузка статистики
- Фильтры

**Проверка:**
- ✅ Статистика загружается

---

### Задача 5.6: useCreateReturn
**Файл:** `mobile/src/entities/product-return/hooks/useCreateReturn.js`  
**Действие:** Создать

**Функционал:**
- Создание возврата
- Валидация
- Обработка ошибок

**Проверка:**
- ✅ Создание работает

---

### Задача 5.7: useApproveReturn
**Файл:** `mobile/src/entities/product-return/hooks/useApproveReturn.js`  
**Действие:** Создать

**Функционал:**
- Одобрение возврата
- Обновление списка

**Проверка:**
- ✅ Одобрение работает

---

### Задача 5.8: useRejectReturn
**Файл:** `mobile/src/entities/product-return/hooks/useRejectReturn.js`  
**Действие:** Создать

**Функционал:**
- Отклонение возврата

**Проверка:**
- ✅ Отклонение работает

---

### Задача 5.9: useCompleteReturn
**Файл:** `mobile/src/entities/product-return/hooks/useCompleteReturn.js`  
**Действие:** Создать

**Функционал:**
- Завершение возврата

**Проверка:**
- ✅ Завершение работает

---

### Задача 5.10: Создать index.js для hooks
**Файл:** `mobile/src/entities/product-return/hooks/index.js`  
**Действие:** Создать

**Содержимое:**
```javascript
export { useProductReturns } from './useProductReturns';
export { useProductReturn } from './useProductReturn';
export { useStagnantProducts } from './useStagnantProducts';
export { useReturnPermissions } from './useReturnPermissions';
export { useReturnStatistics } from './useReturnStatistics';
export { useCreateReturn } from './useCreateReturn';
export { useApproveReturn } from './useApproveReturn';
export { useRejectReturn } from './useRejectReturn';
export { useCompleteReturn } from './useCompleteReturn';
```

**Проверка:**
- ✅ Все хуки экспортируются

---

## Фаза 6: Экраны

**Цель:** Создать экраны для работы с возвратами  
**Время:** 5-6 дней  
**Приоритет:** 🟡 Высокий

### Задача 6.1: StagnantProductsScreen
**Файл:** `mobile/src/screens/product-return/StagnantProductsScreen/ui/StagnantProductsScreen.jsx`  
**Действие:** Создать

**Функционал:**
- Список залежавшихся товаров
- Фильтры
- Группировка по срочности
- Создание возврата из карточки

**Проверка:**
- ✅ Список отображается
- ✅ Фильтры работают
- ✅ Навигация работает

---

### Задача 6.2: ProductReturnsListScreen
**Файл:** `mobile/src/screens/product-return/ProductReturnsListScreen/ui/ProductReturnsListScreen.jsx`  
**Действие:** Создать

**Функционал:**
- Список возвратов
- Фильтры по статусу
- Пагинация
- Переход к деталям

**Проверка:**
- ✅ Список работает
- ✅ Навигация к деталям

---

### Задача 6.3: ProductReturnDetailScreen
**Файл:** `mobile/src/screens/product-return/ProductReturnDetailScreen/ui/ProductReturnDetailScreen.jsx`  
**Действие:** Создать

**Функционал:**
- Детали возврата
- История статусов
- Кнопки действий (в зависимости от прав)
- Информация о продукте
- Информация о складе

**Проверка:**
- ✅ Детали отображаются
- ✅ Кнопки работают в зависимости от роли

---

### Задача 6.4: ReturnStatisticsScreen
**Файл:** `mobile/src/screens/product-return/ReturnStatisticsScreen/ui/ReturnStatisticsScreen.jsx`  
**Действие:** Создать

**Функционал:**
- Общая статистика
- Фильтры по датам
- Графики
- Топы

**Проверка:**
- ✅ Статистика отображается
- ✅ Фильтры работают

---

### Задача 6.5: Создать index.js для каждого экрана
**Файлы:** 
- `mobile/src/screens/product-return/StagnantProductsScreen/index.js`
- `mobile/src/screens/product-return/ProductReturnsListScreen/index.js`
- `mobile/src/screens/product-return/ProductReturnDetailScreen/index.js`
- `mobile/src/screens/product-return/ReturnStatisticsScreen/index.js`

**Действие:** Создать

**Содержимое (пример):**
```javascript
export { StagnantProductsScreen } from './ui/StagnantProductsScreen';
```

**Проверка:**
- ✅ Все экраны экспортируются

---

## Фаза 7: Интеграция в админ-панель

**Цель:** Добавить функционал в админ-панель  
**Время:** 2-3 дня  
**Приоритет:** 🟡 Высокий

### Задача 7.1: Создать AdminReturnsSection
**Файл:** `mobile/src/widgets/admin/AdminReturnsSection/ui/AdminReturnsSection.jsx`  
**Действие:** Создать

**Функционал:**
- Секция в админ-панели
- Карточки со статистикой:
  - Залежавшиеся товары (с критичными)
  - Возвраты на рассмотрении
  - Активные возвраты
  - Завершенные возвраты
- Кнопки навигации к экранам

**Проверка:**
- ✅ Секция отображается
- ✅ Навигация работает

---

### Задача 7.2: Интегрировать в AdminPanelScreen
**Файл:** `mobile/src/screens/admin/ui/AdminPanelScreen/ui/AdminPanelScreen.jsx`  
**Действие:** Модифицировать

**Изменения:**
- Импортировать `AdminReturnsSection`
- Добавить секцию в рендер

**Проверка:**
- ✅ Секция видна в админ-панели
- ✅ Нет конфликтов с другими секциями

---

## Фаза 8: Интеграция для поставщиков

**Цель:** Добавить функционал для поставщиков  
**Время:** 2-3 дня  
**Приоритет:** 🟡 Высокий

### Задача 8.1: Создать SupplierReturnsWidget
**Файл:** `mobile/src/widgets/supplier/SupplierReturnsWidget/ui/SupplierReturnsWidget.jsx`  
**Действие:** Создать

**Функционал:**
- Виджет для поставщика
- Карточки:
  - Мои залежавшиеся товары
  - Мои возвраты
- Навигация

**Проверка:**
- ✅ Виджет отображается
- ✅ Фильтр по поставщику работает

---

### Задача 8.2: Интегрировать в SupplierScreen
**Файл:** `mobile/src/screens/supplier/ui/SupplierScreen/ui/SupplierScreen.jsx` (или аналогичный)  
**Действие:** Модифицировать

**Изменения:**
- Импортировать `SupplierReturnsWidget`
- Добавить виджет в рендер

**Проверка:**
- ✅ Виджет виден поставщику
- ✅ Данные корректны

---

## Фаза 9: Навигация

**Цель:** Добавить роуты в навигацию  
**Время:** 1-2 дня  
**Приоритет:** 🔴 Критично

### Задача 9.1: Добавить роуты в AppNavigator
**Файл:** `mobile/src/app/providers/navigation/AppNavigator.jsx`  
**Действие:** Модифицировать

**Изменения:**
1. Импортировать экраны:
```javascript
import { StagnantProductsScreen } from '@screens/product-return/StagnantProductsScreen';
import { ProductReturnsListScreen } from '@screens/product-return/ProductReturnsListScreen';
import { ProductReturnDetailScreen } from '@screens/product-return/ProductReturnDetailScreen';
import { ReturnStatisticsScreen } from '@screens/product-return/ReturnStatisticsScreen';
```

2. Добавить в `AdminStack`:
```javascript
<AdminStack.Screen
  name="StagnantProducts"
  component={StagnantProductsScreen}
  options={{ headerShown: false }}
/>
<AdminStack.Screen
  name="ProductReturnsList"
  component={ProductReturnsListScreen}
  options={{ headerShown: false }}
/>
<AdminStack.Screen
  name="ProductReturnDetail"
  component={ProductReturnDetailScreen}
  options={{ headerShown: false }}
/>
<AdminStack.Screen
  name="ReturnStatistics"
  component={ReturnStatisticsScreen}
  options={{ headerShown: false }}
/>
```

3. Добавить в `ProfileStack` для поставщиков:
```javascript
<ProfileStack.Screen
  name="SupplierStagnantProducts"
  component={StagnantProductsScreen}
  options={{ headerShown: false }}
/>
<ProfileStack.Screen
  name="SupplierReturns"
  component={ProductReturnsListScreen}
  options={{ headerShown: false }}
/>
```

**Источник:** Раздел 7.2 в PRODUCT_RETURNS_DESIGN.md

**Проверка:**
- ✅ Навигация работает из админ-панели
- ✅ Навигация работает для поставщиков
- ✅ Нет ошибок в навигации

---

## Фаза 10: Интеграция в Redux Store

**Цель:** Подключить reducer к store  
**Время:** 0.5 дня  
**Приоритет:** 🔴 Критично

### Задача 10.1: Добавить reducer в rootReducer
**Файл:** `mobile/src/app/store/rootReducer.js` (или аналогичный)  
**Действие:** Модифицировать

**Изменения:**
```javascript
import { productReturnReducer } from '@entities/product-return';

const rootReducer = combineReducers({
  // ... существующие reducers
  productReturn: productReturnReducer,
});
```

**Проверка:**
- ✅ Reducer добавлен
- ✅ Redux DevTools показывает состояние
- ✅ Нет ошибок

---

### Задача 10.2: Создать главный index.js entity
**Файл:** `mobile/src/entities/product-return/index.js`  
**Действие:** Создать

**Содержимое:** Из раздела 3.3 в PRODUCT_RETURNS_DESIGN.md

**Проверка:**
- ✅ Все экспорты работают
- ✅ Нет циклических зависимостей

---

## Фаза 11: Тестирование и полировка

**Цель:** Протестировать и отполировать функционал  
**Время:** 3-4 дня  
**Приоритет:** 🟢 Средний

### Задача 11.1: Тестирование функционала
**Действие:** Тестирование

**Тест-кейсы:**
1. ✅ Админ видит залежавшиеся товары
2. ✅ Админ может создать возврат
3. ✅ Админ может одобрить/отклонить возврат
4. ✅ Сотрудник может завершить возврат
5. ✅ Поставщик видит только свои товары и возвраты
6. ✅ Фильтры работают корректно
7. ✅ Пагинация работает
8. ✅ Кэширование работает
9. ✅ Права доступа работают корректно
10. ✅ Навигация работает без ошибок

---

### Задача 11.2: Оптимизация производительности
**Действие:** Оптимизация

**Чек-лист:**
- ✅ Мемоизация компонентов (React.memo)
- ✅ useMemo для вычислений
- ✅ useCallback для функций
- ✅ FlatList с оптимизацией
- ✅ Кэширование запросов
- ✅ Debounce для поиска/фильтров

---

### Задача 11.3: UX улучшения
**Действие:** Улучшения

**Чек-лист:**
- ✅ Loading states
- ✅ Empty states
- ✅ Error states
- ✅ Pull-to-refresh
- ✅ Скелетоны загрузки (опционально)
- ✅ Анимации переходов
- ✅ Тактильная обратная связь

---

### Задача 11.4: Обработка ошибок
**Действие:** Проверка

**Чек-лист:**
- ✅ Ошибки API обрабатываются
- ✅ Ошибки сети обрабатываются
- ✅ Валидация форм работает
- ✅ Показываются понятные сообщения
- ✅ Retry механизм для запросов

---

### Задача 11.5: Доступность
**Действие:** Проверка

**Чек-лист:**
- ✅ Кнопки имеют accessibilityLabel
- ✅ Контраст цветов достаточный
- ✅ Размеры кнопок >= 44x44
- ✅ Screen readers работают

---

## Дополнительные задачи (опционально)

### Задача Доп.1: Уведомления
**Приоритет:** ⚪ Низкий

**Функционал:**
- Push-уведомления о новых возвратах
- Уведомления об изменении статуса
- Уведомления о критичных товарах

---

### Задача Доп.2: Экспорт данных
**Приоритет:** ⚪ Низкий

**Функционал:**
- Экспорт списка возвратов в Excel/PDF
- Экспорт статистики

---

### Задача Доп.3: Графики и аналитика
**Приоритет:** ⚪ Низкий

**Функционал:**
- Графики динамики возвратов
- Тренды по поставщикам
- Прогнозирование

---

## Чеклист завершения

### Перед деплоем
- [ ] Все компоненты созданы
- [ ] Redux работает корректно
- [ ] API интеграция работает
- [ ] Навигация настроена
- [ ] Права доступа проверены
- [ ] Тестирование пройдено
- [ ] UX полировка завершена
- [ ] Нет критических ошибок
- [ ] Производительность приемлема
- [ ] Код прошел ревью

### После деплоя
- [ ] Мониторинг ошибок
- [ ] Сбор обратной связи
- [ ] Анализ использования
- [ ] Планирование улучшений

---

## Приложения

### Приложение A: Порядок создания файлов

**Рекомендуемый порядок:**
1. lib/constants.js
2. lib/utils.js
3. lib/helpers.js
4. lib/index.js
5. api/errorHandler.js
6. api/productReturnApi.js
7. api/stagnantProductsApi.js
8. api/index.js
9. model/slice.js
10. model/selectors.js
11. model/index.js
12. ui/UrgencyLevelBadge.jsx
13. ui/ReturnStatusBadge.jsx
14. ui/StagnantProductCard.jsx
15. ui/ProductReturnCard.jsx
16. ... остальные UI компоненты
17. ui/index.js
18. hooks/useReturnPermissions.js
19. hooks/useStagnantProducts.js
20. hooks/useProductReturns.js
21. ... остальные hooks
22. hooks/index.js
23. index.js (главный)
24. Интеграция в rootReducer
25. Экраны
26. Виджеты
27. Навигация

---

## Версия документа

**Версия:** 1.0  
**Дата:** 28 октября 2025  
**Статус:** Готово к выполнению ✅  
**Последнее обновление:** 28 октября 2025

