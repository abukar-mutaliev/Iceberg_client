import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    Alert,
    FlatList,
    Modal,
    TextInput,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OrderCard } from '@entities/order/ui/OrderCard';
import { OrdersFilters } from '@features/order/ui/OrdersFilters';
import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { loadUserProfile } from '@entities/auth/model/slice';
import { normalize } from '@shared/lib/normalize';
import { Loader } from "@shared/ui/Loader";

import {
    fetchStaffOrders,
    setLocalOrderAction,
    clearLocalOrderAction,
    clearAllLocalOrderActions
} from '@entities/order/model/slice';
import {
    selectStaffOrders,
    selectStaffOrdersLoading,
    selectLocalOrderActions
} from '@entities/order/model/selectors';
import { useOrders } from '@entities/order/hooks/useOrders';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, getAvailableStatuses } from '@entities/order';
import { ToastSimple } from '@shared/ui/Toast/ui/ToastSimple';

const CACHE_KEY = 'staff_orders_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 минут
const AUTO_REFRESH_INTERVAL = 30 * 1000; // 30 секунд

// Функции для работы с кэшем
const saveCacheData = async (data) => {
    try {
        const cacheData = {
            timestamp: Date.now(),
            data
        };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Ошибка сохранения кэша заказов:', error);
    }
};

const loadCacheData = async () => {
    try {
        const cacheStr = await AsyncStorage.getItem(CACHE_KEY);
        if (cacheStr) {
            const cache = JSON.parse(cacheStr);
            const now = Date.now();
            
            // Проверяем, не истек ли кэш
            if (now - cache.timestamp < CACHE_EXPIRY) {
                return cache.data;
            } else {
                // Удаляем истекший кэш
                await AsyncStorage.removeItem(CACHE_KEY);
            }
        }
        return null;
    } catch (error) {
        console.error('Ошибка загрузки кэша заказов:', error);
        return null;
    }
};

const clearCache = async () => {
    try {
        await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
        console.error('Ошибка очистки кэша заказов:', error);
    }
};

export const StaffOrdersScreen = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const [refreshing, setRefreshing] = useState(false);
    const [filters, setFilters] = useState({});
    const [showHistory, setShowHistory] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(0);
    
    // Автоматическое обновление
    const autoRefreshRef = useRef(null);
    const isMountedRef = useRef(true);
    const initialLoadRef = useRef(false);
    
    // Получаем информацию о текущем пользователе
    const { currentUser } = useAuth();
    
    // Пробуем получить processingRole из разных возможных мест
    const actualProcessingRole = currentUser?.profile?.processingRole || currentUser?.employee?.processingRole;
    
    // Определяем, может ли пользователь видеть все заказы
    const canViewAllOrders = useMemo(() => {
        const isSuperAdmin = currentUser?.role === 'ADMIN' && currentUser?.profile?.isSuperAdmin;
        const isGeneralStaff = currentUser?.role === 'EMPLOYEE' && !['PICKER', 'PACKER', 'COURIER'].includes(actualProcessingRole);
        return isSuperAdmin || isGeneralStaff;
    }, [currentUser, actualProcessingRole]);



    // Определяем статусы заказов для каждой роли сотрудника
    const getRelevantStatusesForRole = useCallback((processingRole) => {
        if (!processingRole) return [];
        
        const roleStatusMapping = {
            'PICKER': [
                ORDER_STATUSES.PENDING     // Только новые заказы для сборки
            ],
            'PACKER': [
                ORDER_STATUSES.CONFIRMED   // Заказы готовые к упаковке после сборки
            ],
            'COURIER': [
                ORDER_STATUSES.IN_DELIVERY  // Заказы переданные курьеру для доставки
            ]
        };
        
        return roleStatusMapping[processingRole] || [];
    }, []);

    // Определяем статусы для истории - заказы, которые роль обработала на своем этапе
    const getHistoryStatusesForRole = useCallback((processingRole) => {
        if (!processingRole) return [];
        
        const roleHistoryMapping = {
            'PICKER': [
                ORDER_STATUSES.CONFIRMED,    // Заказы, которые сборщик собрал
                ORDER_STATUSES.IN_DELIVERY,  // И дальше по цепочке
                ORDER_STATUSES.DELIVERED,    // До финальных статусов
                ORDER_STATUSES.CANCELLED,
                ORDER_STATUSES.RETURNED
            ],
            'PACKER': [
                ORDER_STATUSES.IN_DELIVERY,  // Заказы, которые упаковщик упаковал
                ORDER_STATUSES.DELIVERED,    // И дальше по цепочке
                ORDER_STATUSES.CANCELLED,
                ORDER_STATUSES.RETURNED
            ],
            'COURIER': [
                ORDER_STATUSES.DELIVERED,    // Заказы, которые курьер доставил
                ORDER_STATUSES.CANCELLED,    // Или отменил/вернул
                ORDER_STATUSES.RETURNED
            ]
        };
        
        return roleHistoryMapping[processingRole] || [];
    }, []);



    // Получаем релевантные статусы для текущего пользователя
    const relevantStatuses = useMemo(() => {
        const statuses = getRelevantStatusesForRole(actualProcessingRole);
        return statuses;
    }, [actualProcessingRole, getRelevantStatusesForRole]);

    // Получаем исторические статусы для текущего пользователя
    const historyStatuses = useMemo(() => {
        const statuses = getHistoryStatusesForRole(actualProcessingRole);
        return statuses;
    }, [actualProcessingRole, getHistoryStatusesForRole]);

    
    // Состояние для отслеживания загрузки накладных
    const [downloadingInvoices, setDownloadingInvoices] = useState(new Set());
    
    // useRef для хранения актуальных данных заказов
    const ordersRef = useRef({ staffOrders: [], filteredOrders: [] });
    
    // Состояния для модального окна изменения статуса
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [availableStatuses, setAvailableStatuses] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [statusComment, setStatusComment] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Получаем локальные действия из Redux
    const localOrderActions = useSelector(selectLocalOrderActions);

    // Состояние для Toast уведомления
    const [toastConfig, setToastConfig] = useState(null);
    
    // Загрузка данных с кэшированием
    const loadInitialData = useCallback(async (forceRefresh = false) => {
        try {
            setShowHistory(false);

            // Пытаемся загрузить из кэша при первом запуске
            if (!forceRefresh && !dataLoaded && !initialLoadRef.current) {
                const cachedData = await loadCacheData();
                if (cachedData) {
                    console.log('StaffOrdersScreen: Используем данные из кэша');
                    setDataLoaded(true);
                    initialLoadRef.current = true;
                    setInitializing(false);
                    setLastFetchTime(cachedData.timestamp || Date.now());
                    return;
                }
            }

            console.log('StaffOrdersScreen: Загружаем данные с сервера', { forceRefresh });

            // Параллельная загрузка с принудительным обновлением
            const [profileResult, ordersResult] = await Promise.allSettled([
                dispatch(loadUserProfile({ forceRefresh })).unwrap(),
                dispatch(fetchStaffOrders({ forceRefresh })).unwrap()
            ]);
            
            if (profileResult.status === 'rejected') {
                console.error('StaffOrdersScreen - Ошибка обновления профиля:', profileResult.reason);
            }
            
            if (ordersResult.status === 'rejected') {
                console.error('StaffOrdersScreen - Ошибка загрузки заказов:', ordersResult.reason);
                throw ordersResult.reason;
            }

            // Очищаем локальное состояние действий при обновлении данных
            dispatch(clearAllLocalOrderActions());

            // Сохраняем данные в кэш
            const currentTime = Date.now();
            setLastFetchTime(currentTime);
            setDataLoaded(true);
            initialLoadRef.current = true;

            const cacheData = {
                timestamp: currentTime,
                profile: profileResult.value,
                orders: ordersResult.value
            };
            await saveCacheData(cacheData);

        } catch (error) {
            console.error('StaffOrdersScreen - Ошибка загрузки:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить данные. Проверьте подключение к интернету.');
        } finally {
            setInitializing(false);
        }
    }, [dispatch, dataLoaded]);

    // Открытие модального окна изменения статуса
    const handleStatusUpdate = useCallback((orderId) => {
        // Получаем актуальные данные из ref
        const { staffOrders: currentStaffOrders, filteredOrders: currentFilteredOrders } = ordersRef.current;

        // Проверяем, что данные загружены и пользователь готов
        if (!currentUser || (!currentStaffOrders && !currentFilteredOrders)) {
            Alert.alert('Внимание', 'Данные заказов загружаются. Попробуйте через несколько секунд.');
            return;
        }

        // Ищем заказ в отфильтрованном списке (который используется для рендеринга)
        let order = currentFilteredOrders?.find(o => o.id === orderId);
        
        // Если не найден в отфильтрованном списке, ищем в основном
        if (!order && currentStaffOrders) {
            order = currentStaffOrders.find(o => o.id === orderId);
        }

        // Если заказ не найден ни в одном списке, но есть в staffOrders, 
        // возможно проблема в фильтрации - попробуем найти по ID напрямую
        if (!order && currentStaffOrders) {
            order = currentStaffOrders.find(o => o.id === orderId);
        }

        // Если заказ все еще не найден, попробуем найти в любом из списков
        if (!order) {
            const allOrders = [...(currentFilteredOrders || []), ...(currentStaffOrders || [])];
            order = allOrders.find(o => o.id === orderId);
        }

        if (!order) {
            Alert.alert('Ошибка', 'Заказ не найден в списке. Попробуйте обновить экран.');
            return;
        }

        const availableStatuses = getAvailableStatuses(order.status);
        // Для сотрудников добавим псевдо-статус "Отменить" в модальном окне
        const canEmployeeCancel = !canViewAllOrders && ['PICKER','PACKER','COURIER'].includes(actualProcessingRole);
        const extendedStatuses = canEmployeeCancel
            ? [
                ...availableStatuses,
                { value: 'CANCELLED', label: 'Отменить заказ', color: '#dc3545' }
              ]
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
    }, [currentUser, getAvailableStatuses]);

    // Подтверждение изменения статуса
    const handleConfirmStatusChange = useCallback(async () => {
        if (!selectedOrder) {
            Alert.alert('Ошибка', 'Заказ не выбран');
            return;
        }

        // Для админов требуется выбор статуса, для сотрудников - нет
        if (canViewAllOrders && !selectedStatus) {
            Alert.alert('Ошибка', 'Выберите новый статус');
            return;
        }

        try {
            setUpdatingStatus(true);
            
            let result;
            
            // Для сотрудников используем completeOrderStage, для админов - updateStatus
            if (canViewAllOrders) {
                // Админы используют обычное обновление статуса
                result = await updateStatus(selectedOrder.id, {
                    status: selectedStatus,
                    comment: statusComment.trim() || undefined,
                    notifyClient: true
                });
            } else {
                if (selectedStatus === 'CANCELLED') {
                    // Сотрудникам разрешаем отменить через модалку
                    result = await cancelOrderById(selectedOrder.id, { reason: statusComment.trim() || 'Отменено сотрудником' }, false);
                } else {
                    // Сотрудники используют завершение этапа (переход к следующему)
                    result = await completeOrderStage(selectedOrder.id, statusComment.trim() || undefined);
                }
            }

            if (result.success) {
                // Если это завершение этапа сотрудником (не изменение статуса админом)
                if (!canViewAllOrders && selectedOrder) {
                    // Сразу обновляем локальное состояние - этап завершен
                    dispatch(setLocalOrderAction({
                        orderId: selectedOrder.id,
                        action: 'completed',
                        value: true
                    }));
                    console.log('Локально отмечен завершенный этап:', selectedOrder.id, 'роль:', actualProcessingRole);

                    // Для курьера дополнительно логируем завершение доставки
                    if (actualProcessingRole === 'COURIER') {
                        console.log('Курьер завершил доставку заказа:', selectedOrder.id, {
                            orderStatus: selectedOrder?.status,
                            expectedNewStatus: 'DELIVERED'
                        });
                    }
                }

                // Показываем Toast уведомление вместо алерта
                setToastConfig({
                    message: canViewAllOrders ? 'Статус заказа успешно изменен' : 'Этап заказа успешно завершен',
                    type: 'success',
                    duration: 3000
                });
                setStatusModalVisible(false);
                setSelectedOrder(null);
                setSelectedStatus('');
                setStatusComment('');
                // Обновляем список заказов с принудительной перезагрузкой
                console.log('StaffOrdersScreen: обновляем список заказов после завершения этапа');

                // Ждем немного перед обновлением, чтобы сервер успел обработать изменения
                setTimeout(() => {
                    console.log('StaffOrdersScreen: начинаем загрузку данных после паузы');
                    loadInitialData(true);
                }, 1500); // Увеличиваем задержку до 1.5 секунд
            } else {
                Alert.alert('Ошибка', result.error || 'Не удалось изменить статус заказа');
            }
        } catch (error) {
            Alert.alert('Ошибка', error.message || 'Не удалось изменить статус заказа');
        } finally {
            setUpdatingStatus(false);
        }
    }, [selectedOrder, selectedStatus, statusComment, updateStatus, completeOrderStage, loadInitialData, canViewAllOrders]);

    // Отмена изменения статуса
    const handleCancelStatusChange = useCallback(() => {
        setStatusModalVisible(false);
        setSelectedOrder(null);
        setSelectedStatus('');
        setStatusComment('');
    }, []);

    const handleCancelOrder = useCallback((orderId) => {
        // TODO: Реализовать отмену заказа
        console.log('Cancel order:', orderId);
        Alert.alert('Информация', 'Функция отмены заказа в разработке');
    }, []);

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
    

    
    const staffOrders = useSelector(selectStaffOrders);
    const isLoading = useSelector(selectStaffOrdersLoading);
    
    // Используем хуки
    const { downloadInvoice, updateStatus, completeOrderStage, takeOrder, assignOrderToEmployee, cancelOrderById } = useOrders();

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            // Принудительное обновление с очисткой кэша
            await clearCache();
            await loadInitialData(true);
        } catch (error) {
            console.error('StaffOrdersScreen - Ошибка обновления:', error.message);
        } finally {
            setRefreshing(false);
        }
    }, [loadInitialData]);

    // Фильтрация заказов согласно ролям сотрудников
    const filteredOrders = useMemo(() => {
        // Обновляем ref с актуальными данными
        ordersRef.current = { staffOrders: staffOrders || [], filteredOrders: [] };
        let filtered = [...(staffOrders || [])];

        // Логируем все заказы для отладки
        if (actualProcessingRole === 'COURIER') {
            console.log('StaffOrdersScreen: курьер видит заказы', {
                totalOrders: filtered.length,
                ordersByStatus: filtered.reduce((acc, order) => {
                    acc[order.status] = (acc[order.status] || 0) + 1;
                    return acc;
                }, {}),
                showHistory,
                relevantStatuses,
                historyStatuses,
                // Проверяем конкретные заказы
                order29: filtered.find(o => o.id === 29)?.status || 'не найден',
                recentOrders: filtered.slice(0, 3).map(o => ({ id: o.id, status: o.status, assignedToId: o.assignedTo?.id }))
            });
        }

        // Для админов и супервизоров - показываем все заказы
        if (canViewAllOrders) {
            // Админы видят всё без фильтрации по истории
        } else if (actualProcessingRole && (relevantStatuses.length > 0 || historyStatuses.length > 0)) {
            const beforeFilter = filtered.length;

            if (showHistory) {
                filtered = filtered.filter(order => historyStatuses.includes(order.status));
                console.log('StaffOrdersScreen: фильтрация истории для роли', actualProcessingRole, {
                    beforeFilter,
                    afterFilter: filtered.length,
                    historyStatuses,
                    filteredStatuses: filtered.map(o => ({ id: o.id, status: o.status }))
                });
            } else {
                filtered = filtered.filter(order => relevantStatuses.includes(order.status));
                console.log('StaffOrdersScreen: фильтрация активных для роли', actualProcessingRole, {
                    beforeFilter,
                    afterFilter: filtered.length,
                    relevantStatuses,
                    filteredStatuses: filtered.map(o => ({ id: o.id, status: o.status }))
                });
            }
        }

        // Поиск
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(order => 
                order.orderNumber?.toLowerCase().includes(searchLower) ||
                order.client?.name?.toLowerCase().includes(searchLower) ||
                order.client?.phone?.toLowerCase().includes(searchLower) ||
                order.deliveryAddress?.toLowerCase().includes(searchLower) ||
                order.comment?.toLowerCase().includes(searchLower)
            );
        }

        // Фильтр по статусу
        if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(order => order.status === filters.status);
        }

        // Фильтр по приоритету
        if (filters.priority && filters.priority !== 'all') {
            filtered = filtered.filter(order => order.priority === filters.priority);
        }

        // Фильтр по дате
        if (filters.date) {
            const filterDate = new Date(filters.date);
            filterDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(filterDate);
            nextDay.setDate(nextDay.getDate() + 1);

            filtered = filtered.filter(order => {
                const orderDate = new Date(order.createdAt);
                return orderDate >= filterDate && orderDate < nextDay;
            });
        }

        // Обновляем ref с финальными отфильтрованными данными
        ordersRef.current.filteredOrders = filtered;

        return filtered;
    }, [staffOrders, filters, canViewAllOrders, actualProcessingRole, relevantStatuses, historyStatuses, showHistory, currentUser?.role]);

    // Эффекты - загружаем данные только после готовности компонента
    useEffect(() => {
        isMountedRef.current = true;
        
        const initializeScreen = async () => {
            try {
                // Пытаемся загрузить из кэша при первом запуске
                const cachedData = await loadCacheData();
                if (cachedData) {
                    console.log('StaffOrdersScreen: Используем данные из кэша при инициализации');
                    setDataLoaded(true);
                    initialLoadRef.current = true;
                    setInitializing(false);
                    setLastFetchTime(cachedData.timestamp || Date.now());

                    // ВАЖНО: даже при наличии кэша — запрашиваем актуальные заказы, чтобы заполнить Redux
                    try {
                        await dispatch(fetchStaffOrders({ forceRefresh: true })).unwrap();
                    } catch (e) {
                        console.warn('StaffOrdersScreen: Не удалось догрузить заказы после кэша', e?.message);
                    }
                } else {
                    // Загружаем данные с сервера если кэша нет
                    console.log('StaffOrdersScreen: Инициализация - начинаем загрузку данных');
                    await loadInitialData();
                }
            } catch (error) {
                console.error('StaffOrdersScreen - Ошибка инициализации:', error);
                setInitializing(false);
            }
        };
        
        initializeScreen();

        // Автоматическое обновление каждые 30 секунд для получения новых заказов
        autoRefreshRef.current = setInterval(() => {
            if (!isMountedRef.current) return;
            // Всегда подгружаем актуальные данные в фоне, чтобы при первом открытии не оставаться пустыми
            dispatch(fetchStaffOrders({ forceRefresh: true })).catch(() => {});
        }, AUTO_REFRESH_INTERVAL);

        return () => {
            isMountedRef.current = false;
            if (autoRefreshRef.current) {
                clearInterval(autoRefreshRef.current);
            }
        };
    }, [loadInitialData, dataLoaded]);

    // Обновляем список при каждом фокусе экрана
    useFocusEffect(
        useCallback(() => {
            let cancelled = false;
            (async () => {
                try {
                    await dispatch(fetchStaffOrders({ forceRefresh: true }));
                } catch (e) {
                    // no-op
                }
            })();
            return () => { cancelled = true; };
        }, [dispatch])
    );

    // Дополнительная загрузка с обновлением при необходимости
    useEffect(() => {
        if (currentUser && !isLoading && !dataLoaded) {
            const shouldRefresh = !staffOrders || staffOrders.length === 0;
            if (shouldRefresh) {
                loadInitialData();
            }
        }
    }, [currentUser, isLoading, staffOrders, loadInitialData, dataLoaded]);


    const renderOrderItem = useCallback(({ item }) => {
        // Также проверяем, может ли сотрудник изменять статус заказа
        // В истории заказов некоторые роли могут изменять статус (например, курьер для возвратов)
        const canChangeStatusInHistory = (() => {
            if (!showHistory) return true; // В активных заказах все могут изменять статус

            // В истории только курьер может изменять статус (для возвратов от клиентов)
            return actualProcessingRole === 'COURIER';
        })();

        // Определяем, можно ли изменять статус заказа
        const canUpdateOrderStatus = (() => {
            // Получаем актуальные данные из ref
            const { staffOrders: currentStaffOrders, filteredOrders: currentFilteredOrders } = ordersRef.current;

            // Проверяем, что данные загружены
            if (!currentUser || (!currentStaffOrders && !currentFilteredOrders)) {
                return false;
            }

            // Проверяем локальное состояние - если сотрудник только что завершил этап, скрываем кнопку
            const localActionForCompletion = localOrderActions[item.id];
            if (localActionForCompletion?.completed) {
                console.log('Скрываем кнопку статуса - этап только что завершен:', item.id);
                return false;
            }

            // Для завершенных заказов (доставленных, отмененных, возвращенных) кнопки не нужны
            const completedStatuses = [ORDER_STATUSES.DELIVERED, ORDER_STATUSES.CANCELLED, ORDER_STATUSES.RETURNED];
            if (completedStatuses.includes(item.status)) {
                console.log('Скрываем кнопку статуса - заказ завершен:', item.id, item.status);
                return false;
            }

            // Админы могут изменять статус всегда
            if (canViewAllOrders) return true;

            // Если заказ в истории
            if (showHistory) {
                // Используем новую логику определения возможности изменения статуса
                return canChangeStatusInHistory;
            }

            // В активных заказах кнопка "статус" показывается только если заказ уже взят в работу текущим сотрудником
            const localActionForStatus = localOrderActions[item.id];
            const isAssignedToMe = Boolean(item.assignedTo?.id && currentUser?.employee?.id && item.assignedTo.id === currentUser.employee.id);
            const isLocallyTaken = localActionForStatus?.taken;

            console.log('canUpdateOrderStatus: заказ', item.id, {
                isAssignedToMe,
                isLocallyTaken,
                assignedToId: item.assignedTo?.id,
                currentUserEmployeeId: currentUser?.employee?.id,
                showStatusButton: isAssignedToMe || isLocallyTaken
            });

            if (isAssignedToMe || isLocallyTaken) {
                return true;
            }

            return false;
        })();



        return (
            <OrderCard 
                order={item} 
                onPress={() => navigation.navigate('StaffOrderDetails', { orderId: item.id })}
                showClient={canViewAllOrders}
                showActions={true}
                onStatusUpdate={canUpdateOrderStatus ? handleStatusUpdate : null}
                onTakeOrder={async (orderId) => {
                    try {
                        // Сразу обновляем локальное состояние - заказ взят в работу
                        dispatch(setLocalOrderAction({
                            orderId: orderId,
                            action: 'taken',
                            value: true
                        }));

                        const res = await takeOrder(orderId, 'Взял заказ в работу');
                        if (!res.success) throw new Error(res.error);
                        // Показываем Toast уведомление вместо алерта
                        setToastConfig({
                            message: 'Заказ взят в работу',
                            type: 'success',
                            duration: 3000
                        });
                        loadInitialData(true);
                    } catch (e) {
                        // В случае ошибки откатываем локальное состояние
                        dispatch(clearLocalOrderAction({ orderId: orderId }));
                        Alert.alert('Ошибка', e.message || 'Не удалось взять заказ');
                    }
                }}
                onReleaseOrder={canUpdateOrderStatus ? async (orderId) => {
                    try {
                        const result = await assignOrderToEmployee(orderId, { assignedToId: null, reason: 'Отказ от заказа' });
                        if (!result.success) throw new Error(result.error);
                        Alert.alert('Готово', 'Назначение снято');
                        loadInitialData(true);
                    } catch (e) {
                        Alert.alert('Ошибка', e.message || 'Не удалось снять назначение');
                    }
                } : null}
                // Учитываем локальное состояние для определения статуса заказа
                canTake={(() => {
                    // Для завершенных заказов кнопка "взять" не нужна
                    const completedStatuses = [ORDER_STATUSES.DELIVERED, ORDER_STATUSES.CANCELLED, ORDER_STATUSES.RETURNED];
                    if (completedStatuses.includes(item.status)) {
                        console.log('Скрываем кнопку взять - заказ завершен:', item.id, item.status);
                        return false;
                    }

                    const localAction = localOrderActions[item.id];
                    // Если локально заказ взят в работу, то нельзя брать еще раз
                    if (localAction?.taken) return false;
                    // Если заказ уже назначен на кого-то другого, нельзя брать
                    if (item.assignedTo && item.assignedTo.id !== currentUser?.employee?.id) return false;

                    // Всегда проверяем, работал ли уже сотрудник с этим заказом в истории обработки
                    if (item.statusHistory) {
                        const hasWorkedOnOrder = item.statusHistory.some(historyItem => {
                            if (!historyItem.comment) return false;

                            // Проверяем, есть ли в комментарии имя или должность текущего сотрудника
                            const hasEmployeeName = currentUser?.employee?.name &&
                                historyItem.comment.includes(currentUser.employee.name);
                            const hasEmployeePosition = currentUser?.employee?.position &&
                                historyItem.comment.includes(currentUser.employee.position);

                            return hasEmployeeName || hasEmployeePosition;
                        });

                        if (hasWorkedOnOrder) {
                            console.log('Сотрудник уже работал с заказом ранее:', item.id, currentUser?.employee?.name);
                            return false;
                        }
                    }

                    // Если заказ не назначен, можно брать
                    return !item.assignedTo;
                })()}
                isTakenByMe={(() => {
                    const localAction = localOrderActions[item.id];
                    // Если локально заказ взят в работу текущим пользователем
                    if (localAction?.taken) return true;

                    // Если сотрудник уже работал с этим заказом ранее и заказ сейчас не назначен на него,
                    // то он не считается "взятым им"
                    if (item.statusHistory) {
                        const hasWorkedOnOrder = item.statusHistory.some(historyItem => {
                            if (!historyItem.comment) return false;

                            const hasEmployeeName = currentUser?.employee?.name &&
                                historyItem.comment.includes(currentUser.employee.name);
                            const hasEmployeePosition = currentUser?.employee?.position &&
                                historyItem.comment.includes(currentUser.employee.position);

                            return hasEmployeeName || hasEmployeePosition;
                        });

                        // Если сотрудник работал с заказом, но заказ сейчас назначен на кого-то другого
                        if (hasWorkedOnOrder && item.assignedTo && item.assignedTo.id !== currentUser?.employee?.id) {
                            return false;
                        }
                    }

                    // Проверяем серверные данные
                    return Boolean(item.assignedTo?.id && currentUser?.employee?.id && item.assignedTo.id === currentUser.employee.id);
                })()}

                onDownloadInvoice={handleDownloadInvoice}
                downloadingInvoice={downloadingInvoices.has(item.id)}
                showProcessingInfo={canViewAllOrders}
                showEmployeeInfo={true}
                // Убираем историю обработки заказа - она доступна на детальном экране
                showStatusHistory={false}
                showProcessingHistory={false}
                // Явно передаем доступные статусы, чтобы не зависеть от barrel и избежать ранних обращений
                availableStatusesProvider={getAvailableStatuses}
            />
        );
    }, [canViewAllOrders, showHistory, actualProcessingRole, handleStatusUpdate, assignOrderToEmployee, handleDownloadInvoice, downloadingInvoices, navigation, currentUser, takeOrder, loadInitialData, localOrderActions]);

    // Компонент заголовка для прокручиваемого контента
    const renderHeader = useCallback(() => (
        <View style={styles.headerContainer}>
            {/* Заголовок */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowBackIcon />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Заказы для обработки</Text>
            </View>

            {/* Переключатель активные/история для сотрудников */}
            {!canViewAllOrders && actualProcessingRole && (
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleButton, !showHistory && styles.toggleButtonActive]}
                        onPress={() => setShowHistory(false)}
                    >
                        <Text style={[styles.toggleButtonText, !showHistory && styles.toggleButtonTextActive]}>
                            {actualProcessingRole === 'PICKER' ? 'Новые' : 'Активные'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, showHistory && styles.toggleButtonActive]}
                        onPress={() => setShowHistory(true)}
                    >
                        <Text style={[styles.toggleButtonText, showHistory && styles.toggleButtonTextActive]}>
                            История
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Основные фильтры */}
            <OrdersFilters
                filters={filters}
                onFiltersChange={setFilters}
                showProcessingToggle={false}
            />
        </View>
    ), [canViewAllOrders, actualProcessingRole, showHistory, filters, navigation]);

    // Индикатор начальной загрузки (skeleton/placeholder)
    if (initializing) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <ArrowBackIcon />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Заказы для обработки</Text>
                </View>

                <FlatList
                    data={[1,2,3,4,5,6,7,8]}
                    keyExtractor={(i) => i.toString()}
                    renderItem={() => (
                        <View style={styles.skeletonCard}>
                            <View style={styles.skeletonHeader} />
                            <View style={styles.skeletonLineWide} />
                            <View style={styles.skeletonLine} />
                            <View style={styles.skeletonFooter} />
                        </View>
                    )}
                    contentContainerStyle={styles.listContentContainer}
                    ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
                />
            </View>
        );
    }



    return (
        <View style={styles.container}>

            {/* Список заказов с прокручиваемым заголовком */}
            <FlatList
                data={filteredOrders}
                ListHeaderComponent={renderHeader}
                renderItem={renderOrderItem}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing || isLoading}
                        onRefresh={handleRefresh}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {canViewAllOrders 
                                ? 'Нет заказов для отображения'
                                : showHistory
                                    ? 'История обработки пуста'
                                    : `Нет ${actualProcessingRole === 'PICKER' ? 'новых заказов для сборки' : actualProcessingRole === 'PACKER' ? 'заказов для упаковки' : actualProcessingRole === 'COURIER' ? 'заказов для доставки' : 'заказов для обработки'}`
                            }
                        </Text>
                    </View>
                }
                contentContainerStyle={styles.listContentContainer}
                ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                initialNumToRender={8}
                windowSize={10}
                updateCellsBatchingPeriod={100}
                getItemLayout={null}
            />

            {/* Модальное окно изменения статуса */}
            <Modal
                visible={statusModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={handleCancelStatusChange}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {canViewAllOrders ? 'Изменить статус заказа' : 'Завершить этап обработки'}
                            </Text>
                            <Text style={styles.modalSubtitle}>
                                {selectedOrder?.orderNumber ? `Заказ ${selectedOrder.orderNumber}` : ''}
                            </Text>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.currentStatusContainer}>
                                <Text style={styles.currentStatusLabel}>Текущий статус:</Text>
                                <Text style={styles.currentStatusText}>
                                    {selectedOrder ? ORDER_STATUS_LABELS[selectedOrder.status] : ''}
                                </Text>
                            </View>

                            {canViewAllOrders ? (
                                <View style={styles.newStatusContainer}>
                                    <Text style={styles.newStatusLabel}>Новый статус:</Text>
                                    {availableStatuses.map((statusOption) => (
                                        <TouchableOpacity
                                            key={statusOption.value}
                                            style={[
                                                styles.statusOption,
                                                selectedStatus === statusOption.value && styles.selectedStatusOption
                                            ]}
                                            onPress={() => setSelectedStatus(statusOption.value)}
                                        >
                                            <Text style={[
                                                styles.statusOptionText,
                                                selectedStatus === statusOption.value && styles.selectedStatusOptionText
                                            ]}>
                                                {statusOption.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.newStatusContainer}>
                                    <Text style={styles.newStatusLabel}>Информация:</Text>
                                    <View style={styles.infoContainer}>
                                        <Text style={styles.infoText}>
                                            При нажатии "Завершить этап" заказ автоматически перейдет к следующему сотруднику в цепочке обработки.
                                        </Text>
                                    </View>
                                </View>
                            )}

                            <View style={styles.commentContainer}>
                                <Text style={styles.commentLabel}>Комментарий (необязательно):</Text>
                                <TextInput
                                    style={styles.commentInput}
                                    placeholder="Введите комментарий к изменению статуса..."
                                    value={statusComment}
                                    onChangeText={setStatusComment}
                                    multiline
                                    numberOfLines={3}
                                    maxLength={500}
                                />
                                <Text style={styles.commentCounter}>
                                    {statusComment.length}/500
                                </Text>
                            </View>
                        </ScrollView>

                        <View style={styles.modalActions}>
                            {/* Отменить заказ */}
                            {!canViewAllOrders && ['PICKER','PACKER','COURIER'].includes(actualProcessingRole) && ['PENDING','CONFIRMED','IN_DELIVERY'].includes(selectedOrder?.status) && (
                                <TouchableOpacity
                                    style={styles.modalDangerButton}
                                    onPress={async () => {
                                        try {
                                            setUpdatingStatus(true);
                                            const res = await cancelOrderById(selectedOrder.id, { reason: statusComment.trim() || 'Отменено сотрудником' }, false);
                                            if (!res.success) throw new Error(res.error);
                                            Alert.alert('Успех', 'Заказ отменён');
                                            setStatusModalVisible(false);
                                            setSelectedOrder(null);
                                            setStatusComment('');
                                            loadInitialData(true);
                                        } catch (e) {
                                            Alert.alert('Ошибка', e.message || 'Не удалось отменить заказ');
                                        } finally {
                                            setUpdatingStatus(false);
                                        }
                                    }}
                                    disabled={updatingStatus}
                                >
                                    <Text style={styles.modalDangerButtonText}>Отменить заказ</Text>
                                </TouchableOpacity>
                            )}

                            {/* Завершить этап / Изменить статус */}
                            <TouchableOpacity
                                style={[
                                    styles.modalConfirmButton,
                                    (canViewAllOrders && !selectedStatus || updatingStatus) && styles.modalButtonDisabled
                                ]}
                                onPress={handleConfirmStatusChange}
                                disabled={(canViewAllOrders && !selectedStatus) || updatingStatus}
                            >
                                {updatingStatus ? (
                                    <View style={styles.buttonLoader}>
                                        <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                        <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                        <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                    </View>
                                ) : (
                                    <Text style={styles.modalConfirmButtonText}>
                                        {canViewAllOrders ? 'Изменить статус' : 'Завершить этап'}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {/* Отмена */}
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={handleCancelStatusChange}
                                disabled={updatingStatus}
                            >
                                <Text style={styles.modalCancelButtonText}>Отмена</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Toast уведомление */}
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

    // Индикатор начальной загрузки  
    if (initializing) {
        return (
            <View style={styles.container}>
                {/* Заголовок даже во время загрузки */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <ArrowBackIcon />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Заказы для обработки</Text>
                </View>
                
                {/* Индикатор быстрой загрузки */}
                <View style={styles.loadingContainer}>
                    <Loader 
                        type="youtube"
                        color="#667eea"
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Список заказов с прокручиваемым заголовком */}
            <FlatList
                data={filteredOrders}
                ListHeaderComponent={renderHeader}
                renderItem={renderOrderItem}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing || isLoading}
                        onRefresh={handleRefresh}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            {canViewAllOrders 
                                ? 'Нет заказов для отображения'
                                : showHistory
                                    ? 'История обработки пуста'
                                    : `Нет ${actualProcessingRole === 'PICKER' ? 'новых заказов для сборки' : actualProcessingRole === 'PACKER' ? 'заказов для упаковки' : actualProcessingRole === 'COURIER' ? 'заказов для доставки' : 'заказов для обработки'}`
                            }
                        </Text>
                    </View>
                }
                // Стили и отступы для списка карточек
                contentContainerStyle={styles.listContentContainer}
                ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
                // Оптимизации производительности для быстрой загрузки
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                initialNumToRender={8}
                windowSize={10}
                updateCellsBatchingPeriod={100}
                getItemLayout={null} // Позволяет более эффективный рендеринг
            />

            {/* Модальное окно изменения статуса */}
            <Modal
                visible={statusModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={handleCancelStatusChange}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Изменение статуса заказа</Text>
                            <Text style={styles.modalSubtitle}>
                                Заказ #{selectedOrder?.orderNumber}
                            </Text>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.currentStatusContainer}>
                                <Text style={styles.currentStatusLabel}>Текущий статус:</Text>
                                <Text style={styles.currentStatusText}>
                                    {selectedOrder ? ORDER_STATUS_LABELS[selectedOrder.status] : ''}
                                </Text>
                            </View>

                            <View style={styles.newStatusContainer}>
                                <Text style={styles.newStatusLabel}>Новый статус:</Text>
                                {availableStatuses.map((statusOption) => (
                                    <TouchableOpacity
                                        key={statusOption.value}
                                        style={[
                                            styles.statusOption,
                                            selectedStatus === statusOption.value && styles.selectedStatusOption
                                        ]}
                                        onPress={() => setSelectedStatus(statusOption.value)}
                                    >
                                        <Text style={[
                                            styles.statusOptionText,
                                            selectedStatus === statusOption.value && styles.selectedStatusOptionText
                                        ]}>
                                            {statusOption.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={styles.commentContainer}>
                                <Text style={styles.commentLabel}>Комментарий (опционально):</Text>
                                <TextInput
                                    style={styles.commentInput}
                                    placeholder="Добавить комментарий к изменению статуса..."
                                    value={statusComment}
                                    onChangeText={setStatusComment}
                                    multiline={true}
                                    numberOfLines={3}
                                    maxLength={200}
                                />
                                <Text style={styles.commentCounter}>
                                    {statusComment.length}/200
                                </Text>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            {/* Изменить статус */}
                            <TouchableOpacity
                                style={[
                                    styles.modalConfirmButton,
                                    (!selectedStatus || updatingStatus) && styles.modalButtonDisabled
                                ]}
                                onPress={handleConfirmStatusChange}
                                disabled={!selectedStatus || updatingStatus}
                            >
                                {updatingStatus ? (
                                    <View style={styles.buttonLoader}>
                                        <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                        <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                        <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                    </View>
                                ) : (
                                    <Text style={styles.modalConfirmButtonText}>Изменить статус</Text>
                                )}
                            </TouchableOpacity>

                            {/* Отмена */}
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={handleCancelStatusChange}
                            >
                                <Text style={styles.modalCancelButtonText}>Отмена</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    listContainer: {
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    listContainerEmpty: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    separator: {
        height: 12,
    },
    
    // Заголовок
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 0,
        paddingBottom: 0,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerGradient: {
        backgroundColor: '#667eea',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerRight: {
        width: 32,
        height: 32,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statCard: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        fontWeight: '500',
    },
    
    // Фильтры
    filtersContainer: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    
    // Пустое состояние
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyIconContainer: {
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        padding: 24,
        borderRadius: 50,
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        maxWidth: 300,
    },
    clearFiltersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#667eea',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    clearFiltersText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    
    // Модальное окно
    modalCloseButton: {
        padding: normalize(4),
    },
    statusList: {
        maxHeight: normalize(400),
    },
    statusOptionContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusColorIndicator: {
        width: normalize(16),
        height: normalize(16),
        borderRadius: normalize(8),
        marginLeft: normalize(12),
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContainer: {
        flex: 1,
    },
    ordersScrollContainer: {
        padding: 16,
    },
    
    // Стили для модального окна принятия заказа
    modalButton: {
        flex: 1,
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(16),
        borderRadius: normalize(8),
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: normalize(44),
    },
    pickupOrderTitle: {
        fontSize: normalize(18),
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: normalize(12),
    },
    pickupOrderInfo: {
        fontSize: normalize(14),
        color: '#666',
        marginBottom: normalize(8),
        lineHeight: normalize(20),
    },
    pickupWarning: {
        fontSize: normalize(14),
        color: '#dc3545',
        backgroundColor: '#fff5f5',
        padding: normalize(12),
        borderRadius: normalize(8),
        marginTop: normalize(16),
        lineHeight: normalize(20),
        borderLeftWidth: 4,
        borderLeftColor: '#dc3545',
    },

    // Стили для заголовка
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
    emptyText: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
    },

    // Стили для индикатора быстрой загрузки
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        backgroundColor: '#f8f9fa',
    },
    // Skeleton styles
    skeletonCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    skeletonHeader: {
        height: 16,
        width: '40%',
        backgroundColor: '#eee',
        borderRadius: 6,
        marginBottom: 12,
    },
    skeletonLineWide: {
        height: 14,
        width: '85%',
        backgroundColor: '#eee',
        borderRadius: 6,
        marginBottom: 8,
    },
    skeletonLine: {
        height: 14,
        width: '60%',
        backgroundColor: '#eee',
        borderRadius: 6,
        marginBottom: 12,
    },
    skeletonFooter: {
        height: 24,
        width: '30%',
        backgroundColor: '#eee',
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    loadingText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        marginTop: 16,
        textAlign: 'center',
    },
    loadingSubtext: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 20,
    },

    // Стили для переключателя активные/история
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

    // Стили для модального окна изменения статуса
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 500,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    modalBody: {
        maxHeight: 520,
        padding: 20,
    },
    currentStatusContainer: {
        marginBottom: 20,
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    currentStatusLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    currentStatusText: {
        fontSize: 16,
        color: '#1a1a1a',
        fontWeight: '600',
    },
    newStatusContainer: {
        marginBottom: 20,
    },
    newStatusLabel: {
        fontSize: 14,
        color: '#1a1a1a',
        marginBottom: 12,
        fontWeight: '600',
    },
    statusOption: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#fff',
    },
    selectedStatusOption: {
        borderColor: '#667eea',
        backgroundColor: '#f0f2ff',
    },
    statusOptionText: {
        fontSize: 14,
        color: '#1a1a1a',
        fontWeight: '500',
    },
    selectedStatusOptionText: {
        color: '#667eea',
        fontWeight: '600',
    },
    commentContainer: {
        marginBottom: 20,
    },
    commentLabel: {
        fontSize: 14,
        color: '#1a1a1a',
        marginBottom: 8,
        fontWeight: '600',
    },
    commentInput: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#1a1a1a',
        backgroundColor: '#fff',
        textAlignVertical: 'top',
        minHeight: 80,
    },
    commentCounter: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginTop: 4,
    },
    modalActions: {
        flexDirection: 'column',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 12,
        width: '100%',
        alignItems: 'stretch',
    },
    modalCancelButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        alignItems: 'center',
        width: '100%',
        alignSelf: 'stretch',
        minHeight: 44,
        justifyContent: 'center',
    },
    modalCancelButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    modalConfirmButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#667eea',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        width: '100%',
        alignSelf: 'stretch',
    },
    modalDangerButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#dc3545',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        width: '100%',
        alignSelf: 'stretch',
    },
    modalConfirmButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    modalDangerButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    modalButtonDisabled: {
        backgroundColor: '#ccc',
        opacity: 0.6,
    },

    // Стили для списка карточек с красивыми отступами
    listContentContainer: {
        paddingHorizontal: 10,
        paddingTop: 24,
    },

    cardSeparator: {
        height: 20,
    },

    // Стили для индикатора загрузки в модальном окне
    buttonLoader: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 8,
    },
    buttonLoaderDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#667eea',
    },

    // Стили для информационного блока
    infoContainer: {
        backgroundColor: '#f0f2ff',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#667eea',
    },
    infoText: {
        fontSize: 14,
        color: '#1a1a1a',
        lineHeight: 20,
    },

});