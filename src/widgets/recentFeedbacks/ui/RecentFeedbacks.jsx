import React, { useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { FeedbackCard } from "@entities/feedback/ui/FeedbackCard";

export const RecentFeedbacks = ({
                                    feedbacks = [],
                                    productId,
                                    isLoading = false,
                                    limit = 2
                                }) => {
    const { colors } = useTheme();

    const recentFeedbacks = useMemo(() => {
        if (isLoading || !Array.isArray(feedbacks)) return [];

        let validFeedbacks = feedbacks.filter(feedback =>
            feedback && feedback.id &&
            (feedback.rating !== undefined && feedback.rating !== null)
        );

        let filteredFeedbacks = productId
            ? validFeedbacks.filter(feedback => feedback.productId === productId)
            : validFeedbacks;

        // Сортируем по рейтингу и дате
        return filteredFeedbacks
            .sort((a, b) => {
                const aRating = typeof a.rating === 'number' ? a.rating : 0;
                const bRating = typeof b.rating === 'number' ? b.rating : 0;
                
                if (bRating !== aRating) {
                    return bRating - aRating;
                }
                
                const aDate = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const bDate = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return bDate - aDate;
            })
            .slice(0, limit);
    }, [feedbacks, productId, isLoading, limit]);

    if (isLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Загрузка отзывов...
                </Text>
            </View>
        );
    }

    if (!recentFeedbacks || recentFeedbacks.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>

            {/* Карточки отзывов */}
            {recentFeedbacks.map((feedback, index) => (
                <View
                    key={`feedback-${feedback.id || index}`}
                    style={index > 0 ? styles.cardContainer : styles.firstCardContainer}
                >
                    <FeedbackCard
                        feedback={feedback}
                    />
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
        paddingHorizontal: 16,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    headerText: {
        fontSize: 18,
        fontWeight: '600',
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '500',
    },
    firstCardContainer: {
        marginBottom: 8,
    },
    cardContainer: {
        marginTop: 8,
        marginBottom: 8,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
    }
});