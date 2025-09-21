import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatDate, canViewProcessingHistory } from '@shared/lib/orderUtils';
import { createOrderDetailsStyles } from '@shared/ui/OrderDetailsStyles';

const styles = createOrderDetailsStyles();

export const DeliveryInfo = ({ order, userRole, assignedTo }) => {
    if (!order) return null;

    return (
        <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
                <Icon name="local-shipping" size={24} color="#667eea" />
                <Text style={styles.cardTitle}>Информация о доставке</Text>
            </View>

            {order.deliveryAddress && (
                <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                        <Icon name="location-on" size={20} color="#667eea" />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Адрес доставки</Text>
                        <Text style={styles.infoValue}>{order.deliveryAddress}</Text>
                    </View>
                </View>
            )}

            {order.expectedDeliveryDate && (
                <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                        <Icon name="schedule" size={20} color="#667eea" />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Ожидаемая дата доставки</Text>
                        <Text style={styles.infoValue}>
                            {new Date(order.expectedDeliveryDate).toLocaleDateString('ru-RU')}
                        </Text>
                    </View>
                </View>
            )}

            {order.comment && (
                <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                        <Icon name="comment" size={20} color="#667eea" />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Комментарий</Text>
                        <Text style={styles.infoValue}>{order.comment}</Text>
                    </View>
                </View>
            )}

            {/* Информация о назначенном сотруднике для персонала */}
            {canViewProcessingHistory(userRole) && assignedTo && (
                <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                        <Icon name="person" size={20} color="#667eea" />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Текущий ответственный</Text>
                        <Text style={styles.infoValue}>{assignedTo.name}</Text>
                        {assignedTo.position && (
                            <Text style={styles.infoSubtext}>{assignedTo.position}</Text>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
};


