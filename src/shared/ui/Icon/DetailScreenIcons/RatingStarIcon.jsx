import React from 'react';
import { TouchableOpacity } from 'react-native';
import Svg, { Path, LinearGradient, Stop, Defs, ClipPath, Rect } from 'react-native-svg';

export const RatingStarIcon = ({
                                   width = 18,
                                   height = 18,
                                   filled = false,
                                   halfFilled = false,
                                   color = "#5E00FF",
                                   onPress,
                                   starValue
                               }) => {
    return (
        <TouchableOpacity onPress={() => onPress && onPress(starValue)} activeOpacity={0.7}>
            <Svg width={width} height={height} viewBox="0 0 18 18" fill="none">
                <Defs>
                    <LinearGradient id="halfFill" x1="0" y1="0" x2="18" y2="0">
                        <Stop offset="0" stopColor={color} />
                        <Stop offset="0.5" stopColor={color} />
                        <Stop offset="0.5" stopColor="transparent" stopOpacity="1" />
                        <Stop offset="1" stopColor="transparent" stopOpacity="1" />
                    </LinearGradient>
                    <ClipPath id="starHalf">
                        <Rect x="0" y="0" width="9" height="18" />
                    </ClipPath>
                </Defs>

                {/* Контур звезды (для всех состояний) */}
                <Path
                    d="M9 1.5L11.3175 6.195L16.5 6.9525L12.75 10.605L13.635 15.765L9 13.3275L4.365 15.765L5.25 10.605L1.5 6.9525L6.6825 6.195L9 1.5Z"
                    fill="transparent"
                    stroke={color}
                    strokeWidth="0.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Заполнение звезды */}
                {filled && (
                    <Path
                        d="M9 1.5L11.3175 6.195L16.5 6.9525L12.75 10.605L13.635 15.765L9 13.3275L4.365 15.765L5.25 10.605L1.5 6.9525L6.6825 6.195L9 1.5Z"
                        fill={color}
                    />
                )}

                {/* Половина звезды */}
                {halfFilled && (
                    <Path
                        d="M9 1.5L11.3175 6.195L16.5 6.9525L12.75 10.605L13.635 15.765L9 13.3275L4.365 15.765L5.25 10.605L1.5 6.9525L6.6825 6.195L9 1.5Z"
                        fill={color}
                        clipPath="url(#starHalf)"
                    />
                )}
            </Svg>
        </TouchableOpacity>
    );
};

export default RatingStarIcon;