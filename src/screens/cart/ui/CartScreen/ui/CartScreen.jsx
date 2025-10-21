import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Text,
    TouchableOpacity,
    View,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Alert,
    SafeAreaView,
    StatusBar,
    Dimensions,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import {
    Color,
    FontFamily
} from '@app/styles/GlobalStyles';

import {
    CartSummary,
    EmptyCartView,
    CartItem,
    CartHeader,
    CartNotifications,
    ValidationModal,
    ClientTypeModal,
    GuestCheckoutModal,
    GuestCartNotification
} from "@features/cart";



import {
    useCartAutoLoad,
    useCart,
    useCartNotifications,
    useCartValidation,
    useBulkCartOperations,
    useClientType,
    useCartAvailability,
    CLIENT_TYPES,
    fetchCart,
    clearCartCache,
} from "@entities/cart";

const { width: screenWidth } = Dimensions.get('window');

const normalize = (size) => {
    const scale = screenWidth / 440;
    return Math.round(size * scale);
};

// Константы для кэширования
const CART_CACHE_KEY = 'cart_cache';
const CART_CACHE_DURATION = 2 * 60 * 1000; // 2 минуты



export const CartScreen = ({ navigation }) => {
    // ===== ОСНОВНЫЕ ХУКИ =====
    const dispatch = useDispatch();
    const route = useRoute();
    const { isCartAvailable, isAuthenticated, isGuest } = useCartAvailability();
    
    // Получаем роль пользователя для проверки доступа к заказам
    const userRole = useSelector(state => state.auth?.user?.role);
    
    const {
        items,
        stats,
        loading,
        error,
        isEmpty,
        hasProblematicItems,
        clearError,
        totalSavings,
        clientType
    } = useCart();

    // Получаем totalAmount из stats
    const totalAmount = stats?.totalAmount || 0;

    const {
        notifications,
        addSuccessNotification,
        addErrorNotification,
        removeNotification
    } = useCartNotifications();

    const {
        validateCartDetailed,
        validating
    } = useCartValidation();

    const {
        removeMultipleItems,
        selectUnavailableItems
    } = useBulkCartOperations();

    const {
        isWholesale,
        setClientType: changeClientType
    } = useClientType();

    // ===== ЛОКАЛЬНОЕ СОСТОЯНИЕ =====
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [selectAllMode, setSelectAllMode] = useState(false);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [validationResults, setValidationResults] = useState(null);
    const [showClientTypeModal, setShowClientTypeModal] = useState(false);
    const [showGuestCheckoutModal, setShowGuestCheckoutModal] = useState(false);
    const [showGuestNotification, setShowGuestNotification] = useState(true);
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // ===== REFS =====
    const lastFetchTimeRef = useRef(0);
    const isInitializedRef = useRef(false);
    const isMountedRef = useRef(true);

    // ===== ФУНКЦИИ КЭШИРОВАНИЯ =====
    
    // Проверка необходимости обновления кэша
    const shouldRefreshCache = useCallback(() => {
        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchTimeRef.current;
        return timeSinceLastFetch > CART_CACHE_DURATION;
    }, []);

    // Сохранение кэша корзины
    const saveCartCache = useCallback(async (cartData) => {
        try {
            const cacheData = {
                items: cartData.items || [],
                stats: cartData.stats || {},
                timestamp: Date.now(),
                isEmpty: cartData.isEmpty || false
            };
            await AsyncStorage.setItem(CART_CACHE_KEY, JSON.stringify(cacheData));
            console.log('🛒 CartScreen: Кэш корзины сохранен');
        } catch (error) {
            console.warn('🛒 CartScreen: Ошибка сохранения кэша:', error);
        }
    }, []);

    // Загрузка кэша корзины
    const loadCartCache = useCallback(async () => {
        try {
            const cachedData = await AsyncStorage.getItem(CART_CACHE_KEY);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                const isExpired = Date.now() - parsed.timestamp > CART_CACHE_DURATION;
                
                if (!isExpired && parsed.items?.length > 0) {
                    console.log('🛒 CartScreen: Используем кэшированные данные корзины');
                    return parsed;
                }
            }
        } catch (error) {
            console.warn('🛒 CartScreen: Ошибка загрузки кэша:', error);
        }
        return null;
    }, []);

    // ===== ФУНКЦИИ ЗАГРУЗКИ =====
    
    // Загрузка корзины с кэшированием
    const loadCartData = useCallback(async (forceRefresh = false) => {
        // Если данные уже есть и кэш свежий, не загружаем
        if (!forceRefresh && items?.length > 0 && !shouldRefreshCache()) {
            console.log('🛒 CartScreen: Используем существующие данные корзины');
            return;
        }

        const isRefresh = forceRefresh || isRefreshing;
        
        if (isRefresh) {
            setIsRefreshing(true);
        } else if (!isInitializedRef.current) {
            setIsInitialLoading(true);
        }

        try {
            console.log('🛒 CartScreen: Загрузка корзины с сервера...');
            const result = await dispatch(fetchCart(forceRefresh)).unwrap();
            
            lastFetchTimeRef.current = Date.now();
            isInitializedRef.current = true;
            
            // Сохраняем в кэш
            await saveCartCache(result);
            
            console.log('🛒 CartScreen: Корзина успешно загружена');
        } catch (error) {
            console.error('🛒 CartScreen: Ошибка загрузки корзины:', error);
            
            // Пытаемся загрузить из кэша при ошибке
            const cachedData = await loadCartCache();
            if (cachedData) {
                console.log('🛒 CartScreen: Используем кэшированные данные при ошибке');
            }
        } finally {
            if (isMountedRef.current) {
                setIsInitialLoading(false);
                setIsRefreshing(false);
            }
        }
    }, [dispatch, items?.length, shouldRefreshCache, isRefreshing, saveCartCache, loadCartCache]);

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    
    // Логируем начальное состояние
    console.log(`🛒 CartScreen: Initial render - items: ${items?.length || 0}, totalAmount: ${totalAmount}, loading: ${loading}`);

    // ===== ЭФФЕКТЫ =====
    
    // Инициализация при монтировании
    useEffect(() => {
        isMountedRef.current = true;
        
        const initialize = async () => {
            console.log('🛒 CartScreen: Инициализация компонента');
            
            if (isCartAvailable) {
                // Сначала пытаемся загрузить из кэша
                const cachedData = await loadCartCache();
                if (cachedData) {
                    console.log('🛒 CartScreen: Загружены кэшированные данные');
                }
                
                // Затем загружаем свежие данные
                await loadCartData(false);
            }
        };
        
        initialize();
        
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Ref для отслеживания обработанных timestamp, чтобы избежать повторных обновлений
    const lastProcessedTimestampRef = useRef(null);

    // Загрузка корзины при фокусе на экране
    useFocusEffect(
        useCallback(() => {
            console.log('🛒 CartScreen: Экран получил фокус');
            
            // Если есть параметр forceRefresh, обрабатываем его СРАЗУ в useFocusEffect
            const timestamp = route.params?.timestamp;
            const shouldForceRefresh = route.params?.forceRefresh;
            
            // ОТЛАДКА: логируем все условия
            console.log('🔍 CartScreen: Проверка forceRefresh параметров', {
                shouldForceRefresh,
                isCartAvailable,
                timestamp,
                lastProcessedTimestamp: lastProcessedTimestampRef.current,
                timestampsDifferent: timestamp !== lastProcessedTimestampRef.current,
                allConditionsMet: shouldForceRefresh && isCartAvailable && timestamp && timestamp !== lastProcessedTimestampRef.current
            });
            
            if (shouldForceRefresh && isCartAvailable && timestamp && timestamp !== lastProcessedTimestampRef.current) {
                console.log('🔄 CartScreen: Обнаружен forceRefresh в useFocusEffect, принудительно обновляем корзину', { timestamp });
                
                // Сохраняем timestamp, чтобы не обрабатывать его повторно
                lastProcessedTimestampRef.current = timestamp;
                
                // Очищаем параметры СРАЗУ
                navigation.setParams({ forceRefresh: undefined, timestamp: undefined });
                
                // Очищаем кэш и принудительно перезагружаем корзину
                console.log('📱 CartScreen: Clearing cache and force reloading in useFocusEffect...');
                clearCartCache().then(() => {
                    console.log('📱 CartScreen: Cache cleared, dispatching fetchCart from useFocusEffect');
                    dispatch(fetchCart(true)).unwrap().then(() => {
                        console.log('✅ CartScreen: Cart data force reloaded in useFocusEffect');
                    }).catch(err => {
                        console.error('❌ CartScreen: Error reloading cart in useFocusEffect:', err);
                    });
                });
                return;
            }
            
            if (isCartAvailable) {
                console.log(`🛒 CartScreen: Текущее состояние корзины - items: ${items?.length || 0}, totalAmount: ${totalAmount || 0}`);
                
                // Проверяем, нужно ли обновить кэш
                if (shouldRefreshCache()) {
                    console.log('🛒 CartScreen: Кэш устарел, обновляем данные');
                    loadCartData(true);
                } else {
                    console.log('🛒 CartScreen: Кэш свежий, используем существующие данные');
                }
            } else {
                console.log('🛒 CartScreen: Корзина недоступна для текущей роли');
            }
        }, [isCartAvailable, items?.length, totalAmount, shouldRefreshCache, loadCartData, route.params?.forceRefresh, route.params?.timestamp, dispatch, navigation, clearCartCache])
    );

    // Логирование изменений состояния корзины (только критичные изменения)
    useEffect(() => {
        if (loading) return; // Не логируем промежуточные состояния загрузки
        console.log(`🛒 CartScreen: Состояние корзины обновлено - items: ${items?.length || 0}, totalAmount: ${totalAmount || 0}`);
    }, [items?.length, totalAmount, loading]);

    // Автоматический выбор всех товаров при загрузке и очистка при пустой корзине
    useEffect(() => {
        if (!items || items.length === 0) {
            // Очищаем выбранные товары если корзина пуста
            if (selectedItems.size > 0) {
                console.log('🛒 CartScreen: Корзина пуста, очищаем selectedItems');
                setSelectedItems(new Set());
                setSelectAllMode(false);
            }
            return;
        }

        // Автоматически выбираем все товары если ничего не выбрано
        if (selectedItems.size === 0) {
            const allItemIds = new Set(items.map(item => item.id));
            setSelectedItems(allItemIds);
            setSelectAllMode(true);
            console.log(`🛒 CartScreen: Auto-selected all items (${allItemIds.size} items)`);
        } else {
            // Удаляем из выбранных товары, которых больше нет в корзине
            const currentItemIds = new Set(items.map(item => item.id));
            const updatedSelectedItems = new Set(
                Array.from(selectedItems).filter(id => currentItemIds.has(id))
            );
            
            if (updatedSelectedItems.size !== selectedItems.size) {
                console.log(`🛒 CartScreen: Удалены несуществующие товары из выборки (${selectedItems.size} -> ${updatedSelectedItems.size})`);
                setSelectedItems(updatedSelectedItems);
                setSelectAllMode(updatedSelectedItems.size === items.length);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items?.length, items]);

    // Обработка ошибок (исключаем ошибки авторизации, так как у нас есть специальный UI для этого)
    useEffect(() => {
        if (error) {
            const isAuthError = error.includes('не авторизован') || 
                               error.includes('Не авторизован') || 
                               error.includes('недоступна для данной роли') ||
                               error.includes('unauthorized');
            
            if (!isAuthError) {
                Alert.alert('Ошибка', error, [
                    { text: 'OK', onPress: clearError }
                ]);
            } else {
                // Для ошибок авторизации просто очищаем ошибку без показа алерта
                clearError();
            }
        }
    }, [error, clearError]);

    // ===== ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ =====

    // Статистика для выбранных товаров с мгновенным обновлением
    const selectedStats = useMemo(() => {
        if (!items || items.length === 0 || selectedItems.size === 0) {
            return {
                totalBoxes: 0,
                totalItems: 0,
                totalAmount: 0,
                totalPrice: 0,
                finalPrice: 0,
                totalSavings: 0
            };
        }

        const selectedCartItems = items.filter(item => selectedItems.has(item.id));

        let totalBoxes = 0;
        let totalItems = 0;
        let totalPrice = 0;
        let totalSavings = 0;

        selectedCartItems.forEach(item => {
            const quantity = item.quantity || 1; // количество коробок
            const product = item.product;
            const itemsPerBox = product?.itemsPerBox || 1;
            const boxPrice = product?.boxPrice || (product?.price * itemsPerBox);

            let finalBoxPrice = boxPrice;
            let itemSavings = 0;

            // Проверяем оптовую цену для коробок
            if (clientType === CLIENT_TYPES.WHOLESALE &&
                product?.wholesalePrice &&
                quantity >= Math.ceil((product.wholesaleMinQty || 50) / itemsPerBox)) {
                const wholesaleBoxPrice = product.wholesalePrice * itemsPerBox;
                finalBoxPrice = wholesaleBoxPrice;
                itemSavings = quantity * (boxPrice - wholesaleBoxPrice);
            }

            totalBoxes += quantity;
            totalItems += quantity * itemsPerBox;
            totalPrice += finalBoxPrice * quantity;
            totalSavings += itemSavings;
        });

        return {
            totalBoxes,
            totalItems,
            totalAmount: totalPrice,
            totalPrice,
            finalPrice: totalPrice,
            totalSavings
        };
    }, [items, selectedItems, clientType]);

    // ===== ОБРАБОТЧИКИ СОБЫТИЙ =====

    // Принудительное обновление корзины
    const handleRefresh = useCallback(() => {
        console.log('🛒 CartScreen: Принудительное обновление корзины');
        loadCartData(true);
    }, [loadCartData]);

    const handleProductPress = (product) => {
        // Поддержка как productId, так и объекта продукта
        const productId = typeof product === 'object' && product?.id ? product.id : product;
        navigation.navigate('ProductDetail', {
            productId,
            fromScreen: 'Cart'
        });
    };

    const toggleItemSelection = (itemId) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }

            setSelectAllMode(newSet.size === items.length);
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectAllMode) {
            setSelectedItems(new Set());
            setSelectAllMode(false);
        } else {
            const allItemIds = new Set(items.map(item => item.id));
            setSelectedItems(allItemIds);
            setSelectAllMode(true);
        }
    };

    const handleRemoveUnavailable = async () => {
        const unavailableIds = selectUnavailableItems(items);
        if (unavailableIds.length > 0) {
            try {
                const result = await removeMultipleItems(unavailableIds);
                addSuccessNotification(`Удалено ${result.removedCount || unavailableIds.length} недоступных товаров`);
                // Обновляем выбранные элементы
                setSelectedItems(prev => {
                    const newSet = new Set(prev);
                    unavailableIds.forEach(id => newSet.delete(id));
                    return newSet;
                });
            } catch (error) {
                addErrorNotification('Не удалось удалить недоступные товары');
            }
        }
    };

    const handleDetailedValidation = async () => {
        try {
            const validationData = await validateCartDetailed().unwrap();
            setValidationResults(validationData);
            setShowValidationModal(true);
        } catch (error) {
            console.error('Detailed validation error:', error);
            Alert.alert('Ошибка', 'Не удалось выполнить валидацию корзины');
        }
    };

    const handleChangeClientType = async (newType) => {
        try {
            const result = await changeClientType(newType);
            if (result.success) {
                addSuccessNotification(
                    `Тип клиента изменен на ${newType === CLIENT_TYPES.WHOLESALE ? 'Оптовый' : 'Розничный'}`
                );
                setShowClientTypeModal(false);
            }
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось изменить тип клиента');
        }
    };

    const handleCheckout = async () => {
        // Проверяем авторизацию пользователя
        if (!isAuthenticated) {
            // Показываем модальное окно для неавторизованных пользователей
            setShowGuestCheckoutModal(true);
            return;
        }

        // Валидация корзины
        try {
            const validationData = await validateCartDetailed().unwrap();
            
            if (!validationData?.canProceedToCheckout) {
                setValidationResults(validationData);
                setShowValidationModal(true);
                return;
            }

            // Переходим сразу к оформлению заказа
            const selectedItemsList = items.filter(item => selectedItems.has(item.id));

            navigation.navigate('Checkout', {
                items: selectedItemsList,
                stats: selectedStats,
                clientType
            });

        } catch (error) {
            console.error('Checkout validation error:', error);
            addErrorNotification('Не удалось проверить корзину');
        }
    };

    // ===== ОБРАБОТЧИКИ ДЛЯ ГОСТЕВЫХ ПОЛЬЗОВАТЕЛЕЙ =====

    const handleGuestLogin = () => {
        setShowGuestCheckoutModal(false);
        navigation.navigate('Auth', { screen: 'LoginScreen' });
    };

    const handleGuestRegister = () => {
        setShowGuestCheckoutModal(false);
        navigation.navigate('Auth', { screen: 'RegisterScreen' });
    };

    const handleGuestCheckout = async () => {
        setShowGuestCheckoutModal(false);
        
        try {
            const validationData = await validateCartDetailed().unwrap();
            
            if (!validationData?.canProceedToCheckout) {
                setValidationResults(validationData);
                setShowValidationModal(true);
                return;
            }

            const selectedItemsList = items.filter(item => selectedItems.has(item.id));

            navigation.navigate('GuestCheckout', {
                items: selectedItemsList,
                stats: selectedStats,
                clientType
            });
        } catch (error) {
            console.error('Guest checkout validation error:', error);
            addErrorNotification('Не удалось проверить корзину');
        }
    };

    const handleNotificationLogin = () => {
        setShowGuestNotification(false);
        navigation.navigate('Auth', { screen: 'LoginScreen' });
    };

    const handleNotificationRegister = () => {
        setShowGuestNotification(false);
        navigation.navigate('Auth', { screen: 'RegisterScreen' });
    };

    const handleDismissNotification = () => {
        setShowGuestNotification(false);
    };



    // ===== РЕНДЕР ФУНКЦИИ =====

    const renderCartItem = useCallback(({ item, index }) => (
        <CartItem
            item={item}
            index={index}
            isSelected={selectedItems.has(item.id)}
            onToggleSelection={() => toggleItemSelection(item.id)}
            onProductPress={() => handleProductPress(
                item.productId || item.product?.id
            )}
            clientType={clientType}
            showSavings={isWholesale}
        />
    ), [selectedItems, toggleItemSelection, handleProductPress, clientType, isWholesale]);

    const keyExtractor = useCallback((item) => `cart-item-${item.id}`, []);

    // ===== УСЛОВНЫЙ РЕНДЕР =====

    // Состояние загрузки
    if (isInitialLoading && (!items || items.length === 0)) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar
                    barStyle="dark-content"
                    backgroundColor={Color.background || '#FFFFFF'}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3339B0" />
                    <Text style={styles.loadingText}>Загрузка корзины...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Пустая корзина
    if (isEmpty) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar
                    barStyle="dark-content"
                    backgroundColor={Color.background || '#FFFFFF'}
                />
                <EmptyCartView key="empty-cart" navigation={navigation} />
            </SafeAreaView>
        );
    }

    // ===== ОСНОВНОЙ РЕНДЕР =====

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor={Color.background || '#FFFFFF'}
            />
            
            <KeyboardAvoidingView 
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {/* Заголовок корзины */}
                <CartHeader itemsCount={items.length} />

                {/* Уведомление для гостей */}
                {isGuest && showGuestNotification && items.length > 0 && (
                    <GuestCartNotification
                        onLoginPress={handleNotificationLogin}
                        onRegisterPress={handleNotificationRegister}
                        onDismiss={handleDismissNotification}
                        visible={showGuestNotification}
                    />
                )}

                {/* Уведомления */}
                <CartNotifications
                    notifications={notifications}
                    onDismiss={removeNotification}
                />

                {/* Кнопка "Мои заказы" для авторизованных клиентов */}
                {isAuthenticated && userRole === 'CLIENT' && (
                    <View style={styles.myOrdersContainer}>
                        <TouchableOpacity
                            style={styles.myOrdersButton}
                            onPress={() => {
                                // Навигируем к MyOrders в том же стеке
                                navigation.navigate('MyOrders', { 
                                    fromScreen: 'Cart' 
                                });
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.myOrdersText}>Мои заказы</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Блок "Выбрать все" */}
                <View style={styles.selectAllContainer}>
                    <TouchableOpacity
                        style={styles.selectAllButton}
                        onPress={toggleSelectAll}
                        activeOpacity={0.7}
                    >
                        <View style={[
                            styles.selectAllCheckbox,
                            selectAllMode && styles.selectAllCheckboxActive
                        ]}>
                            {selectAllMode && (
                                <Text style={styles.selectAllCheckmark}>✓</Text>
                            )}
                        </View>
                        <Text style={styles.selectAllText}>
                            Выбрать все ({items.length})
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.selectedCountText}>
                        Выбрано: {selectedItems.size} из {items.length}
                    </Text>
                </View>

                {/* Список товаров */}
                <FlatList
                    data={items}
                    renderItem={renderCartItem}
                    keyExtractor={keyExtractor}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={5}
                    windowSize={5}
                    initialNumToRender={5}
                    updateCellsBatchingPeriod={100}
                    getItemLayout={null}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                />

                {/* Блок "К оплате" */}
                <View style={styles.cartSummaryContainer}>
                    <CartSummary
                        stats={selectedStats}
                        selectedCount={selectedItems.size}
                        totalCount={items.length}
                        onCheckout={handleCheckout}
                        disabled={hasProblematicItems || selectedItems.size === 0}
                        loading={isInitialLoading || isRefreshing || validating}
                        clientType={clientType}
                        showSavings={isWholesale}
                    />
                </View>
            </KeyboardAvoidingView>

            {/* Модал валидации */}
            <Modal
                visible={showValidationModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowValidationModal(false)}
            >
                <ValidationModal
                    results={validationResults}
                    onClose={() => setShowValidationModal(false)}
                    onProceed={handleCheckout}
                />
            </Modal>

            {/* Модал типа клиента */}
            <Modal
                visible={showClientTypeModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowClientTypeModal(false)}
            >
                <ClientTypeModal
                    currentType={clientType}
                    onSelect={handleChangeClientType}
                    onClose={() => setShowClientTypeModal(false)}
                />
            </Modal>

            {/* Модал оформления заказа для гостей */}
            <GuestCheckoutModal
                visible={showGuestCheckoutModal}
                onClose={() => setShowGuestCheckoutModal(false)}
                onLogin={handleGuestLogin}
                onRegister={handleGuestRegister}
                onGuestCheckout={handleGuestCheckout}
                cartStats={selectedStats}
                navigation={navigation}
            />

        </SafeAreaView>
    );
};

// ===== СТИЛИ =====
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    keyboardAvoidingView: {
        flex: 1,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },

    loadingText: {
        marginTop: normalize(16),
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: 'rgba(60, 60, 67, 0.60)',
        fontWeight: '500',
    },

    selectAllContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(15),
        backgroundColor: '#F8F9FF',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(193, 199, 222, 0.20)',
    },

    selectAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },

    selectAllCheckbox: {
        width: normalize(22),
        height: normalize(22),
        borderRadius: normalize(6),
        borderWidth: 2,
        borderColor: '#3339B0',
        backgroundColor: '#FFFFFF',
        marginRight: normalize(12),
        justifyContent: 'center',
        alignItems: 'center',
    },

    selectAllCheckboxActive: {
        backgroundColor: '#3339B0',
        borderColor: '#3339B0',
    },

    selectAllCheckmark: {
        color: '#FFFFFF',
        fontSize: normalize(14),
        fontWeight: 'bold',
    },

    selectAllText: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '500',
        color: '#000000',
    },

    selectedCountText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '400',
        color: 'rgba(60, 60, 67, 0.60)',
    },

    list: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    listContent: {
        paddingTop: normalize(8),
        paddingBottom: normalize(120), // Увеличиваем отступ снизу
    },
    
    myOrdersContainer: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(8),
        backgroundColor: '#FFFFFF',
    },

    myOrdersButton: {
        backgroundColor: '#F8F9FF',
        borderRadius: normalize(12),
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(16),
        borderWidth: 1,
        borderColor: '#3339B0',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#3339B0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },

    myOrdersText: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#3339B0',
    },

    cartSummaryContainer: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: 'rgba(193, 199, 222, 0.20)',
        paddingBottom: normalize(40), 
    },
});