import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

const { width: screenWidth } = Dimensions.get('window');

const normalize = (size) => {
    const scale = screenWidth / 375;
    return Math.round(size * scale);
};

export const SplitOrderIndicator = ({ 
    order, 
    onPress,
    style = {} 
}) => {
    // Проверяем, является ли заказ частью разделенного заказа
    const isSplitOrder = order?.orderNumber?.includes('-IMMEDIATE') || 
                        order?.orderNumber?.includes('-WAITING');
    
    if (!isSplitOrder) return null;

    const isImmediate = order.orderNumber.includes('-IMMEDIATE');
    const isWaiting = order.orderNumber.includes('-WAITING');
    
    // Извлекаем оригинальный номер заказа
    const originalOrderNumber = order.orderNumber
        .replace('-IMMEDIATE', '')
        .replace('-WAITING', '');

    const getStatusInfo = () => {
        if (isImmediate) {
            return {
                title: '🚀 Немедленная доставка',
                subtitle: 'Товары в наличии отправляются сейчас',
                color: '#28a745',
                icon: 'local-shipping'
            };
        } else if (isWaiting) {
            return {
                title: '⏳ Ожидает поступления',
                subtitle: 'Товары будут доставлены после поступления на склад',
                color: '#fd7e14',
                icon: 'inventory'
            };
        }
        return null;
    };

    const statusInfo = getStatusInfo();
    if (!statusInfo) return null;

    return (
        <TouchableOpacity 
            style={[styles.container, style]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={[styles.iconContainer, { backgroundColor: statusInfo.color }]}>
                <Icon 
                    name={statusInfo.icon} 
                    size={20} 
                    color="#fff" 
                />
            </View>
            
            <View style={styles.content}>
                <Text style={styles.title}>{statusInfo.title}</Text>
                <Text style={styles.subtitle}>{statusInfo.subtitle}</Text>
                <Text style={styles.originalOrder}>
                    Оригинальный заказ: {originalOrderNumber}
                </Text>
            </View>

            <View style={styles.arrowContainer}>
                <Icon name="chevron-right" size={20} color="#666" />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: normalize(12),
        padding: normalize(16),
        marginVertical: normalize(8),
        borderLeftWidth: 4,
        borderLeftColor: '#28a745',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(12),
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: normalize(4),
    },
    subtitle: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: '#666',
        marginBottom: normalize(4),
        lineHeight: normalize(18),
    },
    originalOrder: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: '#999',
        fontStyle: 'italic',
    },
    arrowContainer: {
        marginLeft: normalize(8),
    },
});
