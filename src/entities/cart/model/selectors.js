import { createSelector } from "@reduxjs/toolkit";

// Константы для предотвращения создания новых ссылок
const EMPTY_ARRAY = [];

// ===== БАЗОВЫЕ СЕЛЕКТОРЫ =====
export const selectCartState = (state) => state.cart;
export const selectCartItems = (state) => state.cart?.items || EMPTY_ARRAY;
export const selectCartLoading = (state) => state.cart?.loading || false;
export const selectCartError = (state) => state.cart?.error || null;

// ===== СТАТИСТИКА КОРЗИНЫ =====
export const selectCartStats = createSelector(
    [selectCartState],
    (cart) => ({
        totalItems: cart.totalItems || 0,
        totalAmount: cart.totalAmount || 0,
        totalSavings: cart.totalSavings || 0,
        itemsCount: cart.itemsCount || 0,
        clientType: cart.clientType || 'RETAIL',
        hasUnavailableItems: cart.hasUnavailableItems || false,
        unavailableCount: cart.unavailableCount || 0,
    })
);

// ===== ПРОВЕРКИ СОСТОЯНИЯ =====
export const selectIsCartEmpty = createSelector(
    [selectCartItems],
    (items) => !items || items.length === 0
);

export const selectCartItemsCount = createSelector(
    [selectCartItems],
    (items) => items.reduce((total, item) => total + (item.quantity || 0), 0)
);

export const selectCartTotalAmount = createSelector(
    [selectCartItems, selectCartState],
    (items, cartState) => {
        const clientType = cartState.clientType || 'RETAIL';

        const total = items.reduce((sum, item) => {
            const product = item.product;
            if (!product) return sum;

            let price = product.price;

            // Проверяем оптовую цену
            if (clientType === 'WHOLESALE' &&
                product.wholesalePrice &&
                item.quantity >= (product.wholesaleMinQty || 50)) {
                price = product.wholesalePrice;
            }

            return sum + (item.quantity * price);
        }, 0);

        return Math.round(total * 100) / 100;
    }
);

export const selectCartTotalSavings = createSelector(
    [selectCartItems, selectCartState],
    (items, cartState) => {
        const clientType = cartState.clientType || 'RETAIL';

        if (clientType !== 'WHOLESALE') return 0;

        const savings = items.reduce((sum, item) => {
            const product = item.product;
            if (!product || !product.wholesalePrice) return sum;

            if (item.quantity >= (product.wholesaleMinQty || 50)) {
                return sum + (item.quantity * (product.price - product.wholesalePrice));
            }

            return sum;
        }, 0);

        return Math.round(savings * 100) / 100;
    }
);

export const selectCartUniqueItemsCount = createSelector(
    [selectCartItems],
    (items) => items.length
);

// ===== СОСТОЯНИЯ ЗАГРУЗКИ =====
export const selectCartOperationsLoading = createSelector(
    [selectCartState],
    (cart) => ({
        addingItems: cart.addingItems || EMPTY_ARRAY,
        updatingItems: cart.updatingItems || EMPTY_ARRAY,
        removingItems: cart.removingItems || EMPTY_ARRAY,
        validating: cart.validating || false,
        preparingCheckout: cart.preparingCheckout || false,
    })
);

export const selectIsProductAdding = createSelector(
    [selectCartState, (state, productId) => productId],
    (cart, productId) => {
        const addingItems = cart.addingItems || EMPTY_ARRAY;
        return addingItems.includes(productId);
    }
);

export const selectIsCartItemUpdating = createSelector(
    [selectCartState, (state, itemId) => itemId],
    (cart, itemId) => {
        const updatingItems = cart.updatingItems || EMPTY_ARRAY;
        return updatingItems.includes(itemId);
    }
);

export const selectIsCartItemRemoving = createSelector(
    [selectCartState, (state, itemId) => itemId],
    (cart, itemId) => {
        const removingItems = cart.removingItems || EMPTY_ARRAY;
        return removingItems.includes(itemId);
    }
);

// ===== ПОИСК ТОВАРОВ В КОРЗИНЕ =====
export const selectCartItemById = createSelector(
    [selectCartItems, (state, itemId) => itemId],
    (items, itemId) => items.find(item => item.id === itemId) || null
);

export const selectCartItemByProductId = createSelector(
    [selectCartItems, (state, productId) => productId],
    (items, productId) => items.find(item =>
        item.productId === productId || item.product?.id === productId
    ) || null
);

export const selectIsProductInCart = createSelector(
    [selectCartItems, (state, productId) => productId],
    (items, productId) => items.some(item =>
        item.productId === productId || item.product?.id === productId
    )
);

export const selectProductQuantityInCart = createSelector(
    [selectCartItemByProductId],
    (cartItem) => cartItem?.quantity || 0
);

// ===== ВАЛИДАЦИЯ =====
export const selectCartValidation = createSelector(
    [selectCartState],
    (cart) => ({
        isValidated: cart.isValidated || false,
        validationIssues: cart.validationIssues || EMPTY_ARRAY,
        hasIssues: (cart.validationIssues || EMPTY_ARRAY).length > 0,
        canProceedToCheckout: cart.canProceedToCheckout || false,
    })
);

export const selectIsCartReadyForCheckout = createSelector(
    [selectIsCartEmpty, selectCartValidation, selectCartLoading],
    (isEmpty, validation, loading) =>
        !isEmpty && !loading && validation.canProceedToCheckout
);

// ===== ГРУППИРОВКА ПО ПОСТАВЩИКАМ =====
export const selectCartItemsBySupplier = createSelector(
    [selectCartItems, selectCartState],
    (items, cartState) => {
        const clientType = cartState.clientType || 'RETAIL';

        const grouped = items.reduce((acc, item) => {
            const supplierId = item.product?.supplier?.id || 'unknown';
            const supplierName = item.product?.supplier?.companyName || 'Неизвестный поставщик';

            if (!acc[supplierId]) {
                acc[supplierId] = {
                    supplierId,
                    supplierName,
                    items: [],
                    totalAmount: 0,
                    totalSavings: 0,
                    totalItems: 0
                };
            }

            const product = item.product;
            let price = product?.price || 0;
            let itemSavings = 0;

            // Проверяем оптовую цену
            if (clientType === 'WHOLESALE' &&
                product?.wholesalePrice &&
                item.quantity >= (product.wholesaleMinQty || 50)) {
                price = product.wholesalePrice;
                itemSavings = item.quantity * (product.price - product.wholesalePrice);
            }

            const itemTotal = item.quantity * price;

            acc[supplierId].items.push({
                ...item,
                priceInfo: {
                    price,
                    priceType: itemSavings > 0 ? 'wholesale' : 'retail',
                    savings: itemSavings
                }
            });
            acc[supplierId].totalAmount += itemTotal;
            acc[supplierId].totalSavings += itemSavings;
            acc[supplierId].totalItems += item.quantity;

            return acc;
        }, {});

        return Object.values(grouped);
    }
);

// ===== ПРОБЛЕМНЫЕ ТОВАРЫ =====
export const selectProblematicCartItems = createSelector(
    [selectCartItems],
    (items) => items.filter(item => {
        const product = item.product;
        if (!product) return true;

        return !product.isActive ||
            (product.availableQuantity !== undefined && product.availableQuantity === 0) ||
            (product.stockQuantity !== undefined && product.stockQuantity === 0) ||
            (item.quantity > (product.availableQuantity || product.stockQuantity || 0));
    })
);

export const selectHasProblematicItems = createSelector(
    [selectProblematicCartItems],
    (problematicItems) => problematicItems.length > 0
);

export const selectItemsExceedingStock = createSelector(
    [selectCartItems],
    (items) => items.filter(item => {
        const product = item.product;
        const availableQuantity = product?.availableQuantity || product?.stockQuantity || 0;
        return product && item.quantity > availableQuantity;
    })
);

// ===== ФОРМАТИРОВАННАЯ СТАТИСТИКА =====
export const selectFormattedCartStats = createSelector(
    [selectCartStats],
    (stats) => ({
        ...stats,
        totalAmountFormatted: new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB'
        }).format(stats.totalAmount),
        totalSavingsFormatted: new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB'
        }).format(stats.totalSavings),
        totalItemsText: getItemsCountText(stats.totalItems),
        savingsPercentage: stats.totalAmount > 0 ?
            Math.round((stats.totalSavings / (stats.totalAmount + stats.totalSavings)) * 100) : 0,
        isEmpty: stats.itemsCount === 0
    })
);

// ===== НЕДАВНО ДОБАВЛЕННЫЕ ТОВАРЫ =====
export const selectRecentlyAddedItems = createSelector(
    [selectCartItems],
    (items) => {
        const now = Date.now();
        const recentThreshold = 5000; // 5 секунд

        return items.filter(item => {
            const addedTime = item.addedAt || 0;
            return (now - addedTime) < recentThreshold;
        });
    }
);

// ===== РЕКОМЕНДУЕМЫЕ ТОВАРЫ =====
export const selectRecommendedProducts = createSelector(
    [selectCartItems, (state) => state.products?.items || EMPTY_ARRAY],
    (cartItems, allProducts) => {
        if (cartItems.length === 0) return EMPTY_ARRAY;

        // Получаем категории товаров в корзине
        const cartCategoryIds = [];
        const cartSupplierIds = [];

        cartItems.forEach(item => {
            if (item.product?.categories) {
                item.product.categories.forEach(cat => {
                    if (!cartCategoryIds.includes(cat.id)) {
                        cartCategoryIds.push(cat.id);
                    }
                });
            }
            if (item.product?.supplier?.id && !cartSupplierIds.includes(item.product.supplier.id)) {
                cartSupplierIds.push(item.product.supplier.id);
            }
        });

        // Товары уже в корзине
        const cartProductIds = cartItems.map(item =>
            item.productId || item.product?.id
        );

        // Фильтруем и сортируем рекомендации
        return allProducts
            .filter(product => {
                if (cartProductIds.includes(product.id)) return false;

                if (!product.isActive || (product.availableQuantity || product.stockQuantity) === 0) return false;

                const hasCommonCategory = product.categories?.some(cat =>
                    cartCategoryIds.includes(cat.id)
                );
                const sameSupplier = cartSupplierIds.includes(product.supplier?.id);

                return hasCommonCategory || sameSupplier;
            })
            .slice(0, 6);
    }
);

// ===== УВЕДОМЛЕНИЯ =====
export const selectCartNotifications = createSelector(
    [selectCartState],
    (cart) => cart.notifications || EMPTY_ARRAY
);

export const selectActiveNotifications = createSelector(
    [selectCartNotifications],
    (notifications) => notifications.filter(notification => {
        if (!notification.autoHide) return true;

        const now = Date.now();
        const notificationTime = new Date(notification.timestamp).getTime();
        const duration = notification.duration || 3000;

        return (now - notificationTime) < duration;
    })
);

export const selectNotificationsByType = createSelector(
    [selectCartNotifications, (state, type) => type],
    (notifications, type) => notifications.filter(notification => notification.type === type)
);

// ===== ДЕТАЛЬНАЯ ИНФОРМАЦИЯ =====
export const selectCartBreakdown = createSelector(
    [selectCartState],
    (cart) => cart.breakdown || EMPTY_ARRAY
);

export const selectWholesaleBreakdown = createSelector(
    [selectCartBreakdown],
    (breakdown) => breakdown.find(item => item.priceType === 'wholesale') || {
        priceType: 'wholesale',
        itemsCount: 0,
        totalAmount: 0,
        savings: 0
    }
);

export const selectRetailBreakdown = createSelector(
    [selectCartBreakdown],
    (breakdown) => breakdown.find(item => item.priceType === 'retail') || {
        priceType: 'retail',
        itemsCount: 0,
        totalAmount: 0,
        savings: 0
    }
);

// ===== ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ =====
export const selectShippingInfo = createSelector(
    [selectCartState],
    (cart) => ({
        shippingCost: cart.shippingCost,
        shippingInfo: cart.shippingInfo,
        hasShippingCost: cart.shippingCost !== null && cart.shippingCost > 0
    })
);

export const selectDiscountInfo = createSelector(
    [selectCartState],
    (cart) => ({
        appliedDiscount: cart.appliedDiscount,
        hasAppliedDiscount: cart.appliedDiscount && cart.appliedDiscount.applied
    })
);

export const selectCheckoutData = createSelector(
    [selectCartState],
    (cart) => cart.checkoutData || null
);

export const selectCartClientType = createSelector(
    [selectCartState],
    (cart) => cart.clientType || 'RETAIL'
);

export const selectIsWholesaleClient = createSelector(
    [selectCartClientType],
    (clientType) => clientType === 'WHOLESALE'
);

export const selectIsRetailClient = createSelector(
    [selectCartClientType],
    (clientType) => clientType === 'RETAIL'
);

// ===== ИТОГОВЫЕ СУММЫ С УЧЕТОМ ДОСТАВКИ И СКИДОК =====
export const selectCartTotalWithExtras = createSelector(
    [selectCartTotalAmount, selectShippingInfo, selectDiscountInfo],
    (cartTotal, shippingInfo, discountInfo) => {
        let total = cartTotal;

        // Добавляем доставку
        if (shippingInfo.hasShippingCost) {
            total += shippingInfo.shippingCost;
        }

        // Применяем скидку
        if (discountInfo.hasAppliedDiscount) {
            const discountAmount = discountInfo.appliedDiscount.amount || 0;
            total = Math.max(0, total - discountAmount);
        }

        return Math.round(total * 100) / 100;
    }
);

export const selectCartSummary = createSelector(
    [
        selectCartStats,
        selectCartTotalWithExtras,
        selectShippingInfo,
        selectDiscountInfo
    ],
    (stats, totalWithExtras, shippingInfo, discountInfo) => ({
        // Основная статистика
        itemsCount: stats.itemsCount,
        totalItems: stats.totalItems,
        clientType: stats.clientType,

        // Суммы
        subtotal: stats.totalAmount,
        savings: stats.totalSavings,
        shippingCost: shippingInfo.shippingCost || 0,
        discountAmount: discountInfo.hasAppliedDiscount ?
            (discountInfo.appliedDiscount.amount || 0) : 0,
        total: totalWithExtras,

        // Форматированные суммы
        subtotalFormatted: new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB'
        }).format(stats.totalAmount),
        savingsFormatted: new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB'
        }).format(stats.totalSavings),
        totalFormatted: new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB'
        }).format(totalWithExtras),

        // Дополнительная информация
        hasShipping: shippingInfo.hasShippingCost,
        hasDiscount: discountInfo.hasAppliedDiscount,
        hasSavings: stats.totalSavings > 0
    })
);

// ===== СЕЛЕКТОРЫ ДЛЯ ФИЛЬТРАЦИИ И ПОИСКА =====
export const selectCartItemsByCategory = createSelector(
    [selectCartItems, (state, categoryId) => categoryId],
    (items, categoryId) => items.filter(item =>
        item.product?.categories?.some(cat => cat.id === categoryId)
    )
);

export const selectCartItemsByPriceRange = createSelector(
    [selectCartItems, (state, minPrice, maxPrice) => ({ minPrice, maxPrice })],
    (items, { minPrice, maxPrice }) => items.filter(item => {
        const price = item.product?.price || 0;
        return price >= minPrice && price <= maxPrice;
    })
);

export const selectCartItemsBySupplierFilter = createSelector(
    [selectCartItems, (state, supplierId) => supplierId],
    (items, supplierId) => items.filter(item =>
        item.product?.supplier?.id === supplierId
    )
);

export const selectCartItemsByAvailability = createSelector(
    [selectCartItems],
    (items) => ({
        available: items.filter(item => {
            const product = item.product;
            const availableQuantity = product?.availableQuantity || product?.stockQuantity || 0;
            return product?.isActive && availableQuantity >= item.quantity;
        }),
        unavailable: items.filter(item => {
            const product = item.product;
            const availableQuantity = product?.availableQuantity || product?.stockQuantity || 0;
            return !product?.isActive || availableQuantity < item.quantity;
        })
    })
);

// ===== СЕЛЕКТОРЫ ДЛЯ СОРТИРОВКИ =====
export const selectCartItemsSorted = createSelector(
    [selectCartItems, (state, sortBy, sortOrder) => ({ sortBy, sortOrder })],
    (items, { sortBy, sortOrder = 'asc' }) => {
        const sortedItems = [...items];

        sortedItems.sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'name':
                    aValue = a.product?.name || '';
                    bValue = b.product?.name || '';
                    break;
                case 'price':
                    aValue = a.product?.price || 0;
                    bValue = b.product?.price || 0;
                    break;
                case 'quantity':
                    aValue = a.quantity || 0;
                    bValue = b.quantity || 0;
                    break;
                case 'subtotal':
                    aValue = a.quantity * (a.product?.price || 0);
                    bValue = b.quantity * (b.product?.price || 0);
                    break;
                case 'supplier':
                    aValue = a.product?.supplier?.companyName || '';
                    bValue = b.product?.supplier?.companyName || '';
                    break;
                case 'addedAt':
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

            if (sortOrder === 'desc') {
                return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            } else {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            }
        });

        return sortedItems;
    }
);

// ===== СЕЛЕКТОРЫ ДЛЯ АНАЛИТИКИ =====
export const selectCartAnalytics = createSelector(
    [selectCartItems, selectCartState],
    (items, cartState) => {
        const clientType = cartState.clientType || 'RETAIL';

        // Анализ по категориям
        const categoryAnalytics = {};

        // Анализ по поставщикам
        const supplierAnalytics = {};

        // Анализ по ценовым сегментам
        const priceSegments = {
            budget: { min: 0, max: 1000, items: [], total: 0 },
            medium: { min: 1000, max: 5000, items: [], total: 0 },
            premium: { min: 5000, max: Infinity, items: [], total: 0 }
        };

        items.forEach(item => {
            const product = item.product;
            if (!product) return;

            // Анализ по категориям
            if (product.categories) {
                product.categories.forEach(category => {
                    if (!categoryAnalytics[category.id]) {
                        categoryAnalytics[category.id] = {
                            name: category.name,
                            itemsCount: 0,
                            totalQuantity: 0,
                            totalAmount: 0
                        };
                    }

                    categoryAnalytics[category.id].itemsCount++;
                    categoryAnalytics[category.id].totalQuantity += item.quantity;
                    categoryAnalytics[category.id].totalAmount += item.quantity * product.price;
                });
            }

            // Анализ по поставщикам
            const supplierId = product.supplier?.id || 'unknown';
            if (!supplierAnalytics[supplierId]) {
                supplierAnalytics[supplierId] = {
                    name: product.supplier?.companyName || 'Неизвестный поставщик',
                    itemsCount: 0,
                    totalQuantity: 0,
                    totalAmount: 0
                };
            }

            supplierAnalytics[supplierId].itemsCount++;
            supplierAnalytics[supplierId].totalQuantity += item.quantity;
            supplierAnalytics[supplierId].totalAmount += item.quantity * product.price;

            // Анализ по ценовым сегментам
            const price = product.price;
            Object.keys(priceSegments).forEach(segment => {
                const { min, max } = priceSegments[segment];
                if (price >= min && price < max) {
                    priceSegments[segment].items.push(item);
                    priceSegments[segment].total += item.quantity * price;
                }
            });
        });

        return {
            categories: Object.values(categoryAnalytics),
            suppliers: Object.values(supplierAnalytics),
            priceSegments,
            averageItemValue: items.length > 0 ?
                cartState.totalAmount / items.length : 0,
            averageQuantityPerItem: items.length > 0 ?
                cartState.totalItems / items.length : 0
        };
    }
);

// ===== СЕЛЕКТОРЫ ДЛЯ ОПТИМИЗАЦИИ ПРОИЗВОДИТЕЛЬНОСТИ =====
export const selectCartItemsIds = createSelector(
    [selectCartItems],
    (items) => items.map(item => item.id)
);

export const selectCartProductIds = createSelector(
    [selectCartItems],
    (items) => items.map(item => item.productId || item.product?.id).filter(Boolean)
);

export const selectCartLastUpdate = createSelector(
    [selectCartState],
    (cart) => cart.lastFetchTime
);

// ===== СЕЛЕКТОРЫ ДЛЯ КЕШИРОВАНИЯ =====
export const selectCartCacheStatus = createSelector(
    [selectCartState],
    (cart) => {
        const now = Date.now();
        const lastFetch = cart.lastFetchTime;
        const cacheAge = lastFetch ? now - lastFetch : null;
        const isStale = cacheAge && cacheAge > 2 * 60 * 1000; // 2 минуты

        return {
            lastFetchTime: lastFetch,
            cacheAge,
            isStale,
            shouldRefresh: isStale || !lastFetch
        };
    }
);

// ===== СЕЛЕКТОРЫ ДЛЯ UI СОСТОЯНИЙ =====
export const selectCartUIState = createSelector(
    [selectCartState, selectCartValidation],
    (cart, validation) => ({
        loading: cart.loading || false,
        validating: cart.validating || false,
        preparingCheckout: cart.preparingCheckout || false,
        hasError: !!cart.error,
        error: cart.error,
        isValidated: validation.isValidated,
        canProceedToCheckout: validation.canProceedToCheckout,
        hasNotifications: (cart.notifications || EMPTY_ARRAY).length > 0,
        notificationsCount: (cart.notifications || EMPTY_ARRAY).length
    })
);

// ===== МЕМОИЗИРОВАННЫЕ СЕЛЕКТОРЫ ДЛЯ ДОРОГИХ ВЫЧИСЛЕНИЙ =====
export const selectCartMetrics = createSelector(
    [selectCartItems, selectCartState],
    (items, cartState) => {
        if (items.length === 0) {
            return {
                totalValue: 0,
                averageItemValue: 0,
                totalWeight: 0,
                estimatedDeliveryTime: 0,
                complexity: 'simple'
            };
        }

        const totalValue = cartState.totalAmount || 0;
        const averageItemValue = totalValue / items.length;

        const totalWeight = items.reduce((sum, item) => {
            const weight = item.product?.weight || 0;
            return sum + (weight * item.quantity);
        }, 0);

        // Простая оценка времени доставки на основе количества поставщиков
        const uniqueSuppliers = new Set(
            items.map(item => item.product?.supplier?.id)
        ).size;

        const estimatedDeliveryTime = Math.max(1, uniqueSuppliers) * 24; // часы

        // Определение сложности заказа
        let complexity = 'simple';
        if (items.length > 10 || uniqueSuppliers > 3) {
            complexity = 'complex';
        } else if (items.length > 5 || uniqueSuppliers > 1) {
            complexity = 'medium';
        }

        return {
            totalValue,
            averageItemValue,
            totalWeight,
            estimatedDeliveryTime,
            complexity,
            uniqueSuppliers
        };
    }
);

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function getItemsCountText(count) {
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
}