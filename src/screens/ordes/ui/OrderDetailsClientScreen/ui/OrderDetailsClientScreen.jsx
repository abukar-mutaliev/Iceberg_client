import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Animated, Alert, StatusBar, TouchableOpacity, Text } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { OrderApi } from '@entities/order';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { clearLocalOrderAction } from '@entities/order/model/slice';
import { ToastSimple } from '@shared/ui/Toast/ui/ToastSimple';

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

    // Обработка отмены заказа
    const handleCancelOrder = useCallback(async () => {
        if (!order || !canCancelOrder(order.status, user?.role || 'CLIENT')) {
            Alert.alert('Ошибка', 'Этот заказ нельзя отменить');
            return;
        }

        Alert.alert(
            'Отмена заказа',
            `Вы уверены, что хотите отменить заказ ${order.orderNumber}?`,
            [
                { text: 'Нет', style: 'cancel' },
                {
                    text: 'Да, отменить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setCancelling(true);
                            await OrderApi.cancelMyOrder(orderId, 'Отменен клиентом');

                            setToastConfig({
                                message: 'Заказ успешно отменен',
                                type: 'success',
                                duration: 3000
                            });

                            // Обновляем данные заказа
                            loadOrderDetails();

                            // Очищаем локальное состояние
                            dispatch(clearLocalOrderAction({ orderId }));

                        } catch (err) {
                            Alert.alert('Ошибка', err.message || 'Не удалось отменить заказ');
                        } finally {
                            setCancelling(false);
                        }
                    }
                }
            ]
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
                            <OrderItems order={order} />
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