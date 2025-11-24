import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '@entities/auth/hooks/useAuth';
import { useOrders } from '@entities/order/hooks/useOrders';
import { useStaffOrders } from '@entities/order/hooks/useStaffOrders';
import { useOrderPermissions } from '@entities/order/hooks/useOrderPermissions';
import { useOrderFiltering } from '@entities/order/hooks/useOrderFiltering';
import { useRealtimeOrders } from '@entities/order/hooks/useRealtimeOrders';
import { 
    selectLocalOrderActions, 
    selectActiveStaffOrders,
    selectHistoryStaffOrders,
    selectWaitingStockStaffOrders,
    setLocalOrderAction, 
    clearLocalOrderAction, 
    updateOrderInList, 
    selectWaitingStockCountCombined, 
    fetchStaffOrders, 
    clearStaffOrdersData 
} from '@entities/order';
import { getAvailableStatuses } from '@entities/order';
import { useCustomAlert } from '@shared/ui/CustomAlert';

export const useStaffOrdersScreen = () => {
    const dispatch = useDispatch();
    const { currentUser } = useAuth();
    const { showError, showSuccess, showInfo } = useCustomAlert();

    // Состояние компонента
    const [filters, setFilters] = useState({});
    const [showHistory, setShowHistory] = useState(false);
    const [showWaitingStock, setShowWaitingStock] = useState(false);
    const [downloadingInvoices, setDownloadingInvoices] = useState(new Set());
    const [toastConfig, setToastConfig] = useState(null);
    const [localRefreshing, setLocalRefreshing] = useState(false);
    
    // Флаги для отслеживания что данные уже загружены
    const [historyDataLoaded, setHistoryDataLoaded] = useState(false);
    const [waitingStockDataLoaded, setWaitingStockDataLoaded] = useState(false);

    // Модальное окно статуса
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [availableStatuses, setAvailableStatuses] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [statusComment, setStatusComment] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Refs
    const isMountedRef = useRef(true);
    const loadMoreTimeoutRef = useRef(null);
    const lastLoadMoreTimeRef = useRef(0);
    
    // Cleanup при размонтировании
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (loadMoreTimeoutRef.current) {
                clearTimeout(loadMoreTimeoutRef.current);
            }
        };
    }, []);

    // Хуки данных
    const {
        staffOrders,
        isLoading,
        refreshing: isRefreshing,
        initializing: isInitializing,
        dataLoaded,
        loadInitialData,
        loadingMore,
    } = useStaffOrders();

    // Получаем данные из Redux
    const activeOrders = useSelector(selectActiveStaffOrders);
    const historyOrders = useSelector(selectHistoryStaffOrders);
    const waitingOrders = useSelector(selectWaitingStockStaffOrders);
    
    const localOrderActions = useSelector(selectLocalOrderActions);
    const { downloadInvoice, updateStatus, completeOrderStage, takeOrder, releaseOrder, cancelOrderById } = useOrders();
    const { canViewAllOrders, actualProcessingRole, relevantStatuses, historyStatuses } = useOrderPermissions(currentUser);
    
    // WebSocket для реального времени
    const { isConnected: isWebSocketConnected, subscribeToOrders, unsubscribeFromOrders, forceReconnect } = useRealtimeOrders();

    // КРИТИЧНО: Правильный выбор источника данных (раздельные хранилища)
    const staffOrdersSource = useMemo(() => {
        console.log('📊 Выбор источника данных:', {
            showHistory,
            showWaitingStock,
            activeOrdersCount: activeOrders?.length || 0,
            waitingStockOrdersCount: waitingOrders?.length || 0,
            historyOrdersCount: historyOrders?.length || 0
        });
        
        if (showHistory) {
            return historyOrders || [];
        }

        if (showWaitingStock) {
            return waitingOrders || [];
        }

        return activeOrders || [];
    }, [showHistory, showWaitingStock, activeOrders, waitingOrders, historyOrders]);

    // Используем существующий хук фильтрации
    const filteredOrders = useOrderFiltering(
        staffOrdersSource, 
        filters, 
        canViewAllOrders, 
        actualProcessingRole, 
        relevantStatuses, 
        historyStatuses, 
        showHistory, 
        showWaitingStock
    );
    
    console.log('✅ Результат фильтрации:', {
        showHistory,
        showWaitingStock,
        sourceCount: staffOrdersSource?.length || 0,
        filteredCount: filteredOrders?.length || 0
    });
    
    // Отслеживаем количество отфильтрованных заказов
    const prevFilteredCountRef = useRef(0);
    const emptyPagesCountRef = useRef(0);

    // Подсчет заказов, ожидающих поставки
    const waitingStockCount = useSelector(selectWaitingStockCountCombined);

    // Подписка на WebSocket
    useEffect(() => {
        if (isWebSocketConnected && isMountedRef.current && currentUser?.employee?.id) {
            const subscriptionTimeout = setTimeout(() => {
                subscribeToOrders({
                    employeeId: currentUser.employee.id,
                    warehouseId: currentUser.employee.warehouseId
                });
            }, 500);

            return () => {
                clearTimeout(subscriptionTimeout);
            };
        }

        return () => {
            if (isWebSocketConnected) {
                unsubscribeFromOrders();
            }
        };
    }, [isWebSocketConnected, currentUser?.employee?.id, currentUser?.employee?.warehouseId, subscribeToOrders, unsubscribeFromOrders]);

    useEffect(() => {
        if (isWebSocketConnected && isMountedRef.current && dataLoaded) {
            subscribeToOrders({
                employeeId: currentUser?.employee?.id,
                warehouseId: currentUser?.employee?.warehouseId
            });
        }
    }, [dataLoaded, isWebSocketConnected, subscribeToOrders, currentUser?.employee?.id, currentUser?.employee?.warehouseId]);
    
    // Отслеживаем изменения в фильтрованных заказах
    useEffect(() => {
        const currentCount = filteredOrders?.length || 0;
        
        if (prevFilteredCountRef.current === currentCount && currentCount === 0 && (staffOrdersSource?.length || 0) > 0) {
            emptyPagesCountRef.current += 1;
        } else {
            emptyPagesCountRef.current = 0;
        }
        
        prevFilteredCountRef.current = currentCount;
    }, [filteredOrders?.length, staffOrdersSource?.length]);
    
    
    // Обертка для loadMore с учетом текущего режима просмотра
    const loadMoreWithMode = useCallback(async () => {
        const state = dispatch((_, getState) => getState());
        const orderState = state.order?.staffOrders;
        
        if (!orderState || loadingMore || isLoading) {
            return;
        }
        
        const currentPage = orderState.page || 1;
        const totalPages = orderState.pages || 1;
        const hasMore = orderState.hasMore !== false && currentPage < totalPages;
        
        if (!hasMore) {
            return;
        }
        
        try {
            const nextPage = currentPage + 1;
            const params = { 
                page: nextPage,
                forceRefresh: false 
            };
            
            if (showHistory) {
                params.history = true;
            }
            // Не передаем status - WAITING_STOCK фильтруется на клиенте
            
            await dispatch(fetchStaffOrders(params)).unwrap();
            
        } catch (error) {
            console.error('❌ Ошибка при загрузке следующей страницы:', error);
        }
    }, [dispatch, loadingMore, isLoading, showHistory]);
    
    // Условный loadMore
    const conditionalLoadMore = useCallback(() => {
        const now = Date.now();
        if (now - lastLoadMoreTimeRef.current < 1000) {
            return;
        }
        
        if (emptyPagesCountRef.current >= 3 && (filteredOrders?.length || 0) === 0) {
            if (emptyPagesCountRef.current === 3) {
                console.log('🛑 Прекращаем загрузку: 3+ пустых страниц подряд');
            }
            return;
        }
        
        if (isLoading || loadingMore || isRefreshing) {
            return;
        }
        
        if (loadMoreTimeoutRef.current) {
            clearTimeout(loadMoreTimeoutRef.current);
        }
        
        loadMoreTimeoutRef.current = setTimeout(() => {
            lastLoadMoreTimeRef.current = Date.now();
            loadMoreWithMode();
        }, 300);
    }, [loadMoreWithMode, filteredOrders?.length, isLoading, loadingMore, isRefreshing]);
    
    // Мемоизированные значения
    const stableLocalOrderActions = useMemo(() => localOrderActions || {}, [localOrderActions]);
    const stableDownloadingInvoices = useMemo(() => downloadingInvoices, [downloadingInvoices.size]);
    const stableStaffOrders = useMemo(() => staffOrdersSource || [], [staffOrdersSource]);
    const stableFilteredOrders = useMemo(() => filteredOrders || [], [filteredOrders]);

    // Обновление данных
    const handleRefreshData = useCallback(async () => {
        setLocalRefreshing(true);
        try {
            console.log('🔄 handleRefreshData:', { 
                showHistory, 
                showWaitingStock,
                currentOrdersCount: staffOrdersSource?.length 
            });
            
            if (showHistory) {
                console.log('🔄 Обновляем историю заказов');
                dispatch(clearStaffOrdersData({ target: 'history' }));
                await dispatch(fetchStaffOrders({ history: true, forceRefresh: true })).unwrap();
                setHistoryDataLoaded(true);
            } else if (showWaitingStock) {
                // Для WAITING_STOCK обновляем отдельное хранилище
                console.log('🔄 Обновляем заказы WAITING_STOCK');
                dispatch(clearStaffOrdersData({ target: 'waiting' }));
                await dispatch(fetchStaffOrders({ status: 'WAITING_STOCK', forceRefresh: true })).unwrap();
                setWaitingStockDataLoaded(true);
            } else {
                // Для активных обновляем activeOrders
                console.log('🔄 Обновляем активные заказы');
                dispatch(clearStaffOrdersData({ target: 'active' }));
                await dispatch(fetchStaffOrders({ forceRefresh: true })).unwrap();
            }
            
            console.log('✅ Обновление завершено');
        } catch (error) {
            console.error('❌ Ошибка при обновлении:', error);
        } finally {
            setLocalRefreshing(false);
        }
    }, [showHistory, showWaitingStock, dispatch, staffOrdersSource?.length]);

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

            dispatch(updateOrderInList({
                orderId: orderId,
                updates: {
                    assignedToId: currentUser?.employee?.id,
                    assignedTo: currentUser?.employee
                }
            }));

            setToastConfig({
                message: 'Заказ взят в работу',
                type: 'success',
                duration: 3000
            });

        } catch (e) {
            console.error('Ошибка при взятии заказа:', e);
            dispatch(clearLocalOrderAction({ orderId: orderId }));
            showError('Ошибка', e.message || 'Не удалось взять заказ');
        }
    }, [takeOrder, dispatch, currentUser, showError]);

    const handleReleaseOrder = useCallback(async (orderId) => {
        try {
            const result = await releaseOrder(orderId, 'Снят с работы сотрудником');
            if (!result.success) throw new Error(result.error);

            dispatch(setLocalOrderAction({
                orderId: orderId,
                action: 'released',
                value: true
            }));

            dispatch(setLocalOrderAction({
                orderId: orderId,
                action: 'taken',
                value: false
            }));

            dispatch(updateOrderInList({
                orderId: orderId,
                updates: {
                    assignedToId: null,
                    assignedTo: null
                }
            }));

            setToastConfig({
                message: 'Заказ снят с работы',
                type: 'success',
                duration: 3000
            });

        } catch (e) {
            console.error('Ошибка при снятии заказа:', e);
            showError('Ошибка', e.message || 'Не удалось снять заказ с работы');
        }
    }, [releaseOrder, dispatch, showError]);

    const handleDownloadInvoice = useCallback(async (orderId) => {
        try {
            setDownloadingInvoices(prev => new Set([...prev, orderId]));
            const result = await downloadInvoice(orderId);
            if (result.success) {
                showSuccess(`Накладная "${result.filename}" успешно сохранена`);
            } else {
                showError('Ошибка', result.error || 'Не удалось скачать накладную');
            }
        } catch (error) {
            showError('Ошибка', error.message || 'Не удалось скачать накладную');
        } finally {
            setDownloadingInvoices(prev => {
                const newSet = new Set(prev);
                newSet.delete(orderId);
                return newSet;
            });
        }
    }, [downloadInvoice, showSuccess, showError]);

    // Обработчики модального окна статуса
    const handleStatusUpdate = useCallback((orderId) => {
        const order = stableFilteredOrders?.find(o => o.id === orderId) || stableStaffOrders?.find(o => o.id === orderId);

        if (!order) {
            showError('Ошибка', 'Заказ не найден. Попробуйте обновить экран.');
            return;
        }

        const availableStatuses = getAvailableStatuses(order.status);
        const canEmployeeCancel = !canViewAllOrders && actualProcessingRole && ['PICKER','PACKER','COURIER'].includes(actualProcessingRole);
        const extendedStatuses = canEmployeeCancel
            ? [...availableStatuses, { value: 'CANCELLED', label: 'Отменить заказ', color: '#dc3545' }]
            : availableStatuses;

        if (availableStatuses.length === 0) {
            showInfo('Информация', 'Для этого заказа нет доступных статусов для изменения');
            return;
        }

        setSelectedOrder(order);
        setAvailableStatuses(extendedStatuses);
        setSelectedStatus('');
        setStatusComment('');
        setStatusModalVisible(true);
    }, [stableFilteredOrders, stableStaffOrders, canViewAllOrders, actualProcessingRole, showError, showInfo]);

    const handleConfirmStatusChange = useCallback(async () => {
        if (!selectedOrder) {
            showError('Ошибка', 'Заказ не выбран');
            return;
        }

        if (canViewAllOrders && !selectedStatus) {
            showError('Ошибка', 'Выберите новый статус');
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
                    
                    const newStatus = actualProcessingRole === 'PICKER' ? 'IN_DELIVERY' : 
                                     actualProcessingRole === 'COURIER' ? 'DELIVERED' : 
                                     selectedOrder.status;
                    
                    dispatch(updateOrderInList({
                        orderId: selectedOrder.id,
                        updates: {
                            status: newStatus,
                            assignedToId: null,
                            assignedTo: null
                        }
                    }));
                    
                    setHistoryDataLoaded(false);
                    
                    console.log(`✅ Заказ обработан: ${selectedOrder.status} → ${newStatus}`);
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
            } else {
                showError('Ошибка', result.error || 'Не удалось изменить статус заказа');
            }
        } catch (error) {
            showError('Ошибка', error.message || 'Не удалось изменить статус заказа');
        } finally {
            setUpdatingStatus(false);
        }
    }, [selectedOrder, selectedStatus, statusComment, updateStatus, completeOrderStage, cancelOrderById, canViewAllOrders, dispatch, actualProcessingRole, showError]);

    // Обработчики переключения вкладок
    const handleToggleHistory = useCallback(async () => {
        emptyPagesCountRef.current = 0;
        prevFilteredCountRef.current = 0;
        
        const newShowHistory = !showHistory;
        
        console.log('🔍 handleToggleHistory:', { 
            from: showHistory, 
            to: newShowHistory 
        });
        
        setShowHistory(newShowHistory);
        
        if (newShowHistory) {
            // Переключаемся НА историю
            setShowWaitingStock(false);
            
            if (!historyDataLoaded) {
                try {
                    console.log('📥 Загружаем историю первый раз');
                    await dispatch(fetchStaffOrders({ history: true, forceRefresh: true })).unwrap();
                    setHistoryDataLoaded(true);
                } catch (error) {
                    console.error('❌ Ошибка загрузки истории:', error);
                }
            }
        }
        // Если переключаемся С истории на активные - ничего не делаем, данные уже есть
    }, [showHistory, historyDataLoaded, dispatch]);

    const handleToggleWaitingStock = useCallback(async () => {
        emptyPagesCountRef.current = 0;
        prevFilteredCountRef.current = 0;
        
        const newShowWaitingStock = !showWaitingStock;
        
        console.log('🔍 handleToggleWaitingStock:', { 
            from: showWaitingStock, 
            to: newShowWaitingStock,
            currentActiveOrders: activeOrders?.length || 0,
            alreadyLoaded: waitingStockDataLoaded
        });
        
        setShowWaitingStock(newShowWaitingStock);
        setShowHistory(false);
        
        // Загружаем WAITING_STOCK только если еще не загружены
        if (newShowWaitingStock && !waitingStockDataLoaded) {
            try {
                console.log('📥 Загружаем WAITING_STOCK заказы первый раз');
                await dispatch(fetchStaffOrders({ status: 'WAITING_STOCK', forceRefresh: true })).unwrap();
                setWaitingStockDataLoaded(true);
            } catch (error) {
                console.error('❌ Ошибка загрузки WAITING_STOCK:', error);
            }
        } else if (newShowWaitingStock) {
            console.log('✅ WAITING_STOCK уже загружены, используем кэш');
        }
    }, [showWaitingStock, waitingStockDataLoaded, dispatch, activeOrders?.length]);

    const handleToggleMain = useCallback(() => {
        console.log('🔍 handleToggleMain: переключаем на активные');
        
        emptyPagesCountRef.current = 0;
        prevFilteredCountRef.current = 0;
        
        setShowHistory(false);
        setShowWaitingStock(false);
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
            if (!isWebSocketConnected) {
                forceReconnect();
            }
            
            if (!dataLoaded) {
                if (showHistory) {
                    dispatch(fetchStaffOrders({ history: true, forceRefresh: true }));
                } else {
                    loadInitialData(true);
                }
            }
        }, [loadInitialData, isWebSocketConnected, forceReconnect, dataLoaded, showHistory, dispatch])
    );

    return {
        // Состояние
        filters,
        setFilters,
        showHistory,
        showWaitingStock,
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
        waitingStockCount,
        isLoading,
        isRefreshing: localRefreshing,
        isInitializing,
        dataLoaded,
        currentUser,
        canViewAllOrders,
        actualProcessingRole,

        // Actions
        localOrderActions: stableLocalOrderActions,
        isWebSocketConnected,
        handleRefreshData,
        loadMore: conditionalLoadMore,
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
    };
};