// ==========================================
// PaymentScreen/components/SplitOrderInfo.js
// Информация о разделенном заказе
// ==========================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

export const SplitOrderInfo = ({ currentStep, totalAmount, waitingAmount }) => (
    <View style={styles.container}>
        <View style={styles.badge}>
            <Icon name="call-split" size={16} color={Color.primary} />
            <Text style={styles.badgeText}>Разделенный заказ</Text>
        </View>
        <Text style={styles.description}>
            {currentStep === 1
                ? `Шаг 1: Оплата доступных товаров (${totalAmount}₽)`
                : `Шаг 2: Предоплата ожидающих товаров (${waitingAmount}₽)`
            }
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        backgroundColor: Color.backgroundSecondary || '#F5F5F5',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: Color.border || '#E0E0E0'
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    badgeText: {
        fontSize: 12,
        fontFamily: FontFamily.interSemiBold,
        color: Color.primary,
        marginLeft: 4
    },
    description: {
        fontSize: 13,
        fontFamily: FontFamily.interRegular,
        color: Color.textSecondary
    }
});


