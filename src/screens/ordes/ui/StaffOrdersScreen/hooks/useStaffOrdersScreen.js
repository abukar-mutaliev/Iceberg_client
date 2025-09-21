import { useState, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Alert } from 'react-native';

import { useAuth } from '@entities/auth/hooks/useAuth';
import { useOrders } from '@entities/order/hooks/useOrders';
import { useStaffOrders } from '@entities/order/hooks/useStaffOrders';
import { useOrderPermissions } from '@entities/order/hooks/useOrderPermissions';
import { useOrderFiltering } from '@entities/order/hooks/useOrderFiltering';
import { selectLocalOrderActions, setLocalOrderAction, clearLocalOrderAction } from '@entities/order';
import { orderStateHelpers } from '@entities/order/lib/orderStateHelpers';
import { getAvailableStatuses, CONSTANTS } from '@entities/order';

export const useStaffOrdersScreen = () => {
    const dispatch = useDispatch();
    const { currentUser } = useAuth();

    // Состояние компонента
    const [filters, setFilters] = useState({});
    const [showHistory, setShowHistory] = useState(false);
    const [downloadingInvoices, setDownloadingInvoices] = useState(new Set());
    const [toastConfig, setToastConfig] = useState(null);

    // Модальное окно статуса
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [availableStatuses, setAvailableStatuses] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [statusComment, setStatusComment] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Refs
    const isMountedRef = useRef(true);

    // Хуки данных
    const {
        staffOrders,
        isLoading,
        refreshing: isRefreshing,
        initializing: isInitializing,
        dataLoaded,
        loadInitialData,
        handleRefresh: handleRefreshData
    } = useStaffOrders();

    const localOrderActions = useSelector(selectLocalOrderActions);
    const { downloadInvoice, updateStatus, completeOrderStage, takeOrder, releaseOrder, cancelOrderById } = useOrders();
    const { canViewAllOrders, actualProcessingRole, relevantStatuses, historyStatuses } = useOrderPermissions(currentUser);

    const filteredOrders = useOrderFiltering(staffOrders, filters, canViewAllOrders, actualProcessingRole, relevantStatuses, historyStatuses, showHistory);

    // Мемоизированные значения
    const stableLocalOrderActions = useMemo(() => localOrderActions || {}, [localOrderActions]);
    const stableDownloadingInvoices = useMemo(() => downloadingInvoices, [downloadingInvoices.size]);
    const stableStaffOrders = useMemo(() => staffOrders || [], [staffOrders?.length]);
    const stableFilteredOrders = useMemo(() => filteredOrders || [], [filteredOrders?.length]);

    // Обработчики действий с заказами
    const handleTakeOrder = useCallback(async (orderId) => {
        try {
            dispatch(setLocalOrderAction({
                orderId: orderId,
                action: 'taken',
                value: true
            }));

            const res = await takeOrder(orderId, 'Взял заказ в работу');
            if (!res.success) throw new Error(res.error);

            setToastConfig({
                message: 'Заказ взят в работу',
                type: 'success',
                duration: 3000
            });
            loadInitialData(true);
        } catch (e) {
            console.error('Ошибка при взятии заказа:', e);
            dispatch(clearLocalOrderAction({ orderId: orderId }));
            Alert.alert('Ошибка', e.message || 'Не удалось взять заказ');
        }
    }, [takeOrder, dispatch, loadInitialData]);

    const handleReleaseOrder = useCallback(async (orderId) => {
        try {
            const result = await releaseOrder(orderId, 'Снят с работы сотрудником');
            if (!result.success) throw new Error(result.error);

            dispatch(clearLocalOrderAction({ orderId }));

            setToastConfig({
                message: 'Заказ снят с работы',
                type: 'success',
                duration: 3000
            });

            setTimeout(() => {
                loadInitialData(true);
            }, CONSTANTS.RELEASE_ORDER_DELAY);

        } catch (e) {
            console.error('Ошибка при снятии заказа:', e);
            Alert.alert('Ошибка', e.message || 'Не удалось снять заказ с работы');
        }
    }, [releaseOrder, dispatch, loadInitialData]);

    const handleDownloadInvoice = useCallback(async (orderId) => {
        try {
            setDownloadingInvoices(prev => new Set([...prev, orderId]));
            const result = await downloadInvoice(orderId);
            if (result.success) {
                Alert.alert('Успех', `Накладная "${result.filename}" успешно сохранена`);
            } else {
                Alert.alert('Ошибка', result.error || 'Не удалось скачать накладную');
            }
        } catch (error) {
            Alert.alert('Ошибка', error.message || 'Не удалось скачать накладную');
        } finally {
            setDownloadingInvoices(prev => {
                const newSet = new Set(prev);
                newSet.delete(orderId);
                return newSet;
            });
        }
    }, [downloadInvoice]);

    // Обработчики модального окна статуса
    const handleStatusUpdate = useCallback((orderId) => {
        const order = stableFilteredOrders?.find(o => o.id === orderId) || stableStaffOrders?.find(o => o.id === orderId);

        if (!order) {
            Alert.alert('Ошибка', 'Заказ не найден. Попробуйте обновить экран.');
            return;
        }

        const availableStatuses = getAvailableStatuses(order.status);
        const canEmployeeCancel = !canViewAllOrders && actualProcessingRole && ['PICKER','PACKER','COURIER'].includes(actualProcessingRole);
        const extendedStatuses = canEmployeeCancel
            ? [...availableStatuses, { value: 'CANCELLED', label: 'Отменить заказ', color: '#dc3545' }]
            : availableStatuses;

        if (availableStatuses.length === 0) {
            Alert.alert('Информация', 'Для этого заказа нет доступных статусов для изменения');
            return;
        }

        setSelectedOrder(order);
        setAvailableStatuses(extendedStatuses);
        setSelectedStatus('');
        setStatusComment('');
        setStatusModalVisible(true);
    }, [stableFilteredOrders, stableStaffOrders, canViewAllOrders, actualProcessingRole]);

    const handleConfirmStatusChange = useCallback(async () => {
        if (!selectedOrder) {
            Alert.alert('Ошибка', 'Заказ не выбран');
            return;
        }

        if (canViewAllOrders && !selectedStatus) {
            Alert.alert('Ошибка', 'Выберите новый статус');
            return;
        }

        try {
            setUpdatingStatus(true);

            let result;

            if (canViewAllOrders) {
                result = await updateStatus(selectedOrder.id, {
                    status: selectedStatus,
                    comment: statusComment.trim() || undefined,
                    notifyClient: true
                });
            } else {
                if (selectedStatus === 'CANCELLED') {
                    result = await cancelOrderById(selectedOrder.id, { reason: statusComment.trim() || 'Отменено сотрудником' }, false);
                } else {
                    result = await completeOrderStage(selectedOrder.id, statusComment.trim() || undefined);
                }
            }

            if (result.success) {
                if (!canViewAllOrders && selectedOrder) {
                    dispatch(setLocalOrderAction({
                        orderId: selectedOrder.id,
                        action: 'completed',
                        value: true
                    }));
                }

                setToastConfig({
                    message: canViewAllOrders ? 'Статус заказа успешно изменен' : 'Этап заказа успешно завершен',
                    type: 'success',
                    duration: 3000
                });

                setStatusModalVisible(false);
                setSelectedOrder(null);
                setSelectedStatus('');
                setStatusComment('');

                setTimeout(() => {
                    loadInitialData(true);
                }, CONSTANTS.STATUS_UPDATE_DELAY);
            } else {
                Alert.alert('Ошибка', result.error || 'Не удалось изменить статус заказа');
            }
        } catch (error) {
            Alert.alert('Ошибка', error.message || 'Не удалось изменить статус заказа');
        } finally {
            setUpdatingStatus(false);
        }
    }, [selectedOrder, selectedStatus, statusComment, updateStatus, completeOrderStage, cancelOrderById, canViewAllOrders, dispatch, loadInitialData]);

    // Обработчики состояния
    const handleToggleHistory = useCallback(() => {
        setShowHistory(prev => !prev);
    }, []);

    const handleCloseStatusModal = useCallback(() => {
        setStatusModalVisible(false);
        setSelectedOrder(null);
        setSelectedStatus('');
        setStatusComment('');
    }, []);

    const handleStatusSelect = useCallback((status) => {
        setSelectedStatus(status);
    }, []);

    const handleStatusCommentChange = useCallback((text) => {
        setStatusComment(text);
    }, []);

    // Фокус эффекты
    useFocusEffect(
        useCallback(() => {
            loadInitialData(true);
        }, [loadInitialData])
    );

    return {
        // Состояние
        filters,
        setFilters,
        showHistory,
        downloadingInvoices: stableDownloadingInvoices,
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
        staffOrders: stableStaffOrders,
        filteredOrders: stableFilteredOrders,
        isLoading,
        isRefreshing,
        isInitializing,
        dataLoaded,
        currentUser,
        canViewAllOrders,
        actualProcessingRole,

        // Actions
        localOrderActions: stableLocalOrderActions,
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
    };
};
