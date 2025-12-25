import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

/**
 * Компонент состояния ошибки для экранов заказов
 * @param {Object} props
 * @param {string} props.title - Заголовок ошибки
 * @param {string} props.message - Сообщение об ошибке
 * @param {string} props.type - Тип ошибки ('network', 'access_denied', 'server_error', 'not_found')
 * @param {Function} props.onRetry - Обработчик повторной попытки
 * @param {Function} props.onGoBack - Обработчик возврата назад
 * @param {boolean} props.showRetry - Показывать ли кнопку повтора
 * @param {boolean} props.showGoBack - Показывать ли кнопку возврата
 * @param {Object} props.style - Дополнительные стили
 */
const OrdersErrorState = ({
                              title,
                              message,
                              type = 'server_error',
                              onRetry,
                              onGoBack,
                              showRetry = true,
                              showGoBack = false,
                              style
                          }) => {
    const getErrorConfig = () => {
        switch (type) {
            case 'network':
                return {
                    icon: 'wifi-off',
                    iconColor: '#ff9800',
                    defaultTitle: 'Нет соединения',
                    defaultMessage: 'Проверьте подключение к интернету и попробуйте снова.',
                    backgroundColor: '#fff8e1',
                    borderColor: '#ffb74d'
                };

            case 'access_denied':
                return {
                    icon: 'block',
                    iconColor: '#f44336',
                    defaultTitle: 'Доступ запрещен',
                    defaultMessage: 'У вас нет прав для выполнения этого действия.',
                    backgroundColor: '#ffebee',
                    borderColor: '#ef5350'
                };

            case 'not_found':
                return {
                    icon: 'search-off',
                    iconColor: '#9e9e9e',
                    defaultTitle: 'Ничего не найдено',
                    defaultMessage: 'Запрашиваемые данные не найдены или были удалены.',
                    backgroundColor: '#fafafa',
                    borderColor: '#e0e0e0'
                };

            case 'server_error':
            default:
                return {
                    icon: 'error-outline',
                    iconColor: '#f44336',
                    defaultTitle: 'Произошла ошибка',
                    defaultMessage: 'Что-то пошло не так. Попробуйте обновить страницу или повторите попытку позже.',
                    backgroundColor: '#ffebee',
                    borderColor: '#ef5350'
                };
        }
    };

    const config = getErrorConfig();
    const finalTitle = title || config.defaultTitle;
    const finalMessage = message || config.defaultMessage;

    const getSuggestedActions = () => {
        switch (type) {
            case 'network':
                return [
                    'Проверьте подключение к WiFi',
                    'Убедитесь, что мобильные данные включены',
                    'Перезагрузите приложение'
                ];

            case 'access_denied':
                return [
                    'Обратитесь к администратору',
                    'Проверьте ваши права доступа',
                    'Войдите в систему заново'
                ];

            case 'not_found':
                return [
                    'Проверьте правильность ссылки',
                    'Попробуйте поиск по каталогу',
                    'Обновите список данных'
                ];

            case 'server_error':
            default:
                return [
                    'Попробуйте обновить страницу',
                    'Проверьте интернет-соединение',
                    'Повторите попытку через несколько минут'
                ];
        }
    };

    const suggestedActions = getSuggestedActions();

    return (
        <View style={[styles.container, style]}>
            {/* Основной контент */}
            <View style={styles.content}>
                {/* Иконка ошибки */}
                <View style={[
                    styles.iconContainer,
                    {
                        backgroundColor: config.backgroundColor,
                        borderColor: config.borderColor
                    }
                ]}>
                    <Icon
                        name={config.icon}
                        size={64}
                        color={config.iconColor}
                    />
                </View>

                {/* Заголовок */}
                <Text style={styles.title}>{finalTitle}</Text>

                {/* Сообщение */}
                <Text style={styles.message}>{finalMessage}</Text>

                {/* Рекомендуемые действия */}
                {suggestedActions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                        <Text style={styles.suggestionsTitle}>Что можно попробовать:</Text>
                        {suggestedActions.map((suggestion, index) => (
                            <View key={index} style={styles.suggestionItem}>
                                <View style={styles.suggestionBullet} />
                                <Text style={styles.suggestionText}>{suggestion}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Кнопки действий */}
                <View style={styles.actionsContainer}>
                    {showRetry && onRetry && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.retryButton]}
                            onPress={onRetry}
                            activeOpacity={0.8}
                        >
                            <Icon name="refresh" size={20} color="#ffffff" />
                            <Text style={styles.retryButtonText}>
                                {type === 'network' ? 'Проверить соединение' : 'Попробовать снова'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {showGoBack && onGoBack && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.backButton]}
                            onPress={onGoBack}
                            activeOpacity={0.8}
                        >
                            <Icon name="arrow-back" size={20} color="#666666" />
                            <Text style={styles.backButtonText}>Назад</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Дополнительная информация для разработчиков */}
                {__DEV__ && (
                    <View style={styles.debugInfo}>
                        <Text style={styles.debugText}>
                            Debug: Error type = {type}
                        </Text>
                        <Text style={styles.debugText}>
                            Time: {new Date().toLocaleTimeString()}
                        </Text>
                    </View>
                )}
            </View>

            {/* Декоративные элементы */}
            <View style={styles.decorativeElements}>
                <View style={[styles.decorativeShape, styles.shape1]} />
                <View style={[styles.decorativeShape, styles.shape2]} />
                <View style={[styles.decorativeShape, styles.shape3]} />
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
        maxWidth: 320,
        zIndex: 1,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    title: {
        fontSize: 22,
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
        marginBottom: 24,
    },
    suggestionsContainer: {
        width: '100%',
        marginBottom: 32,
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#2196f3',
    },
    suggestionsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    suggestionBullet: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#2196f3',
        marginTop: 6,
        marginRight: 8,
    },
    suggestionText: {
        fontSize: 13,
        color: '#666666',
        flex: 1,
        lineHeight: 18,
    },
    actionsContainer: {
        width: '100%',
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 8,
        gap: 8,
    },
    retryButton: {
        backgroundColor: '#2196f3',
        shadowColor: '#2196f3',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    backButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666666',
    },
    debugInfo: {
        marginTop: 24,
        padding: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 6,
        alignSelf: 'stretch',
    },
    debugText: {
        fontSize: 10,
        color: '#999999',
        fontFamily: 'monospace',
        textAlign: 'center',
    },
    decorativeElements: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: 0,
    },
    decorativeShape: {
        position: 'absolute',
        backgroundColor: '#f8f9fa',
        opacity: 0.3,
    },
    shape1: {
        width: 100,
        height: 100,
        borderRadius: 50,
        top: 80, // Исправлено с '15%' на числовое значение
        left: 20, // Исправлено с '5%' на числовое значение
        transform: [{ rotate: '45deg' }],
    },
    shape2: {
        width: 60,
        height: 60,
        borderRadius: 30,
        bottom: 100, // Исправлено с '20%' на числовое значение
        right: 40, // Исправлено с '10%' на числовое значение
        transform: [{ rotate: '-30deg' }],
    },
    shape3: {
        width: 80,
        height: 80,
        borderRadius: 40,
        top: 270, // Исправлено с '50%' на числовое значение
        left: 320, // Исправлено с '80%' на числовое значение
        transform: [{ rotate: '60deg' }],
    },
});

export default OrdersErrorState;