import React, { forwardRef, useState } from 'react';
import { View, TextInput as RNTextInput, StyleSheet } from 'react-native';

const CustomInput = forwardRef(({
                                        style,
                                        onChangeText,
                                        value,
                                        ...props
                                    }, ref) => {
    const [localValue, setLocalValue] = useState(value || '');

    const handleChangeText = (text) => {
        setLocalValue(text);
        if (onChangeText) {
            // Используем setTimeout для отложенного вызова
            setTimeout(() => {
                onChangeText(text);
            }, 0);
        }
    };

    return (
        <View style={styles.container}>
            <RNTextInput
                ref={ref}
                style={[styles.input, style]}
                value={String(localValue)}
                onChangeText={handleChangeText}
                {...props}
            />
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
    input: {
        minHeight: 30,
    },
});

export default CustomInput;