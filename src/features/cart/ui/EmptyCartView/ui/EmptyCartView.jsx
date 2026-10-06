import React from "react";
import {
    Text,
    TouchableOpacity,
    View,
    StyleSheet,
    Animated,
    Dimensions,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
    FontFamily,
    FontSize,
    Shadow,
    Border,
    Padding
} from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { OrderApi } from '@entities/order';
import {
    formatAmount,
    formatOrderNumber,
    getClientStatusLabel,
    ORDER_STATUS_COLORS,
    ORDER_STATUS_ICONS,
} from '@entities/order/lib/utils';
import { getOrderProgress } from '@shared/lib/orderUtils';
import { ReliableImage, normalizeImageSource } from '@shared/ui/ReliableImage';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 80;

const ACTIVE_STATUSES = new Set([
    'AWAITING_CONFIRMATION',
    'PENDING_PAYMENT',
    'PENDING',
    'CONFIRMED',
    'PICKING',
    'WAITING_STOCK',
    'IN_DELIVERY',
]);

const getBoxesText = (count) => {
    const value = Number(count) || 0;
    if (value % 10 === 1 && value % 100 !== 11) return 'коробка';
    if ([2, 3, 4].includes(value % 10) && ![12, 13, 14].includes(value % 100)) return 'коробки';
    return 'коробок';
};

const getOrderItems = (order) => order?.items || order?.orderItems || [];

const normalizeProductImagePath = (value) => {
    if (!value || typeof value !== 'string') return null;
    if (/^https?:\/\//i.test(value)) return value;

    let normalized = value.replace(/^\/+/, '').replace(/\\/g, '/');
    if (!normalized) return null;
    if (normalized.startsWith('uploads/')) {
        normalized = normalized.replace(/^uploads\//, '');
    }
    if (!normalized.includes('/')) {
        return `products/${normalized}`;
    }
    return normalized;
};

const getProductImageSource = (product) => {
    if (!product) return null;

    const images = product.images;
    let rawPath = null;

    if (Array.isArray(images) && images.length > 0) {
        const firstImage = images.find(Boolean);
        if (typeof firstImage === 'string') {
            rawPath = firstImage;
        } else if (firstImage && typeof firstImage === 'object') {
            rawPath = firstImage.url || firstImage.uri || firstImage.path || firstImage.src;
        }
    } else if (typeof images === 'string' && images.trim()) {
        rawPath = images.trim();
    }

    if (!rawPath && typeof product.image === 'string') {
        rawPath = product.image;
    }
    if (!rawPath && typeof product.imageUrl === 'string') {
        rawPath = product.imageUrl;
    }

    const imagePath = normalizeProductImagePath(rawPath);
    return imagePath ? normalizeImageSource(imagePath) : null;
};

const formatOrderDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatShortDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
    });
};

const ActiveOrderCard = ({ order, onPress, styles, colors }) => {
    const items = getOrderItems(order);
    const mainItem = items[0];
    const imageSource = getProductImageSource(mainItem?.product);
    const statusColor = ORDER_STATUS_COLORS[order.status] || colors.primary;
    const statusIcon = ORDER_STATUS_ICONS[order.status] || 'help';
    const progress = getOrderProgress(order.status);
    const amount = order.isEstimatedPrice
        ? (order.estimatedAmount ?? order.totalAmount)
        : order.totalAmount;
    const deliveryDate = order.expectedDeliveryDate || order.deliveryDate;

    return (
        <TouchableOpacity
            style={styles.orderCard}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <View style={styles.orderCardHeader}>
                <View style={styles.orderCardTitleBlock}>
                    <Text style={styles.orderNumber}>{formatOrderNumber(order.orderNumber)}</Text>
                    <Text style={styles.orderDate}>{formatOrderDate(order.createdAt)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Icon name={statusIcon} size={12} color="#FFFFFF" />
                    <Text style={styles.statusText} numberOfLines={1}>
                        {getClientStatusLabel(order)}
                    </Text>
                </View>
            </View>

            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${progress}%`, backgroundColor: statusColor },
                        ]}
                    />
                </View>
                <Text style={[styles.progressText, { color: statusColor }]}>
                    {progress}% выполнено
                </Text>
            </View>

            <View style={styles.orderBody}>
                <View style={styles.productImageWrap}>
                    <ReliableImage
                        source={imageSource}
                        style={styles.productImage}
                        resizeMode="cover"
                        placeholderIconSize={22}
                    />
                </View>
                <View style={styles.orderBodyText}>
                    {items.slice(0, 2).map((item, index) => (
                        <View key={item.id || index} style={styles.itemRow}>
                            <Text style={styles.itemName} numberOfLines={1}>
                                {item.product?.name || 'Товар'}
                            </Text>
                            <Text style={styles.itemQuantity}>
                                {item.quantity} {getBoxesText(item.quantity)}
                            </Text>
                        </View>
                    ))}
                    {items.length > 2 && (
                        <Text style={styles.moreItems}>ещё {items.length - 2}</Text>
                    )}
                    {!items.length && (
                        <Text style={styles.itemName}>Состав заказа</Text>
                    )}
                </View>
                <Icon name="chevron-right" size={22} color={colors.textTertiary} />
            </View>

            <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>
                    {order.isEstimatedPrice ? 'Ориентировочно' : 'Сумма'}
                </Text>
                <Text style={styles.amountValue}>{formatAmount(amount)}</Text>
            </View>

            {(deliveryDate || order.deliveryAddress || order.warehouse?.name) && (
                <View style={styles.metaBlock}>
                    {deliveryDate && (
                        <View style={styles.metaRow}>
                            <Icon name="local-shipping" size={14} color={colors.success} />
                            <Text style={styles.metaText}>Доставка {formatShortDate(deliveryDate)}</Text>
                        </View>
                    )}
                    {!!order.deliveryAddress && (
                        <View style={styles.metaRow}>
                            <Icon name="location-on" size={14} color={colors.textSecondary} />
                            <Text style={styles.metaText} numberOfLines={2}>{order.deliveryAddress}</Text>
                        </View>
                    )}
                    {!order.deliveryAddress && !!order.warehouse?.name && (
                        <View style={styles.metaRow}>
                            <Icon name="store" size={14} color={colors.textSecondary} />
                            <Text style={styles.metaText} numberOfLines={1}>{order.warehouse.name}</Text>
                        </View>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

export const EmptyCartView = ({ navigation }) => {
    const { colors, isDark } = useTheme();
    const emptyStyles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
    const userRole = useSelector(state => state.auth?.user?.role);
    const canViewOrders = isAuthenticated && userRole === 'CLIENT';

    const [activeOrders, setActiveOrders] = React.useState([]);
    const [ordersLoading, setOrdersLoading] = React.useState(canViewOrders);
    const [refreshing, setRefreshing] = React.useState(false);
    const hasLoadedRef = React.useRef(false);

    const cartBounce = React.useRef(new Animated.Value(0)).current;
    const cartScale = React.useRef(new Animated.Value(1)).current;
    const textOpacity = React.useRef(new Animated.Value(0)).current;

    const loadActiveOrders = React.useCallback(async ({ silent = false } = {}) => {
        if (!canViewOrders) {
            setActiveOrders([]);
            setOrdersLoading(false);
            setRefreshing(false);
            hasLoadedRef.current = false;
            return;
        }

        if (!silent && !hasLoadedRef.current) {
            setOrdersLoading(true);
        }

        try {
            const response = await OrderApi.getMyOrders({
                page: 1,
                limit: 30,
                sortBy: 'createdAt',
                sortOrder: 'desc',
            });

            const orders = response?.status === 'success' ? (response.data || []) : [];
            setActiveOrders(orders.filter((order) => ACTIVE_STATUSES.has(order.status)));
            hasLoadedRef.current = true;
        } catch (error) {
            console.warn('EmptyCartView: не удалось загрузить активные заказы', error);
        } finally {
            setOrdersLoading(false);
            setRefreshing(false);
        }
    }, [canViewOrders]);

    useFocusEffect(
        React.useCallback(() => {
            loadActiveOrders();
        }, [loadActiveOrders])
    );

    useFocusEffect(
        React.useCallback(() => {
            Animated.sequence([
                Animated.timing(cartBounce, {
                    toValue: -30,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(cartBounce, {
                    toValue: 0,
                    friction: 4,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();

            Animated.loop(
                Animated.sequence([
                    Animated.timing(cartScale, {
                        toValue: 1.05,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(cartScale, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 800,
                delay: 500,
                useNativeDriver: true,
            }).start();

            return () => {
                cartBounce.setValue(0);
                textOpacity.setValue(0);
                cartScale.stopAnimation();
            };
        }, [cartBounce, textOpacity, cartScale])
    );

    const hasActiveOrders = activeOrders.length > 0;

    const openOrder = (orderId) => {
        navigation.navigate('OrderDetails', { orderId, fromScreen: 'EmptyCart' });
    };

    const openMyOrders = () => {
        navigation.navigate('MyOrders', { fromScreen: 'EmptyCart' });
    };

    return (
        <View style={emptyStyles.container}>
            <ScrollView
                style={emptyStyles.scroll}
                contentContainerStyle={[
                    emptyStyles.scrollContent,
                    !hasActiveOrders && !ordersLoading && emptyStyles.scrollContentCentered,
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={canViewOrders ? (
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            loadActiveOrders({ silent: true });
                        }}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                ) : undefined}
            >
                <View style={[emptyStyles.hero, hasActiveOrders && emptyStyles.heroCompact]}>
                    <Animated.View
                        style={[
                            emptyStyles.iconContainer,
                            hasActiveOrders && emptyStyles.iconContainerCompact,
                            {
                                transform: [
                                    { translateY: cartBounce },
                                    { scale: cartScale }
                                ],
                            },
                        ]}
                    >
                        <View style={emptyStyles.cartIcon}>
                            <View style={emptyStyles.cartBase}>
                                <View style={emptyStyles.cartBaseFront} />
                            </View>
                            <View style={emptyStyles.cartHandle} />
                            <View style={emptyStyles.cartWheel1} />
                            <View style={emptyStyles.cartWheel2} />
                        </View>
                    </Animated.View>

                    <Animated.Text style={[emptyStyles.heading, { opacity: textOpacity }]}>
                        Ваша корзина пуста
                    </Animated.Text>

                    <Animated.Text style={[emptyStyles.description, { opacity: textOpacity }]}>
                        {hasActiveOrders
                            ? 'Новые товары можно добавить из каталога. Ниже — заказы, которые сейчас в работе.'
                            : 'Добавьте товары в корзину, чтобы оформить заказ. Выберите товары из каталога и нажмите на "+".'}
                    </Animated.Text>
                </View>

                {canViewOrders && ordersLoading && !hasActiveOrders && (
                    <ActivityIndicator
                        style={emptyStyles.ordersLoader}
                        size="small"
                        color={colors.primary}
                    />
                )}

                {hasActiveOrders && (
                    <View style={emptyStyles.ordersSection}>
                        <View style={emptyStyles.sectionHeader}>
                            <Text style={emptyStyles.sectionTitle}>Активные заказы</Text>
                            <TouchableOpacity onPress={openMyOrders} activeOpacity={0.7}>
                                <Text style={emptyStyles.sectionLink}>Все</Text>
                            </TouchableOpacity>
                        </View>

                        {activeOrders.map((order) => (
                            <ActiveOrderCard
                                key={order.id}
                                order={order}
                                onPress={() => openOrder(order.id)}
                                styles={emptyStyles}
                                colors={colors}
                            />
                        ))}
                    </View>
                )}

                <Animated.View style={[emptyStyles.buttonsContainer, { opacity: textOpacity }]}>
                    <TouchableOpacity
                        style={emptyStyles.button}
                        onPress={() => navigation.navigate('MainTab')}
                        activeOpacity={0.8}
                    >
                        <Text style={emptyStyles.buttonText}>
                            Перейти к товарам
                        </Text>
                    </TouchableOpacity>

                    {canViewOrders && (
                        <TouchableOpacity
                            style={emptyStyles.ordersButton}
                            onPress={openMyOrders}
                            activeOpacity={0.7}
                        >
                            <Text style={emptyStyles.ordersButtonText}>
                                Мои заказы
                            </Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </ScrollView>

            <View style={emptyStyles.backgroundDecoration} pointerEvents="none">
                <View style={emptyStyles.circle1} />
                <View style={emptyStyles.circle2} />
                <View style={emptyStyles.circle3} />
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scroll: {
        flex: 1,
        zIndex: 2,
    },
    scrollContent: {
        paddingHorizontal: Padding.large,
        paddingTop: Padding.large,
        paddingBottom: TAB_BAR_HEIGHT + Padding.large,
    },
    scrollContentCentered: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    hero: {
        alignItems: 'center',
        marginBottom: Padding.medium,
    },
    heroCompact: {
        marginBottom: Padding.small,
    },
    iconContainer: {
        marginBottom: Padding.large * 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainerCompact: {
        marginBottom: Padding.medium,
    },
    heading: {
        fontSize: FontSize.xxxlarge + 4,
        fontWeight: '700',
        fontFamily: FontFamily.sFProDisplay,
        color: colors.textPrimary,
        marginBottom: Padding.medium,
        textAlign: 'center',
    },
    description: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: Padding.large,
        lineHeight: 24,
        maxWidth: width * 0.86,
    },
    ordersLoader: {
        marginBottom: Padding.large,
    },
    ordersSection: {
        width: '100%',
        marginBottom: Padding.large,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Padding.medium,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: FontSize.size_lg || 18,
        fontWeight: '700',
        fontFamily: FontFamily.sFProDisplay,
        color: colors.textPrimary,
    },
    sectionLink: {
        fontSize: FontSize.size_md,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
        color: colors.primary,
    },
    orderCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    orderCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 10,
    },
    orderCardTitleBlock: {
        flex: 1,
    },
    orderNumber: {
        fontSize: 16,
        fontWeight: '700',
        fontFamily: FontFamily.sFProText,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    orderDate: {
        fontSize: 12,
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: width * 0.42,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        gap: 4,
    },
    statusText: {
        flexShrink: 1,
        fontSize: 11,
        fontWeight: '700',
        fontFamily: FontFamily.sFProText,
        color: '#FFFFFF',
    },
    progressContainer: {
        marginBottom: 12,
        gap: 4,
    },
    progressBar: {
        height: 6,
        backgroundColor: colors.primary + '1A',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 11,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
        textAlign: 'right',
    },
    orderBody: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    productImageWrap: {
        width: 52,
        height: 52,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    orderBodyText: {
        flex: 1,
        gap: 4,
    },
    itemRow: {
        gap: 1,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
        color: colors.textPrimary,
    },
    itemQuantity: {
        fontSize: 12,
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
    },
    moreItems: {
        fontSize: 12,
        fontFamily: FontFamily.sFProText,
        color: colors.primary,
        fontWeight: '600',
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.primary + '0D',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    amountLabel: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
        color: colors.primary,
    },
    amountValue: {
        fontSize: 16,
        fontWeight: '800',
        fontFamily: FontFamily.sFProText,
        color: colors.primary,
    },
    metaBlock: {
        marginTop: 10,
        gap: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
    },
    metaText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        fontFamily: FontFamily.sFProText,
        color: colors.textSecondary,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: Padding.medium + 2,
        paddingHorizontal: Padding.large * 2,
        borderRadius: Border.br_xl,
        ...Shadow.button,
        minWidth: width * 0.6,
        alignItems: 'center',
    },
    buttonText: {
        color: colors.textInverse,
        fontSize: FontSize.size_md,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
    cartIcon: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartBase: {
        width: 90,
        height: 50,
        borderRadius: Border.br_3xs,
        backgroundColor: colors.primary,
        position: 'absolute',
        bottom: 20,
    },
    cartBaseFront: {
        width: 90,
        height: 20,
        borderTopLeftRadius: Border.br_3xs,
        borderTopRightRadius: Border.br_3xs,
        backgroundColor: colors.primarySoft,
        position: 'absolute',
        top: 0,
    },
    cartHandle: {
        width: 40,
        height: 40,
        borderWidth: 8,
        borderColor: colors.primary,
        borderRadius: 20,
        position: 'absolute',
        top: 15,
        backgroundColor: 'transparent',
    },
    cartWheel1: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primarySoft,
        position: 'absolute',
        bottom: 10,
        left: 25,
    },
    cartWheel2: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primarySoft,
        position: 'absolute',
        bottom: 10,
        right: 25,
    },
    backgroundDecoration: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
    },
    circle1: {
        position: 'absolute',
        top: -width * 0.3,
        right: -width * 0.3,
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        backgroundColor: colors.primarySoft,
        opacity: isDark ? 0.08 : 0.2,
    },
    circle2: {
        position: 'absolute',
        bottom: -width * 0.4,
        left: -width * 0.2,
        width: width * 0.6,
        height: width * 0.6,
        borderRadius: width * 0.3,
        backgroundColor: colors.surfaceSecondary,
        opacity: isDark ? 0.45 : 0.4,
    },
    circle3: {
        position: 'absolute',
        top: 420,
        right: -width * 0.1,
        width: width * 0.3,
        height: width * 0.3,
        borderRadius: width * 0.15,
        backgroundColor: colors.primarySoft,
        opacity: isDark ? 0.08 : 0.16,
    },
    buttonsContainer: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        gap: Padding.medium,
        marginTop: Padding.small,
    },
    ordersButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.primary,
        paddingVertical: Padding.medium,
        paddingHorizontal: Padding.large * 1.5,
        borderRadius: Border.br_xl,
        minWidth: width * 0.6,
        alignItems: 'center',
    },
    ordersButtonText: {
        color: colors.primary,
        fontSize: FontSize.size_md,
        fontWeight: '600',
        fontFamily: FontFamily.sFProText,
    },
});
