import * as React from "react";
import Svg, { Rect, Circle } from "react-native-svg";

const IceCreamProductIcon = (props) => {
    const fill = props.fill || "white";
    const width = props.width || 70;
    const height = props.height || 70;

    return (
        <Svg
            width={width}
            height={height}
            viewBox="0 0 70 70"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            {/* Box outline */}
            <Rect x="10" y="24" width="50" height="32" rx="6" fill={fill} opacity="0.2" />
            <Rect x="12" y="26" width="46" height="28" rx="5" fill={fill} />

            {/* Lid */}
            <Rect x="16" y="16" width="38" height="6" rx="3" fill={fill} opacity="0.8" />

            {/* Label */}
            <Rect x="22" y="34" width="26" height="10" rx="5" fill={fill} opacity="0.15" />
            <Circle cx="35" cy="39" r="4" fill={fill} />

            {/* Bottom line */}
            <Rect x="18" y="56" width="34" height="2" rx="1" fill={fill} />
        </Svg>
    );
};

export default IceCreamProductIcon;
