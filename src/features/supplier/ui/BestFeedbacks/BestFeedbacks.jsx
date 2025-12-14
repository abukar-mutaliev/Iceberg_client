import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { FeedbackCard } from "@entities/feedback/ui/FeedbackCard";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Оптимизированный компонент для отображения лучших отзывов поставщика
 * - Показывает только отзывы с рейтингом 4 и 5 звезд
 * - Использует мемоизацию для предотвращения лишних рендеров
 * - Оптимизированы проверки наличия отзывов
 * - Добавлена защита от неожиданных типов данных
 */
export const BestFeedbacks = React.memo(({
                                             feedbacks = [],
                                             onProductPress = () => {}
                                         }) => {
    const { colors } = useTheme();

    // Мемоизируем валидные отзывы (фильтрация невалидных отзывов и отзывов с низким рейтингом)
    const validFeedbacks = useMemo(() => {
        if (!Array.isArray(feedbacks)) return [];

        return feedbacks.filter(feedback =>
            feedback &&
            typeof feedback === 'object' &&
            feedback.id !== undefined &&
            feedback.rating >= 4 // Показываем только отзывы с рейтингом 4 и 5
        );
    }, [feedbacks]);

    // Мемоизированный обработчик для отзыва
    // ВАЖНО: Хуки должны вызываться до любого условного возврата
    const handleExpandComment = React.useCallback((id, isExpanded) => {
        // Обработчик разворачивания комментария (если нужен)
    }, []);

    // Если нет отзывов, не отображаем компонент вообще
    // ВАЖНО: Условный возврат должен быть ПОСЛЕ всех хуков
    if (validFeedbacks.length === 0) return null;

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
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
});

// Добавляем displayName для удобства отладки
BestFeedbacks.displayName = 'BestFeedbacks';

const styles = StyleSheet.create({
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
        marginBottom: SCREEN_WIDTH * 0.007,
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