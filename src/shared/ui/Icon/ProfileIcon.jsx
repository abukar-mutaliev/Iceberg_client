import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

export const ProfileIcon = ({ color = '#BEBEBE' }) => (
    <Svg width={17} height={18} viewBox="0 0 17 18" fill="none">
        <Circle cx="8.5" cy="5" r="4" stroke={color} strokeWidth="1.5" />
        <Path
            d="M16 17C16 13.134 12.642 10 8.5 10C4.358 10 1 13.134 1 17"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
        />
    </Svg>
);