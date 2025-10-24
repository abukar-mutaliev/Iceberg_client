import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatAmount, formatOrderNumber } from "@entities/order/lib/utils";
import { getBaseUrl } from "@shared/api/api";

const { width } = Dimensions.get('window');

const ORDER_STATUS_COLORS = {
    WAITING_STOCK: '#fd7e14',
};

const ORDER_STATUS_ICONS = {
    WAITING_STOCK: 'inventory',
};

// Функция для правильного склонения слова "коробка"
const getBoxesText = (count) => {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'коробка';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'коробки';
    } else {
        return 'коробок';
    }
};

/**
 * Карточка заказа, ожидающего поставки
 * Отображает информацию о заказе, который ожидает поступления товара на склад
 * Не содержит кнопок действий, так как заказ нельзя взять в работу
 */
export const WaitingStockOrderCard = ({
    order,
    onPress,
    showClient = false,
    style,
    showEmployeeInfo = false,
    isRecentlyProcessed = false,
}) => {
    const statusColor = ORDER_STATUS_COLORS[order.status] || '#666';
    const statusIcon = ORDER_STATUS_ICONS[order.status] || 'help';

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return '';
        }
    };

    const renderClientInfo = () => {
        if (!showClient || !order.client) return null;

        return (
            <View style={styles.clientInfo}>
                <Icon name="person" size={16} color="#666" />
                <Text style={styles.clientName}>{order.client?.name || 'Клиент'}</Text>
                {order.client?.phone && (
                    <Text style={styles.clientPhone}>{order.client.phone}</Text>
                )}
            </View>
        );
    };

    const renderWaitingProducts = () => {
        // Проверяем оба возможных поля для товаров
        const items = order.orderItems || order.items || [];

        if (!items || items.length === 0) {
            return null;
        }

        return (
            <View style={styles.waitingProductsContainer}>
                <View style={styles.waitingProductsHeader}>
                    <Icon name="inventory" size={16} color="#fd7e14" />
                    <Text style={styles.waitingProductsTitle}>Ожидают поставки:</Text>
                </View>
                {items.slice(0, 3).map((item, index) => {
                    const imageUrl = item.product?.images?.[0] 
                        ? `${getBaseUrl()}/uploads/${item.product.images[0].replace(/\\/g, '/')}`
                        : null;
                    
                    return (
                        <View key={index} style={styles.productItem}>
                            {/* Изображение товара */}
                            <View style={styles.productImageContainer}>
                                {item.product?.images && item.product.images.length > 0 ? (
                                    <Image 
                                        source={{ uri: imageUrl }} 
                                        style={styles.productImage}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={styles.productImagePlaceholder}>
                                        <Icon name="inventory" size={20} color="#ccc" />
                                    </View>
                                )}
                            </View>
                            
                            {/* Информация о товаре */}
                            <View style={styles.productInfo}>
                                <Text style={styles.productName} numberOfLines={2}>
                                    {item.product?.name || 'Товар'}
                                </Text>
                                <Text style={styles.productQuantity}>
                                    {item.quantity} {getBoxesText(item.quantity)}
                                </Text>
                            </View>
                        </View>
                    );
                })}
                {items.length > 3 && (
                    <Text style={styles.additionalProducts}>
                        +{items.length - 3} товар(ов)
                    </Text>
                )}
            </View>
        );
    };

    const renderEmployeeInfo = () => {
        if (!showEmployeeInfo || !order.assignedTo) return null;

        return (
            <View style={styles.employeeInfo}>
                <Icon name="person-pin" size={16} color="#666" />
                <Text style={styles.employeeName}>
                    {order.assignedTo.name} {order.assignedTo.position}
                </Text>
            </View>
        );
    };

    const renderWaitingStatus = () => {
        const warehouseName = order.warehouse?.name || 'склад';
        
        return (
            <View style={styles.waitingStatusContainer}>
                <Icon name="schedule" size={20} color="#fd7e14" />
                <Text style={styles.waitingStatusText}>
                    Заказ ожидает поступления товара на {warehouseName}
                </Text>
            </View>
        );
    };

    return (
        <TouchableOpacity
            style={[styles.container, style]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Заголовок заказа */}
            <View style={styles.header}>
                <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>
                        {formatOrderNumber(order.orderNumber)}
                    </Text>
                    <Text style={styles.orderDate}>
                        {formatDate(order.createdAt)}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Icon name={statusIcon} size={16} color="#fff" />
                    <Text style={styles.statusText}>Ожидает поставки</Text>
                </View>
            </View>

            {/* Информация о клиенте */}
            {renderClientInfo()}

            {/* Товары, ожидающие поставки */}
            {renderWaitingProducts()}

            {/* Информация о сотруднике */}
            {renderEmployeeInfo()}

            {/* Сумма заказа */}
            <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Сумма заказа:</Text>
                <Text style={styles.amountValue}>
                    {formatAmount(order.totalAmount)}
                </Text>
            </View>

            {/* Адрес доставки */}
            {order.deliveryAddress && (
                <View style={styles.deliveryContainer}>
                    <Icon name="location-on" size={16} color="#666" />
                    <Text style={styles.deliveryAddress} numberOfLines={2}>
                        {order.deliveryAddress}
                    </Text>
                </View>
            )}

            {/* Комментарий */}
            {order.comment && (
                <View style={styles.commentContainer}>
                    <Icon name="comment" size={16} color="#666" />
                    <Text style={styles.commentText} numberOfLines={2}>
                        {order.comment}
                    </Text>
                </View>
            )}

            {/* Статус ожидания */}
            {renderWaitingStatus()}

            {/* Индикатор недавней обработки */}
            {isRecentlyProcessed && (
                <View style={styles.recentlyProcessedIndicator}>
                    <Text style={styles.recentlyProcessedText}>Недавно обработан</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 4,
        marginVertical: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: '#fd7e14',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    orderInfo: {
        flex: 1,
    },
    orderNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    orderDate: {
        fontSize: 12,
        color: '#666',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    clientInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    clientName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginLeft: 8,
        flex: 1,
    },
    clientPhone: {
        fontSize: 12,
        color: '#666',
        marginLeft: 8,
    },
    waitingProductsContainer: {
        marginBottom: 12,
        padding: 12,
        backgroundColor: '#fff3e0',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffcc02',
    },
    waitingProductsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    waitingProductsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#e65100',
        marginLeft: 6,
    },
    productItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingVertical: 4,
    },
    productImageContainer: {
        width: 50,
        height: 50,
        marginRight: 12,
    },
    productImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
    },
    productImagePlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 14,
        color: '#1a1a1a',
        fontWeight: '500',
        marginBottom: 4,
        lineHeight: 18,
    },
    productQuantity: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    additionalProducts: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 4,
    },
    warehouseContainer: {
        marginBottom: 12,
        padding: 12,
        backgroundColor: '#e3f2fd',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bbdefb',
    },
    warehouseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    warehouseTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1976d2',
        marginLeft: 6,
    },
    warehouseName: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    warehouseDistrict: {
        fontSize: 12,
        color: '#666',
    },
    employeeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 6,
    },
    employeeName: {
        fontSize: 13,
        color: '#666',
        marginLeft: 6,
        flex: 1,
    },
    amountContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    amountLabel: {
        fontSize: 14,
        color: '#666',
    },
    amountValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    deliveryContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    deliveryAddress: {
        fontSize: 13,
        color: '#666',
        marginLeft: 6,
        flex: 1,
        lineHeight: 18,
    },
    commentContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    commentText: {
        fontSize: 13,
        color: '#666',
        marginLeft: 6,
        flex: 1,
        lineHeight: 18,
    },
    waitingStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff3e0',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffcc02',
    },
    waitingStatusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#e65100',
        marginLeft: 8,
        textAlign: 'center',
    },
    recentlyProcessedIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#4caf50',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    recentlyProcessedText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
});
