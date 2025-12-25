export const calculateSupplierRating = (products) => {
    if (!products || !Array.isArray(products) || products.length === 0) {
        return { rating: 0, totalFeedbacks: 0 };
    }

    // Функция для извлечения отзывов из различных форматов продукта
    const extractFeedbacks = (product) => {
        if (!product) return [];

        // Проверяем различные форматы данных
        if (Array.isArray(product.feedbacks)) {
            return product.feedbacks;
        } else if (Array.isArray(product.reviews)) {
            return product.reviews;
        } else if (product.averageRating !== undefined && product.feedbackCount !== undefined) {
            // Если есть только средний рейтинг и количество отзывов
            return product.feedbackCount > 0
                ? [{ rating: product.averageRating }]
                : [];
        }
        return [];
    };

    let totalRatingSum = 0;
    let totalFeedbacksCount = 0;

    // Обрабатываем каждый продукт
    products.forEach(product => {
        const feedbacks = extractFeedbacks(product);

        // Если у товара есть отзывы с рейтингом
        if (feedbacks.length > 0) {
            // Рассчитываем сумму рейтингов для этого товара
            const productRatingSum = feedbacks.reduce((sum, fb) => {
                const rating = parseFloat(fb.rating || 0);
                return isNaN(rating) ? sum : sum + rating;
            }, 0);

            totalRatingSum += productRatingSum;
            totalFeedbacksCount += feedbacks.length;
        }
    });

    // Рассчитываем средний рейтинг
    const averageRating = totalFeedbacksCount > 0 ? totalRatingSum / totalFeedbacksCount : 0;

    // Округляем до одного десятичного знака
    const rating = parseFloat(averageRating.toFixed(1));

    return {
        rating,
        totalFeedbacks: totalFeedbacksCount
    };
};