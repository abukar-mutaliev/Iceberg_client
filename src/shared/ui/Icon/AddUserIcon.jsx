import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

export const AddUserIcon = ({ width = 54, height = 54, color = '#FFFFFF' }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    <G>
      {/* User icon - сдвигаем левее, не уменьшая */}
      <Path
        d="M9 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"
        fill={color}
      />
      {/* Plus icon - в правом верхнем углу, крупнее и правее */}
      <Path
        d="M21 4v4h4v3h-4v4h-3V11h-4V8h4V4h3z"
        fill={color}
      />
    </G>
  </Svg>
);

export default AddUserIcon;
