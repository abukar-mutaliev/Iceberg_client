import React, { useState, useCallback } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
    fetchStockStats,
    fetchCriticalStock,
    selectStockStats,
    selectStockStatsLoading,
    selectCriticalStock,
    selectCriticalStockLoading,
    selectTotalAlertsCount,
} from '@entities/stockAlert';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ModernStockStatsCard from '@widgets/stockAlerts/StockStatsCard';
import ModernCriticalStockList from '@widgets/stockAlerts/CriticalStockList';
import ModernStockAlertActions from '@widgets/stockAlerts/StockAlertActions';

export const StockAlertsScreen = () => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const { currentUser } = useAuth();

    const [refreshing, setRefreshing] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState(null); // null - показать все
    const [isInitialLoad, setIsInitialLoad] = useState(true);

        // Данные из Redux
        const stats = useSelector(selectStockStats);
        const statsLoading = useSelector(selectStockStatsLoading);
        const rawCriticalItems = useSelector(selectCriticalStock);
        const criticalLoading = useSelector(selectCriticalStockLoading);
        const totalAlertsCount = useSelector(selectTotalAlertsCount);

        // Преобразуем данные API в нужный формат для компонентов
        const criticalItems = Array.isArray(rawCriticalItems)
            ? rawCriticalItems.map(item => {
                const imageUrl = item?.imageUrl || null;
                return {
                    productId: String(item?.productId || ''),
                    productName: String(item?.productName || ''),
                    warehouseId: String(item?.warehouseId || ''),
                    warehouseName: String(item?.warehouseName || ''),
                    currentQuantity: Number(item?.currentQuantity) || 0,
                    threshold: Number(item?.threshold) || 0,
                    salesRate: Number(item?.salesRate) || 0,
                    isFastMoving: Boolean(item?.isFastMoving || false),
                    urgency: String(item?.urgency || 'normal'),
                    unit: String(item?.unit || 'шт'),
                    imageUrl: imageUrl
                };
            })
            : [];


        // Фильтруем товары на основе выбранного фильтра
        const filteredItems = selectedFilter ? criticalItems.filter(item => {
            switch (selectedFilter) {
                case 'critical':
                    return item.urgency === 'critical';
                case 'warning':
                    return item.urgency === 'warning';
                case 'attention':
                    return item.urgency === 'attention';
                case 'normal':
                    return item.urgency === 'normal';
                default:
                    return true;
            }
        }) : criticalItems;

    // Проверяем права доступа
    const isAdmin = currentUser?.role === 'ADMIN';
    const isEmployee = currentUser?.role === 'EMPLOYEE';
    const employeeRole = currentUser?.employee?.processingRole;

    // Доступ имеют: админы и сотрудники без роли (не сборщики, не курьеры, не супервизоры)
    const allowedEmployeeRoles = [null]; // Только сотрудники без роли
    const hasAccess = isAdmin || (isEmployee && allowedEmployeeRoles.includes(employeeRole));

    // Загрузка данных при фокусе экрана
    useFocusEffect(
        useCallback(() => {
            console.log('StockAlertsScreen focused, hasAccess:', hasAccess, 'currentUser:', currentUser?.role, 'isInitialLoad:', isInitialLoad);
            if (hasAccess && isInitialLoad) {
                console.log('Loading data for StockAlertsScreen (initial load)');
                loadData();
                setIsInitialLoad(false);
            } else if (hasAccess) {
                console.log('StockAlertsScreen refocused, skipping reload');
            } else {
                console.log('No access to StockAlertsScreen');
            }
        }, [hasAccess, currentUser, isInitialLoad])
    );

    const loadData = useCallback(async () => {
        try {
            // Загружаем статистику по остаткам
            await dispatch(fetchStockStats()).unwrap();

            // Загружаем критические товары
            await dispatch(fetchCriticalStock({ limit: 20 })).unwrap();
        } catch (error) {
            console.error('Ошибка загрузки данных уведомлений:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить данные об остатках');
        }
    }, [dispatch]);

    const handleRefresh = useCallback(async () => {
        console.log('Manual refresh triggered');
        setRefreshing(true);
        try {
            await loadData();
            // После ручного обновления сбрасываем флаг, чтобы при следующем фокусе не было повторной загрузки
            setIsInitialLoad(false);
        } finally {
            setRefreshing(false);
        }
    }, [loadData]);

    const handleItemPress = useCallback((item) => {
        console.log('Item pressed:', item);
        // Переход к товару с возможностью добавления количества
        navigation.navigate('AdminProductDetail', {
            productId: item.productId,
            warehouseId: item.warehouseId,
            fromScreen: 'StockAlerts'
        });
    }, [navigation]);

    const handleFilterPress = useCallback((filter) => {
        console.log('Filter pressed:', filter);
        setSelectedFilter(selectedFilter === filter ? null : filter); // Toggle filter
        // При изменении фильтра не сбрасываем isInitialLoad, так как данные уже загружены
    }, [selectedFilter]);

    const handleHistoryPress = useCallback(() => {
        console.log('History pressed');
        Alert.alert(
            'История уведомлений',
            'Функция просмотра истории уведомлений пока не реализована.',
            [{ text: 'OK' }]
        );
    }, []);


    // Если нет доступа
    if (!hasAccess) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <Icon name="block" size={normalize(48)} color="#FF3B30" />
                    <Text style={styles.accessDeniedTitle}>{String('Нет доступа')}</Text>
                    <Text style={styles.accessDeniedText}>
                        {String('Уведомления об остатках доступны только администраторам и сотрудникам без роли.')}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[Color.blue2]}
                    />
                }
            >
                {/* Заголовок */}
                <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <View style={styles.iconCircle}>
                                <Icon name="inventory" size={normalize(24)} color="#007AFF" />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.title}>{String('Контроль остатков')}</Text>
                                <Text style={styles.subtitle}>
                                    {String('Умная система порогов на основе скорости продаж товара')}
                                </Text>
                            </View>
                        </View>
                        {totalAlertsCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {totalAlertsCount > 99 ? '99+' : String(totalAlertsCount)}
                                </Text>
                            </View>
                        )}
                </View>

                        {/* Статистика */}
                        <ModernStockStatsCard
                            stats={stats}
                            loading={statsLoading}
                            selectedFilter={selectedFilter}
                            onFilterPress={handleFilterPress}
                        />

                {/* Действия */}
                {/*
                <ModernStockAlertActions
                    onRefreshPress={handleRefresh}
                    onHistoryPress={handleHistoryPress}
                    onCheckAllPress={() => console.log('Check all pressed')}
                    refreshing={refreshing}
                    checking={false}
                />
                */}

                        {/* Критические товары */}
                        <ModernCriticalStockList
                            items={filteredItems}
                            loading={criticalLoading}
                            onItemPress={handleItemPress}
                        />

                {/* Пустое состояние */}
                {!statsLoading && !criticalLoading && (
                    filteredItems.length === 0 ? (
                        selectedFilter === 'normal' ? (
                            <View style={styles.emptyState}>
                                <Icon name="check-circle" size={normalize(48)} color="#34C759" />
                                <Text style={styles.emptyTitle}>{String('Все товары в норме')}</Text>
                                <Text style={styles.emptyText}>
                                    {String('Отлично! Товары с достаточным запасом (>50 шт.) не требуют внимания.')}
                                </Text>
                                <TouchableOpacity
                                    style={styles.clearFilterButton}
                                    onPress={() => setSelectedFilter(null)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.clearFilterText}>{String('Показать все')}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : selectedFilter ? (
                            <View style={styles.emptyState}>
                                <Icon name="filter-list" size={normalize(48)} color="#8E8E93" />
                                <Text style={styles.emptyTitle}>{String('Нет товаров в этой категории')}</Text>
                                <Text style={styles.emptyText}>
                                    {String('Попробуйте выбрать другой фильтр или обновите данные.')}
                                </Text>
                                <TouchableOpacity
                                    style={styles.clearFilterButton}
                                    onPress={() => setSelectedFilter(null)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.clearFilterText}>{String('Показать все')}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <Icon name="check-circle" size={normalize(48)} color="#34C759" />
                                <Text style={styles.emptyTitle}>{String('Все товары в наличии')}</Text>
                                <Text style={styles.emptyText}>
                                    {String('Отлично! Ни один товар не заканчивается и не требует срочного внимания.')}
                                </Text>
                            </View>
                        )
                    ) : null
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    scrollContainer: {
        flexGrow: 1,
        padding: normalize(12),
        paddingBottom: normalize(24),
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(20),
    },
    header: {
        marginBottom: normalize(12),
        position: 'relative',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: normalize(40),
        height: normalize(40),
        borderRadius: normalize(20),
        backgroundColor: '#007AFF15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: normalize(10),
    },
    textContainer: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(8),
    },
    title: {
        fontSize: normalizeFont(24),
        fontFamily: FontFamily.sFProTextBold,
        color: '#1C1C1E',
        flex: 1,
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#FF3B30',
        borderRadius: normalize(10),
        minWidth: normalize(18),
        height: normalize(18),
        paddingHorizontal: normalize(5),
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: normalizeFont(10),
        fontWeight: '700',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: normalizeFont(14),
        color: '#8E8E93',
        lineHeight: normalize(20),
    },
    accessDeniedTitle: {
        fontSize: normalizeFont(20),
        fontFamily: FontFamily.sFProTextBold,
        color: '#1C1C1E',
        marginTop: normalize(16),
        marginBottom: normalize(8),
    },
    accessDeniedText: {
        fontSize: normalizeFont(16),
        color: '#8E8E93',
        textAlign: 'center',
        lineHeight: normalize(22),
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: normalize(40),
        marginTop: normalize(40),
    },
    emptyTitle: {
        fontSize: normalizeFont(18),
        fontFamily: FontFamily.sFProTextBold,
        color: '#1C1C1E',
        marginTop: normalize(16),
        marginBottom: normalize(8),
    },
    emptyText: {
        fontSize: normalizeFont(14),
        color: '#8E8E93',
        textAlign: 'center',
        lineHeight: normalize(20),
    },
    clearFilterButton: {
        backgroundColor: Color.blue2,
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(8),
        borderRadius: normalize(16),
        marginTop: normalize(16),
    },
    clearFilterText: {
        color: '#fff',
        fontSize: normalizeFont(14),
        fontFamily: FontFamily.sFProTextBold,
    },
});

export default StockAlertsScreen;
