import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Image,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { useOrderAlternatives } from '@entities/order';
import {
    ALTERNATIVE_TYPE_LABELS,
    ALTERNATIVE_TYPE_ICONS,
    ALTERNATIVE_TYPE_COLORS,
    CHOICE_TYPE_LABELS
} from '@entities/order';
import { getImageUrl } from '@shared/api/api';

const normalize = (size) => {
    const scale = 375 / 375;
    return Math.round(size * scale);
};

const { width, height } = Dimensions.get('window');

// Форматирование суммы
const formatAmount = (amount, currency = 'RUB') => {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency
    }).format(amount || 0);
};

// Форматирование номера заказа
const formatOrderNumber = (orderNumber) => {
    if (!orderNumber) return '';
    if (orderNumber.startsWith('ORD-')) {
        return orderNumber;
    }
    return `№${orderNumber}`;
};

export const OrderChoicesListScreen = () => {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    
    // Хуки
    const {
        choices,
        loading,
        error,
        loadMyChoices,
        urgentChoices
    } = useOrderAlternatives();

    // Локальное состояние
    const [refreshing, setRefreshing] = useState(false);

    /**
     * Обновление списка
     */
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadMyChoices();
        setRefreshing(false);
    }, [loadMyChoices]);

    /**
     * Переход к конкретному предложению
     */
    const handleChoicePress = useCallback((choice) => {
        navigation.navigate('OrderChoice', {
            choiceId: choice.id,
            orderId: choice.orderId,
            allChoices: choices // Передаем все предложения
        });
    }, [navigation, choices]);

    /**
     * Форматирование времени до истечения
     */
    const formatTimeLeft = useCallback((expiresAt) => {
        if (!expiresAt) return '';
        
        const timeLeft = new Date(expiresAt) - new Date();
        if (timeLeft <= 0) return 'Истекло';
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}ч ${minutes}мин`;
        } else {
            return `${minutes}мин`;
        }
    }, []);

    /**
     * Проверка срочности предложения
     */
    const isUrgent = useCallback((choice) => {
        if (!choice.expiresAt) return false;
        const timeLeft = new Date(choice.expiresAt) - new Date();
        return timeLeft > 0 && timeLeft <= 2 * 60 * 60 * 1000; // Менее 2 часов
    }, []);

    /**
     * Получение информации о товаре из предложения
     */
    const getProductInfo = useCallback((choice) => {
        console.log('🔍 getProductInfo: Анализируем структуру предложения', {
            choiceId: choice.id,
            choiceType: choice.choiceType,
            hasAlternatives: !!(choice.alternatives && choice.alternatives.length > 0),
            hasOrder: !!choice.order,
            orderStructure: choice.order ? {
                hasOrderItems: !!(choice.order.orderItems && choice.order.orderItems.length > 0),
                hasItems: !!(choice.order.items && choice.order.items.length > 0),
                orderItemsLength: choice.order.orderItems?.length || 0,
                itemsLength: choice.order.items?.length || 0,
                orderItems: choice.order.orderItems,
                items: choice.order.items
            } : null,
            fullChoice: choice
        });

        // Пытаемся найти товар в альтернативах (основной путь)
        if (choice.alternatives && choice.alternatives.length > 0) {
            const alternative = choice.alternatives[0];
            console.log('📦 Альтернатива найдена:', alternative);
            
            if (alternative.product) {
                console.log('✅ Товар найден в альтернативе:', alternative.product);
                
                // Получаем первое изображение из массива images
                let imageUrl = null;
                if (alternative.product.images && alternative.product.images.length > 0) {
                    imageUrl = alternative.product.images[0];
                } else if (alternative.product.image) {
                    imageUrl = alternative.product.image;
                } else if (alternative.product.imageUrl) {
                    imageUrl = alternative.product.imageUrl;
                }

                return {
                    name: alternative.product.name,
                    image: imageUrl,
                    price: alternative.product.price
                };
            }
        }

        // Пытаемся найти товар в заказе (orderItems вместо items)
        if (choice.order && choice.order.orderItems && choice.order.orderItems.length > 0) {
            const orderItem = choice.order.orderItems[0];
            console.log('📦 Товар заказа найден в orderItems:', {
                orderItem,
                hasProduct: !!orderItem.product,
                product: orderItem.product
            });
            
            if (orderItem.product) {
                console.log('✅ Товар найден в заказе:', orderItem.product);
                
                // Получаем первое изображение из массива images
                let imageUrl = null;
                if (orderItem.product.images && orderItem.product.images.length > 0) {
                    imageUrl = orderItem.product.images[0];
                } else if (orderItem.product.image) {
                    imageUrl = orderItem.product.image;
                } else if (orderItem.product.imageUrl) {
                    imageUrl = orderItem.product.imageUrl;
                }

                return {
                    name: orderItem.product.name,
                    image: imageUrl,
                    price: orderItem.product.price
                };
            }
        }

        // Дополнительная попытка найти товар в items (если orderItems не работает)
        if (choice.order && choice.order.items && choice.order.items.length > 0) {
            const orderItem = choice.order.items[0];
            console.log('📦 Товар заказа найден в items:', orderItem);
            
            if (orderItem.product) {
                console.log('✅ Товар найден в items заказа:', orderItem.product);
                
                // Получаем первое изображение из массива images
                let imageUrl = null;
                if (orderItem.product.images && orderItem.product.images.length > 0) {
                    imageUrl = orderItem.product.images[0];
                } else if (orderItem.product.image) {
                    imageUrl = orderItem.product.image;
                } else if (orderItem.product.imageUrl) {
                    imageUrl = orderItem.product.imageUrl;
                }

                return {
                    name: orderItem.product.name,
                    image: imageUrl,
                    price: orderItem.product.price
                };
            }
        }

        // Дополнительные попытки найти товар
        if (choice.product) {
            console.log('✅ Товар найден напрямую в choice:', choice.product);
            
            let imageUrl = null;
            if (choice.product.images && choice.product.images.length > 0) {
                imageUrl = choice.product.images[0];
            } else if (choice.product.image) {
                imageUrl = choice.product.image;
            } else if (choice.product.imageUrl) {
                imageUrl = choice.product.imageUrl;
            }

            return {
                name: choice.product.name,
                image: imageUrl,
                price: choice.product.price
            };
        }

        console.log('❌ Товар не найден, используем fallback');
        
        // Попытаемся получить информацию о заказе для fallback
        let fallbackName = CHOICE_TYPE_LABELS[choice.choiceType] || 'Предложение по заказу';
        let fallbackPrice = null;
        
        if (choice.order && choice.order.totalAmount) {
            fallbackPrice = choice.order.totalAmount;
            fallbackName = `${fallbackName} - ${formatOrderNumber(choice.order.orderNumber)}`;
        }
        
        return {
            name: fallbackName,
            image: null,
            price: fallbackPrice
        };
    }, []);

    /**
     * Получение изображения товара с правильным URL
     */
    const getProductImage = useCallback((imageUrl) => {
        if (!imageUrl) {
            return null; // Возвращаем null для использования плейсхолдера
        }
        
        console.log('OrderChoicesListScreen getProductImage:', {
            imageUrl,
            imageType: typeof imageUrl
        });
        
        let processedUrl = '';
        
        if (typeof imageUrl === 'string') {
            processedUrl = imageUrl;
        } else if (typeof imageUrl === 'object' && imageUrl !== null) {
            processedUrl = imageUrl.path || imageUrl.url || imageUrl.uri || imageUrl;
        }
        
        if (!processedUrl) {
            console.log('OrderChoicesListScreen: Нет URL изображения, используем placeholder');
            return null; // Возвращаем null для использования плейсхолдера
        }
        
        // Если уже полный URL
        if (processedUrl.startsWith('http') || processedUrl.startsWith('https')) {
            console.log('OrderChoicesListScreen: Полный URL:', processedUrl);
            return { uri: processedUrl };
        }
        
        // Нормализуем путь: заменяем обратные слеши на прямые
        const normalizedPath = processedUrl.replace(/\\/g, '/');
        
        // Добавляем префикс uploads если его нет
        const fullUrl = getImageUrl(normalizedPath);
        console.log('OrderChoicesListScreen: Сформированный URL:', fullUrl);
        
        return { uri: fullUrl };
    }, []);

    // Состояние загрузки
    if (loading && choices.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
                <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Загрузка предложений...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Состояние ошибки
    if (error && choices.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
                <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
                <View style={styles.errorContainer}>
                    <Icon name="error-outline" size={80} color={colors.error} />
                    <Text style={styles.errorTitle}>Ошибка загрузки</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={loadMyChoices}
                    >
                        <Icon name="refresh" size={20} color={colors.textInverse} />
                        <Text style={styles.retryButtonText}>Попробовать снова</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Пустое состояние
    if (choices.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
                <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
                
                {/* Заголовок */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.headerBackButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-back" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Предложения по заказам</Text>
                    <View style={styles.headerPlaceholder} />
                </View>

                <View style={styles.modernEmptyContainer}>
                    <View style={styles.emptyIconContainer}>
                        <Icon name="check-circle" size={80} color={colors.success} />
                    </View>
                    <Text style={styles.emptyTitle}>Нет активных предложений</Text>
                    <Text style={styles.emptyText}>
                        У вас нет предложений по заказам, требующих вашего выбора
                    </Text>
                    <TouchableOpacity
                        style={styles.modernButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-back" size={20} color={colors.textInverse} />
                        <Text style={styles.modernButtonText}>Вернуться к заказам</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
            <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
            
            {/* Современный заголовок */}
            <View style={styles.modernHeader}>
                <TouchableOpacity
                    style={styles.headerBackButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Предложения по заказам</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            {/* Современная статистика */}
            <View style={styles.modernStatsContainer}>
                <View style={styles.statsGradient}>
                    <Text style={styles.statsTitle}>Предложения по заказам</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{choices.length}</Text>
                            <Text style={styles.statLabel}>Всего предложений</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statNumber, { color: colors.warning }]}>{urgentChoices.length}</Text>
                            <Text style={styles.statLabel}>Требуют внимания</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Список предложений */}
            <ScrollView 
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                        progressBackgroundColor={colors.surface}
                    />
                }
            >
                {choices.map((choice, index) => {
                    const urgent = isUrgent(choice);
                    const timeLeft = formatTimeLeft(choice.expiresAt);
                    const productInfo = getProductInfo(choice);
                    const productImage = productInfo.image ? getProductImage(productInfo.image) : null;
                    
                    return (
                        <TouchableOpacity
                            key={choice.id}
                            style={[
                                styles.modernChoiceCard,
                                urgent && styles.choiceCardUrgent
                            ]}
                            onPress={() => handleChoicePress(choice)}
                            activeOpacity={0.8}
                        >
                            {/* Заголовок карточки */}
                            <View style={styles.choiceHeader}>
                                <View style={styles.orderMainInfo}>
                                    <Text style={styles.choiceTitle}>
                                        {CHOICE_TYPE_LABELS[choice.choiceType] || 'Предложение по заказу'}
                                    </Text>
                                    <Text style={styles.choiceOrder}>
                                        {formatOrderNumber(choice.order?.orderNumber)}
                                    </Text>
                                </View>
                                
                                <View style={styles.headerRight}>
                                    {/* Статус срочности */}
                                    <View
                                        style={[
                                            styles.statusBadge, 
                                            { backgroundColor: urgent ? colors.warning : colors.primary }
                                        ]}
                                    >
                                        <Icon 
                                            name={urgent ? "warning" : "schedule"} 
                                            size={12} 
                                            color={colors.textInverse}
                                        />
                                        <Text style={styles.statusText}>
                                            {urgent ? 'СРОЧНО' : 'ОЖИДАЕТ'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Основной контент */}
                            <View style={styles.orderContent}>
                                <View style={styles.productImageContainer}>
                                    {productImage ? (
                                        <Image 
                                            source={productImage}
                                            style={styles.productImage}
                                            resizeMode="cover"
                                            onError={() => console.log('Error loading image')}
                                        />
                                    ) : (
                                        <View style={[styles.productImage, styles.placeholderContainer]}>
                                            <Icon name="image" size={24} color={colors.textTertiary} />
                                        </View>
                                    )}
                                </View>
                                
                                <View style={styles.orderDetails}>
                                    <View style={styles.orderItemsInfo}>
                                        <View style={styles.itemsCountContainer}>
                                            <Icon name="shopping-cart" size={14} color={colors.textSecondary} />
                                            <Text style={styles.itemsCount}>
                                                {productInfo.name}
                                            </Text>
                                        </View>
                                        
                                        {choice.order?.deliveryDate && (
                                            <View style={styles.deliveryContainer}>
                                                <Icon name="local-shipping" size={12} color={colors.success} />
                                                <Text style={styles.deliveryDate}>
                                                    {new Date(choice.order.deliveryDate).toLocaleDateString('ru-RU')}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.amountContainer}>
                                        <View style={styles.amountInfo}>
                                            <Text style={styles.amountLabel}>Сумма заказа</Text>
                                            <Text style={styles.amount}>
                                                {formatAmount(choice.order?.totalAmount)}
                                            </Text>
                                        </View>
                                        <View style={styles.amountIcon}>
                                            <Icon name="account-balance-wallet" size={16} color={colors.primary} />
                                        </View>
                                    </View>

                                    {/* Описание предложения */}
                                    <View style={styles.descriptionContainer}>
                                        <Text style={styles.choiceDescription} numberOfLines={2}>
                                            {choice.description || 'Требуется ваш выбор для продолжения обработки заказа'}
                                        </Text>
                                    </View>

                                    {/* Время до истечения */}
                                    {timeLeft && (
                                        <View style={styles.timeContainer}>
                                            <Icon 
                                                name={urgent ? "warning" : "schedule"} 
                                                size={14} 
                                                color={urgent ? colors.warning : colors.textSecondary} 
                                            />
                                            <Text style={[
                                                styles.timeText,
                                                urgent && styles.timeTextUrgent
                                            ]}>
                                                {urgent ? 'Истекает через' : 'Осталось'}: {timeLeft}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    // Современный заголовок (как в MyOrdersScreen)
    modernHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerBackButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surfaceSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.24 : 0.1,
        shadowRadius: isDark ? 8 : 4,
        elevation: isDark ? 4 : 3,
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    headerPlaceholder: {
        width: 40,
    },
    // Современная статистика (как в MyOrdersScreen)
    modernStatsContainer: {
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 8,
    },
    statsGradient: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        padding: 20,
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    statsTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textInverse,
        marginBottom: 16,
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statCard: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.textInverse,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        fontWeight: '500',
    },
    content: {
        flex: 1,
    },
    // Современные карточки предложений (как в MyOrdersScreen)
    modernChoiceCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 16,
        marginVertical: 6,
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.26 : 0.1,
        shadowRadius: isDark ? 14 : 12,
        elevation: isDark ? 7 : 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    choiceCardUrgent: {
        borderLeftWidth: 4,
        borderLeftColor: colors.warning,
        backgroundColor: isDark ? colors.surface : colors.warning + '12',
    },
    choiceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    orderMainInfo: {
        flex: 1,
    },
    choiceTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    choiceOrder: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    headerRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
        maxWidth: 120,
        shadowColor: colors.shadowColor || '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textInverse,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    // Контент карточки
    orderContent: {
        flexDirection: 'row',
        gap: 16,
    },
    productImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    placeholderContainer: {
        backgroundColor: colors.surfaceSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    orderDetails: {
        flex: 1,
    },
    orderItemsInfo: {
        marginBottom: 12,
    },
    itemsCountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    itemsCount: {
        fontSize: 15,
        color: colors.textPrimary,
        fontWeight: '600',
        lineHeight: 20,
        flex: 1,
    },
    deliveryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    deliveryDate: {
        fontSize: 12,
        color: colors.success,
        fontWeight: '600',
    },
    // Сумма
    amountContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.primary + '0D',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 12,
    },
    amountInfo: {
        flex: 1,
    },
    amountLabel: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '600',
        marginBottom: 2,
    },
    amount: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.primary,
    },
    amountIcon: {
        width: 28,
        height: 28,
        backgroundColor: colors.primary + '1A',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Описание
    descriptionContainer: {
        marginBottom: 8,
    },
    choiceDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    // Время
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    timeTextUrgent: {
        color: colors.warning,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(40),
    },
    loadingText: {
        fontSize: normalize(16),
        color: colors.textSecondary,
        marginTop: normalize(16),
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(40),
    },
    errorTitle: {
        fontSize: normalize(20),
        fontWeight: '600',
        color: colors.error,
        marginTop: normalize(16),
        marginBottom: normalize(8),
    },
    errorText: {
        fontSize: normalize(14),
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: normalize(20),
        marginBottom: normalize(24),
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error,
        borderRadius: normalize(12),
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(12),
    },
    retryButtonText: {
        fontSize: normalize(14),
        fontWeight: '600',
        color: colors.textInverse,
        marginLeft: normalize(8),
    },
    // Современное пустое состояние (как в MyOrdersScreen)
    modernEmptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyIconContainer: {
        backgroundColor: colors.success + '1A',
        padding: 24,
        borderRadius: 50,
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        maxWidth: 300,
    },
    // Современная кнопка
    modernButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    modernButtonText: {
        color: colors.textInverse,
        fontSize: 16,
        fontWeight: '600',
    },
});
