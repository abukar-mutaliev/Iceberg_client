import React from 'react';
import Svg, { Path } from 'react-native-svg';

const MinusIcon = ({ width = 15, height = 15, color = "#000" }) => {
    return (
        <Svg width={width} height={height} viewBox="0 0 15 15" fill="none">
            <Path
                d="M13.5 7.5L1.5 7.5"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
            />
        </Svg>
    );
};

export default MinusIcon;