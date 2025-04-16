import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const ArrowIcon = ({ width = 226, height = 16, style }) => {
    return (
        <Svg
            width={width}
            height={height}
            viewBox="0 0 226 16"
            fill="none"
            style={style}
        >
            <Path
                d="M225.707 8.70711C226.098 8.31658 226.098 7.68342 225.707 7.29289L219.343 0.928932C218.953 0.538408 218.319 0.538408 217.929 0.928932C217.538 1.31946 217.538 1.95262 217.929 2.34315L223.586 8L217.929 13.6569C217.538 14.0474 217.538 14.6805 217.929 15.0711C218.319 15.4616 218.953 15.4616 219.343 15.0711L225.707 8.70711ZM0 9H225V7H0V9Z"
                fill="url(#paint0_linear_40000499_15160)"
            />
            <Defs>
                <LinearGradient
                    id="paint0_linear_40000499_15160"
                    x1="0"
                    y1="8.50282"
                    x2="225"
                    y2="8.50239"
                    gradientUnits="userSpaceOnUse"
                >
                    <Stop stopColor="#E4F6FC" />
                    <Stop offset="0.263361" stopColor="#C3DFFA" />
                    <Stop offset="0.438845" stopColor="#B5C9FB" />
                    <Stop offset="0.684043" stopColor="#B7C4FD" />
                    <Stop offset="1" stopColor="#E2DDFF" />
                </LinearGradient>
            </Defs>
        </Svg>
    );
};

export default ArrowIcon;