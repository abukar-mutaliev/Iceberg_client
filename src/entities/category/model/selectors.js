import { createSelector } from '@reduxjs/toolkit';

// Базовый селектор состояния категорий
const selectCategoryState = (state) => state.category || {};

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

// Мемоизированный селектор для продуктов по категориям
export const selectProductsByCategory = createSelector(
    [selectCategoryState, (state, categoryId) => categoryId],
    (categoryState, categoryId) => {
        if (!categoryId) return [];
        return categoryState.productsByCategory?.[categoryId] || [];
    }
);

export const selectProductsByCategoryLoading = createSelector(
    [selectCategoryState],
    (categoryState) => categoryState.productsLoading || false
);

export const selectProductsByCategoryError = createSelector(
    [selectCategoryState],
    (categoryState) => categoryState.productsError || null
);

// Селектор для получения категории по ID
export const selectCategoryById = createSelector(
    [selectCategories, (state, categoryId) => categoryId],
    (categories, categoryId) => {
        if (!categoryId || !Array.isArray(categories)) return null;
        return categories.find(category => category.id === categoryId) || null;
    }
);

// Селектор для проверки наличия продуктов в категории
export const selectHasProductsInCategory = createSelector(
    [selectProductsByCategory],
    (products) => {
        return Array.isArray(products) && products.length > 0;
    }
);