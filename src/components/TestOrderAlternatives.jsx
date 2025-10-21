import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Импорт OrderAlternativesApi для тестирования
import { OrderAlternativesApi } from '@entities/order';

export const TestOrderAlternatives = () => {
    useEffect(() => {
        console.log('✅ TestOrderAlternatives: OrderAlternativesApi imported successfully');
        console.log('Type:', typeof OrderAlternativesApi);
        console.log('Methods:', Object.getOwnPropertyNames(OrderAlternativesApi));
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>OrderAlternativesApi Test</Text>
            <Text style={styles.status}>
                Status: {typeof OrderAlternativesApi === 'function' ? '✅ Working' : '❌ Error'}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    status: {
        fontSize: 16,
        color: '#333',
    },
});
