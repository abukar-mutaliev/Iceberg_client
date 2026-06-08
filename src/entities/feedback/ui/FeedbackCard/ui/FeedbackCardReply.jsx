import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { FontFamily } from '@app/styles/GlobalStyles';

/**
 * Упрощенный компонент ответа на отзыв
 */
export const FeedbackCardReply = ({
                                      reply,
                                      isTruncated,
                                      isExpanded,
                                      onToggleExpand
                                  }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    if (!reply) return null;

    // Максимальное количество строк в свёрнутом состоянии
    const MAX_LINES = 2;

    // Проверка, нужно ли отображать кнопку "еще"
    const shouldShowButton = reply && reply.length > 80;

    return (
        <View style={styles.container}>
            <View style={styles.background} />

            <View style={styles.textContainer}>
                <Text
                    style={styles.replyText}
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

const createStyles = (colors, isDark) => StyleSheet.create({
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
        backgroundColor: isDark ? colors.surfaceElevated || '#2A2F55' : '#F5F5F5',
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    textContainer: {
        padding: 12,
        paddingRight: 25,
    },
    replyText: {
        fontSize: 13,
        fontFamily: FontFamily.sFProText,
        lineHeight: 18,
        color: colors.textPrimary,
    },
    showMoreButton: {
        position: 'absolute',
        bottom: 5,
        right: 10,
    },
    showMoreText: {
        fontSize: 13,
        fontFamily: FontFamily.sFProText,
        color: isDark ? '#A0A8FF' : '#6B4EFF',
    }
});
