import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import RatingStarSvg from '@shared/ui/Icon/SupplierScreenIcons/RatingStarSvg';
import { FontFamily, Color } from '@app/styles/GlobalStyles';
import { selectSupplierRating, selectSupplierTotalFeedbacks } from '@entities/supplier/model/selectors';
import { fetchSupplierRating } from '@entities/supplier';
import {Colors} from "react-native/Libraries/NewAppScreen";

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

    const ratingData = useSelector(state => selectSupplierRating(state, supplierId)) || { rating: 0, formattedRating: '0.0' };
    const feedbackCount = useSelector(state => selectSupplierTotalFeedbacks(state, supplierId));


    React.useEffect(() => {
        if (autoLoadRating && supplierId && 
            (!ratingData || !ratingData.rating || 
             (typeof ratingData.rating === 'number' && ratingData.rating === 0))) {
            
            dispatch(fetchSupplierRating(supplierId));
        }
    }, [supplierId, ratingData, dispatch, autoLoadRating]);

    const rating = React.useMemo(() => {
        if (!ratingData) return 0;
        
        if (typeof ratingData.formattedRating === 'string') {
            return parseFloat(ratingData.formattedRating) || 0;
        }
        
        if (typeof ratingData.rating === 'number') {
            return parseFloat(ratingData.rating.toFixed(1));
        }
        
        return 0;
    }, [ratingData]);

    const stars = useMemo(() => {
        return [1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= Math.floor(rating);
            const isHalfFilled = !isFilled && star === Math.ceil(rating) && rating % 1 >= 0.25 && rating % 1 <= 0.75;
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