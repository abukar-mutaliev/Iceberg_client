import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { FeedbackAddModal } from '@features/feedback/FeedbackAddModal/ui/FeedbackAddModal';
import { createFeedback, fetchProductFeedbacks, selectFeedbacksByProductId } from '@entities/feedback';
import { fetchProductById, selectProductById, selectProductAverageRating } from '@entities/product';
import { FontFamily, Color } from '@app/styles/GlobalStyles';
import RatingStarSvg from "@shared/ui/Icon/SupplierScreenIcons/RatingStarSvg";
import { useAuth } from "@entities/auth/hooks/useAuth";

export const ProductRating = ({
                                  rating = 0,
                                  feedbackCount = 0,
                                  productId,
                                  canRate = true
                              }) => {
    const { colors } = useTheme();
    const dispatch = useDispatch();
    const { isAuthenticated } = useAuth();

    const [modalVisible, setModalVisible] = useState(false);

    const productFeedbacks = useSelector(state => selectFeedbacksByProductId(state, productId)) || [];
    const calculatedRating = useSelector(state => selectProductAverageRating(state, productId)) || 0;
    const product = useSelector(state => selectProductById(state, productId));

    const safeProduct = product || {};
    
    const effectiveRating = safeProduct.averageRating || calculatedRating || rating || 0;
    
    const effectiveFeedbackCount = safeProduct.feedbackCount ||
                                  (Array.isArray(productFeedbacks) ? productFeedbacks.length : 0) || 
                                  feedbackCount || 0;

    const formattedRating = (typeof effectiveRating === 'number' && !isNaN(effectiveRating))
                           ? parseFloat(effectiveRating).toFixed(1) 
                           : '0.0';

    const handleRateClick = () => {
        if (!isAuthenticated) {
            alert('Для оставления отзыва необходимо авторизоваться');
            return;
        }

        setModalVisible(true);
    };

    const handleSubmitFeedback = async (feedbackData) => {
        try {
            const resultAction = await dispatch(createFeedback({
                ...feedbackData,
                productId
            }));

            if (createFeedback.fulfilled.match(resultAction)) {
                await dispatch(fetchProductFeedbacks(productId));

                await dispatch(fetchProductById(productId));
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
        }

        setModalVisible(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.ratingContainer}>
                <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = star <= Math.floor(effectiveRating);
                        const isHalfFilled = !isFilled &&
                            star === Math.ceil(effectiveRating) &&
                            effectiveRating % 1 >= 0.25 &&
                            effectiveRating % 1 <= 0.75;

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
                    })}
                </View>

                <Text style={[styles.ratingText, { color: Color.colorBlue }]}>
                    {formattedRating}
                </Text>
            </View>

            <FeedbackAddModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSuccess={handleSubmitFeedback}
                productId={productId}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    starsContainer: {
        flexDirection: 'row',
        marginRight: 8,
    },
    ratingText: {
        fontFamily: FontFamily.sFProText,
        fontSize: 15,
        fontWeight: '500',
        marginRight: 4,
    },
    feedbackCount: {
        fontFamily: FontFamily.sFProText,
        fontSize: 12,
    },
    rateButton: {
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        alignSelf: 'flex-start',
    },
    rateButtonText: {
        fontFamily: FontFamily.sFProText,
        fontSize: 13,
        fontWeight: '500',
    },
});