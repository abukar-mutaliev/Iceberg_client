import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export const IconWarehouse = ({ width = 20, height = 20, color = '#000000', style }) => (
    <Svg width={width} height={height} viewBox="0 0 20 20" fill="none" style={style}>
        {/* Основа склада */}
        <Rect
            x="2"
            y="8"
            width="16"
            height="10"
            rx="1"
            stroke={color}
            strokeWidth="1.5"
            fill="none"
        />
        
        {/* Крыша */}
        <Path
            d="M1 8L10 2L19 8"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        
        {/* Дверь */}
        <Rect
            x="8"
            y="12"
            width="4"
            height="6"
            rx="0.5"
            stroke={color}
            strokeWidth="1"
            fill="none"
        />
        
        {/* Окна */}
        <Rect
            x="3"
            y="10"
            width="2"
            height="2"
            rx="0.5"
            stroke={color}
            strokeWidth="1"
            fill="none"
        />
        <Rect
            x="15"
            y="10"
            width="2"
            height="2"
            rx="0.5"
            stroke={color}
            strokeWidth="1"
            fill="none"
        />
    </Svg>
);

export default IconWarehouse;
