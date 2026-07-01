import { createSelector } from '@reduxjs/toolkit';
// Импортируем напрямую из файлов, чтобы избежать циклической зависимости
import { selectProducts, selectSearchResults } from '@entities/product/model/selectors';
import { applyFiltersToProducts } from "../lib/applyFiltersToProducts";
import { productMatchesSearchQuery } from '@shared/lib/searchText';

const EMPTY_ARRAY = [];

export const selectFilterCriteria = (state) => {
    return state.filter?.criteria;
};

export const selectIsFilterActive = (state) => {
    const criteria = state.filter?.criteria;

    if (!criteria) return false;

    return (
        (criteria.minPrice > 45) ||
        (criteria.maxPrice < 1800) ||
        (Array.isArray(criteria.categories) && criteria.categories.length > 0) ||
        (Array.isArray(criteria.brands) && criteria.brands.length > 0) ||
        (criteria.minRating !== 4.5) ||
        (Array.isArray(criteria.compositions) && criteria.compositions.length > 0) ||
        (Array.isArray(criteria.quantity) && criteria.quantity.length > 0) ||
        (Array.isArray(criteria.suppliers) && criteria.suppliers.length > 0)
    );
};

export const selectAppliedFilters = createSelector(
    [selectFilterCriteria],
    (criteria) => {
        if (!criteria) return [];

        const appliedFilters = [];

        if (criteria.minPrice > 45 || criteria.maxPrice < 1800) {
            appliedFilters.push({
                id: 'price',
                type: 'price',
                label: `Цена: ${criteria.minPrice}₽ - ${criteria.maxPrice}₽`
            });
        }

        if (criteria.categories && criteria.categories.length > 0) {
            criteria.categories.forEach(category => {
                appliedFilters.push({
                    id: `category-${category.id}`,
                    type: 'category',
                    label: `Категория: ${category.name}`,
                    data: category
                });
            });
        }

        if (criteria.brands && criteria.brands.length > 0) {
            criteria.brands.forEach(brand => {
                appliedFilters.push({
                    id: `brand-${brand.id}`,
                    type: 'brand',
                    label: `Бренд: ${brand.name}`,
                    data: brand
                });
            });
        }

        if (criteria.minRating !== 4.5) {
            appliedFilters.push({
                id: 'rating',
                type: 'rating',
                label: `Рейтинг от ${criteria.minRating}`
            });
        }

        if (criteria.suppliers && criteria.suppliers.length > 0) {
            criteria.suppliers.forEach(supplier => {
                appliedFilters.push({
                    id: `supplier-${supplier.id}`,
                    type: 'supplier',
                    label: `Поставщик: ${supplier.companyName || supplier.name}`,
                    data: supplier
                });
            });
        }

        if (criteria.quantity && criteria.quantity.length > 0) {
            criteria.quantity.forEach(q => {
                appliedFilters.push({
                    id: `quantity-${q.id || q.value}`,
                    type: 'quantity',
                    label: `Количество: ${q.value}`,
                    data: q
                });
            });
        }

        return appliedFilters;
    }
);

export const selectFilteredProductsBySearch = createSelector(
    [
        selectProducts,
        selectSearchResults,
        selectFilterCriteria,
        selectIsFilterActive,
        (state, searchQuery) => searchQuery || ''
    ],
    (products, searchResults, filterCriteria, isFilterActive, searchQuery) => {
        const trimmedQuery = searchQuery?.trim() || '';
        const sourceProducts = trimmedQuery
            ? (Array.isArray(searchResults) ? searchResults : EMPTY_ARRAY)
            : (Array.isArray(products) ? products : EMPTY_ARRAY);

        if (!sourceProducts.length) {
            return [];
        }

        let filteredProducts = [...sourceProducts];

        if (isFilterActive && filterCriteria) {
            filteredProducts = applyFiltersToProducts(filteredProducts, filterCriteria);
        }

        if (trimmedQuery) {
            filteredProducts = filteredProducts.filter((product) =>
                productMatchesSearchQuery(product, trimmedQuery)
            );
        }

        return filteredProducts;
    }
);