import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { createOrderDetailsStyles } from '@shared/ui/OrderDetailsStyles';

const styles = createOrderDetailsStyles();

export const WaitingStockInfo = ({ order }) => {
    if (!order || order.status !== 'WAITING_STOCK') return null;

    // Вычисляем количество дней ожидания
    const daysSinceCreated = Math.floor(
        (Date.now() - new Date(order.createdAt).getTime()) / (24 * 60 * 60 * 1000)
    );

    // Ожидаемая дата поступления
    const expectedDate = order.expectedDeliveryDate ? 
        new Date(order.expectedDeliveryDate) : null;
    
    const formatExpectedDate = () => {
        if (!expectedDate) return 'уточняется';
        
        const diffDays = Math.ceil((expectedDate - new Date()) / (24 * 60 * 60 * 1000));
        
        if (diffDays < 0) return 'просрочено';
        if (diffDays === 0) return 'сегодня';
        if (diffDays === 1) return 'завтра';
        if (diffDays === 2) return 'послезавтра';
        
        return expectedDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short'
        });
    };

    const isOverdue = expectedDate && expectedDate < new Date();

    return (
        <View style={styles.waitingStockInfo}>
            <View style={styles.waitingStockHeader}>
                <View style={[styles.waitingStockIcon, isOverdue && styles.waitingStockIconOverdue]}>
                    <Icon 
                        name={isOverdue ? "warning" : "inventory"} 
                        size={24} 
                        color="#fff" 
                    />
                </View>
                <View style={styles.waitingStockTextContainer}>
                    <Text style={styles.waitingStockTitle}>
                        {isOverdue ? '⚠️ Товар закончился на складе' : '📦 Товар закончился на складе'}
                    </Text>
                    <Text style={styles.waitingStockSubtitle}>
                        Клиент ожидает поступления товара
                    </Text>
                </View>
            </View>

            <View style={styles.waitingStockDetails}>
                <View style={styles.waitingStockDetailRow}>
                    <Text style={styles.waitingStockDetailLabel}>Склад:</Text>
                    <Text style={styles.waitingStockDetailValue}>
                        {order.warehouse?.name || 'Не указан'}
                    </Text>
                </View>
                
                <View style={styles.waitingStockDetailRow}>
                    <Text style={styles.waitingStockDetailLabel}>В ожидании:</Text>
                    <Text style={styles.waitingStockDetailValue}>
                        {daysSinceCreated === 0 
                            ? 'Заказ создан сегодня'
                            : `${daysSinceCreated} дн.`
                        }
                    </Text>
                </View>

                <View style={styles.waitingStockDetailRow}>
                    <Text style={styles.waitingStockDetailLabel}>Ожидаемое поступление:</Text>
                    <Text style={[
                        styles.waitingStockDetailValue,
                        isOverdue && styles.waitingStockDetailValueOverdue
                    ]}>
                        {formatExpectedDate()}
                    </Text>
                </View>
            </View>

            <View style={styles.waitingStockMessage}>
                <Text style={styles.waitingStockMessageText}>
                    {isOverdue 
                        ? 'Товар поступил с задержкой. Необходимо связаться с поставщиком и уведомить клиента.'
                        : 'Как только товар поступит на склад, заказ будет автоматически переведен в статус "Подтвержден" и назначен на сборку.'
                    }
                </Text>
            </View>
        </View>
    );
};
