import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
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



export const CartScreen = ({ navigation }) => {
    // ===== ОСНОВНЫЕ ХУКИ =====
    const dispatch = useDispatch();
    const { isCartAvailable, isAuthenticated, isGuest } = useCartAvailability();
    
    // Получаем роль пользователя для проверки доступа к заказам
    const userRole = useSelector(state => state.auth?.user?.role);
    
    const {
        items,
        loading,
        error,
        isEmpty,
        hasProblematicItems,
        clearError,
        totalSavings,
        clientType
    } = useCart();

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

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    useCartAutoLoad({
        loadOnMount: true,
        loadOnAuthChange: true,
        autoMergeGuestCart: true,
    });

    // Загрузка корзины при фокусе на экране (только если корзина доступна)
    useFocusEffect(
        useCallback(() => {
            if (isCartAvailable) {
                console.log('🛒 CartScreen: Screen focused, loading cart');
                // Принудительно очищаем кэш и загружаем данные
                dispatch(clearCartCache());
                dispatch(fetchCart(true));
            } else {
                console.log('🛒 CartScreen: Cart not available for current role, skipping load');
            }
        }, [dispatch, isCartAvailable])
    );

    // ===== ЭФФЕКТЫ =====

    // Автоматический выбор всех товаров при загрузке
    useEffect(() => {
        if (items && items.length > 0 && selectedItems.size === 0) {
            const allItemIds = new Set(items.map(item => item.id));
            setSelectedItems(allItemIds);
            setSelectAllMode(true);
        }
    }, [items]);

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

    // Статистика для выбранных товаров
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

    const handleProductPress = (productId) => {
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
    if (loading && (!items || items.length === 0)) {
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
                <EmptyCartView navigation={navigation} />
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
                />

                {/* Блок "К оплате" */}
                <CartSummary
                    stats={selectedStats}
                    selectedCount={selectedItems.size}
                    totalCount={items.length}
                    onCheckout={handleCheckout}
                    disabled={hasProblematicItems || selectedItems.size === 0}
                    loading={loading || validating}
                    clientType={clientType}
                    showSavings={isWholesale}
                />
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
        paddingBottom: normalize(100),
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
});