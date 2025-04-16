import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

export const IconRight = ({ width = 10, height = 15, color = '#000000', style }) => (
    <Svg width={width} height={height} viewBox="0 0 10 15" fill="none" style={style}>
        <G id="icon Right">
            <Path
                id="Vector"
                d="M0.940676 15C1.19633 15 1.42127 14.9137 1.60528 14.767L9.70351 8.07825C9.89778 7.91427 10 7.71575 10 7.5C10 7.27559 9.89778 7.06846 9.70351 6.92175L1.60528 0.241638C1.43148 0.0863151 1.19633 0 0.940676 0C0.408999 0 0 0.345224 0 0.793997C0 1.00113 0.112469 1.2083 0.276025 1.35501L7.7096 7.5L0.276025 13.645C0.112469 13.7917 0 13.9902 0 14.206C0 14.6548 0.408999 15 0.940676 15Z"
                fill={color}
            />
        </G>
    </Svg>
);

export default IconRight;