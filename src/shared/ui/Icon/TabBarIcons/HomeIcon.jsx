import React from 'react';
import Svg, { Path } from 'react-native-svg';

const HomeIcon = ({ width = 22, height = 20, color = "#000" }) => {
    return (
        <Svg width={width} height={height} viewBox="0 0 22 20" fill="none">
            <Path
                d="M1 8L10.4265 1.40142C10.7709 1.1604 11.2291 1.1604 11.5735 1.40142L21 8"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
            />
            <Path
                d="M4.33398 9.52637V18.0001C4.33398 18.5523 4.7817 19.0001 5.33398 19.0001H16.6673C17.2196 19.0001 17.6673 18.5523 17.6673 18.0001V9.52637"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
            />
        </Svg>
    );
};

export default HomeIcon;