import React from 'react';
import Svg, { Path } from 'react-native-svg';

const IconChange = ({ width = 20, height = 19, color = 'black', strokeWidth = 1.27626, ...props }) => {
    return (
        <Svg
            width={width}
            height={height}
            viewBox="0 0 20 19"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <Path
                d="M1 18H17.9467M15.7647 3.37875L5.07321 14.1669L4.18589 15.9148L5.92157 15.0215L16.6373 4.25734L15.7647 3.37875ZM17.9467 1.18188L17.074 2.06047L17.9467 2.93945L18.8193 2.06047C18.935 1.94394 19 1.78593 19 1.62117C19 1.45642 18.935 1.29841 18.8193 1.18188C18.7036 1.06542 18.5467 1 18.383 1C18.2194 1 18.0624 1.06542 17.9467 1.18188Z"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
};

export default IconChange; 