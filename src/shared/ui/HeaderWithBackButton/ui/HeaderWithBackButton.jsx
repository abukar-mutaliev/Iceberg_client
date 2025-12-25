import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import Text from '@shared/ui/Text/Text';
import {BackButton} from "@shared/ui/Button/BackButton";
import { Color } from '@app/styles/GlobalStyles'

/**
 * Компонент заголовка с кнопкой "Назад" и дополнительными действиями
 *
 * @param {Object} props - Свойства компонента
 * @param {string} props.title - Заголовок
 * @param {boolean} props.showBackButton - Показывать ли кнопку "Назад" (по умолчанию true)
 * @param {Function} props.onBackPress - Обработчик нажатия на кнопку "Назад" (необязательно)
 * @param {React.ReactNode} props.rightContent - Контент для правой стороны заголовка
 * @param {Object} props.style - Дополнительные стили для контейнера
 * @param {Object} props.titleStyle - Дополнительные стили для заголовка
 */
export const HeaderWithBackButton = ({
                                         title,
                                         showBackButton = true,
                                         onBackPress,
                                         rightContent,
                                         style,
                                         titleStyle
                                     }) => {
    const { colors } = useTheme();
    const navigation = useNavigation();

    const handleBackPress = () => {
        if (onBackPress) {
            onBackPress();
        } else {
            navigation.goBack();
        }
    };

    return (
        <View style={[
            styles.container,
            { backgroundColor: "transparent" },
            style
        ]}>

            <View style={styles.leftContent}>
                {showBackButton && (
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBackPress}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <BackButton name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.titleContainer}>
                <Text
                    style={[styles.title, { color: Color.dark }, titleStyle]}
                    numberOfLines={1}
                >
                    {title}
                </Text>
            </View>

            <View style={styles.rightContent}>
                {rightContent}
            </View>
        </View>
    );
};

const HEADER_HEIGHT = 56;

const styles = StyleSheet.create({
    container: {
        height: HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        zIndex: 10,
    },
    leftContent: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButton: {
        padding: 4,
        marginRight: 10,
    },
    titleContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    rightContent: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
});