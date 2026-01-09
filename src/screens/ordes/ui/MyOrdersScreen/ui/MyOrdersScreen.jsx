import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    TextInput,
    Dimensions,
    StatusBar,
    Image,
    Animated,
    ScrollView,
    Clipboard
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OrderApi } from '@entities/order';
import { getImageUrl } from '@shared/api/api';
import { Loader } from "@shared/ui/Loader";
import { getOrderProgress } from '@shared/lib/orderUtils';
import { useCustomAlert } from '@shared/ui/CustomAlert';
import { 
    useOrderAlternatives, 
    ChoiceNotificationBanner,
    SplitOrderIndicator,
    SplitOrderInfo,
    useSplitOrders
} from '@entities/order';

const ORDER_STATUSES = {
    PENDING: 'PENDING',
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    CONFIRMED: 'CONFIRMED',
    WAITING_STOCK: 'WAITING_STOCK',
    IN_DELIVERY: 'IN_DELIVERY',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
    RETURNED: 'RETURNED'
};

const ORDER_STATUS_LABELS = {
    [ORDER_STATUSES.PENDING]: 'Ожидает',
    [ORDER_STATUSES.PENDING_PAYMENT]: 'Ожидает оплату',
    [ORDER_STATUSES.CONFIRMED]: 'Подтвержден',
    [ORDER_STATUSES.WAITING_STOCK]: 'Ожидает товар',
    [ORDER_STATUSES.IN_DELIVERY]: 'В доставке',
    [ORDER_STATUSES.DELIVERED]: 'Доставлен',
    [ORDER_STATUSES.CANCELLED]: 'Отменен',
    [ORDER_STATUSES.RETURNED]: 'Возвращен'
};

// Иконки статусов для современного вида
const STATUS_ICONS = {
    [ORDER_STATUSES.PENDING]: 'schedule',
    [ORDER_STATUSES.PENDING_PAYMENT]: 'payment',
    [ORDER_STATUSES.CONFIRMED]: 'check-circle',
    [ORDER_STATUSES.WAITING_STOCK]: 'inventory',
    [ORDER_STATUSES.IN_DELIVERY]: 'local-shipping',
    [ORDER_STATUSES.DELIVERED]: 'task-alt',
    [ORDER_STATUSES.CANCELLED]: 'cancel',
    [ORDER_STATUSES.RETURNED]: 'undo'
};

// Градиенты для статусов
const STATUS_GRADIENTS = {
    [ORDER_STATUSES.PENDING]: ['#FFA726', '#FFB74D'],
    [ORDER_STATUSES.PENDING_PAYMENT]: ['#FF9800', '#FFB74D'],
    [ORDER_STATUSES.CONFIRMED]: ['#42A5F5', '#64B5F6'],
    [ORDER_STATUSES.WAITING_STOCK]: ['#fd7e14', '#ff8c00'],
    [ORDER_STATUSES.IN_DELIVERY]: ['#5C6BC0', '#7986CB'],
    [ORDER_STATUSES.DELIVERED]: ['#66BB6A', '#81C784'],
    [ORDER_STATUSES.CANCELLED]: ['#EF5350', '#F8BBD9'],
    [ORDER_STATUSES.RETURNED]: ['#78909C', '#90A4AE']
};

// Активные статусы (показываем по умолчанию)
const ACTIVE_STATUSES = [
    ORDER_STATUSES.PENDING_PAYMENT,
    ORDER_STATUSES.PENDING,
    ORDER_STATUSES.CONFIRMED,
    ORDER_STATUSES.WAITING_STOCK,
    ORDER_STATUSES.IN_DELIVERY
];

// Архивные статусы (показываем отдельно)
const ARCHIVED_STATUSES = [
    ORDER_STATUSES.DELIVERED,
    ORDER_STATUSES.CANCELLED,
    ORDER_STATUSES.RETURNED
];

const CACHE_KEY = 'my_orders_cache';
const CACHE_EXPIRY = 10 * 60 * 1000; // 10 минут
const AUTO_REFRESH_INTERVAL = 60 * 1000; // 1 минута

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

const canCancelOrder = (status, userRole = 'CLIENT') => {
    if (userRole === 'CLIENT') {
        return [ORDER_STATUSES.PENDING_PAYMENT, ORDER_STATUSES.PENDING, ORDER_STATUSES.WAITING_STOCK].includes(status);
    }
    return [
        ORDER_STATUSES.PENDING,
        ORDER_STATUSES.CONFIRMED,
        ORDER_STATUSES.WAITING_STOCK,
        ORDER_STATUSES.IN_DELIVERY
    ].includes(status);
};

const { width, height } = Dimensions.get('window');

export const MyOrdersScreen = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    
    // Хук для кастомных алертов
    const { showConfirm, showSuccess, showError, showInfo } = useCustomAlert();
    
    // Хук для альтернативных предложений
    const {
        choices,
        hasActiveChoices,
        urgentChoices,
        loadMyChoices
    } = useOrderAlternatives();
    
    // Хук для разделенных заказов
    const {
        isSplitOrder,
        getOriginalOrderNumber,
        groupOrdersByOriginal
    } = useSplitOrders();
    
    // Состояние компонента
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState('active'); // 'active' или 'archived'
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [dataLoaded, setDataLoaded] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(0);
    const [showChoiceBanner, setShowChoiceBanner] = useState(true);
    const [cancellingOrderId, setCancellingOrderId] = useState(null); // ID заказа в процессе отмены
    const [stats, setStats] = useState({
                    totalOrders: 0,
                    totalAmount: 0,
                    statusCounts: {},
                    archivedCount: 0
                });

    // Автоматическое обновление
    const autoRefreshRef = useRef(null);
    const isMountedRef = useRef(true);
    const initialLoadRef = useRef(false);

    // Анимация для карточек - используем useRef чтобы избежать пересоздания
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Стабильная ссылка на loadOrders для предотвращения циклов
    const loadOrdersRef = useRef();

    // Селекторы Redux
    const isAuthenticated = useSelector(state => !!state.auth?.user?.id);
    const userRole = useSelector(state => state.auth?.user?.role);
    const userId = useSelector(state => state.auth?.user?.id);

    // Проверка доступа
    const hasAccess = isAuthenticated && userRole === 'CLIENT';

    // Разделение заказов на активные и архивные
    const { activeOrders, archivedOrders } = useMemo(() => {
        const active = orders.filter(order => ACTIVE_STATUSES.includes(order.status));
        const archived = orders.filter(order => ARCHIVED_STATUSES.includes(order.status));
        return { activeOrders: active, archivedOrders: archived };
    }, [orders]);

    // Загрузка заказов
    const loadOrders = useCallback(async (isRefresh = false) => {
        if (!hasAccess) {
            setLoading(false);
            return;
        }

        try {
            // Пытаемся загрузить из кэша при первом запуске
            if (!isRefresh && !dataLoaded && !initialLoadRef.current) {
                const cachedData = await loadCacheData();
                if (cachedData) {
                    console.log('MyOrdersScreen: Используем данные из кэша');
                    setOrders(cachedData.orders || []);
                    setStats(cachedData.stats || {
                    totalOrders: 0,
                    totalAmount: 0,
                    statusCounts: {},
                    archivedCount: 0
                });
                    setDataLoaded(true);
                    initialLoadRef.current = true;
                    setLastFetchTime(cachedData.timestamp || Date.now());
                    setLoading(false);
                    
                    // Анимация появления
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }).start();
                    return;
                }
            }

            if (!isRefresh) {
                setLoading(true);
            }
            setError(null);

            console.log('MyOrdersScreen: Загружаем данные с сервера', { isRefresh });

            const response = await OrderApi.getMyOrders({
                page: 1,
                limit: 100,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            });

            console.log('MyOrdersScreen: Получен ответ от API:', {
                success: response.success,
                hasData: !!response.data,
                dataLength: response.data?.length || 0,
                message: response.message
            });

            if (response.status === 'success') {
                const ordersData = response.data || [];
                setOrders(ordersData);
                
                // Вычисляем статистику только для активных заказов
                const activeOrdersData = ordersData.filter(order => ACTIVE_STATUSES.includes(order.status));
                const archivedOrdersData = ordersData.filter(order => ARCHIVED_STATUSES.includes(order.status));
                
                const totalAmount = activeOrdersData.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
                const statusCounts = ordersData.reduce((acc, order) => {
                    acc[order.status] = (acc[order.status] || 0) + 1;
                    return acc;
                }, {});

                const newStats = {
                    totalOrders: activeOrdersData.length,
                    totalAmount,
                    statusCounts,
                    archivedCount: archivedOrdersData.length
                };

                setStats(newStats);

                // Сохраняем данные в кэш
                const currentTime = Date.now();
                setLastFetchTime(currentTime);
                setDataLoaded(true);
                initialLoadRef.current = true;

                const cacheData = {
                    timestamp: currentTime,
                    orders: ordersData,
                    stats: newStats
                };
                await saveCacheData(cacheData);

                // Обновляем список альтернативных предложений
                if (loadMyChoices) {
                    await loadMyChoices();
                }

                // Анимация появления
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            } else {
                console.error('MyOrdersScreen: Неожиданный формат ответа:', response);
                throw new Error(response.message || 'Ошибка при загрузке заказов');
            }
        } catch (err) {
            console.error('Ошибка загрузки заказов:', err);
            setError(err.message || 'Не удалось загрузить заказы');
        } finally {
            setLoading(false);
            if (isRefresh) {
                setRefreshing(false);
            }
        }
    }, [hasAccess, dataLoaded, loadMyChoices]); // Добавили loadMyChoices для обновления выборов

    // Обновляем ссылку на актуальную версию loadOrders
    useEffect(() => {
        loadOrdersRef.current = loadOrders;
    }, [loadOrders]);

    // Обновление при pull-to-refresh
    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        // Принудительное обновление с очисткой кэша
        clearCache().then(() => {
            loadOrdersRef.current?.(true);
        });
    }, []);

    // Фильтрация заказов - мемоизируем для предотвращения лишних обновлений
    const filteredOrdersMemo = useMemo(() => {
        let filtered = [];

        // Определяем какие заказы показывать
        if (selectedTab === 'active') {
            filtered = activeOrders;
        } else {
            filtered = archivedOrders;
        }

        // Специальный фильтр "Ожидают выбора"
        if (selectedStatus === 'WAITING_CHOICE') {
            filtered = filtered.filter(order => {
                const orderChoices = choices.filter(choice => 
                    choice.orderId === order.id && 
                    choice.status === 'PENDING'
                );
                return orderChoices.length > 0;
            });
        }
        // Фильтр по статусу
        else if (selectedStatus !== 'ALL') {
            filtered = filtered.filter(order => order.status === selectedStatus);
        }

        // Поиск
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(order => 
                order.orderNumber?.toLowerCase().includes(query) ||
                order.deliveryAddress?.toLowerCase().includes(query) ||
                order.comment?.toLowerCase().includes(query) ||
                ORDER_STATUS_LABELS[order.status]?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [selectedTab, selectedStatus, searchQuery, activeOrders, archivedOrders, choices]);

    // Обновляем filteredOrders только когда мемоизированное значение изменилось
    useEffect(() => {
        setFilteredOrders(filteredOrdersMemo);
    }, [filteredOrdersMemo]);

    // Загрузка при фокусе экрана - используем стабильную ссылку
    useFocusEffect(
        useCallback(() => {
            if (hasAccess) {
                // Инициализация при первом открытии
                if (!initialLoadRef.current) {
                    const initializeScreen = async () => {
                        try {
                            // Пытаемся загрузить из кэша при первом запуске
                            const cachedData = await loadCacheData();
                            if (cachedData) {
                                console.log('MyOrdersScreen: Используем данные из кэша при инициализации');
                                setOrders(cachedData.orders || []);
                                setStats(cachedData.stats || {
                    totalOrders: 0,
                    totalAmount: 0,
                    statusCounts: {},
                    archivedCount: 0
                });
                                setDataLoaded(true);
                                initialLoadRef.current = true;
                                setLastFetchTime(cachedData.timestamp || Date.now());
                                setLoading(false);
                                
                                // Анимация появления
                                Animated.timing(fadeAnim, {
                                    toValue: 1,
                                    duration: 300,
                                    useNativeDriver: true,
                                }).start();
                            } else {
                                // Загружаем данные с сервера если кэша нет
                                console.log('MyOrdersScreen: Инициализация - начинаем загрузку данных');
                                loadOrdersRef.current?.();
                            }
                            
                            // Загружаем альтернативные предложения
                            if (loadMyChoices) {
                                loadMyChoices();
                            }
                        } catch (error) {
                            console.error('MyOrdersScreen - Ошибка инициализации:', error);
                            setLoading(false);
                        }
                    };
                    
                    initializeScreen();
                } else {

                    console.log('MyOrdersScreen: Обновление предложений при возврате на экран');
                    if (loadMyChoices) {
                        loadMyChoices();
                    }
                }

       
            }

            return () => {
                isMountedRef.current = false;
                if (autoRefreshRef.current) {
                    clearInterval(autoRefreshRef.current);
                }
            };
        }, [hasAccess, dataLoaded, loadMyChoices])
    );

    // Обработчики
    const handleCopyOrderNumber = useCallback((orderNumber) => {
        const formattedNumber = formatOrderNumber(orderNumber);
        Clipboard.setString(formattedNumber);
        showInfo('Скопировано', `Номер заказа ${formattedNumber} скопирован в буфер обмена`);
    }, [showInfo]);

    const handleOrderPress = useCallback((orderId) => {
        navigation.navigate('OrderDetails', { orderId });
    }, [navigation]);

    const handleCancelOrder = useCallback(async (orderId) => {
        const order = orders.find(o => o.id === orderId);
        
        if (!order || !canCancelOrder(order.status, 'CLIENT')) {
            showError('Ошибка', 'Этот заказ нельзя отменить');
            return;
        }

        showConfirm(
            'Отмена заказа',
            `Вы уверены, что хотите отменить заказ ${formatOrderNumber(order.orderNumber)}?`,
            async () => {
                try {
                    // Устанавливаем ID отменяемого заказа для визуального индикатора
                    setCancellingOrderId(orderId);
                    
                    // Выполняем отмену
                    await OrderApi.cancelMyOrder(orderId, 'Отменен клиентом');
                    
                    // Получаем обновленный заказ для проверки статуса платежа
                    const updatedOrderResponse = await OrderApi.getOrderById(orderId);
                    const updatedOrder = updatedOrderResponse?.data;
                    
                    // Сбрасываем состояние
                    setCancellingOrderId(null);
                    
                    // Показываем success
                    showSuccess('Заказ успешно отменен');
                    
                    // Проверяем статус платежа и показываем информацию о возврате
                    if (updatedOrder?.payment?.status === 'REFUNDED') {
                        // Деньги возвращены - показываем алерт
                        setTimeout(() => {
                            showSuccess(
                                'Деньги возвращены',
                                `Средства в размере ${order.totalAmount}₽ возвращены на ваш счет. Они поступят в течение 3-5 рабочих дней.`
                            );
                        }, 1000);
                    } else if (updatedOrder?.payment?.status === 'COMPLETED') {
                        // Платеж был завершен, но возврат еще не произошел
                        setTimeout(() => {
                            showInfo(
                                'Возврат средств',
                                `Возврат средств в размере ${order.totalAmount}₽ обрабатывается. Деньги поступят в течение 3-5 рабочих дней.`
                            );
                        }, 1000);
                    }
                    
                    // Обновляем список заказов
                    loadOrdersRef.current?.();
                    
                    // Обновляем альтернативные предложения после отмены
                    if (loadMyChoices) {
                        loadMyChoices();
                    }
                } catch (err) {
                    // Сбрасываем состояние
                    setCancellingOrderId(null);
                    
                    console.error('Ошибка отмены заказа:', err);
                    showError('Ошибка', err.message || 'Не удалось отменить заказ');
                }
            }
        );
    }, [orders, loadMyChoices, showConfirm, showSuccess, showError, showInfo]);

    // Переключение табов
    const handleTabChange = useCallback((tab) => {
        setSelectedTab(tab);
        setSelectedStatus('ALL');
        setSearchQuery('');
    }, []);

    // Обработчики для альтернативных предложений
    const handleChoicePress = useCallback((choices) => {
        // Если передано одно предложение (старый формат), используем его
        if (choices && !Array.isArray(choices)) {
            navigation.navigate('OrderChoice', {
                choiceId: choices.id,
                orderId: choices.orderId
            });
            return;
        }
        
        // Если передано несколько предложений, переходим к списку
        if (Array.isArray(choices) && choices.length > 0) {
            navigation.navigate('OrderChoicesList');
        }
    }, [navigation]);

    const handleDismissChoiceBanner = useCallback(() => {
        setShowChoiceBanner(false);
    }, []);

    // Обработчик для нажатия на разделенные заказы
    const handleSplitOrderPress = useCallback((order) => {
        if (isSplitOrder(order)) {
            const originalNumber = getOriginalOrderNumber(order);
            // Переходим к деталям оригинального заказа
            navigation.navigate('OrderDetails', { 
                orderId: order.id,
                showSplitInfo: true,
                originalOrderNumber: originalNumber
            });
        } else {
            // Обычный заказ
            handleOrderPress(order.id);
        }
    }, [isSplitOrder, getOriginalOrderNumber, navigation, handleOrderPress]);

    // Получаем прогресс статуса заказа (для прогресс-бара)
    const getStatusProgress = useCallback((status) => {
        return getOrderProgress(status) / 100; // Конвертируем в десятичное значение для анимации
    }, []);

    // Статусы для фильтра
    const statusOptions = useMemo(() => {
        const currentCount = selectedTab === 'active' ? activeOrders.length : archivedOrders.length;
        const options = [{ value: 'ALL', label: 'Все', count: currentCount }];
        
        // Добавляем специальный фильтр "Ожидают выбора" только для активных заказов
        if (selectedTab === 'active' && hasActiveChoices) {
            // Подсчитываем заказы с активными предложениями
            const choicesCount = orders.filter(order => {
                if (!ACTIVE_STATUSES.includes(order.status)) return false;
                const orderChoices = choices.filter(choice => 
                    choice.orderId === order.id && 
                    choice.status === 'PENDING'
                );
                return orderChoices.length > 0;
            }).length;
            
            if (choicesCount > 0) {
                options.push({
                    value: 'WAITING_CHOICE',
                    label: '⏳ Ожидают выбора',
                    count: choicesCount
                });
            }
        }
        
        const statusesToShow = selectedTab === 'active' ? ACTIVE_STATUSES : ARCHIVED_STATUSES;
        statusesToShow.forEach(status => {
            const count = stats.statusCounts[status] || 0;
            if (count > 0) {
                options.push({ 
                    value: status, 
                    label: ORDER_STATUS_LABELS[status], 
                    count 
                });
            }
        });

        return options;
    }, [selectedTab, activeOrders.length, archivedOrders.length, stats.statusCounts, hasActiveChoices, orders, choices]);

    // Получаем основной товар из заказа
    const getMainProduct = useCallback((order) => {
        if (!order.items || order.items.length === 0) return null;
        return order.items[0];
    }, []);

    // Получаем изображение товара
    const getProductImage = useCallback((product) => {
        if (!product?.images || product.images.length === 0) {
            return null; // Возвращаем null для использования плейсхолдера
        }
        
        const firstImage = product.images[0];

        
        let imageUrl = '';
        
        if (typeof firstImage === 'string') {
            imageUrl = firstImage;
        } else if (typeof firstImage === 'object' && firstImage !== null) {
            imageUrl = firstImage.path || firstImage.url || firstImage.uri || firstImage;
        }
        
        if (!imageUrl) {
            console.log('MyOrdersScreen: Нет URL изображения, используем placeholder');
            return null; // Возвращаем null для использования плейсхолдера
        }
        
        // Если уже полный URL
        if (imageUrl.startsWith('http') || imageUrl.startsWith('https')) {
            console.log('MyOrdersScreen: Полный URL:', imageUrl);
            return { uri: imageUrl };
        }
        
        // Нормализуем путь: заменяем обратные слеши на прямые
        const normalizedPath = imageUrl.replace(/\\/g, '/');
        
        const fullUrl = getImageUrl(normalizedPath);
        
        return { uri: fullUrl };
    }, []);

    // Рендер современного заголовка со статистикой
    const renderModernHeader = () => (
        <View style={styles.modernHeader}>
            <View style={styles.headerGradient}>
                <Text style={styles.headerTitle}>Мои заказы</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{selectedTab === 'active' ? stats.totalOrders : stats.archivedCount}</Text>
                        <Text style={styles.statLabel}>{selectedTab === 'active' ? 'Активных' : 'Завершенных'}</Text>
                    </View>
                    {selectedTab === 'active' && (
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{formatAmount(stats.totalAmount)}</Text>
                            <Text style={styles.statLabel}>Общая сумма</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );

    // Рендер современных табов
    const renderModernTabs = () => (
        <View style={styles.tabsContainer}>
            <TouchableOpacity
                style={[styles.tab, selectedTab === 'active' && styles.activeTab]}
                onPress={() => handleTabChange('active')}
            >
                <Icon 
                    name="assignment" 
                    size={20} 
                    color={selectedTab === 'active' ? '#fff' : '#666'} 
                />
                <Text style={[styles.tabText, selectedTab === 'active' && styles.activeTabText]}>
                    Активные ({stats.totalOrders})
                </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
                style={[styles.tab, selectedTab === 'archived' && styles.activeTab]}
                onPress={() => handleTabChange('archived')}
            >
                <Icon 
                    name="archive" 
                    size={20} 
                    color={selectedTab === 'archived' ? '#fff' : '#666'} 
                />
                <Text style={[styles.tabText, selectedTab === 'archived' && styles.activeTabText]}>
                    Завершенные ({stats.archivedCount})
                </Text>
            </TouchableOpacity>
        </View>
    );

    // Рендер современного поиска
    const renderModernSearch = () => (
        <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
                <Icon name="search" size={24} color="#999" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={selectedTab === 'active' ? "Найти активный заказ..." : "Найти из завершенных..."}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity
                        onPress={() => setSearchQuery('')}
                        style={styles.clearButton}
                    >
                        <Icon name="clear" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    // Рендер фильтров
    const renderStatusFilters = () => {
        if (statusOptions.length <= 1) return null;
        
        return (
            <View style={styles.filtersContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersScrollContainer}
                >
                    {statusOptions.map((item) => (
                        <TouchableOpacity
                            key={item.value}
                            style={[
                                styles.filterChip,
                                selectedStatus === item.value && styles.activeFilterChip
                            ]}
                            onPress={() => setSelectedStatus(item.value)}
                        >
                            <Text style={[
                                styles.filterChipText,
                                selectedStatus === item.value && styles.activeFilterChipText
                            ]}>
                                {item.label}
                            </Text>
                            <View style={[
                                styles.filterChipCount,
                                selectedStatus === item.value && styles.activeFilterChipCount
                            ]}>
                                <Text style={[
                                    styles.filterCountText,
                                    selectedStatus === item.value && styles.activeFilterCountText
                                ]}>
                                    {item.count}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    // Рендер карточки заказа
    const renderModernOrderItem = useCallback(({ item, index }) => {
        const mainProduct = getMainProduct(item);
        const productImage = mainProduct ? getProductImage(mainProduct.product) : null;
        const statusProgress = getStatusProgress(item.status);
        const statusGradient = STATUS_GRADIENTS[item.status];
        const isCancelling = cancellingOrderId === item.id;
        
        // Проверяем есть ли у заказа активные предложения
        const orderChoices = choices.filter(choice => 
            choice.orderId === item.id && 
            choice.status === 'PENDING'
        );
        const hasActiveChoices = orderChoices.length > 0;
        
        return (
            <Animated.View 
                style={[
                    styles.modernOrderCard,
                    { 
                        opacity: fadeAnim,
                        transform: [{
                            translateY: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [50, 0]
                            })
                        }]
                    },
                    isCancelling && styles.cancellingCard
                ]}
            >
                {/* Индикатор разделенного заказа */}
                {isSplitOrder(item) && (
                    <SplitOrderIndicator 
                        order={item}
                        onPress={() => handleSplitOrderPress(item)}
                        style={styles.splitOrderIndicator}
                    />
                )}

                {/* Кликабельная область карточки */}
                <TouchableOpacity
                    onPress={() => handleSplitOrderPress(item)}
                    activeOpacity={0.8}
                    style={styles.clickableCardContent}
                >
                    {/* Заголовок карточки */}
                    <View style={styles.orderHeader}>
                        {/* Статус в правом верхнем углу */}
                        <View
                            style={[styles.statusBadge, { backgroundColor: statusGradient[0] }]}
                        >
                            <Icon 
                                name={STATUS_ICONS[item.status]} 
                                size={12} 
                                color="#fff" 
                            />
                            <Text style={styles.statusText}>
                                {ORDER_STATUS_LABELS[item.status]}
                            </Text>
                        </View>
                    </View>
                    
                    {/* Номер заказа с кнопкой копирования */}
                    <View style={styles.orderNumberWithCopy}>
                        <Text style={styles.orderNumber}>{formatOrderNumber(item.orderNumber)}</Text>
                        
                        {/* Кнопка копирования */}
                        <TouchableOpacity
                            style={styles.copyButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                handleCopyOrderNumber(item.orderNumber);
                            }}
                            activeOpacity={0.7}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Icon name="content-copy" size={14} color="#667eea" />
                        </TouchableOpacity>
                    </View>
                    
                    {/* Дата заказа */}
                    <Text style={styles.orderDate}>
                        {new Date(item.createdAt).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </Text>

                    {/* Прогресс-бар для активных заказов */}
                    {ACTIVE_STATUSES.includes(item.status) && (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View 
                                    style={[
                                        styles.progressFill, 
                                        { width: `${statusProgress * 100}%`, backgroundColor: statusGradient[0] }
                                    ]} 
                                />
                            </View>
                            <Text style={styles.progressText}>
                                {Math.round(statusProgress * 100)}% выполнено
                            </Text>
                        </View>
                    )}

                    {/* Основной контент */}
                    <View style={styles.orderContent}>
                        <View style={styles.productImageContainer}>
                            {productImage ? (
                                <Image 
                                    source={productImage}
                                    style={styles.productImage}
                                    resizeMode="cover"
                                    onError={() => console.log('Error loading image')}
                                />
                            ) : (
                                <View style={[styles.productImage, styles.placeholderContainer]}>
                                    <Icon name="image" size={24} color="#ccc" />
                                </View>
                            )}
                        </View>
                        
                        <View style={styles.orderDetails}>
                            <View style={styles.orderItemsInfo}>
                                <View style={styles.itemsCountContainer}>
                                    <Icon name="shopping-cart" size={14} color="#4a5568" />
                                    <Text style={styles.itemsCount}>
                                        {mainProduct?.product?.name || 'Заказ'}
                                        {item.items && item.items.length > 1 && (
                                            ` + еще ${item.items.length - 1}`
                                        )}
                                    </Text>
                                </View>
                                
                                {item.deliveryDate && (
                                    <View style={styles.deliveryContainer}>
                                        <Icon name="local-shipping" size={12} color="#28a745" />
                                        <Text style={styles.deliveryDate}>
                                            {new Date(item.deliveryDate).toLocaleDateString('ru-RU')}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.amountContainer}>
                                <View style={styles.amountInfo}>
                                    <Text style={styles.amountLabel}>Общая сумма</Text>
                                    <Text style={styles.amount}>{formatAmount(item.totalAmount)}</Text>
                                </View>
                                <View style={styles.amountIcon}>
                                    <Icon name="account-balance-wallet" size={16} color="#667eea" />
                                </View>
                            </View>

                            {item.deliveryAddress && (
                                <View style={styles.addressContainer}>
                                    <View style={styles.addressHeader}>
                                        <Icon name="location-on" size={14} color="#718096" />
                                        <Text style={styles.addressLabel}>Адрес доставки</Text>
                                    </View>
                                    <Text style={styles.address} numberOfLines={2}>
                                        {item.deliveryAddress}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Действия - отдельный независимый блок */}
                <View style={styles.actionsContainer}>
                    {/* Кнопка выбора альтернатив */}
                    {hasActiveChoices && (
                        <TouchableOpacity
                            style={styles.choiceAction}
                            onPress={() => {
                                if (orderChoices.length === 1) {
                                    handleChoicePress(orderChoices[0]);
                                } else {
                                    navigation.navigate('OrderChoicesList');
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            <Icon name="compare-arrows" size={16} color="#667eea" />
                            <Text style={styles.choiceActionText}>
                                Выбрать альтернативу ({orderChoices.length})
                            </Text>
                        </TouchableOpacity>
                    )}
                    
                    {/* Кнопка отмены заказа */}
                    {canCancelOrder(item.status, 'CLIENT') && (
                        <TouchableOpacity
                            style={styles.cancelAction}
                            onPress={() => {
                                handleCancelOrder(item.id);
                            }}
                            activeOpacity={0.7}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            disabled={isCancelling}
                        >
                            <Icon name="close" size={14} color="#EF5350" />
                            <Text style={styles.cancelActionText}>Отменить заказ</Text>
                        </TouchableOpacity>
                    )}
                </View>
                
                {/* Оверлей с лоадером для отменяемого заказа */}
                {isCancelling && (
                    <View style={styles.cancellingOverlay}>
                        <View style={styles.cancellingContent}>
                            <Loader type="spinner" color="#667eea" size="large" />
                            <Text style={styles.cancellingText}>Отменяем заказ...</Text>
                        </View>
                    </View>
                )}
            </Animated.View>
        );
    }, [handleOrderPress, handleCancelOrder, handleChoicePress, getMainProduct, getProductImage, getStatusProgress, cancellingOrderId, choices, navigation]);

    // Рендер скелетон-лоадера
    const renderSkeletonLoader = () => (
        <View style={styles.skeletonContainer}>
            <Loader 
                type="youtube"
                color="#667eea"
            />
        </View>
    );

    // Рендер современного пустого состояния
    const renderModernEmptyState = () => {
        const isSearching = searchQuery || selectedStatus !== 'ALL';
        
        if (isSearching) {
            return (
                <View style={styles.emptyStateContainer}>
                    <View style={styles.emptyStateIconContainer}>
                        <Icon name="search-off" size={80} color="#e0e0e0" />
                    </View>
                    <Text style={styles.emptyStateTitle}>Ничего не найдено</Text>
                    <Text style={styles.emptyStateSubtitle}>
                        Попробуйте изменить параметры поиска или фильтра
                    </Text>
                    <TouchableOpacity
                        style={styles.modernButton}
                        onPress={() => {
                            setSearchQuery('');
                            setSelectedStatus('ALL');
                        }}
                    >
                        <Icon name="clear-all" size={20} color="#fff" />
                        <Text style={styles.modernButtonText}>Сбросить фильтры</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (selectedTab === 'archived') {
            return (
                <View style={styles.emptyStateContainer}>
                    <View style={styles.emptyStateIconContainer}>
                        <Icon name="archive" size={80} color="#e0e0e0" />
                    </View>
                    <Text style={styles.emptyStateTitle}>Архив пуст</Text>
                    <Text style={styles.emptyStateSubtitle}>
                        Здесь будут отображаться завершенные и отмененные заказы
                    </Text>
                    <TouchableOpacity
                        style={styles.modernButton}
                        onPress={() => handleTabChange('active')}
                    >
                        <Icon name="assignment" size={20} color="#fff" />
                        <Text style={styles.modernButtonText}>К активным заказам</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.emptyStateContainer}>
                <View style={styles.emptyStateIconContainer}>
                    <Icon name="shopping-bag" size={80} color="#e0e0e0" />
                </View>
                <Text style={styles.emptyStateTitle}>Нет активных заказов</Text>
                <Text style={styles.emptyStateSubtitle}>
                    Оформите заказ в нашем каталоге и он появится здесь
                </Text>
                <View style={styles.emptyButtonsContainer}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('MainTab', { screen: 'Main' })}
                    >
                        <Icon name="storefront" size={20} color="#fff" />
                        <Text style={styles.primaryButtonText}>Перейти в каталог</Text>
                    </TouchableOpacity>
                    {stats.archivedCount > 0 && (
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => handleTabChange('archived')}
                        >
                            <Icon name="archive" size={20} color="#667eea" />
                            <Text style={styles.secondaryButtonText}>
                                Посмотреть завершенные ({stats.archivedCount})
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    // Рендер ошибки доступа
    const renderAccessDenied = () => (
        <View style={styles.accessDeniedContainer}>
            <View style={styles.accessDeniedGradient}>
                <Icon name="lock" size={80} color="#fff" />
                <Text style={styles.accessDeniedTitle}>Доступ ограничен</Text>
                <Text style={styles.accessDeniedSubtitle}>
                    Для просмотра заказов необходимо войти в систему как клиент
                </Text>
                <TouchableOpacity
                    style={styles.loginButton}
                    onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
                >
                    <Icon name="login" size={20} color="#ff7675" />
                    <Text style={styles.loginButtonText}>Войти в систему</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // Рендер ошибки
    const renderError = () => (
        <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
                <Icon name="error-outline" size={80} color="#f44336" />
            </View>
            <Text style={styles.errorTitle}>Что-то пошло не так</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity
                style={styles.retryButton}
                onPress={() => loadOrders()}
            >
                <Icon name="refresh" size={20} color="#fff" />
                <Text style={styles.retryButtonText}>Попробовать снова</Text>
            </TouchableOpacity>
        </View>
    );

    // Рендер заголовка списка
    const renderListHeader = () => (
        <View>
            {/* Современный заголовок */}
            {renderModernHeader()}
            
            {/* Баннер с предложениями выбора */}
            {hasActiveChoices && showChoiceBanner && (
                <ChoiceNotificationBanner
                    choices={choices}
                    onPress={handleChoicePress}
                    onDismiss={handleDismissChoiceBanner}
                />
            )}
            
            {/* Табы */}
            {orders.length > 0 && renderModernTabs()}
            
            {/* Поиск */}
            {orders.length > 0 && renderModernSearch()}
            
            {/* Фильтры */}
            {orders.length > 0 && renderStatusFilters()}
        </View>
    );

    // Рендер загрузки со скелетонами карточек
    if (loading && !refreshing) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#667eea" />
                {renderModernHeader()}
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
                    contentContainerStyle={[styles.listContainer, styles.skeletonListContent]}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        );
    }

    // Проверка доступа
    if (!hasAccess) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#ff7675" />
                {renderAccessDenied()}
            </View>
        );
    }

    // Рендер ошибки
    if (error && !loading) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#667eea" />
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
                    {renderModernHeader()}
                    {renderError()}
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#667eea" />
            
            {/* Список заказов с заголовком */}
            <FlatList
                data={filteredOrders}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderModernOrderItem}
                ListHeaderComponent={renderListHeader}
                contentContainerStyle={[
                    styles.listContainer,
                    filteredOrders.length === 0 && styles.listContainerEmpty
                ]}
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
                ListEmptyComponent={orders.length === 0 ? null : renderModernEmptyState}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    listContainer: {
        paddingBottom: 16,
    },
    listContainerEmpty: {
        flex: 1,
        justifyContent: 'center',
    },
    separator: {
        height: 12,
    },
    // Современный заголовок
    modernHeader: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
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
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 16,
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statCard: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 28,
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
    // Современные табы
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 12,
        padding: 4,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    activeTab: {
        backgroundColor: '#667eea',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    activeTabText: {
        color: '#fff',
    },
    // Поиск
    searchContainer: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1a1a1a',
        fontWeight: '500',
    },
    clearButton: {
        padding: 4,
    },
    // Фильтры статусов
    filtersContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
    },
    filtersScrollContainer: {
        paddingRight: 16,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    activeFilterChip: {
        backgroundColor: '#667eea',
        borderColor: '#667eea',
        shadowColor: '#667eea',
        shadowOpacity: 0.3,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        marginRight: 6,
    },
    activeFilterChipText: {
        color: '#fff',
    },
    filterChipCount: {
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
    },
    activeFilterChipCount: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    filterCountText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#667eea',
    },
    activeFilterCountText: {
        color: '#fff',
    },
    // Заказы
    modernOrderCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 16,
        marginVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    clickableCardContent: {
        // Прозрачный стиль - не добавляет визуальных изменений
    },
    cancellingCard: {
        opacity: 0.6,
    },
    cancellingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    cancellingContent: {
        alignItems: 'center',
        gap: 16,
    },
    cancellingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#667eea',
        textAlign: 'center',
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    orderNumberWithCopy: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    orderNumber: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    orderDate: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
        marginBottom: 12,
    },
    copyButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(102, 126, 234, 0.2)',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    // Прогресс
    progressContainer: {
        marginBottom: 16,
        gap: 6,
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 11,
        color: '#667eea',
        fontWeight: '600',
        textAlign: 'right',
    },
    // Контент карточки
    orderContent: {
        flexDirection: 'row',
        gap: 16,
    },
    productImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    placeholderContainer: {
        backgroundColor: '#f8f9fa',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    orderDetails: {
        flex: 1,
    },
    orderItemsInfo: {
        marginBottom: 12,
    },
    itemsCountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    itemsCount: {
        fontSize: 15,
        color: '#1a1a1a',
        fontWeight: '600',
        lineHeight: 20,
        flex: 1,
    },
    deliveryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    deliveryDate: {
        fontSize: 12,
        color: '#28a745',
        fontWeight: '600',
    },
    // Сумма
    amountContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(102, 126, 234, 0.05)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 12,
    },
    amountInfo: {
        flex: 1,
    },
    amountLabel: {
        fontSize: 12,
        color: '#667eea',
        fontWeight: '600',
        marginBottom: 2,
    },
    amount: {
        fontSize: 18,
        fontWeight: '800',
        color: '#667eea',
    },
    amountIcon: {
        width: 28,
        height: 28,
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Адрес
    addressContainer: {
        marginBottom: 8,
    },
    addressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    addressLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    address: {
        fontSize: 13,
        color: '#4a5568',
        lineHeight: 18,
        paddingLeft: 20,
    },
    // Действия
    actionsContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        zIndex: 10,
        gap: 8,
    },
    choiceAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(102, 126, 234, 0.3)',
        gap: 6,
        minHeight: 40,
        zIndex: 10,
    },
    choiceActionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#667eea',
    },
    cancelAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(244, 67, 54, 0.2)',
        gap: 6,
        minHeight: 40,
        zIndex: 10,
    },
    cancelActionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#EF5350',
    },
    // Скелетон загрузки
    skeletonContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    // Пустые состояния
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyStateIconContainer: {
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        padding: 24,
        borderRadius: 50,
        marginBottom: 24,
    },
    emptyStateTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyStateSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        maxWidth: 300,
    },
    emptyButtonsContainer: {
        gap: 12,
        alignItems: 'center',
    },
    // Кнопки
    modernButton: {
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
    modernButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#667eea',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#667eea',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    secondaryButtonText: {
        color: '#667eea',
        fontSize: 14,
        fontWeight: '600',
    },
    // Ошибки доступа
    accessDeniedContainer: {
        flex: 1,
        margin: 16,
    },
    accessDeniedGradient: {
        flex: 1,
        backgroundColor: '#ff7675',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#ff7675',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    accessDeniedTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginTop: 20,
        marginBottom: 12,
        textAlign: 'center',
    },
    accessDeniedSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        maxWidth: 280,
    },
    loginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    loginButtonText: {
        color: '#ff7675',
        fontSize: 16,
        fontWeight: '600',
    },
    // Ошибки
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    errorIconContainer: {
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        padding: 24,
        borderRadius: 50,
        marginBottom: 24,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 12,
        textAlign: 'center',
    },
    errorSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        maxWidth: 300,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f44336',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#f44336',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Skeleton styles
    skeletonListContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
    },
    skeletonCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
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
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    // Стили для разделенных заказов
    splitOrderIndicator: {
        marginBottom: 8,
    },
});