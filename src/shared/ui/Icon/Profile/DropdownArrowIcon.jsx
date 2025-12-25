import React from 'react';
import { Svg, Path } from 'react-native-svg';

const DropdownArrowIcon = ({ color = '#3339B0', width = 14, height = 8 }) => {
    return (
        <Svg width={width} height={height} viewBox="0 0 14 8" fill="none">
            <Path
                d="M6.72368 7.56701C6.9171 7.56701 7.11052 7.48966 7.24207 7.34266L13.2385 1.20699C13.37 1.07547 13.4474 0.905262 13.4474 0.71181C13.4474 0.30949 13.1379 0 12.7355 0C12.5498 0 12.3641 0.0773804 12.2326 0.201143L6.72368 5.83386L1.21475 0.201143C1.0832 0.0773804 0.905263 0 0.711844 0C0.30949 0 0 0.30949 0 0.71181C0 0.905262 0.0773808 1.07547 0.208902 1.21472L6.20529 7.34266C6.35229 7.48966 6.5225 7.56701 6.72368 7.56701Z"
                fill={color}
            />
        </Svg>
    );
};

export default DropdownArrowIcon;