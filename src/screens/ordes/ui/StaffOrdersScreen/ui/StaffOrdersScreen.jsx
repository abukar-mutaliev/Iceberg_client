import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, RefreshControl, Animated, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { OrderCard } from '@entities/order/ui/OrderCard';
import { orderStateHelpers } from '@entities/order/lib/orderStateHelpers';
import { CONSTANTS, isOrderStatusMatchingRole, canEmployeeTakeOrderByRole, getNextStatusAfterComplete } from '@entities/order';
import { useStaffOrdersScreen } from '../hooks/useStaffOrdersScreen';
import { StatusUpdateModal } from '../ui/StatusUpdateModal';
import { OrdersHeader } from '../ui/OrdersHeader';
import { OrdersSkeleton } from '../ui/OrdersSkeleton';
import { WaitingStockOrderCard } from '../../WaitingStockOrderCard';
import { ToastSimple } from '@shared/ui/Toast/ui/ToastSimple';
import { Loader } from '@shared/ui/Loader';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ORDER_DETAILS_CLIENT_DARK_BACKGROUND, OrderDetailsScreenThemeProvider } from '@shared/ui/OrderDetailsStyles';
import { ThemedStatusBar } from '@shared/ui/ThemedStatusBar/ThemedStatusBar';

// ============== Компоненты ==============

const EmptyOrdersList = React.memo(({ 
  canViewAllOrders, 
  showHistory, 
  showWaitingStock, 
  actualProcessingRole,
  isLoading 
}) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const getMessage = useCallback(() => {
    if (showHistory) return 'История обработки пуста';
    if (showWaitingStock) return 'Нет заказов, ожидающих поставки товаров на склад';
    
    if (canViewAllOrders) {
      return 'Нет активных заказов для отображения.\nВсе заказы обработаны или находятся в истории.';
    }
    
    const roleMessages = {
      PICKER: 'новых заказов для сборки',
      COURIER: 'заказов для доставки',
    };
    
    return `Нет ${roleMessages[actualProcessingRole] || 'заказов для обработки'}`;
  }, [canViewAllOrders, showHistory, showWaitingStock, actualProcessingRole]);

  if (isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <Loader 
          type="youtube" 
          text="Загружаем заказы..." 
        />
      </View>
    );
  }

  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{getMessage()}</Text>
      {!showHistory && !showWaitingStock && (
        <Text style={styles.emptyHint}>Потяните вниз для обновления</Text>
      )}
    </View>
  );
});

EmptyOrdersList.displayName = 'EmptyOrdersList';

// ============== Логика прав доступа ==============

const useOrderPermissions = (currentUser, actualProcessingRole, showHistory) => {
  return useMemo(() => ({
    canWorkWithOrders: currentUser?.role !== 'ADMIN' && 
                       ['PICKER', 'COURIER'].includes(actualProcessingRole),
    canUpdateOrderStatus: (status) => {
      if (CONSTANTS.COMPLETED_STATUSES.includes(status)) return false;
      if (currentUser?.role === 'ADMIN') return false;
      if (showHistory && actualProcessingRole !== 'COURIER') return false;
      
      if (!isOrderStatusMatchingRole(actualProcessingRole, status)) return false;
      
      return ['PICKER', 'COURIER'].includes(actualProcessingRole);
    },
  }), [currentUser?.role, actualProcessingRole, showHistory]);
};

// ============== Логика статуса заказа ==============

const useOrderStatus = (order, localAction, actualProcessingRole, currentUser) => {
  return useMemo(() => {
    const isCompleted = localAction?.completed;
    const isCompletedStatus = CONSTANTS.COMPLETED_STATUSES.includes(order.status);
    const isRecentlyProcessed = isCompleted && !isCompletedStatus;
    
    const displayStatus = isRecentlyProcessed
      ? getNextStatusAfterComplete(actualProcessingRole, order.status)
      : order.status;

    const isAssignedToMe = Boolean(
      order.assignedTo?.id && 
      currentUser?.employee?.id &&
      order.assignedTo.id === currentUser.employee.id
    );

    return {
      displayStatus,
      isRecentlyProcessed,
      isAssignedToMe,
      isLocallyTaken: localAction?.taken,
    };
  }, [order.status, localAction, actualProcessingRole, currentUser]);
};

// ============== Компонент заказа ==============

const OrderItem = React.memo(({
  item,
  localAction,
  currentUser,
  actualProcessingRole,
  canViewAllOrders,
  showHistory,
  showWaitingStock,
  downloadingInvoices,
  permissions,
  onPress,
  onStatusUpdate,
  onTakeOrder,
  onReleaseOrder,
  onDownloadInvoice,
}) => {
  const orderStatus = useOrderStatus(item, localAction, actualProcessingRole, currentUser);

  if (showWaitingStock && item.status === 'WAITING_STOCK') {
    return (
      <WaitingStockOrderCard
        order={item}
        onPress={onPress}
        showClient={canViewAllOrders}
        showEmployeeInfo
        isRecentlyProcessed={orderStatus.isRecentlyProcessed}
      />
    );
  }

  const canUpdateStatus = permissions.canUpdateOrderStatus(item.status) &&
    (orderStatus.isAssignedToMe || orderStatus.isLocallyTaken);

  const canTakeOrder = permissions.canWorkWithOrders &&
                       canEmployeeTakeOrderByRole(actualProcessingRole, item.status) &&
                       orderStateHelpers.canTakeOrder(item, localAction, currentUser);

  return (
    <OrderCard
      order={{ ...item, status: orderStatus.displayStatus }}
      onPress={onPress}
      showClient={canViewAllOrders}
      showActions
      onStatusUpdate={canUpdateStatus ? onStatusUpdate : null}
      onTakeOrder={canTakeOrder ? onTakeOrder : null}
      onReleaseOrder={permissions.canWorkWithOrders && canUpdateStatus ? onReleaseOrder : null}
      onDownloadInvoice={onDownloadInvoice}
      canTake={canTakeOrder}
      isTakenByMe={permissions.canWorkWithOrders && orderStateHelpers.isTakenByCurrentUser(item, localAction, currentUser)}
      downloadingInvoice={downloadingInvoices.has(item.id)}
      showProcessingInfo={canViewAllOrders}
      showEmployeeInfo
      availableStatusesProvider={() => []}
      isRecentlyProcessed={orderStatus.isRecentlyProcessed}
      isHistoryOrder={showHistory}
    />
  );
});

OrderItem.displayName = 'OrderItem';

// ============== Основной компонент ==============

export const StaffOrdersScreen = () => (
  <OrderDetailsScreenThemeProvider darkScreenBackground={ORDER_DETAILS_CLIENT_DARK_BACKGROUND}>
    <StaffOrdersScreenContent />
  </OrderDetailsScreenThemeProvider>
);

const StaffOrdersScreenContent = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const listBottomPadding = 80 + insets.bottom + 12;
  
  const scrollY = useRef(new Animated.Value(0)).current;

  const {
    filters,
    setFilters,
    showHistory,
    showWaitingStock,
    downloadingInvoices,
    toastConfig,
    setToastConfig,
    statusModalVisible,
    selectedOrder,
    availableStatuses,
    selectedStatus,
    statusComment,
    updatingStatus,
    isLoading,
    isRefreshing,
    isInitializing,
    currentUser,
    canViewAllOrders,
    actualProcessingRole,
    localOrderActions,
    isWebSocketConnected,
    handleRefreshData,
    loadMore,
    loadingMore,
    handleTakeOrder,
    handleReleaseOrder,
    handleDownloadInvoice,
    handleStatusUpdate,
    handleConfirmStatusChange,
    handleToggleHistory,
    handleToggleWaitingStock,
    handleToggleMain,
    handleCloseStatusModal,
    handleStatusSelect,
    handleStatusCommentChange,
    filteredOrders,
    waitingStockCount,
  } = useStaffOrdersScreen();

  const permissions = useOrderPermissions(currentUser, actualProcessingRole, showHistory);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOrderPress = useCallback((orderId) => {
    navigation.navigate('StaffOrderDetails', { orderId });
  }, [navigation]);

  const HEADER_HEIGHT = 60;
  const stickyActivationPoint = HEADER_HEIGHT;
  
  const isSticky = scrollY.interpolate({
    inputRange: [0, stickyActivationPoint, stickyActivationPoint + 1],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const stickyTabsElevation = scrollY.interpolate({
    inputRange: [0, stickyActivationPoint, stickyActivationPoint + 50],
    outputRange: [0, 2, 8],
    extrapolate: 'clamp',
  });

  const stickyTabsShadowOpacity = scrollY.interpolate({
    inputRange: [0, stickyActivationPoint, stickyActivationPoint + 50],
    outputRange: [0, 0.1, 0.25],
    extrapolate: 'clamp',
  });

  const [stickyVisible, setStickyVisible] = React.useState(false);
  
  React.useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      const shouldBeVisible = value >= stickyActivationPoint;
      if (shouldBeVisible !== stickyVisible) {
        setStickyVisible(shouldBeVisible);
      }
    });
    
    return () => scrollY.removeListener(listenerId);
  }, [scrollY, stickyActivationPoint, stickyVisible]);

  const renderOrderItem = useCallback(({ item }) => {
    const localAction = localOrderActions[item.id];

    return (
      <OrderItem
        item={item}
        localAction={localAction}
        currentUser={currentUser}
        actualProcessingRole={actualProcessingRole}
        canViewAllOrders={canViewAllOrders}
        showHistory={showHistory}
        showWaitingStock={showWaitingStock}
        downloadingInvoices={downloadingInvoices}
        permissions={permissions}
        onPress={() => handleOrderPress(item.id)}
        onStatusUpdate={() => handleStatusUpdate(item.id)}
        onTakeOrder={() => handleTakeOrder(item.id)}
        onReleaseOrder={() => handleReleaseOrder(item.id)}
        onDownloadInvoice={() => handleDownloadInvoice(item.id)}
      />
    );
  }, [
    localOrderActions,
    currentUser,
    actualProcessingRole,
    canViewAllOrders,
    showHistory,
    showWaitingStock,
    downloadingInvoices,
    permissions,
    handleOrderPress,
    handleStatusUpdate,
    handleTakeOrder,
    handleReleaseOrder,
    handleDownloadInvoice,
  ]);

  const renderCardSeparator = useCallback(() => (
    <View style={styles.cardSeparator} />
  ), [styles.cardSeparator]);

  if (isInitializing || !currentUser) {
    return <OrdersSkeleton onGoBack={handleGoBack} />;
  }

  return (
    <View style={styles.container} keyboardShouldPersistTaps="always">
      <ThemedStatusBar />

      {stickyVisible && (currentUser?.role === 'EMPLOYEE' || currentUser?.role === 'ADMIN') && (
        <Animated.View
          style={[
            styles.stickyTabsContainer,
            {
              opacity: isSticky,
              elevation: stickyTabsElevation,
              shadowOpacity: stickyTabsShadowOpacity,
              top: 0,
            },
          ]}
          pointerEvents="auto"
        >
          <OrdersHeader
            canViewAllOrders={canViewAllOrders}
            actualProcessingRole={actualProcessingRole}
            showHistory={showHistory}
            showWaitingStock={showWaitingStock}
            filters={filters}
            onFiltersChange={setFilters}
            onToggleHistory={handleToggleHistory}
            onToggleWaitingStock={handleToggleWaitingStock}
            onToggleMain={handleToggleMain}
            onGoBack={handleGoBack}
            waitingStockCount={waitingStockCount}
            isWebSocketConnected={isWebSocketConnected}
            stickyMode={true}
          />
        </Animated.View>
      )}

      <Animated.FlatList
        data={filteredOrders}
        ListHeaderComponent={
          <OrdersHeader
            canViewAllOrders={canViewAllOrders}
            actualProcessingRole={actualProcessingRole}
            showHistory={showHistory}
            showWaitingStock={showWaitingStock}
            filters={filters}
            onFiltersChange={setFilters}
            onToggleHistory={handleToggleHistory}
            onToggleWaitingStock={handleToggleWaitingStock}
            onToggleMain={handleToggleMain}
            onGoBack={handleGoBack}
            waitingStockCount={waitingStockCount}
            isWebSocketConnected={isWebSocketConnected}
            stickyMode={false}
          />
        }
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id.toString()}
        keyboardShouldPersistTaps="always"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefreshData}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={
          <EmptyOrdersList
            canViewAllOrders={canViewAllOrders}
            showHistory={showHistory}
            showWaitingStock={showWaitingStock}
            actualProcessingRole={actualProcessingRole}
            isLoading={isLoading}
          />
        }
        contentContainerStyle={[styles.listContentContainer, { paddingBottom: listBottomPadding }]}
        ItemSeparatorComponent={renderCardSeparator}
        removeClippedSubviews={false}
        maxToRenderPerBatch={10}
        initialNumToRender={8}
        windowSize={10}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.footerLoader} />
          ) : null
        }
      />

      <StatusUpdateModal
        visible={statusModalVisible}
        selectedOrder={selectedOrder}
        availableStatuses={availableStatuses}
        selectedStatus={selectedStatus}
        statusComment={statusComment}
        updatingStatus={updatingStatus}
        canViewAllOrders={canViewAllOrders}
        employeeProcessingRole={actualProcessingRole}
        onClose={handleCloseStatusModal}
        onStatusSelect={handleStatusSelect}
        onCommentChange={handleStatusCommentChange}
        onConfirm={handleConfirmStatusChange}
      />

      {toastConfig && (
        <ToastSimple
          message={toastConfig.message}
          type={toastConfig.type}
          duration={toastConfig.duration}
          onHide={() => setToastConfig(null)}
        />
      )}
    </View>
  );
};

const createStyles = (colors, isDark) => {
  const headerBackground = isDark ? ORDER_DETAILS_CLIENT_DARK_BACKGROUND : colors.cardBackground;

  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stickyTabsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: headerBackground,
    shadowColor: colors.shadowColor || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    borderBottomWidth: isDark ? 1 : 0,
    borderBottomColor: colors.border,
    ...Platform.select({
      android: {
        elevation: 0,
      },
    }),
  },
  listContentContainer: {
    paddingHorizontal: 10,
  },
  cardSeparator: {
    height: 8,
  },
  footerLoader: {
    marginVertical: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
};
