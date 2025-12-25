import React from 'react';
import Svg, { Path } from 'react-native-svg';

export const FavoriteIcon = ({ color = '#BEBEBE' }) => (
    <Svg width={21} height={18} viewBox="0 0 21 18" fill="none">
        <Path
            d="M10.5 17L9.04349 15.7174C4.04348 11.3043 0.5 8.17391 0.5 4.34783C0.5 1.21739 2.9 -0.5 5.8 -0.5C7.4 -0.5 9.0 0.26087 10.5 1.5C11.9 0.26087 13.5 -0.5 15.2 -0.5C18.1 -0.5 20.5 1.21739 20.5 4.34783C20.5 8.17391 16.9565 11.3043 11.9565 15.7174L10.5 17Z"
            stroke={color}
            strokeWidth="1.5"
        />
    </Svg>
);
