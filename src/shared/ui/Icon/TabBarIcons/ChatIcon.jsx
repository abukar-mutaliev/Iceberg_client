import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

const ChatIcon = ({ color = '#BEBEBE', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 18l-.001-9A3 3 0 017 6h10a3 3 0 013 3v5a3 3 0 01-3 3H8l-4 3v-3z" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="9" cy="11.5" r="1" fill={color} />
    <Circle cx="12" cy="11.5" r="1" fill={color} />
    <Circle cx="15" cy="11.5" r="1" fill={color} />
  </Svg>
);

export default ChatIcon;

