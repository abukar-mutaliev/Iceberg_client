import React from 'react';
import Svg, { Path } from 'react-native-svg';

export const IconDistrict = ({ width = 24, height = 24, color = '#000', style }) => {
    return (
        <Svg
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={style}
        >
            <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <Path d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        </Svg>
    );
};

export default IconDistrict;