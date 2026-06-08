import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { FeedbackCard } from "@entities/feedback/ui/FeedbackCard";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const hasFeedbackCommentText = (feedback) => {
    const comment = feedback?.comment;
    return typeof comment === 'string' && comment.trim().length > 0;
};

export const filterDisplayableSupplierFeedbacks = (feedbacks = []) => {
    if (!Array.isArray(feedbacks)) return [];

    return feedbacks.filter(feedback =>
        feedback &&
        typeof feedback === 'object' &&
        feedback.id !== undefined &&
        feedback.rating >= 4 &&
        hasFeedbackCommentText(feedback)
    );
};

/**
 * Оптимизированный компонент для отображения лучших отзывов поставщика
 * - Показывает только отзывы с рейтингом 4 и 5 звезд и с текстом
 * - Использует мемоизацию для предотвращения лишних рендеров
 * - Оптимизированы проверки наличия отзывов
 * - Добавлена защита от неожиданных типов данных
 */
export const BestFeedbacks = React.memo(({
                                             feedbacks = [],
                                             onProductPress = () => {}
                                         }) => {
    const styles = useMemo(() => createStyles(), []);

    const validFeedbacks = useMemo(
        () => filterDisplayableSupplierFeedbacks(feedbacks),
        [feedbacks]
    );

    // Если нет отзывов, не отображаем компонент вообще
    if (validFeedbacks.length === 0) return null;

    // Мемоизированный обработчик для отзыва
    const handleExpandComment = (id, isExpanded) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`Отзыв ${id} развернут: ${isExpanded}`);
        }
    };

    return (
        <View style={styles.container}>
            {validFeedbacks.map((feedback) => (
                <TouchableOpacity
                    key={feedback.id}
                    style={styles.feedbackWrapper}
                    onPress={() => feedback.productId && onProductPress(feedback.productId)}
                    activeOpacity={0.8}
                >
                    <FeedbackCard
                        feedback={feedback}
                        onExpandComment={handleExpandComment}
                        compact
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
});

// Добавляем displayName для удобства отладки
BestFeedbacks.displayName = 'BestFeedbacks';

const createStyles = () => StyleSheet.create({
    container: {
        marginTop: SCREEN_WIDTH * 0.023,
        marginBottom: SCREEN_WIDTH * 0.003,
        paddingHorizontal: SCREEN_WIDTH * 0.037,
    },
    sectionTitle: {
        fontSize: SCREEN_WIDTH * 0.047,
        fontWeight: '700',
        marginBottom: SCREEN_WIDTH * 0.023,
    },
    feedbackWrapper: {
        marginBottom: SCREEN_WIDTH * 0.037,
        borderRadius: 19,
        overflow: 'hidden',
    },
    productLinkContainer: {
        paddingHorizontal: SCREEN_WIDTH * 0.037,
        paddingBottom: SCREEN_WIDTH * 0.023,
        backgroundColor: 'rgba(255, 255, 255, 1)',
    },
    productLinkText: {
        fontSize: SCREEN_WIDTH * 0.035,
        fontWeight: '500',
    }
});