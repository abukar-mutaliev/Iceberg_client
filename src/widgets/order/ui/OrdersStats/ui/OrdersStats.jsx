import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

// Простые утилиты для форматирования (поскольку импорт из entities может не работать)
const formatAmount = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB'
    }).format(amount || 0);
};

const ORDER_STATUS_LABELS = {
    'PENDING': 'В ожидании',
    'CONFIRMED': 'Подтвержден',
    'IN_DELIVERY': 'В доставке',
    'DELIVERED': 'Доставлен',
    'CANCELLED': 'Отменен',
    'RETURNED': 'Возвращен'
};

const ORDER_STATUS_COLORS = {
    'PENDING': '#ff9800',
    'CONFIRMED': '#2196f3',
    'IN_DELIVERY': '#3f51b5',
    'DELIVERED': '#4caf50',
    'CANCELLED': '#f44336',
    'RETURNED': '#9e9e9e'
};

/**
 * Компонент статистики заказов для дашборда персонала
 * @param {Object} props
 * @param {Object} props.data - Данные для статистики
 * @param {Function} props.onClose - Обработчик закрытия панели
 * @param {Object} props.style - Дополнительные стили
 */
export const OrdersStats = ({
                         data,
                         onClose,
                         style
                     }) => {
    const [selectedPeriod, setSelectedPeriod] = useState('today');
    const [expandedCard, setExpandedCard] = useState(null);

    // Обработка данных для отображения
    const processedData = useMemo(() => {
        if (!data) {
            return {
                todayOrders: { count: 0, revenue: 0 },
                pendingOrders: { count: 0, oldestOrder: null },
                myAssignedOrders: { count: 0, urgentCount: 0 },
                urgentOrders: { count: 0, list: [] },
                stats: null
            };
        }

        return data;
    }, [data]);

    // Рендер карточки статистики
    const renderStatsCard = (title, value, subtitle, color = '#2196f3', icon, onPress) => {
        const isExpanded = expandedCard === title;

        return (
            <TouchableOpacity
                style={[
                    styles.statsCard,
                    { borderLeftColor: color },
                    isExpanded && styles.statsCardExpanded
                ]}
                onPress={() => {
                    setExpandedCard(isExpanded ? null : title);
                    onPress?.();
                }}
                activeOpacity={0.8}
            >
                <View style={styles.statsCardHeader}>
                    <View style={styles.statsCardIcon}>
                        <Icon name={icon} size={24} color={color} />
                    </View>
                    <View style={styles.statsCardContent}>
                        <Text style={styles.statsCardTitle}>{title}</Text>
                        <Text style={[styles.statsCardValue, { color }]}>{value}</Text>
                        {subtitle && (
                            <Text style={styles.statsCardSubtitle}>{subtitle}</Text>
                        )}
                    </View>
                    <Icon
                        name={isExpanded ? "expand-less" : "expand-more"}
                        size={20}
                        color="#666666"
                    />
                </View>
            </TouchableOpacity>
        );
    };

    // Рендер графика статусов
    const renderStatusChart = () => {
        if (!processedData.stats?.statusDistribution) return null;

        const statusData = Object.entries(processedData.stats.statusDistribution)
            .map(([status, count]) => ({
                status,
                count,
                label: ORDER_STATUS_LABELS[status] || status,
                color: ORDER_STATUS_COLORS[status] || '#666666'
            }))
            .sort((a, b) => b.count - a.count);

        const total = statusData.reduce((sum, item) => sum + item.count, 0);

        return (
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Распределение по статусам</Text>
                <View style={styles.statusChart}>
                    {statusData.map((item, index) => {
                        const percentage = total > 0 ? (item.count / total) * 100 : 0;

                        return (
                            <View key={item.status} style={styles.statusRow}>
                                <View style={styles.statusInfo}>
                                    <View
                                        style={[
                                            styles.statusIndicator,
                                            { backgroundColor: item.color }
                                        ]}
                                    />
                                    <Text style={styles.statusLabel}>{item.label}</Text>
                                </View>
                                <View style={styles.statusValues}>
                                    <Text style={styles.statusCount}>{item.count}</Text>
                                    <Text style={styles.statusPercentage}>
                                        {percentage.toFixed(1)}%
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    // Рендер списка срочных заказов
    const renderUrgentOrders = () => {
        if (!processedData.urgentOrders.list?.length) return null;

        return (
            <View style={styles.urgentOrdersContainer}>
                <Text style={styles.urgentOrdersTitle}>
                    🔥 Срочные заказы ({processedData.urgentOrders.count})
                </Text>
                {processedData.urgentOrders.list.slice(0, 3).map((order) => (
                    <View key={order.id} style={styles.urgentOrderItem}>
                        <View style={styles.urgentOrderInfo}>
                            <Text style={styles.urgentOrderNumber}>
                                {order.orderNumber}
                            </Text>
                            <Text style={styles.urgentOrderClient}>
                                {order.client?.name}
                            </Text>
                        </View>
                        <View style={styles.urgentOrderAmount}>
                            <Text style={styles.urgentOrderAmountText}>
                                {formatAmount(order.totalAmount)}
                            </Text>
                        </View>
                    </View>
                ))}
                {processedData.urgentOrders.count > 3 && (
                    <Text style={styles.urgentOrdersMore}>
                        и ещё {processedData.urgentOrders.count - 3} заказов...
                    </Text>
                )}
            </View>
        );
    };

    // Рендер топ товаров
    const renderTopProducts = () => {
        if (!processedData.stats?.topProducts?.length) return null;

        return (
            <View style={styles.topProductsContainer}>
                <Text style={styles.topProductsTitle}>Популярные товары</Text>
                {processedData.stats.topProducts.slice(0, 5).map((product, index) => (
                    <View key={product.productId} style={styles.topProductItem}>
                        <View style={styles.topProductRank}>
                            <Text style={styles.topProductRankText}>{index + 1}</Text>
                        </View>
                        <View style={styles.topProductInfo}>
                            <Text style={styles.topProductName} numberOfLines={1}>
                                {product.product?.name || 'Неизвестный товар'}
                            </Text>
                            <Text style={styles.topProductStats}>
                                {product.totalQuantity} шт. • {product.ordersCount} заказов
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <View style={[styles.container, style]}>
            {/* Заголовок */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Статистика заказов</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Icon name="close" size={24} color="#666666" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Основные метрики */}
                <View style={styles.metricsGrid}>
                    {renderStatsCard(
                        'Сегодня',
                        processedData.todayOrders.count.toString(),
                        `Выручка: ${formatAmount(processedData.todayOrders.revenue)}`,
                        '#4caf50',
                        'today'
                    )}

                    {renderStatsCard(
                        'В ожидании',
                        processedData.pendingOrders.count.toString(),
                        processedData.pendingOrders.oldestOrder
                            ? `Старейший: ${new Date(processedData.pendingOrders.oldestOrder.createdAt).toLocaleDateString('ru-RU')}`
                            : 'Нет ожидающих',
                        '#ff9800',
                        'schedule'
                    )}

                    {renderStatsCard(
                        'Мои заказы',
                        processedData.myAssignedOrders.count.toString(),
                        `Срочных: ${processedData.myAssignedOrders.urgentCount}`,
                        '#2196f3',
                        'person'
                    )}

                    {renderStatsCard(
                        'Срочные',
                        processedData.urgentOrders.count.toString(),
                        'Требуют внимания',
                        '#f44336',
                        'priority-high'
                    )}
                </View>

                {/* Дополнительная статистика */}
                {processedData.stats && (
                    <View style={styles.additionalStats}>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>Общая сводка</Text>
                            <View style={styles.summaryGrid}>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>Всего заказов</Text>
                                    <Text style={styles.summaryValue}>
                                        {processedData.stats.summary?.totalOrders || 0}
                                    </Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>Общая выручка</Text>
                                    <Text style={styles.summaryValue}>
                                        {formatAmount(processedData.stats.summary?.totalRevenue || 0)}
                                    </Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.summaryLabel}>Средний чек</Text>
                                    <Text style={styles.summaryValue}>
                                        {formatAmount(processedData.stats.summary?.averageOrderValue || 0)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* График статусов */}
                        {renderStatusChart()}

                        {/* Срочные заказы */}
                        {renderUrgentOrders()}

                        {/* Топ товары */}
                        {renderTopProducts()}
                    </View>
                )}

                {/* Отступ снизу */}
                <View style={styles.bottomPadding} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        maxHeight: '70%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    metricsGrid: {
        padding: 16,
        gap: 12,
    },
    statsCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statsCardExpanded: {
        borderWidth: 1,
        borderColor: '#e3f2fd',
    },
    statsCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statsCardIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    statsCardContent: {
        flex: 1,
    },
    statsCardTitle: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 4,
    },
    statsCardValue: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 2,
    },
    statsCardSubtitle: {
        fontSize: 12,
        color: '#666666',
    },
    additionalStats: {
        padding: 16,
        gap: 16,
    },
    summaryCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 16,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#666666',
        marginBottom: 4,
        textAlign: 'center',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        textAlign: 'center',
    },
    chartContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    statusChart: {
        gap: 12,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    statusLabel: {
        fontSize: 14,
        color: '#1a1a1a',
        flex: 1,
    },
    statusValues: {
        alignItems: 'flex-end',
        minWidth: 60,
    },
    statusCount: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    statusPercentage: {
        fontSize: 12,
        color: '#666666',
    },
    urgentOrdersContainer: {
        backgroundColor: '#fff3e0',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#ffab40',
    },
    urgentOrdersTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ef6c00',
        marginBottom: 12,
    },
    urgentOrderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ffcc80',
    },
    urgentOrderInfo: {
        flex: 1,
    },
    urgentOrderNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    urgentOrderClient: {
        fontSize: 12,
        color: '#666666',
    },
    urgentOrderAmount: {
        alignItems: 'flex-end',
    },
    urgentOrderAmountText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ef6c00',
    },
    urgentOrdersMore: {
        fontSize: 12,
        color: '#ef6c00',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },
    topProductsContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    topProductsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    topProductItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    topProductRank: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#2196f3',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    topProductRankText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ffffff',
    },
    topProductInfo: {
        flex: 1,
    },
    topProductName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    topProductStats: {
        fontSize: 12,
        color: '#666666',
    },
    bottomPadding: {
        height: 20,
    },
});

