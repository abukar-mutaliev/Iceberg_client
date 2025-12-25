import React from 'react';
import Svg, { Path } from 'react-native-svg';

const CartIcon = ({ width = 25, height = 20, color = "#000" }) => {
    return (
        <Svg width={width} height={height} viewBox="0 0 25 20" fill="none">
            <Path
                d="M2.5 9L5.57955 18.2052C5.73838 18.6799 6.18295 19 6.68358 19H18.3737C18.8743 19 19.3188 18.68 19.4777 18.2053L22.5 9.17467"
                stroke={color}
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <Path
                d="M1.5 9H23.5"
                stroke={color}
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <Path
                d="M4.5 9L11.1069 2.39311C11.8763 1.62371 13.1237 1.62371 13.8931 2.39311L20.5 9"
                stroke={color}
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </Svg>
    );
};

export default CartIcon;