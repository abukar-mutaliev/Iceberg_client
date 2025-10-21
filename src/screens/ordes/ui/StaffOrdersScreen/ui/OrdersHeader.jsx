import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { OrdersFilters } from '@features/order/ui/OrdersFilters';
import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';
import { useAuth } from '@entities/auth/hooks/useAuth';

export const OrdersHeader = ({
    canViewAllOrders,
    actualProcessingRole,
    showHistory,
    showWaitingStock,
    filters,
    onFiltersChange,
    onToggleHistory,
    onToggleWaitingStock,
    onToggleMain,
    onGoBack,
    waitingStockCount = 0,
    isWebSocketConnected = false,
    currentUser: currentUserProp,
    stickyMode = false,
    onLayout
}) => {
    // Используем useAuth напрямую для надёжности
    const { currentUser: currentUserFromAuth } = useAuth();
    const currentUser = currentUserProp || currentUserFromAuth;

    // Отладка отключена для производительности
    // console.log('🔍 OrdersHeader: проверка условия показа вкладок', {
    //     role: currentUser?.role,
    //     canViewAllOrders,
    //     stickyMode
    // });

    // В sticky режиме показываем только вкладки (БЕЗ заголовка и фильтров)
    if (stickyMode) {
        return (
            <View style={styles.stickyHeaderContainer}>
                {/* Показываем вкладки для всех сотрудников и админов */}
                {(currentUser?.role === 'EMPLOYEE' || currentUser?.role === 'ADMIN') && (
                    <View style={styles.stickyToggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleButton, !showHistory && !showWaitingStock && styles.toggleButtonActive]}
                            onPress={onToggleMain}
                        >
                            <Text 
                                style={[styles.toggleButtonText, !showHistory && !showWaitingStock && styles.toggleButtonTextActive]}
                                numberOfLines={2}
                            >
                                {actualProcessingRole === 'PICKER' ? 'Новые' : 'Активные'}
                            </Text>
                        </TouchableOpacity>
                        
                        {/* Вкладку "Ожидают поставки" НЕ показываем для PICKER, PACKER и COURIER */}
                        {(() => {
                            const processingRole = currentUser?.employee?.processingRole;
                            const restrictedRoles = ['PICKER', 'PACKER', 'COURIER'];
                            const shouldShowWaitingTab = !restrictedRoles.includes(processingRole);
                            
                            if (!shouldShowWaitingTab) return null;
                            
                            // Бейдж показываем для ADMIN и обычных сотрудников (не PICKER/PACKER/COURIER)
                            const shouldShowBadge = (currentUser?.role === 'ADMIN' || 
                                                      (currentUser?.role === 'EMPLOYEE' && !restrictedRoles.includes(processingRole))) 
                                                      && waitingStockCount > 0;
                            
                            return (
                                <TouchableOpacity
                                    style={[styles.toggleButton, showWaitingStock && styles.toggleButtonActive]}
                                    onPress={onToggleWaitingStock}
                                >
                                    {shouldShowBadge && (
                                        <View style={[
                                            styles.badge,
                                            showWaitingStock && styles.badgeActive
                                        ]}>
                                            <Text style={[
                                                styles.badgeText,
                                                showWaitingStock && styles.badgeTextActive
                                            ]}>
                                                {waitingStockCount}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.buttonContent}>
                                        <Text 
                                            style={[styles.toggleButtonText, showWaitingStock && styles.toggleButtonTextActive]}
                                            numberOfLines={2}
                                        >
                                            Ожидают поставки
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })()}
                        
                        <TouchableOpacity
                            style={[styles.toggleButton, showHistory && styles.toggleButtonActive]}
                            onPress={onToggleHistory}
                        >
                            <Text 
                                style={[styles.toggleButtonText, showHistory && styles.toggleButtonTextActive]}
                                numberOfLines={2}
                            >
                                История
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    // Обычный режим - полный хедер с заголовком, вкладками и фильтрами
    return (
        <View style={styles.headerContainer} onLayout={onLayout}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={onGoBack}
                >
                    <ArrowBackIcon />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                    <Text style={styles.headerTitle}>Заказы для обработки</Text>
                </View>
            </View>

            {/* Показываем вкладки для всех сотрудников и админов */}
            {(currentUser?.role === 'EMPLOYEE' || currentUser?.role === 'ADMIN') && (
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleButton, !showHistory && !showWaitingStock && styles.toggleButtonActive]}
                        onPress={onToggleMain}
                    >
                        <Text 
                            style={[styles.toggleButtonText, !showHistory && !showWaitingStock && styles.toggleButtonTextActive]}
                            numberOfLines={2}
                        >
                            {actualProcessingRole === 'PICKER' ? 'Новые' : 'Активные'}
                        </Text>
                    </TouchableOpacity>
                    
                    {/* Вкладку "Ожидают поставки" НЕ показываем для PICKER, PACKER и COURIER */}
                    {(() => {
                        const processingRole = currentUser?.employee?.processingRole;
                        const restrictedRoles = ['PICKER', 'PACKER', 'COURIER'];
                        const shouldShowWaitingTab = !restrictedRoles.includes(processingRole);
                        
                        if (!shouldShowWaitingTab) return null;
                        
                        // Бейдж показываем для ADMIN и обычных сотрудников (не PICKER/PACKER/COURIER)
                        const shouldShowBadge = (currentUser?.role === 'ADMIN' || 
                                                  (currentUser?.role === 'EMPLOYEE' && !restrictedRoles.includes(processingRole))) 
                                                  && waitingStockCount > 0;
                        
                        return (
                            <TouchableOpacity
                                style={[styles.toggleButton, showWaitingStock && styles.toggleButtonActive]}
                                onPress={onToggleWaitingStock}
                            >
                                {shouldShowBadge && (
                                    <View style={[
                                        styles.badge,
                                        showWaitingStock && styles.badgeActive
                                    ]}>
                                        <Text style={[
                                            styles.badgeText,
                                            showWaitingStock && styles.badgeTextActive
                                        ]}>
                                            {waitingStockCount}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.buttonContent}>
                                    <Text 
                                        style={[styles.toggleButtonText, showWaitingStock && styles.toggleButtonTextActive]}
                                        numberOfLines={2}
                                    >
                                        Ожидают поставки
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })()}
                    
                    <TouchableOpacity
                        style={[styles.toggleButton, showHistory && styles.toggleButtonActive]}
                        onPress={onToggleHistory}
                    >
                        <Text 
                            style={[styles.toggleButtonText, showHistory && styles.toggleButtonTextActive]}
                            numberOfLines={2}
                        >
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
    stickyHeaderContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerContainer: {
        backgroundColor: '#fff',
        paddingBottom: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    titleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    connectionIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e8',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    connectionDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#4caf50',
        marginRight: 4,
    },
    connectionText: {
        fontSize: 10,
        color: '#4caf50',
        fontWeight: '600',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
        textAlign: 'center',
        marginHorizontal: 16,
    },
    toggleContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        padding: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    stickyToggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
        padding: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 1,
        minHeight: 40,
    },
    toggleButtonActive: {
        backgroundColor: '#667eea',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    toggleButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        textAlign: 'center',
        lineHeight: 16,
    },
    toggleButtonTextActive: {
        color: '#fff',
        fontWeight: '700',
    },
    buttonContent: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: 0,
        backgroundColor: '#fd7e14',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 5,
    },
    badgeActive: {
        backgroundColor: '#fd7e14',
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },
    badgeTextActive: {
        color: '#fff',
    },
});
