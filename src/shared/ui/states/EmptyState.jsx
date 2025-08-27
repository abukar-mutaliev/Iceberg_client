import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';

/**
 * Компонент для отображения пустого состояния
 *
 * @param {Object} props - Свойства компонента
 * @param {string} props.message - Текст сообщения
 * @returns {JSX.Element}
 */
export const EmptyState = ({ message = "Список пуст" }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.message}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: 'center'
    },
    message: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center'
    }
});