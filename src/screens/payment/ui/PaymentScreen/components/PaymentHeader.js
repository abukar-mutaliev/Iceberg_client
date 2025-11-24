// ==========================================
// PaymentScreen/components/PaymentHeader.js
// Шапка экрана с кнопками
// ==========================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

export const PaymentHeader = ({
    onClose,
    onCheckStatus,
    isSplitOrder,
    currentStep
}) => {
    const getTitle = () => {
        if (isSplitOrder) {
            return currentStep === 1
                ? `Оплата (${currentStep}/2)`
                : `Предоплата (${currentStep}/2)`;
        }
        return 'Оплата заказа';
    };

    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.button}>
                <Icon name="close" size={24} color={Color.textPrimary} />
            </TouchableOpacity>

            <Text style={styles.title}>{getTitle()}</Text>

            <TouchableOpacity onPress={onCheckStatus} style={styles.button}>
                <Icon name="refresh" size={24} color={Color.primary} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Color.border || '#E0E0E0',
        backgroundColor: Color.background || '#FFFFFF'
    },
    title: {
        fontSize: 18,
        fontFamily: FontFamily.interSemiBold,
        color: Color.textPrimary,
        flex: 1,
        textAlign: 'center'
    },
    button: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center'
    }
});


