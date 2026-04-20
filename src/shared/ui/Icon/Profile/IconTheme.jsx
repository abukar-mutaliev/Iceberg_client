import React from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * Иконка "луна" для переключателя тёмной темы.
 * Визуально нейтральна в обоих режимах — подсвечивается цветом `color`.
 */
export const IconTheme = ({ width = 20, height = 20, color = '#000000', style }) => (
    <Svg width={width} height={height} viewBox="0 0 20 20" fill="none" style={style}>
        <Path
            d="M17.293 13.293A8 8 0 1 1 6.707 2.707a.5.5 0 0 1 .656.656A7 7 0 0 0 16.637 12.637a.5.5 0 0 1 .656.656z"
            fill={color}
        />
    </Svg>
);

export default IconTheme;
