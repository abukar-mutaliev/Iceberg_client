// ==========================================
// PaymentScreen/hooks/usePaymentLifecycle.js
// Основная бизнес-логика платежа
// ==========================================

import { useCallback } from 'react';
import { PaymentApi } from '@entities/payment';
import { CartService, clearCart } from '@entities/cart';
import { OrderApi } from '@entities/order';
import { PaymentLogger } from '../utils/PaymentLogger';

export const usePaymentLifecycle = ({
    params,
    state,
    actions,
    navigation,
    dispatch,
    showError,
    showInfo,
    showConfirm
}) => {
    /**
     * Создание платежа
     */
    const createPayment = useCallback(async () => {
        try {
            actions.setLoading(true);
            actions.setError(null);

            let orderIdToUse = state.createdOrderId;
            let usePreauthorization = state.usePreauthorization !== undefined
                ? state.usePreauthorization
                : true;

            // Создаем заказ если передан checkoutData
            if (state.checkoutData && !orderIdToUse) {
                PaymentLogger.log('Creating order before payment...');
                const checkoutResult = await CartService.checkout(state.checkoutData);

                const order = checkoutResult.data?.order;
                if (!order || !order.id) {
                    throw new Error('Не удалось создать заказ');
                }

                orderIdToUse = order.id;
                actions.setCreatedOrderId(order.id);
                PaymentLogger.success('Order created:', order.id);
            }

            // Для разделенного заказа определяем параметры
            if (state.isSplitOrder) {
                if (state.firstPaymentCompleted && state.currentPaymentStep === 1) {
                    PaymentLogger.warn('First payment already completed, switching to step 2');
                    actions.setCurrentPaymentStep(2);
                    return;
                }

                if (state.currentPaymentStep === 1 && !state.firstPaymentCompleted) {
                    orderIdToUse = params.orderId;
                    usePreauthorization = false;
                    PaymentLogger.log('[Step 1/2] Creating payment for immediate order (regular)');
                } else if (state.currentPaymentStep === 2 || state.firstPaymentCompleted) {
                    orderIdToUse = params.waitingOrderId;
                    usePreauthorization = true;
                    PaymentLogger.log('[Step 2/2] Creating payment for waiting order (preauthorization)');
                }
            }

            // Для обычного заказа
            if (!orderIdToUse && params.orderId) {
                orderIdToUse = params.orderId;
            }

            if (!orderIdToUse) {
                throw new Error('Не указан ID заказа');
            }

            PaymentLogger.log('Creating payment for order:', orderIdToUse, { usePreauthorization });

            const response = await PaymentApi.createPayment(orderIdToUse, {
                returnUrl: 'icebergapp://payment-result',
                preauthorization: usePreauthorization,
                paymentMethodType: 'sbp'
            });

            if (!response?.data?.data?.confirmationUrl) {
                throw new Error('Не получен URL для оплаты');
            }

            const url = response.data.data.confirmationUrl;
            const paymentIdFromResponse = response.data.data.paymentId;

            actions.setPaymentUrl(url);

            if (state.isSplitOrder && state.currentPaymentStep === 2) {
                actions.setSecondPaymentId(paymentIdFromResponse);
                PaymentLogger.log('Payment ID saved (step 2):', paymentIdFromResponse);
            } else {
                actions.setPaymentId(paymentIdFromResponse);
                PaymentLogger.log('Payment ID saved (step 1):', paymentIdFromResponse);
            }

            actions.setLoading(false);
        } catch (err) {
            PaymentLogger.error('Error creating payment:', err);
            actions.setError(err.message || 'Не удалось создать платеж');
            actions.setLoading(false);

            showError(
                'Ошибка',
                'Не удалось создать платеж. Попробуйте позже.',
                [{
                    text: 'К корзине',
                    style: 'primary',
                    onPress: () => navigation.navigate('Cart', {
                        forceRefresh: true,
                        timestamp: Date.now()
                    })
                }]
            );
        }
    }, [params, state, actions, navigation, showError]);

    /**
     * Проверка статуса платежа
     */
    const checkPaymentStatus = useCallback(async () => {
        if (!state.currentPaymentId) {
            PaymentLogger.warn('No payment ID available for status check');
            return false;
        }

        try {
            PaymentLogger.log('Checking payment status for:', state.currentPaymentId);
            const statusResponse = await PaymentApi.checkPaymentStatus(state.currentPaymentId);
            const paymentStatus = statusResponse?.data?.data?.status;

            PaymentLogger.log('Payment status received:', paymentStatus);

            if (['succeeded', 'waiting_for_capture', 'completed'].includes(paymentStatus)) {
                PaymentLogger.success('Payment confirmed as successful');
                await completePayment('completed');
                return true;
            } else if (['canceled', 'failed'].includes(paymentStatus)) {
                PaymentLogger.error('Payment confirmed as failed');
                await completePayment('failed');
                return false;
            } else {
                PaymentLogger.log('Payment status pending:', paymentStatus);
                return false;
            }
        } catch (error) {
            PaymentLogger.error('Error checking payment status:', error);
            return false;
        }
    }, [state.currentPaymentId]);

    /**
     * Завершение платежа
     */
    const completePayment = useCallback(async (status) => {
        PaymentLogger.log('Payment completed with status:', status);

        try {
            if (!state.currentPaymentId) {
                PaymentLogger.warn('Payment ID not found, skipping status check');
                return;
            }

            const statusResponse = await PaymentApi.checkPaymentStatus(state.currentPaymentId);
            const paymentStatus = statusResponse?.data?.data?.status;

            PaymentLogger.log('Payment status from server:', paymentStatus);

            // Успешный платеж
            if (['succeeded', 'waiting_for_capture', 'completed'].includes(paymentStatus)) {
                actions.setPaymentCompleted(true);

                // Разделенный заказ - переход ко второму платежу
                if (state.isSplitOrder && state.currentPaymentStep === 1) {
                    PaymentLogger.success('First payment completed, proceeding to second payment');
                    actions.setFirstPaymentCompleted(true);
                    actions.setCurrentPaymentStep(2);
                    actions.setPaymentUrl(null);
                    actions.setPaymentId(null);
                    actions.setPaymentCompleted(false);
                    actions.setLoading(true);
                    actions.setWebViewLoading(true);

                    showInfo(
                        'Первый платеж завершен',
                        `Оплата доступных товаров прошла успешно!\n\nТеперь перейдем к оплате ожидающих товаров (${state.waitingOrderAmount}₽).`,
                        [{
                            text: 'Продолжить',
                            style: 'primary',
                            onPress: () => PaymentLogger.log('Proceeding to second payment')
                        }]
                    );
                    return;
                }

                // Очищаем корзину
                try {
                    await dispatch(clearCart()).unwrap();
                    PaymentLogger.success('Cart cleared successfully');
                } catch (cartError) {
                    PaymentLogger.warn('Error clearing cart:', cartError);
                }

                // Навигация к экрану успеха
                navigateToSuccess();
            }
            // Неуспешный платеж
            else if (['canceled', 'failed'].includes(paymentStatus)) {
                PaymentLogger.error('Payment failed or canceled');
                showError(
                    'Оплата не завершена',
                    'Платеж был отменен или не прошел.',
                    [{
                        text: 'К корзине',
                        style: 'primary',
                        onPress: () => navigation.navigate('Cart', {
                            forceRefresh: true,
                            timestamp: Date.now()
                        })
                    }]
                );
            }
        } catch (error) {
            PaymentLogger.error('Error in completePayment:', error);
            if (status === 'completed') {
                navigateToSuccess();
            }
        }
    }, [state, actions, navigation, dispatch, showInfo, showError, params]);

    /**
     * Навигация к экрану успеха
     */
    const navigateToSuccess = useCallback(() => {
        try {
            if (state.isSplitOrder) {
                navigation.navigate('OrderSuccess', {
                    splitInfo: {
                        immediateOrder: {
                            id: params.orderId,
                            orderNumber: params.orderNumber,
                            totalAmount: params.totalAmount,
                            status: 'PENDING'
                        },
                        waitingOrder: {
                            id: params.waitingOrderId,
                            orderNumber: params.waitingOrderNumber,
                            totalAmount: state.waitingOrderAmount,
                            status: 'WAITING_STOCK'
                        }
                    },
                    deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
                });
            } else {
                navigation.navigate('OrderSuccess', {
                    orderId: params.orderId,
                    orderNumber: params.orderNumber,
                    totalAmount: params.totalAmount,
                    deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                    itemsCount: params.itemsCount || 0,
                    boxesCount: params.boxesCount || 0
                });
            }
            PaymentLogger.success('Successfully navigated to OrderSuccess screen');
        } catch (navError) {
            PaymentLogger.error('Navigation error:', navError);
            navigation.navigate('Cart', { forceRefresh: true, timestamp: Date.now() });
        }
    }, [state, params, navigation]);

    /**
     * Отмена платежа и неоплаченного заказа
     */
    const cancelPayment = useCallback(async () => {
        if (state.paymentCompleted) {
            navigation.navigate('MyOrders', {
                refresh: true,
                timestamp: Date.now()
            });
            return;
        }

        // Если заказ был создан, но не оплачен - нужно его отменить
        const orderIdToCancel = state.isSplitOrder && state.currentPaymentStep === 2
            ? params.waitingOrderId
            : (state.createdOrderId || params.orderId);

        showConfirm(
            'Отменить заказ?',
            'Заказ не был оплачен. Он будет отменен, и вы вернетесь в корзину.',
            async () => {
                PaymentLogger.log('User cancelled unpaid order', { orderId: orderIdToCancel });

                // Отменяем неоплаченный заказ
                if (orderIdToCancel) {
                    try {
                        await OrderApi.cancelMyOrder(orderIdToCancel, 'Оплата не завершена');
                        PaymentLogger.success('Unpaid order cancelled successfully', { orderId: orderIdToCancel });
                    } catch (error) {
                        PaymentLogger.error('Failed to cancel unpaid order', {
                            orderId: orderIdToCancel,
                            error: error.message
                        });
                        // Не блокируем возврат в корзину даже если отмена не удалась
                    }
                }

                navigation.navigate('Cart', {
                    forceRefresh: true,
                    timestamp: Date.now()
                });
            },
            () => {
                // Пользователь передумал - остается на экране оплаты
                PaymentLogger.log('User decided to continue with payment');
            }
        );
    }, [state.paymentCompleted, state.isSplitOrder, state.currentPaymentStep, state.createdOrderId, 
        params.orderId, params.waitingOrderId, navigation, showConfirm]);

    return {
        createPayment,
        checkPaymentStatus,
        completePayment,
        cancelPayment
    };
};
