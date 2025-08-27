import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

/**
 * Компонент пустого состояния для списка заказов
 * @param {Object} props
 * @param {string} props.type - Тип списка ('my' | 'staff')
 * @param {boolean} props.hasFilters - Есть ли активные фильтры
 * @param {Function} props.onRefresh - Обработчик обновления
 * @param {Function} props.onClearFilters - Обработчик очистки фильтров
 * @param {Object} props.style - Дополнительные стили
 */
const OrdersEmptyState = ({
                              type = 'my',
                              hasFilters = false,
                              onRefresh,
                              onClearFilters,
                              style
                          }) => {
    const getEmptyStateContent = () => {
        if (hasFilters) {
            return {
                icon: 'search-off',
                title: 'Заказы не найдены',
                message: 'По заданным фильтрам заказы не найдены. Попробуйте изменить условия поиска.',
                actionText: 'Очистить фильтры',
                onAction: onClearFilters
            };
        }

        if (type === 'my') {
            return {
                icon: 'shopping-cart',
                title: 'У вас пока нет заказов',
                message: 'Когда вы сделаете первый заказ, он появится здесь. Начните с добавления товаров в корзину!',
                actionText: 'Перейти к покупкам',
                onAction: () => {
                    // Здесь можно добавить навигацию к каталогу
                }
            };
        }

        return {
            icon: 'assignment',
            title: 'Заказов пока нет',
            message: 'Новые заказы от клиентов будут отображаться здесь. Следите за обновлениями!',
            actionText: 'Обновить',
            onAction: onRefresh
        };
    };

    const { icon, title, message, actionText, onAction } = getEmptyStateContent();

    return (
        <View style={[styles.container, style]}>
            <View style={styles.content}>
                {/* Иконка */}
                <View style={styles.iconContainer}>
                    <Icon name={icon} size={64} color="#e0e0e0" />
                </View>

                {/* Заголовок */}
                <Text style={styles.title}>{title}</Text>

                {/* Сообщение */}
                <Text style={styles.message}>{message}</Text>

                {/* Кнопка действия */}
                {onAction && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onAction}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.actionButtonText}>{actionText}</Text>
                    </TouchableOpacity>
                )}

                {/* Дополнительная кнопка обновления для фильтров */}
                {hasFilters && onRefresh && (
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={onRefresh}
                        activeOpacity={0.8}
                    >
                        <Icon name="refresh" size={16} color="#2196f3" />
                        <Text style={styles.secondaryButtonText}>Обновить список</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Декоративные элементы */}
            <View style={styles.decorativeElements}>
                <View style={[styles.decorativeCircle, styles.circle1]} />
                <View style={[styles.decorativeCircle, styles.circle2]} />
                <View style={[styles.decorativeCircle, styles.circle3]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 64,
        backgroundColor: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
    },
    content: {
        alignItems: 'center',
        zIndex: 1,
    },
    iconContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 60,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: '#f0f0f0',
        borderStyle: 'dashed',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1a1a1a',
        textAlign: 'center',
        marginBottom: 12,
    },
    message: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
        maxWidth: 280,
    },
    actionButton: {
        backgroundColor: '#2196f3',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 16,
        shadowColor: '#2196f3',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        textAlign: 'center',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: '#f0f8ff',
        borderWidth: 1,
        borderColor: '#e3f2fd',
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#2196f3',
    },
    decorativeElements: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: 0,
    },
    decorativeCircle: {
        position: 'absolute',
        borderRadius: 999,
        backgroundColor: '#f8f9fa',
        opacity: 0.3,
    },
    circle1: {
        width: 80,
        height: 80,
        top: 120, // Исправлено с '20%' на числовое значение
        left: 40, // Исправлено с '10%' на числовое значение
    },
    circle2: {
        width: 120,
        height: 120,
        bottom: 100, // Исправлено с '25%' на числовое значение
        right: 60, // Исправлено с '15%' на числовое значение
    },
    circle3: {
        width: 60,
        height: 60,
        top: 360, // Исправлено с '60%' на числовое значение
        left: 80, // Исправлено с '20%' на числовое значение
    },
});

export default OrdersEmptyState;