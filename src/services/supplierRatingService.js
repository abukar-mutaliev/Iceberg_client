
export const calculateSupplierRating = (products) => {
    if (!products || !Array.isArray(products) || products.length === 0) {
        return { rating: 0, totalFeedbacks: 0 };
    }


    let allRatingsSum = 0;
    let totalFeedbacksCount = 0;

    products.forEach(product => {
        if (process.env.NODE_ENV !== 'production') {
        }

        if (product.averageRating !== null &&
            product.averageRating !== undefined &&
            product.feedbackCount !== null &&
            product.feedbackCount !== undefined &&
            product.feedbackCount > 0) {

            const productRatingSum = product.averageRating * product.feedbackCount;
            allRatingsSum += productRatingSum;

            totalFeedbacksCount += product.feedbackCount;
        }
    });

    if (totalFeedbacksCount === 0) {
        return { rating: 0, totalFeedbacks: 0 };
    }

    const averageRating = allRatingsSum / totalFeedbacksCount;
    const finalRating = parseFloat(averageRating.toFixed(1));

    return {
        rating: finalRating,
        totalFeedbacks: totalFeedbacksCount
    };
};

