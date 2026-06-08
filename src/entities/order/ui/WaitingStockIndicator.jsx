import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

const normalize = (size) => {
    const scale = screenWidth / 375;
    return Math.round(size * scale);
};

export const WaitingStockIndicator = ({ 
    order, 
    style = {} 
}) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    if (order.status !== 'WAITING_STOCK') return null;

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
        <View style={[styles.container, isOverdue && styles.containerOverdue, style]}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, isOverdue && styles.iconContainerOverdue]}>
                    <Icon 
                        name={isOverdue ? "warning" : "inventory"} 
                        size={20} 
                        color="#fff" 
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>
                        {isOverdue ? '⚠️ Ожидание просрочено' : '📦 Ожидает поступления'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {daysSinceCreated === 0 
                            ? 'Заказ создан сегодня'
                            : `В ожидании ${daysSinceCreated} дн.`
                        }
                    </Text>
                </View>
            </View>

            <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Ожидаемое поступление:</Text>
                    <Text style={[
                        styles.infoValue,
                        isOverdue && styles.infoValueOverdue
                    ]}>
                        {formatExpectedDate()}
                    </Text>
                </View>

                <Text style={styles.descriptionText}>
                    {isOverdue 
                        ? 'Товар поступил с задержкой. Мы свяжемся с вами в ближайшее время.'
                        : 'Как только товар поступит на склад, мы сразу обработаем ваш заказ и уведомим о готовности.'
                    }
                </Text>
            </View>

            {/* Прогресс-бар ожидания */}
            <View style={styles.progressSection}>
                <Text style={styles.progressLabel}>Прогресс ожидания:</Text>
                <View style={styles.progressBar}>
                    <View style={[
                        styles.progressFill,
                        { 
                            width: `${Math.min(100, (daysSinceCreated / 7) * 100)}%`,
                            backgroundColor: isOverdue ? '#dc3545' : '#fd7e14'
                        }
                    ]} />
                </View>
                <Text style={styles.progressText}>
                    {daysSinceCreated}/7 дней
                </Text>
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        backgroundColor: isDark ? colors.surface : '#fff3cd',
        borderRadius: normalize(12),
        padding: normalize(16),
        marginVertical: normalize(8),
        marginHorizontal: normalize(12),
        borderWidth: 1,
        borderColor: isDark ? colors.border : '#ffeaa7',
        shadowColor: '#fd7e14',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.15 : 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    containerOverdue: {
        backgroundColor: isDark ? colors.surface : '#f8d7da',
        borderColor: isDark ? colors.error : '#f5c6cb',
        shadowColor: '#dc3545',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(12),
    },
    iconContainer: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        backgroundColor: '#fd7e14',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(12),
    },
    iconContainerOverdue: {
        backgroundColor: '#dc3545',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: normalize(15),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: normalize(2),
    },
    subtitle: {
        fontSize: normalize(13),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
    },

    infoSection: {
        backgroundColor: isDark ? colors.cardBackground : 'rgba(255,255,255,0.7)',
        borderRadius: normalize(8),
        padding: normalize(12),
        marginBottom: normalize(12),
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(8),
    },
    infoLabel: {
        fontSize: normalize(13),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: normalize(14),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#fd7e14',
    },
    infoValueOverdue: {
        color: '#dc3545',
    },
    descriptionText: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        lineHeight: normalize(16),
    },

    progressSection: {
        marginTop: normalize(4),
    },
    progressLabel: {
        fontSize: normalize(12),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        marginBottom: normalize(6),
        fontWeight: '500',
    },
    progressBar: {
        height: normalize(6),
        backgroundColor: isDark ? colors.border : 'rgba(255,255,255,0.8)',
        borderRadius: normalize(3),
        overflow: 'hidden',
        marginBottom: normalize(4),
    },
    progressFill: {
        height: '100%',
        borderRadius: normalize(3),
    },
    progressText: {
        fontSize: normalize(11),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: colors.textSecondary,
        textAlign: 'right',
    },
});