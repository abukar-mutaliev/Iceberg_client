import React from 'react';
import { TouchableOpacity } from 'react-native';
import Svg, { Path, ClipPath, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';

export const RatingStarSvg = ({
                                  width = 24,
                                  height = 25,
                                  color = '#5E00FF',
                                  filled = false,
                                  halfFilled = false,
                                  fillPercentage = 0,
                                  onPress,
                                  starValue,
                              }) => {
    let actualFillPercentage = fillPercentage;

    if (fillPercentage === 0) {
        if (filled) {
            actualFillPercentage = 100;
        } else if (halfFilled) {
            actualFillPercentage = 50;
        }
    }

    const gradientOffset = actualFillPercentage / 100;

    return (
        <TouchableOpacity
            onPress={() => onPress && onPress(starValue)}
            activeOpacity={0.7}
            style={{ marginRight: 2 }}
        >
            <Svg width={width} height={height} viewBox="0 0 24 25" fill="none">
                <Defs>
                    <LinearGradient id="partialFill" x1="0" y1="0" x2="24" y2="0">
                        <Stop offset="0" stopColor={color} />
                        <Stop offset={gradientOffset} stopColor={color} />
                        <Stop offset={gradientOffset} stopColor="transparent" stopOpacity="1" />
                        <Stop offset="1" stopColor="transparent" stopOpacity="1" />
                    </LinearGradient>
                    <ClipPath id="starPartial">
                        <Rect x="0" y="0" width={24 * gradientOffset} height="25" />
                    </ClipPath>
                </Defs>

                <G id="icon Rating">
                    <Path
                        id="Vector"
                        d="M13.0761 0.740206L15.8553 6.63106C16.0304 7.00035 16.3665 7.25737 16.7591 7.31646L22.9727 8.26183C23.9556 8.4125 24.3482 9.67693 23.6365 10.4007L19.1401 14.9858C18.8576 15.2753 18.7277 15.6889 18.7955 16.0966L19.8574 22.5695C20.0241 23.5946 18.996 24.3745 18.1176 23.893L12.5592 20.8353C12.209 20.6433 11.791 20.6433 11.4436 20.8353L5.88238 23.893C5.00117 24.3775 3.9731 23.5946 4.14256 22.5695L5.20453 16.0966C5.27231 15.6889 5.14239 15.2753 4.85995 14.9858L0.363531 10.4007C-0.348214 9.67398 0.0443755 8.40954 1.02726 8.26183L7.24091 7.31646C7.63068 7.25737 7.9696 7.00035 8.14471 6.63106L10.9239 0.740206C11.3645 -0.19335 12.6355 -0.19335 13.0761 0.740206Z"
                        fill="transparent"
                        stroke={color}
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {actualFillPercentage > 0 && (
                        <Path
                            id="Vector-Fill"
                            d="M13.0761 0.740206L15.8553 6.63106C16.0304 7.00035 16.3665 7.25737 16.7591 7.31646L22.9727 8.26183C23.9556 8.4125 24.3482 9.67693 23.6365 10.4007L19.1401 14.9858C18.8576 15.2753 18.7277 15.6889 18.7955 16.0966L19.8574 22.5695C20.0241 23.5946 18.996 24.3745 18.1176 23.893L12.5592 20.8353C12.209 20.6433 11.791 20.6433 11.4436 20.8353L5.88238 23.893C5.00117 24.3775 3.9731 23.5946 4.14256 22.5695L5.20453 16.0966C5.27231 15.6889 5.14239 15.2753 4.85995 14.9858L0.363531 10.4007C-0.348214 9.67398 0.0443755 8.40954 1.02726 8.26183L7.24091 7.31646C7.63068 7.25737 7.9696 7.00035 8.14471 6.63106L10.9239 0.740206C11.3645 -0.19335 12.6355 -0.19335 13.0761 0.740206Z"
                            fill={color}
                            clipPath="url(#starPartial)"
                        />
                    )}
                </G>
            </Svg>
        </TouchableOpacity>
    );
};

export default RatingStarSvg;