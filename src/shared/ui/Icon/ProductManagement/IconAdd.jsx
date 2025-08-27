import React from 'react';
import Svg, { Path } from 'react-native-svg';

export const IconAdd = ({ width = 24, height = 24, color = '#3366FF' }) => (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
        <Path
            d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
            fill={color}
        />
    </Svg>
);