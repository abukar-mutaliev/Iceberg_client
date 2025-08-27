import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import Text from '@shared/ui/Text/Text';
import IconProducts from "@shared/ui/Icon/Profile/IconProducts";

/**
 * Компонент для отображения пустого списка с пояснительным текстом и иконкой
 *
 * @param {Object} props - Свойства компонента
 * @param {string} props.title - Заголовок для пустого списка
 * @param {string} props.description - Описание/пояснение для пустого списка
 * @param {string} props.icon - Название иконки из Ionicons
 * @param {string} props.buttonText - Текст кнопки действия (если нужна)
 * @param {Function} props.onButtonPress - Обработчик нажатия на кнопку
 * @param {Object} props.style - Дополнительные стили для контейнера
 */
export const EmptyList = ({
                              title,
                              description,
                              icon = 'alert-circle-outline',
                              buttonText,
                              onButtonPress,
                              style
                          }) => {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, style]}>
            <IconProducts
                name={icon}
                size={80}
                color={colors.textSecondary}
                style={styles.icon}
            />

            <Text style={[styles.title, { color: colors.text }]}>
                {title}
            </Text>

            {description ? (
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {description}
                </Text>
            ) : null}

            {buttonText && onButtonPress ? (
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={onButtonPress}
                >
                    <Text style={[styles.buttonText, { color: colors.white }]}>
                        {buttonText}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        minHeight: 300,
    },
    icon: {
        marginBottom: 16,
        opacity: 0.7,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});