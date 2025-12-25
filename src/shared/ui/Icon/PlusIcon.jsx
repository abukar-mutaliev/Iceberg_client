import React from 'react';
import Svg, { Path } from 'react-native-svg';

export const PlusIcon = ({ size = 22, color = '#fff' }) => (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
        <Path
            d="M11 4.583V17.417M4.583 11H17.417"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);