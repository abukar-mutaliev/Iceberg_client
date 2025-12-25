import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@entities/order/lib/utils';

const ORDER_STATUS_COLORS = {
    PENDING: '#ffc107',
    CONFIRMED: '#17a2b8',
    IN_DELIVERY: '#007bff',
    DELIVERED: '#28a745',
    CANCELLED: '#dc3545',
    RETURNED: '#6c757d'
};

/**
 * Компонент для отображения статуса заказа в виде бейджа
 * @param {Object} props
 * @param {string} props.status - Статус заказа
 * @param {string} props.size - Размер бейджа ('small', 'medium', 'large')
 * @param {Object} props.style - Дополнительные стили
 * @param {Object} props.textStyle - Стили для текста
 */
export const OrderStatusBadge = ({
                              status,
                              size = 'medium',
                              style,
                              textStyle,
                              showIcon = false
                          }) => {
    if (!status || !ORDER_STATUS_LABELS[status]) {
        return null;
    }

    const statusColor = ORDER_STATUS_COLORS[status];
    const label = ORDER_STATUS_LABELS[status];

    const getStatusIcon = (status) => {
        const icons = {
            [ORDER_STATUSES.PENDING]: '⏳',
            [ORDER_STATUSES.CONFIRMED]: '✅',
            [ORDER_STATUSES.IN_DELIVERY]: '🚚',
            [ORDER_STATUSES.DELIVERED]: '📦',
            [ORDER_STATUSES.CANCELLED]: '❌',
            [ORDER_STATUSES.RETURNED]: '🔄'
        };
        return icons[status] || '❓';
    };

    const sizeStyles = {
        small: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 8,
            fontSize: 10
        },
        medium: {
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 10,
            fontSize: 12
        },
        large: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
            fontSize: 14
        }
    };

    const currentSizeStyle = sizeStyles[size] || sizeStyles.medium;

    return (
        <View
            style={[
                styles.badge,
                {
                    backgroundColor: `${statusColor}20`, // 20% прозрачности для фона
                    borderColor: statusColor,
                    paddingHorizontal: currentSizeStyle.paddingHorizontal,
                    paddingVertical: currentSizeStyle.paddingVertical,
                    borderRadius: currentSizeStyle.borderRadius,
                },
                style
            ]}
        >
            <Text
                style={[
                    styles.text,
                    {
                        color: statusColor,
                        fontSize: currentSizeStyle.fontSize,
                    },
                    textStyle
                ]}
                numberOfLines={1}
            >
                {showIcon && `${getStatusIcon(status)} `}{label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        borderWidth: 1,
        alignSelf: 'flex-start',
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontWeight: '600',
        textAlign: 'center',
    },
});

