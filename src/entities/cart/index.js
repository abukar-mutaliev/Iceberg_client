// ===== ОСНОВНЫЕ ЭКСПОРТЫ =====

// Redux slice и actions
export * from './model/slice';
export { default as cartReducer } from './model/slice';

// Селекторы
export * from './model/selectors';

// API сервис
export * from './api/cartApi';
export { default as CartService } from './api/cartApi';

// ===== ХУКИ =====

// Основные хуки для работы с корзиной
export {
    useCart,
    useCartAutoLoad,
    useCartAvailability,
    useCartProduct,
    useCartStats,
    useCartValidation,
    useCheckout,
    useGuestCart,
    useQuickCart,
    useCartChangeTracker
} from './hooks/useCart';

// Новые расширенные хуки
export {
    useBulkCartOperations,
    useCartNotifications,
    useClientType,
    useCartExtras
} from './hooks/useCart';

// Хук для авторизации и объединения корзин
export { useCartAuth } from './hooks/useCartAuth';

// Компонент для отслеживания авторизации
export { CartAuthHandler } from './ui/CartAuthHandler/ui/CartAuthHandler';


// ===== ТИПЫ И КОНСТАНТЫ =====

// Константы для типов клиентов
export const CLIENT_TYPES = {
    RETAIL: 'RETAIL',
    WHOLESALE: 'WHOLESALE'
};

// Константы для типов уведомлений
export const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};



// Константы для типов доставки
export const DELIVERY_TYPES = {
    STANDARD: 'STANDARD',
    EXPRESS: 'EXPRESS',
    SCHEDULED: 'SCHEDULED'
};

// Константы для операций валидации
export const VALIDATION_ISSUE_TYPES = {
    PRODUCT_NOT_FOUND: 'product_not_found',
    INACTIVE_PRODUCT: 'inactive_product',
    OUT_OF_STOCK: 'out_of_stock',
    INSUFFICIENT_STOCK: 'insufficient_stock',
    QUANTITY_ADJUSTED: 'quantity_adjusted',
    PRICE_CHANGED: 'price_changed'
};

// Константы для сортировки
export const SORT_OPTIONS = {
    NAME: 'name',
    PRICE: 'price',
    QUANTITY: 'quantity',
    SUBTOTAL: 'subtotal',
    SUPPLIER: 'supplier',
    ADDED_AT: 'addedAt'
};

export const SORT_ORDERS = {
    ASC: 'asc',
    DESC: 'desc'
};

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

// Форматирование цен
export const formatPrice = (price) => {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);
};



// Получение текста количества товаров
export const getItemsCountText = (count) => {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return `${count} товаров`;
    }

    switch (lastDigit) {
        case 1:
            return `${count} товар`;
        case 2:
        case 3:
        case 4:
            return `${count} товара`;
        default:
            return `${count} товаров`;
    }
};

// Вычисление процента скидки
export const calculateDiscountPercentage = (originalPrice, discountedPrice) => {
    if (originalPrice <= 0) return 0;
    return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
};



// Группировка товаров по поставщикам
export const groupItemsBySupplier = (items) => {
    return items.reduce((acc, item) => {
        const supplierId = item.product?.supplier?.id || 'unknown';
        const supplierName = item.product?.supplier?.companyName || 'Неизвестный поставщик';

        if (!acc[supplierId]) {
            acc[supplierId] = {
                supplierId,
                supplierName,
                items: []
            };
        }

        acc[supplierId].items.push(item);
        return acc;
    }, {});
};

// Валидация гостевой корзины
export const validateGuestCartItem = (item, product) => {
    const issues = [];

    if (!product) {
        issues.push({
            type: VALIDATION_ISSUE_TYPES.PRODUCT_NOT_FOUND,
            message: 'Товар не найден',
            severity: 'error'
        });
        return { isValid: false, issues };
    }

    if (!product.isActive) {
        issues.push({
            type: VALIDATION_ISSUE_TYPES.INACTIVE_PRODUCT,
            message: 'Товар больше не продается',
            severity: 'error'
        });
        return { isValid: false, issues };
    }

    const availableQuantity = product.availableQuantity || product.stockQuantity || 0;

    if (availableQuantity === 0) {
        issues.push({
            type: VALIDATION_ISSUE_TYPES.OUT_OF_STOCK,
            message: 'Товар закончился на складе',
            severity: 'error'
        });
        return { isValid: false, issues };
    }

    if (item.quantity > availableQuantity) {
        issues.push({
            type: VALIDATION_ISSUE_TYPES.INSUFFICIENT_STOCK,
            message: `Доступно только ${availableQuantity} шт.`,
            severity: 'warning',
            availableQuantity
        });
    }

    return {
        isValid: issues.filter(i => i.severity === 'error').length === 0,
        issues
    };
};

// Подсчет статистики корзины
export const calculateCartStatistics = (items, clientType = CLIENT_TYPES.RETAIL) => {
    const validItems = items.filter(item => item?.product && item.quantity > 0);

    return validItems.reduce((acc, item) => {
        const product = item.product;
        let price = product.price || 0;
        let itemSavings = 0;

        // Проверяем оптовую цену
        if (clientType === CLIENT_TYPES.WHOLESALE &&
            product.wholesalePrice &&
            item.quantity >= (product.wholesaleMinQty || 50)) {
            price = product.wholesalePrice;
            itemSavings = item.quantity * (product.price - product.wholesalePrice);
        }

        const itemTotal = item.quantity * price;

        return {
            totalItems: acc.totalItems + item.quantity,
            totalAmount: acc.totalAmount + itemTotal,
            totalSavings: acc.totalSavings + itemSavings,
            itemsCount: acc.itemsCount + 1
        };
    }, {
        totalItems: 0,
        totalAmount: 0,
        totalSavings: 0,
        itemsCount: 0
    });
};

// Создание уведомления
export const createCartNotification = (type, message, options = {}) => {
    return {
        id: Date.now() + Math.random(),
        type,
        message,
        timestamp: new Date().toISOString(),
        autoHide: true,
        duration: 3000,
        ...options
    };
};

// Фильтрация товаров по доступности
export const filterItemsByAvailability = (items) => {
    return items.reduce((acc, item) => {
        const product = item.product;
        const availableQuantity = product?.availableQuantity || product?.stockQuantity || 0;

        if (product?.isActive && availableQuantity >= item.quantity) {
            acc.available.push(item);
        } else {
            acc.unavailable.push(item);
        }

        return acc;
    }, { available: [], unavailable: [] });
};

// Получение цены для клиента
export const getPriceForClient = (product, clientType, quantity) => {
    if (!product) return { price: 0, priceType: 'retail', savings: 0 };

    let price = product.price || 0;
    let priceType = 'retail';
    let savings = 0;

    if (clientType === CLIENT_TYPES.WHOLESALE &&
        product.wholesalePrice &&
        quantity >= (product.wholesaleMinQty || 50)) {
        price = product.wholesalePrice;
        priceType = 'wholesale';
        savings = quantity * (product.price - product.wholesalePrice);
    }

    return {
        price,
        priceType,
        savings,
        retailPrice: product.price,
        wholesalePrice: product.wholesalePrice,
        wholesaleMinQty: product.wholesaleMinQty
    };
};

// Проверка возможности оптовой цены
export const canUseWholesalePrice = (product, quantity, clientType) => {
    return clientType === CLIENT_TYPES.WHOLESALE &&
        product?.wholesalePrice &&
        quantity >= (product.wholesaleMinQty || 50);
};

// Сортировка товаров в корзине
export const sortCartItems = (items, sortBy, sortOrder = SORT_ORDERS.ASC) => {
    const sortedItems = [...items];

    sortedItems.sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
            case SORT_OPTIONS.NAME:
                aValue = a.product?.name || '';
                bValue = b.product?.name || '';
                break;
            case SORT_OPTIONS.PRICE:
                aValue = a.product?.price || 0;
                bValue = b.product?.price || 0;
                break;
            case SORT_OPTIONS.QUANTITY:
                aValue = a.quantity || 0;
                bValue = b.quantity || 0;
                break;
            case SORT_OPTIONS.SUBTOTAL:
                aValue = a.quantity * (a.product?.price || 0);
                bValue = b.quantity * (b.product?.price || 0);
                break;
            case SORT_OPTIONS.SUPPLIER:
                aValue = a.product?.supplier?.companyName || '';
                bValue = b.product?.supplier?.companyName || '';
                break;
            case SORT_OPTIONS.ADDED_AT:
                aValue = a.addedAt || 0;
                bValue = b.addedAt || 0;
                break;
            default:
                return 0;
        }

        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (sortOrder === SORT_ORDERS.DESC) {
            return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        } else {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
    });

    return sortedItems;
};

// ===== КОНФИГУРАЦИЯ И НАСТРОЙКИ =====



// Настройки кеширования
export const CACHE_CONFIG = {
    CART_EXPIRY: 2 * 60 * 1000, // 2 минуты
    STATS_EXPIRY: 30 * 1000, // 30 секунд
    GUEST_CART_KEY: 'guest_cart'
};

// Настройки уведомлений
export const NOTIFICATION_CONFIG = {
    DEFAULT_DURATION: 3000,
    ERROR_DURATION: 5000,
    WARNING_DURATION: 4000,
    SUCCESS_DURATION: 3000,
    INFO_DURATION: 3000,
    MAX_NOTIFICATIONS: 5
};

// Лимиты операций
export const OPERATION_LIMITS = {
    MAX_QUANTITY_PER_ITEM: 999,
    MAX_ITEMS_IN_CART: 100,
    MAX_BULK_OPERATIONS: 50,
    MIN_WHOLESALE_QUANTITY: 50
};

// ===== ВЕРСИЯ API =====
export const CART_API_VERSION = '1.0.0';

// ===== ЭКСПОРТ КОНФИГУРАЦИИ ПО УМОЛЧАНИЮ =====
export const defaultCartConfig = {
    enableNotifications: true,
    enableAutoMerge: true,
    enableWebSocket: false,
    enableCaching: true,
    cacheExpiry: CACHE_CONFIG.CART_EXPIRY,
    maxNotifications: NOTIFICATION_CONFIG.MAX_NOTIFICATIONS
};

export { 
    fetchCart,
    fetchCartStats,
    fetchDetailedCartStats,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    validateCart,
    validateCartDetailed,
    checkout,
    prepareCheckout,
    mergeCart,
    loadGuestCart,
    clearCartError,
    resetValidation,
    setClientType,
    bulkUpdateQuantities,
    bulkRemoveItems,
    calculateShipping,
    applyDiscount,
    addNotification,
    removeNotification,
    clearNotifications,
    clearCartCache,
    setItemLoading
} from './model/slice';

export {
    selectCartItems,
    selectCartStats,
    selectCartLoading,
    selectCartError,
    selectIsCartEmpty,
    selectIsProductInCart,
    selectProductQuantityInCart,
    selectCartValidation,
    selectIsCartReadyForCheckout,
    selectCartItemsBySupplier,
    selectHasProblematicItems,
    selectFormattedCartStats,
    selectIsProductAdding,
    selectIsCartItemUpdating,
    selectIsCartItemRemoving,
    selectCartItemByProductId,
    selectRecommendedProducts,
    selectCartState,
    selectCartProductIds
} from './model/selectors';