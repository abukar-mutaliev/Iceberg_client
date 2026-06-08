import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { FontFamily } from '@app/styles/GlobalStyles';

/**
 * Упрощенный компонент содержимого отзыва
 */
export const FeedbackCardContent = ({
                                        comment,
                                        isTruncated,
                                        isExpanded,
                                        onToggleExpand
                                    }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    // Максимальное количество строк в свёрнутом состоянии
    const MAX_LINES = 3;

    // Проверка, нужно ли отображать кнопку "еще"
    const shouldShowButton = comment && comment.length > 150;

    return (
        <View style={styles.container}>
            <Text
                style={styles.commentText}
                numberOfLines={isExpanded ? undefined : MAX_LINES}
            >
                {comment}
            </Text>

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

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        marginTop: 8,
        position: 'relative',
    },
    commentText: {
        fontSize: 13,
        fontFamily: FontFamily.sFProText,
        lineHeight: 18,
        color: colors.textPrimary,
    },
    showMoreButton: {
        alignItems: 'flex-end',
        paddingTop: 4,
    },
    showMoreText: {
        fontSize: 13,
        fontFamily: FontFamily.sFProText,
        color: isDark ? '#A0A8FF' : '#6B4EFF',
    }
});
