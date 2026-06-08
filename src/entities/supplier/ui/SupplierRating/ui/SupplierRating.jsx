import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import RatingStarSvg from '@shared/ui/Icon/SupplierScreenIcons/RatingStarSvg';
import { FontFamily, Color } from '@app/styles/GlobalStyles';
import {
    selectSupplierRating,
    selectSupplierTotalFeedbacks,
    selectSupplierRatingFromFeedbacks,
} from '@entities/supplier/model/selectors';
// Импортируем напрямую из slice, чтобы избежать циклической зависимости
// через index.js entities.
import { fetchSupplierFeedbacks } from '@entities/feedback/model/slice';

export const SupplierRatingFromRedux = React.memo(({
                                                supplierId,
                                                showCount = true,
                                                starSize = 16,
                                                textColor,
                                                style,
                                                showText = true,
                                                textStyle,
                                                autoLoadRating = true
                                            }) => {
    const dispatch = useDispatch();

    // Рейтинг, рассчитанный из актуальных отзывов (state.feedback.items) — держим
    // его в синхроне с тем, что реально показывается на экране поставщика
    // и автоматически обновляется при create/update/delete отзывов.
    const ratingFromFeedbacks = useSelector((state) =>
        selectSupplierRatingFromFeedbacks(state, supplierId)
    );

    // Фолбэк — кэшированное значение с сервера (state.suppliers.ratings)
    const cachedRatingData = useSelector((state) =>
        selectSupplierRating(state, supplierId)
    ) || { rating: 0, formattedRating: '0.0' };
    const cachedFeedbackCount = useSelector((state) =>
        selectSupplierTotalFeedbacks(state, supplierId)
    );

    // Если из отзывов удалось посчитать — используем их. Иначе берём кэш.
    const hasLocalRating = ratingFromFeedbacks.hasData;

    React.useEffect(() => {
        // Если локально ещё не можем посчитать рейтинг (нет supplierProducts
        // или отзывов в state.feedback) — подтягиваем все отзывы поставщика.
        // fetchSupplierFeedbacks сам сохранит их в state.feedback.items и
        // обновит state.suppliers.ratings через setSupplierRating, так что
        // рейтинг появится в BrandCard сразу, без похода на экран поставщика.
        if (autoLoadRating && supplierId && !hasLocalRating) {
            dispatch(fetchSupplierFeedbacks(supplierId));
        }
    }, [supplierId, hasLocalRating, dispatch, autoLoadRating]);

    const rating = React.useMemo(() => {
        if (hasLocalRating) {
            return parseFloat(ratingFromFeedbacks.formattedRating) || 0;
        }

        if (typeof cachedRatingData.formattedRating === 'string') {
            return parseFloat(cachedRatingData.formattedRating) || 0;
        }

        if (typeof cachedRatingData.rating === 'number') {
            return parseFloat(cachedRatingData.rating.toFixed(1));
        }

        if (typeof cachedRatingData.rating === 'string') {
            return parseFloat(cachedRatingData.rating) || 0;
        }

        return 0;
    }, [hasLocalRating, ratingFromFeedbacks, cachedRatingData]);

    const feedbackCount = hasLocalRating
        ? ratingFromFeedbacks.totalFeedbacks
        : cachedFeedbackCount;

    const stars = useMemo(() => {
        // Логика заполнения:
        // 0.00 – 0.24 → пустая
        // 0.25 – 0.99 → половинка
        // Полная звезда только когда рейтинг реально достигает целого значения
        // (например 4.8 → 4 полные + 1 половина, 5.0 → 5 полных).
        const floor = Math.floor(rating);
        const fraction = rating - floor;

        return [1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= floor;
            const isHalfFilled = !isFilled && star === floor + 1 && fraction >= 0.25;

            return (
                <RatingStarSvg
                    key={star}
                    filled={isFilled}
                    halfFilled={isHalfFilled}
                    width={16}
                    height={16}
                    color="#5E00FF"
                />
            );
        });
    }, [rating, starSize]);

    return (
        <View style={[styles.container, style]}>
            <View style={styles.ratingContainer}>
                <View style={styles.starsContainer}>
                    {stars}
                </View>

                {showText && (
                    <Text style={[
                        styles.ratingText,
                        { color: textColor || Color.colorBlue },
                        textStyle
                    ]}>
                        {rating}
                    </Text>
                )}

                {showCount && feedbackCount > 0 && (
                    <Text style={[styles.feedbackCount, { color: Color.colorBlue }]}>
                        ({feedbackCount})
                    </Text>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginVertical: 4,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    starsContainer: {
        flexDirection: 'row',
        marginRight: 8,
    },
    ratingText: {
        fontFamily: FontFamily.sFProText,
        fontSize: 14,
        fontWeight: '500',
        marginRight: 3,
    },
    feedbackCount: {
        fontFamily: FontFamily.sFProText,
        fontSize: 12,
    },
});

export default SupplierRatingFromRedux;
