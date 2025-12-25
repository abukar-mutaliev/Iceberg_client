import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Clipboard } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUS_ICONS } from '@shared/lib/orderConstants';
import { formatAmount, formatOrderNumber, formatDate, getOrderProgress } from '@shared/lib/orderUtils';
import { createOrderDetailsStyles } from '@shared/ui/OrderDetailsStyles';
import { useCustomAlert } from '@shared/ui/CustomAlert';

const styles = createOrderDetailsStyles();

export const OrderHeader = ({ order }) => {
    const navigation = useNavigation();
    const { showInfo } = useCustomAlert();

    const handleCopyOrderNumber = useCallback(() => {
        if (!order?.orderNumber) return;
        
        const formattedNumber = formatOrderNumber(order.orderNumber);
        Clipboard.setString(formattedNumber);
        showInfo('Скопировано', `Номер заказа ${formattedNumber} скопирован в буфер обмена`);
    }, [order, showInfo]);

    if (!order) return null;

    return (
        <View style={styles.headerContainer}>
            <View style={styles.headerGradient}>
                <View style={styles.headerContent}>
                <View style={styles.badgeContainer}>
                <View style={[styles.statusBadge, { backgroundColor: ORDER_STATUS_COLORS[order.status] }]}>
                            <Icon name={ORDER_STATUS_ICONS[order.status]} size={16} color="#fff" />
                            <Text style={styles.statusText}>{ORDER_STATUS_LABELS[order.status]}</Text>
                        </View>
                </View>
                    <View style={styles.headerTop}>
                
                        <View style={styles.orderNumberContainer}>
                            <View style={styles.orderNumberWithCopy}>
                                <Text style={styles.orderNumber}>
                                    {formatOrderNumber(order.orderNumber)}
                                </Text>
                                <TouchableOpacity
                                    style={styles.copyButtonHeader}
                                    onPress={handleCopyOrderNumber}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Icon name="content-copy" size={16} color="rgba(255, 255, 255, 0.9)" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.orderDate}>
                                {formatDate(order.createdAt)}
                            </Text>
                        </View>
                   
                    </View>

                    {/* Прогресс-бар */}
                    {['PENDING', 'CONFIRMED', 'WAITING_STOCK', 'IN_DELIVERY', 'DELIVERED'].includes(order.status) && (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${getOrderProgress(order.status)}%`,
                                            backgroundColor: ORDER_STATUS_COLORS[order.status],
                                            borderRadius: getOrderProgress(order.status) === 100 ? 0 : 3
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>
                                {getOrderProgress(order.status)}% выполнено
                            </Text>
                        </View>
                    )}

                    <View style={styles.amountContainer}>
                        <View style={styles.amountInfo}>
                            <Text style={styles.amountLabel}>Сумма заказа</Text>
                            <Text style={styles.amount}>{formatAmount(order.totalAmount)}</Text>
                        </View>
                        <View style={styles.amountIcon}>
                            <Icon name="payment" size={24} color="#fff" />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};


