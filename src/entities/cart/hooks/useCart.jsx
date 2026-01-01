import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Импортируем напрямую из файлов, чтобы избежать циклической зависимости
import {
    fetchCart,
    fetchCartStats,
    fetchDetailedCartStats,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    validateCart as validateCartAction,
    validateCartDetailed as validateCartDetailedAction,
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
    clearNotifications
} from '../model/slice';

import {
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
} from '../model/selectors';

const GUEST_CART_KEY = 'guest_cart';

// ===== ОСНОВНОЙ ХУК ДЛЯ РАБОТЫ С КОРЗИНОЙ (ТОЛЬКО КОРОБКИ) =====
export const useCart = () => {
    const dispatch = useDispatch();

    const items = useSelector(selectCartItems);
    const stats = useSelector(selectCartStats);
    const formattedStats = useSelector(selectFormattedCartStats);
    const loading = useSelector(selectCartLoading);
    const error = useSelector(selectCartError);
    const isEmpty = useSelector(selectIsCartEmpty);
    const validation = useSelector(selectCartValidation);
    const isReadyForCheckout = useSelector(selectIsCartReadyForCheckout);
    const itemsBySupplier = useSelector(selectCartItemsBySupplier);
    const hasProblematicItems = useSelector(selectHasProblematicItems);
    const recommendedProducts = useSelector(selectRecommendedProducts);

    const cartState = useSelector(selectCartState);
    const {
        clientType,
        totalSavings,
        breakdown,
        shippingCost,
        appliedDiscount,
        notifications,
        validating,
        preparingCheckout
    } = cartState;

    // Базовые операции (только коробками)
    const loadCart = useCallback((forceRefresh = false) => {
        console.log('🛒 useCart: Загрузка корзины', { forceRefresh });
        dispatch(fetchCart(forceRefresh));
    }, [dispatch]);

    const loadCartStats = useCallback(() => {
        dispatch(fetchCartStats());
    }, [dispatch]);

    const loadDetailedCartStats = useCallback(() => {
        dispatch(fetchDetailedCartStats());
    }, [dispatch]);

    /**
     * Добавить товар в корзину (только коробками)
     * @param {number} productId - ID продукта
     * @param {number} quantity - Количество коробок (по умолчанию 1)
     * @param {boolean} useQuickAdd - Использовать быстрое добавление
     */
    const addProductToCart = useCallback((productId, quantity = 1, useQuickAdd = false) => {
        console.log('🛒 useCart: Добавление товара в корзину', { productId, quantity, useQuickAdd });
        return dispatch(addToCart({ productId, quantity, useQuickAdd }));
    }, [dispatch]);

    /**
     * Обновить количество товара в корзине (коробками)
     * @param {number} itemId - ID элемента корзины
     * @param {number} quantity - Новое количество коробок
     */
    const updateItemQuantity = useCallback((itemId, quantity) => {
        return dispatch(updateCartItem({ itemId, quantity }));
    }, [dispatch]);

    const removeItem = useCallback((itemId) => {
        return dispatch(removeFromCart(itemId));
    }, [dispatch]);

    const clearCartItems = useCallback(() => {
        return dispatch(clearCart());
    }, [dispatch]);

    const validateCartItems = useCallback(() => {
        return dispatch(validateCartAction());
    }, [dispatch]);

    const validateCartItemsDetailed = useCallback(() => {
        return dispatch(validateCartDetailedAction());
    }, [dispatch]);

    const createOrder = useCallback((orderData) => {
        return dispatch(checkout(orderData));
    }, [dispatch]);

    const prepareOrder = useCallback((options = {}) => {
        return dispatch(prepareCheckout(options));
    }, [dispatch]);

    const mergeGuestCart = useCallback(() => {
        return dispatch(mergeCart());
    }, [dispatch]);

    // Операции для типа клиента и массовых действий
    const changeClientType = useCallback((clientType, additionalData = {}) => {
        return dispatch(setClientType({ clientType, additionalData }));
    }, [dispatch]);

    const updateMultipleItems = useCallback((updates, allowPartialSuccess = true) => {
        return dispatch(bulkUpdateQuantities({ updates, allowPartialSuccess }));
    }, [dispatch]);

    const removeMultipleItems = useCallback((itemIds) => {
        return dispatch(bulkRemoveItems({ itemIds }));
    }, [dispatch]);

    const calculateDeliveryShipping = useCallback((deliveryAddress, deliveryType = 'STANDARD', deliveryDate = null) => {
        return dispatch(calculateShipping({ deliveryAddress, deliveryType, deliveryDate }));
    }, [dispatch]);

    const applyDiscountCode = useCallback((discountCode, applyToItems = null) => {
        return dispatch(applyDiscount({ discountCode, applyToItems }));
    }, [dispatch]);

    // Утилиты
    const clearError = useCallback(() => {
        dispatch(clearCartError());
    }, [dispatch]);

    const resetCartValidation = useCallback(() => {
        dispatch(resetValidation());
    }, [dispatch]);

    const addCartNotification = useCallback((notification) => {
        const notificationWithId = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...notification,
            timestamp: new Date().toISOString()
        };
        dispatch(addNotification(notificationWithId));
        return notificationWithId.id;
    }, [dispatch]);

    const removeCartNotification = useCallback((notificationId) => {
        dispatch(removeNotification(notificationId));
    }, [dispatch]);

    const clearCartNotifications = useCallback(() => {
        dispatch(clearNotifications());
    }, [dispatch]);

    // Загрузка гостевой корзины при инициализации
    const loadGuestCartFromStorage = useCallback(async () => {
        try {
            const guestCartStr = await AsyncStorage.getItem(GUEST_CART_KEY);
            if (guestCartStr) {
                const guestCart = JSON.parse(guestCartStr);
                dispatch(loadGuestCart(guestCart));
                console.log('🛒 useCart: Гостевая корзина загружена из хранилища');
            }
        } catch (error) {
            console.error('🛒 useCart: Ошибка при загрузке гостевой корзины:', error);
        }
    }, [dispatch]);

    return {
        // Данные
        items,
        stats,
        formattedStats,
        itemsBySupplier,
        recommendedProducts,
        clientType,
        totalSavings,
        breakdown,
        shippingCost,
        appliedDiscount,

        // Состояния
        loading,
        error,
        isEmpty,
        validation,
        isReadyForCheckout,
        hasProblematicItems,
        validating,
        preparingCheckout,

        // Уведомления
        notifications,

        // Операции (только коробками)
        loadCart,
        loadCartStats,
        loadDetailedCartStats,
        addProductToCart,
        updateItemQuantity,
        removeItem,
        clearCartItems,
        validateCartItems,
        validateCartItemsDetailed,
        createOrder,
        prepareOrder,
        mergeGuestCart,
        loadGuestCartFromStorage,

        // Дополнительные операции
        changeClientType,
        updateMultipleItems,
        removeMultipleItems,
        calculateDeliveryShipping,
        applyDiscountCode,

        // Утилиты
        clearError,
        resetCartValidation,
        addCartNotification,
        removeCartNotification,
        clearCartNotifications
    };
};

// ===== ХУК ДЛЯ РАБОТЫ С КОНКРЕТНЫМ ТОВАРОМ В КОРЗИНЕ (ТОЛЬКО КОРОБКИ) =====
export const useCartProduct = (productId) => {
    const dispatch = useDispatch();
    const { isCartAvailable } = useCartAvailability();

    const isInCart = useSelector(state => selectIsProductInCart(state, productId));
    const reduxQuantity = useSelector(state => selectProductQuantityInCart(state, productId));
    const cartItem = useSelector(state => selectCartItemByProductId(state, productId));
    const isAdding = useSelector(state => selectIsProductAdding(state, productId));
    const isUpdating = useSelector(state =>
        cartItem ? selectIsCartItemUpdating(state, cartItem.id) : false
    );
    const isRemoving = useSelector(state =>
        cartItem ? selectIsCartItemRemoving(state, cartItem.id) : false
    );

    // Локальное состояние для быстрых нажатий
    const [localQuantity, setLocalQuantity] = useState(reduxQuantity);
    const [pendingUpdates, setPendingUpdates] = useState(0);
    const updateTimeoutRef = useRef(null);

    // Синхронизируем локальное состояние с Redux при изменении
    useEffect(() => {
        setLocalQuantity(reduxQuantity);
        setPendingUpdates(0);
    }, [reduxQuantity]);

    // Используем локальное количество для мгновенного отклика, Redux для финального состояния
    const quantity = localQuantity;


    /**
     * Добавить товар в корзину (коробками)
     * @param {number} qty - Количество коробок (по умолчанию 1)
     * @param {boolean} useQuickAdd - Использовать быстрое добавление
     */
    const addToCartHandler = useCallback(async (qty = 1, useQuickAdd = false) => {
        if (!productId) {
            return;
        }

        try {
            const result = await dispatch(addToCart({ productId, quantity: qty, useQuickAdd }));

            // Для синхронизации с сервером - перезагружаем корзину быстрее
            if (result.type === 'cart/addToCart/fulfilled' && isCartAvailable) {
                // Уменьшили задержку для более быстрой синхронизации
                setTimeout(async () => {
                    await dispatch(fetchCart(true));
                }, 200);
            }

            return result;
        } catch (error) {
            throw error;
        }
    }, [dispatch, productId, isCartAvailable]);

    /**
     * Обновить количество товара в корзине (коробками)
     * @param {number} newQuantity - Новое количество коробок
     */
    const updateQuantity = useCallback(async (newQuantity) => {
        if (!cartItem) {
  
            return;
        }



        try {
            const result = await dispatch(updateCartItem({ itemId: cartItem.id, quantity: newQuantity }));

            // Синхронизируем с сервером быстрее для лучшего UX
            if (result.type === 'cart/updateCartItem/fulfilled') {
                setTimeout(async () => {
                    await dispatch(fetchCart(true));
                }, 100); // Уменьшили задержку с 500мс до 100мс
            }

            return result;
        } catch (error) {

            throw error;
        }
    }, [dispatch, cartItem, quantity, productId]);

    /**
     * Дебаунсированное обновление количества для быстрых нажатий
     * @param {number} newQuantity - Новое количество коробок
     * @param {number} delay - Задержка в миллисекундах (по умолчанию 500мс)
     */
    const debouncedUpdateQuantity = useCallback((newQuantity, delay = 500) => {
        if (!cartItem) {
            return;
        }

        // Мгновенно обновляем локальное состояние
        setLocalQuantity(newQuantity);
        setPendingUpdates(prev => prev + 1);



        // Очищаем предыдущий таймер
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        // Устанавливаем новый таймер для отправки на сервер
        updateTimeoutRef.current = setTimeout(async () => {
            try {
    
                
                // Отправляем только один запрос с итоговым количеством
                const result = await dispatch(updateCartItem({ itemId: cartItem.id, quantity: newQuantity }));
                
                if (result.type === 'cart/updateCartItem/fulfilled') {
                    setPendingUpdates(0);
                    
                    // Синхронизируем с сервером через небольшую задержку
                    setTimeout(async () => {
                        await dispatch(fetchCart(true));
                    }, 200);
                }
            } catch (error) {
                // Откатываем локальное состояние при ошибке
                setLocalQuantity(reduxQuantity);
                setPendingUpdates(0);
            }
        }, delay);
    }, [dispatch, cartItem, reduxQuantity, productId, pendingUpdates]);

    // Очистка таймера при размонтировании
    useEffect(() => {
        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, []);

    const removeFromCartHandler = useCallback(async () => {
        if (!cartItem) {
            return;
        }

        try {
            const result = await dispatch(removeFromCart(cartItem.id));

            // Для синхронизации с сервером - перезагружаем корзину через задержку
            if (result.type === 'cart/removeFromCart/fulfilled') {
                setTimeout(async () => {
                    await dispatch(fetchCart(true));
                }, 500);
            }

            return result;
        } catch (error) {
            throw error;
        }
    }, [dispatch, cartItem]);

    /**
     * Увеличить количество коробок на 1 с дебаунсингом для быстрых нажатий
     */
    const incrementQuantity = useCallback(() => {
        const newQuantity = quantity + 1;
        debouncedUpdateQuantity(newQuantity);
    }, [quantity, debouncedUpdateQuantity]);

    /**
     * Уменьшить количество коробок на 1 с дебаунсингом для быстрых нажатий
     */
    const decrementQuantity = useCallback(() => {
        const newQuantity = Math.max(1, quantity - 1); // Минимум 1 коробка
        debouncedUpdateQuantity(newQuantity);
    }, [quantity, debouncedUpdateQuantity]);

    /**
     * Немедленное обновление количества (для ручного ввода)
     * @param {number} newQuantity - Новое количество коробок
     */
    const immediateUpdateQuantity = useCallback(async (newQuantity) => {
        if (!cartItem) {
            return;
        }

        // Очищаем дебаунсированный таймер
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        // Мгновенно обновляем локальное состояние
        setLocalQuantity(newQuantity);
        setPendingUpdates(0);

        // Немедленно отправляем на сервер
        try {

            
            const result = await dispatch(updateCartItem({ itemId: cartItem.id, quantity: newQuantity }));
            
            if (result.type === 'cart/updateCartItem/fulfilled') {
                // Синхронизируем с сервером
                setTimeout(async () => {
                    await dispatch(fetchCart(true));
                }, 100);
            }
        } catch (error) {
            // Откатываем при ошибке
            setLocalQuantity(reduxQuantity);
            throw error;
        }
    }, [dispatch, cartItem, reduxQuantity, productId]);

    return {
        // Состояние
        isInCart,
        quantity, // количество коробок
        cartItem,
        isAdding,
        isUpdating,
        isRemoving,
        isLoading: isAdding || isUpdating || isRemoving,
        pendingUpdates, // количество ожидающих обновлений

        // Операции (только коробками)
        addToCart: addToCartHandler,
        updateQuantity: immediateUpdateQuantity, // Немедленное обновление для ручного ввода
        debouncedUpdateQuantity, // Дебаунсированное обновление для быстрых нажатий
        removeFromCart: removeFromCartHandler,
        incrementQuantity,
        decrementQuantity
    };
};

// ===== ХУК ДЛЯ АВТОМАТИЧЕСКОЙ ЗАГРУЗКИ КОРЗИНЫ =====
export const useCartAutoLoad = (options = {}) => {
    const {
        loadOnMount = true,
        loadOnAuthChange = true,
        autoMergeGuestCart = true
    } = options;

    const dispatch = useDispatch();
    const isAuthenticated = useSelector(state => !!state.auth?.user?.id);
    const userId = useSelector(state => state.auth?.user?.id);
    const { isCartAvailable } = useCartAvailability();

    // Загрузка при монтировании
    useEffect(() => {
        if (loadOnMount && isCartAvailable) {
            if (isAuthenticated) {
                dispatch(fetchCart());

                // Автоматическое объединение гостевой корзины
                if (autoMergeGuestCart) {
                    dispatch(mergeCart());
                }
            } else {
                // Загружаем гостевую корзину
                const loadGuestCartFromStorage = async () => {
                    try {
                        const guestCartStr = await AsyncStorage.getItem(GUEST_CART_KEY);
                        if (guestCartStr) {
                            const guestCart = JSON.parse(guestCartStr);
                            dispatch(loadGuestCart(guestCart));
                        }
                    } catch (error) {
                        // Ошибка при загрузке гостевой корзины
                    }
                };

                loadGuestCartFromStorage();
            }
        }
    }, [loadOnMount, isAuthenticated, autoMergeGuestCart, dispatch, isCartAvailable]);

    // Загрузка при изменении авторизации
    useEffect(() => {
        if (loadOnAuthChange && userId && isCartAvailable) {
            dispatch(fetchCart());

            if (autoMergeGuestCart) {
                dispatch(mergeCart());
            }
        }
    }, [userId, loadOnAuthChange, autoMergeGuestCart, dispatch, isCartAvailable]);
};

// ===== ХУК ДЛЯ РАБОТЫ СО СТАТИСТИКОЙ КОРЗИНЫ =====
export const useCartStats = () => {
    const dispatch = useDispatch();
    const stats = useSelector(selectCartStats);
    const formattedStats = useSelector(selectFormattedCartStats);
    const cartState = useSelector(selectCartState);

    const refreshStats = useCallback(() => {
        dispatch(fetchCartStats());
    }, [dispatch]);

    const refreshDetailedStats = useCallback(() => {
        dispatch(fetchDetailedCartStats());
    }, [dispatch]);

    const extendedStats = useMemo(() => ({
        ...stats,
        ...formattedStats,
        totalSavings: cartState.totalSavings || 0,
        clientType: cartState.clientType || 'RETAIL',
        breakdown: cartState.breakdown || []
    }), [stats, formattedStats, cartState]);

    return {
        ...extendedStats,
        refreshStats,
        refreshDetailedStats
    };
};

// ===== ХУК ДЛЯ ВАЛИДАЦИИ КОРЗИНЫ =====
export const useCartValidation = () => {
    const dispatch = useDispatch();
    const validation = useSelector(selectCartValidation);
    const isReadyForCheckout = useSelector(selectIsCartReadyForCheckout);
    const hasProblematicItems = useSelector(selectHasProblematicItems);
    const validating = useSelector(state => state.cart.validating);

    const validateCart = useCallback(() => {
        return dispatch(validateCartAction());
    }, [dispatch]);

    const validateCartDetailed = useCallback(() => {
        return dispatch(validateCartDetailedAction());
    }, [dispatch]);

    const resetValidation = useCallback(() => {
        dispatch(resetValidation());
    }, [dispatch]);

    return {
        ...validation,
        isReadyForCheckout,
        hasProblematicItems,
        validating,
        validateCart,
        validateCartDetailed,
        resetValidation
    };
};

// ===== ХУК ДЛЯ БЫСТРЫХ ОПЕРАЦИЙ С КОРЗИНОЙ (ТОЛЬКО КОРОБКИ) =====
export const useQuickCart = () => {
    const dispatch = useDispatch();
    const stats = useSelector(selectCartStats);

    /**
     * Быстро добавить товар в корзину (коробками)
     * @param {number} productId - ID продукта
     * @param {number} quantity - Количество коробок (по умолчанию 1)
     */
    const quickAdd = useCallback((productId, quantity = 1) => {
        return dispatch(addToCart({ productId, quantity, useQuickAdd: true }));
    }, [dispatch]);

    const quickRemove = useCallback((itemId) => {
        return dispatch(removeFromCart(itemId));
    }, [dispatch]);

    /**
     * Быстро обновить количество товара в корзине (коробками)
     * @param {number} itemId - ID элемента корзины
     * @param {number} quantity - Новое количество коробок
     */
    const quickUpdate = useCallback((itemId, quantity) => {
        return dispatch(updateCartItem({ itemId, quantity }));
    }, [dispatch]);

    const quickClear = useCallback(() => {
        return dispatch(clearCart());
    }, [dispatch]);

    return {
        stats,
        quickAdd,
        quickRemove,
        quickUpdate,
        quickClear
    };
};

// ===== ХУК ДЛЯ ОФОРМЛЕНИЯ ЗАКАЗА =====
export const useCheckout = () => {
    const dispatch = useDispatch();
    const isReadyForCheckout = useSelector(selectIsCartReadyForCheckout);
    const validation = useSelector(selectCartValidation);
    const preparingCheckout = useSelector(state => state.cart.preparingCheckout);
    const checkoutData = useSelector(state => state.cart.checkoutData);

    const prepareOrder = useCallback(async (options = {}) => {
        try {
            const result = await dispatch(prepareCheckout(options)).unwrap();
            return {
                success: true,
                data: result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Ошибка при подготовке заказа'
            };
        }
    }, [dispatch]);

    const createOrder = useCallback(async (orderData) => {
        try {
            // Сначала валидируем корзину
            const validationResult = await dispatch(validateCartDetailedAction()).unwrap();

            if (!validationResult.canProceedToCheckout) {
                throw new Error('Корзина содержит недоступные товары');
            }

            // Создаем заказ
            const orderResult = await dispatch(checkout(orderData)).unwrap();

            return {
                success: true,
                order: orderResult.order
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Ошибка при создании заказа'
            };
        }
    }, [dispatch]);

    return {
        isReadyForCheckout,
        validation,
        preparingCheckout,
        checkoutData,
        prepareOrder,
        createOrder
    };
};

// ===== ХУК ДЛЯ РАБОТЫ С ГОСТЕВОЙ КОРЗИНОЙ (ТОЛЬКО КОРОБКИ) =====
export const useGuestCart = () => {
    const dispatch = useDispatch();

    const saveGuestCart = useCallback(async (cartData) => {
        try {
            await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartData));
        } catch (error) {
            // Ошибка при сохранении гостевой корзины
        }
    }, []);

    const loadGuestCartFromStorage = useCallback(async () => {
        try {
            const guestCartStr = await AsyncStorage.getItem(GUEST_CART_KEY);
            if (guestCartStr) {
                const guestCart = JSON.parse(guestCartStr);
                dispatch(loadGuestCart(guestCart));
                return guestCart;
            }
            return null;
        } catch (error) {
            // Ошибка при загрузке гостевой корзины
            return null;
        }
    }, [dispatch]);

    const clearGuestCart = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(GUEST_CART_KEY);
        } catch (error) {
            // Ошибка при очистке гостевой корзины
        }
    }, []);

    const mergeWithServerCart = useCallback(() => {
        return dispatch(mergeCart());
    }, [dispatch]);

    return {
        saveGuestCart,
        loadGuestCartFromStorage,
        clearGuestCart,
        mergeWithServerCart
    };
};

// ===== ХУК ДЛЯ МАССОВЫХ ОПЕРАЦИЙ =====
export const useBulkCartOperations = () => {
    const dispatch = useDispatch();

    /**
     * Массово обновить количество товаров в корзине (коробками)
     * @param {Array} updates - Массив обновлений { itemId, quantity }
     * @param {boolean} allowPartialSuccess - Разрешить частичный успех
     */
    const updateMultipleItems = useCallback(async (updates, allowPartialSuccess = true) => {
        try {
            const result = await dispatch(bulkUpdateQuantities({
                updates,
                allowPartialSuccess
            })).unwrap();

            return {
                success: true,
                ...result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Ошибка при массовом обновлении'
            };
        }
    }, [dispatch]);

    const removeMultipleItems = useCallback(async (itemIds) => {
        try {
            const result = await dispatch(bulkRemoveItems({
                itemIds
            })).unwrap();

            return {
                success: true,
                ...result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Ошибка при массовом удалении'
            };
        }
    }, [dispatch]);

    const selectAllItems = useCallback((items) => {
        return items.map(item => item.id);
    }, []);

    const selectItemsBySupplier = useCallback((items, supplierId) => {
        return items
            .filter(item => item.product?.supplier?.id === supplierId)
            .map(item => item.id);
    }, []);

    const selectUnavailableItems = useCallback((items) => {
        return items
            .filter(item => !item.product?.isActive || item.product?.stockQuantity === 0)
            .map(item => item.id);
    }, []);

    return {
        updateMultipleItems,
        removeMultipleItems,
        selectAllItems,
        selectItemsBySupplier,
        selectUnavailableItems
    };
};

// ===== ХУК ДЛЯ УВЕДОМЛЕНИЙ КОРЗИНЫ =====
export const useCartNotifications = () => {
    const dispatch = useDispatch();
    const notifications = useSelector(state => state.cart.notifications || []);

    const addCartNotification = useCallback((notification) => {
        const notificationWithId = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...notification,
            timestamp: new Date().toISOString()
        };
        dispatch(addNotification(notificationWithId));
        return notificationWithId.id;
    }, [dispatch]);

    const removeCartNotification = useCallback((notificationId) => {
        dispatch(removeNotification(notificationId));
    }, [dispatch]);

    const clearAllNotifications = useCallback(() => {
        dispatch(clearNotifications());
    }, [dispatch]);

    // Стабилизируем функции создания уведомлений
    const addSuccessNotification = useCallback((message) => {
        if (!message || typeof message !== 'string') return null;

        return addCartNotification({
            type: 'success',
            message,
            autoHide: true,
            duration: 3000
        });
    }, [addCartNotification]);

    const addErrorNotification = useCallback((message) => {
        if (!message || typeof message !== 'string') return null;

        return addCartNotification({
            type: 'error',
            message,
            autoHide: true,
            duration: 5000
        });
    }, [addCartNotification]);

    const addWarningNotification = useCallback((message) => {
        if (!message || typeof message !== 'string') return null;

        return addCartNotification({
            type: 'warning',
            message,
            autoHide: true,
            duration: 4000
        });
    }, [addCartNotification]);

    const addInfoNotification = useCallback((message) => {
        if (!message || typeof message !== 'string') return null;

        return addCartNotification({
            type: 'info',
            message,
            autoHide: true,
            duration: 3000
        });
    }, [addCartNotification]);

    return {
        notifications,
        addNotification: addCartNotification,
        removeNotification: removeCartNotification,
        clearAllNotifications,
        addSuccessNotification,
        addErrorNotification,
        addWarningNotification,
        addInfoNotification
    };
};

// ===== ХУК ДЛЯ РАБОТЫ С ТИПОМ КЛИЕНТА =====
export const useClientType = () => {
    const dispatch = useDispatch();
    const clientType = useSelector(state => state.cart.clientType || 'RETAIL');
    const totalSavings = useSelector(state => state.cart.totalSavings || 0);
    const breakdown = useSelector(state => state.cart.breakdown || []);

    const setClientType = useCallback(async (newClientType, additionalData = {}) => {
        try {
            const result = await dispatch(setClientType({
                clientType: newClientType,
                additionalData
            })).unwrap();

            return {
                success: true,
                ...result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Ошибка при изменении типа клиента'
            };
        }
    }, [dispatch]);

    const isWholesale = useMemo(() => clientType === 'WHOLESALE', [clientType]);
    const isRetail = useMemo(() => clientType === 'RETAIL', [clientType]);

    const wholesaleBreakdown = useMemo(() =>
            breakdown.find(item => item.priceType === 'wholesale') || {
                itemsCount: 0,
                totalAmount: 0,
                savings: 0
            },
        [breakdown]
    );

    const retailBreakdown = useMemo(() =>
            breakdown.find(item => item.priceType === 'retail') || {
                itemsCount: 0,
                totalAmount: 0,
                savings: 0
            },
        [breakdown]
    );

    return {
        clientType,
        totalSavings,
        breakdown,
        isWholesale,
        isRetail,
        wholesaleBreakdown,
        retailBreakdown,
        setClientType
    };
};

// ===== ХУК ДЛЯ ДОСТАВКИ И СКИДОК =====
export const useCartExtras = () => {
    const dispatch = useDispatch();
    const shippingCost = useSelector(state => state.cart.shippingCost);
    const shippingInfo = useSelector(state => state.cart.shippingInfo);
    const appliedDiscount = useSelector(state => state.cart.appliedDiscount);

    const calculateShipping = useCallback(async (deliveryAddress, deliveryType = 'STANDARD', deliveryDate = null) => {
        try {
            const result = await dispatch(calculateShipping({
                deliveryAddress,
                deliveryType,
                deliveryDate
            })).unwrap();

            return {
                success: true,
                ...result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Ошибка при расчете доставки'
            };
        }
    }, [dispatch]);

    const applyDiscount = useCallback(async (discountCode, applyToItems = null) => {
        try {
            const result = await dispatch(applyDiscount({
                discountCode,
                applyToItems
            })).unwrap();

            return {
                success: true,
                ...result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Ошибка при применении скидки'
            };
        }
    }, [dispatch]);

    const hasShippingCost = useMemo(() =>
            shippingCost !== null && shippingCost > 0,
        [shippingCost]
    );

    const hasAppliedDiscount = useMemo(() =>
            appliedDiscount && appliedDiscount.applied,
        [appliedDiscount]
    );

    const totalWithShipping = useCallback((cartTotal) => {
        return cartTotal + (shippingCost || 0);
    }, [shippingCost]);

    const totalWithDiscount = useCallback((cartTotal) => {
        if (!hasAppliedDiscount) return cartTotal;

        const discountAmount = appliedDiscount.amount || 0;
        return Math.max(0, cartTotal - discountAmount);
    }, [hasAppliedDiscount, appliedDiscount]);

    return {
        shippingCost,
        shippingInfo,
        appliedDiscount,
        hasShippingCost,
        hasAppliedDiscount,
        calculateShipping,
        applyDiscount,
        totalWithShipping,
        totalWithDiscount
    };
};

// ===== ХУК ДЛЯ ОТСЛЕЖИВАНИЯ ИЗМЕНЕНИЙ СОСТОЯНИЯ КОРЗИНЫ =====
export const useCartChangeTracker = () => {
    const cartItems = useSelector(selectCartItems);
    const cartProductIds = useSelector(selectCartProductIds);

    return {
        itemsCount: cartItems.length,
        productIds: cartProductIds
    };
};

// ===== ХУК ДЛЯ ПРОВЕРКИ ДОСТУПНОСТИ КОРЗИНЫ ПО РОЛИ =====
export const useCartAvailability = () => {
    const userRole = useSelector(state => state.auth?.user?.role);
    const isAuthenticated = useSelector(state => !!state.auth?.user?.id);
    
    // ВРЕМЕННО ОТКЛЮЧЕНО: Корзина скрыта для всех пользователей
    // Для выпуска приложения без онлайн заказа
    // TODO: Вернуть когда функциональность заказа будет готова:
    // const isCartAvailable = userRole === 'CLIENT' || !isAuthenticated;
    const isCartAvailable = false;
    
    return {
        isCartAvailable,
        userRole,
        isAuthenticated,
        isClient: userRole === 'CLIENT',
        isGuest: !isAuthenticated,
        isAdmin: userRole === 'ADMIN',
        isEmployee: userRole === 'EMPLOYEE',
        isSupplier: userRole === 'SUPPLIER',
        isDriver: userRole === 'DRIVER'
    };
};