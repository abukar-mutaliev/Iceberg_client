import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Color } from '@/app/styles/GlobalStyles';

export const Loader = ({ size = 'large', color = Color.blue2, style }) => {
    return (
        <View style={[styles.container, style]}>
            <ActivityIndicator size={size} color={color} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});