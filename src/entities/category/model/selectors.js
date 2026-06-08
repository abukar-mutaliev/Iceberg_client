import { createSelector } from '@reduxjs/toolkit';
import { normalizeCategoryId } from './slice';

// Базовый селектор состояния категорий
const selectCategoryState = (state) => state.category || {};

const selectNormalizedCategoryId = (state, categoryId) => normalizeCategoryId(categoryId);

// Мемоизированные селекторы для избежания лишних ререндеров
export const selectCategories = createSelector(
    [selectCategoryState],
    (categoryState) => categoryState.categories || []
);

export const selectCurrentCategory = createSelector(
    [selectCategoryState],
    (categoryState) => categoryState.currentCategory || null
);

export const selectCategoriesLoading = createSelector(
    [selectCategoryState],
    (categoryState) => categoryState.isLoading || false
);

export const selectCategoriesError = createSelector(
    [selectCategoryState],
    (categoryState) => categoryState.error || null
);

export const selectCategoryLastFetchTime = createSelector(
    [selectCategoryState],
    (categoryState) => categoryState.lastFetchTime || null
);

export const selectCategoryCacheValid = createSelector(
    [selectCategoryLastFetchTime],
    (lastFetchTime) => {
        if (!lastFetchTime) return false;
        const CACHE_EXPIRY_TIME = 15 * 60 * 1000; // 15 минут
        return Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
    }
);

export const selectProductsByCategory = createSelector(
    [selectCategoryState, selectNormalizedCategoryId],
    (categoryState, normalizedId) => {
        if (!normalizedId) return [];
        return categoryState.productsByCategory?.[normalizedId] || [];
    }
);

export const selectProductsByCategoryLoading = createSelector(
    [selectCategoryState, selectNormalizedCategoryId],
    (categoryState, normalizedId) => {
        if (!normalizedId) return false;
        return categoryState.productsLoadingByCategory?.[normalizedId] || false;
    }
);

export const selectProductsByCategoryError = createSelector(
    [selectCategoryState, selectNormalizedCategoryId],
    (categoryState, normalizedId) => {
        if (!normalizedId) return null;
        return categoryState.productsErrorByCategory?.[normalizedId] || null;
    }
);

export const selectProductsByCategoryLoadingMore = createSelector(
    [selectCategoryState, selectNormalizedCategoryId],
    (categoryState, normalizedId) => {
        if (!normalizedId) return false;
        return categoryState.productsLoadingMoreByCategory?.[normalizedId] || false;
    }
);

export const selectProductsByCategoryPagination = createSelector(
    [selectCategoryState, selectNormalizedCategoryId],
    (categoryState, normalizedId) => {
        if (!normalizedId) {
            return { currentPage: 1, totalPages: 1, totalItems: 0, hasMore: false };
        }
        return categoryState.productsPaginationByCategory?.[normalizedId] || {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            hasMore: false,
        };
    }
);

export const selectProductsByCategoryHasMore = createSelector(
    [selectProductsByCategoryPagination],
    (pagination) => pagination.hasMore || false
);

export const selectProductsByCategoryCurrentPage = createSelector(
    [selectProductsByCategoryPagination],
    (pagination) => pagination.currentPage || 1
);

// Селектор для получения категории по ID
export const selectCategoryById = createSelector(
    [selectCategories, selectNormalizedCategoryId],
    (categories, normalizedId) => {
        if (!normalizedId || !Array.isArray(categories)) return null;
        return categories.find((category) => normalizeCategoryId(category.id) === normalizedId) || null;
    }
);

// Селектор для проверки наличия продуктов в категории
export const selectHasProductsInCategory = createSelector(
    [selectProductsByCategory],
    (products) => Array.isArray(products) && products.length > 0
);
