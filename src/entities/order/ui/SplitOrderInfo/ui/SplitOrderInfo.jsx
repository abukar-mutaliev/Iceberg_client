import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
// Импортируем напрямую из API, чтобы избежать циклической зависимости
import { OrderApi } from '../../../api/orderApi';

const { width: screenWidth } = Dimensions.get('window');

const normalize = (size) => {
    const scale = screenWidth / 375;
    return Math.round(size * scale);
};

export const SplitOrderInfo = ({ 
    originalOrderNumber,
    onOrderPress,
    style = {} 
}) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const [splitOrders, setSplitOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadSplitOrderInfo();
    }, [originalOrderNumber]);

    const loadSplitOrderInfo = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await OrderApi.getSplitOrderInfo(originalOrderNumber);
            
            if (response.status === 'success') {
                setSplitOrders(response.data || []);
            } else {
                throw new Error(response.message || 'Не удалось загрузить информацию о разделенных заказах');
            }
        } catch (err) {
            console.error('Ошибка загрузки информации о разделенных заказах:', err);
            setError(err.message || 'Ошибка загрузки');
        } finally {
            setLoading(false);
        }
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getOrderTypeInfo = (order) => {
        if (order.isImmediate) {
            return {
                title: 'Немедленная доставка',
                subtitle: 'Товары в наличии',
                color: '#28a745',
                icon: 'local-shipping',
                bgColor: isDark ? colors.surface : '#f8fff9'
            };
        } else if (order.isWaiting) {
            return {
                title: 'Ожидает поступления',
                subtitle: 'Товары будут доставлены после поступления',
                color: '#fd7e14',
                icon: 'inventory',
                bgColor: isDark ? colors.surface : '#fff8f0'
            };
        }
        return {
            title: 'Заказ',
            subtitle: 'Обычный заказ',
            color: colors.textTertiary,
            icon: 'shopping-cart',
            bgColor: colors.surface
        };
    };

    const getStatusColor = (status) => {
        const statusColors = {
            'PENDING': '#ffc107',
            'CONFIRMED': '#17a2b8',
            'WAITING_STOCK': '#fd7e14',
            'IN_DELIVERY': '#007bff',
            'DELIVERED': '#28a745',
            'CANCELLED': '#dc3545',
            'RETURNED': '#6c757d'
        };
        return statusColors[status] || '#6c757d';
    };

    const getStatusLabel = (status) => {
        const statusLabels = {
            'PENDING': 'Ожидает',
            'CONFIRMED': 'Подтвержден',
            'WAITING_STOCK': 'Ожидает товар',
            'IN_DELIVERY': 'В доставке',
            'DELIVERED': 'Доставлен',
            'CANCELLED': 'Отменен',
            'RETURNED': 'Возвращен'
        };
        return statusLabels[status] || status;
    };

    if (loading) {
        return (
            <View style={[styles.container, style]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>Загрузка информации о разделенных заказах...</Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, style]}>
                <View style={styles.errorContainer}>
                    <Icon name="error-outline" size={24} color={colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={loadSplitOrderInfo}>
                        <Text style={styles.retryButtonText}>Повторить</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (splitOrders.length === 0) {
        return null;
    }

    return (
        <View style={[styles.container, style]}>
            <View style={styles.header}>
                <Icon name="call-split" size={20} color={colors.primary} />
                <Text style={styles.headerTitle}>Разделенные заказы</Text>
            </View>

            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {splitOrders.map((order, index) => {
                    const typeInfo = getOrderTypeInfo(order);
                    const statusColor = getStatusColor(order.status);
                    
                    return (
                        <TouchableOpacity
                            key={order.id}
                            style={[
                                styles.orderCard,
                                { backgroundColor: typeInfo.bgColor },
                                index === splitOrders.length - 1 && styles.lastCard
                            ]}
                            onPress={() => onOrderPress?.(order)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.cardHeader}>
                                <View style={[styles.typeIcon, { backgroundColor: typeInfo.color }]}>
                                    <Icon name={typeInfo.icon} size={16} color="#fff" />
                                </View>
                                <View style={styles.cardTitleContainer}>
                                    <Text style={styles.cardTitle}>{typeInfo.title}</Text>
                                    <Text style={styles.cardSubtitle}>{typeInfo.subtitle}</Text>
                                </View>
                            </View>

                            <View style={styles.orderInfo}>
                                <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                                <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                            </View>

                            <View style={styles.orderStats}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>Товаров:</Text>
                                    <Text style={styles.statValue}>{order.itemsCount}</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>Сумма:</Text>
                                    <Text style={styles.statValue}>{formatAmount(order.totalAmount)}</Text>
                                </View>
                            </View>

                            <View style={styles.statusContainer}>
                                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                                    <Text style={styles.statusText}>
                                        {getStatusLabel(order.status)}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        backgroundColor: colors.cardBackground,
        borderRadius: normalize(12),
        marginVertical: normalize(8),
        marginHorizontal: normalize(20),
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.2 : 0.1,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: isDark ? 1 : 0,
        borderColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: normalize(16),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: colors.textPrimary,
        marginLeft: normalize(8),
    },
    scrollContent: {
        padding: normalize(16),
        paddingTop: normalize(12),
    },
    orderCard: {
        width: normalize(280),
        borderRadius: normalize(12),
        padding: normalize(16),
        marginRight: normalize(12),
        borderWidth: 1,
        borderColor: colors.border,
    },
    lastCard: {
        marginRight: 0,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(12),
    },
    typeIcon: {
        width: normalize(32),
        height: normalize(32),
        borderRadius: normalize(16),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(12),
    },
    cardTitleContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(2),
    },
    cardSubtitle: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        lineHeight: normalize(16),
    },
    orderInfo: {
        marginBottom: normalize(12),
    },
    orderNumber: {
        fontSize: normalize(13),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(4),
    },
    orderDate: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
    },
    orderStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: normalize(12),
    },
    statItem: {
        flex: 1,
    },
    statLabel: {
        fontSize: normalize(11),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        marginBottom: normalize(2),
    },
    statValue: {
        fontSize: normalize(13),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: colors.textPrimary,
    },
    statusContainer: {
        alignItems: 'flex-start',
    },
    statusBadge: {
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        borderRadius: normalize(12),
    },
    statusText: {
        fontSize: normalize(11),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#fff',
        textTransform: 'uppercase',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: normalize(20),
    },
    loadingText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        marginLeft: normalize(8),
    },
    errorContainer: {
        alignItems: 'center',
        padding: normalize(20),
    },
    errorText: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.error,
        textAlign: 'center',
        marginVertical: normalize(8),
    },
    retryButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(8),
        borderRadius: normalize(8),
    },
    retryButtonText: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#fff',
    },
});
