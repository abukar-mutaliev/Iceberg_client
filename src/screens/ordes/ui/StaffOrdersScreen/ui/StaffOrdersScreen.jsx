import React, { useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { OrderCard } from '@entities/order/ui/OrderCard';
import { orderStateHelpers } from '@entities/order/lib/orderStateHelpers';
import { CONSTANTS } from '@entities/order';
import { useStaffOrdersScreen } from '../hooks/useStaffOrdersScreen';
import { StatusUpdateModal } from '../ui/StatusUpdateModal';
import { OrdersHeader } from '../ui/OrdersHeader';
import { OrdersSkeleton } from '../ui/OrdersSkeleton';
import { ToastSimple } from '@shared/ui/Toast/ui/ToastSimple';

export const StaffOrdersScreen = () => {
    const navigation = useNavigation();

    // Используем кастомный хук для всей логики
    const {
        // Состояние
        filters,
        setFilters,
        showHistory,
        downloadingInvoices,
        toastConfig,
        setToastConfig,

        // Модальное окно статуса
        statusModalVisible,
        selectedOrder,
        availableStatuses,
        selectedStatus,
        statusComment,
        updatingStatus,

        // Данные
        staffOrders,
        filteredOrders,
        isLoading,
        isRefreshing,
        isInitializing,
        dataLoaded,
        currentUser,
        canViewAllOrders,
        actualProcessingRole,

        // Actions
        localOrderActions,
        handleRefreshData,
        handleTakeOrder,
        handleReleaseOrder,
        handleDownloadInvoice,
        handleStatusUpdate,
        handleConfirmStatusChange,
        handleToggleHistory,
        handleCloseStatusModal,
        handleStatusSelect,
        handleStatusCommentChange,
    } = useStaffOrdersScreen();

    // Обработчики для компонентов
    const handleGoBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleOrderPress = useCallback((orderId) => {
        navigation.navigate('StaffOrderDetails', { orderId });
    }, [navigation]);

    // Рендер карточки заказа
    const renderOrderItem = useCallback(({ item }) => {
        const localAction = localOrderActions[item.id];
        const isCompleted = localAction?.completed;
        const isCompletedStatus = CONSTANTS.COMPLETED_STATUSES.includes(item.status);

        // В режиме истории показываем все завершенные заказы
        if (showHistory) {
            // В истории показываем все заказы, не скрываем завершенные
        } else {
            // В активном режиме скрываем завершенные заказы
            if (isCompletedStatus) {
                return null;
            }
        }

        const canUpdateOrderStatus = (() => {
            if (CONSTANTS.COMPLETED_STATUSES.includes(item.status)) {
                return false;
            }

            if (canViewAllOrders) return true;

            if (showHistory && actualProcessingRole && actualProcessingRole !== 'COURIER') {
                return false;
            }

            const isAssignedToMe = Boolean(item.assignedTo?.id && currentUser?.employee?.id &&
                item.assignedTo.id === currentUser.employee.id);
            const isLocallyTaken = localAction?.taken;

            return isAssignedToMe || isLocallyTaken;
        })();

        // Определяем, был ли заказ только что обработан
        const isRecentlyProcessed = isCompleted && !isCompletedStatus;

        return (
            <OrderCard
                order={{
                    ...item,
                    // Если заказ обработан локально, показываем следующий статус в цепочке
                    status: isCompleted && !isCompletedStatus ?
                        (actualProcessingRole === 'PICKER' ? 'IN_DELIVERY' : // Пропускаем этап упаковки
                         actualProcessingRole === 'PACKER' ? 'PACKING_COMPLETED' : 'DELIVERED')
                        : item.status
                }}
                onPress={() => handleOrderPress(item.id)}
                showClient={canViewAllOrders}
                showActions={true}
                onStatusUpdate={canUpdateOrderStatus ? () => handleStatusUpdate(item.id) : null}
                onTakeOrder={() => handleTakeOrder(item.id)}
                onReleaseOrder={canUpdateOrderStatus ? () => handleReleaseOrder(item.id) : null}
                onDownloadInvoice={() => handleDownloadInvoice(item.id)}
                canTake={orderStateHelpers.canTakeOrder(item, localAction, currentUser)}
                isTakenByMe={orderStateHelpers.isTakenByCurrentUser(item, localAction, currentUser)}
                downloadingInvoice={downloadingInvoices.has(item.id)}
                showProcessingInfo={canViewAllOrders}
                showEmployeeInfo={true}
                availableStatusesProvider={() => []}
                isRecentlyProcessed={isRecentlyProcessed}
                isHistoryOrder={showHistory}
            />
        );
    }, [
        canViewAllOrders,
        showHistory,
        actualProcessingRole,
        localOrderActions,
        currentUser,
        handleOrderPress,
        handleStatusUpdate,
        handleTakeOrder,
        handleReleaseOrder,
        handleDownloadInvoice,
        downloadingInvoices
    ]);

    // Показываем скелетон при инициализации
    if (isInitializing || !currentUser) {
        return <OrdersSkeleton onGoBack={handleGoBack} />;
    }

    return (
        <View style={styles.container} keyboardShouldPersistTaps="always">
            <FlatList
                data={filteredOrders}
                ListHeaderComponent={
                    <OrdersHeader
                        canViewAllOrders={canViewAllOrders}
                        actualProcessingRole={actualProcessingRole}
                        showHistory={showHistory}
                        filters={filters}
                        onFiltersChange={setFilters}
                        onToggleHistory={handleToggleHistory}
                        onGoBack={handleGoBack}
                    />
                }
                renderItem={renderOrderItem}
                keyExtractor={(item) => item.id.toString()}
                keyboardShouldPersistTaps="always"
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing || isLoading}
                        onRefresh={handleRefreshData}
                    />
                }
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {canViewAllOrders
                                ? 'Нет заказов для отображения'
                                : showHistory
                                    ? 'История обработки пуста'
                                    : `Нет ${actualProcessingRole === 'PICKER' ? 'новых заказов для сборки' :
                                        actualProcessingRole === 'PACKER' ? 'заказов для упаковки' :
                                        actualProcessingRole === 'COURIER' ? 'заказов для доставки' : 'заказов для обработки'}`
                            }
                        </Text>
                    </View>
                )}
                contentContainerStyle={styles.listContentContainer}
                ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                initialNumToRender={8}
                windowSize={10}
            />

            {/* Модальное окно изменения статуса */}
            <StatusUpdateModal
                visible={statusModalVisible}
                selectedOrder={selectedOrder}
                availableStatuses={availableStatuses}
                selectedStatus={selectedStatus}
                statusComment={statusComment}
                updatingStatus={updatingStatus}
                canViewAllOrders={canViewAllOrders}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    listContentContainer: {
        paddingHorizontal: 10,
        paddingTop: 24,
    },
    cardSeparator: {
        height: 20,
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
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
});
