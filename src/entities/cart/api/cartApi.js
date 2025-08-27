import { createApiModule } from "@shared/services/ApiClient";

const cartApi = createApiModule('/api/cart');

const CartService = {
    // Получить корзину
    getCart: () =>
        cartApi.get('', { _t: Date.now() }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        }),

    // Получить статистику корзины
    getCartStats: () =>
        cartApi.get('/stats', { _t: Date.now() }, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        }),

    // Добавить товар в корзину
    addToCart: (productId, quantity = 1) =>
        cartApi.post('/add', { productId, quantity }),

    // Быстрое добавление с возвратом статистики
    quickAddToCart: (productId, quantity = 1) =>
        cartApi.post('/quick-add', { productId, quantity }),

    // Обновить количество товара в корзине
    updateCartItem: (itemId, quantity) =>
        cartApi.put(`/items/${itemId}`, { quantity }),

    // Удалить товар из корзины
    removeFromCart: (itemId) =>
        cartApi.delete(`/items/${itemId}`),

    // Очистить корзину
    clearCart: () =>
        cartApi.delete('/clear'),

    // Валидация корзины перед заказом
    validateCart: () =>
        cartApi.post('/validate'),

    // Создать заказ из корзины
    checkout: (orderData = {}) =>
        cartApi.post('/checkout', orderData),

    // Объединить корзины (для гостей → авторизованных)
    mergeCart: (items) =>
        cartApi.post('/merge', { items }),

    // Массовые операции
    bulkUpdateQuantities: (updates, allowPartialSuccess = true) =>
        cartApi.post('/bulk-update', { updates, allowPartialSuccess }),

    bulkRemoveItems: (itemIds) =>
        cartApi.post('/bulk-remove', { itemIds }),

    // Изменение типа клиента
    setClientType: (clientType, additionalData = {}) =>
        cartApi.post('/client-type', { clientType, ...additionalData }),

    // Расчет доставки
    calculateShipping: (deliveryAddress, deliveryType = 'STANDARD', deliveryDate = null) =>
        cartApi.post('/shipping', { deliveryAddress, deliveryType, deliveryDate }),

    // Применение скидки
    applyDiscount: (discountCode, applyToItems = null) =>
        cartApi.post('/discount', { discountCode, applyToItems }),

    // Подготовка к оформлению заказа
    prepareCheckout: (options = {}) =>
        cartApi.post('/prepare-checkout', options),

    // Детальная валидация
    validateCartDetailed: () =>
        cartApi.post('/validate/detailed'),

    // Получение детальной статистики
    getDetailedCartStats: () =>
        cartApi.get('/stats/detailed'),

    // Утилиты для гостевой корзины
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
    }
};

export default CartService;