import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { OrdersFilters } from '@features/order/ui/OrdersFilters';
import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';

export const OrdersHeader = ({
    canViewAllOrders,
    actualProcessingRole,
    showHistory,
    filters,
    onFiltersChange,
    onToggleHistory,
    onGoBack
}) => {
    return (
        <View style={styles.headerContainer}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={onGoBack}
                >
                    <ArrowBackIcon />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Заказы для обработки</Text>
            </View>

            {!canViewAllOrders && actualProcessingRole && actualProcessingRole !== undefined && (
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleButton, !showHistory && styles.toggleButtonActive]}
                        onPress={() => onToggleHistory(false)}
                    >
                        <Text style={[styles.toggleButtonText, !showHistory && styles.toggleButtonTextActive]}>
                            {actualProcessingRole === 'PICKER' ? 'Новые' : 'Активные'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, showHistory && styles.toggleButtonActive]}
                        onPress={() => onToggleHistory(true)}
                    >
                        <Text style={[styles.toggleButtonText, showHistory && styles.toggleButtonTextActive]}>
                            История
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <OrdersFilters
                filters={filters}
                onFiltersChange={onFiltersChange}
                showProcessingToggle={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: '#fff',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    toggleContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 12,
        marginBottom: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 2,
    },
    toggleButtonActive: {
        backgroundColor: '#667eea',
    },
    toggleButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
    },
    toggleButtonTextActive: {
        color: '#fff',
    },
});
