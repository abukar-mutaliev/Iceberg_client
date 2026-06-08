import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    StatusBar,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { ORDER_DETAILS_CLIENT_DARK_BACKGROUND, OrderDetailsScreenThemeProvider } from '@shared/ui/OrderDetailsStyles';
import { OrderDetailsBackButton } from '@shared/ui/OrderDetailsBackButton/ui/OrderDetailsBackButton';
import { useOpenManagerChat } from '@features/help/hooks/useOpenManagerChat';
import { exitPaymentToMyOrders, exitPaymentToMain, navigateToOrderDetails } from '@screens/payment/ui/PaymentScreen/utils/paymentNavigation';
import { calculateItemsFromBoxes } from '@shared/utils/productBoxUtils';

const { width, height } = Dimensions.get('window');

const getOrderPiecesCount = (orderItems) => {
    if (!orderItems?.length) return 0;
    return orderItems.reduce(
        (sum, item) => sum + calculateItemsFromBoxes(item.quantity || 0, item.product?.itemsPerBox || 1),
        0
    );
};

const getOrderBoxesCount = (orderItems) => {
    if (!orderItems?.length) return 0;
    return orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
};

const getOrderItemPieces = (item) =>
    calculateItemsFromBoxes(item.quantity || 0, item.product?.itemsPerBox || 1);

const normalize = (size) => {
    const scale = width / 440;
    return Math.round(size * scale);
};

// Функция склонения числительных
const pluralize = (count, one, few, many) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    
    if (mod10 === 1 && mod100 !== 11) {
        return one;
    } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
        return few;
    } else {
        return many;
    }
};

const WAITING_STOCK_COLOR = '#fd7e14';
const ON_PRIMARY_COLOR = '#FFFFFF';

// Компонент конфетти
const ConfettiPiece = ({ delay, color, confettiStyle }) => {
    const translateY = useRef(new Animated.Value(-50)).current;
    const translateX = useRef(new Animated.Value(Math.random() * width)).current;
    const rotate = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: height + 50,
                    duration: 3000 + Math.random() * 2000,
                    delay,
                    useNativeDriver: true,
                }),
                Animated.timing(rotate, {
                    toValue: 1,
                    duration: 2000,
                    delay,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, []);

    const rotation = rotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <Animated.View
            style={[
                confettiStyle,
                {
                    backgroundColor: color,
                    transform: [
                        { translateX },
                        { translateY },
                        { rotate: rotation }
                    ]
                }
            ]}
        />
    );
};

export const OrderSuccessScreen = ({ navigation, route }) => {
    const { colors, isDark } = useTheme();
    const screenBackground = isDark ? ORDER_DETAILS_CLIENT_DARK_BACKGROUND : colors.primary;
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const { openManagerChat, loading: openingManagerChat } = useOpenManagerChat('OrderSuccess');

    // Параметры заказа из предыдущего экрана
    const splitInfo = route?.params?.splitInfo;
    const isChoiceResult = route?.params?.isChoiceResult || false;
    const choiceMessage = route?.params?.choiceMessage;
    
    // Логирование для отладки
    console.log('🎉 OrderSuccessScreen received params:', {
        hasSplitInfo: !!splitInfo,
        isChoiceResult,
        itemsCountFromParams: route?.params?.itemsCount,
        immediateOrderItemsCount: splitInfo?.immediateOrder?.orderItems?.length || 0,
        waitingOrderItemsCount: splitInfo?.waitingOrder?.orderItems?.length || 0,
        immediateOrder: splitInfo?.immediateOrder ? {
            id: splitInfo.immediateOrder.id,
            orderNumber: splitInfo.immediateOrder.orderNumber,
            totalAmount: splitInfo.immediateOrder.totalAmount,
            orderItemsLength: splitInfo.immediateOrder.orderItems?.length,
            firstItem: splitInfo.immediateOrder.orderItems?.[0]
        } : null,
        waitingOrder: splitInfo?.waitingOrder ? {
            id: splitInfo.waitingOrder.id,
            orderNumber: splitInfo.waitingOrder.orderNumber,
            totalAmount: splitInfo.waitingOrder.totalAmount,
            orderItemsLength: splitInfo.waitingOrder.orderItems?.length,
            firstItem: splitInfo.waitingOrder.orderItems?.[0]
        } : null
    });
    
    // Для разделенных заказов
    const immediateOrder = splitInfo?.immediateOrder;
    const waitingOrder = splitInfo?.waitingOrder;
    
    // Номера заказов
    const immediateOrderNumber = immediateOrder?.orderNumber;
    const waitingOrderNumber = waitingOrder?.orderNumber;
    
    // Для обычного заказа или разделенного показываем номер первого заказа
    const orderNumber = immediateOrderNumber || route?.params?.orderNumber || 'N/A';
    
    // Суммы заказов
    const immediateAmount = immediateOrder?.totalAmount || 0;
    const waitingAmount = waitingOrder?.totalAmount || 0;
    const totalAmount = splitInfo ? (immediateAmount + waitingAmount) : (route?.params?.totalAmount || 0);
    
    const deliveryDate = route?.params?.deliveryDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    
    // Подсчет штук: quantity в заказе — коробки, умножаем на itemsPerBox
    const immediateItemsCount = getOrderPiecesCount(immediateOrder?.orderItems);
    const waitingItemsCount = getOrderPiecesCount(waitingOrder?.orderItems);
    
    // Подсчет коробок: сумма quantity по всем позициям
    const immediateBoxesCount = getOrderBoxesCount(immediateOrder?.orderItems);
    const waitingBoxesCount = getOrderBoxesCount(waitingOrder?.orderItems);
    
    // Для обычного заказа проверяем параметры, если их нет - вычисляем значения по умолчанию
    let itemsCount = 0;
    let totalBoxesCount = 0;
    
    if (splitInfo) {
        itemsCount = immediateItemsCount + waitingItemsCount;
        totalBoxesCount = immediateBoxesCount + waitingBoxesCount;

        // Если orderItems не переданы (например, после оплаты), используем params
        if (itemsCount === 0 && totalBoxesCount === 0) {
            itemsCount = route?.params?.itemsCount || 0;
            totalBoxesCount = route?.params?.boxesCount || 0;
        }
    } else {
        // Для обычного заказа берем из параметров (totalItems / totalBoxes из корзины)
        itemsCount = route?.params?.itemsCount || 0;
        totalBoxesCount = route?.params?.boxesCount || 0;
        
        // Если данные не переданы, показываем хотя бы информацию что заказ оформлен
        // (для старых версий где не передавались эти параметры)
        if (itemsCount === 0 && totalBoxesCount === 0) {
            console.warn('⚠️ OrderSuccessScreen: itemsCount и boxesCount не переданы для обычного заказа');
        }
    }
    
    // ID заказов для навигации
    const immediateOrderId = immediateOrder?.id;
    const waitingOrderId = waitingOrder?.id;
    const orderId = immediateOrderId || route?.params?.orderId;


    // Анимации
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        // Запускаем анимацию появления
        Animated.sequence([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                })
            ])
        ]).start();
    }, []);

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB'
        }).format(amount);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleOpenOrderDetails = useCallback((targetOrderId) => {
        navigateToOrderDetails(navigation, targetOrderId, { fromScreen: 'OrderSuccess' });
    }, [navigation]);

    const handleOpenMyOrders = useCallback(() => {
        exitPaymentToMyOrders(navigation, { fromScreen: 'OrderSuccess' });
    }, [navigation]);

    const handleContinueShopping = useCallback(() => {
        exitPaymentToMain(navigation, { fromScreen: 'OrderSuccess' });
    }, [navigation]);

    const confettiColors = useMemo(() => [
        colors.primary,
        '#764ba2',
        '#f093fb',
        '#4facfe',
        colors.success,
        '#fa709a',
    ], [colors.primary, colors.success]);

    return (
        <OrderDetailsScreenThemeProvider darkScreenBackground={ORDER_DETAILS_CLIENT_DARK_BACKGROUND}>
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor={screenBackground} />
            <OrderDetailsBackButton onPress={handleContinueShopping} />
            
            {/* Конфетти */}
            {confettiColors.map((color, index) => (
                <ConfettiPiece
                    key={`confetti-${index}`}
                    delay={index * 200}
                    color={color}
                    confettiStyle={styles.confetti}
                />
            ))}

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Градиентный заголовок */}
                <View style={styles.headerGradient}>
                    <Animated.View
                        style={[
                            styles.successIconContainer,
                            {
                                transform: [{ scale: scaleAnim }]
                            }
                        ]}
                    >
                        <View style={styles.iconCircle}>
                            <View style={styles.checkmarkCircle}>
                                <Icon name="check" size={normalize(60)} color={ON_PRIMARY_COLOR} />
                            </View>
                        </View>
                    </Animated.View>

                    <Animated.View
                        style={{
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }}
                    >
                        <Text style={styles.successTitle}>
                            {splitInfo ? 'Заказ разделен!' : isChoiceResult ? 'Выбор принят!' : 'Заказ оформлен!'}
                        </Text>
                        <Text style={styles.successSubtitle}>
                            {splitInfo 
                                ? 'Часть товаров передана сборщику для обработки, остальные ожидают поступления на склад'
                                : isChoiceResult 
                                    ? choiceMessage || 'Спасибо за ваш выбор' 
                                    : 'Спасибо за покупку'
                            }
                        </Text>
                    </Animated.View>
                </View>

                {/* Карточка с деталями заказа */}
                <Animated.View
                    style={[
                        styles.orderDetailsCard,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    {/* Информация о немедленном заказе */}
                    {splitInfo && immediateOrder && (
                        <>
                            <View style={styles.orderSectionHeader}>
                                <Icon name="inventory" size={normalize(20)} color={colors.primary} />
                                <Text style={styles.orderSectionTitle}>Заказ передан сборщику</Text>
                            </View>
                            
                            <View style={styles.orderDetailRow}>
                                <Text style={styles.detailLabel}>Номер заказа</Text>
                                <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                                    {immediateOrderNumber}
                                </Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.orderDetailRow}>
                                <Text style={styles.detailLabel}>Товаров в заказе</Text>
                                <Text style={styles.detailValue}>{immediateItemsCount} шт.</Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.orderDetailRow}>
                                <Text style={styles.detailLabel}>Количество коробок</Text>
                                <Text style={styles.detailValue}>
                                    {immediateBoxesCount} {pluralize(immediateBoxesCount, 'коробка', 'коробки', 'коробок')}
                                </Text>
                            </View>

                            {/* Список товаров немедленного заказа */}
                            {immediateOrder.orderItems && immediateOrder.orderItems.length > 0 && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.productsListContainer}>
                                        <Text style={styles.productsListTitle}>Товары:</Text>
                                        {immediateOrder.orderItems.map((item, index) => (
                                            <View key={index} style={styles.productItemRow}>
                                                <Icon name="check-circle" size={normalize(16)} color={colors.success} />
                                                <Text style={styles.productItemName} numberOfLines={1}>
                                                    {item.product?.name || 'Товар'}
                                                </Text>
                                                <Text style={styles.productItemQuantity}>
                                                    {getOrderItemPieces(item)} шт.
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}

                            <View style={styles.divider} />

                            <View style={styles.orderDetailRow}>
                                <Text style={styles.detailLabel}>Сумма</Text>
                                <Text style={styles.detailValueHighlight}>{formatAmount(immediateAmount)}</Text>
                            </View>

                            <View style={styles.sectionDivider} />
                        </>
                    )}

                    {/* Информация об ожидающем заказе */}
                    {splitInfo && waitingOrder && (
                        <>
                            <View style={styles.orderSectionHeader}>
                                <Icon name="schedule" size={normalize(20)} color={WAITING_STOCK_COLOR} />
                                <Text style={styles.orderSectionTitle}>Заказ ожидает поступления</Text>
                            </View>
                            
                            <View style={styles.orderDetailRow}>
                                <Text style={styles.detailLabel}>Номер заказа</Text>
                                <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                                    {waitingOrderNumber}
                                </Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.orderDetailRow}>
                                <Text style={styles.detailLabel}>Товаров в заказе</Text>
                                <Text style={styles.detailValue}>{waitingItemsCount} шт.</Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.orderDetailRow}>
                                <Text style={styles.detailLabel}>Количество коробок</Text>
                                <Text style={styles.detailValue}>
                                    {waitingBoxesCount} {pluralize(waitingBoxesCount, 'коробка', 'коробки', 'коробок')}
                                </Text>
                            </View>

                            {/* Список товаров ожидающего заказа */}
                            {waitingOrder.orderItems && waitingOrder.orderItems.length > 0 && (
                                <>
                                    <View style={styles.divider} />
                                    <View style={styles.productsListContainer}>
                                        <Text style={styles.productsListTitle}>Товары:</Text>
                                        {waitingOrder.orderItems.map((item, index) => (
                                            <View key={index} style={styles.productItemRow}>
                                                <Icon name="schedule" size={normalize(16)} color={WAITING_STOCK_COLOR} />
                                                <Text style={styles.productItemName} numberOfLines={1}>
                                                    {item.product?.name || 'Товар'}
                                                </Text>
                                                <Text style={styles.productItemQuantity}>
                                                    {getOrderItemPieces(item)} шт.
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}

                            <View style={styles.divider} />

                            <View style={styles.orderDetailRow}>
                                <Text style={styles.detailLabel}>Сумма</Text>
                                <Text style={styles.detailValueHighlight}>{formatAmount(waitingAmount)}</Text>
                            </View>

                            <View style={styles.sectionDivider} />
                        </>
                    )}
                    
                    {/* Для обычного заказа */}
                    {!splitInfo && (
                        <>
                            <View style={styles.orderDetailRow}>
                                <Text style={styles.detailLabel}>Номер заказа</Text>
                                <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                                    {orderNumber}
                                </Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.orderDetailRow}>
                                <Text style={styles.detailLabel}>Количество товаров</Text>
                                <Text style={styles.detailValue}>{itemsCount} шт.</Text>
                            </View>

                            {/* Показываем количество коробок, если оно есть */}
                            {totalBoxesCount > 0 && (
                                <>
                                    <View style={styles.divider} />

                                    <View style={styles.orderDetailRow}>
                                        <Text style={styles.detailLabel}>Количество коробок</Text>
                                        <Text style={styles.detailValue}>
                                            {totalBoxesCount} {pluralize(totalBoxesCount, 'коробка', 'коробки', 'коробок')}
                                        </Text>
                                    </View>
                                </>
                            )}

                            <View style={styles.divider} />
                        </>
                    )}

                    {/* Для разделенных заказов показываем общую статистику */}
                    {splitInfo && (
                        <>
                            <View style={styles.orderDetailRow}>
                                <Text style={styles.detailLabel}>Всего товаров</Text>
                                <Text style={styles.detailValue}>{itemsCount} шт.</Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.orderDetailRow}>
                                <Text style={styles.detailLabel}>Всего коробок</Text>
                                <Text style={styles.detailValue}>
                                    {totalBoxesCount} {pluralize(totalBoxesCount, 'коробка', 'коробки', 'коробок')}
                                </Text>
                            </View>

                            <View style={styles.divider} />
                        </>
                    )}

                    <View style={styles.orderDetailRow}>
                        <Text style={styles.detailLabel}>Ожидаемая доставка</Text>
                        <Text style={styles.detailValue}>{formatDate(deliveryDate)}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.orderDetailRow}>
                        <Text style={styles.detailLabelBold}>
                            {splitInfo ? 'Общая сумма заказов' : 'Итоговая сумма'}
                        </Text>
                        <Text style={styles.detailValueBold}>{formatAmount(totalAmount)}</Text>
                    </View>
                </Animated.View>

                {/* Информационный блок */}
                <Animated.View
                    style={[
                        styles.infoCard,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <View style={styles.infoIconContainer}>
                        <Icon name="info-outline" size={normalize(28)} color={isDark ? ON_PRIMARY_COLOR : colors.primary} />
                    </View>
                    <Text style={styles.infoText}>
                        {splitInfo 
                            ? 'Вы можете отслеживать статус обоих заказов в разделе "Мои заказы". Первый заказ ожидает подтверждения сборщиком, второй - поступления товара на склад.'
                            : 'Вы можете отслеживать статус заказа в разделе "Мои заказы".'
                        }
                    </Text>
                </Animated.View>

                {/* Кнопки действий */}
                <Animated.View
                    style={[
                        styles.actionsContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleOpenMyOrders}
                        activeOpacity={0.8}
                    >
                        <Icon name="assignment" size={normalize(20)} color={ON_PRIMARY_COLOR} />
                        <Text style={styles.primaryButtonText}>Мои заказы</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleContinueShopping}
                        activeOpacity={0.8}
                    >
                        <Icon name="storefront" size={normalize(20)} color={isDark ? ON_PRIMARY_COLOR : screenBackground} />
                        <Text style={styles.secondaryButtonText}>Продолжить покупки</Text>
                    </TouchableOpacity>

                    {/* Кнопки для просмотра деталей заказов */}
                    {splitInfo ? (
                        <>
                            {immediateOrderId && (
                                <TouchableOpacity
                                    style={styles.outlineButton}
                                    onPress={() => handleOpenOrderDetails(immediateOrderId)}
                                    activeOpacity={0.8}
                                >
                                    <Icon name="inventory" size={normalize(18)} color={colors.primary} />
                                    <Text style={styles.outlineButtonText}>Заказ у сборщика</Text>
                                </TouchableOpacity>
                            )}
                            {waitingOrderId && (
                                <TouchableOpacity
                                    style={styles.outlineButton}
                                    onPress={() => handleOpenOrderDetails(waitingOrderId)}
                                    activeOpacity={0.8}
                                >
                                    <Icon name="schedule" size={normalize(18)} color={WAITING_STOCK_COLOR} />
                                    <Text style={styles.outlineButtonText}>Заказ в ожидании</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    ) : orderId && (
                        <TouchableOpacity
                            style={styles.outlineButton}
                            onPress={() => handleOpenOrderDetails(orderId)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.outlineButtonText}>Подробнее о заказе</Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>

                {/* Дополнительная информация */}
                <Animated.View
                    style={[
                        styles.supportCard,
                        {
                            opacity: fadeAnim,
                        }
                    ]}
                >
                    <Icon name="support-agent" size={normalize(40)} color={colors.primary} style={styles.supportIcon} />
                    <Text style={styles.supportTitle}>Нужна помощь?</Text>
                    <Text style={styles.supportText}>
                        Наша служба поддержки всегда готова помочь вам
                    </Text>
                    <TouchableOpacity
                        style={styles.supportButton}
                        onPress={openManagerChat}
                        disabled={openingManagerChat}
                        activeOpacity={0.8}
                    >
                        {openingManagerChat ? (
                            <ActivityIndicator size="small" color={isDark ? ON_PRIMARY_COLOR : colors.primary} />
                        ) : (
                            <Icon name="chat" size={normalize(16)} color={isDark ? ON_PRIMARY_COLOR : colors.primary} />
                        )}
                        <Text style={styles.supportButtonText}>
                            {openingManagerChat ? 'Открываем чат...' : 'Связаться с поддержкой'}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
        </OrderDetailsScreenThemeProvider>
    );
};

const createStyles = (colors, isDark) => {
    const screenBackground = isDark ? ORDER_DETAILS_CLIENT_DARK_BACKGROUND : colors.primary;

    return StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingBottom: normalize(40),
    },
    // Конфетти
    confetti: {
        position: 'absolute',
        width: normalize(10),
        height: normalize(10),
        zIndex: 1000,
        borderRadius: normalize(5),
    },
    // Заголовок
    headerGradient: {
        backgroundColor: screenBackground,
        paddingTop: normalize(60),
        paddingBottom: normalize(40),
        paddingHorizontal: normalize(20),
        borderBottomLeftRadius: normalize(30),
        borderBottomRightRadius: normalize(30),
        alignItems: 'center',
        shadowColor: screenBackground,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.4 : 0.3,
        shadowRadius: 12,
        elevation: 12,
    },
    successIconContainer: {
        marginBottom: normalize(24),
    },
    iconCircle: {
        width: normalize(120),
        height: normalize(120),
        borderRadius: normalize(60),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.3 : 0.2,
        shadowRadius: 8,
        elevation: 0,
        overflow: 'hidden',
    },
    checkmarkCircle: {
        width: normalize(90),
        height: normalize(90),
        borderRadius: normalize(90) / 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },

    successTitle: {
        fontSize: normalize(32),
        fontWeight: '800',
        color: ON_PRIMARY_COLOR,
        textAlign: 'center',
        marginBottom: normalize(8),
        letterSpacing: 0.5,
    },
    successSubtitle: {
        fontSize: normalize(18),
        color: 'rgba(255, 255, 255, 0.92)',
        textAlign: 'center',
        fontWeight: '500',
    },
    // Карточка деталей
    orderDetailsCard: {
        backgroundColor: colors.cardBackground,
        marginHorizontal: normalize(20),
        marginTop: normalize(-20),
        borderRadius: normalize(20),
        padding: normalize(24),
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.22 : 0.1,
        shadowRadius: isDark ? 12 : 12,
        elevation: isDark ? 6 : 8,
        borderWidth: isDark ? 1 : 0,
        borderColor: colors.border,
    },
    orderDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: normalize(12),
    },
    detailLabel: {
        fontSize: normalize(15),
        color: colors.textSecondary,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: normalize(15),
        color: colors.textPrimary,
        fontWeight: '600',
        flex: 1,
        textAlign: 'right',
        marginLeft: normalize(8),
    },
    detailLabelBold: {
        fontSize: normalize(17),
        color: colors.textPrimary,
        fontWeight: '700',
    },
    detailValueBold: {
        fontSize: normalize(20),
        color: colors.primary,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
    },
    sectionDivider: {
        height: 2,
        backgroundColor: colors.border,
        marginVertical: normalize(12),
    },
    orderSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(12),
        paddingBottom: normalize(8),
        borderBottomWidth: 2,
        borderBottomColor: colors.border,
    },
    orderSectionTitle: {
        fontSize: normalize(16),
        fontWeight: '700',
        color: colors.textPrimary,
        marginLeft: normalize(8),
    },
    detailValueHighlight: {
        fontSize: normalize(16),
        color: colors.primary,
        fontWeight: '700',
    },
    productsListContainer: {
        marginTop: normalize(8),
        paddingVertical: normalize(8),
        paddingHorizontal: normalize(12),
        backgroundColor: colors.surface,
        borderRadius: normalize(8),
    },
    productsListTitle: {
        fontSize: normalize(13),
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: normalize(8),
    },
    productItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: normalize(6),
        gap: normalize(8),
    },
    productItemName: {
        flex: 1,
        fontSize: normalize(14),
        color: colors.textPrimary,
        fontWeight: '500',
    },
    productItemQuantity: {
        fontSize: normalize(13),
        color: colors.primary,
        fontWeight: '600',
    },
    // Информационная карточка
    infoCard: {
        flexDirection: 'row',
        backgroundColor: isDark ? screenBackground : (colors.primarySoft || (colors.primary + '14')),
        marginHorizontal: normalize(20),
        marginTop: normalize(20),
        padding: normalize(16),
        borderRadius: normalize(16),
        borderLeftWidth: 4,
        borderLeftColor: isDark ? ON_PRIMARY_COLOR : colors.primary,
    },
    infoIconContainer: {
        marginRight: normalize(12),
    },
    infoText: {
        flex: 1,
        fontSize: normalize(14),
        color: isDark ? ON_PRIMARY_COLOR : colors.textSecondary,
        lineHeight: normalize(20),
        fontWeight: '500',
    },
    // Кнопки действий
    actionsContainer: {
        paddingHorizontal: normalize(20),
        marginTop: normalize(24),
        gap: normalize(12),
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: screenBackground,
        paddingVertical: normalize(16),
        borderRadius: normalize(16),
        shadowColor: screenBackground,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.35 : 0.3,
        shadowRadius: 8,
        elevation: 6,
        gap: normalize(10),
    },
    primaryButtonText: {
        fontSize: normalize(17),
        fontWeight: '700',
        color: ON_PRIMARY_COLOR,
        letterSpacing: 0.3,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.cardBackground,
        paddingVertical: normalize(16),
        borderRadius: normalize(16),
        borderWidth: 2,
        borderColor: screenBackground,
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.15 : 0.08,
        shadowRadius: 4,
        elevation: 3,
        gap: normalize(10),
    },
    secondaryButtonText: {
        fontSize: normalize(17),
        fontWeight: '700',
        color: isDark ? ON_PRIMARY_COLOR : screenBackground,
        letterSpacing: 0.3,
    },
    outlineButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: normalize(14),
        borderRadius: normalize(16),
        borderWidth: 1.5,
        borderColor: colors.border,
        gap: normalize(8),
    },
    outlineButtonText: {
        fontSize: normalize(15),
        fontWeight: '600',
        color: colors.textSecondary,
    },
    // Карточка поддержки
    supportCard: {
        backgroundColor: colors.cardBackground,
        marginHorizontal: normalize(20),
        marginTop: normalize(24),
        padding: normalize(20),
        borderRadius: normalize(16),
        alignItems: 'center',
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.15 : 0.06,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: isDark ? 1 : 0,
        borderColor: colors.border,
    },
    supportIcon: {
        marginBottom: normalize(12),
    },
    supportTitle: {
        fontSize: normalize(18),
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: normalize(8),
    },
    supportText: {
        fontSize: normalize(14),
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: normalize(16),
        lineHeight: normalize(20),
    },
    supportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(10),
        borderRadius: normalize(20),
        backgroundColor: isDark ? screenBackground : (colors.primarySoft || (colors.primary + '1A')),
        gap: normalize(6),
    },
    supportButtonText: {
        fontSize: normalize(14),
        fontWeight: '600',
        color: isDark ? ON_PRIMARY_COLOR : colors.primary,
    },
    });
};