import React from 'react';
import Svg, { Path } from 'react-native-svg';

const IconCheck = ({ width = 18, height = 18, color = '#007AFF' }) => {
    return (
        <Svg width={width} height={height} viewBox="0 0 18 18" fill="none">
            <Path
                d="M15 4.5L6.75 12.75L3 9"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
};

export default IconCheck; 