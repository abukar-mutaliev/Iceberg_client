import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export const ErrorScreen = ({ error, onRetry }) => (
    <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={onRetry}>
            <Text style={styles.buttonText}>Повторить</Text>
        </TouchableOpacity>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    errorText: {
        fontSize: 16,
        color: '#FF4444',
        textAlign: 'center',
        marginBottom: 20
    },
    button: {
        backgroundColor: '#2196F3',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16
    }
});