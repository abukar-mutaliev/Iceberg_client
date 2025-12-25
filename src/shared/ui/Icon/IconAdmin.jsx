import React from 'react';
import Svg, { Path, G, Rect } from 'react-native-svg';

export const IconAdmin = ({ width = 20, height = 16, color = '#000000', style }) => (
    <Svg width={width} height={height} viewBox="0 0 20 16" fill="none" style={style}>
        <G id="icon Admin">
            {/* Основа панели управления */}
            <Rect
                id="Panel"
                x="1"
                y="1"
                width="18"
                height="14"
                rx="2"
                ry="2"
                stroke={color}
                strokeWidth="1"
                fill="none"
            />

            {/* Заголовок панели */}
            <Rect
                id="Header"
                x="1"
                y="1"
                width="18"
                height="3"
                fill={color}
                stroke={color}
                strokeWidth="0.5"
            />

            {/* Переключатели/кнопки */}
            <Rect
                id="Button1"
                x="3"
                y="6.5"
                width="6"
                height="1.5"
                rx="0.75"
                ry="0.75"
                fill={color}
                stroke={color}
                strokeWidth="0.5"
            />

            <Rect
                id="Button2"
                x="3"
                y="10"
                width="6"
                height="1.5"
                rx="0.75"
                ry="0.75"
                fill={color}
                stroke={color}
                strokeWidth="0.5"
            />

            {/* Индикаторы/графики */}
            <Path
                id="Chart"
                d="M11 7V11.5H12.5V6H14V10H15.5V8H17V11.5"
                stroke={color}
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </G>
    </Svg>
);

export default IconAdmin;