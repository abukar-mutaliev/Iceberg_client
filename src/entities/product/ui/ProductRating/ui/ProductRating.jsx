import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@/app/providers/themeProvider/ThemeProvider';
import { FeedbackAddModal } from '@features/feedback/FeedbackAddModal/ui/FeedbackAddModal';
import { createFeedback } from '@/entities/feedback';
import { FontFamily } from '@/app/styles/GlobalStyles';
import { selectUser } from "@entities/auth";
import RatingStarSvg from "@shared/ui/Icon/SupplierScreenIcons/RatingStarSvg";

export const ProductRating = ({ rating = 0, feedbackCount = 0, productId }) => {
    const { colors } = useTheme();
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectUser);

    const [modalVisible, setModalVisible] = useState(false);

    const formattedRating = rating ? parseFloat(rating).toFixed(1) : '0.0';

    const handleRateClick = () => {
        if (!isAuthenticated) {
            alert('Для оставления отзыва необходимо авторизоваться');
            return;
        }

        setModalVisible(true);
    };

    const handleSubmitFeedback = (feedbackData) => {
        dispatch(createFeedback({
            ...feedbackData,
            productId
        }));

        setModalVisible(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.ratingContainer}>
                <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => {
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
                    })}
                </View>

                <Text style={[styles.ratingText, { color: colors.text }]}>
                    {formattedRating}
                </Text>


            </View>

            <FeedbackAddModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSubmit={handleSubmitFeedback}
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
        fontSize: 14,
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