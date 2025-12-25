import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import Text from '@shared/ui/Text/Text';
import IconProducts from "@shared/ui/Icon/Profile/IconProducts";
import {
    Color,
    FontSize,
    Padding,
    Border,
    FontFamily,
    CommonStyles,
    Shadow
} from "@/styles/GlobalStyles";

// Получаем размеры экрана для адаптивности
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Масштабирование в зависимости от размера экрана
const scale = SCREEN_WIDTH / 375; // 375 - базовая ширина дизайна
const scaleVertical = SCREEN_HEIGHT / 812; // 812 - базовая высота дизайна

// Функция для адаптивного масштабирования значений
const normalize = (size, based = 'width') => {
    const baseScale = based === 'height' ? scaleVertical : scale;
    const newSize = size * baseScale;
    return Math.round(newSize);
};

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
                              style,
                              titleStyle
                          }) => {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, style]}>
            <IconProducts
                name={icon}
                size={normalize(80)}
                color={colors.textSecondary}
                style={styles.icon}
            />

            <Text style={[styles.title, { color: colors.text }, titleStyle]}>
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
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>
                        {buttonText}
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...CommonStyles.centered,
        flex: 1,
        padding: Padding.large,
        minHeight: normalize(300, 'height'),
    },
    icon: {
        marginBottom: normalize(16),
        opacity: 0.7,
    },
    title: {
        fontFamily: FontFamily.medium,
        fontSize: normalize(FontSize.size_lg),
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: normalize(8),
    },
    description: {
        fontFamily: FontFamily.regular,
        fontSize: normalize(FontSize.size_sm),
        textAlign: 'center',
        marginBottom: normalize(24),
        paddingHorizontal: normalize(20),
        maxWidth: normalize(300),
    },
    button: {
        paddingVertical: Padding.small,
        paddingHorizontal: Padding.large,
        borderRadius: Border.radius.medium,
        marginTop: normalize(16),
        ...Shadow.button,
    },
    buttonText: {
        fontFamily: FontFamily.medium,
        fontSize: normalize(FontSize.size_md),
        fontWeight: '600',
        color: Color.colorLightMode,
    },
});