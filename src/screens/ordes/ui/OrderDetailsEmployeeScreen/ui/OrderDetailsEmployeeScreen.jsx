import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, ScrollView, RefreshControl, Animated, StatusBar, TouchableOpacity, Text, Modal, TextInput } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { OrderApi } from '@entities/order';
import { useOrders } from '@entities/order';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { selectHasLocalOrderAction, selectLocalOrderActions } from '@entities/order';
import { clearLocalOrderAction, setLocalOrderAction } from '@entities/order/model/slice';
import { CONSTANTS, ORDER_STATUS_LABELS, getStageCompletionHint, canEmployeeTakeOrderByRole, isOrderStatusMatchingRole } from '@entities/order';
import { ToastSimple } from '@shared/ui/Toast/ui/ToastSimple';
import { useCustomAlert } from '@shared/ui/CustomAlert';

// Импорты общих компонентов и утилит
import { useOrderDetails } from '@shared/hooks/useOrderDetails';
import { canCancelOrder, canDownloadInvoice } from '@shared/lib/orderUtils';
import { EMPLOYEE_ROLES, EMPLOYEE_ROLE_LABELS } from '@shared/lib/orderConstants';
import { useOrderDetailsStyles, OrderDetailsScreenThemeProvider, useOrderDetailsScreenBackground, ORDER_DETAILS_CLIENT_DARK_BACKGROUND } from '@shared/ui/OrderDetailsStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OrderHeader } from '@shared/ui/OrderHeader/ui/OrderHeader';
import { DeliveryInfo } from '@shared/ui/DeliveryInfo/ui/DeliveryInfo';
import { OrderItems } from '@shared/ui/OrderItems/ui/OrderItems';
import { OrderLoadingState, OrderErrorState } from '@shared/ui/OrderLoadingState/ui/OrderLoadingState';
import { WaitingStockInfo } from '@shared/ui/WaitingStockInfo';
import { OrderDetailsBackButton } from '@shared/ui/OrderDetailsBackButton/ui/OrderDetailsBackButton';

// Вспомогательные функции для проверки условий (упрощённый флоу)
const canEmployeeTakeOrder = (employeeRole, status, isAdmin = false) => {
    if (isAdmin) return false;
    return canEmployeeTakeOrderByRole(employeeRole, status);
};

const isStatusMatchingRole = (employeeRole, status) => {
    return isOrderStatusMatchingRole(employeeRole, status);
};

const shouldShowWorkButtons = (employeeRole, actualStatus, isAssignedToMe, isAdmin = false) => {
    if (isAdmin) return false;
    return isAssignedToMe && isStatusMatchingRole(employeeRole, actualStatus);
};

const isOrderAssignedToEmployee = (employeeId, assignedId, hasLocalReleased) => {
    return employeeId && assignedId && employeeId === assignedId && !hasLocalReleased;
};

export const OrderDetailsEmployeeScreen = () => (
    <OrderDetailsScreenThemeProvider darkScreenBackground={ORDER_DETAILS_CLIENT_DARK_BACKGROUND}>
        <OrderDetailsEmployeeScreenContent />
    </OrderDetailsScreenThemeProvider>
);

const OrderDetailsEmployeeScreenContent = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { orderId } = route.params || {};
    const { colors } = useTheme();
    const styles = useOrderDetailsStyles();
    const screenBackground = useOrderDetailsScreenBackground();
    const insets = useSafeAreaInsets();
    const scrollContentStyle = [
        styles.scrollContent,
        { paddingBottom: 32 + insets.bottom + 34 },
    ];

    // Хуки
    const { currentUser: user } = useAuth();
    const { downloadInvoice, completeOrderStage, takeOrder, releaseOrder } = useOrders();
    const dispatch = useDispatch();
    const { showError, showSuccess } = useCustomAlert();

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
    const previousOrderIdRef = useRef(null);

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
        lastAction: null,
        actionTimestamp: null,
        temporarySteps: [],
        lastKnownHistoryLength: 0
    });

    const hasLocalCompleted = useSelector(state => selectHasLocalOrderAction(orderId, 'completed')(state));
    const hasLocalTaken = useSelector(state => selectHasLocalOrderAction(orderId, 'taken')(state));
    const hasLocalReleased = useSelector(state => selectHasLocalOrderAction(orderId, 'released')(state));
    const localOrderActions = useSelector(selectLocalOrderActions);

    const wasReleasedByCurrentEmployee = useMemo(() => {
        if (order?.assignedTo?.id || localOrderState.assignedToId) {
            return false;
        }

        const employeeName = user?.employee?.name || '';
        const employeePosition = user?.employee?.position || '';

        return Boolean(order?.statusHistory?.some((historyItem) => {
            const comment = historyItem?.comment || '';
            const isReleaseComment = comment.includes('снят') && comment.includes('работ');
            const isCurrentEmployee = (employeeName && comment.includes(employeeName)) ||
                (employeePosition && comment.includes(employeePosition));

            return isReleaseComment && isCurrentEmployee;
        }));
    }, [order?.assignedTo?.id, order?.statusHistory, localOrderState.assignedToId, user?.employee?.name, user?.employee?.position]);

    const isReleasedState = hasLocalReleased ||
        localOrderState.lastAction === 'released' ||
        wasReleasedByCurrentEmployee;

    useEffect(() => {
        if (!order) return;

        let shouldClearRedux = false;

        setLocalOrderState(prevState => {
            const historyLength = order.statusHistory?.length || 0;
            const latestHistory = order.statusHistory?.[0];
            const isReleaseEntry = latestHistory?.comment?.includes('снят') &&
                latestHistory?.comment?.includes('работ');
            const historyLengthChanged = historyLength !== (prevState.lastKnownHistoryLength || 0);
            const isOurAction = ['completed', 'taken', 'released'].includes(prevState.lastAction);
            const isRecentAction = prevState.actionTimestamp &&
                (Date.now() - prevState.actionTimestamp) < CONSTANTS.RECENT_ACTION_THRESHOLD;

            if (historyLengthChanged && historyLength > (prevState.lastKnownHistoryLength || 0)) {
                if (isReleaseEntry || prevState.lastAction === 'released' || hasLocalReleased) {
                    return {
                        ...prevState,
                        assignedToId: null,
                        status: order.status,
                        lastAction: 'released',
                        actionTimestamp: Date.now(),
                        temporarySteps: [],
                        lastKnownHistoryLength: historyLength
                    };
                }

                if (isOurAction && isRecentAction) {
                    return {
                        ...prevState,
                        status: order.status,
                        lastKnownHistoryLength: historyLength
                    };
                }

                shouldClearRedux = true;
                return {
                    assignedToId: order.assignedTo?.id || null,
                    status: order.status,
                    lastAction: null,
                    actionTimestamp: null,
                    temporarySteps: [],
                    lastKnownHistoryLength: historyLength
                };
            }

            const assignedToId = isReleasedState || hasLocalReleased
                ? null
                : (prevState.assignedToId !== null
                    ? prevState.assignedToId
                    : (order.assignedTo?.id || null));

            if (
                prevState.status === order.status &&
                prevState.assignedToId === assignedToId &&
                prevState.lastKnownHistoryLength === historyLength
            ) {
                return prevState;
            }

            return {
                ...prevState,
                assignedToId,
                status: order.status,
                lastAction: (isReleasedState || hasLocalReleased) ? 'released' : prevState.lastAction,
                lastKnownHistoryLength: historyLength
            };
        });

        if (shouldClearRedux) {
            dispatch(clearLocalOrderAction({ orderId }));
        }
    }, [order, orderId, dispatch, hasLocalReleased, isReleasedState]);

    // Очистка состояния при смене orderId
    useEffect(() => {
        // Если orderId изменился, очищаем старое состояние заказа
        if (previousOrderIdRef.current && previousOrderIdRef.current !== orderId) {
            console.log('OrderDetailsEmployeeScreen - orderId changed, clearing state');
            setOrder(null);
        }
    }, [orderId, setOrder]);

    // Загрузка при фокусе экрана
    useFocusEffect(
        useCallback(() => {
            // Загружаем если:
            // 1. Заказ еще не загружен (!order)
            // 2. Или это другой заказ (orderId !== previousOrderIdRef.current)
            // 3. Или произошла ошибка (error)
            const isDifferentOrder = orderId !== previousOrderIdRef.current;
            const shouldLoad = !order || isDifferentOrder || error;
            
            if (shouldLoad) {
                console.log('OrderDetailsEmployeeScreen - loading order:', orderId, {
                    isDifferentOrder,
                    hasOrder: !!order,
                    hasError: !!error
                });
                previousOrderIdRef.current = orderId;
                loadOrderDetails();
            }
        }, [orderId, order, error, loadOrderDetails])
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
        if (isReleasedState) {
            return false;
        }

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
    }, [user?.employee?.id, user?.employee?.name, user?.employee?.position, user?.employee?.processingRole, localOrderState.assignedToId, localOrderState.status, localOrderState.temporarySteps, localOrderState.lastAction, order?.assignedTo?.id, order?.status, order?.statusHistory, isReleasedState]);

    // Проверяем доступность заказа для взятия
    const isOrderAvailable = useMemo(() => {
        if (order?.status && CONSTANTS.COMPLETED_STATUSES.includes(order.status)) {
            return false;
        }

        const notAssigned = !order?.assignedTo?.id && localOrderState.assignedToId === null;
        const wasReleased = isReleasedState;
        const wasTakenButNotReleased = hasLocalTaken && !wasReleased;

        return notAssigned || wasReleased || wasTakenButNotReleased;
    }, [order?.assignedTo?.id, order?.status, hasLocalTaken, isReleasedState, localOrderState.assignedToId]);

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
        const actualAssignedId = isReleasedState
            ? null
            : (localOrderState.assignedToId !== null
                ? localOrderState.assignedToId
                : order?.assignedTo?.id);
        const actualStatus = localOrderState.status || order?.status;

        // ⚠️ ВАЖНО: Если статус заказа не соответствует роли сотрудника, не показываем кнопки
        // Например, PICKER не должен видеть кнопки для заказа со статусом IN_DELIVERY (это для курьера)
        if (actualStatus && !isStatusMatchingRole(employeeRole, actualStatus) && !isAdmin) {
            console.log('🚫 Статус заказа не соответствует роли сотрудника:', {
                employeeRole,
                actualStatus,
                orderId: order?.id
            });
            return {
                showTakeButton: false,
                showCompleteButton: false,
                showReleaseButton: false,
                canTakeOrder: false,
                canCompleteStage: false,
                canReleaseOrder: false
            };
        }

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

        const isAssignedToMe = isOrderAssignedToEmployee(currentEmployeeId, actualAssignedId, isReleasedState);

        // Если сотрудник только что взял заказ в работу
        if (localOrderState.lastAction === 'taken' && !isAssignedToMe && localOrderState.temporarySteps.length > 0 && !isReleasedState) {
            return {
                showTakeButton: false,
                showCompleteButton: shouldShowWorkButtons(employeeRole, actualStatus, true, isAdmin),
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

        // Если заказ был снят сотрудником — можно снова взять в работу
        if (isReleasedState) {
            const canTakeBasedOnRole = canEmployeeTakeOrder(employeeRole, actualStatus, isAdmin);

            return {
                showTakeButton: canTakeBasedOnRole,
                showCompleteButton: false,
                showReleaseButton: false,
                canTakeOrder: canTakeBasedOnRole,
                canCompleteStage: false,
                canReleaseOrder: false
            };
        }

        // Если заказ назначен сотруднику - показываем кнопки работы с заказом
        if (isAssignedToMe) {
            return {
                showTakeButton: false,
                showCompleteButton: shouldShowWorkButtons(employeeRole, actualStatus, isAssignedToMe, isAdmin),
                showReleaseButton: true,
                canTakeOrder: false,
                canCompleteStage: true,
                canReleaseOrder: true
            };
        }

        // Если заказ доступен для взятия
        if (isOrderAvailable) {
            const canTakeBasedOnRole = canEmployeeTakeOrder(employeeRole, actualStatus, isAdmin);
            const isUnassigned = !actualAssignedId && !order?.assignedTo?.id;
            const canTakeOrder = !isAssignedToMe && canTakeBasedOnRole &&
                (isUnassigned || !hasEmployeeWorkedOnCurrentStatus);

            return {
                showTakeButton: canTakeOrder,
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
    }, [user?.role, user?.employee?.id, user?.employee?.processingRole, order?.assignedTo?.id, order?.status, order?.statusHistory, localOrderState.lastAction, localOrderState.temporarySteps, localOrderState.actionTimestamp, localOrderState.assignedToId, hasEmployeeWorkedOnCurrentStatus, hasLocalCompleted, hasLocalTaken, isReleasedState, isOrderAvailable]);

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
                status: user?.employee?.processingRole === 'PICKER' ? 'PICKING' : 'IN_DELIVERY',
                role: user?.employee?.processingRole,
                roleLabel: user?.employee?.processingRole === 'PICKER' ? 'Сборщик' : 'Курьер',
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
            showError('Ошибка', e.message || 'Не удалось взять заказ');

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
    }, [orderId, takeOrder, user?.employee, order?.status, dispatch, loadOrderDetails, showError]);

    // Обработка завершения этапа
    const handleProcessOrder = useCallback(async () => {
        try {
            setProcessingOrder(true);

            const result = await completeOrderStage(orderId, processingComment.trim() || undefined);

            if (result.success) {
                const fullEmployeeName = `${user?.employee?.name || 'Сотрудник'} ${user?.employee?.position || ''}`.trim();
                // Определяем следующий статус в цепочке обработки.
                // Упрощённый флоу: PICKER -> IN_DELIVERY, COURIER -> DELIVERED.
                const newStatus = user?.employee?.processingRole === 'COURIER'
                    ? (order?.status === 'PICKING' ? 'IN_DELIVERY' : 'DELIVERED')
                    : 'IN_DELIVERY';

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
                    roleLabel: user?.employee?.processingRole === 'PICKER' ? 'Сборщик' : 'Курьер',
                    stepType: 'completed',
                    employeeName: fullEmployeeName,
                    employeePosition: user?.employee?.position || '',
                    comment: processingComment.trim()
                        || `${user?.employee?.processingRole === 'PICKER' ? 'Сборка' : 'Доставка'} завершена`,
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
            showError('Ошибка', err.message || 'Не удалось завершить этап заказа');
        } finally {
            setProcessingOrder(false);
        }
    }, [orderId, processingComment, completeOrderStage, user?.employee, order?.status, loadOrderDetails, showError]);

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

            dispatch(setLocalOrderAction({
                orderId: orderId,
                action: 'taken',
                value: false
            }));

            setLocalOrderState(prevState => ({
                ...prevState,
                assignedToId: null,
                status: order?.status || prevState.status,
                lastAction: 'released',
                actionTimestamp: Date.now(),
                temporarySteps: [],
                lastKnownHistoryLength: order?.statusHistory?.length || prevState.lastKnownHistoryLength || 0
            }));

            setToastConfig({
                message: 'Заказ снят с работы',
                type: 'success',
                duration: 3000
            });

            // Обновляем данные с сервера сразу
            loadOrderDetails(true);

        } catch (err) {
            console.error('❌ Ошибка при снятии заказа с работы:', err);
            showError('Ошибка', err.message || 'Не удалось снять заказ с работы');
        } finally {
            setReleasing(false);
        }
    }, [orderId, releaseOrder, order?.status, dispatch, loadOrderDetails, showError]);

    // Обработка скачивания накладной
    const handleDownloadInvoice = useCallback(async () => {
        try {
            setDownloadingInvoice(true);
            const result = await downloadInvoice(orderId);

            if (result.success) {
                showSuccess( `Накладная "${result.filename}" успешно сохранена`);
            } else {
                throw new Error(result.error || 'Не удалось скачать накладную');
            }
        } catch (err) {
            console.error('Ошибка при скачивании накладной:', err);
            showError('Ошибка', err.message || 'Не удалось скачать накладную');
        } finally {
            setDownloadingInvoice(false);
        }
    }, [orderId, downloadInvoice, showSuccess, showError]);

    // Обработчик для нажатия на товар
    const handleProductPress = useCallback((productId) => {
        if (!productId) return;
        
        // Для сотрудников и админов используем навигацию через стек Admin
        try {
            navigation.navigate('ProductDetail', {
                productId,
                fromScreen: 'StaffOrderDetails'
            });
        } catch (error) {
            console.error('Navigation error:', error);
        }
    }, [navigation]);

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
            isReleasedState,
            localOrderActions,
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
                hasLocalReleased: isReleasedState,
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
                                {getStageCompletionHint(user?.employee?.processingRole, order?.status)}
                            </Text>
                        </View>

                        <View style={styles.commentContainer}>
                            <Text style={styles.commentLabel}>Комментарий (необязательно):</Text>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Введите комментарий к завершению этапа..."
                                placeholderTextColor={colors.textTertiary}
                                value={processingComment}
                                onChangeText={setProcessingComment}
                                multiline
                                numberOfLines={3}
                                keyboardAppearance={colors.keyboardAppearance}
                                selectionColor={screenBackground}
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
        return (
            <>
                <OrderDetailsBackButton fallbackScreen="StaffOrders" />
                <OrderLoadingState />
            </>
        );
    }

    // Рендер ошибки
    if (error && !loading) {
        return (
            <>
                <OrderDetailsBackButton fallbackScreen="StaffOrders" />
                <OrderErrorState
                    error={error}
                    onRetry={() => loadOrderDetails()}
                />
            </>
        );
    }

    // Основной рендер
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={screenBackground} />
            <OrderDetailsBackButton fallbackScreen="StaffOrders" />

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
                    contentContainerStyle={scrollContentStyle}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={refreshOrderDetails}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                            progressBackgroundColor={colors.surface}
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
                            <OrderItems 
                                order={order}
                                onProductPress={handleProductPress}
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
