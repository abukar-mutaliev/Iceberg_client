import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    checkIsFavorite,
    addToFavorites,
    removeFromFavorites,
    toggleFavoriteOptimistic
} from '@entities/favorites';
import {
    selectIsFavorite,
    selectProductStatus
} from '@entities/favorites/model/selectors';
import { useAuth } from '@entities/auth/hooks/useAuth';

/**
 * Оптимизированный хук для работы с избранным для одного продукта
 * Предотвращает множественные сетевые запросы
 * Учитывает статус авторизации пользователя
 */
export const useFavoriteStatus = (productId) => {
    const dispatch = useDispatch();
    const checkRequested = useRef(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Получаем статус авторизации
    const { isAuthenticated } = useAuth();

    // Безопасно получаем ID продукта как число
    const safeProductId = productId ? Number(productId) : 0;

    // Селекторы для текущего продукта
    const isFavorite = useSelector(state =>
        safeProductId ? selectIsFavorite(state, safeProductId) : false
    );
    const productStatus = useSelector(state =>
        safeProductId ? selectProductStatus(state, safeProductId) : 'idle'
    );

    // Проверяем статус избранного только для авторизованных пользователей
    useEffect(() => {
        // Только для авторизованных пользователей выполняем проверку
        if (isAuthenticated && safeProductId > 0 && !checkRequested.current) {
            checkRequested.current = true;
            dispatch(checkIsFavorite(safeProductId));
        }

        // Сбрасываем флаг при изменении авторизации или ID продукта
        if (!isAuthenticated) {
            checkRequested.current = false;
        }

        return () => {
            checkRequested.current = false;
        };
    }, [dispatch, safeProductId, isAuthenticated]);

    // Оптимизированная функция переключения избранного
    const toggleFavorite = useCallback(async () => {
        // Проверяем авторизацию перед выполнением действий
        if (!isAuthenticated) {
            // Здесь можно показать сообщение о необходимости авторизации
            // или перенаправить на экран входа
            return;
        }

        if (!safeProductId || isUpdating) return;

        try {
            setIsUpdating(true);

            // Оптимистично обновляем UI
            dispatch(toggleFavoriteOptimistic(safeProductId));

            // Выполняем соответствующее действие
            if (isFavorite) {
                await dispatch(removeFromFavorites(safeProductId)).unwrap();
            } else {
                await dispatch(addToFavorites(safeProductId)).unwrap();
            }
        } catch (error) {
            // Здесь можно показать уведомление об ошибке пользователю
        } finally {
            setIsUpdating(false);
        }
    }, [dispatch, safeProductId, isFavorite, isUpdating, isAuthenticated]);

    // Вычисляем состояние загрузки
    const isLoading = isUpdating || productStatus === 'loading';

    return {
        isFavorite: isAuthenticated ? isFavorite : false, // Для неавторизованных всегда false
        isLoading,
        toggleFavorite,
        isAuthenticated // Возвращаем статус авторизации для UI
    };
};