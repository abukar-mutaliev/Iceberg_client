import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    Alert,
    StatusBar,
    Dimensions,
    RefreshControl,
    Animated,
    Modal,
    TextInput
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { OrderApi } from '@entities/order';
import { useOrders } from '@entities/order';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { selectHasLocalOrderAction } from '@entities/order/model/selectors';
import { clearLocalOrderAction } from '@entities/order/model/slice';
import { Loader } from "@shared/ui/Loader";
import { ToastSimple } from '@shared/ui/Toast/ui/ToastSimple';

// Временно определяем константы локально
const ORDER_STATUS_LABELS = {
    PENDING: 'Ожидает обработки',
    PICKING: 'Взял в работу',
    CONFIRMED: 'Сборка завершена',
    PACKING: 'Взял в работу',
    PACKING_COMPLETED: 'Упаковка завершена',
    IN_DELIVERY: 'В доставке',
    DELIVERED: 'Доставлен',
    CANCELLED: 'Отменен',
    RETURNED: 'Возвращен'
};

const ORDER_STATUS_COLORS = {
    PENDING: '#FFA726',
    PICKING: '#FF7043',
    CONFIRMED: '#42A5F5',
    PACKING: '#AB47BC',
    PACKING_COMPLETED: '#7E57C2',
    IN_DELIVERY: '#5C6BC0',
    DELIVERED: '#66BB6A',
    CANCELLED: '#EF5350',
    RETURNED: '#78909C'
};

const ORDER_STATUS_ICONS = {
    PENDING: 'schedule',
    PICKING: 'inventory',
    CONFIRMED: 'check-circle',
    PACKING: 'package',
    PACKING_COMPLETED: 'done-all',
    IN_DELIVERY: 'local-shipping',
    DELIVERED: 'done-all',
    CANCELLED: 'cancel',
    RETURNED: 'undo'
};

const getOrderProgress = (status) => {
    const progressMap = {
        PENDING: 0,
        CONFIRMED: 33,
        IN_DELIVERY: 66,
        DELIVERED: 100,
        CANCELLED: 0,
        RETURNED: 0
    };
    return progressMap[status] || 0;
};

const formatAmount = (amount, currency = 'RUB') => {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency
    }).format(amount || 0);
};

const formatOrderNumber = (orderNumber) => {
    if (!orderNumber) return '';
    if (orderNumber.startsWith('ORD-')) {
        return orderNumber;
    }
    return `№${orderNumber}`;
};

// Функция для склонения слова "коробка"
const formatBoxesCount = (count) => {
    const num = parseInt(count);

    if (num % 10 === 1 && num % 100 !== 11) {
        return `${num} коробка`;
    } else if (num % 10 >= 2 && num % 10 <= 4 && (num % 100 < 10 || num % 100 >= 20)) {
        return `${num} коробки`;
    } else {
        return `${num} коробок`;
    }
};

const canCancelOrder = (status, userRole = 'CLIENT') => {
    console.log('canCancelOrder: status -', status, 'userRole -', userRole);
    if (userRole === 'CLIENT') {
        const result = status === 'PENDING';
        console.log('canCancelOrder: CLIENT result -', result);
        return result;
    }
    const result = ['PENDING', 'CONFIRMED', 'IN_DELIVERY'].includes(status);
    console.log('canCancelOrder: EMPLOYEE/ADMIN result -', result);
    return result;
};

const { width } = Dimensions.get('window');

export const OrderDetailsScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { orderId } = route.params || {};

    // Состояние компонента
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [cancelling, setCancelling] = useState(false);
    const [downloadingInvoice, setDownloadingInvoice] = useState(false);
    
    // Состояния для обработки заказа
    const [processingModalVisible, setProcessingModalVisible] = useState(false);
    const [processingComment, setProcessingComment] = useState('');
    const [processingOrder, setProcessingOrder] = useState(false);

    // Состояние для Toast уведомления
    const [toastConfig, setToastConfig] = useState(null);

    // Хуки
    const { currentUser: user } = useAuth();
    const { downloadInvoice, completeOrderStage, takeOrder } = useOrders();
    const [taking, setTaking] = useState(false);
    const dispatch = useDispatch();
    
    // Локальное состояние для отслеживания действий сотрудника
    const [localOrderState, setLocalOrderState] = useState({
        assignedToId: null,
        status: null,
        lastAction: null, // 'taken' | 'completed' | null
        actionTimestamp: null,
        temporarySteps: [] // Массив временных этапов
    });

    // Анимации - используем useRef для стабильных ссылок
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // Проверка прав доступа для отображения истории обработки
    const canViewProcessingHistory = useMemo(() => {
        return user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';
    }, [user?.role]);

    // Синхронизация локального состояния с данными заказа
    useEffect(() => {
        if (order) {
            // Обновляем локальное состояние только если данные действительно изменились
            setLocalOrderState(prevState => {
                const newState = {
                    ...prevState,
                    assignedToId: order.assignedTo?.id || null,
                    status: order.status,
                    lastKnownHistoryLength: order?.statusHistory?.length || 0
                };

                // Если данные изменились, проверяем нужно ли обновлять временные этапы
                const hasDataChanged = prevState.assignedToId !== newState.assignedToId ||
                                      prevState.status !== newState.status ||
                                      (prevState.lastKnownHistoryLength !== (order?.statusHistory?.length || 0));

                if (hasDataChanged) {
                    // Проверяем изменение statusHistory отдельно
                    const historyLengthChanged = prevState.lastKnownHistoryLength !== (order?.statusHistory?.length || 0);

                    if (historyLengthChanged) {
                        console.log('📋 Изменение истории заказов:', {
                            previous: prevState.lastKnownHistoryLength,
                            current: order?.statusHistory?.length || 0
                        });

                        // Когда приходит новая история с сервера, проверяем нужно ли сбросить локальное состояние
                        if ((order?.statusHistory?.length || 0) > prevState.lastKnownHistoryLength) {
                            console.log('📋 Пришла новая история с сервера, проверяем статус заказа');

                            // Если статус заказа изменился по сравнению с тем, что было при последнем действии,
                            // значит сервер подтвердил завершение этапа и передал заказ дальше
                            if (prevState.status && order?.status !== prevState.status) {
                                console.log('🔄 Статус заказа изменился, сбрасываем локальное состояние');
                                newState.lastAction = null;
                                newState.actionTimestamp = null;
                                newState.assignedToId = null; // Заказ теперь доступен для следующего этапа
                                newState.temporarySteps = []; // Очищаем временные этапы

                                // Очищаем также Redux localOrderActions для этого заказа
                                dispatch(clearLocalOrderAction({ orderId: orderId }));
                                console.log('🗑️ Очищены Redux localOrderActions для заказа:', orderId);
                            }
                        }
                    } else {
                        // Для других изменений (assignedTo, status) применяем старую логику
                        const timeSinceAction = prevState.actionTimestamp ? Date.now() - prevState.actionTimestamp : Infinity;
                        if (timeSinceAction > 10000) {
                            console.log('🧹 Очищаем временные этапы по таймауту');
                            newState.lastAction = null;
                            newState.actionTimestamp = null;
                            newState.temporarySteps = [];
                        } else {
                            console.log('📋 Сохраняем временные этапы - прошло мало времени с момента действия');
                        }
                    }
                }

                return newState;
            });
        }
    }, [order?.assignedTo?.id, order?.status, order?.statusHistory?.length]);

    // Автоматический сброс локального состояния через 10 секунд
    useEffect(() => {
        if (localOrderState.lastAction && localOrderState.actionTimestamp) {
            const timeout = setTimeout(() => {
                setLocalOrderState(prevState => ({
                    ...prevState,
                    lastAction: null,
                    actionTimestamp: null,
                    temporarySteps: []
                }));
            }, 15000); // 15 секунд - больше времени для загрузки данных

            return () => clearTimeout(timeout);
        }
    }, [localOrderState.lastAction, localOrderState.actionTimestamp]);

    // Функция для анализа истории статусов и извлечения информации о сотрудниках
    const getProcessingHistory = useCallback(() => {
        if (!order?.statusHistory || order.statusHistory.length === 0) return [];

        const processingSteps = [];
        
        // Анализируем каждый статус в истории
        order.statusHistory.forEach((historyItem, index) => {
            const { status, comment, createdAt } = historyItem;

            console.log(`📋 Обрабатываем запись истории #${index + 1}:`, {
                status,
                comment,
                createdAt
            });

            // Пропускаем PENDING статус, если это не этап "взял в работу"
            if (status === 'PENDING') {
                const lowerComment = comment ? comment.toLowerCase() : '';
                if (lowerComment.includes('взял заказ в работу') ||
                    lowerComment.includes('взял в работу')) {
                    console.log('🎯 Обрабатываем PENDING статус - найден этап "взял в работу"');
                    // Продолжаем обработку для этого комментария
                } else {
                    console.log('⏭️ Пропускаем PENDING статус - не этап обработки');
                    return;
                }
            }
            
            // Определяем роль сотрудника и этап по комментарию и статусу
            let role = '';
            let roleLabel = '';
            let stepType = ''; // 'started' или 'completed'
            let actualStatus = status; // Реальный статус для отображения
            
            if (comment) {
                // Анализируем комментарий для определения этапа обработки
                const lowerComment = comment.toLowerCase();
                console.log(`🔍 Анализируем комментарий: "${comment}"`);
                console.log(`🔍 Нижний регистр: "${lowerComment}"`);
                console.log(`🔍 Статус записи: "${status}"`);
                
                // Сначала проверяем завершение этапов
                if (lowerComment.includes('сборка завершена')) {
                    role = 'PICKER';
                    roleLabel = 'Сборщик';
                    stepType = 'completed';
                    actualStatus = 'CONFIRMED';
                    console.log('🎯 Обнаружено завершение сборки');
                } else if (lowerComment.includes('упаковка завершена')) {
                    role = 'PACKER';
                    roleLabel = 'Упаковщик';
                    stepType = 'completed';
                    actualStatus = 'PACKING_COMPLETED';
                    console.log('🎯 Обнаружено завершение упаковки');
                } else if (lowerComment.includes('доставка завершена')) {
                    role = 'COURIER';
                    roleLabel = 'Курьер';
                    stepType = 'completed';
                    actualStatus = 'DELIVERED';
                    console.log('🎯 Обнаружено завершение доставки');
                }
                // Затем проверяем взятие в работу (назначение + взятие)
                else if (lowerComment.includes('взял заказ в работу') ||
                         (lowerComment.includes('назначен сотруднику') && lowerComment.includes('взял заказ в работу'))) {
                    stepType = 'started';
                    console.log('🎯 Обнаружено взятие заказа в работу в комментарии:', comment);

                    // Определяем роль по содержимому комментария с учетом различных форматов
                    if (lowerComment.includes('сборщик') ||
                        lowerComment.includes('сборщик заказов') ||
                        lowerComment.includes('сборщиком')) {
                        role = 'PICKER';
                        roleLabel = 'Сборщик';
                        actualStatus = 'PICKING';
                        console.log('👷 Определена роль: Сборщик для этапа "взял в работу"');
                    } else if (lowerComment.includes('упаковщик') ||
                              lowerComment.includes('упаковщиком')) {
                        role = 'PACKER';
                        roleLabel = 'Упаковщик';
                        actualStatus = 'PACKING';
                        console.log('📦 Определена роль: Упаковщик для этапа "взял в работу"');
                    } else if (lowerComment.includes('курьер') ||
                              lowerComment.includes('курьером')) {
                        role = 'COURIER';
                        roleLabel = 'Курьер';
                        actualStatus = 'IN_DELIVERY';
                        console.log('🚚 Определена роль: Курьер для этапа "взял в работу"');
                    } else {
                        // Если роль не указана явно, определяем по статусу
                        console.log('⚠️ Роль не указана явно, определяем по статусу:', status);
                        if (status === 'PENDING') {
                            role = 'PICKER';
                            roleLabel = 'Сборщик';
                            actualStatus = 'PICKING';
                            console.log('👷 Автоматически определена роль: Сборщик');
                        } else if (status === 'CONFIRMED') {
                            role = 'PACKER';
                            roleLabel = 'Упаковщик';
                            actualStatus = 'PACKING';
                            console.log('📦 Автоматически определена роль: Упаковщик');
                        } else if (status === 'IN_DELIVERY') {
                            role = 'COURIER';
                            roleLabel = 'Курьер';
                            actualStatus = 'IN_DELIVERY';
                            console.log('🚚 Автоматически определена роль: Курьер');
                        }
                    }
                }
                // Проверяем назначение сотруднику с взятием в работу
                else if (lowerComment.includes('назначен сотруднику')) {
                    console.log('📋 Найдено назначение сотруднику, проверяем на взятие в работу:', comment);

                    // Если есть указание на взятие в работу, обрабатываем как started
                    if (lowerComment.includes('взял заказ в работу') ||
                        lowerComment.includes('взял в работу') ||
                        lowerComment.includes('взялся за работу')) {

                        stepType = 'started';
                        console.log('🎯 Назначение с взятием в работу - обрабатываем как started');

                        // Определяем роль по содержимому комментария
                        if (lowerComment.includes('сборщик') ||
                            lowerComment.includes('сборщик заказов') ||
                            lowerComment.includes('сборщиком')) {
                            role = 'PICKER';
                            roleLabel = 'Сборщик';
                            actualStatus = 'PICKING';
                            console.log('👷 Определена роль: Сборщик для назначения с взятием');
                        } else if (lowerComment.includes('упаковщик') ||
                                  lowerComment.includes('упаковщиком')) {
                            role = 'PACKER';
                            roleLabel = 'Упаковщик';
                            actualStatus = 'PACKING';
                            console.log('📦 Определена роль: Упаковщик для назначения с взятием');
                        } else if (lowerComment.includes('курьер') ||
                                  lowerComment.includes('курьером')) {
                            role = 'COURIER';
                            roleLabel = 'Курьер';
                            actualStatus = 'IN_DELIVERY';
                            console.log('🚚 Определена роль: Курьер для назначения с взятием');
                        } else {
                            // Определяем по статусу если роль не указана
                            console.log('⚠️ Роль не указана в назначении, определяем по статусу:', status);
                            if (status === 'PENDING') {
                                role = 'PICKER';
                                roleLabel = 'Сборщик';
                                actualStatus = 'PICKING';
                            } else if (status === 'CONFIRMED') {
                                role = 'PACKER';
                                roleLabel = 'Упаковщик';
                                actualStatus = 'PACKING';
                            } else if (status === 'IN_DELIVERY') {
                                role = 'COURIER';
                                roleLabel = 'Курьер';
                                actualStatus = 'IN_DELIVERY';
                            }
                        }
                    } else {
                        // Просто назначение без взятия в работу - пропускаем
                        console.log('🚫 Простое назначение без взятия в работу - пропускаем');
                        return;
                    }
                }
                // Fallback для других случаев
                else {
                    // Определяем роль по статусу если не смогли по комментарию
                    switch (status) {
                        case 'CONFIRMED':
                            // Если статус CONFIRMED и нет явного указания на завершение сборки,
                            // возможно это завершение сборки
                            role = 'PICKER';
                            roleLabel = 'Сборщик';
                            stepType = 'completed';
                            actualStatus = 'CONFIRMED';
                            break;
                        case 'IN_DELIVERY':
                            // Для IN_DELIVERY нужно понимать контекст
                            // Если это первая запись с IN_DELIVERY, то это завершение упаковки
                            role = 'PACKER';
                            roleLabel = 'Упаковщик';
                            stepType = 'completed';
                            actualStatus = 'PACKING_COMPLETED';
                            break;
                        case 'DELIVERED':
                            role = 'COURIER';
                            roleLabel = 'Курьер';
                            stepType = 'completed';
                            actualStatus = 'DELIVERED';
                            break;
                        case 'CANCELLED':
                            role = 'MANAGER';
                            roleLabel = 'Менеджер';
                            stepType = 'completed';
                            actualStatus = 'CANCELLED';
                            break;
                        case 'RETURNED':
                            role = 'COURIER';
                            roleLabel = 'Курьер';
                            stepType = 'completed';
                            actualStatus = 'RETURNED';
                            break;
                        default:
                            return; // Пропускаем неизвестные статусы
                    }
                }
            } else {
                console.log('🚫 Пропускаем запись без комментария');
                return; // Пропускаем записи без комментария
            }

            // Логируем результат анализа перед добавлением этапа
            console.log('📊 Результат анализа этапа:', {
                role,
                roleLabel,
                stepType,
                actualStatus,
                employeeName,
                employeePosition,
                comment
            });

            // Проверяем, найден ли этап
            if (!role || !stepType) {
                console.log('⚠️ Этап не определен, пропускаем:', { role, stepType });
                return;
            }

            // Извлекаем информацию о сотруднике из комментария
            let employeeName = '';
            let employeePosition = '';

            if (comment) {
                console.log('🔍 Парсинг комментария:', comment);

                // Специальные паттерны для разных типов комментариев
                const specialPatterns = [
                    // Формат: "Заказ назначен сотруднику Ахмед Сборщик (Сборщик заказов). Взял заказ в работу"
                    /заказ назначен сотруднику (.+?) \((.+?)\)\. взял заказ в работу/i,
                    // Формат: "Ахмед Сборщик (Сборщик заказов) взял заказ в работу"
                    /(.+?) \((.+?)\) взял заказ в работу/i,
                    // Формат: "Заказ назначен сотруднику Ахмед Сборщик (Сборщик заказов)"
                    /заказ назначен сотруднику (.+?) \((.+?)\)/i,
                    // Формат: "Обработано сотрудником Ахмед Сборщик (Сборщик заказов)"
                    /обработано сотрудником (.+?) \((.+?)\)/i,
                    // Формат: "Автоматически назначен сотруднику Ахмед Сборщик (Сборщик заказов)"
                    /автоматически назначен сотруднику (.+?) \((.+?)\)/i,
                    // Формат: "Заказ переназначен сотруднику Ахмед Сборщик (Сборщик заказов)"
                    /заказ переназначен сотруднику (.+?) \((.+?)\)/i,
                ];

                // Сначала пробуем специальные паттерны
                let foundMatch = false;
                for (const pattern of specialPatterns) {
                    const match = comment.match(pattern);
                    if (match && match[1]) {
                        employeeName = match[1].trim();
                        if (match[2]) {
                            employeePosition = match[2].trim();
                        }
                        console.log('✅ Найдено специальным паттерном:', { employeeName, employeePosition, pattern: pattern.toString() });
                        foundMatch = true;
                        break;
                    }
                }

                // Если специальные паттерны не сработали, пробуем общие
                if (!foundMatch) {
                    const generalPatterns = [
                        // Паттерны без должности
                        /назначен сотруднику (.+?)\./i,
                        /назначен сотруднику (.+?)$/i,
                        /принят сотрудником (.+?) на склад/i,
                        /(.+?) взял заказ в работу/i,
                        /(.+?) взял в работу/i,

                        // Общий паттерн с скобками (должен быть последним)
                        /(.+?) \((.+?)\)/i
                    ];

                    for (const pattern of generalPatterns) {
                        const match = comment.match(pattern);
                        if (match) {
                            if (match[2]) {
                                employeeName = match[1].trim();
                                employeePosition = match[2].trim();
                                // Убираем роли из должности, если они есть
                                if (!['Сборщик', 'Упаковщик', 'Курьер'].includes(employeePosition)) {
                                    // Оставляем должность как есть
                                } else {
                                    // Если в скобках только роль, убираем её
                                    employeePosition = '';
                                }
                            } else if (match[1]) {
                                employeeName = match[1].trim();
                            }
                            console.log('✅ Найдено общим паттерном:', { employeeName, employeePosition, pattern: pattern.toString() });
                            break;
                        }
                    }
                }

                // Очистка имени от лишних слов
                if (employeeName) {
                    // Убираем лишние слова из имени
                    employeeName = employeeName
                        .replace(/^(заказ|сотруднику|сотрудником)/i, '')
                        .replace(/(заказ|сотруднику|сотрудником)$/i, '')
                        .trim();

                    // Проверяем, что имя не является служебным словом
                    if (['сотруднику', 'сотрудником', 'заказ', 'работу', 'взял'].includes(employeeName.toLowerCase())) {
                        employeeName = '';
                        employeePosition = '';
                    }

                    console.log('📝 Финальное имя сотрудника:', { employeeName, employeePosition });
                } else {
                    console.log('❌ Имя сотрудника не найдено в комментарии:', comment);
                }
            }

            const stepData = {
                status: actualStatus,
                role,
                roleLabel,
                stepType,
                employeeName,
                employeePosition,
                comment,
                createdAt,
                originalStatus: status
            };

            console.log('📋 Добавляем этап в историю:', stepData);
            processingSteps.push(stepData);
        });

        // Сортируем по времени создания
        processingSteps.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        console.log('🎉 Итоговые этапы обработки:', processingSteps.length);
        processingSteps.forEach((step, index) => {
            console.log(`📋 Этап ${index + 1}:`, {
                role: step.role,
                roleLabel: step.roleLabel,
                stepType: step.stepType,
                status: step.status,
                employeeName: step.employeeName,
                comment: step.comment
            });
        });

        // Пост-обработка: добавляем недостающие этапы
        const enhancedSteps = [];
        let lastPickerCompleted = false;
        let lastPackerCompleted = false;
        
        for (let i = 0; i < processingSteps.length; i++) {
            const step = processingSteps[i];
            
            // Добавляем текущий этап
            enhancedSteps.push(step);
            
            // Отслеживаем завершенные этапы
            if (step.role === 'PICKER' && step.stepType === 'completed') {
                lastPickerCompleted = true;
            }
            if (step.role === 'PACKER' && step.stepType === 'completed') {
                lastPackerCompleted = true;
            }
            
            // Если мы видим курьера, но упаковщик не завершил свой этап,
            // добавляем виртуальный этап завершения упаковки
            if (step.role === 'COURIER' && step.stepType === 'started' && 
                lastPickerCompleted && !lastPackerCompleted) {
                
                // Создаем виртуальный этап завершения упаковки
                const packingCompletedStep = {
                    status: 'PACKING_COMPLETED',
                    role: 'PACKER',
                    roleLabel: 'Упаковщик',
                    stepType: 'completed',
                    employeeName: '',
                    employeePosition: '',
                    comment: 'Упаковка завершена',
                    createdAt: new Date(step.createdAt).getTime() - 1, // Чуть раньше чем курьер
                    originalStatus: 'IN_DELIVERY',
                    isVirtual: true
                };
                
                // Вставляем перед текущим этапом курьера
                enhancedSteps.splice(enhancedSteps.length - 1, 0, packingCompletedStep);
                lastPackerCompleted = true;
            }
        }
        
        return enhancedSteps;
    }, [order?.statusHistory]);

    // Функция для отображения полной истории обработки
    const renderProcessingHistory = useMemo(() => {
        console.log('📋 renderProcessingHistory - начало рендеринга');
        console.log('📋 canViewProcessingHistory:', canViewProcessingHistory);

        if (!canViewProcessingHistory) {
            console.log('🚫 renderProcessingHistory - история не доступна для просмотра');
            return null;
        }

        let processingSteps = getProcessingHistory();
        console.log('📋 processingSteps из getProcessingHistory:', processingSteps.length);
        let allSteps = [...processingSteps]; // Начинаем с реальных этапов

        // Всегда добавляем временные этапы, если они есть
        // Они должны оставаться видимыми даже после получения реальной истории
        if (localOrderState.temporarySteps && localOrderState.temporarySteps.length > 0) {
            console.log('🕒 Объединяем временные этапы с реальными:', {
                tempSteps: localOrderState.temporarySteps.length,
                realSteps: processingSteps.length,
                tempStepsDetails: localOrderState.temporarySteps.map(step => ({
                    role: step.role,
                    stepType: step.stepType,
                    employeeName: step.employeeName
                }))
            });

            // Фильтруем временные этапы, чтобы избежать дубликатов с реальными
            const filteredTempSteps = localOrderState.temporarySteps.filter(tempStep => {
                // Проверяем, нет ли уже такого этапа в реальной истории
                const duplicateFound = processingSteps.some(realStep =>
                    realStep.role === tempStep.role &&
                    realStep.stepType === tempStep.stepType &&
                    realStep.employeeName === tempStep.employeeName
                );

                if (duplicateFound) {
                    console.log('🚫 Убираем дубликат временного этапа:', {
                        role: tempStep.role,
                        stepType: tempStep.stepType,
                        employeeName: tempStep.employeeName
                    });
                    return false;
                }
                return true;
            });

            console.log('📋 После фильтрации дубликатов:', {
                originalTemp: localOrderState.temporarySteps.length,
                filteredTemp: filteredTempSteps.length
            });

            // Добавляем отфильтрованные временные этапы в начало (они самые новые)
            allSteps = [...filteredTempSteps, ...processingSteps];

            console.log('📊 Всего этапов после объединения:', allSteps.length);
            console.log('📋 Сводка этапов:', allSteps.map(step => ({
                role: step.role,
                stepType: step.stepType,
                employeeName: step.employeeName,
                isTemporary: step.isTemporary,
                comment: step.comment?.substring(0, 50) + '...'
            })));
        } else {
            console.log('📋 Показываем только реальные этапы:', processingSteps.length);
        }
        
        if (allSteps.length === 0) {
            console.log('🚫 renderProcessingHistory - нет этапов для отображения');
            return null;
        }

        console.log('✅ renderProcessingHistory - возвращаем JSX с', allSteps.length, 'этапами');
        return (
            <View style={styles.modernCard}>
                <View style={styles.cardHeader}>
                    <Icon name="people" size={24} color="#667eea" />
                    <Text style={styles.cardTitle}>История обработки заказа</Text>
                </View>
                
                <View style={styles.processingStepsContainer}>
                    {allSteps.map((step, index) => {
                        // Формируем правильный заголовок этапа
                        let stepTitle = '';
                        if (step.stepType === 'started') {
                            stepTitle = `${step.roleLabel} взял в работу`;
                        } else if (step.stepType === 'completed') {
                            switch (step.role) {
                                case 'PICKER':
                                    stepTitle = 'Сборка завершена';
                                    break;
                                case 'PACKER':
                                    stepTitle = 'Упаковка завершена';
                                    break;
                                case 'COURIER':
                                    stepTitle = 'Доставка завершена';
                                    break;
                                default:
                                    stepTitle = ORDER_STATUS_LABELS[step.status] || 'Этап завершен';
                            }
                        } else {
                            stepTitle = ORDER_STATUS_LABELS[step.status] || step.roleLabel;
                        }

                        return (
                            <View key={`${index}-${step.status}-${step.stepType}`} style={[
                                styles.processingStep,
                                index === allSteps.length - 1 && styles.lastProcessingStep,
                                step.isVirtual && styles.virtualStep,
                                step.isTemporary && styles.temporaryStep
                            ]}>
                                <View style={styles.stepHeader}>
                                    <View style={styles.stepRole}>
                                        <View style={[styles.roleBadge, { backgroundColor: ORDER_STATUS_COLORS[step.status] }]}>
                                            <Icon name={ORDER_STATUS_ICONS[step.status]} size={16} color="#fff" />
                                            <Text style={styles.roleLabel}>{step.roleLabel}</Text>
                                        </View>
                                        <Text style={styles.stepStatus}>
                                            {stepTitle}
                                        </Text>
                                    </View>
                                    <Text style={styles.stepDate}>
                                        {step.isVirtual ? 
                                            'Автоматически' : 
                                            step.isTemporary ?
                                                'Только что' :
                                                new Date(step.createdAt).toLocaleString('ru-RU')
                                        }
                                    </Text>
                                </View>
                                
                                {step.employeeName && (
                                    <View style={styles.stepEmployee}>
                                        <Icon name="person" size={16} color="#667eea" />
                                        <View style={styles.employeeInfo}>
                                            <Text style={styles.employeeName}>
                                                {step.employeeName}
                                            </Text>
                                            {step.employeePosition && (
                                                <Text style={styles.employeePosition}>
                                                    {step.employeePosition}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                )}
                                
                                {step.comment && !step.isVirtual && (
                                    <View style={styles.stepComment}>
                                        <Icon name="comment" size={14} color="#718096" />
                                        <Text style={styles.commentText}>
                                            {step.comment}
                                        </Text>
                                    </View>
                                )}
                                
                                {step.isVirtual && (
                                    <View style={styles.stepComment}>
                                        <Icon name="info" size={14} color="#718096" />
                                        <Text style={[styles.commentText, styles.virtualComment]}>
                                            Этап завершен автоматически при переходе к доставке
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    }, [canViewProcessingHistory, getProcessingHistory, localOrderState.temporarySteps, user?.employee]);

    // Загрузка деталей заказа
    const loadOrderDetails = useCallback(async (isRefresh = false) => {
        if (!orderId) {
            setError('ID заказа не указан');
            setLoading(false);
            return;
        }

        try {
            if (!isRefresh) {
                setLoading(true);
            }
            setError(null);

            const response = await OrderApi.getOrderById(orderId);
            console.log('loadOrderDetails: response -', response);
            console.log('loadOrderDetails: response.status type -', typeof response.status);
            console.log('loadOrderDetails: response.status value -', response.status);
            console.log('loadOrderDetails: response.data type -', typeof response.data);
            console.log('loadOrderDetails: response.data exists -', !!response.data);

            const isSuccess = response.status === 'success';
            const hasData = !!response.data;

            console.log('loadOrderDetails: isSuccess -', isSuccess);
            console.log('loadOrderDetails: hasData -', hasData);
            console.log('loadOrderDetails: combined condition -', isSuccess && hasData);

            if (isSuccess && hasData) {
                console.log('loadOrderDetails: order data -', response.data);
                console.log('loadOrderDetails: order status -', response.data?.status);
                console.log('loadOrderDetails: order assignedTo -', response.data?.assignedTo);
                console.log('loadOrderDetails: order items -', response.data?.items || response.data?.orderItems);
                setOrder(response.data);

                // Запускаем анимацию появления
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
            } else {
                console.log('loadOrderDetails: FAILED CONDITION - status:', response.status, 'data:', !!response.data);
                throw new Error(`Invalid response: status=${response.status}, hasData=${hasData}`);
            }
        } catch (err) {
            console.error('Ошибка загрузки деталей заказа:', err);
            setError(err.message || 'Не удалось загрузить детали заказа');
        } finally {
            setLoading(false);
            if (isRefresh) {
                setRefreshing(false);
            }
        }
    }, [orderId]);

    // Загрузка при фокусе экрана
    useFocusEffect(
        useCallback(() => {
            loadOrderDetails();
        }, [loadOrderDetails])
    );

    // Обновление при pull-to-refresh
    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadOrderDetails(true);
    }, [loadOrderDetails]);

    // Обработка отмены заказа
    const handleCancelOrder = useCallback(async () => {
        if (!order || !canCancelOrder(order.status, user?.role || 'CLIENT')) {
            Alert.alert('Ошибка', 'Этот заказ нельзя отменить');
            return;
        }

        Alert.alert(
            'Отмена заказа',
            `Вы уверены, что хотите отменить заказ ${formatOrderNumber(order.orderNumber)}?`,
            [
                { text: 'Нет', style: 'cancel' },
                {
                    text: 'Да, отменить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setCancelling(true);
                            await OrderApi.cancelMyOrder(orderId, 'Отменен клиентом');
                            // Показываем Toast уведомление вместо алерта
                            setToastConfig({
                                message: 'Заказ успешно отменен',
                                type: 'success',
                                duration: 3000
                            });
                            loadOrderDetails();
                        } catch (err) {
                            Alert.alert('Ошибка', err.message || 'Не удалось отменить заказ');
                        } finally {
                            setCancelling(false);
                        }
                    }
                }
            ]
        );
    }, [order, orderId, loadOrderDetails]);

    // Обработка скачивания накладной
    const handleDownloadInvoice = useCallback(async () => {
        if (!order || !orderId) {
            Alert.alert('Ошибка', 'Не удалось найти заказ для скачивания накладной');
            return;
        }

        try {
            setDownloadingInvoice(true);
            console.log('Начинаем скачивание накладной для заказа:', orderId);
            
            const result = await downloadInvoice(orderId);
            
            if (result.success) {
                Alert.alert('Успех', `Накладная "${result.filename}" успешно сохранена и готова к просмотру`);
            } else {
                throw new Error(result.error || 'Не удалось скачать накладную');
            }
        } catch (err) {
            console.error('Ошибка при скачивании накладной:', err);
            Alert.alert('Ошибка', err.message || 'Не удалось скачать накладную');
        } finally {
            setDownloadingInvoice(false);
        }
    }, [order, orderId, downloadInvoice]);

    // Обработка завершения этапа заказа
    const handleProcessOrder = useCallback(async () => {
        if (!order || !orderId) {
            Alert.alert('Ошибка', 'Не удалось найти заказ для обработки');
            return;
        }

        try {
            setProcessingOrder(true);
            console.log('Начинаем обработку заказа:', orderId);
            
            const result = await completeOrderStage(orderId, processingComment.trim() || undefined);
            
            if (result.success) {
                // Создаем временный этап завершения с полным именем сотрудника
                const fullEmployeeName = `${user?.employee?.name || 'Сотрудник'} ${user?.employee?.position || ''}`.trim();
                const newStatus = user?.employee?.processingRole === 'PICKER' ? 'CONFIRMED' :
                               user?.employee?.processingRole === 'PACKER' ? 'PACKING_COMPLETED' : 'DELIVERED';

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

                // Логируем завершение этапа для курьера
                if (user?.employee?.processingRole === 'COURIER') {
                    console.log('OrderDetailsScreen: курьер завершает доставку', {
                        orderId,
                        currentStatus: order?.status,
                        newStatus,
                        employeeName: fullEmployeeName
                    });
                }

                // Немедленно обновляем локальное состояние с этапом завершения
                setLocalOrderState(prevState => ({
                    assignedToId: prevState.assignedToId, // Сохраняем назначение до подтверждения сервера
                    status: order?.status || null, // Статус может измениться на сервере
                    lastAction: 'completed',
                    actionTimestamp: Date.now(),
                    temporarySteps: [...(prevState.temporarySteps || []), completedTempStep],
                    lastKnownHistoryLength: prevState.lastKnownHistoryLength
                }));

                console.log('✅ Этап завершен локально:', {
                    employeeId: user?.employee?.id,
                    employeeRole: user?.employee?.processingRole,
                    tempStep: completedTempStep
                });

                // Показываем Toast уведомление вместо алерта
                setToastConfig({
                    message: 'Этап заказа успешно обработан',
                    type: 'success',
                    duration: 3000
                });
                setProcessingModalVisible(false);
                setProcessingComment('');
                // Обновляем данные заказа в фоне
                console.log('OrderDetailsScreen: обновляем данные после завершения этапа курьера');

                // Ждем немного перед обновлением, чтобы сервер успел обработать изменения
                setTimeout(() => {
                    console.log('OrderDetailsScreen: начинаем обновление деталей заказа после паузы');
                    loadOrderDetails(true).then((result) => {
                        console.log('OrderDetailsScreen: результат обновления деталей заказа', {
                            orderId,
                            success: !!result,
                            status: result?.status,
                            assignedToId: result?.assignedTo?.id
                        });
                    }).catch((error) => {
                        console.error('OrderDetailsScreen: ошибка при обновлении деталей заказа', error);
                    });
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
    }, [order, orderId, processingComment, completeOrderStage, loadOrderDetails]);

    // Открытие модального окна обработки заказа
    const handleOpenProcessingModal = useCallback(() => {
        setProcessingModalVisible(true);
        setProcessingComment('');
    }, []);

    // Закрытие модального окна обработки заказа
    const handleCloseProcessingModal = useCallback(() => {
        setProcessingModalVisible(false);
        setProcessingComment('');
    }, []);

    // Проверяем, работал ли уже сотрудник с этим заказом в текущем статусе
    const hasEmployeeWorkedOnCurrentStatus = useMemo(() => {
        const currentEmployeeId = user?.employee?.id;
        if (!currentEmployeeId) return false;

        // Используем актуальные данные из локального состояния или заказа
        const actualAssignedId = localOrderState.assignedToId !== null ? localOrderState.assignedToId : order?.assignedTo?.id;
        const actualStatus = localOrderState.status || order?.status;
        const employeeRole = user?.employee?.processingRole;

        // Проверяем временные этапы сотрудника для текущего статуса
        const tempStepsForCurrentStatus = localOrderState.temporarySteps.filter(step =>
            step.role === employeeRole &&
            step.originalStatus === actualStatus &&
            step.employeeName?.includes(user?.employee?.name || '')
        );

        // Проверяем историю заказа для текущего статуса
        const historyStepsForCurrentStatus = order?.statusHistory?.filter(historyItem =>
            historyItem.comment &&
            (historyItem.comment.includes(user?.employee?.name || '') ||
             historyItem.comment.includes(user?.employee?.position || '')) &&
            historyItem.status === actualStatus
        ) || [];

        const hasWorked = tempStepsForCurrentStatus.length > 0 || historyStepsForCurrentStatus.length > 0;

        console.log('🔍 Проверка работы сотрудника с заказом:', {
            employeeId: currentEmployeeId,
            employeeName: user?.employee?.name,
            employeeRole,
            currentStatus: actualStatus,
            tempStepsCount: tempStepsForCurrentStatus.length,
            historyStepsCount: historyStepsForCurrentStatus.length,
            hasWorked
        });

        return hasWorked;
    }, [user?.employee?.id, user?.employee?.name, user?.employee?.position, user?.employee?.processingRole, localOrderState.assignedToId, localOrderState.status, localOrderState.temporarySteps, order?.assignedTo?.id, order?.status, order?.statusHistory]);

    // Проверяем, были ли локальные действия по заказу из другого экрана
    const hasLocalCompleted = useSelector(state => selectHasLocalOrderAction(orderId, 'completed')(state));
    const hasLocalTaken = useSelector(state => selectHasLocalOrderAction(orderId, 'taken')(state));

    // Логика кнопок для сотрудников
    const employeeButtonLogic = useMemo(() => {
        const isEmployee = user?.role === 'EMPLOYEE';
        const isAdmin = user?.role === 'ADMIN';

        console.log('🎛️ employeeButtonLogic - вычисление:', {
            userRole: user?.role,
            isEmployee,
            isAdmin,
            hasLocalCompleted,
            hasLocalTaken,
            localOrderState: {
                assignedToId: localOrderState.assignedToId,
                lastAction: localOrderState.lastAction,
                tempStepsCount: localOrderState.temporarySteps.length
            },
            order: {
                assignedToId: order?.assignedTo?.id,
                status: order?.status
            }
        });

        if (!isEmployee && !isAdmin) {
            return {
                showTakeButton: false,
                showCompleteButton: false,
                canTakeOrder: false,
                canCompleteStage: false
            };
        }

        const currentEmployeeId = user?.employee?.id;
        const employeeRole = user?.employee?.processingRole; // Роль сотрудника (PICKER, PACKER, COURIER)
        
        // Используем актуальные данные из локального состояния или заказа
        const actualAssignedId = localOrderState.assignedToId !== null ? localOrderState.assignedToId : order?.assignedTo?.id;
        const actualStatus = localOrderState.status || order?.status;
        
        // Проверяем, назначен ли заказ текущему сотруднику
        const isAssignedToMe = currentEmployeeId && actualAssignedId && currentEmployeeId === actualAssignedId;

        // Если сотрудник только что взял заказ в работу, но данные еще не обновились
        if (localOrderState.lastAction === 'taken' && !isAssignedToMe && localOrderState.temporarySteps.length > 0) {
            // Временно считаем, что заказ назначен нам
            const tempAssignedToMe = true;
            return {
                showTakeButton: false,
                showCompleteButton: tempAssignedToMe && ['PENDING', 'CONFIRMED', 'IN_DELIVERY'].includes(actualStatus),
                canTakeOrder: false,
                canCompleteStage: tempAssignedToMe,
                isAssignedToMe: tempAssignedToMe,
                employeeRole
            };
        }
        
        // Если сотрудник только что завершил этап, скрываем кнопки до обновления с сервера
        if (localOrderState.lastAction === 'completed' || hasLocalCompleted) {
            console.log('🎯 Сотрудник завершил этап (локально или в другом экране), скрываем кнопки до обновления сервера', {
                localCompleted: localOrderState.lastAction === 'completed',
                hasLocalCompleted
            });
            return {
                showTakeButton: false,
                showCompleteButton: false,
                canTakeOrder: false,
                canCompleteStage: false,
                isAssignedToMe: false,
                employeeRole
            };
        }
        
        // Определяем, соответствует ли статус заказа роли сотрудника
        let canTakeBasedOnRole = false;
        if (employeeRole === 'PICKER' && actualStatus === 'PENDING') {
            canTakeBasedOnRole = true; // Сборщик может взять новый заказ
        } else if (employeeRole === 'PACKER' && actualStatus === 'CONFIRMED') {
            canTakeBasedOnRole = true; // Упаковщик может взять заказ после сборки
        } else if (employeeRole === 'COURIER' && actualStatus === 'IN_DELIVERY') {
            canTakeBasedOnRole = true; // Курьер может взять заказ для доставки
        } else if (isAdmin) {
            // Админы могут взять любой заказ в любом статусе
            canTakeBasedOnRole = ['PENDING', 'CONFIRMED', 'IN_DELIVERY'].includes(actualStatus);
        }
        

        // Определяем, может ли сотрудник взять заказ в работу
        // Сотрудник не может взять заказ, если уже работал с ним в текущем статусе
        const canTakeOrder = !isAssignedToMe && canTakeBasedOnRole && !hasEmployeeWorkedOnCurrentStatus && !hasLocalTaken;

        // Определяем, может ли сотрудник завершить этап (только если заказ назначен ему)
        const canCompleteStage = isAssignedToMe && ['PENDING', 'CONFIRMED', 'IN_DELIVERY'].includes(actualStatus);
        
        const result = {
            showTakeButton: canTakeOrder,
            showCompleteButton: canCompleteStage,
            canTakeOrder,
            canCompleteStage,
            isAssignedToMe,
            employeeRole
        };

        console.log('🎛️ employeeButtonLogic - результат:', {
            canTakeOrder,
            canCompleteStage,
            isAssignedToMe,
            hasEmployeeWorkedOnCurrentStatus,
            showTakeButton: result.showTakeButton,
            showCompleteButton: result.showCompleteButton,
            employeeRole,
            currentStatus: actualStatus
        });

        return result;
    }, [user?.role, user?.employee?.id, user?.employee?.processingRole, order?.assignedTo?.id, order?.status, order?.statusHistory, localOrderState.lastAction, localOrderState.temporarySteps, hasEmployeeWorkedOnCurrentStatus, hasLocalCompleted, hasLocalTaken]);

    // Проверка прав для скачивания накладной
    const canDownloadInvoice = useMemo(() => {
        console.log('canDownloadInvoice: user роль -', user?.role);
        console.log('canDownloadInvoice: user объект -', user);
        // Разрешаем скачивание для администраторов и сотрудников
        const hasAccess = user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';
        console.log('canDownloadInvoice: hasAccess -', hasAccess);
        return hasAccess;
    }, [user?.role]);

    // Форматирование даты
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Мемоизированный рендер заголовка заказа
    const renderOrderHeader = useMemo(() => {
        if (!order) return null;

        return (
            <View style={styles.headerContainer}>
                <View style={styles.headerGradient}>
                    <View style={styles.headerContent}>
                        <View style={styles.headerTop}>
                            <View style={styles.orderNumberContainer}>
                                <Text style={styles.orderNumber}>
                                    {formatOrderNumber(order.orderNumber)}
                                </Text>
                                <Text style={styles.orderDate}>
                                    {formatDate(order.createdAt)}
                                </Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: ORDER_STATUS_COLORS[order.status] }]}>
                                <Icon name={ORDER_STATUS_ICONS[order.status]} size={16} color="#fff" />
                                <Text style={styles.statusText}>{ORDER_STATUS_LABELS[order.status]}</Text>
                            </View>
                        </View>

                        {/* Прогресс-бар */}
                        {['PENDING', 'CONFIRMED', 'IN_DELIVERY', 'DELIVERED'].includes(order.status) && (
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBar}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: (getOrderProgress(order.status) / 100) * 300, // Исправлено с процентов на абсолютное значение
                                                backgroundColor: ORDER_STATUS_COLORS[order.status]
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.progressText}>
                                    {getOrderProgress(order.status)}% выполнено
                                </Text>
                            </View>
                        )}

                        <View style={styles.amountContainer}>
                            <View style={styles.amountInfo}>
                                <Text style={styles.amountLabel}>Сумма заказа</Text>
                                <Text style={styles.amount}>{formatAmount(order.totalAmount)}</Text>
                            </View>
                            <View style={styles.amountIcon}>
                                <Icon name="payment" size={24} color="#fff" />
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        );
    }, [order]);

    // Мемоизированный рендер информации о доставке
    const renderDeliveryInfo = useMemo(() => {
        if (!order) return null;

        return (
            <View style={styles.modernCard}>
                <View style={styles.cardHeader}>
                    <Icon name="local-shipping" size={24} color="#667eea" />
                    <Text style={styles.cardTitle}>Информация о доставке</Text>
                </View>

                {order.deliveryAddress && (
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconContainer}>
                            <Icon name="location-on" size={20} color="#667eea" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Адрес доставки</Text>
                            <Text style={styles.infoValue}>{order.deliveryAddress}</Text>
                        </View>
                    </View>
                )}

                {order.expectedDeliveryDate && (
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconContainer}>
                            <Icon name="schedule" size={20} color="#667eea" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Ожидаемая дата доставки</Text>
                            <Text style={styles.infoValue}>
                                {new Date(order.expectedDeliveryDate).toLocaleDateString('ru-RU')}
                            </Text>
                        </View>
                    </View>
                )}

                {order.comment && (
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconContainer}>
                            <Icon name="comment" size={20} color="#667eea" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Комментарий</Text>
                            <Text style={styles.infoValue}>{order.comment}</Text>
                        </View>
                    </View>
                )}

                {/* Информация о назначенном сотруднике для персонала */}
                {canViewProcessingHistory && order.assignedTo && (
                    <View style={styles.infoRow}>
                        <View style={styles.infoIconContainer}>
                            <Icon name="person" size={20} color="#667eea" />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Текущий ответственный</Text>
                            <Text style={styles.infoValue}>{order.assignedTo.name}</Text>
                            {order.assignedTo.position && (
                                <Text style={styles.infoSubtext}>{order.assignedTo.position}</Text>
                            )}
                        </View>
                    </View>
                )}
            </View>
        );
    }, [order, canViewProcessingHistory]);

    // Мемоизированный рендер товаров для оптимизации
    const renderOrderItems = useMemo(() => {
        console.log('renderOrderItems: order.items -', order?.items);
        console.log('renderOrderItems: order.orderItems -', order?.orderItems);
        
        // Пробуем разные варианты структуры данных
        const items = order?.items || order?.orderItems || [];
        console.log('renderOrderItems: итоговые items -', items);
        
        if (items.length > 0) {
            console.log('renderOrderItems: первый товар -', items[0]);
            console.log('renderOrderItems: изображения первого товара -', items[0]?.product?.images);
        }

        return (
            <View style={styles.modernCard}>
                <View style={styles.cardHeader}>
                    <Icon name="shopping-bag" size={24} color="#667eea" />
                    <Text style={styles.cardTitle}>
                        Товары ({items.length} поз.)
                    </Text>
                </View>

                <View style={styles.itemsList}>
                    {items.map((item, index) => (
                    <View key={index} style={[
                        styles.itemContainer,
                        index === items.length - 1 && styles.lastItem
                    ]}>
                        {/* Изображение товара */}
                        <View style={styles.imageContainer}>
                            {(() => {
                                const images = item.product?.images;
                                console.log('Изображения товара:', images, 'тип:', typeof images);
                                
                                let imageUrl = null;
                                if (images) {
                                    if (Array.isArray(images) && images.length > 0) {
                                        imageUrl = images[0];
                                    } else if (typeof images === 'string') {
                                        imageUrl = images;
                                    }
                                }
                                
                                console.log('imageUrl исходный:', imageUrl);
                                
                                // Формируем полный URL если это относительный путь
                                if (imageUrl && !imageUrl.startsWith('http')) {
                                    const baseUrl = 'http://192.168.1.226:5000';
                                    
                                    // Заменяем обратные слеши на прямые для корректного URL
                                    imageUrl = imageUrl.replace(/\\/g, '/');
                                    console.log('imageUrl после замены слешей:', imageUrl);
                                    
                                    // Добавляем /uploads/ префикс если его нет
                                    if (!imageUrl.startsWith('uploads/')) {
                                        imageUrl = `uploads/${imageUrl}`;
                                        console.log('imageUrl после добавления uploads:', imageUrl);
                                    }
                                    
                                    imageUrl = imageUrl.startsWith('/') ? `${baseUrl}${imageUrl}` : `${baseUrl}/${imageUrl}`;
                                }
                                
                                console.log('Итоговый imageUrl:', imageUrl);
                                
                                return imageUrl ? (
                                    <Image
                                        source={{ uri: imageUrl }}
                                        style={styles.itemImage}
                                        resizeMode="cover"
                                        onError={(error) => console.log('Ошибка загрузки изображения:', error)}
                                        onLoad={() => console.log('Изображение загружено успешно:', imageUrl)}
                                    />
                                ) : (
                                    <View style={styles.placeholderImage}>
                                        <Icon name="image" size={30} color="#ccc" />
                                    </View>
                                );
                            })()}
                        </View>

                        {/* Информация о товаре */}
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName} numberOfLines={2}>
                                {item.product?.name || 'Неизвестный товар'}
                            </Text>

                            {item.product?.supplier && (
                                <View style={styles.supplierContainer}>
                                    <Icon name="store" size={14} color="#999" />
                                    <Text style={styles.itemSupplier}>
                                        {item.product.supplier.companyName || item.product.supplier.name}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.itemDetails}>
                                <View style={styles.quantityContainer}>
                                    <Text style={styles.quantityLabel}>Количество:</Text>
                                    <Text style={styles.itemQuantity}>
                                        {formatBoxesCount(item.quantity)}
                                    </Text>
                                </View>
                                <View style={styles.priceContainer}>
                                    <Text style={styles.priceLabel}>Цена за коробку:</Text>
                                    <Text style={styles.itemPrice}>
                                        {formatAmount(item.price)}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.totalContainer}>
                                <Text style={styles.totalLabel}>Итого:</Text>
                                <Text style={styles.itemTotal}>
                                    {formatAmount(item.quantity * item.price)}
                                </Text>
                            </View>
                        </View>
                    </View>
                    ))}
                </View>
            </View>
        );
    }, [order?.items, order?.orderItems]);

    // Мемоизированный рендер действий
    const renderActions = useMemo(() => {
        console.log('renderActions: order статус -', order?.status);
        console.log('renderActions: user -', user);
        console.log('renderActions: user role -', user?.role);

        if (!order) return null;

        const showCancelButton = canCancelOrder(order.status, user?.role || 'CLIENT');
        console.log('renderActions: canCancelOrder result -', canCancelOrder(order.status, user?.role || 'CLIENT'));
        const showDownloadButton = canDownloadInvoice;
        const { showTakeButton, showCompleteButton, employeeRole } = employeeButtonLogic;
        
        console.log('renderActions: showCancelButton -', showCancelButton);
        console.log('renderActions: showDownloadButton -', showDownloadButton);
        console.log('renderActions: showTakeButton -', showTakeButton);
        console.log('renderActions: showCompleteButton -', showCompleteButton);

        // Дополнительная диагностика для понимания проблемы
        console.log('renderActions: employeeButtonLogic результат:', {
            showTakeButton,
            showCompleteButton,
            employeeRole
        });
        console.log('renderActions: user данные:', {
            role: user?.role,
            employeeId: user?.employee?.id,
            employeeName: user?.employee?.name,
            processingRole: user?.employee?.processingRole
        });
        console.log('renderActions: order данные:', {
            status: order?.status,
            assignedToId: order?.assignedTo?.id,
            assignedToName: order?.assignedTo?.name
        });

        if (!showCancelButton && !showDownloadButton && !showTakeButton && !showCompleteButton) {
            console.log('renderActions: не показываем кнопки');
            return null;
        }

        return (
            <View style={styles.actionsContainer}>
                {/* Кнопка "Взять в работу" для сотрудников */}
                {showTakeButton && (
                    <TouchableOpacity
                        style={styles.processButton}
                        onPress={async () => {
                            try {
                                setTaking(true);
                                const res = await takeOrder(orderId, 'Взял заказ в работу');
                                if (!res.success) throw new Error(res.error);

                                // Создаем временный этап для истории с полным именем и должностью
                                const fullEmployeeName = `${user?.employee?.name || 'Сотрудник'} ${user?.employee?.position || ''}`.trim();
                                const tempStep = {
                                    id: `temp-${Date.now()}`,
                                    status: user?.employee?.processingRole === 'PICKER' ? 'PICKING' :
                                           user?.employee?.processingRole === 'PACKER' ? 'PACKING' : 'IN_DELIVERY',
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

                                // Немедленно обновляем локальное состояние с временным этапом
                                setLocalOrderState(prevState => ({
                                    ...prevState,
                                    assignedToId: user?.employee?.id || null,
                                    status: order?.status || null,
                                    lastAction: 'taken',
                                    actionTimestamp: Date.now(),
                                    temporarySteps: [tempStep],
                                    lastKnownHistoryLength: prevState.lastKnownHistoryLength
                                }));

                                console.log('🎯 После взятия заказа в работу:', {
                                    assignedToId: user?.employee?.id,
                                    employeeRole: user?.employee?.processingRole,
                                    tempStep: tempStep
                                });

                                // Показываем Toast уведомление вместо алерта
                                setToastConfig({
                                    message: 'Заказ взят в работу',
                                    type: 'success',
                                    duration: 3000
                                });
                                // Загружаем обновленные данные в фоне
                                loadOrderDetails(true);
                            } catch (e) {
                                Alert.alert('Ошибка', e.message || 'Не удалось взять заказ');
                            } finally {
                                setTaking(false);
                            }
                        }}
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
                
                {/* Кнопка "Завершить этап" для сотрудников */}
                {showCompleteButton && (
                    <TouchableOpacity
                        style={styles.processButton}
                        onPress={handleOpenProcessingModal}
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

                {/* Кнопка скачивания накладной для персонала */}
                {showDownloadButton && (
                    <TouchableOpacity
                        style={[styles.downloadButton, (showTakeButton || showCompleteButton) && styles.buttonSpacing]}
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

                {/* Кнопка отмены заказа для клиентов */}
                {console.log('renderActions: rendering cancel button, showCancelButton -', showCancelButton)}
                {showCancelButton && (
                    <TouchableOpacity
                        style={[styles.cancelButton, (showDownloadButton || showTakeButton || showCompleteButton) && styles.buttonSpacing]}
                        onPress={handleCancelOrder}
                        disabled={cancelling}
                        activeOpacity={0.8}
                    >
                        <View style={styles.buttonContent}>
                            {cancelling ? (
                                <View style={styles.buttonLoader}>
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                    <View style={[styles.buttonLoaderDot, { backgroundColor: '#fff' }]} />
                                </View>
                            ) : (
                                <>
                                    <Icon name="cancel" size={20} color="#fff" />
                                    <Text style={styles.cancelButtonText}>Отменить заказ</Text>
                                </>
                            )}
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        );
    }, [order?.status, cancelling, downloadingInvoice, processingOrder, taking, canDownloadInvoice, employeeButtonLogic, handleCancelOrder, handleDownloadInvoice, handleOpenProcessingModal]);

    // Рендер ошибки
    const renderError = () => (
        <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
                <Icon name="error-outline" size={64} color="#EF5350" />
            </View>
            <Text style={styles.errorTitle}>Ошибка загрузки</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                    loadOrderDetails();
                }}
                activeOpacity={0.8}
            >
                <Icon name="refresh" size={20} color="#fff" />
                <Text style={styles.retryButtonText}>Повторить</Text>
            </TouchableOpacity>
        </View>
    );

    // Рендер загрузки со скелетонами
    if (loading && !refreshing) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#667eea" />
                <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 32 }}>
                    {/* Заголовок */}
                    <View style={styles.headerContainer}>
                        <View style={styles.headerGradient}>
                            <View style={styles.headerContent}>
                                <View style={styles.headerTop}>
                                    <View style={styles.orderNumberContainer}>
                                        <View style={{ height: 16, width: 120, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 8, marginBottom: 8 }} />
                                        <View style={{ height: 12, width: 80, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6 }} />
                                    </View>
                                    <View style={{ height: 24, width: 100, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 }} />
                                </View>
                                <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 12 }} />
                            </View>
                        </View>
                    </View>

                    {/* Пара карточек-скелетонов */}
                    {[1,2].map(i => (
                        <View key={i} style={styles.modernCard}>
                            <View style={{ height: 18, width: 160, backgroundColor: '#eee', borderRadius: 8, marginBottom: 16 }} />
                            <View style={{ height: 14, width: '80%', backgroundColor: '#eee', borderRadius: 6, marginBottom: 10 }} />
                            <View style={{ height: 14, width: '60%', backgroundColor: '#eee', borderRadius: 6, marginBottom: 10 }} />
                            <View style={{ height: 14, width: '70%', backgroundColor: '#eee', borderRadius: 6 }} />
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    }

    // Рендер ошибки
    if (error && !loading) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#667eea" />
                {renderError()}
            </View>
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
                            onRefresh={handleRefresh}
                            colors={['#667eea']}
                            tintColor="#667eea"
                            progressBackgroundColor="#fff"
                        />
                    }
                >
                    {order && (
                        <>
                            {renderOrderHeader}
                            {renderDeliveryInfo}
                            {renderOrderItems}
                            {renderProcessingHistory}
                            {renderActions}
                        </>
                    )}
                </ScrollView>
            </Animated.View>

            {/* Модальное окно обработки заказа */}
            <Modal
                visible={processingModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={handleCloseProcessingModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Завершение этапа обработки</Text>
                            <Text style={styles.modalSubtitle}>
                                {order?.orderNumber ? `Заказ ${formatOrderNumber(order.orderNumber)}` : ''}
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
                                onPress={handleCloseProcessingModal}
                                disabled={processingOrder}
                            >
                                <Text style={styles.modalCancelButtonText}>Отмена</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.modalConfirmButton,
                                    processingOrder && styles.modalButtonDisabled
                                ]}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#667eea',
    },
    animatedContainer: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#667eea',
    },
    loadingContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 32,
    },

    // Заголовок
    headerContainer: {
        marginBottom: 20,
    },
    headerGradient: {
        backgroundColor: '#667eea',
        paddingTop: 16,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
    },
    headerContent: {
        gap: 16,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    orderNumberContainer: {
        flex: 1,
    },
    orderNumber: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
    },
    orderDate: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    progressContainer: {
        gap: 8,
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    progressText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '600',
        textAlign: 'center',
    },
    amountContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 16,
    },
    amountInfo: {
        flex: 1,
    },
    amountLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
        marginBottom: 4,
    },
    amount: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
    },
    amountIcon: {
        width: 48,
        height: 48,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Современные карточки
    modernCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        padding: 24,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#2d3748',
        flex: 1,
    },

    // Информационные строки
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    infoIconContainer: {
        width: 32,
        height: 32,
        backgroundColor: '#f7fafc',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#718096',
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 16,
        color: '#2d3748',
        lineHeight: 22,
        fontWeight: '500',
    },
    infoSubtext: {
        fontSize: 12,
        color: '#718096',
        marginTop: 2,
    },

    // Список товаров
    itemsList: {
        gap: 0,
    },
    itemContainer: {
        flexDirection: 'row',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        gap: 16,
    },
    lastItem: {
        borderBottomWidth: 0,
    },
    imageContainer: {
        width: 80,
        height: 80,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#f8f9fa',
    },
    itemImage: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
    },
    itemInfo: {
        flex: 1,
        gap: 8,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2d3748',
        lineHeight: 22,
    },
    supplierContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    itemSupplier: {
        fontSize: 12,
        color: '#718096',
        fontWeight: '500',
    },
    itemDetails: {
        gap: 4,
    },
    quantityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    quantityLabel: {
        fontSize: 14,
        color: '#718096',
        fontWeight: '500',
    },
    itemQuantity: {
        fontSize: 14,
        color: '#2d3748',
        fontWeight: '600',
    },
    priceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 14,
        color: '#718096',
        fontWeight: '500',
    },
    itemPrice: {
        fontSize: 14,
        color: '#2d3748',
        fontWeight: '600',
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    totalLabel: {
        fontSize: 16,
        color: '#4a5568',
        fontWeight: '600',
    },
    itemTotal: {
        fontSize: 18,
        fontWeight: '800',
        color: '#667eea',
    },

    // Действия
    actionsContainer: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
    downloadButton: {
        backgroundColor: '#667eea',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    processButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    cancelButton: {
        backgroundColor: '#EF5350',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#EF5350',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonSpacing: {
        marginTop: 12,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    downloadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    processButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    // Ошибка
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        backgroundColor: '#667eea',
    },
    errorIconContainer: {
        width: 120,
        height: 120,
        backgroundColor: '#fff',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#EF5350',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    retryButtonText: {
        color: '#667eea',
        fontSize: 16,
        fontWeight: '700',
    },

    // Стили для истории обработки
    processingStepsContainer: {
        gap: 16,
    },
    processingStep: {
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    lastProcessingStep: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    stepHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    stepRole: {
        flex: 1,
        gap: 8,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
        alignSelf: 'flex-start',
    },
    roleLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    stepStatus: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2d3748',
    },
    stepDate: {
        fontSize: 12,
        color: '#718096',
        fontWeight: '500',
    },
    stepEmployee: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    employeeInfo: {
        flex: 1,
    },
    employeeName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2d3748',
        marginBottom: 2,
    },
    employeePosition: {
        fontSize: 12,
        color: '#718096',
    },
    stepComment: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    commentText: {
        flex: 1,
        fontSize: 12,
        color: '#718096',
        fontStyle: 'italic',
        lineHeight: 16,
    },
    virtualStep: {
        opacity: 0.8,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
    },
    virtualComment: {
        fontStyle: 'normal',
        color: '#6b7280',
    },
    temporaryStep: {
        backgroundColor: '#e8f5e8',
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
        borderRadius: 8,
        padding: 12,
        opacity: 0.9,
    },

    // Стили для загрузчика кнопки скачивания
    buttonLoader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    buttonLoaderDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    // Стили для модального окна обработки заказа
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
        maxHeight: '80%',
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
        maxHeight: 400,
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
    infoContainer: {
        backgroundColor: '#f0f2ff',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#667eea',
        marginBottom: 20,
    },
    infoText: {
        fontSize: 14,
        color: '#1a1a1a',
        lineHeight: 20,
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
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        alignItems: 'center',
    },
    modalCancelButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    modalConfirmButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#4CAF50',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    modalConfirmButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    modalButtonDisabled: {
        backgroundColor: '#ccc',
        opacity: 0.6,
    },
});