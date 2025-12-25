import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';

/**
 * Компонент для отображения состояния ошибки
 *
 * @param {Object} props - Свойства компонента
 * @param {string} props.message - Текст сообщения об ошибке
 * @param {Function} props.onRetry - Функция, вызываемая при нажатии на кнопку повтора
 * @param {string} [props.buttonText="Повторить"] - Текст кнопки
 * @returns {JSX.Element}
 */
export const ErrorState = ({ message, onRetry, buttonText = "Повторить" }) => {
    return (
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{message}</Text>
            <TouchableOpacity
                style={styles.retryButton}
                onPress={onRetry}
            >
                <Text style={styles.retryButtonText}>{buttonText}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    errorContainer: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: '#ffeeee'
    },
    errorText: {
        color: Color.blue2,
        fontSize: 14,
        marginBottom: 10,
        textAlign: 'center'
    },
    retryButton: {
        backgroundColor: Color.blue2,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 4
    },
    retryButtonText: {
        color: 'white',
        fontWeight: '500'
    }
});