// HighlightChange.jsx
import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

export const HighlightChange = ({ children, value, style }) => {
    const highlightAnim = useRef(new Animated.Value(0)).current;
    const prevValueRef = useRef(value);

    useEffect(() => {
        if (prevValueRef.current !== value) {
            Animated.sequence([
                Animated.timing(highlightAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: false,
                }),
                Animated.timing(highlightAnim, {
                    toValue: 0,
                    duration: 700,
                    useNativeDriver: false,
                }),
            ]).start();

            prevValueRef.current = value;
        }
    }, [value, highlightAnim]);

    const backgroundColor = highlightAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['transparent', 'rgba(51, 153, 255, 0.15)']
    });

    return (
        <Animated.View style={[styles.container, style, { backgroundColor }]}>
            {children}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 4,
        padding: 2,
    },
});