import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, ScrollView, RefreshControl, Animated, Alert, StatusBar, TouchableOpacity, Text, Modal, TextInput } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { OrderApi } from '@entities/order';
import { useOrders } from '@entities/order';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { selectHasLocalOrderAction, selectLocalOrderActions } from '@entities/order';
import { clearLocalOrderAction, setLocalOrderAction } from '@entities/order/model/slice';
import { CONSTANTS } from '@entities/order/lib/constants';
import { ToastSimple } from '@shared/ui/Toast/ui/ToastSimple';

// Импорты общих компонентов и утилит
import { useOrderDetails } from '@shared/hooks/useOrderDetails';
import { canCancelOrder, canDownloadInvoice, canViewProcessingHistory } from '@shared/lib/orderUtils';
import { EMPLOYEE_ROLES, EMPLOYEE_ROLE_LABELS, ORDER_STATUS_LABELS } from '@shared/lib/orderConstants';
import { createOrderDetailsStyles } from '@shared/ui/OrderDetailsStyles';
import { OrderHeader } from '@shared/ui/OrderHeader/ui/OrderHeader';
import { DeliveryInfo } from '@shared/ui/DeliveryInfo/ui/DeliveryInfo';
import { OrderItems } from '@shared/ui/OrderItems/ui/OrderItems';
import { OrderProcessingHistory } from '@shared/ui/OrderProcessingHistory/ui/OrderProcessingHistory';
import { OrderLoadingState, OrderErrorState } from '@shared/ui/OrderLoadingState/ui/OrderLoadingState';
import { WaitingStockInfo } from '@shared/ui/WaitingStockInfo';

const styles = createOrderDetailsStyles();

// Вспомогательные функции для проверки условий
const canEmployeeTakeOrder = (employeeRole, status, isAdmin = false) => {
    // Админы не могут брать заказы в работу - только просматривают
    if (isAdmin) return false;
    
    if (employeeRole === 'PICKER' && status === 'PENDING') return true;
    if (employeeRole === 'PACKER') return false; // PACKER больше не может брать заказы
    if (employeeRole === 'COURIER' && status === 'IN_DELIVERY') return true;
    return false;
};

const isOrderAssignedToEmployee = (employeeId, assignedId, hasLocalReleased) => {
    return employeeId && assignedId && employeeId === assignedId && !hasLocalReleased;
};

const shouldShowWorkButtons = (isAssignedToMe, actualStatus, isAdmin = false) => {
    // Админы не могут завершать этапы - только просматривают
    if (isAdmin) return false;
    
    return isAssignedToMe && ['PENDING', 'CONFIRMED', 'IN_DELIVERY'].includes(actualStatus);
};

export const OrderDetailsEmployeeScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { orderId } = route.params || {};

    // Хуки
    const { currentUser: user } = useAuth();
    const { downloadInvoice, completeOrderStage, takeOrder, releaseOrder } = useOrders();
    const dispatch = useDispatch();

    // Состояние компонента
    const [taking, setTaking] = useState(false);
    const [releasing, setReleasing] = useState(false);
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);
    const [processingModalVisible, setProcessingModalVisible] = useState(false);
    const [processingComment, setProcessingComment] = useState('');
    const [processingOrder, setProcessingOrder] = useState(false);
    const [toastConfig, setToastConfig] = useState(null);

    // Анимации
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // Синхронизация localOrderState с Redux состоянием
    useEffect(() => {
        if (hasLocalReleased && localOrderState && localOrderState.lastAction !== 'released') {
            setLocalOrderState(prevState => ({
                ...prevState,
                lastAction: 'released',
                actionTimestamp: Date.now()
            }));
        }
    }, [hasLocalReleased, localOrderState?.lastAction]);

    // Используем общий хук для работы с деталями заказа
    const {
        order,
        loading,
        refreshing,
        error,
        loadOrderDetails,
        refreshOrderDetails,
        setOrder
    } = useOrderDetails(orderId);

    // Локальное состояние для отслеживания действий сотрудника
    const [localOrderState, setLocalOrderState] = useState({
        assignedToId: null,
        status: null,
        lastAction: null, // 'taken' | 'completed' | null
        actionTimestamp: null,
        temporarySteps: [] // Массив временных этапов
    });

    // Синхронизация локального состояния с данными заказа
    useEffect(() => {
        if (order) {
            setLocalOrderState(prevState => {
                // Не перезаписываем assignedToId, если он был установлен локально
                const newState = {
                    ...prevState,
                    // Только обновляем assignedToId если локальное значение не было установлено
                    assignedToId: prevState.assignedToId !== null ? prevState.assignedToId : (order.assignedTo?.id || null),
                    status: order.status,
                    lastKnownHistoryLength: order?.statusHistory?.length || 0
                };

                console.log('🔄 Синхронизация локального состояния:', {
                    prevAssignedToId: prevState.assignedToId,
                    orderAssignedToId: order.assignedTo?.id,
                    newAssignedToId: newState.assignedToId,
                    prevLastAction: prevState.lastAction,
                    prevStatus: prevState.status,
                    orderStatus: order.status
                });

                // Если данные изменились, проверяем нужно ли обновлять временные этапы
                const hasDataChanged = prevState.assignedToId !== newState.assignedToId ||
                                      prevState.status !== newState.status ||
                                      (prevState.lastKnownHistoryLength !== (order?.statusHistory?.length || 0));

                if (hasDataChanged) {
                    const historyLengthChanged = prevState.lastKnownHistoryLength !== (order?.statusHistory?.length || 0);

                    if (historyLengthChanged) {
                        if ((order?.statusHistory?.length || 0) > prevState.lastKnownHistoryLength) {
                            // Проверяем, было ли изменение вызвано нашим действием
                            const isOurAction = prevState.lastAction === 'completed' || prevState.lastAction === 'taken' || prevState.lastAction === 'released';
                            const isRecentAction = prevState.actionTimestamp && (Date.now() - prevState.actionTimestamp) < 5000; // 5 секунд

                            if (!isOurAction || !isRecentAction) {
                                console.log('🔄 Обнаружено изменение статуса заказа, сбрасываем локальное состояние');
                                newState.lastAction = null;
                                newState.actionTimestamp = null;
                                newState.assignedToId = order.assignedTo?.id || null; // Теперь можно обновить
                                newState.temporarySteps = [];

                                // Очищаем все локальные действия для этого заказа
                                dispatch(clearLocalOrderAction({ orderId }));

                                // Не сбрасываем флаг released автоматически - он должен оставаться true,
                                // чтобы заказ оставался доступным для взятия в работу другими сотрудниками
                                // Флаг released сбрасывается только при взятии заказа в работу
                            }
                        }
                    }
                }

                return newState;
            });
        }
    }, [order?.assignedTo?.id, order?.status, order?.statusHistory?.length, orderId, dispatch]);

    // Загрузка при фокусе экрана
    useFocusEffect(
        useCallback(() => {
            loadOrderDetails();
        }, [loadOrderDetails])
    );

    // Запуск анимации при загрузке заказа
    useEffect(() => {
        if (order && !loading) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [order, loading, fadeAnim, slideAnim]);

    // Проверяем, работал ли уже сотрудник с этим заказом в текущем статусе
    const hasEmployeeWorkedOnCurrentStatus = useMemo(() => {
        const currentEmployeeId = user?.employee?.id;
        if (!currentEmployeeId) return false;

        const actualAssignedId = localOrderState.assignedToId !== null ? localOrderState.assignedToId : order?.assignedTo?.id;
        const actualStatus = localOrderState.status || order?.status;
        const employeeRole = user?.employee?.processingRole;

        console.log('🔍 hasEmployeeWorkedOnCurrentStatus: проверка работы сотрудника', {
            currentEmployeeId,
            actualStatus,
            employeeRole,
            localOrderStateStatus: localOrderState.status,
            orderStatus: order?.status,
            temporaryStepsLength: localOrderState.temporarySteps.length,
            statusHistoryLength: order?.statusHistory?.length || 0,
            userName: user?.employee?.name,
            userPosition: user?.employee?.position
        });

        const tempStepsForCurrentStatus = localOrderState.temporarySteps.filter(step => {
            const matches = step.role === employeeRole &&
                           step.originalStatus === actualStatus &&
                           step.employeeName?.includes(user?.employee?.name || '');
            if (matches) {
                console.log('🎯 Найден временный шаг:', step);
            }
            return matches;
        });

        const historyStepsForCurrentStatus = order?.statusHistory?.filter(historyItem => {
            const matches = historyItem.comment &&
                           (historyItem.comment.includes(user?.employee?.name || '') ||
                            historyItem.comment.includes(user?.employee?.position || '')) &&
                           historyItem.status === actualStatus &&
                           !historyItem.comment.includes('снят с работы'); // Исключаем шаги снятия с работы
            if (matches) {
                console.log('🎯 Найден шаг в истории:', historyItem);
            }
            return matches;
        }) || [];

        console.log('✅ hasEmployeeWorkedOnCurrentStatus: результат', {
            tempStepsCount: tempStepsForCurrentStatus.length,
            historyStepsCount: historyStepsForCurrentStatus.length,
            result: tempStepsForCurrentStatus.length > 0 || historyStepsForCurrentStatus.length > 0
        });

        return tempStepsForCurrentStatus.length > 0 || historyStepsForCurrentStatus.length > 0;
    }, [user?.employee?.id, user?.employee?.name, user?.employee?.position, user?.employee?.processingRole, localOrderState.assignedToId, localOrderState.status, localOrderState.temporarySteps, order?.assignedTo?.id, order?.status, order?.statusHistory]);

    // Проверяем локальные действия
    const hasLocalCompleted = useSelector(state => selectHasLocalOrderAction(orderId, 'completed')(state));
    const hasLocalTaken = useSelector(state => selectHasLocalOrderAction(orderId, 'taken')(state));
    const hasLocalReleased = useSelector(state => selectHasLocalOrderAction(orderId, 'released')(state));

    console.log('🔍 Состояние селекторов:', {
        orderId,
        hasLocalReleased,
        hasLocalTaken,
        hasLocalCompleted,
        localOrderActions: useSelector(selectLocalOrderActions)
    });

    // Проверяем доступность заказа для взятия
    const isOrderAvailable = useMemo(() => {
        // Завершенные заказы недоступны для взятия в работу
        if (order?.status && CONSTANTS.COMPLETED_STATUSES.includes(order.status)) {
            return false;
        }

        const notAssigned = !order?.assignedTo?.id;
        const wasReleased = hasLocalReleased;
        const wasTakenButNotReleased = hasLocalTaken && !hasLocalReleased;

        return notAssigned || wasReleased || wasTakenButNotReleased;
    }, [order?.assignedTo?.id, order?.status, hasLocalTaken, hasLocalReleased]);

    // Логика кнопок для сотрудников
    const employeeButtonLogic = useMemo(() => {
        const isEmployee = user?.role === 'EMPLOYEE';
        const isAdmin = user?.role === 'ADMIN';

        if (!isEmployee && !isAdmin) {
            return {
                showTakeButton: false,
                showCompleteButton: false,
                showReleaseButton: false,
                canTakeOrder: false,
                canCompleteStage: false,
                canReleaseOrder: false
            };
        }

        const currentEmployeeId = user?.employee?.id;
        const employeeRole = user?.employee?.processingRole;

        // После снятия заказа используем локальное состояние
        const actualAssignedId = localOrderState.assignedToId !== null ? localOrderState.assignedToId :
                                (localOrderState.lastAction === 'released' ? null : order?.assignedTo?.id);
        const actualStatus = localOrderState.status || order?.status;

        // Проверяем, является ли заказ завершенным или уже обработанным
        const isOrderCompleted = actualStatus && CONSTANTS.COMPLETED_STATUSES.includes(actualStatus);
        const isAlreadyProcessedByMe = localOrderState.lastAction === 'completed' && localOrderState.status;

        if (isOrderCompleted || isAlreadyProcessedByMe) {
            return {
                showTakeButton: false,
                showCompleteButton: false,
                showReleaseButton: false,
                canTakeOrder: false,
                canCompleteStage: false,
                canReleaseOrder: false
            };
        }

        const isAssignedToMe = isOrderAssignedToEmployee(currentEmployeeId, actualAssignedId, hasLocalReleased);

        // Если сотрудник только что взял заказ в работу
        if (localOrderState.lastAction === 'taken' && !isAssignedToMe && localOrderState.temporarySteps.length > 0 && !hasLocalReleased) {
            return {
                showTakeButton: false,
                showCompleteButton: shouldShowWorkButtons(true, actualStatus, isAdmin),
                showReleaseButton: true,
                canTakeOrder: false,
                canCompleteStage: true,
                canReleaseOrder: true
            };
        }

        // Если сотрудник только что завершил этап
        if (localOrderState.lastAction === 'completed' || hasLocalCompleted) {
            return {
                showTakeButton: false,
                showCompleteButton: false,
                showReleaseButton: false,
                canTakeOrder: false,
                canCompleteStage: false,
                canReleaseOrder: false
            };
        }

        // Если заказ был снят сотрудником - показываем кнопку "Взять в работу"
        if (hasLocalReleased || localOrderState.lastAction === 'released') {
            const canTakeBasedOnRole = canEmployeeTakeOrder(employeeRole, actualStatus, isAdmin);
            const canTakeOrder = canTakeBasedOnRole && !hasEmployeeWorkedOnCurrentStatus;

            return {
                showTakeButton: canTakeOrder,
                showCompleteButton: false,
                showReleaseButton: false,
                canTakeOrder,
                canCompleteStage: false,
                canReleaseOrder: false
            };
        }

        // Если заказ назначен сотруднику - показываем кнопки работы с заказом
        if (isAssignedToMe) {
            return {
                showTakeButton: false,
                showCompleteButton: shouldShowWorkButtons(isAssignedToMe, actualStatus, isAdmin),
                showReleaseButton: true,
                canTakeOrder: false,
                canCompleteStage: true,
                canReleaseOrder: true
            };
        }

        // Если заказ доступен для взятия
        if (isOrderAvailable) {
            const canTakeBasedOnRole = canEmployeeTakeOrder(employeeRole, actualStatus, isAdmin);

            // Проверяем, может ли сотрудник взять заказ повторно
            const hasEmployeeReleasedOrder = order?.statusHistory?.some(historyItem =>
                historyItem.comment &&
                historyItem.comment.includes(user?.employee?.name || '') &&
                historyItem.comment.includes('снят с работы')
            ) || false;

            const canTakeAgainAfterRelease = localOrderState.lastAction === 'released' &&
                                            localOrderState.actionTimestamp &&
                                            (Date.now() - localOrderState.actionTimestamp) < 30000;

            const canTakeOrder = !isAssignedToMe && canTakeBasedOnRole &&
                                (!hasEmployeeWorkedOnCurrentStatus || canTakeAgainAfterRelease || hasEmployeeReleasedOrder);

            return {
                showTakeButton: canTakeOrder && (!isAssignedToMe || hasLocalReleased),
                showCompleteButton: false,
                showReleaseButton: false,
                canTakeOrder,
                canCompleteStage: false,
                canReleaseOrder: false
            };
        }

        return {
            showTakeButton: false,
            showCompleteButton: false,
            showReleaseButton: false,
            canTakeOrder: false,
            canCompleteStage: false,
            canReleaseOrder: false
        };
    }, [user?.role, user?.employee?.id, user?.employee?.processingRole, order?.assignedTo?.id, order?.status, order?.statusHistory, localOrderState.lastAction, localOrderState.temporarySteps, localOrderState.actionTimestamp, hasEmployeeWorkedOnCurrentStatus, hasLocalCompleted, hasLocalTaken, hasLocalReleased, isOrderAvailable]);

    // Обработка взятия заказа в работу
    const handleTakeOrder = useCallback(async () => {
        try {
            setTaking(true);
            const res = await takeOrder(orderId, 'Взял заказ в работу');
            if (!res.success) throw new Error(res.error);

            // Создаем временный этап
            const fullEmployeeName = `${user?.employee?.name || 'Сотрудник'} ${user?.employee?.position || ''}`.trim();
            const tempStep = {
                id: `temp-${Date.now()}`,
                status: user?.employee?.processingRole === 'PICKER' ? 'PICKING' :
                       user?.employee?.processingRole === 'PACKER' ? 'PACKING' : 'IN_DELIVERY', // PACKER этап убран, но оставлено для совместимости
                role: user?.employee?.processingRole,
                roleLabel: user?.employee?.processingRole === 'PICKER' ? 'Сборщик' :
                          user?.employee?.processingRole === 'PACKER' ? 'Упаковщик' : 'Курьер',
                stepType: 'started',
                employeeName: fullEmployeeName,
                employeePosition: user?.employee?.position || '',
                comment: `${fullEmployeeName} взял заказ в работу`,
                createdAt: new Date().toISOString(),
                originalStatus: order?.status,
                isTemporary: true
            };

            // Обновляем локальное состояние
            const newAssignedToId = user?.employee?.id || null;
            console.log('🔄 Обновляем локальное состояние после взятия заказа:', {
                employeeId: user?.employee?.id,
                newAssignedToId,
                orderId
            });

            setLocalOrderState(prevState => ({
                ...prevState,
                assignedToId: newAssignedToId,
                status: order?.status || null,
                lastAction: 'taken',
                actionTimestamp: Date.now(),
                temporarySteps: [tempStep],
                lastKnownHistoryLength: prevState.lastKnownHistoryLength
            }));

            // Устанавливаем состояние в Redux
            dispatch(setLocalOrderAction({
                orderId: orderId,
                action: 'taken',
                value: true
            }));

            // Очищаем флаг released, так как заказ снова взят в работу
            dispatch(setLocalOrderAction({
                orderId: orderId,
                action: 'released',
                value: false
            }));

            setToastConfig({
                message: 'Заказ взят в работу',
                type: 'success',
                duration: 3000
            });

            // Ждем немного перед обновлением, чтобы локальное состояние применилось
            setTimeout(() => {
                console.log('🔄 Запускаем обновление данных с сервера после взятия заказа');
                loadOrderDetails(true);
            }, 100);
        } catch (e) {
            console.error('Ошибка при взятии заказа в работу:', e);
            Alert.alert('Ошибка', e.message || 'Не удалось взять заказ');

            // Очищаем состояния в случае ошибки
            setLocalOrderState(prevState => ({
                ...prevState,
                assignedToId: null,
                status: order?.status || null,
                lastAction: null,
                actionTimestamp: null,
                temporarySteps: []
            }));

            dispatch(clearLocalOrderAction({ orderId }));
        } finally {
            setTaking(false);
        }
    }, [orderId, takeOrder, user?.employee, order?.status, dispatch, loadOrderDetails]);

    // Обработка завершения этапа
    const handleProcessOrder = useCallback(async () => {
        try {
            setProcessingOrder(true);

            const result = await completeOrderStage(orderId, processingComment.trim() || undefined);

            if (result.success) {
                const fullEmployeeName = `${user?.employee?.name || 'Сотрудник'} ${user?.employee?.position || ''}`.trim();
                // Определяем следующий статус в цепочке обработки
                const newStatus = user?.employee?.processingRole === 'PICKER' ? 'IN_DELIVERY' : // Пропускаем этап упаковки
                               user?.employee?.processingRole === 'PACKER' ? 'PACKING_COMPLETED' : 'DELIVERED';

                console.log('🎯 Обработка заказа завершена:', {
                    employeeRole: user?.employee?.processingRole,
                    currentStatus: order?.status,
                    newStatus,
                    orderId
                });

                const completedTempStep = {
                    id: `temp-completed-${Date.now()}`,
                    status: newStatus,
                    role: user?.employee?.processingRole,
                    roleLabel: user?.employee?.processingRole === 'PICKER' ? 'Сборщик' :
                              user?.employee?.processingRole === 'PACKER' ? 'Упаковщик' : 'Курьер',
                    stepType: 'completed',
                    employeeName: fullEmployeeName,
                    employeePosition: user?.employee?.position || '',
                    comment: processingComment.trim() || `${user?.employee?.processingRole === 'PICKER' ? 'Сборка' :
                             user?.employee?.processingRole === 'PACKER' ? 'Упаковка' : 'Доставка'} завершена`,
                    createdAt: new Date().toISOString(),
                    originalStatus: order?.status,
                    isTemporary: true
                };

                // Сохраняем действие в Redux для сохранения состояния
                dispatch(setLocalOrderAction({
                    orderId: orderId,
                    action: 'completed',
                    value: true
                }));

                // Обновляем локальное состояние с новым статусом
                console.log('🔄 handleProcessOrder: обновляем локальное состояние', {
                    oldStatus: order?.status,
                    newStatus,
                    employeeRole: user?.employee?.processingRole,
                    orderId
                });

                setLocalOrderState(prevState => ({
                    assignedToId: prevState.assignedToId,
                    status: newStatus, // Обновляем статус на новый после обработки
                    lastAction: 'completed',
                    actionTimestamp: Date.now(),
                    temporarySteps: [...(prevState.temporarySteps || []), completedTempStep],
                    lastKnownHistoryLength: prevState.lastKnownHistoryLength
                }));

                setToastConfig({
                    message: 'Этап заказа успешно обработан',
                    type: 'success',
                    duration: 3000
                });

                setProcessingModalVisible(false);
                setProcessingComment('');

                // Обновляем данные в фоне
                setTimeout(() => {
                    loadOrderDetails(true);
                }, 1000);
            } else {
                throw new Error(result.error || 'Не удалось завершить этап заказа');
            }
        } catch (err) {
            console.error('Ошибка при обработке заказа:', err);
            Alert.alert('Ошибка', err.message || 'Не удалось завершить этап заказа');
        } finally {
            setProcessingOrder(false);
        }
    }, [orderId, processingComment, completeOrderStage, user?.employee, order?.status, loadOrderDetails]);

    // Обработка снятия заказа с работы
    const handleReleaseOrder = useCallback(async () => {
        try {
            setReleasing(true);
            console.log('🚀 Начинаем снятие заказа с работы:', orderId);

            const result = await releaseOrder(orderId, 'Снят с работы сотрудником');
            if (!result.success) throw new Error(result.error);

            console.log('✅ Заказ успешно снят через API');

            // Устанавливаем флаг released в Redux для немедленного отображения кнопки "Взять в работу"
            dispatch(setLocalOrderAction({
                orderId: orderId,
                action: 'released',
                value: true
            }));

            console.log('📝 Redux action отправлен');

            // Локальное состояние обновится автоматически через useEffect синхронизации с Redux

            setToastConfig({
                message: 'Заказ снят с работы',
                type: 'success',
                duration: 3000
            });

            // Обновляем данные с сервера сразу
            loadOrderDetails(true);

        } catch (err) {
            console.error('❌ Ошибка при снятии заказа с работы:', err);
            Alert.alert('Ошибка', err.message || 'Не удалось снять заказ с работы');
        } finally {
            setReleasing(false);
        }
    }, [orderId, releaseOrder, order?.status, dispatch, loadOrderDetails]);

    // Обработка скачивания накладной
    const handleDownloadInvoice = useCallback(async () => {
        try {
            setDownloadingInvoice(true);
            const result = await downloadInvoice(orderId);

            if (result.success) {
                Alert.alert('Успех', `Накладная "${result.filename}" успешно сохранена`);
            } else {
                throw new Error(result.error || 'Не удалось скачать накладную');
            }
        } catch (err) {
            console.error('Ошибка при скачивании накладной:', err);
            Alert.alert('Ошибка', err.message || 'Не удалось скачать накладную');
        } finally {
            setDownloadingInvoice(false);
        }
    }, [orderId, downloadInvoice]);

    // Рендер кнопок действий
    const renderEmployeeActions = () => {
        if (!order) return null;

        const { showTakeButton, showCompleteButton, showReleaseButton } = employeeButtonLogic;
        const showDownloadButton = canDownloadInvoice(user?.role);

        console.log('🎯 renderEmployeeActions', {
            showTakeButton,
            showCompleteButton,
            showReleaseButton,
            showDownloadButton,
            isOrderAvailable,
            hasLocalReleased,
            localOrderState: {
                assignedToId: localOrderState.assignedToId,
                lastAction: localOrderState.lastAction,
                actionTimestamp: localOrderState.actionTimestamp
            },
            orderAssignedTo: order?.assignedTo?.id,
            userRole: user?.role,
            userEmployeeId: user?.employee?.id
        });

        if (!showTakeButton && !showCompleteButton && !showDownloadButton && !showReleaseButton) {
            console.log('❌ Нет кнопок для отображения:', {
                showTakeButton,
                showCompleteButton,
                showDownloadButton,
                showReleaseButton,
                isAssignedToMe: user?.employee?.id && order?.assignedTo?.id && user.employee.id === order.assignedTo.id,
                hasLocalReleased,
                lastAction: localOrderState.lastAction
            });
            return null;
        }

        return (
            <View style={styles.actionsContainer}>
                {/* Кнопка "Взять в работу" */}
                {showTakeButton && (
                    <TouchableOpacity
                        style={styles.processButton}
                        onPress={handleTakeOrder}
                        disabled={taking}
                        activeOpacity={0.8}
                    >
                        <View style={styles.buttonContent}>
                            {taking ? (
                                <View style={styles.buttonLoader}>
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                </View>
                            ) : (
                                <>
                                    <Icon name="handshake" size={20} color="#fff" />
                                    <Text style={styles.processButtonText}>Взять в работу</Text>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
                )}

                {/* Кнопка "Завершить этап" */}
                {showCompleteButton && (
                    <TouchableOpacity
                        style={styles.processButton}
                        onPress={() => setProcessingModalVisible(true)}
                        disabled={processingOrder}
                        activeOpacity={0.8}
                    >
                        <View style={styles.buttonContent}>
                            {processingOrder ? (
                                <View style={styles.buttonLoader}>
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                </View>
                            ) : (
                                <>
                                    <Icon name="check-circle" size={20} color="#fff" />
                                    <Text style={styles.processButtonText}>Завершить этап</Text>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
                )}

                {/* Кнопка "Снять с работы" */}
                {showReleaseButton && (
                    <TouchableOpacity
                        style={[styles.cancelButton, { backgroundColor: '#FF9800' }]}
                        onPress={handleReleaseOrder}
                        disabled={releasing}
                        activeOpacity={0.8}
                    >
                        <View style={styles.buttonContent}>
                            {releasing ? (
                                <View style={styles.buttonLoader}>
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                </View>
                            ) : (
                                <>
                                    <Icon name="undo" size={20} color="#fff" />
                                    <Text style={styles.cancelButtonText}>Снять с работы</Text>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
                )}

                {/* Кнопка скачивания накладной */}
                {showDownloadButton && (
                    <TouchableOpacity
                        style={[styles.downloadButton, (showTakeButton || showCompleteButton || showReleaseButton) && styles.buttonSpacing]}
                        onPress={handleDownloadInvoice}
                        disabled={downloadingInvoice}
                        activeOpacity={0.8}
                    >
                        <View style={styles.buttonContent}>
                            {downloadingInvoice ? (
                                <View style={styles.buttonLoader}>
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                </View>
                            ) : (
                                <>
                                    <Icon name="description" size={20} color="#fff" />
                                    <Text style={styles.downloadButtonText}>Скачать накладную</Text>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    // Рендер модального окна обработки заказа
    const renderProcessingModal = () => (
        <Modal
            visible={processingModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setProcessingModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Завершение этапа обработки</Text>
                        <Text style={styles.modalSubtitle}>
                            {order?.orderNumber ? `Заказ ${order.orderNumber}` : ''}
                        </Text>
                    </View>

                    <View style={styles.modalBody}>
                        <View style={styles.currentStatusContainer}>
                            <Text style={styles.currentStatusLabel}>Текущий статус:</Text>
                            <Text style={styles.currentStatusText}>
                                {order ? ORDER_STATUS_LABELS[order.status] : ''}
                            </Text>
                        </View>

                        <View style={styles.infoContainer}>
                            <Text style={styles.infoText}>
                                При нажатии "Завершить этап" заказ автоматически перейдет к следующему сотруднику в цепочке обработки.
                            </Text>
                        </View>

                        <View style={styles.commentContainer}>
                            <Text style={styles.commentLabel}>Комментарий (необязательно):</Text>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Введите комментарий к завершению этапа..."
                                value={processingComment}
                                onChangeText={setProcessingComment}
                                multiline
                                numberOfLines={3}
                                maxLength={500}
                            />
                            <Text style={styles.commentCounter}>
                                {processingComment.length}/500
                            </Text>
                        </View>
                    </View>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={styles.modalCancelButton}
                            onPress={() => setProcessingModalVisible(false)}
                            disabled={processingOrder}
                        >
                            <Text style={styles.modalCancelButtonText}>Отмена</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalConfirmButton, processingOrder && styles.modalButtonDisabled]}
                            onPress={handleProcessOrder}
                            disabled={processingOrder}
                        >
                            {processingOrder ? (
                                <View style={styles.buttonLoader}>
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                </View>
                            ) : (
                                <Text style={styles.modalConfirmButtonText}>Завершить этап</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Рендер скелетона загрузки
    if (loading && !refreshing) {
        return <OrderLoadingState />;
    }

    // Рендер ошибки
    if (error && !loading) {
        return (
            <OrderErrorState
                error={error}
                onRetry={() => loadOrderDetails()}
            />
        );
    }

    // Основной рендер
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#667eea" />

            <Animated.View
                style={[
                    styles.animatedContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }
                ]}
            >
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={refreshOrderDetails}
                            colors={['#667eea']}
                            tintColor="#667eea"
                            progressBackgroundColor="#fff"
                        />
                    }
                >
                    {order && (
                        <>
                            <OrderHeader order={order} />
                            <WaitingStockInfo order={order} />
                            <DeliveryInfo
                                order={order}
                                userRole={user?.role}
                                assignedTo={order.assignedTo}
                            />
                            <OrderItems order={order} />
                            <OrderProcessingHistory
                                order={order}
                                userRole={user?.role}
                                temporarySteps={localOrderState.temporarySteps}
                            />
                            {renderEmployeeActions()}
                        </>
                    )}
                </ScrollView>
            </Animated.View>

            {/* Модальное окно обработки заказа */}
            {renderProcessingModal()}

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
};
