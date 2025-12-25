import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily } from '@app/styles/GlobalStyles';

const { width: screenWidth } = Dimensions.get('window');

const normalize = (size) => {
    const scale = screenWidth / 375;
    return Math.round(size * scale);
};

export const ChoiceNotificationBanner = ({ 
    choices = [], 
    onPress, 
    onDismiss,
    style = {} 
}) => {
    if (!choices || choices.length === 0) return null;

    const urgentChoices = choices.filter(choice => {
        if (!choice.expiresAt) return false;
        const timeLeft = new Date(choice.expiresAt) - new Date();
        return timeLeft > 0 && timeLeft <= 2 * 60 * 60 * 1000; // Менее 2 часов
    });

    const hasUrgentChoices = urgentChoices.length > 0;
    const totalChoices = choices.length;

    return (
        <Animated.View style={[styles.banner, hasUrgentChoices && styles.bannerUrgent, style]}>
            <TouchableOpacity
                style={styles.bannerContent}
                onPress={() => onPress?.(choices)} // Передаем все предложения
                activeOpacity={0.8}
            >
                <View style={styles.bannerIcon}>
                    <Icon 
                        name={hasUrgentChoices ? "warning" : "info"} 
                        size={24} 
                        color="#fff" 
                    />
                </View>
                
                <View style={styles.bannerText}>
                    <Text style={styles.bannerTitle}>
                        {hasUrgentChoices 
                            ? `⚡ Срочно: ${urgentChoices.length} предложений`
                            : `💭 У вас ${totalChoices} предложений по заказам`
                        }
                    </Text>
                    <Text style={styles.bannerSubtitle}>
                        {hasUrgentChoices
                            ? 'Время выбора истекет через 2 часа'
                            : 'Требуется ваш выбор для продолжения обработки'
                        }
                    </Text>
                </View>

                <View style={styles.bannerActions}>
                    <Icon name="chevron-right" size={24} color="#fff" />
                </View>
            </TouchableOpacity>

            {/* Кнопка закрытия */}
            {onDismiss && (
                <TouchableOpacity
                    style={styles.dismissButton}
                    onPress={onDismiss}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon name="close" size={18} color="#fff" />
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#667eea',
        borderRadius: normalize(12),
        margin: normalize(16),
        marginBottom: normalize(8),
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        overflow: 'hidden',
        position: 'relative',
    },
    bannerUrgent: {
        backgroundColor: '#fd7e14',
        shadowColor: '#fd7e14',
    },

    bannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: normalize(16),
    },

    bannerIcon: {
        width: normalize(48),
        height: normalize(48),
        borderRadius: normalize(24),
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(16),
    },

    bannerText: {
        flex: 1,
    },
    bannerTitle: {
        fontSize: normalize(16),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        fontWeight: '600',
        color: '#fff',
        marginBottom: normalize(4),
    },
    bannerSubtitle: {
        fontSize: normalize(13),
        fontFamily: FontFamily.sFProText || 'SF Pro Text',
        color: 'rgba(255,255,255,0.9)',
        lineHeight: normalize(18),
    },

    bannerActions: {
        marginLeft: normalize(12),
    },

    // Кнопка закрытия
    dismissButton: {
        position: 'absolute',
        top: normalize(8),
        right: normalize(8),
        width: normalize(24),
        height: normalize(24),
        borderRadius: normalize(12),
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    }
});
