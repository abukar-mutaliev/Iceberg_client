import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';

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
    return (
        <View style={styles.errorContainer}>
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

const styles = StyleSheet.create({
    errorContainer: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F6F7FB'
    },
    card: {
        width: '100%',
        maxWidth: 420,
        padding: 20,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        shadowColor: '#1C1C1E',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3
    },
    iconContainer: {
        marginBottom: 12
    },
    titleText: {
        color: Color.dark,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
        textAlign: 'center'
    },
    errorText: {
        color: Color.textSecondary,
        fontSize: 14,
        marginBottom: 16,
        textAlign: 'center'
    },
    buttonsContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 10,
    },
    retryButton: {
        backgroundColor: Color.blue2,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        width: '100%'
    },
    retryButtonText: {
        color: 'white',
        fontWeight: '600',
        textAlign: 'center'
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Color.blue2,
        width: '100%'
    },
    secondaryButtonText: {
        color: Color.blue2,
        fontWeight: '600',
        textAlign: 'center'
    }
});