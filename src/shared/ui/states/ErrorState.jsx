import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ThemedStatusBar } from '@shared/ui/ThemedStatusBar/ThemedStatusBar';

/**
 * Компонент для отображения состояния ошибки
 *
 * @param {Object} props - Свойства компонента
 * @param {string} props.message - Текст сообщения об ошибке
 * @param {Function} props.onRetry - Функция, вызываемая при нажатии на кнопку повтора
 * @param {string} [props.buttonText="Повторить"] - Текст основной кнопки
 * @param {Function} [props.onSecondary] - Функция для второй кнопки
 * @param {string} [props.secondaryButtonText] - Текст второй кнопки
 * @returns {JSX.Element}
 */
export const ErrorState = ({
    message,
    onRetry,
    buttonText = "Повторить",
    onSecondary,
    secondaryButtonText,
    icon,
    title
}) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    return (
        <View style={styles.errorContainer}>
            <ThemedStatusBar />
            <View style={styles.card}>
                {!!icon && <View style={styles.iconContainer}>{icon}</View>}
                {!!title && <Text style={styles.titleText}>{title}</Text>}
                <Text style={styles.errorText}>{message}</Text>
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={onRetry}
                    >
                        <Text style={styles.retryButtonText}>{buttonText}</Text>
                    </TouchableOpacity>
                    {!!onSecondary && !!secondaryButtonText && (
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={onSecondary}
                        >
                            <Text style={styles.secondaryButtonText}>{secondaryButtonText}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    errorContainer: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        padding: 20,
        borderRadius: 16,
        backgroundColor: colors.surface,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#1C1C1E',
                shadowOpacity: isDark ? 0.35 : 0.08,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
            },
            android: {
                elevation: 3,
            },
        }),
        ...(isDark && {
            borderWidth: 1,
            borderColor: colors.border,
        }),
    },
    iconContainer: {
        marginBottom: 12,
    },
    titleText: {
        color: colors.textPrimary,
        fontSize: FontSize.size_md || 16,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        marginBottom: 6,
        textAlign: 'center',
    },
    errorText: {
        color: colors.textSecondary,
        fontSize: FontSize.size_sm || 14,
        fontFamily: FontFamily.sFProText,
        marginBottom: 16,
        textAlign: 'center',
    },
    buttonsContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 10,
    },
    retryButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        width: '100%',
    },
    retryButtonText: {
        color: colors.textInverse,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        textAlign: 'center',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary,
        width: '100%',
    },
    secondaryButtonText: {
        color: colors.primary,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        textAlign: 'center',
    },
});