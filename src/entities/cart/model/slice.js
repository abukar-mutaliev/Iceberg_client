import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import CartService from '@shared/services/CartService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_CART_KEY = 'guest_cart';
const CACHE_EXPIRY_TIME = 2 * 60 * 1000;

const initialState = {
    items: [],
    loading: false,
    error: null,
    
    // Статистика корзины (коробочная логика)
    totalBoxes: 0, // Количество коробок
    totalItems: 0, // Общее количество штук
    totalAmount: 0,
    totalSavings: 0,
    itemsCount: 0,
    
    // Состояния операций
    addingItems: [],
    updatingItems: [],
    removingItems: [],
    
    // Валидация
    isValidated: false,
    validationIssues: [],
    canProceedToCheckout: false,
    validating: false,
    
    // Дополнительные данные
    clientType: 'RETAIL',
    hasUnavailableItems: false,
    unavailableCount: 0,
    removedItems: [],
    updatedItems: [],
    lastFetchTime: null,
    
    // Уведомления
    notifications: [],
    
    // Доставка и скидки
    shippingCost: null,
    shippingInfo: null,
    appliedDiscount: null,
    
    // Дополнительная статистика
    breakdown: [],
    preparingCheckout: false,
    checkoutData: null
};

const isCacheValid = (lastFetchTime) => {
    return lastFetchTime && Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
};

const addToArray = (array, item) => {
    if (!array.includes(item)) {
        return [...array, item];
    }
    return array;
};

const removeFromArray = (array, item) => {
    return array.filter(x => x !== item);
};

// ===== ОСНОВНЫЕ ОПЕРАЦИИ С КОРЗИНОЙ =====

export const fetchCart = createAsyncThunk(
    'cart/fetchCart',
    async (forceRefresh = false, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const isAuthenticated = state.auth?.user?.id;
            const userRole = state.auth?.user?.role;

            // Проверяем, доступна ли корзина для текущей роли
            // Корзина доступна для клиентов и неавторизованных пользователей (гостей)
            const isCartAvailable = userRole === 'CLIENT' || !isAuthenticated;

            if (!isCartAvailable) {
                console.log(`🛒 fetchCart: Cart not available for role ${userRole || 'unknown'}, skipping fetch`);
                return rejectWithValue('Корзина недоступна для данной роли');
            }

            // Для неавторизованных пользователей НЕ делаем запрос к серверу
            if (!isAuthenticated) {
                console.log(`🛒 fetchCart: Guest user detected, returning local cart state`);
                return { 
                    data: {
                        items: state.cart?.items || [],
                        summary: {
                            totalBoxes: state.cart?.totalBoxes || 0,
                            totalItems: state.cart?.totalItems || 0,
                            totalAmount: state.cart?.totalAmount || 0,
                            totalSavings: state.cart?.totalSavings || 0,
                            itemsCount: state.cart?.itemsCount || 0
                        },
                        clientType: 'RETAIL',
                        hasUnavailableItems: false,
                        unavailableCount: 0,
                        removedItems: [],
                        updatedItems: []
                    }, 
                    fromCache: true 
                };
            }

            // При forceRefresh всегда делаем запрос к серверу, игнорируя кэш
            if (!forceRefresh && isCacheValid(state.cart.lastFetchTime)) {
                return { data: state.cart, fromCache: true };
            }

            console.log(`🛒 fetchCart: Making API request (forceRefresh: ${forceRefresh})`);
            const response = await CartService.getCart();

            if (response.status === 'success') {
                console.log(`🛒 fetchCart: API response received, items: ${response.data?.items?.length || 0}`);
                return { data: response.data, fromCache: false };
            } else {
                throw new Error(response.message || 'Ошибка при загрузке корзины');
            }
        } catch (error) {
            // Не логируем ошибки 401 для корзины (корзина скрыта в первой версии приложения)
            const is401Error = error.response?.status === 401 || 
                              error.message?.includes('401') || 
                              error.message?.includes('токена истек') ||
                              error.message?.includes('Срок действия токена');
            
            if (!is401Error) {
                console.error('Ошибка при загрузке корзины:', error);
            }
            return rejectWithValue(error.message || 'Ошибка при загрузке корзины');
        }
    }
);

export const fetchCartStats = createAsyncThunk(
    'cart/fetchCartStats',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const isAuthenticated = state.auth?.user?.id;
            const userRole = state.auth?.user?.role;

            // Проверяем, доступна ли корзина для текущей роли
            const isCartAvailable = userRole === 'CLIENT' || !isAuthenticated;

            if (!isCartAvailable) {
                console.log(`🛒 fetchCartStats: Cart stats not available for role ${userRole || 'unknown'}, skipping fetch`);
                return rejectWithValue('Статистика корзины недоступна для данной роли');
            }

            // Для неавторизованных пользователей возвращаем локальную статистику
            if (!isAuthenticated) {
                console.log(`🛒 fetchCartStats: Guest user detected, returning local cart stats`);
                return {
                    totalBoxes: state.cart?.totalBoxes || 0,
                    totalItems: state.cart?.totalItems || 0,
                    totalAmount: state.cart?.totalAmount || 0,
                    totalSavings: state.cart?.totalSavings || 0,
                    itemsCount: state.cart?.itemsCount || 0,
                    clientType: 'RETAIL'
                };
            }

            const response = await CartService.getCartStats();

            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Ошибка при загрузке статистики корзины');
            }
        } catch (error) {
            console.error('Ошибка при загрузке статистики корзины:', error);
            return rejectWithValue(error.message || 'Ошибка при загрузке статистики корзины');
        }
    }
);

export const fetchDetailedCartStats = createAsyncThunk(
    'cart/fetchDetailedCartStats',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const isAuthenticated = state.auth?.user?.id;
            const userRole = state.auth?.user?.role;

            // Проверяем, доступна ли корзина для текущей роли
            const isCartAvailable = userRole === 'CLIENT' || !isAuthenticated;

            if (!isCartAvailable) {
                console.log(`🛒 fetchDetailedCartStats: Detailed cart stats not available for role ${userRole || 'unknown'}, skipping fetch`);
                return rejectWithValue('Детальная статистика корзины недоступна для данной роли');
            }

            // Для неавторизованных пользователей возвращаем базовую статистику
            if (!isAuthenticated) {
                console.log(`🛒 fetchDetailedCartStats: Guest user detected, returning basic stats`);
                return {
                    bySupplier: {},
                    byCategory: {},
                    recommendations: [],
                    warnings: []
                };
            }

            const response = await CartService.getDetailedCartStats();

            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Ошибка при загрузке детальной статистики');
            }
        } catch (error) {
            console.error('Ошибка при детальной статистики:', error);
            return rejectWithValue(error.message || 'Ошибка при загрузке детальной статистики');
        }
    }
);

export const addToCart = createAsyncThunk(
    'cart/addToCart',
    async ({ productId, quantity = 1, useQuickAdd = false }, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const isAuthenticated = state.auth?.user?.id;

            if (!isAuthenticated) {
                return await addToGuestCart(productId, quantity, getState);
            }

            // Найдем информацию о товаре для оптимистического обновления
            const product = state.products?.items?.find(p => p.id === productId) ||
                           state.products?.byId?.[productId];

            const service = useQuickAdd ? CartService.quickAddToCart : CartService.addToCart;
            const response = await service(productId, quantity);

            if (response.status === 'success') {
                return {
                    productId,
                    quantity,
                    stats: response.data.stats || null,
                    action: response.data.action || 'added',
                    priceInfo: response.data.priceInfo || null,
                    product: product || null // Добавляем информацию о товаре
                };
            } else {
                throw new Error(response.message || 'Ошибка при добавлении товара в корзину');
            }
        } catch (error) {
            console.error('Ошибка при добавлении товара в корзину:', error);
            return rejectWithValue(error.message || 'Ошибка при добавлении товара в корзину');
        }
    }
);

export const updateCartItem = createAsyncThunk(
    'cart/updateCartItem',
    async ({ itemId, quantity }, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const isAuthenticated = state.auth?.user?.id;

            if (!isAuthenticated) {
                return await updateGuestCartItem(itemId, quantity, getState);
            }

            const response = await CartService.updateCartItem(itemId, quantity);

            if (response.status === 'success') {
                return {
                    itemId,
                    quantity,
                    priceInfo: response.data.priceInfo || null
                };
            } else {
                throw new Error(response.message || 'Ошибка при обновлении товара в корзине');
            }
        } catch (error) {
            console.error('Ошибка при обновлении товара в корзине:', error);
            return rejectWithValue(error.message || 'Ошибка при обновлении товара в корзине');
        }
    }
);

export const removeFromCart = createAsyncThunk(
    'cart/removeFromCart',
    async (itemId, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const isAuthenticated = state.auth?.user?.id;

            if (!isAuthenticated) {
                return await removeFromGuestCart(itemId, getState);
            }

            const response = await CartService.removeFromCart(itemId);

            if (response.status === 'success') {
                return itemId;
            } else {
                throw new Error(response.message || 'Ошибка при удалении товара из корзины');
            }
        } catch (error) {
            console.error('Ошибка при удалении товара из корзины:', error);
            return rejectWithValue(error.message || 'Ошибка при удалении товара из корзины');
        }
    }
);

export const clearCart = createAsyncThunk(
    'cart/clearCart',
    async (_, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const isAuthenticated = state.auth?.user?.id;

            if (!isAuthenticated) {
                await AsyncStorage.removeItem(GUEST_CART_KEY);
                return true;
            }

            const response = await CartService.clearCart();

            if (response.status === 'success') {
                return true;
            } else {
                throw new Error(response.message || 'Ошибка при очистке корзины');
            }
        } catch (error) {
            console.error('Ошибка при очистке корзины:', error);
            return rejectWithValue(error.message || 'Ошибка при очистке корзины');
        }
    }
);

export const validateCart = createAsyncThunk(
    'cart/validateCart',
    async (_, { rejectWithValue }) => {
        try {
            const response = await CartService.validateCart();

            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Ошибка при валидации корзины');
            }
        } catch (error) {
            console.error('Ошибка при валидации корзины:', error);
            return rejectWithValue(error.message || 'Ошибка при валидации корзины');
        }
    }
);

export const validateCartDetailed = createAsyncThunk(
    'cart/validateCartDetailed',
    async (_, { rejectWithValue }) => {
        try {
            const response = await CartService.validateCartDetailed();

            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Ошибка при детальной валидации корзины');
            }
        } catch (error) {
            console.error('Ошибка при детальной валидации корзины:', error);
            return rejectWithValue(error.message || 'Ошибка при детальной валидации корзины');
        }
    }
);

export const checkout = createAsyncThunk(
    'cart/checkout',
    async (orderData, { rejectWithValue }) => {
        try {
            const response = await CartService.checkout(orderData);

            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Ошибка при создании заказа');
            }
        } catch (error) {
            console.error('Ошибка при создании заказа:', error);
            return rejectWithValue(error.message || 'Ошибка при создании заказа');
        }
    }
);

export const prepareCheckout = createAsyncThunk(
    'cart/prepareCheckout',
    async (options = {}, { rejectWithValue }) => {
        try {
            const response = await CartService.prepareCheckout(options);

            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Ошибка при подготовке заказа');
            }
        } catch (error) {
            console.error('Ошибка при подготовке заказа:', error);
            return rejectWithValue(error.message || 'Ошибка при подготовке заказа');
        }
    }
);

export const mergeCart = createAsyncThunk(
    'cart/mergeCart',
    async (_, { rejectWithValue }) => {
        try {
            const guestCartStr = await AsyncStorage.getItem(GUEST_CART_KEY);

            if (!guestCartStr) {
                return { merged: 0, stats: null };
            }

            const guestCart = JSON.parse(guestCartStr);

            if (!guestCart.items || guestCart.items.length === 0) {
                return { merged: 0, stats: null };
            }

            const items = guestCart.items.map(item => ({
                productId: item.productId || item.id,
                quantity: item.quantity
            }));

            const response = await CartService.mergeCart(items);

            if (response.status === 'success') {
                await AsyncStorage.removeItem(GUEST_CART_KEY);
                return response.data;
            } else {
                throw new Error(response.message || 'Ошибка при объединении корзин');
            }
        } catch (error) {
            console.error('Ошибка при объединении корзин:', error);
            return rejectWithValue(error.message || 'Ошибка при объединении корзин');
        }
    }
);

export const setClientType = createAsyncThunk(
    'cart/setClientType',
    async ({ clientType, additionalData = {} }, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const isAuthenticated = state.auth?.user?.id;

            if (!isAuthenticated) {
                // Для гостевой корзины
                const guestCartStr = await AsyncStorage.getItem(GUEST_CART_KEY);
                let guestCart = guestCartStr ? JSON.parse(guestCartStr) : { items: [], clientType: 'RETAIL' };
                
                guestCart.clientType = clientType;
                await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestCart));

                return {
                    clientType,
                    cart: guestCart
                };
            } else {
                // Для авторизованных пользователей
                const response = await CartService.setClientType(clientType, additionalData);

                if (response.status === 'success') {
                    return {
                        clientType,
                        cart: response.data.cart || null
                    };
                } else {
                    throw new Error(response.message || 'Ошибка при изменении типа клиента');
                }
            }
        } catch (error) {
            console.error('Ошибка при изменении типа клиента:', error);
            return rejectWithValue(error.message || 'Ошибка при изменении типа клиента');
        }
    }
);

export const bulkUpdateQuantities = createAsyncThunk(
    'cart/bulkUpdateQuantities',
    async ({ updates, allowPartialSuccess = true }, { rejectWithValue }) => {
        try {
            const response = await CartService.bulkUpdateQuantities(updates, allowPartialSuccess);

            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Ошибка при массовом обновлении количества');
            }
        } catch (error) {
            console.error('Ошибка при массовом обновлении количества:', error);
            return rejectWithValue(error.message || 'Ошибка при массовом обновлении количества');
        }
    }
);

export const bulkRemoveItems = createAsyncThunk(
    'cart/bulkRemoveItems',
    async (itemIds, { rejectWithValue }) => {
        try {
            const response = await CartService.bulkRemoveItems(itemIds);

            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Ошибка при массовом удалении товаров');
            }
        } catch (error) {
            console.error('Ошибка при массовом удалении товаров:', error);
            return rejectWithValue(error.message || 'Ошибка при массовом удалении товаров');
        }
    }
);

export const calculateShipping = createAsyncThunk(
    'cart/calculateShipping',
    async ({ deliveryAddress, deliveryType = 'STANDARD', deliveryDate = null }, { rejectWithValue }) => {
        try {
            const response = await CartService.calculateShipping(deliveryAddress, deliveryType, deliveryDate);

            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Ошибка при расчете доставки');
            }
        } catch (error) {
            console.error('Ошибка при расчете доставки:', error);
            return rejectWithValue(error.message || 'Ошибка при расчете доставки');
        }
    }
);

export const applyDiscount = createAsyncThunk(
    'cart/applyDiscount',
    async ({ discountCode, applyToItems = null }, { rejectWithValue }) => {
        try {
            const response = await CartService.applyDiscount(discountCode, applyToItems);

            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Ошибка при применении скидки');
            }
        } catch (error) {
            console.error('Ошибка при применении скидки:', error);
            return rejectWithValue(error.message || 'Ошибка при применении скидки');
        }
    }
);

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ГОСТЕВОЙ КОРЗИНЫ =====

const addToGuestCart = async (productId, quantity, getState) => {
    try {
        const state = getState();
        const product = state.products?.items?.find(p => p.id === productId);

        if (!product) {
            throw new Error('Продукт не найден');
        }

        const guestCartStr = await AsyncStorage.getItem(GUEST_CART_KEY);
        let guestCart = guestCartStr ? JSON.parse(guestCartStr) : { items: [], clientType: 'RETAIL' };

        const existingItemIndex = guestCart.items.findIndex(item =>
            (item.productId || item.id) === productId
        );

        if (existingItemIndex !== -1) {
            guestCart.items[existingItemIndex].quantity += quantity;
        } else {
            guestCart.items.push({
                id: Date.now(),
                productId,
                quantity,
                product: {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    wholesalePrice: product.wholesalePrice,
                    wholesaleMinQty: product.wholesaleMinQty,
                    images: product.images || [],
                    stockQuantity: product.stockQuantity,
                    availableQuantity: product.availableQuantity
                },
                addedAt: Date.now()
            });
        }

        await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestCart));

        return {
            productId,
            quantity,
            action: existingItemIndex !== -1 ? 'updated' : 'added',
            guestCart
        };
    } catch (error) {
        throw error;
    }
};

const updateGuestCartItem = async (itemId, quantity, getState) => {
    try {
        const guestCartStr = await AsyncStorage.getItem(GUEST_CART_KEY);

        if (!guestCartStr) {
            throw new Error('Корзина не найдена');
        }

        let guestCart = JSON.parse(guestCartStr);
        const itemIndex = guestCart.items.findIndex(item => item.id === itemId);

        if (itemIndex === -1) {
            throw new Error('Товар в корзине не найден');
        }

        if (quantity <= 0) {
            guestCart.items.splice(itemIndex, 1);
        } else {
            guestCart.items[itemIndex].quantity = quantity;
        }

        await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestCart));

        return { itemId, quantity, guestCart };
    } catch (error) {
        throw error;
    }
};

const removeFromGuestCart = async (itemId, getState) => {
    try {
        const guestCartStr = await AsyncStorage.getItem(GUEST_CART_KEY);

        if (!guestCartStr) {
            throw new Error('Корзина не найдена');
        }

        let guestCart = JSON.parse(guestCartStr);
        guestCart.items = guestCart.items.filter(item => item.id !== itemId);

        await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(guestCart));

        return itemId;
    } catch (error) {
        throw error;
    }
};

// Вспомогательная функция для подсчета статистики
const calculateCartStats = (items = [], clientType = 'RETAIL') => {
    const validItems = items.filter(item => item?.product && item.quantity > 0);
    console.log(`🛒 calculateCartStats: Processing ${validItems.length} valid items`);

    return validItems.reduce((acc, item) => {
        const product = item.product;
        const itemsPerBox = product.itemsPerBox || 1;
        const boxPrice = product.boxPrice || (product.price * itemsPerBox);

        console.log(`🛒 calculateCartStats: Item ${product.name}, quantity: ${item.quantity}, price: ${product.price}, boxPrice: ${boxPrice}, itemsPerBox: ${itemsPerBox}`);

        let finalBoxPrice = boxPrice;
        let itemSavings = 0;

        // Проверяем оптовую цену (для коробок)
        if (clientType === 'WHOLESALE' &&
            product.wholesalePrice &&
            item.quantity >= Math.ceil((product.wholesaleMinQty || 50) / itemsPerBox)) {
            const wholesaleBoxPrice = product.wholesalePrice * itemsPerBox;
            finalBoxPrice = wholesaleBoxPrice;
            itemSavings = item.quantity * (boxPrice - wholesaleBoxPrice);
        }

        const itemTotal = item.quantity * finalBoxPrice;
        const totalItemsForThisProduct = item.quantity * itemsPerBox;

        console.log(`🛒 calculateCartStats: Item total: ${itemTotal}, finalBoxPrice: ${finalBoxPrice}`);

        return {
            totalBoxes: acc.totalBoxes + item.quantity, // Количество коробок
            totalItems: acc.totalItems + totalItemsForThisProduct, // Общее количество штук
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
};

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        clearCartError: (state) => {
            state.error = null;
        },

        resetValidation: (state) => {
            state.isValidated = false;
            state.validationIssues = [];
            state.canProceedToCheckout = false;
        },

        setItemLoading: (state, action) => {
            const { itemId, type, loading } = action.payload;

            if (loading) {
                state[`${type}Items`] = addToArray(state[`${type}Items`], itemId);
            } else {
                state[`${type}Items`] = removeFromArray(state[`${type}Items`], itemId);
            }
        },

        loadGuestCart: (state, action) => {
            const guestCart = action.payload;

            if (guestCart?.items) {
                state.items = guestCart.items;
                state.clientType = guestCart.clientType || 'RETAIL';
                const stats = calculateCartStats(guestCart.items, state.clientType);
                state.totalBoxes = stats.totalBoxes;
                state.totalItems = stats.totalItems;
                state.totalAmount = stats.totalAmount;
                state.totalSavings = stats.totalSavings;
                state.itemsCount = stats.itemsCount;
            }
        },

        clearCartCache: (state) => {
            state.lastFetchTime = null;
        },

        addNotification: (state, action) => {
            const newNotification = {
                id: action.payload.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...action.payload,
                timestamp: action.payload.timestamp || new Date().toISOString()
            };
            
            // Предотвращаем дублирование уведомлений
            const isDuplicate = state.notifications.some(notification => {
                const isSameMessage = notification.message === newNotification.message;
                const isSameType = notification.type === newNotification.type;
                const isRecent = (Date.now() - new Date(notification.timestamp).getTime()) < 1000;
                
                return isSameMessage && isSameType && isRecent;
            });
            
            if (!isDuplicate) {
                state.notifications.push(newNotification);
                
                // Ограничиваем количество уведомлений до 10
                if (state.notifications.length > 10) {
                    state.notifications = state.notifications.slice(-10);
                }
            }
        },

        removeNotification: (state, action) => {
            state.notifications = state.notifications.filter(
                notification => notification.id !== action.payload
            );
        },

        clearNotifications: (state) => {
            state.notifications = [];
        }
    },
    extraReducers: (builder) => {
        builder
            // ===== ЗАГРУЗКА КОРЗИНЫ =====
            .addCase(fetchCart.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCart.fulfilled, (state, action) => {
                state.loading = false;
                const { data, fromCache } = action.payload;


                if (!fromCache) {
                    // Сортируем товары для стабильного порядка
                    const sortedItems = (data.items || []).sort((a, b) => {
                        // Сначала сортируем по ID записи в корзине для стабильности
                        return a.id - b.id;
                    });

                    state.items = sortedItems;
                    state.totalBoxes = data.summary?.totalBoxes || 0; // Количество коробок
                    state.totalItems = data.summary?.totalItems || 0; // Общее количество штук
                    state.totalAmount = data.summary?.totalAmount || 0;
                    state.totalSavings = data.summary?.totalSavings || 0;
                    state.itemsCount = data.summary?.itemsCount || 0;
                    state.clientType = data.clientType || 'RETAIL';
                    state.hasUnavailableItems = data.hasUnavailableItems || false;
                    state.unavailableCount = data.unavailableCount || 0;
                    state.removedItems = data.removedItems || [];
                    state.updatedItems = data.updatedItems || [];
                    state.lastFetchTime = Date.now();
                } else {
                    console.log('🔄 fetchCart.fulfilled: Skipping update because data is from cache');
                }
            })
            .addCase(fetchCart.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // ===== СТАТИСТИКА =====
            .addCase(fetchCartStats.fulfilled, (state, action) => {
                state.totalBoxes = action.payload.totalBoxes || 0;
                state.totalItems = action.payload.totalItems || 0;
                state.totalAmount = action.payload.totalAmount || 0;
                state.totalSavings = action.payload.totalSavings || 0;
                state.itemsCount = action.payload.itemsCount || 0;
            })

            .addCase(fetchDetailedCartStats.fulfilled, (state, action) => {
                const data = action.payload;
                state.totalBoxes = data.totalBoxes || 0;
                state.totalItems = data.totalItems || 0;
                state.totalAmount = data.totalAmount || 0;
                state.totalSavings = data.totalSavings || 0;
                state.itemsCount = data.itemsCount || 0;
                state.clientType = data.clientType || 'RETAIL';
                state.breakdown = data.breakdown || [];
            })

            // ===== ДОБАВЛЕНИЕ В КОРЗИНУ =====
            .addCase(addToCart.pending, (state, action) => {
                const productId = action.meta.arg.productId;
                state.addingItems = addToArray(state.addingItems, productId);
                state.error = null;
            })
            .addCase(addToCart.fulfilled, (state, action) => {
                const { productId, quantity, stats, guestCart, action: actionType, product } = action.payload;
                state.addingItems = removeFromArray(state.addingItems, productId);


                if (guestCart) {
                    // Для гостевой корзины обновляем items напрямую с сортировкой
                    const sortedItems = (guestCart.items || []).sort((a, b) => {
                        return a.id - b.id;
                    });
                    state.items = sortedItems;
                    const calculatedStats = calculateCartStats(sortedItems, state.clientType);
                    state.totalBoxes = calculatedStats.totalBoxes;
                    state.totalItems = calculatedStats.totalItems;
                    state.totalAmount = calculatedStats.totalAmount;
                    state.totalSavings = calculatedStats.totalSavings;
                    state.itemsCount = calculatedStats.itemsCount;
                    console.log(`🛒 addToCart.fulfilled: Guest cart updated, totalAmount: ${calculatedStats.totalAmount}`);
                } else {
                    // Для обычной корзины - оптимистическое обновление массива items
                    if (product && !Array.isArray(state.items)) {
                        state.items = [];
                    }

                    if (product && Array.isArray(state.items)) {
                        const existingItemIndex = state.items.findIndex(item =>
                            item.productId === productId || item.product?.id === productId
                        );

                        if (existingItemIndex !== -1) {
                            // Обновляем существующую позицию
                            const oldQuantity = state.items[existingItemIndex].quantity;
                            state.items[existingItemIndex] = {
                                ...state.items[existingItemIndex],
                                quantity: state.items[existingItemIndex].quantity + quantity,
                                updatedAt: Date.now()
                            };
                        } else {
                            // Добавляем новую позицию
                            const newItem = {
                                id: Date.now(), // Временный ID до синхронизации
                                productId,
                                quantity,
                                product: {
                                    id: product.id,
                                    name: product.name,
                                    price: product.price,
                                    boxPrice: product.boxPrice,
                                    itemsPerBox: product.itemsPerBox,
                                    wholesalePrice: product.wholesalePrice,
                                    wholesaleMinQty: product.wholesaleMinQty,
                                    images: product.images || [],
                                    stockQuantity: product.stockQuantity,
                                    availableQuantity: product.availableQuantity
                                },
                                addedAt: Date.now()
                            };
                            state.items.push(newItem);
                        }
                    }

                    if (stats) {
                        // Используем статистику с сервера
                        state.totalBoxes = stats.totalBoxes || 0;
                        state.totalItems = stats.totalItems || 0;
                        state.totalAmount = stats.totalAmount || 0;
                        state.totalSavings = stats.totalSavings || 0;
                        state.itemsCount = stats.itemsCount || 0;
                    } else {
                        // Если нет статистики с сервера, пересчитываем локально
                        const calculatedStats = calculateCartStats(state.items, state.clientType);
                        state.totalBoxes = calculatedStats.totalBoxes;
                        state.totalItems = calculatedStats.totalItems;
                        state.totalAmount = calculatedStats.totalAmount;
                        state.totalSavings = calculatedStats.totalSavings;
                        state.itemsCount = calculatedStats.itemsCount;
                    }

                    // Сбрасываем кэш чтобы при следующем входе в корзину данные обновились с сервера
                    state.lastFetchTime = null;
                }
            })
            .addCase(addToCart.rejected, (state, action) => {
                const productId = action.meta.arg.productId;
                state.addingItems = removeFromArray(state.addingItems, productId);
                state.error = action.payload;
                // Сбрасываем кэш в случае ошибки, чтобы данные были синхронизированы при следующем запросе
                state.lastFetchTime = null;
            })

            // ===== ОБНОВЛЕНИЕ ТОВАРА =====
            .addCase(updateCartItem.pending, (state, action) => {
                const itemId = action.meta.arg.itemId;
                state.updatingItems = addToArray(state.updatingItems, itemId);
                state.error = null;
                // Убрали оптимистическое обновление - теперь это делается локально в хуке
            })
            .addCase(updateCartItem.fulfilled, (state, action) => {
                const { itemId, quantity, guestCart, priceInfo } = action.payload;
                state.updatingItems = removeFromArray(state.updatingItems, itemId);

                if (guestCart) {
                    // Для гостевой корзины обновляем состояние напрямую с сортировкой
                    const sortedItems = (guestCart.items || []).sort((a, b) => {
                        return a.id - b.id;
                    });
                    state.items = sortedItems;
                    const stats = calculateCartStats(sortedItems, state.clientType);
                    state.totalItems = stats.totalItems;
                    state.totalAmount = stats.totalAmount;
                    state.totalSavings = stats.totalSavings;
                    state.itemsCount = stats.itemsCount;
                } else {
                    // Для авторизованных пользователей - оптимистическое обновление
                    if (Array.isArray(state.items)) {
                        const itemIndex = state.items.findIndex(item => item.id === itemId);
                        if (itemIndex !== -1) {
                            state.items[itemIndex] = {
                                ...state.items[itemIndex],
                                quantity: quantity,
                                updatedAt: Date.now()
                            };
                        }
                    }

                    // Обновляем статистику если она пришла с сервера
                    if (priceInfo) {
                        // Здесь можно обновить статистику на основе priceInfo
                    }
                }

                state.lastFetchTime = null;
            })
            .addCase(updateCartItem.rejected, (state, action) => {
                const itemId = action.meta.arg.itemId;
                state.updatingItems = removeFromArray(state.updatingItems, itemId);
                state.error = action.payload;
                // Откат теперь происходит локально в хуке
                state.lastFetchTime = null;
            })

            // ===== УДАЛЕНИЕ ИЗ КОРЗИНЫ =====
            .addCase(removeFromCart.pending, (state, action) => {
                const itemId = action.meta.arg;
                state.removingItems = addToArray(state.removingItems, itemId);
                state.error = null;
            })
            .addCase(removeFromCart.fulfilled, (state, action) => {
                const itemId = action.payload;
                state.removingItems = removeFromArray(state.removingItems, itemId);

                // Оптимистическое удаление товара из массива items
                if (Array.isArray(state.items)) {
                    state.items = state.items.filter(item => item.id !== itemId);
                }

                state.lastFetchTime = null;
            })
            .addCase(removeFromCart.rejected, (state, action) => {
                const itemId = action.meta.arg;
                state.removingItems = removeFromArray(state.removingItems, itemId);
                state.error = action.payload;
                // Сбрасываем кэш в случае ошибки
                state.lastFetchTime = null;
            })

            // ===== ОЧИСТКА КОРЗИНЫ =====
            .addCase(clearCart.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(clearCart.fulfilled, (state) => {
                state.loading = false;
                state.items = [];
                state.totalItems = 0;
                state.totalAmount = 0;
                state.totalSavings = 0;
                state.itemsCount = 0;
                state.hasUnavailableItems = false;
                state.unavailableCount = 0;
                state.lastFetchTime = null;
            })
            .addCase(clearCart.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // ===== ВАЛИДАЦИЯ =====
            .addCase(validateCart.pending, (state) => {
                state.validating = true;
                state.error = null;
            })
            .addCase(validateCart.fulfilled, (state, action) => {
                state.validating = false;
                state.isValidated = true;
                state.validationIssues = action.payload.issues || [];
                state.canProceedToCheckout = action.payload.isValid || false;
            })
            .addCase(validateCart.rejected, (state, action) => {
                state.validating = false;
                state.error = action.payload;
                state.isValidated = false;
                state.validationIssues = [];
                state.canProceedToCheckout = false;
            })

            .addCase(validateCartDetailed.pending, (state) => {
                state.validating = true;
                state.error = null;
            })
            .addCase(validateCartDetailed.fulfilled, (state, action) => {
                state.validating = false;
                state.isValidated = true;
                state.validationIssues = action.payload.issues || [];
                state.canProceedToCheckout = action.payload.canProceedToCheckout || false;
            })
            .addCase(validateCartDetailed.rejected, (state, action) => {
                state.validating = false;
                state.error = action.payload;
                state.isValidated = false;
                state.validationIssues = [];
                state.canProceedToCheckout = false;
            })

            // ===== ОФОРМЛЕНИЕ ЗАКАЗА =====
            .addCase(prepareCheckout.pending, (state) => {
                state.preparingCheckout = true;
                state.error = null;
            })
            .addCase(prepareCheckout.fulfilled, (state, action) => {
                state.preparingCheckout = false;
                state.checkoutData = action.payload;
            })
            .addCase(prepareCheckout.rejected, (state, action) => {
                state.preparingCheckout = false;
                state.error = action.payload;
            })

            .addCase(checkout.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(checkout.fulfilled, (state, action) => {
                state.loading = false;
                
                // Проверяем, требуется ли сохранить корзину
                // Корзина НЕ очищается в следующих случаях:
                // 1. Требуется выбор клиента (товары недоступны, нужна замена/ожидание)
                // 2. Онлайн оплата - корзина очистится после успешной оплаты в PaymentScreen
                const requiresClientChoice = action.payload?.order?.requiresClientChoice;
                const orderStatus = action.payload?.order?.status;
                const isOnlinePayment = orderStatus === 'PENDING_PAYMENT';
                
                const shouldKeepCart = requiresClientChoice || isOnlinePayment;
                
                if (shouldKeepCart) {
                    console.log('🛒 Корзина НЕ очищается:', {
                        requiresClientChoice,
                        isOnlinePayment,
                        orderStatus
                    });
                    // Сбрасываем кэш для возможной перезагрузки
                    state.lastFetchTime = null;
                } else {
                    console.log('🗑️ Корзина очищается - заказ успешно оформлен (не онлайн оплата)');
                    state.items = [];
                    state.totalItems = 0;
                    state.totalAmount = 0;
                    state.totalSavings = 0;
                    state.itemsCount = 0;
                    state.hasUnavailableItems = false;
                    state.unavailableCount = 0;
                    state.isValidated = false;
                    state.validationIssues = [];
                    state.canProceedToCheckout = false;
                    state.checkoutData = null;
                    state.lastFetchTime = null;
                }
            })
            .addCase(checkout.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // ===== ОБЪЕДИНЕНИЕ КОРЗИН =====
            .addCase(mergeCart.fulfilled, (state, action) => {
                const { stats } = action.payload;

                if (stats) {
                    state.totalItems = stats.totalItems;
                    state.totalAmount = stats.totalAmount;
                    state.totalSavings = stats.totalSavings || 0;
                    state.itemsCount = stats.itemsCount;
                }

                state.lastFetchTime = null;
            })

            // ===== ТИП КЛИЕНТА =====
            .addCase(setClientType.fulfilled, (state, action) => {
                const { clientType, cart } = action.payload;
                state.clientType = clientType;

                if (cart) {
                    // Обновляем гостевую корзину с новыми ценами
                    state.items = cart.items;
                    const stats = calculateCartStats(cart.items, clientType);
                    state.totalItems = stats.totalItems;
                    state.totalAmount = stats.totalAmount;
                    state.totalSavings = stats.totalSavings;
                    state.itemsCount = stats.itemsCount;
                }

                state.lastFetchTime = null;
            })

            // ===== МАССОВЫЕ ОПЕРАЦИИ =====
            .addCase(bulkUpdateQuantities.fulfilled, (state, action) => {
                const { results, successful, total } = action.payload;

                state.notifications.push({
                    id: Date.now(),
                    type: successful === total ? 'success' : 'warning',
                    message: `Обновлено ${successful} из ${total} товаров`,
                    timestamp: new Date().toISOString()
                });

                state.lastFetchTime = null;
            })

            .addCase(bulkUpdateQuantities.rejected, (state, action) => {
                state.error = action.payload;
                // Сбрасываем кэш в случае ошибки
                state.lastFetchTime = null;
            })

            .addCase(bulkRemoveItems.fulfilled, (state, action) => {
                const { removedCount } = action.payload;

                state.notifications.push({
                    id: Date.now(),
                    type: 'success',
                    message: `Удалено ${removedCount} товаров`,
                    timestamp: new Date().toISOString()
                });

                state.lastFetchTime = null;
            })

            .addCase(bulkRemoveItems.rejected, (state, action) => {
                state.error = action.payload;
                // Сбрасываем кэш в случае ошибки
                state.lastFetchTime = null;
            })

            // ===== ДОСТАВКА И СКИДКИ =====
            .addCase(calculateShipping.fulfilled, (state, action) => {
                state.shippingCost = action.payload.shippingCost;
                state.shippingInfo = action.payload;
            })

            .addCase(applyDiscount.fulfilled, (state, action) => {
                state.appliedDiscount = action.payload;

                if (action.payload.applied) {
                    state.notifications.push({
                        id: Date.now(),
                        type: 'success',
                        message: 'Скидка успешно применена',
                        timestamp: new Date().toISOString()
                    });
                }
            });
    },
});

export const {
    clearCartError,
    resetValidation,
    setItemLoading,
    loadGuestCart,
    clearCartCache,
    addNotification,
    removeNotification,
    clearNotifications
} = cartSlice.actions;

export default cartSlice.reducer;