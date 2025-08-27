import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import Text from '@shared/ui/Text/Text';
import {IconEdit} from "@shared/ui/Icon/Profile";

/**
 * Компонент для отображения сообщения об ошибке с кнопкой повторной попытки
 *
 * @param {Object} props - Свойства компонента
 * @param {string} props.message - Текст сообщения об ошибке
 * @param {Function} props.onRetry - Функция для повторной попытки
 * @param {string} props.retryText - Текст кнопки повторной попытки (по умолчанию "Повторить")
 * @param {Object} props.style - Дополнительные стили для контейнера
 */
export const ErrorMessage = ({
                                 message,
                                 onRetry,
                                 retryText = 'Повторить',
                                 style
                             }) => {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, style]}>
            <IconEdit
                name="error-outline"
                size={64}
                color={colors.error}
                style={styles.icon}
            />

            <Text style={[styles.message, { color: colors.text }]}>
                {message || 'Произошла ошибка. Пожалуйста, попробуйте снова.'}
            </Text>

            {onRetry && (
                <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: colors.primary }]}
                    onPress={onRetry}
                >
                    <Text style={[styles.retryText, { color: colors.white }]}>
                        {retryText}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    icon: {
        marginBottom: 16,
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    retryButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    retryText: {
        fontSize: 16,
        fontWeight: '600',
    },
});