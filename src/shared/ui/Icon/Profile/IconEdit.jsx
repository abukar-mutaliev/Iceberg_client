import React from 'react';
import Svg, { Path } from 'react-native-svg';

export const IconEdit = ({ width = 27, height = 25, color = '#3339B0', style }) => (
    <Svg width={width} height={height} viewBox="0 0 27 25" fill="none" style={style}>
        <Path
            d="M1 24H23.9279M20.9757 4.21831L6.51082 18.8141L5.31032 21.1789L7.65859 19.9702L22.1564 5.40699L20.9757 4.21831ZM23.9279 1.24607L22.7472 2.43475L23.9279 3.62396L25.1085 2.43475C25.265 2.27709 25.3529 2.06331 25.3529 1.84041C25.3529 1.61751 25.265 1.40374 25.1085 1.24607C24.9519 1.08851 24.7396 1 24.5182 1C24.2968 1 24.0845 1.08851 23.9279 1.24607Z"
            stroke={color}
            strokeWidth="1.70168"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

export default IconEdit;