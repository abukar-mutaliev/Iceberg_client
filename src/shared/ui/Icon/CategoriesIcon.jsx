import React from 'react';
import Svg, { Rect } from 'react-native-svg';

export const CategoriesIcon = ({ color = '#3949ab', size = 28 }) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="2" fill="none" />
            <Rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="2" fill="none" />
            <Rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="2" fill="none" />
            <Rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="2" fill="none" />
        </Svg>
    );
};