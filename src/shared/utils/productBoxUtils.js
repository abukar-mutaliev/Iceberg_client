/**
 * Утилиты для работы с коробочной логикой продуктов (БЕЗ штучной продажи)
 */

/**
 * Форматирование цены в рублях
 * @param {number} price - Цена
 * @param {Object} options - Опции форматирования
 * @returns {string} - Отформатированная цена
 */
export const formatPrice = (price, options = {}) => {
    const {
        currency = 'RUB',
        minimumFractionDigits = 0,
        maximumFractionDigits = 2,
        locale = 'ru-RU'
    } = options;

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(price || 0);
};

// /**
//  * Расчет количества коробок из количества штук (ЗАКОММЕНТИРОВАНО - только коробочная продажа)
//  * @param {number} itemsCount - Количество штук
//  * @param {number} itemsPerBox - Штук в коробке
//  * @returns {number} - Количество коробок
//  */
// export const calculateBoxesFromItems = (itemsCount, itemsPerBox) => {
//     if (!itemsPerBox || itemsPerBox <= 0) return itemsCount;
//     return Math.ceil(itemsCount / itemsPerBox);
// };

/**
 * Расчет количества штук из количества коробок (для отображения информации)
 * @param {number} boxesCount - Количество коробок
 * @param {number} itemsPerBox - Штук в коробке
 * @returns {number} - Количество штук
 */
export const calculateItemsFromBoxes = (boxesCount, itemsPerBox) => {
    return (boxesCount || 0) * (itemsPerBox || 1);
};

/**
 * Расчет общей стоимости (только коробками)
 * @param {number} boxesQuantity - Количество коробок
 * @param {number} boxPrice - Цена за коробку
 * @returns {number} - Общая стоимость
 */
export const calculateTotalPrice = (boxesQuantity, boxPrice) => {
    return (boxesQuantity || 0) * (boxPrice || 0);
};

/**
 * Расчет экономии при покупке коробкой
 * @param {number} itemsPerBox - Штук в коробке
 * @param {number} pricePerItem - Цена за штуку
 * @param {number} boxPrice - Цена за коробку
 * @returns {Object} - Информация об экономии
 */
export const calculateSavings = (itemsPerBox, pricePerItem, boxPrice) => {
    const calculatedBoxPrice = itemsPerBox * pricePerItem;
    const savingsAmount = Math.max(0, calculatedBoxPrice - boxPrice);
    const savingsPercentage = calculatedBoxPrice > 0
        ? (savingsAmount / calculatedBoxPrice) * 100
        : 0;

    return {
        savingsAmount,
        savingsPercentage,
        calculatedBoxPrice,
        actualBoxPrice: boxPrice,
        hasSavings: savingsAmount > 0
    };
};

/**
 * Проверка возможности заказа указанного количества коробок
 * @param {number} requestedBoxes - Запрашиваемое количество коробок
 * @param {number} availableBoxes - Доступное количество коробок
 * @param {number} minimumOrderBoxes - Минимальный заказ в коробках
 * @param {boolean} isActive - Активен ли товар
 * @returns {Object} - Результат проверки
 */
export const validateOrderQuantity = (requestedBoxes, availableBoxes, minimumOrderBoxes = 1, isActive = true) => {
    const boxes = parseInt(requestedBoxes, 10) || 0;
    const available = parseInt(availableBoxes, 10) || 0;
    const minimum = parseInt(minimumOrderBoxes, 10) || 1;

    // Основные проверки
    const checks = {
        isActive,
        hasQuantity: boxes > 0,
        meetsMinimum: boxes >= minimum,
        withinAvailable: boxes <= available,
        hasStock: available > 0
    };

    // Определяем можно ли заказать
    const canOrder = Object.values(checks).every(check => check === true);

    // Сообщения об ошибках
    const errors = [];
    if (!checks.isActive) errors.push('Товар больше не продается');
    if (!checks.hasStock) errors.push('Товара нет в наличии');
    if (!checks.hasQuantity) errors.push('Укажите количество больше 0');
    if (!checks.meetsMinimum) errors.push(`Минимальный заказ: ${minimum} коробок`);
    if (!checks.withinAvailable) errors.push(`Доступно только ${available} коробок`);

    return {
        canOrder,
        checks,
        errors,
        requestedBoxes: boxes,
        availableBoxes: available,
        minimumOrderBoxes: minimum,
        maxAvailable: available
    };
};

/**
 * Определение статуса продукта на основе его данных
 * @param {Object} product - Данные продукта
 * @returns {Object} - Статус продукта
 */
export const getProductStatus = (product) => {
    if (!product) {
        return {
            status: 'unknown',
            label: 'Неизвестно',
            color: '#999999',
            isAvailable: false
        };
    }

    const {
        isActive = true,
        availableBoxes = 0,
        stockQuantity = 0,
        itemsPerBox = 1
    } = product;

    const available = availableBoxes || stockQuantity || 0;
    const totalItems = available * itemsPerBox;

    if (!isActive) {
        return {
            status: 'inactive',
            label: 'Не продается',
            color: '#FF3B30',
            isAvailable: false
        };
    }

    if (available === 0) {
        return {
            status: 'out_of_stock',
            label: 'Нет в наличии',
            color: '#FF3B30',
            isAvailable: false
        };
    }

    if (available <= 5) {
        return {
            status: 'low_stock',
            label: `Остается мало (${available} коробок)`,
            color: '#FF9500',
            isAvailable: true
        };
    }

    return {
        status: 'available',
        label: `В наличии (${available} коробок, ${totalItems} шт.)`,
        color: '#34C759',
        isAvailable: true
    };
};

/**
 * Нормализация данных продукта для коробочной логики
 * @param {Object} rawProduct - Сырые данные продукта
 * @returns {Object} - Нормализованные данные
 */
export const normalizeProductData = (rawProduct) => {
    if (!rawProduct) return null;

    const product = rawProduct.originalData || rawProduct;

    const id = product.id || null;
    const name = product.name || product.title || '';
    const description = product.description || '';
    const isActive = product.isActive !== false;

    const itemsPerBox = Math.max(1, parseInt(product.itemsPerBox, 10) || 1);
    const pricePerItem = parseFloat(product.price) || 0;
    const boxPrice = parseFloat(product.boxPrice) || (pricePerItem * itemsPerBox);

    const stockQuantityBoxes = parseInt(product.stockQuantity, 10) || 0;
    const reservedBoxes = parseInt(product.reservedQuantity, 10) || 0;
    const availableBoxes = Math.max(0, stockQuantityBoxes - reservedBoxes);
    const totalItems = stockQuantityBoxes * itemsPerBox;
    const availableItems = availableBoxes * itemsPerBox;

    const minimumOrderBoxes = Math.max(1, parseInt(product.minimumOrder, 10) || 1);

    const savings = calculateSavings(itemsPerBox, pricePerItem, boxPrice);

    const status = getProductStatus({
        isActive,
        availableBoxes,
        stockQuantity: stockQuantityBoxes,
        itemsPerBox
    });

    return {
        id,
        name,
        description,
        isActive,
        supplier: product.supplier || null,
        categories: product.categories || [],
        images: product.images || [],
        weight: product.weight || null,

        itemsPerBox,
        pricePerItem,
        boxPrice,
        stockQuantityBoxes,
        totalItems,

        availableBoxes,
        availableItems,
        reservedBoxes,

        minimumOrderBoxes,

        savingsPerBox: savings.savingsAmount,
        savingsPercentage: savings.savingsPercentage,
        hasSavings: savings.hasSavings,

        status: status.status,
        statusLabel: status.label,
        statusColor: status.color,
        isAvailable: status.isAvailable,
        isLowStock: status.status === 'low_stock',

        formattedPricePerItem: formatPrice(pricePerItem),
        formattedBoxPrice: formatPrice(boxPrice),
        formattedSavings: formatPrice(savings.savingsAmount),

        boxInfo: {
            itemsPerBox,
            boxPrice,
            pricePerItem,
            availableBoxes,
            totalItems: availableItems,
            minimumOrder: minimumOrderBoxes
        },

        // Методы для работы только с коробками
        calculateItemsFromBoxes: (boxes) => calculateItemsFromBoxes(boxes, itemsPerBox),
        calculateTotalPrice: (boxesQuantity) => calculateTotalPrice(boxesQuantity, boxPrice),
        canOrderQuantity: (boxesQuantity) => {
            const validation = validateOrderQuantity(
                boxesQuantity,
                availableBoxes,
                minimumOrderBoxes,
                isActive
            );
            return validation.canOrder;
        },

        // Совместимость с существующим кодом
        price: pricePerItem,
        stockQuantity: availableBoxes,
        availableQuantity: availableBoxes
    };
};

/**
 * Преобразование данных корзины для коробочной логики
 * @param {Array} cartItems - Элементы корзины
 * @returns {Object} - Обработанные данные корзины
 */
export const processCartData = (cartItems) => {
    if (!Array.isArray(cartItems)) {
        return {
            items: [],
            totals: {
                totalBoxes: 0,
                totalItems: 0,
                totalPrice: 0,
                itemsCount: 0
            },
            isEmpty: true
        };
    }

    let totalBoxes = 0;
    let totalItems = 0;
    let totalPrice = 0;
    const itemsCount = cartItems.length;

    const processedItems = cartItems.map(item => {
        const product = normalizeProductData(item.product);
        const quantityBoxes = parseInt(item.quantity, 10) || 0;

        if (!product) {
            return {
                ...item,
                hasError: true,
                error: 'Данные о продукте недоступны'
            };
        }

        const quantityItems = product.calculateItemsFromBoxes(quantityBoxes);
        const itemTotalPrice = product.calculateTotalPrice(quantityBoxes);

        // Проверка доступности
        const validation = validateOrderQuantity(
            quantityBoxes,
            product.availableBoxes,
            product.minimumOrderBoxes,
            product.isActive
        );

        totalBoxes += quantityBoxes;
        totalItems += quantityItems;
        totalPrice += itemTotalPrice;

        return {
            ...item,
            product,
            quantityBoxes,
            quantityItems,
            itemTotalPrice,
            formattedItemPrice: formatPrice(itemTotalPrice),
            validation,
            hasError: !validation.canOrder,
            error: validation.errors.join(', ')
        };
    });

    return {
        items: processedItems,
        totals: {
            totalBoxes,
            totalItems,
            totalPrice,
            formattedTotalPrice: formatPrice(totalPrice),
            itemsCount
        },
        isEmpty: itemsCount === 0,
        hasErrors: processedItems.some(item => item.hasError)
    };
};

// /**
//  * Создание рекомендаций по количеству для заказа (ЗАКОММЕНТИРОВАНО - только коробочная продажа)
//  * @param {Object} product - Данные продукта
//  * @param {number} desiredItems - Желаемое количество штук
//  * @returns {Object} - Рекомендации
//  */
// export const getOrderRecommendations = (product, desiredItems = 1) => {
//     if (!product) {
//         return {
//             recommendedBoxes: 1,
//             actualItems: 1,
//             canOrder: false,
//             error: 'Данные о продукте недоступны'
//         };
//     }

//     const normalizedProduct = normalizeProductData(product);
//     const recommendedBoxes = normalizedProduct.calculateBoxesFromItems(desiredItems);
//     const actualItems = normalizedProduct.calculateItemsFromBoxes(recommendedBoxes);

//     const validation = validateOrderQuantity(
//         recommendedBoxes,
//         normalizedProduct.availableBoxes,
//         normalizedProduct.minimumOrderBoxes,
//         normalizedProduct.isActive
//     );

//     const totalPrice = normalizedProduct.calculateTotalPrice(recommendedBoxes);
//     const pricePerActualItem = actualItems > 0 ? totalPrice / actualItems : 0;

//     return {
//         recommendedBoxes,
//         actualItems,
//         desiredItems,
//         extraItems: actualItems - desiredItems,
//         totalPrice,
//         formattedTotalPrice: formatPrice(totalPrice),
//         pricePerActualItem,
//         formattedPricePerItem: formatPrice(pricePerActualItem),
//         canOrder: validation.canOrder,
//         validation,
//         product: normalizedProduct
//     };
// };

/**
 * Группировка продуктов по поставщикам для заказа
 * @param {Array} cartItems - Элементы корзины
 * @returns {Array} - Группы по поставщикам
 */
export const groupCartBySuppliers = (cartItems) => {
    const processedCart = processCartData(cartItems);
    const supplierGroups = new Map();

    processedCart.items.forEach(item => {
        const supplierId = item.product?.supplier?.id || 'unknown';
        const supplierName = item.product?.supplier?.companyName || 'Неизвестный поставщик';

        if (!supplierGroups.has(supplierId)) {
            supplierGroups.set(supplierId, {
                supplierId,
                supplierName,
                supplier: item.product?.supplier,
                items: [],
                totals: {
                    totalBoxes: 0,
                    totalItems: 0,
                    totalPrice: 0,
                    itemsCount: 0
                }
            });
        }

        const group = supplierGroups.get(supplierId);
        group.items.push(item);
        group.totals.totalBoxes += item.quantityBoxes;
        group.totals.totalItems += item.quantityItems;
        group.totals.totalPrice += item.itemTotalPrice;
        group.totals.itemsCount += 1;
        group.totals.formattedTotalPrice = formatPrice(group.totals.totalPrice);
    });

    return Array.from(supplierGroups.values());
};

/**
 * Форматирование количества только для коробок
 * @param {number} boxesCount - Количество коробок
 * @param {number} itemsPerBox - Штук в коробке
 * @returns {string} - Отформатированное количество
 */
export const formatBoxQuantity = (boxesCount, itemsPerBox = 1) => {
    if (itemsPerBox === 1) {
        return `${boxesCount} шт.`;
    }
    const totalItems = boxesCount * itemsPerBox;
    return `${boxesCount} коробок (${totalItems} шт.)`;
};

/**
 * Получение информации о минимальном заказе
 * @param {Object} product - Данные продукта
 * @returns {Object} - Информация о минимальном заказе
 */
export const getMinimumOrderInfo = (product) => {
    if (!product) {
        return {
            minimumBoxes: 1,
            minimumItems: 1,
            formattedMinimum: '1 коробка'
        };
    }

    const normalizedProduct = normalizeProductData(product);
    const minimumBoxes = normalizedProduct.minimumOrderBoxes;
    const minimumItems = normalizedProduct.calculateItemsFromBoxes(minimumBoxes);

    return {
        minimumBoxes,
        minimumItems,
        formattedMinimum: formatBoxQuantity(minimumBoxes, normalizedProduct.itemsPerBox)
    };
};

/**
 * Проверка, можно ли заказать указанное количество коробок
 * @param {Object} product - Данные продукта
 * @param {number} requestedBoxes - Запрашиваемое количество коробок
 * @returns {Object} - Результат проверки
 */
export const checkBoxOrderability = (product, requestedBoxes) => {
    const normalizedProduct = normalizeProductData(product);

    if (!normalizedProduct) {
        return {
            canOrder: false,
            error: 'Продукт недоступен',
            adjustedQuantity: 0
        };
    }

    const validation = validateOrderQuantity(
        requestedBoxes,
        normalizedProduct.availableBoxes,
        normalizedProduct.minimumOrderBoxes,
        normalizedProduct.isActive
    );

    return {
        canOrder: validation.canOrder,
        errors: validation.errors,
        adjustedQuantity: Math.min(requestedBoxes, normalizedProduct.availableBoxes),
        availableBoxes: normalizedProduct.availableBoxes,
        minimumBoxes: normalizedProduct.minimumOrderBoxes,
        requestedBoxes,
        product: normalizedProduct
    };
};

export default {
    formatPrice,
    // calculateBoxesFromItems, // ЗАКОММЕНТИРОВАНО
    calculateItemsFromBoxes,
    calculateTotalPrice,
    calculateSavings,
    validateOrderQuantity,
    getProductStatus,
    normalizeProductData,
    processCartData,
    // getOrderRecommendations, // ЗАКОММЕНТИРОВАНО
    groupCartBySuppliers,
    formatBoxQuantity,
    getMinimumOrderInfo,
    checkBoxOrderability
};