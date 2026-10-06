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
    onWeightFlowTab,
    weightFlowTab,
    canConfirmOrderPrice,
    weighingCount = 0,
    weightPaymentCount = 0,
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
                    style={[styles.toggleButton, !showHistory && !showWaitingStock && !weightFlowTab && styles.toggleButtonActive]}
                    onPress={onToggleMain}
                >
                    <Text 
                        style={[styles.toggleButtonText, !showHistory && !showWaitingStock && !weightFlowTab && styles.toggleButtonTextActive]}
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

    const renderWeightChips = () => canConfirmOrderPrice ? (
        <View style={styles.weightTabs}>
            <TouchableOpacity
                style={[styles.weightChip, weightFlowTab === 'weighing' && styles.weightChipActive]}
                onPress={() => onWeightFlowTab?.('weighing')}
            >
                <Text style={[styles.weightChipText, weightFlowTab === 'weighing' && styles.weightChipTextActive]}>
                    Ожидают взвешивания{weighingCount ? ` (${weighingCount})` : ''}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.weightChip, weightFlowTab === 'payment' && styles.weightChipActive]}
                onPress={() => onWeightFlowTab?.('payment')}
            >
                <Text style={[styles.weightChipText, weightFlowTab === 'payment' && styles.weightChipTextActive]}>
                    Ожидают оплаты{weightPaymentCount ? ` (${weightPaymentCount})` : ''}
                </Text>
            </TouchableOpacity>
        </View>
    ) : null;

    if (stickyMode) {
        return (
            <View style={styles.stickyHeaderContainer}>
                {renderTabs(styles.stickyToggleContainer)}
                {renderWeightChips()}
            </View>
        );
    }

    return (
        <View style={styles.headerShell}>
            <View style={styles.headerContainer} onLayout={onLayout}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={onGoBack}
                        activeOpacity={0.7}
                    >
                        <ArrowBackIcon color={headerForeground} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        Заказы для обработки
                    </Text>
                    <View style={styles.headerSideSpacer} />
                </View>

                {renderTabs(styles.toggleContainer)}
                {renderWeightChips()}

                <OrdersFilters
                    type="staff"
                    filters={filters}
                    onFiltersChange={onFiltersChange}
                    showProcessingToggle={false}
                    embeddedInDarkHeader={isDark}
                    integratedInHeader
                />
            </View>
        </View>
    );
};

const LIGHT_SHADOW = '#1A2140';
const LIGHT_EDGE = 'rgba(20, 24, 48, 0.12)';

const createStyles = (colors, isDark) => {
    const headerBackground = isDark ? ORDER_DETAILS_CLIENT_DARK_BACKGROUND : colors.cardBackground;
    const tabTrackBackground = isDark ? 'rgba(255, 255, 255, 0.12)' : '#EEF0F6';
    const tabActiveBackground = isDark ? ON_PRIMARY_COLOR : colors.primary;
    const tabInactiveText = isDark ? 'rgba(255, 255, 255, 0.75)' : colors.textSecondary;
    const tabActiveText = isDark ? ORDER_DETAILS_CLIENT_DARK_BACKGROUND : colors.textInverse;
    const lightControlShadow = {
        shadowColor: LIGHT_SHADOW,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
        borderWidth: 1,
        borderColor: LIGHT_EDGE,
    };

    return StyleSheet.create({
    stickyHeaderContainer: {
        backgroundColor: headerBackground,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerShell: {
        marginHorizontal: -10,
        marginBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        backgroundColor: headerBackground,
        borderWidth: 0,
        shadowColor: isDark ? (colors.shadowColor || '#000') : LIGHT_SHADOW,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.22 : 0.06,
        shadowRadius: 8,
        elevation: isDark ? 4 : 2,
    },
    headerContainer: {
        backgroundColor: headerBackground,
        paddingBottom: 6,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    headerSideSpacer: {
        width: 40,
        height: 40,
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
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.16)' : '#FFFFFF',
        ...(isDark ? {} : lightControlShadow),
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: isDark ? ON_PRIMARY_COLOR : colors.textPrimary,
        textAlign: 'center',
        marginHorizontal: 8,
    },
    toggleContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 12,
        backgroundColor: tabTrackBackground,
        borderRadius: 12,
        padding: 3,
        borderWidth: isDark ? 0 : 1,
        borderColor: LIGHT_EDGE,
    },
    stickyToggleContainer: {
        flexDirection: 'row',
        backgroundColor: tabTrackBackground,
        borderRadius: 12,
        padding: 3,
        borderWidth: isDark ? 0 : 1,
        borderColor: LIGHT_EDGE,
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
        shadowOpacity: isDark ? 0.12 : 0.08,
        shadowRadius: 3,
        elevation: 1,
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
    weightTabs: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 8,
        gap: 8,
    },
    weightChip: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: isDark ? tabTrackBackground : '#FFFFFF',
        alignItems: 'center',
        borderWidth: isDark ? 0 : 1,
        borderColor: LIGHT_EDGE,
        shadowColor: LIGHT_SHADOW,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0 : 0.04,
        shadowRadius: 3,
        elevation: isDark ? 0 : 1,
    },
    weightChipActive: {
        backgroundColor: tabActiveBackground,
        borderColor: tabActiveBackground,
        shadowOpacity: isDark ? 0.12 : 0.08,
        elevation: 1,
    },
    weightChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: tabInactiveText,
        textAlign: 'center',
    },
    weightChipTextActive: {
        color: tabActiveText,
        fontWeight: '700',
    },
});
};
