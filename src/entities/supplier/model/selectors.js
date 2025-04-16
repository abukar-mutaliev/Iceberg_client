import { createSelector } from '@reduxjs/toolkit';
import {selectFeedbackState} from "@entities/feedback/model/selectors";

// Базовые селекторы
export const selectSuppliersList = (state) => state.suppliers.list;
export const selectSuppliersTotal = (state) => state.suppliers.total;
export const selectSuppliersPage = (state) => state.suppliers.page;
export const selectSuppliersPages = (state) => state.suppliers.pages;
export const selectCurrentSupplierId = (state) => state.suppliers.currentSupplierId;
export const selectSupplierDetails = (state) => state.suppliers.supplierDetails;
export const selectSupplierProducts = (state, supplierId) => {
    const supplierProducts = state.suppliers.supplierProducts || {};
    return supplierProducts[supplierId] || [];
};
export const selectSuppliersLoading = (state) => state.suppliers.loading;
export const selectSuppliersError = (state) => state.suppliers.error;

export const selectSupplierById = createSelector(
    [selectSupplierDetails, (state, supplierId) => supplierId],
    (details, supplierId) => {
        const supplier = details[supplierId];
        if (!supplier) return null;

        if (supplier.supplier) {
            return supplier;
        } else if (supplier.user && supplier.user.supplier) {
            return {
                ...supplier.user,
                supplier: supplier.user.supplier
            };
        }

        return supplier;
    }
);

// Селектор для получения текущего поставщика
export const selectCurrentSupplier = createSelector(
    [selectSupplierDetails, selectCurrentSupplierId],
    (details, currentId) => currentId ? details[currentId] : null
);

// Селектор для получения продуктов поставщика по ID
export const selectSupplierProductsBySupplierId = createSelector(
    [selectSupplierProducts, (state, supplierId) => supplierId],
    (productsMap, supplierId) => productsMap[supplierId] || []
);

// Селектор для получения продуктов текущего поставщика
export const selectCurrentSupplierProducts = createSelector(
    [selectSupplierProducts, selectCurrentSupplierId],
    (productsMap, currentId) => currentId ? productsMap[currentId] || [] : []
);

// Вспомогательный селектор для объединения данных поставщика и его продуктов
export const selectSupplierWithProducts = createSelector(
    [
        selectSupplierById,
        selectSupplierProductsBySupplierId
    ],
    (supplier, products) => {
        if (!supplier) return null;

        return {
            ...supplier,
            products
        };
    }
);

// Селектор для проверки, является ли пользователь поставщиком
export const selectIsUserSupplier = createSelector(
    [(state) => state.user?.currentUser],
    (currentUser) => currentUser?.role === 'SUPPLIER'
);

// Селектор для получения ID поставщика для текущего пользователя (если он поставщик)
export const selectCurrentUserSupplierId = createSelector(
    [(state) => state.user?.currentUser, (state) => state.user?.usersMap?.suppliers],
    (currentUser, suppliersMap) => {
        if (currentUser?.role !== 'SUPPLIER') return null;

        const supplier = suppliersMap?.[currentUser.id];
        return supplier?.supplier?.id || currentUser.id;
    }
);

export const selectBestFeedbacks = createSelector(
    [
        selectSupplierProductsBySupplierId,
        (state) => state.feedback?.items || {},
        (state, supplierId, limit) => limit || 2
    ],
    (supplierProducts, allFeedbacks, limit) => {
        const feedbacks = supplierProducts
            .filter((product) => product?.id)
            .flatMap((product) => {
                const productFeedbacks = allFeedbacks[product.id] || [];
                return productFeedbacks.map((feedback) => ({
                    ...feedback,
                    productId: product.id,
                    productName: product.name,
                }));
            });

        const sortedFeedbacks = feedbacks.sort((a, b) => {
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        return sortedFeedbacks.slice(0, limit).map((feedback) => ({
            id: feedback.id,
            rating: feedback.rating,
            comment: feedback.comment,
            createdAt: feedback.createdAt,
            userName: feedback.client?.name || 'Клиент',
            productId: feedback.productId,
            productName: feedback.productName,
        }));
    }
);

export const selectSupplierRating = (state, supplierId) =>
    state.suppliers?.ratings[supplierId]?.rating || 0;

export const selectSupplierTotalFeedbacks = (state, supplierId) =>
    state.suppliers?.ratings[supplierId]?.totalFeedbacks || 0;


export const selectAllSupplierFeedbacks = createSelector(
    [
        selectSupplierProducts,
        selectFeedbackState,
        (state, supplierId) => supplierId
    ],
    (supplierProducts, feedbackState, supplierId) => {
        // Получаем все ID продуктов поставщика
        const productIds = supplierProducts
            .filter(product => product && product.supplierId === parseInt(supplierId))
            .map(product => product.id);

        // Собираем все отзывы по этим продуктам
        const allFeedbacks = [];

        productIds.forEach(productId => {
            const productFeedbacks = feedbackState.items[productId] || [];

            // Добавляем дополнительную информацию к каждому отзыву
            const enrichedFeedbacks = productFeedbacks.map(feedback => {
                // Найдем информацию о продукте
                const product = supplierProducts.find(p => p.id === productId);

                return {
                    ...feedback,
                    productId,
                    productName: product ? product.name : 'Продукт',
                };
            });

            allFeedbacks.push(...enrichedFeedbacks);
        });

        // Сортируем отзывы: сначала по рейтингу, затем по дате создания
        return allFeedbacks.sort((a, b) => {
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }
);