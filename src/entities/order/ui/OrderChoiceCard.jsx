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
import {
    CHOICE_TYPE_LABELS,
    ALTERNATIVE_TYPE_COLORS
} from '../api/orderAlternativesApi';

const { width: screenWidth } = Dimensions.get('window');

const normalize = (size) => {
    const scale = screenWidth / 375;
    return Math.round(size * scale);
};

export const OrderChoiceCard = ({ 
    choice, 
    onPress, 
    onQuickRespond = null,
    style = {} 
}) => {
    // Проверяем срок действия
    const timeLeft = choice.expiresAt ? 
        Math.max(0, new Date(choice.expiresAt) - new Date()) : 0;
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const isUrgent = timeLeft > 0 && timeLeft <= 2 * 60 * 60 * 1000; // Менее 2 часов
    const isExpired = timeLeft === 0;

    // Определяем цвет и иконку для типа проблемы
    const getChoiceTypeInfo = (choiceType) => {
        switch (choiceType) {
            case 'STOCK_UNAVAILABLE':
                return { icon: 'inventory-2', color: '#fd7e14' };
            case 'DELIVERY_DISTANCE':
                return { icon: 'local-shipping', color: '#17a2b8' };
            case 'PARTIAL_AVAILABILITY':
                return { icon: 'playlist-remove', color: '#ffc107' };
            case 'PRODUCT_SUBSTITUTE':
                return { icon: 'swap-horiz', color: '#007bff' };
            default:
                return { icon: 'help-outline', color: '#6c757d' };
        }
    };

    const { icon: typeIcon, color: typeColor } = getChoiceTypeInfo(choice.choiceType);

    // Форматирование времени
    const formatTimeLeft = () => {
        if (isExpired) return 'Истекло';
        if (hoursLeft > 0) return `${hoursLeft}ч ${minutesLeft}мин`;
        return `${minutesLeft}мин`;
    };

    return (
        <TouchableOpacity
            style={[
                styles.card,
                isUrgent && styles.cardUrgent,
                isExpired && styles.cardExpired,
                style
            ]}
            onPress={() => onPress?.(choice)}
            activeOpacity={0.8}
            disabled={isExpired}
        >
            {/* Заголовок карточки */}
            <View style={styles.cardHeader}>
                <View style={styles.problemInfo}>
                    <View style={[styles.typeIcon, { backgroundColor: typeColor }]}>
                        <Icon name={typeIcon} size={20} color="#fff" />
                    </View>
                    <View style={styles.problemText}>
                        <Text style={styles.problemTitle}>
                            {CHOICE_TYPE_LABELS[choice.choiceType] || choice.choiceType}
                        </Text>
                        <Text style={styles.orderNumber}>
                            Заказ {choice.order?.orderNumber}
                        </Text>
                    </View>
                </View>
                
                {/* Индикатор времени */}
                <View style={[
                    styles.timeIndicator,
                    isUrgent && styles.timeIndicatorUrgent,
                    isExpired && styles.timeIndicatorExpired
                ]}>
                    <Icon 
                        name={isExpired ? 'schedule' : 'schedule'} 
                        size={12} 
                        color={isExpired ? '#dc3545' : isUrgent ? '#fd7e14' : '#28a745'} 
                    />
                    <Text style={[
                        styles.timeText,
                        isUrgent && styles.timeTextUrgent,
                        isExpired && styles.timeTextExpired
                    ]}>
                        {formatTimeLeft()}
                    </Text>
                </View>
            </View>

            {/* Описание проблемы */}
            <Text style={styles.description} numberOfLines={2}>
                {choice.description}
            </Text>

            {/* Информация об альтернативах */}
            <View style={styles.alternativesInfo}>
                <Text style={styles.alternativesCount}>
                    📋 {choice.alternatives?.length || 0} вариантов решения
                </Text>
                
                {/* Показываем первые 2 альтернативы */}
                {choice.alternatives?.slice(0, 2).map((alt, index) => (
                    <View key={alt.id} style={styles.alternativePreview}>
                        <Text style={styles.alternativePreviewText} numberOfLines={1}>
                            • {alt.description}
                        </Text>
                        {alt.additionalCost !== 0 && (
                            <Text style={[
                                styles.alternativePreviewCost,
                                { color: alt.additionalCost > 0 ? '#dc3545' : '#28a745' }
                            ]}>
                                {alt.additionalCost > 0 ? '+' : ''}{new Intl.NumberFormat('ru-RU', {
                                    style: 'currency',
                                    currency: 'RUB',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                }).format(alt.additionalCost)}
                            </Text>
                        )}
                    </View>
                ))}
                
                {choice.alternatives?.length > 2 && (
                    <Text style={styles.moreAlternatives}>
                        и еще {choice.alternatives.length - 2} вариантов...
                    </Text>
                )}
            </View>

            {/* Кнопка действия */}
            {!isExpired && (
                <View style={styles.actionSection}>
                    <TouchableOpacity
                        style={[styles.actionButton, isUrgent && styles.actionButtonUrgent]}
                        onPress={() => onPress?.(choice)}
                    >
                        <Icon name="touch-app" size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>
                            {isUrgent ? 'Выбрать срочно!' : 'Сделать выбор'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Индикатор истекшего времени */}
            {isExpired && (
                <View style={styles.expiredOverlay}>
                    <Icon name="schedule" size={24} color="#dc3545" />
                    <Text style={styles.expiredText}>Время истекло</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: normalize(12),
        padding: normalize(16),
        marginHorizontal: normalize(16),
        marginVertical: normalize(6),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    cardUrgent: {
        borderColor: '#fd7e14',
        borderWidth: 2,
        shadowColor: '#fd7e14',
        shadowOpacity: 0.2,
    },
    cardExpired: {
        opacity: 0.6,
        backgroundColor: '#f8f9fa',
    },

    // Заголовок
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: normalize(12),
    },
    problemInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    typeIcon: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        justifyContent: 'center',
        alignItems: 'center',
    },
    problemText: {
        marginLeft: normalize(12),
        flex: 1,
    },
    problemTitle: {
        fontSize: normalize(15),
        fontWeight: '600',
        color: '#333',
        marginBottom: normalize(2),
    },
    orderNumber: {
        fontSize: normalize(13),
        color: '#666',
    },

    // Индикатор времени
    timeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e8',
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(4),
        borderRadius: normalize(12),
        borderWidth: 1,
        borderColor: '#c3e6c3',
    },
    timeIndicatorUrgent: {
        backgroundColor: '#fff3cd',
        borderColor: '#ffeaa7',
    },
    timeIndicatorExpired: {
        backgroundColor: '#f8d7da',
        borderColor: '#f5c6cb',
    },
    timeText: {
        fontSize: normalize(11),
        fontWeight: '600',
        color: '#28a745',
        marginLeft: normalize(4),
    },
    timeTextUrgent: {
        color: '#fd7e14',
    },
    timeTextExpired: {
        color: '#dc3545',
    },

    // Описание
    description: {
        fontSize: normalize(14),
        color: '#666',
        lineHeight: normalize(20),
        marginBottom: normalize(12),
    },

    // Информация об альтернативах
    alternativesInfo: {
        backgroundColor: '#f8f9fa',
        padding: normalize(12),
        borderRadius: normalize(8),
        marginBottom: normalize(12),
    },
    alternativesCount: {
        fontSize: normalize(13),
        fontWeight: '600',
        color: '#333',
        marginBottom: normalize(8),
    },
    alternativePreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(4),
    },
    alternativePreviewText: {
        fontSize: normalize(12),
        color: '#666',
        flex: 1,
        marginRight: normalize(8),
    },
    alternativePreviewCost: {
        fontSize: normalize(12),
        fontWeight: '600',
    },
    moreAlternatives: {
        fontSize: normalize(12),
        color: '#667eea',
        fontWeight: '500',
        marginTop: normalize(4),
        textAlign: 'center',
    },

    // Секция действий
    actionSection: {
        marginTop: normalize(4),
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#667eea',
        borderRadius: normalize(8),
        paddingVertical: normalize(12),
    },
    actionButtonUrgent: {
        backgroundColor: '#fd7e14',
    },
    actionButtonText: {
        fontSize: normalize(14),
        fontWeight: '600',
        color: '#fff',
        marginLeft: normalize(6),
    },

    // Истекшее предложение
    expiredOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: normalize(12),
    },
    expiredText: {
        fontSize: normalize(14),
        fontWeight: '600',
        color: '#dc3545',
        marginTop: normalize(4),
    },
});
