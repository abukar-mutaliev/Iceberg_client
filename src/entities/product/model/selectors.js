import { createSelector } from "@reduxjs/toolkit";

const EMPTY_ARRAY = [];

export const selectProducts = (state) => state.products?.items || EMPTY_ARRAY;
export const selectProductsById = (state) => state.products?.byId || {};
export const selectCurrentProduct = (state) => state.products?.currentProduct || null;
export const selectProductsLoading = (state) => state.products?.loading || false;
export const selectProductsLoadingMore = (state) => state.products?.loadingMore || false;
export const selectProductsError = (state) => state.products?.error || null;

export const selectFetchCompleted = (state) => state.products?.fetchCompleted || false;

export const selectProductsHasMore = (state) => state.products?.hasMore || false;
export const selectProductsCurrentPage = (state) => state.products?.currentPage || 1;
export const selectProductsTotalPages = (state) => state.products?.totalPages || 1;
export const selectProductsTotalItems = (state) => state.products?.totalItems || 0;

export const selectProductById = createSelector(
    [selectProductsById, selectProducts, (state, productId) => productId],
    (byId, products, productId) => {
        if (!productId) return null;

        const numericId = parseInt(productId, 10);
        if (isNaN(numericId)) return null;

        // Сначала проверяем byId словарь - это быстрее чем поиск в массиве
        if (byId && typeof byId === 'object' && byId[numericId]) {
            return byId[numericId];
        }

        // Fallback: ищем в массиве products
        if (Array.isArray(products)) {
            return products.find(product => product && product.id === numericId) || null;
        }

        return null;
    }
);

export const selectSimilarProducts = createSelector(
    [selectProducts, selectCurrentProduct, (state, productId) => productId],
    (products, currentProductInState, productId) => {
        const currentProduct = currentProductInState ||
            products.find(p => p && p.id === parseInt(productId, 10));

        if (!currentProduct || !Array.isArray(products) || products.length === 0) {
            return EMPTY_ARRAY;
        }

        return products
            .filter(product => {
                if (!product || product.id === currentProduct.id) {
                    return false;
                }

                // Проверка общей категории
                if (currentProduct.categories && Array.isArray(currentProduct.categories) &&
                    product.categories && Array.isArray(product.categories)) {
                    // Получаем ID категорий текущего товара
                    const currentCategoryIds = currentProduct.categories.map(cat => {
                        if (typeof cat === 'object' && cat !== null && cat.id) {
                            return cat.id;
                        }
                        if (typeof cat === 'string' || typeof cat === 'number') {
                            return cat;
                        }
                        return null;
                    }).filter(id => id !== null);

                    // Проверяем, есть ли общая категория
                    const hasCommonCategory = product.categories.some(cat => {
                        let catId = null;
                        if (typeof cat === 'object' && cat !== null && cat.id) {
                            catId = cat.id;
                        } else if (typeof cat === 'string' || typeof cat === 'number') {
                            catId = cat;
                        }
                        return catId !== null && currentCategoryIds.includes(catId);
                    });
                    
                    if (hasCommonCategory) return true;
                }

                // Проверка того же поставщика
                if (currentProduct.supplierId && product.supplierId) {
                    return product.supplierId === currentProduct.supplierId;
                }

                return false;
            })
            .sort((a, b) => {
                if (!a.price || !b.price || !currentProduct.price) return 0;
                return Math.abs(a.price - currentProduct.price) -
                    Math.abs(b.price - currentProduct.price);
            })
            .slice(0, 6);
    }
);

export const selectFilteredProducts = createSelector(
    [selectProducts, (state, filterCriteria) => filterCriteria],
    (products, filterCriteria) => {
        if (!filterCriteria) return products;

        return products.filter(product => {
            if (!product) return false;

            let match = true;

            if (filterCriteria.name) {
                match = match && product.name && product.name.toLowerCase().includes(filterCriteria.name.toLowerCase());
            }

            if (filterCriteria.minPrice !== undefined) {
                match = match && product.price && product.price >= filterCriteria.minPrice;
            }

            if (filterCriteria.maxPrice !== undefined) {
                match = match && product.price && product.price <= filterCriteria.maxPrice;
            }

            if (filterCriteria.category) {
                match = match && (product.categories?.includes(filterCriteria.category));
            }

            return match;
        });
    }
);

export const selectProductFeedbacks = createSelector(
    [
        (state, productId) => state.feedback?.items?.[productId] || EMPTY_ARRAY,
        (state, productId) => productId,
    ],
    (feedbacks, productId) => {
        if (!Array.isArray(feedbacks)) return EMPTY_ARRAY;
        return feedbacks.map((feedback) => ({
            ...feedback,
            id: feedback?.id || null,
            rating: parseFloat(feedback?.rating || 0),
            createdAt: feedback?.createdAt || null,
            productId,
        }));
    }
);

export const selectProductAverageRating = createSelector(
    [selectProductFeedbacks],
    (feedbacks) => {
        if (!Array.isArray(feedbacks) || feedbacks.length === 0) return 0;

        const sum = feedbacks.reduce((total, feedback) => total + (feedback.rating || 0), 0);
        return sum / feedbacks.length;
    }
);

/**
 * Селектор для получения остальных товаров (исключая похожие и текущий)
 */
export const selectOtherProducts = createSelector(
    [selectProducts, selectSimilarProducts, (state, productId) => productId],
    (products, similarProducts, productId) => {
        if (!Array.isArray(products) || products.length === 0) {
            return EMPTY_ARRAY;
        }

        const numericProductId = parseInt(productId, 10);
        if (isNaN(numericProductId)) {
            return EMPTY_ARRAY;
        }

        // Получаем ID похожих товаров
        const similarProductIds = new Set(
            similarProducts.map(p => p?.id).filter(id => id !== null && id !== undefined)
        );

        // Фильтруем: исключаем текущий товар и похожие
        return products.filter(product => {
            if (!product || !product.id) return false;
            if (product.id === numericProductId) return false;
            if (similarProductIds.has(product.id)) return false;
            return true;
        });
    }
);