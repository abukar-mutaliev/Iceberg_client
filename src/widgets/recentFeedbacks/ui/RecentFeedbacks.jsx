import React, { useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '@/app/providers/themeProvider/ThemeProvider';
import { FeedbackCard } from "@entities/feedback";


export const RecentFeedbacks = ({
                                    feedbacks,
                                    productId,
                                    isLoading = false,
                                    limit = 2
                                }) => {
    const { colors } = useTheme();

    const recentFeedbacks = useMemo(() => {
        if (isLoading || !feedbacks || !Array.isArray(feedbacks)) return [];

        let validFeedbacks = feedbacks.filter(feedback =>
            feedback && feedback.id &&
            (feedback.rating !== undefined && feedback.rating !== null)
        );

        let filteredFeedbacks = productId
            ? validFeedbacks.filter(feedback => feedback.productId === productId)
            : validFeedbacks;

        filteredFeedbacks = filteredFeedbacks.sort((a, b) => {
            // Сначала по дате (новые сверху)
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);

            if (dateB - dateA !== 0) {
                return dateB - dateA;
            }

            // Затем по рейтингу (убывание)
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }

            // Если рейтинги равны, сортируем по наличию фотографий
            const aHasPhotos = a.photoUrls && a.photoUrls.length > 0;
            const bHasPhotos = b.photoUrls && b.photoUrls.length > 0;

            if (aHasPhotos !== bHasPhotos) {
                return aHasPhotos ? -1 : 1;
            }

            // Наконец, по длине комментария (убывание)
            const aCommentLength = a.comment ? a.comment.length : 0;
            const bCommentLength = b.comment ? b.comment.length : 0;
            return bCommentLength - aCommentLength;
        });

        return filteredFeedbacks.slice(0, limit);
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

    if (recentFeedbacks.length === 0) {
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