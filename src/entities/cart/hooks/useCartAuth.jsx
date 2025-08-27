import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCartAvailability, useCartNotifications, useGuestCart } from './useCart';
import { mergeCart, fetchCart } from '../model/slice';

const GUEST_CART_KEY = 'guest_cart';

/**
 * Хук для улучшенной работы с авторизацией и объединением корзин
 */
export const useCartAuth = () => {
    const dispatch = useDispatch();
    const { isAuthenticated, isGuest } = useCartAvailability();
    const { mergeWithServerCart } = useGuestCart();
    const { addSuccessNotification, addInfoNotification } = useCartNotifications();
    
    const [isProcessingMerge, setIsProcessingMerge] = useState(false);
    const [mergeResult, setMergeResult] = useState(null);

    /**
     * Автоматическое объединение корзин при изменении статуса авторизации
     */
    const handleAuthStateChange = useCallback(async (wasAuthenticated, nowAuthenticated) => {
        // Если пользователь только что авторизовался
        if (!wasAuthenticated && nowAuthenticated) {
            await handleSuccessfulLogin();
        }
        
        // Если пользователь вышел из системы
        if (wasAuthenticated && !nowAuthenticated) {
            await handleLogout();
        }
    }, []);

    /**
     * Обработка успешной авторизации с объединением корзин
     */
    const handleSuccessfulLogin = useCallback(async () => {
        try {
            setIsProcessingMerge(true);
            
            // Проверяем, есть ли гостевая корзина
            const guestCartData = await AsyncStorage.getItem(GUEST_CART_KEY);
            const hasGuestCart = guestCartData && JSON.parse(guestCartData).items?.length > 0;

            if (hasGuestCart) {
                // Показываем уведомление о начале объединения
                addInfoNotification('Объединяем корзину с вашим аккаунтом...');

                // Выполняем объединение корзин
                const result = await dispatch(mergeCart()).unwrap();
                
                setMergeResult(result);

                if (result.merged > 0) {
                    addSuccessNotification(
                        `✅ Добро пожаловать! Объединено ${result.merged} товаров из вашей корзины`
                    );
                } else {
                    addSuccessNotification('✅ Добро пожаловать!');
                }

                // Загружаем обновленную корзину
                await dispatch(fetchCart(true));
            } else {
                // Просто загружаем корзину пользователя
                await dispatch(fetchCart());
                addSuccessNotification('✅ Добро пожаловать!');
            }

        } catch (error) {
            console.error('Ошибка при объединении корзин:', error);
            
            // Даже если объединение не удалось, загружаем серверную корзину
            try {
                await dispatch(fetchCart());
                addSuccessNotification('✅ Добро пожаловать!');
            } catch (fetchError) {
                console.error('Ошибка при загрузке серверной корзины:', fetchError);
            }
        } finally {
            setIsProcessingMerge(false);
        }
    }, [dispatch, addSuccessNotification, addInfoNotification]);

    /**
     * Обработка выхода из системы
     */
    const handleLogout = useCallback(async () => {
        try {
            // Очищаем состояние объединения
            setMergeResult(null);
            setIsProcessingMerge(false);
            
            // Можем оставить гостевую корзину для будущего использования
            // или очистить её - зависит от требований
            
        } catch (error) {
            console.error('Ошибка при обработке выхода:', error);
        }
    }, []);

    /**
     * Принудительное объединение корзин (для ручного вызова)
     */
    const forceMergeCart = useCallback(async () => {
        if (!isAuthenticated) {
            throw new Error('Пользователь не авторизован');
        }

        try {
            setIsProcessingMerge(true);
            
            const result = await dispatch(mergeCart()).unwrap();
            setMergeResult(result);
            
            if (result.merged > 0) {
                addSuccessNotification(`Объединено ${result.merged} товаров`);
            }

            // Перезагружаем корзину
            await dispatch(fetchCart(true));

            return {
                success: true,
                merged: result.merged,
                message: `Объединено ${result.merged} товаров`
            };
        } catch (error) {
            console.error('Ошибка при принудительном объединении:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            setIsProcessingMerge(false);
        }
    }, [isAuthenticated, dispatch, addSuccessNotification]);

    /**
     * Проверка наличия гостевой корзины
     */
    const checkGuestCartExists = useCallback(async () => {
        try {
            const guestCartData = await AsyncStorage.getItem(GUEST_CART_KEY);
            if (!guestCartData) return false;
            
            const guestCart = JSON.parse(guestCartData);
            return guestCart.items && guestCart.items.length > 0;
        } catch (error) {
            console.error('Ошибка при проверке гостевой корзины:', error);
            return false;
        }
    }, []);

    /**
     * Получение статистики гостевой корзины
     */
    const getGuestCartStats = useCallback(async () => {
        try {
            const guestCartData = await AsyncStorage.getItem(GUEST_CART_KEY);
            if (!guestCartData) {
                return { itemsCount: 0, totalAmount: 0 };
            }
            
            const guestCart = JSON.parse(guestCartData);
            const items = guestCart.items || [];
            
            let totalAmount = 0;
            items.forEach(item => {
                const price = item.product?.price || 0;
                totalAmount += price * (item.quantity || 0);
            });
            
            return {
                itemsCount: items.length,
                totalItems: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
                totalAmount: Math.round(totalAmount * 100) / 100
            };
        } catch (error) {
            console.error('Ошибка при получении статистики гостевой корзины:', error);
            return { itemsCount: 0, totalAmount: 0 };
        }
    }, []);

    return {
        // Состояние
        isProcessingMerge,
        mergeResult,
        
        // Функции
        handleAuthStateChange,
        handleSuccessfulLogin,
        handleLogout,
        forceMergeCart,
        checkGuestCartExists,
        getGuestCartStats,
        
        // Утилиты
        isAuthenticated,
        isGuest
    };
}; 