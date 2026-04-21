import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { Color } from '@app/styles/GlobalStyles';

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
    // Извлекаем borderRadius / backgroundColor / border из стиля, если они заданы снаружи
    // На Android это нужно, чтобы темизированный фон/рамка корректно применялись к внутреннему content-слою,
    // иначе его захардкоженный белый фон перекрывает тему.
    let finalBorderRadius = borderRadius;
    let overriddenBackgroundColor;
    let overriddenBorderWidth;
    let overriddenBorderColor;

    const extractFromStyleObject = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj.borderRadius !== undefined) finalBorderRadius = obj.borderRadius;
        if (obj.backgroundColor !== undefined) overriddenBackgroundColor = obj.backgroundColor;
        if (obj.borderWidth !== undefined) overriddenBorderWidth = obj.borderWidth;
        if (obj.borderColor !== undefined) overriddenBorderColor = obj.borderColor;
    };

    if (style) {
        if (Array.isArray(style)) {
            style.forEach(extractFromStyleObject);
        } else {
            extractFromStyleObject(style);
        }
    }

    if (Platform.OS === 'android') {
        const contentOverrides = { borderRadius: finalBorderRadius };
        if (overriddenBackgroundColor !== undefined) {
            contentOverrides.backgroundColor = overriddenBackgroundColor;
        }
        if (overriddenBorderWidth !== undefined) {
            contentOverrides.borderWidth = overriddenBorderWidth;
        }
        if (overriddenBorderColor !== undefined) {
            contentOverrides.borderColor = overriddenBorderColor;
        }

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
                <View style={[styles.content, contentOverrides]}>
                    {children}
                </View>
            </View>
        );
    }

    // На iOS используем нативную тень
    // На iOS shadowColor должен быть без альфа-канала, прозрачность контролируется через shadowOpacity
    let iosShadowColor = shadowColor;
    if (shadowColor.includes('rgba')) {
        // Извлекаем цвет из rgba, убирая альфа-канал
        const rgbaMatch = shadowColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbaMatch) {
            iosShadowColor = `rgb(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]})`;
        } else {
            // Если не удалось распарсить, используем черный цвет по умолчанию
            iosShadowColor = '#000';
        }
    }
    
    return (
        <View style={[
            style,
            {
                shadowColor: iosShadowColor,
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