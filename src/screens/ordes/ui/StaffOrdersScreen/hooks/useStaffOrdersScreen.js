import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Alert } from 'react-native';

import { useAuth } from '@entities/auth/hooks/useAuth';
import { useOrders } from '@entities/order/hooks/useOrders';
import { useStaffOrders } from '@entities/order/hooks/useStaffOrders';
import { useOrderPermissions } from '@entities/order/hooks/useOrderPermissions';
import { useOrderFiltering } from '@entities/order/hooks/useOrderFiltering';
import { useRealtimeOrders } from '@entities/order/hooks/useRealtimeOrders';
import { selectLocalOrderActions, setLocalOrderAction, clearLocalOrderAction, updateOrderInList, selectWaitingStockCountCombined, fetchStaffOrders, clearStaffOrdersData } from '@entities/order';
import { orderStateHelpers } from '@entities/order/lib/orderStateHelpers';
import { getAvailableStatuses, CONSTANTS } from '@entities/order';

export const useStaffOrdersScreen = () => {
    const dispatch = useDispatch();
    const { currentUser } = useAuth();

    // Состояние компонента
    const [filters, setFilters] = useState({});
    const [showHistory, setShowHistory] = useState(false);
    const [showWaitingStock, setShowWaitingStock] = useState(false);
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
        handleRefresh: handleRefreshData,
        loadMore,
        loadingMore,
        autoLoadMore
    } = useStaffOrders();

    const localOrderActions = useSelector(selectLocalOrderActions);
    const { downloadInvoice, updateStatus, completeOrderStage, takeOrder, releaseOrder, cancelOrderById } = useOrders();
    const { canViewAllOrders, actualProcessingRole, relevantStatuses, historyStatuses } = useOrderPermissions(currentUser);
    
    // WebSocket для реального времени
    const { isConnected: isWebSocketConnected, subscribeToOrders, unsubscribeFromOrders, forceReconnect } = useRealtimeOrders();

    const filteredOrders = useOrderFiltering(staffOrders, filters, canViewAllOrders, actualProcessingRole, relevantStatuses, historyStatuses, showHistory, showWaitingStock);
    
    // Отслеживаем количество отфильтрованных заказов для предотвращения бесконечной загрузки
    const prevFilteredCountRef = useRef(0);
    const emptyPagesCountRef = useRef(0);

    // Подсчет заказов, ожидающих поставки - используем комбинированный селектор
    const waitingStockCount = useSelector(selectWaitingStockCountCombined);

    // Подписка на WebSocket при загрузке данных
    useEffect(() => {
        // Отключаем подробное логирование для производительности
        // console.log('🔌 WebSocket subscription effect');
        
        if (isWebSocketConnected && isMountedRef.current && currentUser?.employee?.id) {
            // console.log('✅ Subscribing to WebSocket orders');
            // Добавляем небольшую задержку для полного установления соединения
            const subscriptionTimeout = setTimeout(() => {
                subscribeToOrders({
                    employeeId: currentUser.employee.id,
                    warehouseId: currentUser.employee.warehouseId
                });
            }, 500); // 500ms задержка

            return () => {
                clearTimeout(subscriptionTimeout);
            };
        }

        return () => {
            if (isWebSocketConnected) {
                // console.log('❌ Unsubscribing from WebSocket orders');
                unsubscribeFromOrders();
            }
        };
    }, [isWebSocketConnected, currentUser?.employee?.id, currentUser?.employee?.warehouseId, subscribeToOrders, unsubscribeFromOrders]);

    // Дополнительная подписка при изменении данных пользователя
    useEffect(() => {
        if (isWebSocketConnected && isMountedRef.current && dataLoaded) {
            // Переподписываемся при изменении данных пользователя
            subscribeToOrders({
                employeeId: currentUser?.employee?.id,
                warehouseId: currentUser?.employee?.warehouseId
            });
        }
    }, [dataLoaded, isWebSocketConnected, subscribeToOrders]);

    // Умное обновление только при необходимости
    useEffect(() => {
        if (dataLoaded && isMountedRef.current) {
            // Фильтрация происходит на клиенте через useOrderFiltering
            // Дополнительных запросов к серверу не требуется
        }
    }, [showHistory, showWaitingStock, dataLoaded, isWebSocketConnected]);
    
    // Отслеживаем изменения в фильтрованных заказах для предотвращения бесконечной загрузки
    useEffect(() => {
        const currentCount = filteredOrders.length;
        
        // Если после загрузки новой страницы количество отфильтрованных заказов НЕ увеличилось
        if (prevFilteredCountRef.current === currentCount && currentCount === 0 && staffOrders.length > 0) {
            emptyPagesCountRef.current += 1;
            // Отключаем логирование - слишком много шума
            // console.log(`⚠️ Пустая страница после фильтрации (${emptyPagesCountRef.current} подряд)`);
        } else {
            // Сбрасываем счетчик если данные появились
            emptyPagesCountRef.current = 0;
        }
        
        prevFilteredCountRef.current = currentCount;
    }, [filteredOrders.length, staffOrders.length]);
    
    // Автозагрузка дополнительных страниц если данных мало после фильтрации
    // ОТКЛЮЧЕНО - вызывает множественные рендеры и запросы
    // Вместо этого используем ручную загрузку через onEndReached в FlatList
    // useEffect(() => {
    //     if (dataLoaded && !isLoading && !showHistory && !showWaitingStock) {
    //         // Запускаем автозагрузку только для активных заказов
    //         // (для истории и ожидающих не нужно)
    //         const timer = setTimeout(() => {
    //             autoLoadMore();
    //         }, 500); // Задержка для избежания конфликтов
    //         
    //         return () => clearTimeout(timer);
    //     }
    // }, [dataLoaded, isLoading, showHistory, showWaitingStock, autoLoadMore]);
    
    // Условный loadMore который предотвращает бесконечную загрузку при пустых результатах фильтрации
    const conditionalLoadMore = useCallback(() => {
        // Предотвращаем слишком частые вызовы (debounce 1 секунда)
        const now = Date.now();
        if (now - lastLoadMoreTimeRef.current < 1000) {
            // Отключаем логирование частых вызовов - слишком много шума
            return;
        }
        
        // Если загрузили более 3 пустых страниц подряд - прекращаем загрузку
        if (emptyPagesCountRef.current >= 3 && filteredOrders.length === 0) {
            // Логируем только первый раз
            if (emptyPagesCountRef.current === 3) {
                console.log('🛑 Прекращаем загрузку: 3+ пустых страниц подряд после фильтрации');
            }
            return;
        }
        
        // Если уже идет загрузка или обновление - не загружаем
        if (isLoading || loadingMore || isRefreshing) {
            return;
        }
        
        // Очищаем предыдущий таймаут
        if (loadMoreTimeoutRef.current) {
            clearTimeout(loadMoreTimeoutRef.current);
        }
        
        // Устанавливаем таймаут для debounce
        loadMoreTimeoutRef.current = setTimeout(() => {
            lastLoadMoreTimeRef.current = Date.now();
            loadMore();
        }, 300);
    }, [loadMore, filteredOrders.length, isLoading, loadingMore, isRefreshing]);
    
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

            // Обновляем заказ в списке локально
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

            // Не перезагружаем данные сразу, чтобы локальные изменения сохранились
        } catch (e) {
            console.error('Ошибка при взятии заказа:', e);
            dispatch(clearLocalOrderAction({ orderId: orderId }));
            Alert.alert('Ошибка', e.message || 'Не удалось взять заказ');
        }
    }, [takeOrder, dispatch, currentUser]);

    const handleReleaseOrder = useCallback(async (orderId) => {
        try {
            const result = await releaseOrder(orderId, 'Снят с работы сотрудником');
            if (!result.success) throw new Error(result.error);

            // Устанавливаем флаг released для отображения кнопки "Взять в работу"
            dispatch(setLocalOrderAction({
                orderId: orderId,
                action: 'released',
                value: true
            }));

            // Очищаем флаг taken
            dispatch(setLocalOrderAction({
                orderId: orderId,
                action: 'taken',
                value: false
            }));

            // Обновляем заказ в списке локально - снимаем назначение
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

            // Не перезагружаем данные сразу, чтобы локальные изменения сохранились

        } catch (e) {
            console.error('Ошибка при снятии заказа:', e);
            Alert.alert('Ошибка', e.message || 'Не удалось снять заказ с работы');
        }
    }, [releaseOrder, dispatch]);

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
        if (showHistory) {
            // Если уже показываем историю, выключаем её
            setShowHistory(false);
            // Очищаем старые данные перед загрузкой новых
            dispatch(clearStaffOrdersData());
            // Загружаем активные заказы (без завершенных статусов)
            dispatch(fetchStaffOrders({ forceRefresh: true }));
        } else {
            // Включаем историю и выключаем ожидающие поставки
            setShowHistory(true);
            setShowWaitingStock(false);
            // Очищаем старые данные перед загрузкой новых
            dispatch(clearStaffOrdersData());
            // Небольшая задержка чтобы Redux успел применить очистку
            setTimeout(() => {
                // Загружаем все завершенные заказы для истории
                console.log('🔍 handleToggleHistory: загружаем историю с параметром history=true');
                dispatch(fetchStaffOrders({ history: true, forceRefresh: true }));
            }, 50);
        }
        // Сбрасываем счетчик пустых страниц при переключении вкладки
        emptyPagesCountRef.current = 0;
        prevFilteredCountRef.current = 0;
    }, [showHistory, dispatch]);

    const handleToggleWaitingStock = useCallback(() => {
        if (showWaitingStock) {
            // Если уже показываем ожидающие поставки, выключаем их
            setShowWaitingStock(false);
            // Очищаем старые данные перед загрузкой новых
            dispatch(clearStaffOrdersData());
            // Небольшая задержка чтобы Redux успел применить очистку
            setTimeout(() => {
                // Загружаем все активные заказы
                dispatch(fetchStaffOrders({ forceRefresh: true }));
            }, 50);
        } else {
            // Включаем ожидающие поставки и выключаем историю
            setShowWaitingStock(true);
            setShowHistory(false);
            // Очищаем старые данные перед загрузкой новых
            dispatch(clearStaffOrdersData());
            // Небольшая задержка чтобы Redux успел применить очистку
            setTimeout(() => {
                // Загружаем только заказы WAITING_STOCK
                dispatch(fetchStaffOrders({ status: 'WAITING_STOCK', forceRefresh: true }));
            }, 50);
        }
        // Сбрасываем счетчик пустых страниц при переключении вкладки
        emptyPagesCountRef.current = 0;
        prevFilteredCountRef.current = 0;
    }, [showWaitingStock, dispatch]);

    const handleToggleMain = useCallback(() => {
        // Сбрасываем обе вкладки при переключении на основную
        setShowHistory(false);
        setShowWaitingStock(false);
        // Очищаем старые данные перед загрузкой новых
        dispatch(clearStaffOrdersData());
        // Сбрасываем счетчик пустых страниц при переключении вкладки
        emptyPagesCountRef.current = 0;
        prevFilteredCountRef.current = 0;
        // Небольшая задержка чтобы Redux успел применить очистку
        setTimeout(() => {
            // Загружаем все активные заказы
            dispatch(fetchStaffOrders({ forceRefresh: true }));
        }, 50);
    }, [dispatch]);

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

    // Начальная загрузка ОТКЛЮЧЕНА - используется только useFocusEffect для избежания дублирования
    // useEffect(() => {
    //     if (currentUser?.id && !dataLoaded && isMountedRef.current) {
    //         console.log('📊 Initial data load on component mount');
    //         loadInitialData(false);
    //     }
    // }, [currentUser?.id, dataLoaded, loadInitialData]);

    // Фокус эффекты
    useFocusEffect(
        useCallback(() => {
            // console.log('📱 StaffOrdersScreen focused');
            
            // Принудительно переподключаемся к WebSocket при фокусе на экране
            if (!isWebSocketConnected) {
                // console.log('🔄 WebSocket reconnecting...');
                forceReconnect();
            }
            
            // Загружаем данные только если они еще не загружены
            if (!dataLoaded) {
                loadInitialData(true);
            }
        }, [loadInitialData, isWebSocketConnected, forceReconnect, dataLoaded])
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
        isRefreshing,
        isInitializing,
        dataLoaded,
        currentUser,
        canViewAllOrders,
        actualProcessingRole,

        // Actions
        localOrderActions: stableLocalOrderActions,
        isWebSocketConnected,
        handleRefreshData,
        loadMore: conditionalLoadMore, // Используем условный loadMore для предотвращения бесконечной загрузки
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
