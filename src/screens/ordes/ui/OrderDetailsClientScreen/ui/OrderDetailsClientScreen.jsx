import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, ScrollView, RefreshControl, Animated, StatusBar, TouchableOpacity, Text } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { OrderApi } from '@entities/order';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { clearLocalOrderAction } from '@entities/order/model/slice';
import { ToastSimple } from '@shared/ui/Toast/ui/ToastSimple';
import { GlobalAlert } from '@shared/ui/CustomAlert';

// Импорты общих компонентов и утилит
import { useOrderDetails } from '@shared/hooks/useOrderDetails';
import { canCancelOrder } from '@shared/lib/orderUtils';
import { createOrderDetailsStyles } from '@shared/ui/OrderDetailsStyles';
import { OrderHeader } from '@shared/ui/OrderHeader/ui/OrderHeader';
import { DeliveryInfo } from '@shared/ui/DeliveryInfo/ui/DeliveryInfo';
import { OrderItems } from '@shared/ui/OrderItems/ui/OrderItems';
import { OrderLoadingState, OrderErrorState } from '@shared/ui/OrderLoadingState/ui/OrderLoadingState';
import { WaitingStockIndicator, SplitOrderInfo, useSplitOrders } from '@entities/order';

const styles = createOrderDetailsStyles();

export const OrderDetailsClientScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { orderId, showSplitInfo, originalOrderNumber } = route.params || {};
    
    // Отладочная информация
    console.log('OrderDetailsClientScreen - orderId:', orderId);
    console.log('OrderDetailsClientScreen - showSplitInfo:', showSplitInfo);
    console.log('OrderDetailsClientScreen - originalOrderNumber:', originalOrderNumber);

    // Хуки
    const { currentUser: user } = useAuth();
    const dispatch = useDispatch();
    
    // Хук для разделенных заказов
    const { isSplitOrder, getOriginalOrderNumber } = useSplitOrders();

    // Состояние компонента
    const [cancelling, setCancelling] = useState(false);
    const [toastConfig, setToastConfig] = useState(null);

    // Анимации
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(30)).current;

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
    
    // Отладочная информация о заказе
    console.log('OrderDetailsClientScreen - order:', order);
    console.log('OrderDetailsClientScreen - loading:', loading);
    console.log('OrderDetailsClientScreen - error:', error);

    // Ref для отслеживания предыдущего orderId
    const previousOrderIdRef = useRef(null);

    // Очистка состояния при смене orderId
    useEffect(() => {
        // Если orderId изменился, очищаем старое состояние заказа
        if (previousOrderIdRef.current && previousOrderIdRef.current !== orderId) {
            console.log('OrderDetailsClientScreen - orderId changed, clearing state');
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
                console.log('OrderDetailsClientScreen - loading order:', orderId, {
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

    // Обработка отмены заказа
    const handleCancelOrder = useCallback(async () => {
        if (!order || !canCancelOrder(order.status, user?.role || 'CLIENT')) {
            GlobalAlert.showError('Ошибка', 'Этот заказ нельзя отменить');
            return;
        }

        GlobalAlert.showConfirm(
            'Отмена заказа',
            `Вы уверены, что хотите отменить заказ ${order.orderNumber}?`,
            async () => {
                try {
                    setCancelling(true);
                    
                    // Отменяем заказ
                    await OrderApi.cancelMyOrder(orderId, 'Отменен клиентом');

                    // Обновляем данные заказа для получения актуального статуса платежа
                    await loadOrderDetails();

                    // Получаем обновленный заказ
                    const updatedOrderResponse = await OrderApi.getOrderById(orderId);
                    const updatedOrder = updatedOrderResponse?.data;

                    setToastConfig({
                        message: 'Заказ успешно отменен',
                        type: 'success',
                        duration: 3000
                    });

                    // Проверяем статус платежа
                    if (updatedOrder?.payment?.status === 'REFUNDED') {
                        // Деньги возвращены - показываем алерт
                        setTimeout(() => {
                            GlobalAlert.showSuccess(
                                'Деньги возвращены',
                                `Средства в размере ${order.totalAmount}₽ возвращены на ваш счет. Они поступят в течение 3-5 рабочих дней.`
                            );
                        }, 500);
                    } else if (updatedOrder?.payment?.status === 'COMPLETED') {
                        // Платеж был завершен, но возврат еще не произошел
                        setTimeout(() => {
                            GlobalAlert.showInfo(
                                'Возврат средств',
                                `Возврат средств в размере ${order.totalAmount}₽ обрабатывается. Деньги поступят в течение 3-5 рабочих дней.`
                            );
                        }, 500);
                    }

                    // Очищаем локальное состояние
                    dispatch(clearLocalOrderAction({ orderId }));

                } catch (err) {
                    GlobalAlert.showError('Ошибка', err.message || 'Не удалось отменить заказ');
                } finally {
                    setCancelling(false);
                }
            }
        );
    }, [order, orderId, user?.role, loadOrderDetails, dispatch]);

    // Обработчик для нажатия на разделенные заказы
    const handleSplitOrderPress = useCallback((splitOrder) => {
        navigation.navigate('OrderDetails', { 
            orderId: splitOrder.id,
            showSplitInfo: true,
            originalOrderNumber: originalOrderNumber || getOriginalOrderNumber(order)
        });
    }, [navigation, originalOrderNumber, getOriginalOrderNumber, order]);

    // Обработчик для нажатия на товар
    const handleProductPress = useCallback((productId) => {
        if (!productId) return;
        
        navigation.navigate('ProductDetail', {
            productId,
            fromScreen: 'OrderDetails'
        });
    }, [navigation]);

    // Рендер кнопки отмены заказа
    const renderCancelButton = () => {
        if (!order) return null;

        const showCancelButton = canCancelOrder(order.status, user?.role || 'CLIENT');

        if (!showCancelButton) return null;

        return (
            <View style={styles.actionsContainer}>
                <Animated.View
                    style={[
                        styles.cancelButton,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.buttonContent}
                        onPress={handleCancelOrder}
                        disabled={cancelling}
                        activeOpacity={0.8}
                    >
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
                    </TouchableOpacity>
                </Animated.View>
            </View>
        );
    };

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
                            <WaitingStockIndicator order={order} />
                            
                            {/* Информация о разделенных заказах */}
                            {(showSplitInfo || isSplitOrder(order)) && (
                                <SplitOrderInfo
                                    originalOrderNumber={originalOrderNumber || getOriginalOrderNumber(order)}
                                    onOrderPress={handleSplitOrderPress}
                                />
                            )}
                            
                            <DeliveryInfo
                                order={order}
                                userRole={user?.role}
                                assignedTo={order.assignedTo}
                            />
                            <OrderItems 
                                order={order}
                                onProductPress={handleProductPress}
                            />
                            {renderCancelButton()}
                        </>
                    )}
                </ScrollView>
            </Animated.View>

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