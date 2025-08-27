import React from 'react';
import {
    View,
    StyleSheet,
    SafeAreaView
} from 'react-native';
import { OrderNotificationTester } from '@entities/order';

const OrderNotificationTestScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <OrderNotificationTester />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa'
    },
    content: {
        flex: 1
    }
});

export default OrderNotificationTestScreen;