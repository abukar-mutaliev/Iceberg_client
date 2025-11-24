// ==========================================
// PaymentScreen/components/LoadingScreen.js
// Экран загрузки
// ==========================================

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

export const LoadingScreen = ({
    onCancel,
    isSplitOrder,
    currentStep
}) => (
    <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                <Icon name="close" size={24} color={Color.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
                {isSplitOrder
                    ? currentStep === 1
                        ? 'Оплата доступных товаров'
                        : 'Оплата ожидающих товаров'
                    : 'Оплата заказа'
                }
            </Text>
            <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Color.primary} />
            <Text style={styles.loadingText}>Подготовка платежа...</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.background || '#FFFFFF'
    },
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
    headerTitle: {
        fontSize: 18,
        fontFamily: FontFamily.interSemiBold,
        color: Color.textPrimary,
        flex: 1,
        textAlign: 'center'
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: FontFamily.interRegular,
        color: Color.textSecondary
    }
});


