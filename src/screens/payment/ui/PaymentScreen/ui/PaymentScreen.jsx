import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
    BackHandler,
    Platform,
    TouchableOpacity
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import { PaymentApi } from '@entities/payment';
import { clearCart, fetchCart } from '@entities/cart';

/**
 * Экран оплаты через ЮKassa
 * 
 * Параметры навигации:
 * @param {number} orderId - ID заказа для оплаты (обязательно для обычного заказа)
 * @param {string} orderNumber - Номер заказа
 * @param {number} totalAmount - Сумма заказа
 * @param {string} returnScreen - Экран для возврата после успешной оплаты (по умолчанию 'MyOrders')
 * @param {Object} returnParams - Параметры для передачи в returnScreen
 * @param {Object} checkoutData - Данные для создания заказа ПЕРЕД оплатой (если заказ еще не создан)
 * @param {boolean} usePreauthorization - Использовать предавторизацию (по умолчанию true)
 * 
 * Параметры для разделенного заказа (split order):
 * @param {boolean} isSplitOrder - Флаг разделенного заказа
 * @param {number} waitingOrderId - ID заказа с ожидающими товарами
 * @param {string} waitingOrderNumber - Номер заказа с ожидающими товарами
 * @param {number} waitingOrderAmount - Сумма заказа с ожидающими товарами
 */
export const PaymentScreen = ({ navigation, route }) => {
    const {
        orderId,
        orderNumber,
        totalAmount,
        returnScreen = 'OrderSuccess',
        returnParams = {},
        checkoutData, // Данные для создания заказа ПОСЛЕ оплаты
        usePreauthorization: routeUsePreauthorization, // Использовать предавторизацию или нет (по умолчанию true)
        // Параметры для разделенного заказа
        isSplitOrder,
        waitingOrderId,
        waitingOrderNumber,
        waitingOrderAmount
    } = route.params || {};

    const dispatch = useDispatch();
    const [paymentUrl, setPaymentUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [paymentCompleted, setPaymentCompleted] = useState(false);
    const [webViewLoading, setWebViewLoading] = useState(true);
    const [createdOrderId, setCreatedOrderId] = useState(null);
    const [paymentId, setPaymentId] = useState(null); // ID платежа для проверки статуса
    
    // Состояния для разделенного заказа
    const [currentPaymentStep, setCurrentPaymentStep] = useState(1); // 1 - доступные товары, 2 - ожидающие товары
    const [firstPaymentCompleted, setFirstPaymentCompleted] = useState(false);
    const [secondPaymentId, setSecondPaymentId] = useState(null);

    const webViewRef = useRef(null);
    const loadingTimeoutRef = useRef(null);

    /**
     * Создание платежа
     */
    const createPayment = async () => {
        try {
            setLoading(true);
            setError(null);

            let orderIdToUse = createdOrderId;
            // По умолчанию используем параметр из route (если не передан, используем true)
            let usePreauthorization = routeUsePreauthorization !== undefined ? routeUsePreauthorization : true;

            // Если передан checkoutData, сначала создаем заказ
            if (checkoutData && !orderIdToUse) {
                console.log('📦 Creating order before payment...');
                
                const { CartService } = require('@entities/cart');
                const checkoutResult = await CartService.checkout(checkoutData);
                
                const order = checkoutResult.data?.order;
                if (!order || !order.id) {
                    throw new Error('Не удалось создать заказ');
                }
                
                orderIdToUse = order.id;
                setCreatedOrderId(order.id);
                console.log('✅ Order created:', order.id, order.orderNumber);
            }

            // Для разделенного заказа определяем, какой платеж создавать
            if (isSplitOrder) {
                // Если первый платеж уже завершен, но currentPaymentStep все еще 1 - переключаемся на шаг 2
                if (firstPaymentCompleted && currentPaymentStep === 1) {
                    console.log('⚠️ First payment already completed, switching to step 2');
                    setCurrentPaymentStep(2);
                    return; // Прерываем выполнение, useEffect перезапустится с новым currentPaymentStep
                }
                
                if (currentPaymentStep === 1 && !firstPaymentCompleted) {
                    // Первый шаг: оплата заказа с доступными товарами (обычная оплата, БЕЗ предавторизации)
                    orderIdToUse = orderId;
                    usePreauthorization = false;
                    console.log('💳 [Шаг 1/2] Creating payment for immediate order:', orderId, '(regular payment)');
                } else if (currentPaymentStep === 2 || firstPaymentCompleted) {
                    // Второй шаг: оплата заказа с ожидающими товарами (предавторизация)
                    orderIdToUse = waitingOrderId;
                    usePreauthorization = true;
                    console.log('💳 [Шаг 2/2] Creating payment for waiting order:', waitingOrderId, '(preauthorization)');
                }
            }
            
            // Для обычного заказа (не split, без checkoutData) используем orderId из route.params
            if (!orderIdToUse && orderId) {
                orderIdToUse = orderId;
                console.log('💳 Using orderId from route.params:', orderId);
            }

            if (!orderIdToUse) {
                console.error('❌ Не указан ID заказа. Параметры:', {
                    orderId,
                    createdOrderId,
                    isSplitOrder,
                    hasCheckoutData: !!checkoutData,
                    routeParams: route.params
                });
                throw new Error('Не указан ID заказа');
            }

            console.log('💳 Creating payment for order:', orderIdToUse, { usePreauthorization });

            const response = await PaymentApi.createPayment(orderIdToUse, {
                returnUrl: 'icebergapp://payment-result',
                preauthorization: usePreauthorization,
                paymentMethodType: 'sbp' // Только СБП
            });

            if (!response?.data?.data?.confirmationUrl) {
                throw new Error('Не получен URL для оплаты');
            }

            const url = response.data.data.confirmationUrl;
            const paymentIdFromResponse = response.data.data.paymentId;
            
            setPaymentUrl(url);
            
            // Сохраняем paymentId для последующей проверки статуса
            if (isSplitOrder && currentPaymentStep === 2) {
                setSecondPaymentId(paymentIdFromResponse);
                console.log('💾 Payment ID saved:', paymentIdFromResponse, '(step 2)');
            } else {
                setPaymentId(paymentIdFromResponse);
                console.log('💾 Payment ID saved:', paymentIdFromResponse, '(step 1)');
            }
            
            setLoading(false);
        } catch (err) {
            console.error('❌ Error creating payment:', err);
            setError(err.message || 'Не удалось создать платеж');
            setLoading(false);

            Alert.alert(
                'Ошибка',
                'Не удалось создать платеж. Попробуйте позже.',
                [
                    {
                        text: 'К корзине', 
                        style: 'default',
                        onPress: () => {
                            console.log('🛒 User returned to cart');
                            navigation.navigate('Cart', { forceRefresh: true, timestamp: Date.now() });
                        }
                    }
                ]
            );
        }
    };

    /**
     * Обработка завершения оплаты (успешной или неуспешной)
     */
    const handlePaymentComplete = async (status) => {
        console.log('💳 Payment completed with status:', status);

        try {
            // Проверяем статус платежа на сервере
            const currentPaymentId = isSplitOrder && currentPaymentStep === 2 ? secondPaymentId : paymentId;
            
            if (!currentPaymentId) {
                console.warn('⚠️ Payment ID not found, skipping status check');
                return;
            }

            const statusResponse = await PaymentApi.checkPaymentStatus(currentPaymentId);
            const paymentStatus = statusResponse?.data?.data?.status;

            console.log('📊 Payment status from server:', paymentStatus);

            // Обрабатываем успешные платежи
            if (paymentStatus === 'succeeded' || paymentStatus === 'waiting_for_capture') {
                setPaymentCompleted(true);

                // Если это разделенный заказ и первый платеж
                if (isSplitOrder && currentPaymentStep === 1) {
                    console.log('✅ First payment completed, proceeding to second payment');
                    setFirstPaymentCompleted(true);
                    setCurrentPaymentStep(2);
                    
                    // Сбрасываем состояние для второго платежа
                    setPaymentUrl(null);
                    setPaymentId(null);
                    setPaymentCompleted(false); // ✅ Сбрасываем флаг для второго платежа
                    setLoading(true);
                    setWebViewLoading(true);

                    Alert.alert(
                        'Первый платеж завершен',
                        `Оплата доступных товаров прошла успешно!\n\nТеперь перейдем к оплате ожидающих товаров (${waitingOrderAmount}₽).`,
                        [
                            {
                                text: 'Продолжить',
                                onPress: () => {
                                    console.log('🔄 Proceeding to second payment');
                                    // useEffect автоматически создаст второй платеж
                                }
                            }
                        ]
                    );
                    return;
                }

                // Обычный заказ или второй платеж разделенного заказа
                console.log('✅ Payment successful, clearing cart and navigating to success screen');
                
                // Очищаем корзину при успешной оплате
                await dispatch(clearCart()).unwrap();
                
                // Переходим к экрану успешного заказа
                if (isSplitOrder) {
                    // Для разделенного заказа передаем информацию о двух заказах
                    console.log('🎉 Navigating to OrderSuccess with split info', {
                        immediateOrderId: orderId,
                        immediateOrderNumber: orderNumber,
                        immediateAmount: totalAmount,
                        waitingOrderId,
                        waitingOrderNumber,
                        waitingAmount: waitingOrderAmount
                    });
                    
                    // Загружаем полную информацию о заказах для отображения товаров
                    try {
                        const { OrderApi } = require('@entities/order');
                        const [immediateOrderResponse, waitingOrderResponse] = await Promise.all([
                            OrderApi.getOrderById(orderId),
                            OrderApi.getOrderById(waitingOrderId)
                        ]);
                        
                        console.log('📦 Order details loaded:', {
                            immediateOrder: {
                                hasData: !!immediateOrderResponse?.data,
                                hasDataData: !!immediateOrderResponse?.data?.data,
                                orderItemsCount: immediateOrderResponse?.data?.orderItems?.length || 0,
                                dataDataOrderItemsCount: immediateOrderResponse?.data?.data?.orderItems?.length || 0,
                                structure: Object.keys(immediateOrderResponse || {}),
                                dataStructure: Object.keys(immediateOrderResponse?.data || {}),
                                dataDataStructure: Object.keys(immediateOrderResponse?.data?.data || {})
                            },
                            waitingOrder: {
                                hasData: !!waitingOrderResponse?.data,
                                hasDataData: !!waitingOrderResponse?.data?.data,
                                orderItemsCount: waitingOrderResponse?.data?.orderItems?.length || 0,
                                dataDataOrderItemsCount: waitingOrderResponse?.data?.data?.orderItems?.length || 0,
                                structure: Object.keys(waitingOrderResponse || {}),
                                dataStructure: Object.keys(waitingOrderResponse?.data || {}),
                                dataDataStructure: Object.keys(waitingOrderResponse?.data?.data || {})
                            }
                        });
                        
                        // Извлекаем данные из разных возможных структур ответа
                        const immediateOrderData = immediateOrderResponse?.data?.data || immediateOrderResponse?.data || {};
                        const waitingOrderData = waitingOrderResponse?.data?.data || waitingOrderResponse?.data || {};
                        
                        // Товары могут быть в поле 'items' или 'orderItems'
                        const immediateItems = immediateOrderData.items || immediateOrderData.orderItems || [];
                        const waitingItems = waitingOrderData.items || waitingOrderData.orderItems || [];
                        
                        console.log('🔍 Extracted order data:', {
                            immediateOrderItems: immediateItems.length,
                            waitingOrderItems: waitingItems.length,
                            immediateFirstItem: immediateItems[0],
                            waitingFirstItem: waitingItems[0]
                        });
                        
                        navigation.navigate('OrderSuccess', {
                            splitInfo: {
                                immediateOrder: {
                                    id: orderId,
                                    orderNumber: orderNumber,
                                    totalAmount: totalAmount,
                                    orderItems: immediateItems,
                                    status: 'PENDING' // Ожидает подтверждения сборщиком
                                },
                                waitingOrder: {
                                    id: waitingOrderId,
                                    orderNumber: waitingOrderNumber,
                                    totalAmount: waitingOrderAmount,
                                    orderItems: waitingItems,
                                    status: 'WAITING_STOCK'
                                },
                                originalOrderId: null
                            },
                            deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
                        });
                    } catch (error) {
                        console.error('❌ Error loading order details:', error);
                        // Fallback - переходим без детальной информации
                        navigation.navigate('OrderSuccess', {
                            splitInfo: {
                                immediateOrder: {
                                    id: orderId,
                                    orderNumber: orderNumber,
                                    totalAmount: totalAmount,
                                    orderItems: [],
                                    status: 'PENDING' // Ожидает подтверждения сборщиком
                                },
                                waitingOrder: {
                                    id: waitingOrderId,
                                    orderNumber: waitingOrderNumber,
                                    totalAmount: waitingOrderAmount,
                                    orderItems: [],
                                    status: 'WAITING_STOCK'
                                }
                            },
                            deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
                        });
                    }
                } else {
                    // Для обычного заказа
                    navigation.navigate('OrderSuccess', {
                        orderId: orderId,
                        orderNumber: orderNumber,
                        totalAmount: totalAmount,
                        deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                        itemsCount: route.params?.itemsCount || 0
                    });
                }
            } else if (paymentStatus === 'canceled' || paymentStatus === 'FAILED') {
                // Обрабатываем неуспешные платежи
                console.log('❌ Payment failed or canceled');
                
                Alert.alert(
                    'Оплата не завершена',
                    'Платеж был отменен или не прошел.',
                    [
                        {
                            text: 'К корзине',
                            onPress: () => {
                                navigation.navigate('Cart', { forceRefresh: true, timestamp: Date.now() });
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('❌ Error checking payment status:', error);
        }
    };

    /**
     * Обработка отмены/закрытия экрана оплаты
     */
    const handleCancel = () => {
        // Если оплата уже завершена, просто переходим к заказам
        if (paymentCompleted) {
            navigation.navigate('MyOrders', {
                refresh: true,
                timestamp: Date.now()
            });
            return;
        }

        // Если оплата не завершена, предлагаем отложить оплату
        Alert.alert(
            'Отложить оплату?',
            'Вы можете вернуться к оплате позже из Корзины',
            [
                {
                    text: 'Отменить',
                    style: 'cancel'
                },
                {
                    text: 'Оплатить позже',
                    style: 'default',
                    onPress: () => {
                        console.log('⏰ User postponed payment');
                        // Возвращаемся к корзине с принудительным обновлением
                        navigation.navigate('Cart', { forceRefresh: true, timestamp: Date.now() });
                    }
                }
            ]
        );
    };

    /**
     * Обработка навигации в WebView
     */
    const handleNavigationStateChange = (navState) => {
        const { url, loading: navLoading, canGoBack, canGoForward } = navState;

        console.log('🌐 WebView navigation:', url, { canGoBack, canGoForward, navLoading });

        // Обрабатываем deep link для возврата в приложение
        if (url.startsWith('icebergapp://payment-result')) {
            console.log('✅ Payment result deep link detected');
            handlePaymentComplete('completed');
        }
    };

    /**
     * Определение, можно ли загружать URL в WebView
     */
    const handleShouldStartLoadWithRequest = (request) => {
        const { url } = request;

        console.log('🔍 Should start load with request:', url);

        // Разрешаем навигацию только на домены ЮKassa
        if (url.includes('yoomoney.ru') || url.includes('yookassa.ru')) {
            console.log('✅ Allowed navigation to:', url);
            return true;
        }

        // Обрабатываем deep link для возврата в приложение
        if (url.startsWith('icebergapp://payment-result')) {
            console.log('✅ Payment result deep link, handling...');
            handlePaymentComplete('completed');
            return false;
        }

        console.log('❌ Blocked navigation to:', url);
        return false;
    };

    /**
     * Обработка прогресса загрузки WebView
     */
    const handleLoadProgress = ({ nativeEvent }) => {
        console.log('📊 WebView load progress:', nativeEvent.progress);
        
        // Если прогресс 100%, немедленно скрываем индикатор
        if (nativeEvent.progress === 1) {
            setWebViewLoading(false);
            
            // Очищаем таймаут если он был установлен
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
            }
        }
        // Если прогресс больше 70%, скрываем индикатор загрузки с небольшой задержкой
        else if (nativeEvent.progress > 0.7 && webViewLoading) {
            // Устанавливаем таймаут на случай если onLoadEnd не сработает
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
            loadingTimeoutRef.current = setTimeout(() => {
                console.log('⏰ Loading timeout reached, forcing hide loading indicator');
                setWebViewLoading(false);
            }, 500); // Уменьшили задержку с 1500 до 500мс
        }
    };

    /**
     * Обработка окончания загрузки WebView
     */
    const handleLoadEnd = () => {
        console.log('✅ WebView load end');
        setWebViewLoading(false);
        
        // Очищаем таймаут если он был установлен
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
        }
    };

    /**
     * Обработка начала загрузки WebView
     */
    const handleLoadStart = () => {
        console.log('🔄 WebView load start');
        setWebViewLoading(true);
    };

    /**
     * Обработка ошибок загрузки WebView
     */
    const handleError = (syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('❌ WebView error:', nativeEvent);
        setWebViewLoading(false);
        setError('Не удалось загрузить форму оплаты');
    };

    /**
     * Обработка HTTP ошибок WebView
     */
    const handleHttpError = (syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('❌ WebView HTTP error:', nativeEvent.statusCode, nativeEvent.url);
        setWebViewLoading(false);
    };

    /**
     * Обработка краша процесса WebView (iOS)
     */
    const handleContentProcessDidTerminate = () => {
        console.warn('⚠️ WebView content process terminated, reloading...');
        webViewRef.current?.reload();
    };

    /**
     * Создание платежа при монтировании компонента
     */
    useEffect(() => {
        // Для разделенного заказа: создаем платеж если нет URL
        // Для второго шага игнорируем флаг paymentCompleted (он установлен после первого платежа)
        const shouldCreatePayment = !paymentUrl && (
            !paymentCompleted || 
            (isSplitOrder && currentPaymentStep === 2)
        );
        
        if (shouldCreatePayment) {
            console.log('🔄 Creating payment...', {
                currentStep: currentPaymentStep,
                isSplitOrder,
                paymentCompleted,
                hasPaymentUrl: !!paymentUrl
            });
            createPayment();
        }

        // Обработка кнопки "Назад" на Android
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleCancel();
            return true; // Предотвращаем стандартное поведение
        });

        return () => {
            backHandler.remove();
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentUrl, paymentCompleted, currentPaymentStep]);

    /**
     * JavaScript для инжекта в WebView (выполняется ДО загрузки страницы)
     * Перехватывает попытки открыть новое окно
     */
    const injectedJavaScriptBeforeContentLoaded = `
        (function() {
            console.log('🔧 Injected JavaScript (before content loaded)');
            
            // Перехватываем window.open и заменяем на навигацию в текущем окне
            window.open = function(url, target, features) {
                console.log('📱 Intercepted window.open:', url);
                window.location.href = url;
                return window;
            };
        })();
        true;
    `;

    /**
     * JavaScript для инжекта в WebView (выполняется ПОСЛЕ загрузки страницы)
     * Удаляет target="_blank" из ссылок
     */
    const injectedJavaScript = `
        (function() {
            console.log('🔧 Injected JavaScript (after content loaded)');
            
            // Удаляем target="_blank" из всех ссылок
            const links = document.querySelectorAll('a[target="_blank"]');
            links.forEach(link => {
                link.removeAttribute('target');
                console.log('🔗 Removed target="_blank" from link:', link.href);
            });
        })();
        true;
    `;

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                        <Icon name="close" size={24} color={Color.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {isSplitOrder 
                            ? currentPaymentStep === 1 
                                ? 'Оплата доступных товаров' 
                                : 'Оплата ожидающих товаров'
                            : 'Оплата заказа'
                        }
                    </Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Color.primary} />
                    <Text style={styles.loadingText}>Подготовка платежа...</Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                        <Icon name="close" size={24} color={Color.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Ошибка</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.errorContainer}>
                    <Icon name="error-outline" size={64} color={Color.error} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                            setError(null);
                            createPayment();
                        }}
                    >
                        <Text style={styles.retryButtonText}>Попробовать снова</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                    <Icon name="close" size={24} color={Color.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isSplitOrder 
                        ? currentPaymentStep === 1 
                            ? `Оплата (${currentPaymentStep}/2)` 
                            : `Предоплата (${currentPaymentStep}/2)`
                        : 'Оплата заказа'
                    }
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {isSplitOrder && (
                <View style={styles.splitOrderInfo}>
                    <View style={styles.splitOrderBadge}>
                        <Icon name="call-split" size={16} color={Color.primary} />
                        <Text style={styles.splitOrderBadgeText}>Разделенный заказ</Text>
                    </View>
                    <Text style={styles.splitOrderDescription}>
                        {currentPaymentStep === 1
                            ? `Шаг 1: Оплата доступных товаров (${totalAmount}₽)`
                            : `Шаг 2: Предоплата ожидающих товаров (${waitingOrderAmount}₽)`
                        }
                    </Text>
                </View>
            )}

            <View style={styles.paymentInfo}>
                <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Заказ:</Text>
                    <Text style={styles.paymentInfoValue}>
                        {isSplitOrder && currentPaymentStep === 2 
                            ? waitingOrderNumber 
                            : orderNumber
                        }
                    </Text>
                </View>
                <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>К оплате:</Text>
                    <Text style={styles.paymentInfoValue}>
                        {isSplitOrder && currentPaymentStep === 2 
                            ? `${waitingOrderAmount}₽` 
                            : `${totalAmount}₽`
                        }
                    </Text>
                </View>
            </View>

            {(webViewLoading || !paymentUrl) && (
                <View style={styles.webViewLoadingContainer}>
                    <ActivityIndicator size="large" color={Color.primary} />
                    <Text style={styles.loadingText}>
                        {!paymentUrl && isSplitOrder && currentPaymentStep === 2
                            ? 'Подготовка формы оплаты второго заказа...'
                            : 'Загрузка формы оплаты...'
                        }
                    </Text>
                </View>
            )}

            {paymentUrl && (
                <WebView
                    ref={webViewRef}
                    source={{ uri: paymentUrl }}
                    style={styles.webView}
                    onNavigationStateChange={handleNavigationStateChange}
                    onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
                    onLoadProgress={handleLoadProgress}
                    onLoadEnd={handleLoadEnd}
                    onLoadStart={handleLoadStart}
                    onError={handleError}
                    onHttpError={handleHttpError}
                    onContentProcessDidTerminate={handleContentProcessDidTerminate}
                    injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
                    injectedJavaScript={injectedJavaScript}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    scalesPageToFit={true}
                    nestedScrollEnabled={true}
                    cacheEnabled={false}
                    incognito={false}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                    originWhitelist={['*']}
                    mixedContentMode="always"
                    androidLayerType="hardware"
                    androidHardwareAccelerationDisabled={false}
                    setSupportMultipleWindows={true}
                    geolocationEnabled={false}
                    allowFileAccess={false}
                    allowUniversalAccessFromFileURLs={false}
                    userAgent={Platform.OS === 'ios' 
                        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
                        : 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.background || '#FFFFFF'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Color.border || '#E0E0E0',
        backgroundColor: Color.background || '#FFFFFF'
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: FontFamily.interSemiBold,
        color: Color.textPrimary,
        flex: 1,
        textAlign: 'center'
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center'
    },
    splitOrderInfo: {
        backgroundColor: Color.backgroundSecondary || '#F5F5F5',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: Color.border || '#E0E0E0'
    },
    splitOrderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    splitOrderBadgeText: {
        fontSize: 12,
        fontFamily: FontFamily.interSemiBold,
        color: Color.primary,
        marginLeft: 4
    },
    splitOrderDescription: {
        fontSize: 13,
        fontFamily: FontFamily.interRegular,
        color: Color.textSecondary
    },
    paymentInfo: {
        backgroundColor: Color.backgroundSecondary || '#F5F5F5',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Color.border || '#E0E0E0'
    },
    paymentInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    paymentInfoLabel: {
        fontSize: 14,
        fontFamily: FontFamily.interRegular,
        color: Color.textSecondary
    },
    paymentInfoValue: {
        fontSize: 14,
        fontFamily: FontFamily.interSemiBold,
        color: Color.textPrimary
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: FontFamily.interRegular,
        color: Color.textSecondary
    },
    webViewLoadingContainer: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000
    },
    webView: {
        flex: 1
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        fontFamily: FontFamily.interRegular,
        color: Color.textPrimary,
        textAlign: 'center'
    },
    retryButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: Color.primary,
        borderRadius: 8
    },
    retryButtonText: {
        fontSize: 16,
        fontFamily: FontFamily.interSemiBold,
        color: '#FFFFFF'
    }
});

