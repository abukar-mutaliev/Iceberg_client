import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { Color } from '@/app/styles/GlobalStyles';

/**
 * Компонент для создания выраженных теней на Android.
 * На iOS использует стандартные shadowProps, на Android создает выраженную тень.
 *
 * @param {Object} props - Пропсы компонента
 * @param {Object} props.style - Основной стиль контейнера
 * @param {React.ReactNode} props.children - Дочерние элементы
 * @param {string} props.shadowColor - Цвет тени (rgba)
 * @param {Object} props.shadowConfig - Конфигурация тени
 * @param {number} props.borderRadius - Радиус скругления углов
 * @param {Object} props.iosProps - Дополнительные свойства для iOS
 */
export const AndroidShadow = ({
                                  style,
                                  children,
                                  shadowColor = "rgba(51, 57, 176, 0.05)",
                                  shadowConfig = {
                                      offsetX: 0,
                                      offsetY: 0,
                                      elevation: 14,
                                      radius: 4,
                                      opacity: 0.2
                                  },
                                  borderRadius = 10,
                                  iosProps = {}
                              }) => {
    // Извлекаем borderRadius из стиля, если он есть
    let finalBorderRadius = borderRadius;
    if (style && typeof style === 'object') {
        if (Array.isArray(style)) {
            // Если style - массив, ищем borderRadius в последнем объекте (приоритет)
            for (let i = style.length - 1; i >= 0; i--) {
                if (style[i] && style[i].borderRadius !== undefined) {
                    finalBorderRadius = style[i].borderRadius;
                    break;
                }
            }
        } else if (style.borderRadius !== undefined) {
            finalBorderRadius = style.borderRadius;
        }
    }

    if (Platform.OS === 'android') {
        return (
            <View style={[styles.container, style]}>
                {/* Основная тень */}
                <View style={[
                    styles.shadow,
                    {
                        backgroundColor: shadowColor,
                        top: shadowConfig.offsetY,
                        bottom: -shadowConfig.offsetY,
                        left: -shadowConfig.offsetX,
                        right: shadowConfig.offsetX,
                        opacity: shadowConfig.opacity,
                        elevation: shadowConfig.elevation,
                        borderRadius: finalBorderRadius
                    }
                ]} />

                {/* Контент */}
                <View style={[
                    styles.content,
                    { borderRadius: finalBorderRadius }
                ]}>
                    {children}
                </View>
            </View>
        );
    }

    // На iOS используем нативную тень
    return (
        <View style={[
            style,
            {
                shadowColor: shadowColor,
                shadowOffset: {
                    width: shadowConfig.offsetX,
                    height: shadowConfig.offsetY
                },
                shadowRadius: shadowConfig.radius,
                shadowOpacity: shadowConfig.opacity,
                borderRadius: finalBorderRadius,
                ...iosProps
            }
        ]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        width: '100%',
        height: '100%',
    },
    shadow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    content: {
        backgroundColor: Color.colorLightMode,
        position: 'relative',
        zIndex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    }
});