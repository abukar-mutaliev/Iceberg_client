import React, { useState } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    View
} from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

export const CustomButton = ({
                                 title,
                                 icon,
                                 onPress,
                                 style,
                                 textStyle,
                                 iconPosition = 'left',
                                 outlined = false,
                                 color = Color.blue2,
                                 activeColor = '#ffffff',
                                 height = 53,
                                 borderRadius = 10,
                                 disabled = false,
                             }) => {
    const [isActive, setIsActive] = useState(false);

    const handlePress = () => {
        if (disabled) return;

        setIsActive(true);
        setTimeout(() => {
            setIsActive(false);
            onPress && onPress();
        }, 150);
    };

    const buttonStyles = [
        styles.button,
        { height: normalize(height), borderRadius: normalize(borderRadius) },
        outlined ? {
            backgroundColor: isActive ? color : '#fff',
            borderWidth: 0.5,
            borderColor: color,
        } : {
            backgroundColor: isActive ? Color.blue2 : color,
        },
        disabled && styles.disabledButton,
        style,
    ];

    const textStyles = [
        styles.text,
        { color: outlined ? (isActive ? '#fff' : color) : (isActive ? '#fff' : activeColor) },
        textStyle,
    ];

    return (
        <TouchableOpacity
            style={buttonStyles}
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={0.7}
        >
            <View style={[
                styles.contentContainer,
                iconPosition === 'right' && styles.contentReverse
            ]}>
                {icon && React.cloneElement(icon, {
                    color: outlined ? (isActive ? '#fff' : color) : (isActive ? '#fff' : activeColor),
                })}
                {icon && <View style={{ width: normalize(10) }} />}
                <Text style={textStyles}>{title}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: normalize(15),
        width: '100%',
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentReverse: {
        flexDirection: 'row-reverse',
    },
    text: {
        fontSize: normalizeFont(16),
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },
});

export default CustomButton;