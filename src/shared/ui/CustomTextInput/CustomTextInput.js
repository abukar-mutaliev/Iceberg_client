import React, { forwardRef, useState, useEffect, useCallback } from 'react';
import { TextInput, Platform, StyleSheet } from 'react-native';

export const CustomTextInput = forwardRef((props, ref) => {
    const { value: externalValue, onChangeText, onFocus, ...restProps } = props;
    const [internalValue, setInternalValue] = useState(externalValue || '');

    // Синхронизация внутреннего состояния с внешним props.value
    useEffect(() => {
        if (externalValue !== undefined) {
            setInternalValue(externalValue);
        }
    }, [externalValue]);

    const handleTextChange = useCallback((text) => {
        setInternalValue(text);
        if (onChangeText) {
            onChangeText(text);
        }
    }, [onChangeText]);

    const handleFocus = useCallback((e) => {
        if (onFocus) {
            onFocus(e);
        }
    }, [onFocus]);

    const androidProps = Platform.OS === 'android' ? {
        blurOnSubmit: false,
        autoCorrect: false,
        underlineColorAndroid: 'transparent',
        disableFullscreenUI: true,
        contextMenuHidden: true,
    } : {};

    return (
        <TextInput
            {...restProps}
            {...androidProps}
            ref={ref}
            value={internalValue}
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            style={[styles.input, restProps.style]}
            placeholderTextColor={restProps.placeholderTextColor || '#888'}
        />
    );
});

const styles = StyleSheet.create({
    input: {
        padding: Platform.OS === 'android' ? 8 : 10,
    }
});
