import React from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/app/providers/themeProvider/ThemeProvider';
import { FeedbackCard } from "@entities/feedback";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const BestFeedbacks = ({
                                  feedbacks = [],
                                  onProductPress = () => {}
                              }) => {
    const { colors } = useTheme();

    if (!feedbacks || feedbacks.length === 0) return null;

    return (
        <View style={styles.container}>
            {feedbacks.map((feedback) => (
                <TouchableOpacity
                    key={feedback.id}
                    style={styles.feedbackWrapper}
                    onPress={() => feedback.productId && onProductPress(feedback.productId)}
                    activeOpacity={0.8}
                >
                    <FeedbackCard
                        feedback={feedback}
                        onExpandComment={(id, isExpanded) => {
                            console.log(`Отзыв ${id} развернут: ${isExpanded}`);
                        }}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
};

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