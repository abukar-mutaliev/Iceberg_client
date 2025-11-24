// ==========================================
// PaymentScreen/components/ErrorScreen.js
// Экран ошибки
// ==========================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

export const ErrorScreen = ({
    error,
    onCancel,
    onRetry
}) => (
    <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                <Icon name="close" size={24} color={Color.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Ошибка</Text>
            <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
            <Icon name="error-outline" size={64} color={Color.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
                style={styles.retryButton}
                onPress={onRetry}
            >
                <Text style={styles.retryButtonText}>Попробовать снова</Text>
            </TouchableOpacity>
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: FontFamily.interRegular,
        color: Color.textPrimary,
        textAlign: 'center'
    },
    retryButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: Color.primary,
        borderRadius: 8
    },
    retryButtonText: {
        fontSize: 16,
        fontFamily: FontFamily.interSemiBold,
        color: '#FFFFFF'
    }
});


