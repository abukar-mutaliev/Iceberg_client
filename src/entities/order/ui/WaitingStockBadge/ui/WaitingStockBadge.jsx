import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { FontFamily } from '@app/styles/GlobalStyles';

const { width: screenWidth } = Dimensions.get('window');

const normalize = (size) => {
    const scale = screenWidth / 375;
    return Math.round(size * scale);
};

export const WaitingStockBadge = ({ 
    order, 
    style = {},
    compact = false 
}) => {
    if (order.status !== 'WAITING_STOCK') return null;

    // Вычисляем дни ожидания
    const daysSinceCreated = Math.floor(
        (Date.now() - new Date(order.createdAt).getTime()) / (24 * 60 * 60 * 1000)
    );

    // Ожидаемая дата
    const expectedDate = order.expectedDeliveryDate ? 
        new Date(order.expectedDeliveryDate) : null;
    
    const isOverdue = expectedDate && expectedDate < new Date();

    if (compact) {
        return (
            <View style={[styles.compactBadge, isOverdue && styles.compactBadgeOverdue, style]}>
                <Icon 
                    name={isOverdue ? "warning" : "inventory"} 
                    size={12} 
                    color="#fff" 
                />
                <Text style={styles.compactText}>
                    {isOverdue ? 'Просрочено' : `${daysSinceCreated}д`}
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.badge, isOverdue && styles.badgeOverdue, style]}>
            <View style={styles.iconContainer}>
                <Icon 
                    name={isOverdue ? "warning" : "inventory"} 
                    size={16} 
                    color="#fff" 
                />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.mainText}>
                    {isOverdue ? 'Ожидание просрочено' : 'Ожидает товар'}
                </Text>
                <Text style={styles.subText}>
                    {daysSinceCreated === 0 
                        ? 'Сегодня'
                        : `${daysSinceCreated} дн.`
                    }
                    {expectedDate && !isOverdue && (
                        ` • до ${expectedDate.toLocaleDateString('ru-RU', { 
                            day: 'numeric', 
                            month: 'short' 
                        })}`
                    )}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fd7e14',
        borderRadius: normalize(8),
        padding: normalize(8),
        shadowColor: '#fd7e14',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    badgeOverdue: {
        backgroundColor: '#dc3545',
        shadowColor: '#dc3545',
    },

    iconContainer: {
        marginRight: normalize(8),
    },

    textContainer: {
        flex: 1,
    },
    mainText: {
        fontSize: normalize(13),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#fff',
        marginBottom: normalize(2),
    },
    subText: {
        fontSize: normalize(11),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: 'rgba(255,255,255,0.9)',
    },

    // Компактная версия
    compactBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fd7e14',
        borderRadius: normalize(12),
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
    },
    compactBadgeOverdue: {
        backgroundColor: '#dc3545',
    },
    compactText: {
        fontSize: normalize(10),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#fff',
        marginLeft: normalize(4),
    },
});
