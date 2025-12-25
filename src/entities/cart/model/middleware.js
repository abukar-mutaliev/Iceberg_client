/**
 * Middleware для автоматической перезагрузки корзины после операций с поддержкой коробочной логики
 */

import { fetchCart, fetchCartStats, addNotification } from './slice';

const cartOperationTypes = [
    'cart/addToCart/fulfilled',
    'cart/updateCartItem/fulfilled',
    'cart/removeFromCart/fulfilled',
    'cart/setClientType/fulfilled',
    'cart/bulkUpdateQuantities/fulfilled',
    'cart/bulkRemoveItems/fulfilled'
];

const notificationOperationTypes = [
    'cart/addToCart/fulfilled',
    // 'cart/updateCartItem/fulfilled', // Убираем уведомления при изменении количества
    'cart/removeFromCart/fulfilled'
];

/**
 * Форматирует количество в коробочном формате
 * @param {Object} product - Данные продукта
 * @param {number} quantity - Количество (коробок)
 * @returns {string} - Отформатированное количество
 */
const formatBoxQuantity = (product, quantity) => {
    if (!product) return `${quantity} шт.`;

    const itemsPerBox = product.itemsPerBox || 1;
    const totalItems = quantity * itemsPerBox;

    if (itemsPerBox === 1) {
        return `${quantity} шт.`;
    }

    return `${quantity} коробок (${totalItems} шт.)`;
};

/**
 * Создает уведомление об операции с корзиной
 * @param {string} operationType - Тип операции
 * @param {Object} payload - Данные операции
 * @param {Object} state - Состояние приложения
 * @returns {Object|null} - Объект уведомления или null
 */
const createCartOperationNotification = (operationType, payload, state) => {
    const { productId, quantity, itemId, guestCart } = payload;

    let product = null;

    if (guestCart && guestCart.items) {
        const cartItem = guestCart.items.find(item =>
            item.productId === productId || item.id === itemId
        );
        product = cartItem?.product;
    } else {
        product = state.products?.items?.find(p => p.id === productId);

        if (!product) {
            const cartItem = state.cart?.items?.find(item =>
                item.id === itemId || item.productId === productId || item.product?.id === productId
            );
            product = cartItem?.product;
        }
    }

    const productName = product?.name || 'Товар';
    const formattedQuantity = formatBoxQuantity(product, quantity);

    switch (operationType) {
        case 'cart/addToCart/fulfilled':
            return {
                id: `add_${productId}_${Date.now()}`,
                type: 'success',
                message: `${productName} добавлен в корзину: ${formattedQuantity}`,
                autoHide: true,
                duration: 3000,
                icon: '🛒',
                productId,
                quantity,
                action: 'add'
            };

        case 'cart/updateCartItem/fulfilled':
            if (quantity === 0) {
                return {
                    id: `remove_${itemId}_${Date.now()}`,
                    type: 'info',
                    message: `${productName} удален из корзины`,
                    autoHide: true,
                    duration: 3000,
                    icon: '🗑️',
                    itemId,
                    action: 'remove'
                };
            } else {
                return {
                    id: `update_${itemId}_${Date.now()}`,
                    type: 'info',
                    message: `Количество ${productName} изменено на ${formattedQuantity}`,
                    autoHide: true,
                    duration: 3000,
                    icon: '📝',
                    itemId,
                    quantity,
                    action: 'update'
                };
            }

        case 'cart/removeFromCart/fulfilled':
            return {
                id: `remove_${itemId}_${Date.now()}`,
                type: 'info',
                message: `${productName} удален из корзины`,
                autoHide: true,
                duration: 3000,
                icon: '🗑️',
                itemId,
                action: 'remove'
            };

        default:
            return null;
    }
};

export const cartReloadMiddleware = (store) => (next) => (action) => {
    const result = next(action);

    if (cartOperationTypes.includes(action.type)) {
        const state = store.getState();
        const isAuthenticated = state.auth?.user?.id;
        const userRole = state.auth?.user?.role;

        // Проверяем, доступна ли корзина для текущей роли
        // Корзина доступна для клиентов и неавторизованных пользователей (гостей)
        const isCartAvailable = userRole === 'CLIENT' || !isAuthenticated;

        if (__DEV__) {
            console.log(`🔄 CartReloadMiddleware: Detected ${action.type}`, {
                isAuthenticated: !!isAuthenticated,
                userRole,
                isCartAvailable,
                currentItemsCount: state.cart?.items?.length || 0,
                lastFetchTime: state.cart?.lastFetchTime,
                payload: action.payload
            });
        }

        // Прерываем обработку, если корзина недоступна для роли
        if (!isCartAvailable) {
            if (__DEV__) {
                console.log(`🔄 CartReloadMiddleware: Skipping cart operations for role ${userRole || 'guest'}`);
            }
            return result;
        }

        if (notificationOperationTypes.includes(action.type)) {
            const notification = createCartOperationNotification(action.type, action.payload, state);

            if (notification) {
                store.dispatch(addNotification(notification));

                if (__DEV__) {
                    console.log(`📢 CartReloadMiddleware: Added notification for ${action.type}:`, notification.message);
                }
            }
        }

        if (isAuthenticated) {
            // Пропускаем автоматическую перезагрузку для updateCartItem - это делается в хуке с дебаунсингом
            if (action.type === 'cart/updateCartItem/fulfilled') {
                if (__DEV__) {
                    console.log(`🔄 CartReloadMiddleware: Skipping auto-reload for updateCartItem (handled in hook with debouncing)`);
                }
                return;
            }

            if (__DEV__) {
                console.log(`🔄 CartReloadMiddleware: Auto-reloading cart after ${action.type}`);
            }

            let delay = 100;

            switch (action.type) {
                case 'cart/addToCart/fulfilled':
                    delay = 150; // Уменьшили с 300мс до 150мс
                    break;
                case 'cart/removeFromCart/fulfilled':
                    delay = 100; // Уменьшили с 200мс до 100мс
                    break;
                case 'cart/bulkUpdateQuantities/fulfilled':
                case 'cart/bulkRemoveItems/fulfilled':
                    delay = 200; // Уменьшили с 500мс до 200мс
                    break;
                case 'cart/setClientType/fulfilled':
                    delay = 200; // Уменьшили с 400мс до 200мс
                    break;
                default:
                    delay = 100; // Уменьшили с 200мс до 100мс
            }

            setTimeout(() => {
                if (__DEV__) {
                    console.log(`🔄 CartReloadMiddleware: Dispatching fetchCart(true) for ${action.type} (after ${delay}ms delay)`);
                }

                store.dispatch(fetchCart(true));

                if (action.type === 'cart/setClientType/fulfilled') {
                    setTimeout(() => {
                        store.dispatch(fetchCartStats());
                    }, 100);
                }
            }, delay);
        } else if (__DEV__) {
            console.log(`🔄 CartReloadMiddleware: Skipping reload for guest user`);
        }
    }

    if (action.type === 'cart/checkout/fulfilled') {
        store.dispatch({ type: 'cart/clearNotifications' });

        store.dispatch(addNotification({
            id: `checkout_success_${Date.now()}`,
            type: 'success',
            message: '🎉 Заказ успешно оформлен!',
            autoHide: true,
            duration: 5000,
            action: 'checkout'
        }));

        if (__DEV__) {
            console.log('🎉 CartReloadMiddleware: Order completed successfully');
        }
    }

    if (action.type.startsWith('cart/') && action.type.endsWith('/rejected')) {
        const errorMessage = action.payload || 'Произошла ошибка';

        // Не показываем уведомления об ошибках авторизации, так как у нас есть специальный UI для этого
        const isAuthError = errorMessage.includes('не авторизован') || 
                           errorMessage.includes('Не авторизован') || 
                           errorMessage.includes('недоступна для данной роли') ||
                           errorMessage.includes('Доступ запрещен') ||
                           errorMessage.includes('Корзина недоступна') ||
                           errorMessage.includes('unauthorized') ||
                           errorMessage.includes('403') ||
                           errorMessage.includes('401') ||
                           errorMessage.includes('токена истек') ||
                           errorMessage.includes('Срок действия токена');

        // Не логируем ошибки авторизации для корзины (корзина скрыта в первой версии приложения)
        if (isAuthError) {
            // Не логируем вообще, так как корзина скрыта
        } else {
            // Показываем только реальные ошибки
            store.dispatch(addNotification({
                id: `error_${Date.now()}`,
                type: 'error',
                message: `Ошибка: ${errorMessage}`,
                autoHide: true,
                duration: 5000,
                icon: '⚠️',
                action: 'error'
            }));

            if (__DEV__) {
                console.error(`❌ CartReloadMiddleware: Error in ${action.type}:`, errorMessage);
            }
        }
    }

    return result;
};

export default cartReloadMiddleware;