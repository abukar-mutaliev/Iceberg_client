import React from 'react';
import Svg, { Path } from 'react-native-svg';
import {View, StyleSheet, Text} from 'react-native';

export const CartIcon = ({
                             size = 24,
                             color = '#3339B0',
                             strokeWidth = 1.8,
                             style,
                             filled = false,
                             badge = false,
                             badgeCount = 0,
                             badgeColor = '#FF4444',
                             testID
                         }) => {
    const width = size;
    const height = (size * 20) / 25;

    const scaledStrokeWidth = (strokeWidth * size) / 25;

    const CartSvg = (
        <Svg
            width={width}
            height={height}
            viewBox="0 0 25 20"
            style={style}
            testID={testID}
        >
            {/* Основа корзины */}
            <Path
                d="M2.5 9L5.57955 18.2052C5.73838 18.6799 6.18295 19 6.68358 19H18.3737C18.8743 19 19.3188 18.68 19.4777 18.2053L22.5 9.17467"
                stroke={color}
                strokeWidth={scaledStrokeWidth}
                strokeLinecap="round"
                fill={filled ? color : 'none'}
                fillOpacity={filled ? 0.1 : 0}
            />

            {/* Горизонтальная линия */}
            <Path
                d="M1.5 9H23.5"
                stroke={color}
                strokeWidth={scaledStrokeWidth}
                strokeLinecap="round"
                fill="none"
            />

            {/* Ручка корзины */}
            <Path
                d="M4.5 9L11.1069 2.39311C11.8763 1.62371 13.1237 1.62371 13.8931 2.39311L20.5 9"
                stroke={color}
                strokeWidth={scaledStrokeWidth}
                strokeLinecap="round"
                fill="none"
            />
        </Svg>
    );

    if (!badge || badgeCount <= 0) {
        return CartSvg;
    }

    return (
        <View style={[styles.container, { width, height }]}>
            {CartSvg}
            <View style={[
                styles.badge,
                {
                    backgroundColor: badgeColor,
                    right: -size * 0.1,
                    top: -size * 0.1,
                    minWidth: size * 0.4,
                    height: size * 0.4,
                    borderRadius: size * 0.2,
                }
            ]}>
                <Text style={[
                    styles.badgeText,
                    { fontSize: size * 0.25 }
                ]}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                </Text>
            </View>
        </View>
    );
};

export const CartIconSmall = (props) => <CartIcon size={16} {...props} />;
export const CartIconMedium = (props) => <CartIcon size={24} {...props} />;
export const CartIconLarge = (props) => <CartIcon size={32} {...props} />;

export const CartIconPrimary = (props) => <CartIcon color="#3339B0" {...props} />;
export const CartIconSecondary = (props) => <CartIcon color="#666666" {...props} />;
export const CartIconWhite = (props) => <CartIcon color="#FFFFFF" {...props} />;
export const CartIconBlack = (props) => <CartIcon color="#000000" {...props} />;

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 2,
    },
    badgeText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        textAlign: 'center',
        includeFontPadding: false,
    },
});

export default CartIcon;