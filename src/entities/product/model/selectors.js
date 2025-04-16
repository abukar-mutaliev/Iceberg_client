import { createSelector } from "@reduxjs/toolkit";

export const selectProducts = (state) => state.products?.items || [];
export const selectCurrentProduct = (state) => state.products?.currentProduct || null;
export const selectProductsLoading = (state) => state.products?.loading || false;
export const selectProductsError = (state) => state.products?.error || null;

export const selectProductById = createSelector(
    [selectProducts, (state, productId) => productId],
    (products, productId) => products.find(product => product.id === productId) || null
);

export const selectSimilarProducts = createSelector(
    [selectProducts, selectCurrentProduct, (state, productId) => productId],
    (products, currentProductInState, productId) => {
        const currentProduct = currentProductInState ||
            products.find(p => p.id === productId);

        if (!currentProduct || !Array.isArray(products) || products.length === 0) {
            return [];
        }

        return products
            .filter(product => {
                if (product.id === currentProduct.id) {
                    return false;
                }

                if (currentProduct.categories && Array.isArray(currentProduct.categories) &&
                    product.categories && Array.isArray(product.categories)) {
                    const hasCommonCategory = product.categories.some(cat =>
                        currentProduct.categories.includes(cat)
                    );
                    if (hasCommonCategory) return true;
                }

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
            let match = true;

            if (filterCriteria.name) {
                match = match && product.name.toLowerCase().includes(filterCriteria.name.toLowerCase());
            }

            if (filterCriteria.minPrice !== undefined) {
                match = match && product.price >= filterCriteria.minPrice;
            }

            if (filterCriteria.maxPrice !== undefined) {
                match = match && product.price <= filterCriteria.maxPrice;
            }

            if (filterCriteria.category) {
                match = match && (product.categories?.includes(filterCriteria.category));
            }

            return match;
        });
    }
);

export const selectProductFeedbacks = createSelector(
    [(state, productId) => state.feedback?.items?.[productId] || []],
    (feedbacks) => feedbacks
);

export const selectProductAverageRating = createSelector(
    [selectProductFeedbacks],
    (feedbacks) => {
        if (feedbacks.length === 0) return 0;

        const sum = feedbacks.reduce((total, feedback) => total + feedback.rating, 0);
        return sum / feedbacks.length;
    }
);