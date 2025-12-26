import { createSelector } from '@reduxjs/toolkit';
import {selectFeedbackState} from "@entities/feedback/model/selectors";

// Константы для предотвращения создания новых ссылок
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

// Базовые селекторы
export const selectSuppliersList = (state) => {

    if (!state.suppliers) {
        return EMPTY_ARRAY;
    }

    if (!state.suppliers.list) {
        return EMPTY_ARRAY;
    }

    return state.suppliers.list;
};
export const selectSuppliersTotal = (state) => state.suppliers.total;
export const selectSuppliersPage = (state) => state.suppliers.page;
export const selectSuppliersPages = (state) => state.suppliers.pages;
export const selectCurrentSupplierId = (state) => state.suppliers.currentSupplierId;
export const selectSupplierDetails = (state) => state.suppliers.supplierDetails;


/**
 * Селектор для получения продуктов поставщика из Redux
 * С улучшенным логированием для отладки
 */
export const selectSupplierProducts = createSelector(
    [
        (state) => state.suppliers?.supplierProducts || {},
        (_, supplierId) => supplierId
    ],
    (supplierProducts, supplierId) => {
        // Проверяем тип supplierId и преобразуем его при необходимости
        const id = supplierId ? Number(supplierId) : null;

        // Если нет ID, возвращаем пустой массив
        if (id === null) {
            if (process.env.NODE_ENV === 'development') {
                console.log('selectSupplierProducts: нет ID');
            }
            return EMPTY_ARRAY;
        }

        // Получаем продукты по ID (проверяем существование ключа)
        const products = id in supplierProducts ? supplierProducts[id] : [];

        // Для отладочных целей в режиме разработки
        if (process.env.NODE_ENV === 'development') {
            console.log('selectSupplierProducts:', {
                supplierId: id,
                hasKey: id in supplierProducts,
                productsCount: Array.isArray(products) ? products.length : 0,
                allKeys: Object.keys(supplierProducts),
                isArray: Array.isArray(products)
            });
        }

        // Всегда возвращаем массив, даже если продукты не найдены
        return Array.isArray(products) ? products : EMPTY_ARRAY;
    }
);

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

export const selectSupplierRating = createSelector(
    [(state, supplierId) => state.suppliers?.ratings?.[supplierId]],
    (ratingData) => {
        if (!ratingData) {
            return { rating: 0, totalFeedbacks: 0 };
        }
        
        // Выполняем трансформацию данных вместо простого возврата
        return {
            rating: parseFloat(ratingData.rating || 0).toFixed(1),
            formattedRating: parseFloat(ratingData.rating || 0).toFixed(1),
            isPositive: (ratingData.rating || 0) >= 4.0,
            totalFeedbacks: ratingData.totalFeedbacks || 0
        };
    }
);

export const selectSupplierTotalFeedbacks = createSelector(
    [(state, supplierId) => state.suppliers?.ratings?.[supplierId]],
    (ratingData) => ratingData?.totalFeedbacks || 0
);

// Селектор для получения текущего поставщика
export const selectCurrentSupplier = createSelector(
    [selectSupplierDetails, selectCurrentSupplierId],
    (details, currentId) => currentId ? details[currentId] : null
);

// Селектор для получения продуктов поставщика по ID
// Использует исходное состояние напрямую, а не результат selectSupplierProducts
export const selectSupplierProductsBySupplierId = createSelector(
    [
        (state) => state.suppliers?.supplierProducts || {},
        (state, supplierId) => supplierId
    ],
    (supplierProducts, supplierId) => {
        // Нормализуем supplierId к числу
        const id = supplierId ? Number(supplierId) : null;

        // Если нет ID, возвращаем пустой массив
        if (id === null) {
            return EMPTY_ARRAY;
        }

        // Получаем продукты по нормализованному ID
        const products = id in supplierProducts ? supplierProducts[id] : null;
        
        if (process.env.NODE_ENV === 'development') {
            console.log('selectSupplierProductsBySupplierId - детали:', {
                supplierId: id,
                productsType: typeof products,
                isArray: Array.isArray(products),
                productsKeys: products && typeof products === 'object' && !Array.isArray(products) ? Object.keys(products).slice(0, 5) : [],
                productsLength: Array.isArray(products) ? products.length : 'не массив',
                firstProduct: Array.isArray(products) ? products[0]?.id : 'не массив',
                hasKey: id in supplierProducts
            });
        }
        
        // Если это не массив, возвращаем пустой массив
        if (!Array.isArray(products)) {
            return EMPTY_ARRAY;
        }
        
        return products.length > 0 ? products : EMPTY_ARRAY;
    }
);

// Селектор для получения продуктов текущего поставщика
export const selectCurrentSupplierProducts = createSelector(
    [selectSupplierProducts, selectCurrentSupplierId],
    (productsMap, currentId) => currentId ? productsMap[currentId] || EMPTY_ARRAY : EMPTY_ARRAY
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
        if (!Array.isArray(supplierProducts)) {
            return EMPTY_ARRAY;
        }
        
        const feedbacks = supplierProducts
            .filter((product) => product?.id)
            .flatMap((product) => {
                const productFeedbacks = allFeedbacks[product.id] || [];
                return Array.isArray(productFeedbacks) ? productFeedbacks.map((feedback) => ({
                    ...feedback,
                    productId: product.id,
                    productName: product.name,
                })) : [];
            });

        if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
            return EMPTY_ARRAY;
        }

        const sortedFeedbacks = feedbacks.sort((a, b) => {
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        return Array.isArray(sortedFeedbacks) ? sortedFeedbacks.slice(0, limit).map((feedback) => ({
            id: feedback.id,
            rating: feedback.rating,
            comment: feedback.comment,
            createdAt: feedback.createdAt,
            userName: feedback.client?.name || 'Клиент',
            productId: feedback.productId,
            productName: feedback.productName,
        })) : [];
    }
);

export const selectMemoizedSupplierProducts = createSelector(
    [selectSupplierProducts, (_, supplierId) => supplierId],
    (productsGetter, supplierId) => {
        const products = productsGetter || [];
        return products;
    }
);

/**
 * Оптимизированный селектор для получения всех отзывов поставщика
 * Убраны избыточные проверки для ускорения работы
 */
export const selectAllSupplierFeedbacks = createSelector(
    [
        (state) => state.feedback?.items || EMPTY_OBJECT,
        (state) => state.suppliers?.supplierProducts || EMPTY_OBJECT,
        (_, supplierId) => supplierId
    ],
    (feedbackItems, supplierProducts, supplierId) => {
        // Быстрый выход если нет ключевых данных
        if (!supplierId || !feedbackItems || !supplierProducts) {
            return EMPTY_ARRAY;
        }

        // Преобразуем ID к числу
        const numericSupplierId = Number(supplierId);

        // Получаем массив продуктов поставщика
        const products = supplierProducts[numericSupplierId];
        
        if (!Array.isArray(products) || products.length === 0) {
            return EMPTY_ARRAY;
        }

        // Результирующий массив отзывов
        const allFeedbacks = [];

        // Для каждого продукта собираем отзывы
        products.forEach(product => {
            if (!product || !product.id) return;
            
            // Получаем отзывы для продукта
            const productFeedbacks = feedbackItems[product.id];

            if (Array.isArray(productFeedbacks) && productFeedbacks.length > 0) {
                // Добавляем информацию о продукте к каждому отзыву
                productFeedbacks.forEach(feedback => {
                    // Убеждаемся, что имя клиента доступно
                    const clientName = feedback.client?.name || feedback.userName || 'Клиент';
                    
                    allFeedbacks.push({
                        ...feedback,
                        productId: product.id,
                        productName: product.name || 'Продукт',
                        // Явно добавляем имя клиента для надежности
                        userName: clientName,
                        clientName: clientName,
                        // Сохраняем структуру client для обратной совместимости
                        client: {
                            ...feedback.client,
                            name: clientName
                        }
                    });
                });
            }
        });

        // Быстрый выход если нет отзывов
        if (allFeedbacks.length === 0) {
            return EMPTY_ARRAY;
        }

        // Сортируем отзывы по рейтингу и дате
        allFeedbacks.sort((a, b) => {
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Ограничиваем количество отзывов для производительности
        return allFeedbacks.length > 50 ? allFeedbacks.slice(0, 50) : allFeedbacks;
    }
);