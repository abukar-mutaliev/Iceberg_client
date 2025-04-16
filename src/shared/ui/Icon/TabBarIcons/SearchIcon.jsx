import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SearchIcon = ({ width = 20, height = 20, color = "#000" }) => {
    return (
        <Svg width={width} height={height} viewBox="0 0 19 19" fill="none">
            <Path
                d="M17.3455 17.0389L13.5771 13.2704M15.6129 8.37579C15.6129 12.2034 12.51 15.3063 8.68243 15.3063C4.85484 15.3063 1.75195 12.2034 1.75195 8.37579C1.75195 4.54819 4.85484 1.44531 8.68243 1.44531C12.51 1.44531 15.6129 4.54819 15.6129 8.37579Z"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
};

export default SearchIcon;