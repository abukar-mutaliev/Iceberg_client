import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchFavorites,
    addToFavorites,
    removeFromFavorites,
    checkIsFavorite,
    toggleFavoriteOptimistic,
    clearFavoritesError
} from '../model/slice';
import {
    selectFavorites,
    selectFavoritesLoading,
    selectFavoritesError,
    selectFavoritesCount,
    selectIsFavorite,
    selectProductStatus,
    selectFavoritesWithDetails
} from '../model/selectors';
import { useAuth } from '@entities/auth/hooks/useAuth';

/**
 * Оптимизированный хук для работы с избранными товарами
 * Учитывает статус авторизации пользователя
 */
export const useFavorites = (productId) => {
    const dispatch = useDispatch();
    const checkStatusRequested = useRef(false);
    const loadFavoritesRequested = useRef(false);

    // Получаем статус авторизации
    const { isAuthenticated } = useAuth();

    // Базовые селекторы
    const favorites = useSelector(selectFavorites);
    const loading = useSelector(selectFavoritesLoading);
    const error = useSelector(selectFavoritesError);
    const favoritesCount = useSelector(selectFavoritesCount);
    const favoritesWithDetails = useSelector(selectFavoritesWithDetails);

    // Селекторы для конкретного товара с мемоизацией
    const isFavorite = useSelector(state => {
        if (!productId || !isAuthenticated) return false;
        return selectIsFavorite(state, productId);
    });

    const productStatus = useSelector(state => {
        if (!productId) return 'idle';
        return selectProductStatus(state, productId);
    });

    // Оптимизированная загрузка списка избранного только для авторизованных пользователей
    const loadFavorites = useCallback(() => {
        if (!isAuthenticated) {
            return Promise.resolve([]);
        }

        if (loadFavoritesRequested.current) {
            return Promise.resolve(favorites);
        }

        loadFavoritesRequested.current = true;

        return dispatch(fetchFavorites())
            .unwrap()
            .finally(() => {
                setTimeout(() => {
                    loadFavoritesRequested.current = false;
                }, 500);
            });
    }, [dispatch, favorites, isAuthenticated]);

    // При первой загрузке проверяем статус только для авторизованных пользователей
    useEffect(() => {
        if (isAuthenticated && productId && !checkStatusRequested.current) {
            checkStatusRequested.current = true;
            dispatch(checkIsFavorite(productId))
                .finally(() => {
                    setTimeout(() => {
                        checkStatusRequested.current = false;
                    }, 500);
                });
        }

        // Сбрасываем флаг при изменении авторизации
        if (!isAuthenticated) {
            checkStatusRequested.current = false;
        }
    }, [dispatch, productId, isAuthenticated]);

    // Оптимизированные методы для работы с избранным
    const addFavorite = useCallback((id) => {
        if (!id || !isAuthenticated) return Promise.resolve();

        dispatch(toggleFavoriteOptimistic(id));
        return dispatch(addToFavorites(id)).unwrap();
    }, [dispatch, isAuthenticated]);

    const removeFavorite = useCallback((id) => {
        if (!id || !isAuthenticated) return Promise.resolve();

        dispatch(toggleFavoriteOptimistic(id));
        return dispatch(removeFromFavorites(id)).unwrap();
    }, [dispatch, isAuthenticated]);

    // Оптимизированный метод проверки статуса - только для авторизованных пользователей
    const checkFavoriteStatus = useCallback((id) => {
        if (!id || !isAuthenticated) {
            return Promise.resolve({ productId: id, isFavorite: false });
        }

        if (checkStatusRequested.current) {
            return Promise.resolve({ productId: id, isFavorite });
        }

        checkStatusRequested.current = true;

        return dispatch(checkIsFavorite(id))
            .unwrap()
            .finally(() => {
                setTimeout(() => {
                    checkStatusRequested.current = false;
                }, 500);
            });
    }, [dispatch, isFavorite, isAuthenticated]);

    const toggleFavorite = useCallback((id) => {
        if (!id || !isAuthenticated) return Promise.resolve();

        if (isFavorite) {
            return removeFavorite(id);
        } else {
            return addFavorite(id);
        }
    }, [isFavorite, addFavorite, removeFavorite, isAuthenticated]);

    // Проверка только для авторизованных пользователей
    const checkAndCleanupFavorites = useCallback(() => {
        if (!isAuthenticated || !favorites || !favoritesWithDetails || favorites.length === 0) {
            return;
        }

        const validItems = favorites.filter(item => {
            const favoriteProductId = item.product?.id || item.productId;
            if (!favoriteProductId) return false;

            const detailedItem = favoritesWithDetails.find(f =>
                (f.id === favoriteProductId) || (f.product?.id === favoriteProductId)
            );

            return !!detailedItem;
        });

        if (validItems.length < favorites.length && !loadFavoritesRequested.current) {
            loadFavorites();
        }
    }, [favorites, favoritesWithDetails, loadFavorites, isAuthenticated]);

    // Вызываем проверку при изменении данных, но только для авторизованных пользователей
    useEffect(() => {
        if (!isAuthenticated) return;

        const timeoutId = setTimeout(() => {
            checkAndCleanupFavorites();
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [favorites, favoritesWithDetails, checkAndCleanupFavorites, isAuthenticated]);

    return {
        favorites: isAuthenticated ? favorites : [],
        favoritesWithDetails: isAuthenticated ? favoritesWithDetails : [],
        loading: isAuthenticated ? loading : false,
        error: isAuthenticated ? error : null,
        favoritesCount: isAuthenticated ? favoritesCount : 0,
        loadFavorites,
        isFavorite: isAuthenticated ? isFavorite : false,
        productStatus,
        toggleFavorite,
        addFavorite,
        removeFavorite,
        checkFavoriteStatus,
        isAuthenticated
    };
};

export default useFavorites;