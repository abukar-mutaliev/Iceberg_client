// ==========================================
// PaymentScreen/components/PaymentInfo.js
// Информация о платеже
// ==========================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

export const PaymentInfo = ({ orderNumber, amount }) => (
    <View style={styles.container}>
        <View style={styles.row}>
            <Text style={styles.label}>Заказ:</Text>
            <Text style={styles.value}>{orderNumber}</Text>
        </View>
        <View style={styles.row}>
            <Text style={styles.label}>К оплате:</Text>
            <Text style={styles.value}>{amount}₽</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        backgroundColor: Color.backgroundSecondary || '#F5F5F5',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Color.border || '#E0E0E0'
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    label: {
        fontSize: 14,
        fontFamily: FontFamily.interRegular,
        color: Color.textSecondary
    },
    value: {
        fontSize: 14,
        fontFamily: FontFamily.interSemiBold,
        color: Color.textPrimary
    }
});


