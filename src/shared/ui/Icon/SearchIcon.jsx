import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

export const SearchIcon = ({ size = 18, color = '#3339B0', style }) => (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none" style={style}>
        <Circle cx="8.25" cy="8.25" r="5.25" stroke={color} strokeWidth="1.5" />
        <Path d="M15 15L12.75 12.75" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
);