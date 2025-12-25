import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

export const IconLocation = ({ width = 16, height = 21, color = '#000000', style }) => (
    <Svg width={width} height={height} viewBox="0 0 16 21" fill="none" style={style}>
        <G id="icon Location">
            <Path
                id="Vector"
                d="M8 1C4.13 1 1 3.817 1 7.3C1 12.025 8 19 8 19C8 19 15 12.025 15 7.3C15 3.817 11.87 1 8 1ZM8 9.55C6.62 9.55 5.5 8.542 5.5 7.3C5.5 6.058 6.62 5.05 8 5.05C9.38 5.05 10.5 6.058 10.5 7.3C10.5 8.542 9.38 9.55 8 9.55Z"
                stroke={color}
                strokeWidth="1.5"
            />
        </G>
    </Svg>
);

export default IconLocation;