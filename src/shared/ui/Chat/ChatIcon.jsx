import React from 'react';
import { Svg, Path } from 'react-native-svg';

const ChatIcon = ({ width = 24, height = 24, color = "black", ...props }) => {
    return (
        <Svg
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="none"
            {...props}
        >
            <Path
                clipRule="evenodd"
                fillRule="evenodd"
                fill={color}
                d="M3 4.5C1.89543 4.5 1 5.39543 1 6.5V17.5C1 18.6046 1.89543 19.5 3 19.5H17C18.1046 19.5 19 18.6046 19 17.5V11.3252L22.8087 6.08817C23.03 5.78399 23.0618 5.38139 22.8911 5.04622C22.7204 4.71105 22.3761 4.5 22 4.5H18H3ZM15 11H5V9H15V11ZM5 15H12V13H5V15Z"
            />
        </Svg>
    );
};

export default ChatIcon;