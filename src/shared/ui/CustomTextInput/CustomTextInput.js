import React, { forwardRef, useState } from 'react';
import { TextInput, Platform, StyleSheet } from 'react-native';

export const CustomTextInput = forwardRef((props, ref) => {
    const [value, setValue] = useState(props.value || '');


    const handleTextChange = (text) => {
        setValue(text);

        if (Platform.OS === 'android') {
            if (props.onChangeText) {
                props.onChangeText(text);
            }
        } else {
            if (props.onChangeText) {
                props.onChangeText(text);
            }
        }
    };

    const androidProps = Platform.OS === 'android' ? {
        blurOnSubmit: false,
        autoCorrect: false,
        underlineColorAndroid: 'transparent',
        disableFullscreenUI: true,
        contextMenuHidden: true,
    } : {};

    return (
        <TextInput
            {...props}
            {...androidProps}
            ref={ref}
            value={value}
            onChangeText={handleTextChange}
            style={[styles.input, props.style]}
        />
    );
});

const styles = StyleSheet.create({
    input: {
        padding: Platform.OS === 'android' ? 8 : 10,
    }
});