import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

const MenuIcon = ({ width = 31, height = 22, color = '#3339B0' }) => {
    return (
        <Svg width={width} height={height} viewBox="0 0 31 22" fill="none">
            <G id="categories">
                <Path
                    id="Vector"
                    d="M2 11H16.6063M2 2H29M2 20H29"
                    stroke={color}
                    strokeWidth="2.45455"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </G>
        </Svg>
    );
};

export default MenuIcon;