import { createSelector } from '@reduxjs/toolkit';
import { selectProducts } from '@entities/product';

// Константы для предотвращения создания новых ссылок
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

// Базовые селекторы
export const selectFavorites = (state) => state.favorites?.items || EMPTY_ARRAY;
export const selectFavoritesLoading = (state) => state.favorites?.loading || false;
export const selectFavoritesError = (state) => state.favorites?.error || null;
export const selectFavoritesActionLoading = (state) => state.favorites?.actionLoading || false;
export const selectFavoritesActionError = (state) => state.favorites?.actionError || null;
export const selectProductStatuses = (state) => state.favorites?.productStatuses || EMPTY_OBJECT;

// Получение статуса для конкретного товара
export const selectProductStatus = createSelector(
    [selectProductStatuses, (_, productId) => productId],
    (statuses, productId) => statuses[productId] || 'idle'
);


export const selectIsFavorite = createSelector(
    [selectFavorites, (_, productId) => productId],
    (favorites, productId) => {
        const safeProductId = Number(productId);

        if (!safeProductId || safeProductId <= 0 || isNaN(safeProductId)) {
            return false;
        }

        return favorites.some(item => {
            let itemId = null;

            if (item.product && item.product.id) {
                itemId = Number(item.product.id);
            } else if (item.productId) {
                itemId = Number(item.productId);
            } else if (item.id) {
                itemId = Number(item.id);
            }

            return itemId === safeProductId;
        });
    }
);

// Получение избранных товаров с полной информацией (объединение с продуктами)
export const selectFavoritesWithDetails = createSelector(
    [selectFavorites, selectProducts],
    (favorites, products) => {
        if (!favorites || !products) return EMPTY_ARRAY;

        return favorites
            .map(favorite => {
                const productId = favorite.product?.id || favorite.productId;

                // Ищем полную информацию о товаре
                const product = products.find(p => p.id === productId);

                // Если нашли - объединяем с данными из избранного
                if (product) {
                    const result = {
                        ...favorite, // Сначала данные из избранного
                        ...product,  // Затем актуальные данные продукта (перезаписывают)
                        isFavorite: true,
                        favoriteId: favorite.id,
                        addedAt: favorite.addedAt,
                        // Принудительно сохраняем актуальные данные о наличии
                        stockQuantity: product.stockQuantity,
                        availableQuantity: product.availableQuantity,
                        isActive: product.isActive
                    };

                    return result;
                }

                // Если любая информация о товаре есть в favorite - используем её
                if (favorite.product) {
                    return {
                        ...favorite.product,
                        isFavorite: true,
                        favoriteId: favorite.id,
                        addedAt: favorite.addedAt
                    };
                }

                // Если товар еще не загружен из продуктов - возвращаем данные из избранного
                return {
                    ...favorite,
                    isFavorite: true,
                    id: productId
                };
            })
            .filter(favorite => !favorite.isPlaceholder); // Отфильтровываем временные заглушки
    }
);

// Количество избранных товаров
export const selectFavoritesCount = createSelector(
    [selectFavorites],
    (favorites) => favorites.filter(favorite => !favorite.isPlaceholder).length
);

// Получение отсортированных по дате добавления избранных товаров
export const selectSortedFavorites = createSelector(
    [selectFavoritesWithDetails],
    (favorites) => [...favorites].sort((a, b) => {
        // Сортировка по дате добавления (от новых к старым)
        const dateA = new Date(a.addedAt || 0);
        const dateB = new Date(b.addedAt || 0);
        return dateB - dateA;
    })
);