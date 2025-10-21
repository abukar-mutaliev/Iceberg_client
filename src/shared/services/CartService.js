import { createApiModule } from "@shared/services/ApiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

const cartApi = createApiModule('/api/cart');
const GUEST_CART_KEY = 'guest_cart';

/**
 * Утилиты для коробочной логики в корзине
 */
const BoxUtils = {

    /**
     * Расчет штук из коробок (для отображения информации)
     */
    calculateItemsFromBoxes: (boxesCount, itemsPerBox = 1) => {
        return boxesCount * itemsPerBox;
    },

    /**
     * Форматирование количества с учетом коробок
     */
    formatQuantity: (quantity, itemsPerBox = 1) => {
        if (itemsPerBox === 1) {
            return `${quantity} шт.`;
        }
        const totalItems = quantity * itemsPerBox;
        return `${quantity} коробок (${totalItems} шт.)`;
    },

    /**
     * Расчет цены с учетом коробочной логики
     */
    calculatePrice: (quantity, product, clientType = 'RETAIL') => {
        if (!product) return 0;

        const itemsPerBox = product.itemsPerBox || 1;
        const boxPrice = product.boxPrice || (product.price * itemsPerBox);

        // Для коробочной продажи используем цену за коробку
        let finalPrice = boxPrice;

        // Проверяем оптовые цены для коробок
        if (clientType === 'WHOLESALE' &&
            product.wholesalePrice &&
            quantity >= (product.wholesaleMinQty || 50)) {
            finalPrice = product.wholesalePrice * itemsPerBox;
        }

        return quantity * finalPrice;
    },

    /**
     * Расчет экономии для коробочной продажи
     */
    calculateSavings: (quantity, product, clientType = 'RETAIL') => {
        if (!product || clientType !== 'WHOLESALE') return 0;

        const itemsPerBox = product.itemsPerBox || 1;
        const boxPrice = product.boxPrice || (product.price * itemsPerBox);

        if (product.wholesalePrice && quantity >= (product.wholesaleMinQty || 50)) {
            const wholesaleBoxPrice = product.wholesalePrice * itemsPerBox;
            return quantity * Math.max(0, boxPrice - wholesaleBoxPrice);
        }

        return 0;
    }
};

const CartService = {
    /**
     * Получить корзину
     */
    getCart: () =>
        cartApi.get('', { _t: Date.now() }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        }),

    /**
     * Получить статистику корзины
     */
    getCartStats: () =>
        cartApi.get('/summary', { _t: Date.now() }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        }),

    /**
     * Получить детальную статистику корзины с коробочной информацией
     */
    getDetailedCartStats: () =>
        cartApi.get('/stats/detailed', { _t: Date.now() }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        }),

    /**
     * Добавить товар в корзину (количество указывается в коробках)
     * @param {number} productId - ID продукта
     * @param {number} quantity - Количество коробок (по умолчанию 1)
     */
    addToCart: (productId, quantity = 1) =>
        cartApi.post('/add', {
            productId: parseInt(productId),
            quantity: parseInt(quantity)
        }),

    // /**
    //  * Добавить товар в корзину по количеству штук (ЗАКОММЕНТИРОВАНО - только коробочная продажа)
    //  * @param {number} productId - ID продукта
    //  * @param {number} itemsCount - Количество штук
    //  * @param {number} itemsPerBox - Количество штук в коробке
    //  */
    // addItemsToCart: async (productId, itemsCount, itemsPerBox = 1) => {
    //     const requiredBoxes = BoxUtils.calculateBoxesFromItems(itemsCount, itemsPerBox);
    //     return CartService.addToCart(productId, requiredBoxes);
    // },

    /**
     * Быстрое добавление с возвратом статистики
     */
    quickAddToCart: (productId, quantity = 1) =>
        cartApi.post('/quick-add', {
            productId: parseInt(productId),
            quantity: parseInt(quantity)
        }),

    /**
     * Обновить количество товара в корзине (в коробках)
     */
    updateCartItem: (itemId, quantity) =>
        cartApi.put(`/items/${itemId}`, {
            quantity: parseInt(quantity)
        }),

    /**
     * Удалить товар из корзины
     */
    removeFromCart: (itemId) =>
        cartApi.delete(`/items/${itemId}`),

    /**
     * Очистить корзину
     */
    clearCart: () =>
        cartApi.delete('/clear'),

    /**
     * Валидация корзины с проверкой коробочных ограничений
     */
    validateCart: () =>
        cartApi.post('/validate'),

    /**
     * Расширенная валидация корзины с коробочной логикой
     */
    validateCartDetailed: () =>
        cartApi.post('/validate/detailed'),


    /**
     * Создать заказ из корзины
     */
    checkout: (orderData = {}) =>
        cartApi.post('/checkout', {
            addressId: orderData.addressId || null,
            deliveryAddress: orderData.deliveryAddress || '',
            comment: orderData.comment || '',
            expectedDeliveryDate: orderData.expectedDeliveryDate || null,
            paymentMethod: orderData.paymentMethod || 'CASH',
            usePreauthorization: orderData.usePreauthorization || false
        }),


    prepareCheckout: async (options = {}) => {
        console.warn('prepareCheckout не реализован на бэкенде, возвращаем заглушку');
        return {
            status: 'success',
            data: {
                canProceed: true,
                message: 'Готов к оформлению'
            }
        };
    },

    setClientType: async (clientType, additionalData = {}) => {
        console.warn('setClientType не реализован на бэкенде, используем локальное хранение');
        return CartService.setGuestCartClientType(clientType);
    },

    applyDiscount: async (discountCode, applyToItems = null) => {
        console.warn('applyDiscount не реализован на бэкенде');
        throw new Error('Применение скидок временно недоступно');
    },

    calculateShipping: async (deliveryAddress, deliveryType = 'STANDARD', deliveryDate = null) => {
        console.warn('calculateShipping не реализован на бэкенде');
        return {
            status: 'success',
            data: {
                cost: 0,
                message: 'Бесплатная доставка'
            }
        };
    },

    /**
     * Объединить корзины (для гостей → авторизованных)
     */
    mergeCart: (items) =>
        cartApi.post('/merge', {
            items: items.map(item => ({
                productId: parseInt(item.productId || item.id),
                quantity: parseInt(item.quantity)
            }))
        }),

    // ===== МАССОВЫЕ ОПЕРАЦИИ =====


    /**
     * Массовое обновление количества товаров (в коробках)
     */
    bulkUpdateQuantities: (updates) =>
        cartApi.patch('/bulk/update', {
            updates: updates.map(update => ({
                itemId: parseInt(update.itemId),
                quantity: parseInt(update.quantity)
            }))
        }),


    /**
     * Массовое удаление товаров
     */
    bulkRemoveItems: (itemIds) =>
        cartApi.delete('/bulk/remove', {
            data: {
                itemIds: itemIds.map(id => parseInt(id))
            }
        }),

    getBoxInfo: (productId) =>
        cartApi.get(`/box-info/${productId}`),


    // ===== РАБОТА С ГОСТЕВОЙ КОРЗИНОЙ (С КОРОБОЧНОЙ ЛОГИКОЙ) =====

    /**
     * Получить гостевую корзину из локального хранилища
     */
    getGuestCart: async () => {
        try {
            const guestCartStr = await AsyncStorage.getItem(GUEST_CART_KEY);

            if (!guestCartStr) {
                return {
                    items: [],
                    totalItems: 0,
                    totalBoxes: 0,
                    totalAmount: 0,
                    itemsCount: 0,
                    totalSavings: 0,
                    clientType: 'RETAIL'
                };
            }

            const guestCart = JSON.parse(guestCartStr);

            // Валидируем структуру гостевой корзины
            if (!guestCart.items || !Array.isArray(guestCart.items)) {
                return {
                    items: [],
                    totalItems: 0,
                    totalBoxes: 0,
                    totalAmount: 0,
                    itemsCount: 0,
                    totalSavings: 0,
                    clientType: 'RETAIL'
                };
            }

            // Пересчитываем статистику с коробочной логикой
            const stats = CartService.calculateGuestCartStats(guestCart.items, guestCart.clientType);

            return {
                items: guestCart.items,
                ...stats,
                clientType: guestCart.clientType || 'RETAIL',
                updatedAt: guestCart.updatedAt || new Date().toISOString()
            };
        } catch (error) {
            console.error('CartService.getGuestCart error:', error);
            return {
                items: [],
                totalItems: 0,
                totalBoxes: 0,
                totalAmount: 0,
                itemsCount: 0,
                totalSavings: 0,
                clientType: 'RETAIL'
            };
        }
    },

    /**
     * Сохранить гостевую корзину в локальное хранилище
     */
    saveGuestCart: async (cartData) => {
        try {
            const dataToSave = {
                ...cartData,
                updatedAt: new Date().toISOString()
            };

            await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(dataToSave));
            return true;
        } catch (error) {
            console.error('CartService.saveGuestCart error:', error);
            return false;
        }
    },

    /**
     * Добавить товар в гостевую корзину (только коробками)
     */
    addToGuestCart: async (product, quantity = 1, clientType = 'RETAIL') => {
        try {
            const guestCart = await CartService.getGuestCart();

            // Проверяем, есть ли уже этот товар в корзине
            const existingItemIndex = guestCart.items.findIndex(item =>
                (item.productId || item.product?.id) === product.id
            );

            if (existingItemIndex !== -1) {
                // Обновляем количество существующего товара (в коробках)
                guestCart.items[existingItemIndex].quantity += quantity;
            } else {
                // Добавляем новый товар
                const newItem = {
                    id: Date.now(), // Временный ID для гостевой корзины
                    productId: product.id,
                    quantity, // количество коробок
                    product: {
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        boxPrice: product.boxPrice,
                        itemsPerBox: product.itemsPerBox || 1,
                        wholesalePrice: product.wholesalePrice,
                        wholesaleMinQty: product.wholesaleMinQty,
                        images: product.images || [],
                        stockQuantity: product.stockQuantity,
                        availableQuantity: product.availableQuantity,
                        isActive: product.isActive,
                        supplier: product.supplier,
                        weight: product.weight
                    },
                    addedAt: Date.now()
                };

                guestCart.items.push(newItem);
            }

            // Пересчитываем статистику с учетом типа клиента и коробочной логики
            const stats = CartService.calculateGuestCartStats(guestCart.items, clientType);
            const updatedCart = {
                items: guestCart.items,
                clientType,
                ...stats
            };

            await CartService.saveGuestCart(updatedCart);

            return {
                success: true,
                cart: updatedCart,
                action: existingItemIndex !== -1 ? 'updated' : 'added'
            };
        } catch (error) {
            console.error('CartService.addToGuestCart error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Обновить количество товара в гостевой корзине (в коробках)
     */
    updateGuestCartItem: async (itemId, quantity) => {
        try {
            const guestCart = await CartService.getGuestCart();
            const itemIndex = guestCart.items.findIndex(item => item.id === itemId);

            if (itemIndex === -1) {
                throw new Error('Товар в корзине не найден');
            }

            if (quantity <= 0) {
                // Удаляем товар
                guestCart.items.splice(itemIndex, 1);
            } else {
                // Обновляем количество (в коробках)
                guestCart.items[itemIndex].quantity = quantity;
            }

            const stats = CartService.calculateGuestCartStats(guestCart.items, guestCart.clientType);
            const updatedCart = {
                items: guestCart.items,
                clientType: guestCart.clientType,
                ...stats
            };

            await CartService.saveGuestCart(updatedCart);

            return {
                success: true,
                cart: updatedCart
            };
        } catch (error) {
            console.error('CartService.updateGuestCartItem error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Удалить товар из гостевой корзины
     */
    removeFromGuestCart: async (itemId) => {
        try {
            const guestCart = await CartService.getGuestCart();
            guestCart.items = guestCart.items.filter(item => item.id !== itemId);

            const stats = CartService.calculateGuestCartStats(guestCart.items, guestCart.clientType);
            const updatedCart = {
                items: guestCart.items,
                clientType: guestCart.clientType,
                ...stats
            };

            await CartService.saveGuestCart(updatedCart);

            return {
                success: true,
                cart: updatedCart
            };
        } catch (error) {
            console.error('CartService.removeFromGuestCart error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Очистить гостевую корзину
     */
    clearGuestCart: async () => {
        try {
            await AsyncStorage.removeItem(GUEST_CART_KEY);
            return {
                success: true,
                cart: {
                    items: [],
                    totalItems: 0,
                    totalBoxes: 0,
                    totalAmount: 0,
                    itemsCount: 0,
                    totalSavings: 0,
                    clientType: 'RETAIL'
                }
            };
        } catch (error) {
            console.error('CartService.clearGuestCart error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // ===== УТИЛИТЫ С КОРОБОЧНОЙ ЛОГИКОЙ =====

    /**
     * Подсчет статистики гостевой корзины с учетом коробочной логики
     */
    calculateGuestCartStats: (items = [], clientType = 'RETAIL') => {
        const validItems = items.filter(item =>
            item && item.product && item.quantity > 0
        );

        return validItems.reduce((acc, item) => {
            const product = item.product;
            const quantityBoxes = item.quantity; // количество коробок
            const itemsPerBox = product.itemsPerBox || 1;
            const totalItemsForProduct = quantityBoxes * itemsPerBox;

            // Расчет цены с учетом коробочной логики
            const itemTotal = BoxUtils.calculatePrice(quantityBoxes, product, clientType);
            const itemSavings = BoxUtils.calculateSavings(quantityBoxes, product, clientType);

            return {
                totalBoxes: acc.totalBoxes + quantityBoxes,
                totalItems: acc.totalItems + totalItemsForProduct,
                totalAmount: acc.totalAmount + itemTotal,
                totalSavings: acc.totalSavings + itemSavings,
                itemsCount: acc.itemsCount + 1
            };
        }, {
            totalBoxes: 0,
            totalItems: 0,
            totalAmount: 0,
            totalSavings: 0,
            itemsCount: 0
        });
    },

    /**
     * Валидация товаров в гостевой корзине с учетом коробочной логики
     */
    validateGuestCartItems: async (items, allProducts) => {
        const validatedItems = [];
        const issues = [];

        for (const item of items) {
            // Находим актуальную информацию о продукте
            const currentProduct = allProducts.find(p => p.id === item.productId);

            if (!currentProduct) {
                issues.push({
                    type: 'product_not_found',
                    itemId: item.id,
                    productName: item.product?.name || 'Неизвестный товар',
                    message: 'Товар не найден',
                    severity: 'error'
                });
                continue;
            }

            if (!currentProduct.isActive) {
                issues.push({
                    type: 'inactive_product',
                    itemId: item.id,
                    productName: currentProduct.name,
                    message: 'Товар больше не продается',
                    severity: 'error'
                });
                continue;
            }

            // Проверяем доступность с учетом коробочной логики
            const availableBoxes = currentProduct.stockQuantity || 0;

            if (availableBoxes === 0) {
                issues.push({
                    type: 'out_of_stock',
                    itemId: item.id,
                    productName: currentProduct.name,
                    message: 'Товар закончился на складе',
                    severity: 'error'
                });
                continue;
            }

            let finalQuantity = item.quantity;

            if (item.quantity > availableBoxes) {
                finalQuantity = availableBoxes;
                const itemsPerBox = currentProduct.itemsPerBox || 1;
                const finalItems = finalQuantity * itemsPerBox;
                const requestedItems = item.quantity * itemsPerBox;

                issues.push({
                    type: 'quantity_adjusted',
                    itemId: item.id,
                    productName: currentProduct.name,
                    message: `Количество изменено с ${item.quantity} коробок (${requestedItems} шт.) на ${finalQuantity} коробок (${finalItems} шт.)`,
                    oldQuantity: item.quantity,
                    newQuantity: finalQuantity,
                    severity: 'warning'
                });
            }

            // Обновляем информацию о продукте
            validatedItems.push({
                ...item,
                quantity: finalQuantity,
                product: {
                    ...currentProduct,
                    // Сохраняем коробочную информацию
                    itemsPerBox: currentProduct.itemsPerBox || 1,
                    boxPrice: currentProduct.boxPrice || (currentProduct.price * (currentProduct.itemsPerBox || 1))
                }
            });
        }

        return {
            validatedItems,
            issues,
            hasIssues: issues.length > 0,
            canProceedToCheckout: issues.filter(i => i.severity === 'error').length === 0
        };
    },

    /**
     * Конвертация гостевой корзины для объединения с серверной
     */
    convertGuestCartForMerge: async () => {
        try {
            const guestCart = await CartService.getGuestCart();

            if (!guestCart.items || guestCart.items.length === 0) {
                return [];
            }

            return guestCart.items.map(item => ({
                productId: item.productId || item.product?.id,
                quantity: item.quantity // количество коробок
            })).filter(item => item.productId && item.quantity > 0);
        } catch (error) {
            console.error('CartService.convertGuestCartForMerge error:', error);
            return [];
        }
    },

    /**
     * Автоматическое объединение корзин при авторизации
     */
    autoMergeCartsOnLogin: async () => {
        try {
            const guestCartItems = await CartService.convertGuestCartForMerge();

            if (guestCartItems.length === 0) {
                return {
                    success: true,
                    merged: 0,
                    message: 'Гостевая корзина пуста'
                };
            }

            const result = await CartService.mergeCart(guestCartItems);

            if (result.status === 'success') {
                // Очищаем гостевую корзину после успешного объединения
                await CartService.clearGuestCart();

                return {
                    success: true,
                    merged: result.data.merged || 0,
                    stats: result.data.stats,
                    message: `Объединено ${result.data.merged || 0} товаров`
                };
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('CartService.autoMergeCartsOnLogin error:', error);
            return {
                success: false,
                error: error.message,
                message: 'Не удалось объединить корзины'
            };
        }
    },

    /**
     * Получить размер гостевой корзины (для оптимизации)
     */
    getGuestCartSize: async () => {
        try {
            const guestCartStr = await AsyncStorage.getItem(GUEST_CART_KEY);

            if (!guestCartStr) {
                return 0;
            }

            const guestCart = JSON.parse(guestCartStr);
            return guestCart.items ? guestCart.items.length : 0;
        } catch (error) {
            console.error('CartService.getGuestCartSize error:', error);
            return 0;
        }
    },

    /**
     * Проверка, есть ли товар в гостевой корзине
     */
    isProductInGuestCart: async (productId) => {
        try {
            const guestCart = await CartService.getGuestCart();
            return guestCart.items.some(item =>
                (item.productId || item.product?.id) === productId
            );
        } catch (error) {
            console.error('CartService.isProductInGuestCart error:', error);
            return false;
        }
    },

    /**
     * Получить количество конкретного товара в гостевой корзине (в коробках)
     */
    getProductQuantityInGuestCart: async (productId) => {
        try {
            const guestCart = await CartService.getGuestCart();
            const item = guestCart.items.find(item =>
                (item.productId || item.product?.id) === productId
            );
            return item ? item.quantity : 0; // количество коробок
        } catch (error) {
            console.error('CartService.getProductQuantityInGuestCart error:', error);
            return 0;
        }
    },

    /**
     * Установить тип клиента для гостевой корзины (пересчитывает цены)
     */
    setGuestCartClientType: async (clientType) => {
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const GUEST_CART_KEY = 'guest_cart';

            const guestCartStr = await AsyncStorage.getItem(GUEST_CART_KEY);
            if (guestCartStr) {
                const guestCart = JSON.parse(guestCartStr);
                guestCart.clientType = clientType;

                // Пересчитываем цены для оптовых клиентов
                guestCart.items = guestCart.items.map(item => {
                    const product = item.product;
                    if (clientType === 'WHOLESALE' &&
                        product?.wholesalePrice &&
                        item.quantity >= (product.wholesaleMinQty || 50)) {
                        return {
                            ...item,
                            effectivePrice: product.wholesalePrice,
                            savings: item.quantity * (product.price - product.wholesalePrice)
                        };
                    }
                    return {
                        ...item,
                        effectivePrice: product?.price || 0,
                        savings: 0
                    };
                });

                await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestCart));
                return { success: true, cart: guestCart };
            }
            return { success: true, cart: { items: [], clientType } };
        } catch (error) {
            console.error('Error setting guest cart client type:', error);
            return { success: false, error: error.message };
        }
    },

    // ===== ДОПОЛНИТЕЛЬНЫЕ УТИЛИТЫ ДЛЯ КОРОБОЧНОЙ ЛОГИКИ =====

    /**
     * Получить информацию о коробке товара для корзины
     */
    getProductBoxInfo: async (productId) => {
        try {
            return await cartApi.get(`/box-info/${productId}`);
        } catch (error) {
            console.error('CartService.getProductBoxInfo error:', error);
            throw error;
        }
    },

    // /**
    //  * Получить рекомендуемое количество коробок для заказа (ЗАКОММЕНТИРОВАНО - только коробочная продажа)
    //  */
    // getRecommendedBoxes: async (productId, desiredItems) => {
    //     try {
    //         const response = await CartService.getProductBoxInfo(productId);
    //         const boxInfo = response.data?.data || response.data;

    //         if (!boxInfo || !boxInfo.itemsPerBox) {
    //             return {
    //                 recommendedBoxes: 1,
    //                 actualItems: desiredItems,
    //                 itemsPerBox: 1
    //             };
    //         }

    //         const recommendedBoxes = BoxUtils.calculateBoxesFromItems(desiredItems, boxInfo.itemsPerBox);
    //         const actualItems = BoxUtils.calculateItemsFromBoxes(recommendedBoxes, boxInfo.itemsPerBox);

    //         return {
    //             recommendedBoxes,
    //             actualItems,
    //             itemsPerBox: boxInfo.itemsPerBox,
    //             totalPrice: recommendedBoxes * boxInfo.pricePerBox,
    //             pricePerBox: boxInfo.pricePerBox,
    //             pricePerItem: boxInfo.pricePerItem,
    //             availableBoxes: boxInfo.availableBoxes,
    //             canOrder: recommendedBoxes <= boxInfo.availableBoxes,
    //             formattedQuantity: BoxUtils.formatQuantity(recommendedBoxes, boxInfo.itemsPerBox)
    //         };
    //     } catch (error) {
    //         console.error('Ошибка получения информации о коробке:', error);
    //         return {
    //             recommendedBoxes: BoxUtils.calculateBoxesFromItems(desiredItems),
    //             actualItems: desiredItems,
    //             itemsPerBox: 1,
    //             error: error.message
    //         };
    //     }
    // },

    /**
     * Получить сводку корзины с коробочной информацией
     */
    getCartSummary: async () => {
        try {
            const cartResponse = await CartService.getCart();
            const cartData = cartResponse.data?.data || cartResponse.data || [];

            if (!Array.isArray(cartData)) {
                return {
                    items: [],
                    totalBoxes: 0,
                    totalItems: 0,
                    totalAmount: 0,
                    isEmpty: true
                };
            }

            let totalBoxes = 0;
            let totalItems = 0;
            let totalAmount = 0;

            const processedItems = cartData.map(item => {
                const product = item.product || {};
                const quantityBoxes = item.quantity || 0; // количество коробок
                const itemsPerBox = product.itemsPerBox || 1;
                const boxPrice = product.boxPrice || (product.price * itemsPerBox);

                const itemTotalItems = quantityBoxes * itemsPerBox;
                const itemTotalPrice = quantityBoxes * boxPrice;

                totalBoxes += quantityBoxes;
                totalItems += itemTotalItems;
                totalAmount += itemTotalPrice;

                return {
                    ...item,
                    boxInfo: {
                        quantityBoxes: quantityBoxes,
                        quantityItems: itemTotalItems,
                        itemsPerBox: itemsPerBox,
                        pricePerBox: boxPrice,
                        pricePerItem: product.price || 0,
                        totalPrice: itemTotalPrice,
                        formattedQuantity: BoxUtils.formatQuantity(quantityBoxes, itemsPerBox)
                    }
                };
            });

            return {
                items: processedItems,
                totalBoxes,
                totalItems,
                totalAmount,
                isEmpty: processedItems.length === 0,
                formattedTotalPrice: new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                }).format(totalAmount)
            };
        } catch (error) {
            console.error('Ошибка получения сводки корзины:', error);
            return {
                items: [],
                totalBoxes: 0,
                totalItems: 0,
                totalAmount: 0,
                isEmpty: true,
                error: error.message
            };
        }
    },

    BoxUtils
};

export default CartService;