import { createSelector } from '@reduxjs/toolkit';

// Базовый селектор с мемоизацией для базовой структуры состояния
export const selectFeedbackState = createSelector(
    [(state) => state.feedback || { items: {}, loading: false, error: null, loadedProductIds: [] }],
    (feedbackState) => {
        // Трансформируем состояние для обеспечения стабильности селектора
        return {
            ...feedbackState,
            items: feedbackState.items || {},
            loading: Boolean(feedbackState.loading),
            error: feedbackState.error || null,
            loadedProductIds: Array.isArray(feedbackState.loadedProductIds) ? feedbackState.loadedProductIds : []
        };
    }
);

// Базовый селектор для получения отзывов текущего продукта
export const selectCurrentProductId = (state, productId) => {
    // Нормализуем productId для стабильности селектора
    if (!productId) return null;
    const numericId = typeof productId === 'string' ? parseInt(productId, 10) : productId;
    return isNaN(numericId) ? null : numericId;
};

// Селектор для получения отзывов конкретного продукта
export const selectFeedbacksByProductId = createSelector(
    [selectFeedbackState, selectCurrentProductId],
    (feedbackState, productId) => {
        // Проверяем наличие элементов для продукта
        if (!feedbackState || !feedbackState.items || !productId) {
            return [];
        }
        
        const feedbacks = feedbackState.items[productId];
        
        // Проверяем, является ли feedbacks массивом
        if (!Array.isArray(feedbacks)) {
            return [];
        }
        
        // Теперь безопасно вызываем map на массиве
        return feedbacks.map(feedback => {
            if (!feedback) return null;
            
            return {
                ...feedback,
                // Убедимся, что id и rating всегда правильного типа
                id: typeof feedback.id === 'string' ? parseInt(feedback.id, 10) : feedback.id,
                rating: parseFloat(feedback?.rating || 0),
                // Добавим вычисляемое поле (например, дату в формате для отображения)
                formattedDate: feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString() : ''
            };
        }).filter(feedback => feedback !== null); // Фильтруем null значения
    }
);

// Стабильные input селекторы
const selectFeedbackItems = createSelector(
    [selectFeedbackState],
    (feedbackState) => feedbackState.items || {}
);

// Общий селектор для всех отзывов (для обратной совместимости)
export const selectFeedbacks = createSelector(
    [selectFeedbackItems, selectCurrentProductId],
    (feedbackItems, productId) => {
        if (productId) {
            const productFeedbacks = feedbackItems[productId];
            if (!Array.isArray(productFeedbacks)) return [];
            
            // Возвращаем без трансформации, если данные уже корректны
            return productFeedbacks;
        }

        // Если productId не передан, возвращаем все отзывы в виде массива
        const allFeedbacks = Object.values(feedbackItems).flat();
        return Array.isArray(allFeedbacks) ? allFeedbacks : [];
    }
);

export const selectFeedbackLoading = createSelector(
    [selectFeedbackState],
    (feedbackState) => feedbackState.loading
);

export const selectFeedbackError = createSelector(
    [selectFeedbackState],
    (feedbackState) => feedbackState.error
);

export const selectPhotoUploading = createSelector(
    [selectFeedbackState],
    (feedbackState) => feedbackState.photoUploading
);

export const selectPhotoError = createSelector(
    [selectFeedbackState],
    (feedbackState) => feedbackState.photoError
);

// Селектор для проверки, были ли загружены отзывы для продукта
export const selectIsFeedbacksLoaded = createSelector(
    [selectFeedbackState, selectCurrentProductId],
    (feedbackState, productId) => feedbackState.loadedProductIds.includes(productId)
);

// Безопасная версия селектора для использования с useSelector
export const selectIsFeedbacksLoadedSafe = (productId) => (state) => {
    if (!productId) return false;
    return selectIsFeedbacksLoaded(state, productId);
};

export const selectFeedbacksSortedByDate = createSelector(
    [selectFeedbacks],
    (feedbacks) => [...feedbacks].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    )
);

export const selectFeedbacksCount = createSelector(
    [selectFeedbacks],
    (feedbacks) => feedbacks.length
);

export const selectAverageRating = createSelector(
    [selectFeedbacks],
    (feedbacks) => {
        if (feedbacks.length === 0) return 0;

        const sum = feedbacks.reduce((acc, feedback) => acc + feedback.rating, 0);
        return (sum / feedbacks.length).toFixed(1);
    }
);

export const selectTotalPhotosCount = createSelector(
    [selectFeedbacks],
    (feedbacks) => feedbacks.reduce((count, feedback) =>
        count + (feedback.photoUrls ? feedback.photoUrls.length : 0), 0)
);

export const selectFeedbacksWithPhotos = createSelector(
    [selectFeedbacks],
    (feedbacks) => feedbacks.filter(feedback =>
        feedback.photoUrls && feedback.photoUrls.length > 0)
);

export const selectFeedbackById = (feedbackId) => createSelector(
    [selectFeedbacks],
    (feedbacks) => feedbacks.find(feedback => feedback.id === parseInt(feedbackId))
);

export const selectFeedbackPhotos = (feedbackId) => createSelector(
    [selectFeedbackById(feedbackId)],
    (feedback) => feedback ? (feedback.photoUrls || []) : []
);

export const selectRatingDistribution = createSelector(
    [selectFeedbacks],
    (feedbacks) => {
        const distribution = {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0
        };

        feedbacks.forEach(feedback => {
            const rating = feedback.rating;
            if (rating >= 1 && rating <= 5) {
                distribution[rating] += 1;
            }
        });

        return distribution;
    }
);

export const selectHasUserLeftFeedback = (clientId) => createSelector(
    [selectFeedbacks],
    (feedbacks) => feedbacks.some(feedback => feedback.clientId === clientId)
);

// Безопасная версия селектора для использования с useSelector
export const selectHasUserLeftFeedbackSafe = (clientId) => (state) => {
    if (!clientId) return false;
    return selectHasUserLeftFeedback(clientId)(state);
};

// Селектор для проверки времени кеширования отзывов
export const selectFeedbackCacheTimestamp = createSelector(
    [selectFeedbackState, selectCurrentProductId],
    (feedbackState, productId) => feedbackState.cacheTimestamps[productId] || 0
);

// Селектор для проверки, действителен ли кеш
export const selectIsFeedbackCacheValid = createSelector(
    [selectFeedbackCacheTimestamp],
    (timestamp) => {
        const CACHE_DURATION = 5 * 60 * 1000; // 5 минут
        return timestamp > 0 && (Date.now() - timestamp < CACHE_DURATION);
    }
);


export const selectRecentFeedbacks = createSelector(
    [selectFeedbacks],
    (feedbacks) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return feedbacks.filter(feedback =>
            new Date(feedback.createdAt) >= thirtyDaysAgo)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
);

// Селектор для получения отзывов, сгруппированных по рейтингу
export const selectFeedbacksByRating = createSelector(
    [selectFeedbacks],
    (feedbacks) => {
        const result = {
            positive: [], // 4-5 звезд
            neutral: [],  // 3 звезды
            negative: []  // 1-2 звезды
        };

        feedbacks.forEach(feedback => {
            const rating = Math.round(feedback.rating || 0);

            if (rating >= 4) {
                result.positive.push(feedback);
            } else if (rating === 3) {
                result.neutral.push(feedback);
            } else if (rating >= 1) {
                result.negative.push(feedback);
            }
        });

        return result;
    }
);