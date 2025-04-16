import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/app/providers/themeProvider/ThemeProvider';
import { FontFamily } from '@/app/styles/GlobalStyles';

/**
 * Упрощенный компонент ответа на отзыв
 */
export const FeedbackCardReply = ({
                                      reply,
                                      isTruncated,
                                      isExpanded,
                                      onToggleExpand
                                  }) => {
    const { colors } = useTheme();

    if (!reply) return null;

    // Максимальное количество строк в свёрнутом состоянии
    const MAX_LINES = 2;

    // Проверка, нужно ли отображать кнопку "еще"
    const shouldShowButton = reply && reply.length > 80;

    // Цвет фона для ответа
    const backgroundColor = colors?.theme === 'light' ? '#F5F5F5' : '#333333';

    return (
        <View style={styles.container}>
            <View style={[styles.background, { backgroundColor }]} />

            <View style={styles.textContainer}>
                <Text
                    style={[styles.replyText, { color: colors?.text }]}
                    numberOfLines={isExpanded ? undefined : MAX_LINES}
                >
                    {reply}
                </Text>
            </View>

            {shouldShowButton && (
                <TouchableOpacity
                    onPress={onToggleExpand}
                    style={styles.showMoreButton}
                >
                    <Text style={styles.showMoreText}>
                        {isExpanded ? 'скрыть' : 'еще'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 5,
        position: 'relative',
        borderRadius: 10,
        overflow: 'hidden',
        minHeight: 40,
    },
    background: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    textContainer: {
        padding: 12,
        paddingRight: 25,
    },
    replyText: {
        fontSize: 13,
        fontFamily: FontFamily.sFProText,
        lineHeight: 18,
    },
    showMoreButton: {
        position: 'absolute',
        bottom: 5,
        right: 10,
    },
    showMoreText: {
        fontSize: 13,
        fontFamily: FontFamily.sFProText,
        color: '#6B4EFF',
    }
});