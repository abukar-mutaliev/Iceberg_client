import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@app/providers/ThemeProvider/ThemeProvider';
import { Border, Padding, FontFamily, FontSize } from '@app/styles/GlobalStyles';

export const ThemeAwareButton = ({
                                     children,
                                     onPress,
                                     variant = 'primary',
                                     size = 'medium',
                                     disabled = false,
                                     style,
                                     textStyle,
                                 }) => {
    const { colors } = useTheme();

    const getButtonStyle = () => {
        const baseStyle = [styles.button];

        if (variant === 'primary') {
            baseStyle.push({
                backgroundColor: colors.primary,
            });
        } else if (variant === 'secondary') {
            baseStyle.push({
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: colors.primary,
            });
        } else if (variant === 'text') {
            baseStyle.push({
                backgroundColor: 'transparent',
            });
        }

        if (size === 'small') {
            baseStyle.push(styles.buttonSmall);
        } else if (size === 'medium') {
            baseStyle.push(styles.buttonMedium);
        } else if (size === 'large') {
            baseStyle.push(styles.buttonLarge);
        }

        if (disabled) {
            baseStyle.push({
                opacity: 0.5,
            });
        }

        if (style) {
            baseStyle.push(style);
        }

        return baseStyle;
    };

    const getTextStyle = () => {
        const baseTextStyle = [styles.text];

        if (variant === 'primary') {
            baseTextStyle.push({
                color: '#fff',
            });
        } else {
            baseTextStyle.push({
                color: colors.primary,
            });
        }

        if (size === 'small') {
            baseTextStyle.push({
                fontSize: FontSize.size_xs,
            });
        } else if (size === 'large') {
            baseTextStyle.push({
                fontSize: FontSize.size_3xl,
            });
        }

        if (textStyle) {
            baseTextStyle.push(textStyle);
        }

        return baseTextStyle;
    };

    return (
        <Pressable
            style={getButtonStyle()}
            onPress={onPress}
            disabled={disabled}
        >
            {typeof children === 'string' ? (
                <Text style={getTextStyle()}>{children}</Text>
            ) : (
                children
            )}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: Border.br_xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonSmall: {
        paddingVertical: Padding.p_9xs,
        paddingHorizontal: Padding.p_3xs,
    },
    buttonMedium: {
        paddingVertical: Padding.p_3xs,
        paddingHorizontal: Padding.p_xl,
    },
    buttonLarge: {
        paddingVertical: Padding.p_xl,
        paddingHorizontal: Padding.p_2xl,
    },
    text: {
        fontFamily: FontFamily.sFProText,
        fontSize: FontSize.size_sm,
        fontWeight: '500',
        textAlign: 'center',
    },
});