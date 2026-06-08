import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { OrdersFilters } from '@features/order/ui/OrdersFilters';
import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ORDER_DETAILS_CLIENT_DARK_BACKGROUND } from '@shared/ui/OrderDetailsStyles';

const WAITING_STOCK_COLOR = '#fd7e14';
const ON_PRIMARY_COLOR = '#FFFFFF';

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
    const { currentUser: currentUserFromAuth } = useAuth();
    const currentUser = currentUserProp || currentUserFromAuth;
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const headerForeground = isDark ? ON_PRIMARY_COLOR : colors.textPrimary;

    const renderTabs = (containerStyle) => (
        (currentUser?.role === 'EMPLOYEE' || currentUser?.role === 'ADMIN') && (
            <View style={containerStyle}>
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
                
                {(() => {
                    const processingRole = currentUser?.employee?.processingRole;
                    const restrictedRoles = ['PICKER', 'COURIER'];
                    const shouldShowWaitingTab = !restrictedRoles.includes(processingRole);
                    
                    if (!shouldShowWaitingTab) return null;
                    
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
        )
    );

    if (stickyMode) {
        return (
            <View style={styles.stickyHeaderContainer}>
                {renderTabs(styles.stickyToggleContainer)}
            </View>
        );
    }

    return (
        <View style={styles.headerContainer} onLayout={onLayout}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={onGoBack}
                >
                    <ArrowBackIcon color={headerForeground} />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                    <Text style={styles.headerTitle}>Заказы для обработки</Text>
                </View>
            </View>

            {renderTabs(styles.toggleContainer)}

            <OrdersFilters
                type="staff"
                filters={filters}
                onFiltersChange={onFiltersChange}
                showProcessingToggle={false}
                embeddedInDarkHeader={isDark}
            />
        </View>
    );
};

const createStyles = (colors, isDark) => {
    const headerBackground = isDark ? ORDER_DETAILS_CLIENT_DARK_BACKGROUND : colors.cardBackground;
    const headerBorderColor = isDark ? 'rgba(255, 255, 255, 0.15)' : colors.border;
    const tabTrackBackground = isDark ? 'rgba(255, 255, 255, 0.12)' : colors.surface;
    const tabActiveBackground = isDark ? ON_PRIMARY_COLOR : colors.primary;
    const tabInactiveText = isDark ? 'rgba(255, 255, 255, 0.75)' : colors.textSecondary;
    const tabActiveText = isDark ? ORDER_DETAILS_CLIENT_DARK_BACKGROUND : colors.textInverse;

    return StyleSheet.create({
    stickyHeaderContainer: {
        backgroundColor: headerBackground,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerContainer: {
        backgroundColor: headerBackground,
        paddingBottom: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: headerBorderColor,
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
        backgroundColor: colors.success + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    connectionDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.success,
        marginRight: 4,
    },
    connectionText: {
        fontSize: 10,
        color: colors.success,
        fontWeight: '600',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: isDark ? ON_PRIMARY_COLOR : colors.textPrimary,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    toggleContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 12,
        backgroundColor: tabTrackBackground,
        borderRadius: 12,
        padding: 3,
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 3,
        elevation: isDark ? 0 : 2,
    },
    stickyToggleContainer: {
        flexDirection: 'row',
        backgroundColor: tabTrackBackground,
        borderRadius: 12,
        padding: 3,
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0 : 0.05,
        shadowRadius: 3,
        elevation: isDark ? 0 : 2,
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
        backgroundColor: tabActiveBackground,
        shadowColor: tabActiveBackground,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.15 : 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    toggleButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: tabInactiveText,
        textAlign: 'center',
        lineHeight: 16,
    },
    toggleButtonTextActive: {
        color: tabActiveText,
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
        backgroundColor: WAITING_STOCK_COLOR,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        zIndex: 1,
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 5,
    },
    badgeActive: {
        backgroundColor: WAITING_STOCK_COLOR,
    },
    badgeText: {
        color: colors.textInverse,
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },
    badgeTextActive: {
        color: colors.textInverse,
    },
});
};
