import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

const IconRight = ({ width = 8, height = 15, color = '#333', style }) => (
  <Svg width={width} height={height} viewBox="0 0 8 15" fill="none" style={style}>
    <Path
      d="M1 1.5L7 7.5L1 13.5"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default IconRight; 