import React from 'react';
import { View, PixelRatio, Dimensions } from 'react-native';
import { Svg, Rect, Path } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 440;

const normalize = (size) => {
    const newSize = size * scale;
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Компонент Checkbox
 *
 * @param {Object} props - Свойства компонента
 * @param {boolean} props.selected - Выбран ли чекбокс
 * @param {function} props.onPress - Функция обработки нажатия (опционально)
 * @param {Object} props.style - Дополнительные стили (опционально)
 */
export const Checkbox = ({ selected, onPress, style }) => {
    const size = normalize(24);

    if (!selected) {
        return (
            <View
                style={[
                    {
                        width: size,
                        height: size,
                        borderWidth: 1,
                        borderColor: 'rgba(24, 71, 237, 1)',
                        borderRadius: normalize(6),
                        justifyContent: 'center',
                        alignItems: 'center',
                    },
                    style
                ]}
            />
        );
    }

    return (
        <View style={[{ width: size, height: size }, style]}>
            <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
                <Rect width="16" height="16" rx="4" fill="#1847ED"/>
                <Path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M13.6623 3.25073C14.0761 3.61648 14.1151 4.24844 13.7493 4.66226L6.67863 12.6623C6.48033 12.8866 6.19192 13.0103 5.89268 12.9993C5.59344 12.9884 5.31487 12.8439 5.13354 12.6056L2.20425 8.75594C1.86981 8.31643 1.95499 7.68902 2.3945 7.35458C2.83401 7.02015 3.46142 7.10532 3.79586 7.54484L5.98715 10.4246L12.2508 3.33776C12.6165 2.92395 13.2485 2.88498 13.6623 3.25073Z"
                    fill="white"
                />
            </Svg>
        </View>
    );
};

