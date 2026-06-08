// ==========================================
// PaymentScreen/index.js
// Главный компонент экрана оплаты
// ==========================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, BackHandler, AppState } from 'react-native';
import { useDispatch } from 'react-redux';
import { clearCart } from '@entities/cart';
import { useCustomAlert } from '@shared/ui/CustomAlert';
import { PaymentHeader } from '../components/PaymentHeader';
import { PaymentInfo } from '../components/PaymentInfo';
import { SplitOrderInfo } from '../components/SplitOrderInfo';
import { PaymentWebView } from '../components/PaymentWebView';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { usePaymentState } from '../hooks/usePaymentState';
import { usePaymentLifecycle } from '../hooks/usePaymentLifecycle';
import { PaymentLogger } from '../utils/PaymentLogger';
import { Color } from '@app/styles/GlobalStyles';

export const PaymentScreen = ({ navigation, route }) => {
    const dispatch = useDispatch();
    const { showError, showInfo, showConfirm } = useCustomAlert();

    // Состояние платежа
    const {
        state,
        actions,
        currentOrderInfo
    } = usePaymentState(route.params);

    // Жизненный цикл платежа (создание, проверка статуса, завершение)
    const {
        createPayment,
        checkPaymentStatus,
        completePayment,
        cancelPayment
    } = usePaymentLifecycle({
        params: route.params,
        state,
        actions,
        navigation,
        dispatch,
        showError,
        showInfo,
        showConfirm
    });

    const webViewRef = useRef(null);
    const loadingTimeoutRef = useRef(null);

    /**
     * Обработка возврата из deep link (например, после оплаты через SBP)
     */
    useEffect(() => {
        const { fromDeepLink, originalUrl } = route.params || {};
        if (fromDeepLink && !state.paymentCompleted) {
            PaymentLogger.log('Processing payment return from deep link:', originalUrl);

            // Если у нас есть paymentId, проверяем статус платежа
            if (state.currentPaymentId) {
                PaymentLogger.log('Checking payment status after deep link return...');
                checkPaymentStatus();
            } else {
                // Если нет paymentId, завершаем оплату как успешную (для совместимости)
                PaymentLogger.success('Completing payment from deep link (no paymentId)');
                completePayment('completed');
            }
        }
    }, [route.params, state.paymentCompleted, state.currentPaymentId, checkPaymentStatus, completePayment]);

    /**
     * Обработка возврата из банковского приложения (SBP)
     */
    useEffect(() => {
        let isCheckingPayment = false; // Флаг для предотвращения одновременных проверок

        const handleAppStateChange = (nextAppState) => {
            PaymentLogger.log('App state changed:', nextAppState);

            // Когда приложение возвращается из background (после банковского приложения)
            if (nextAppState === 'active' && state.currentPaymentId && !state.paymentCompleted && !isCheckingPayment) {
                isCheckingPayment = true;
                PaymentLogger.log('App returned to foreground, checking payment status...');

                // Показываем уведомление пользователю
                showInfo(
                    'Проверка оплаты',
                    'Проверяем статус оплаты после возврата из банковского приложения...',
                    [],
                    3000 // Автоматически скрываем через 3 секунды
                );

                // Многократная проверка статуса с интервалами (SBP платежи могут обрабатываться дольше)
                let attempts = 0;
                const maxAttempts = 8; // Увеличено до 8 попыток для SBP
                const checkInterval = 1500; // Проверка каждые 1.5 секунды (чаще)

                const checkStatusWithRetry = async () => {
                    if (state.paymentCompleted || attempts >= maxAttempts) {
                        isCheckingPayment = false;
                        if (attempts >= maxAttempts && !state.paymentCompleted) {
                            PaymentLogger.log('Max attempts reached, stopping auto-check');
                            showInfo(
                                'Проверка оплаты',
                                'Не удалось автоматически определить статус оплаты. Нажмите кнопку 🔄 в правом верхнем углу для ручной проверки.',
                                [],
                                5000
                            );
                        }
                        return;
                    }

                    attempts++;
                    PaymentLogger.log(`Auto-checking payment status (attempt ${attempts}/${maxAttempts})...`);

                    try {
                        const isPaymentSuccessful = await checkPaymentStatus();
                        // Если платеж завершен успешно, останавливаемся
                        if (isPaymentSuccessful) {
                            PaymentLogger.success('Payment confirmed as successful, stopping auto-check');
                            isCheckingPayment = false;
                            return;
                        }
                        // Если платеж еще не завершен, планируем следующую проверку
                        if (!state.paymentCompleted) {
                            setTimeout(checkStatusWithRetry, checkInterval);
                        } else {
                            isCheckingPayment = false;
                        }
                    } catch (error) {
                        PaymentLogger.error('Error during auto-check:', error);
                        // Продолжаем попытки даже при ошибке
                        setTimeout(checkStatusWithRetry, checkInterval);
                    }
                };

                // Начинаем проверки через 1 секунду после возврата в foreground
                setTimeout(checkStatusWithRetry, 1000);
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription?.remove();
        };
    }, [state.currentPaymentId, state.paymentCompleted, checkPaymentStatus, showInfo]);

        // Обработка кнопки "Назад" на Android
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            cancelPayment();
            return true; // Предотвращаем стандартное поведение
        });

        return () => {
            backHandler.remove();
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, [cancelPayment]);

    // Создание платежа при монтировании или смене шага
    useEffect(() => {
        const shouldCreate = !state.paymentUrl && (
            !state.paymentCompleted ||
            (state.isSplitOrder && state.currentPaymentStep === 2)
        );

        if (shouldCreate) {
            PaymentLogger.log('Creating payment...', {
                currentStep: state.currentPaymentStep,
                isSplitOrder: state.isSplitOrder,
                paymentCompleted: state.paymentCompleted,
                hasPaymentUrl: !!state.paymentUrl
            });
            createPayment();
        }
    }, [state.paymentUrl, state.paymentCompleted, state.currentPaymentStep, createPayment]);

    // Рендеринг состояний загрузки и ошибки
    if (state.loading) {
        return (
            <LoadingScreen
                onCancel={cancelPayment}
                isSplitOrder={state.isSplitOrder}
                currentStep={state.currentPaymentStep}
            />
        );
    }

    if (state.error) {
        return (
            <ErrorScreen
                error={state.error}
                onCancel={cancelPayment}
                onRetry={() => {
                    actions.setError(null);
                            createPayment();
                        }}
            />
        );
    }

    // Основной экран с WebView
    return (
        <View style={styles.container}>
            <PaymentHeader
                onClose={cancelPayment}
                onCheckStatus={checkPaymentStatus}
                isSplitOrder={state.isSplitOrder}
                currentStep={state.currentPaymentStep}
            />

            {state.isSplitOrder && (
                <SplitOrderInfo
                    currentStep={state.currentPaymentStep}
                    totalAmount={currentOrderInfo.amount}
                    waitingAmount={state.waitingOrderAmount}
                />
            )}

            <PaymentInfo
                orderNumber={currentOrderInfo.number}
                amount={currentOrderInfo.amount}
            />

            <PaymentWebView
                paymentUrl={state.paymentUrl}
                paymentId={state.currentPaymentId}
                isLoading={state.webViewLoading}
                onLoadingChange={actions.setWebViewLoading}
                onNavigationChange={(url) => {
                    if (url.startsWith('icebergapp://payment-result')) {
                        checkPaymentStatus();
                    }
                }}
                onPaymentSuccess={checkPaymentStatus}
                onCheckStatus={checkPaymentStatus}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.background || '#FFFFFF'
    }
});

