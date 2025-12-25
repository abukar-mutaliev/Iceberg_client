import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

export const CartIcon = ({ color = '#BEBEBE' }) => (
    <Svg width={22} height={18} viewBox="0 0 22 18" fill="none">
        <Path
            d="M8 17C8.55228 17 9 16.5523 9 16C9 15.4477 8.55228 15 8 15C7.44772 15 7 15.4477 7 16C7 16.5523 7.44772 17 8 17Z"
            fill={color}
        />
        <Path
            d="M17 17C17.5523 17 18 16.5523 18 16C18 15.4477 17.5523 15 17 15C16.4477 15 16 15.4477 16 16C16 16.5523 16.4477 17 17 17Z"
            fill={color}
        />
        <Path
            d="M3.82 1H21L19 11H5L3.82 1ZM3.82 1L3 0H0"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);