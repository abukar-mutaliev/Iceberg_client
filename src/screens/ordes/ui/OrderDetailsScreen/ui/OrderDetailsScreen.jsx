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
import Icon from 'react-native-vector-icons/MaterialIcons';
import { OrderApi } from '@entities/order';
import { useOrders } from '@entities/order';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { Loader } from "@shared/ui/Loader";

// Временно определяем константы локально
const ORDER_STATUS_LABELS = {
    PENDING: 'Ожидает обработки',
    CONFIRMED: 'Подтвержден',
    IN_DELIVERY: 'В доставке',
    DELIVERED: 'Доставлен',
    CANCELLED: 'Отменен',
    RETURNED: 'Возвращен'
};

const ORDER_STATUS_COLORS = {
    PENDING: '#FFA726',
    CONFIRMED: '#42A5F5',
    IN_DELIVERY: '#5C6BC0',
    DELIVERED: '#66BB6A',
    CANCELLED: '#EF5350',
    RETURNED: '#78909C'
};

const ORDER_STATUS_ICONS = {
    PENDING: 'schedule',
    CONFIRMED: 'check-circle',
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
    if (userRole === 'CLIENT') {
        return status === 'PENDING';
    }
    return ['PENDING', 'CONFIRMED', 'IN_DELIVERY'].includes(status);
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

    // Хуки
    const { currentUser: user } = useAuth();
    const { downloadInvoice, completeOrderStage, takeOrder } = useOrders();
    const [taking, setTaking] = useState(false);

    // Анимации - используем useRef для стабильных ссылок
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // Проверка прав доступа для отображения истории обработки
    const canViewProcessingHistory = useMemo(() => {
        return user?.role === 'ADMIN' || user?.role === 'EMPLOYEE';
    }, [user?.role]);

    // Функция для анализа истории статусов и извлечения информации о сотрудниках
    const getProcessingHistory = useCallback(() => {
        if (!order?.statusHistory || order.statusHistory.length === 0) return [];

        const processingSteps = [];
        const statusOrder = ['PENDING', 'CONFIRMED', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'];
        
        // Анализируем каждый статус в истории
        order.statusHistory.forEach((historyItem, index) => {
            const { status, comment, createdAt } = historyItem;
            
            // Определяем роль сотрудника по статусу
            let role = '';
            let roleLabel = '';
            
            switch (status) {
                case 'CONFIRMED':
                    role = 'PICKER';
                    roleLabel = 'Сборщик';
                    break;
                case 'IN_DELIVERY':
                    role = 'PACKER';
                    roleLabel = 'Упаковщик';
                    break;
                case 'DELIVERED':
                    role = 'COURIER';
                    roleLabel = 'Курьер';
                    break;
                case 'CANCELLED':
                    role = 'MANAGER';
                    roleLabel = 'Менеджер';
                    break;
                case 'RETURNED':
                    role = 'COURIER';
                    roleLabel = 'Курьер';
                    break;
                default:
                    role = 'UNKNOWN';
                    roleLabel = 'Сотрудник';
            }

            // Извлекаем информацию о сотруднике из комментария
            let employeeName = '';
            let employeePosition = '';
            
            if (comment) {
                // Ищем паттерны в комментариях для извлечения информации о сотрудниках
                const patterns = [
                    /обработано сотрудником (.+?) \((.+?)\)/i,
                    /назначен сотруднику (.+?) \((.+?)\)/i,
                    /назначен сотруднику (.+?)/i,
                    /принят сотрудником (.+?) на склад/i,
                    /автоматически назначен сотруднику (.+?) \((.+?)\)/i,
                    /заказ переназначен сотруднику (.+?) \((.+?)\)/i,
                    /(.+?) \((.+?)\)/i,
                    /(.+?)/i
                ];
                
                for (const pattern of patterns) {
                    const match = comment.match(pattern);
                    if (match) {
                        if (match[2]) {
                            employeeName = match[1].trim();
                            employeePosition = match[2].trim();
                        } else {
                            employeeName = match[1].trim();
                        }
                        break;
                    }
                }
            }

            processingSteps.push({
                status,
                role,
                roleLabel,
                employeeName,
                employeePosition,
                comment,
                createdAt,
                order: statusOrder.indexOf(status)
            });
        });

        // Сортируем по порядку статусов
        processingSteps.sort((a, b) => a.order - b.order);
        
        return processingSteps;
    }, [order?.statusHistory]);

    // Функция для отображения полной истории обработки
    const renderProcessingHistory = useMemo(() => {
        if (!canViewProcessingHistory) return null;

        const processingSteps = getProcessingHistory();
        if (processingSteps.length === 0) return null;

        return (
            <View style={styles.modernCard}>
                <View style={styles.cardHeader}>
                    <Icon name="people" size={24} color="#667eea" />
                    <Text style={styles.cardTitle}>История обработки заказа</Text>
                </View>
                
                <View style={styles.processingStepsContainer}>
                    {processingSteps.map((step, index) => (
                        <View key={index} style={[
                            styles.processingStep,
                            index === processingSteps.length - 1 && styles.lastProcessingStep
                        ]}>
                            <View style={styles.stepHeader}>
                                <View style={styles.stepRole}>
                                    <View style={[styles.roleBadge, { backgroundColor: ORDER_STATUS_COLORS[step.status] }]}>
                                        <Icon name={ORDER_STATUS_ICONS[step.status]} size={16} color="#fff" />
                                        <Text style={styles.roleLabel}>{step.roleLabel}</Text>
                                    </View>
                                    <Text style={styles.stepStatus}>
                                        {ORDER_STATUS_LABELS[step.status]}
                                    </Text>
                                </View>
                                <Text style={styles.stepDate}>
                                    {new Date(step.createdAt).toLocaleString('ru-RU')}
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
                            
                            {step.comment && (
                                <View style={styles.stepComment}>
                                    <Icon name="comment" size={14} color="#718096" />
                                    <Text style={styles.commentText}>
                                        {step.comment}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            </View>
        );
    }, [canViewProcessingHistory, getProcessingHistory]);

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

            if (response.status === 'success') {
                console.log('loadOrderDetails: order data -', response.data);
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
                throw new Error(response.message || 'Ошибка при загрузке заказа');
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
        if (!order || !canCancelOrder(order.status, 'CLIENT')) {
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
                            Alert.alert('Успех', 'Заказ успешно отменен');
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
                Alert.alert('Успех', 'Этап заказа успешно завершен');
                setProcessingModalVisible(false);
                setProcessingComment('');
                // Обновляем данные заказа
                loadOrderDetails(true);
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

    // Проверка прав для обработки заказа
    const canProcessOrder = useMemo(() => {
        // Только сотрудники могут обрабатывать заказы
        const isEmployee = user?.role === 'EMPLOYEE';
        const isAdmin = user?.role === 'ADMIN';
        
        // Проверяем, что заказ в статусе, который можно обработать
        const canProcessStatus = ['PENDING', 'CONFIRMED', 'IN_DELIVERY'].includes(order?.status);
        
        return (isEmployee || isAdmin) && canProcessStatus;
    }, [user?.role, order?.status]);

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
        
        if (!order) return null;

        const showCancelButton = canCancelOrder(order.status, 'CLIENT');
        const showDownloadButton = canDownloadInvoice;
        const showProcessButton = canProcessOrder;
        const isEmployee = user?.role === 'EMPLOYEE';
        const alreadyAssignedToMe = isEmployee && order?.assignedTo?.id && user?.employee?.id && order.assignedTo.id === user.employee.id;
        const showTakeButton = isEmployee && !alreadyAssignedToMe && ['PENDING','CONFIRMED','IN_DELIVERY'].includes(order.status);
        
        console.log('renderActions: showCancelButton -', showCancelButton);
        console.log('renderActions: showDownloadButton -', showDownloadButton);
        console.log('renderActions: showProcessButton -', showProcessButton);

        if (!showCancelButton && !showDownloadButton && !showProcessButton && !showTakeButton) {
            console.log('renderActions: не показываем кнопки');
            return null;
        }

        return (
            <View style={styles.actionsContainer}>
                {showTakeButton && (
                    <TouchableOpacity
                        style={[styles.processButton, styles.buttonSpacing]}
                        onPress={async () => {
                            try {
                                setTaking(true);
                                const res = await takeOrder(orderId, 'Взял заказ в работу');
                                if (!res.success) throw new Error(res.error);
                                Alert.alert('Успех', 'Заказ взят в работу');
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
                {/* Кнопка обработки заказа для сотрудников */}
                {showProcessButton && (
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
                        style={[styles.downloadButton, showProcessButton && styles.buttonSpacing]}
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
                {showCancelButton && (
                    <TouchableOpacity
                        style={[styles.cancelButton, (showDownloadButton || showProcessButton) && styles.buttonSpacing]}
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
    }, [order?.status, cancelling, downloadingInvoice, processingOrder, canDownloadInvoice, canProcessOrder, handleCancelOrder, handleDownloadInvoice, handleOpenProcessingModal]);

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