import React from 'react';
import Svg, { Path } from 'react-native-svg';

const CloseIcon = ({ width = 12, height = 12, color = "black" }) => {
    return (
        <Svg width={width} height={height} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <Path
                d="M11 11L6 6M1 1L6 6M6 6L1 11M6 6L11 1"
                stroke={color}
                strokeLinecap="round"
            />
        </Svg>
    );
};

export default CloseIcon;