import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    FlatList,
    RefreshControl,
    ActivityIndicator,
    Text,
    StyleSheet,
    Dimensions
} from 'react-native';
import { useOrders, useOrdersFilter, useOrderNotifications } from '@entities/order';
import { OrderCard } from '@entities/order';
import { OrdersFilters } from "@features/order/ui/OrdersFilters";

const { height } = Dimensions.get('window');

/**
 * Компонент для отображения списка заказов с фильтрацией и пагинацией
 * @param {Object} props
 * @param {string} props.type - Тип списка ('my' | 'staff')
 * @param {Object} props.filters - Дополнительные фильтры
 * @param {Function} props.onOrderPress - Обработчик нажатия на заказ
 * @param {Function} props.onOrderLongPress - Обработчик долгого нажатия на заказ
 * @param {Function} props.onStatusUpdate - Обработчик изменения статуса
 * @param {Function} props.onAssign - Обработчик назначения заказа
 * @param {Function} props.onCancel - Обработчик отмены заказа
 * @param {boolean} props.showFilters - Показывать ли панель фильтров
 * @param {boolean} props.selectionMode - Режим множественного выбора
 * @param {Array} props.selectedOrders - Выбранные заказы в режиме выбора
 * @param {Object} props.style - Дополнительные стили
 */
export const OrdersList = ({
                        type = 'my',
                        filters: externalFilters = {},
                        onOrderPress,
                        onOrderLongPress,
                        onStatusUpdate,
                        onAssign,
                        onCancel,
                        showFilters = false,
                        selectionMode = false,
                        selectedOrders = [],
                        style
                    }) => {
    const [refreshing, setRefreshing] = useState(false);
    const [localFilters, setLocalFilters] = useState({});
    const [error, setError] = useState(null);

    const {
        myOrders,
        staffOrders,
        loading,
        loadMyOrders,
        loadStaffOrders,
        accessRights
    } = useOrders();

    const { addErrorNotification } = useOrderNotifications();

    // Определяем источник данных
    const orders = type === 'my' ? myOrders : staffOrders;
    const isLoading = loading.myOrders || loading.staffOrders;

    // Объединяем фильтры
    const combinedFilters = useMemo(() => ({
        ...externalFilters,
        ...localFilters
    }), [externalFilters, localFilters]);

    // Фильтруем и сортируем заказы
    const {
        filterMyOrders,
        sortOrders,
        searchOrders
    } = useOrdersFilter();

    const processedOrders = useMemo(() => {
        let filtered = orders;

        // Применяем фильтры
        if (Object.keys(combinedFilters).length > 0) {
            filtered = type === 'my'
                ? filterMyOrders(combinedFilters)
                : staffOrders; // Для staff заказов фильтр применяется в селекторе
        }

        // Применяем поиск
        if (combinedFilters.search) {
            filtered = searchOrders(filtered, combinedFilters.search);
        }

        // Сортируем
        return sortOrders(
            filtered,
            combinedFilters.sortBy || 'createdAt',
            combinedFilters.sortOrder || 'desc'
        );
    }, [orders, combinedFilters, type, filterMyOrders, searchOrders, sortOrders, staffOrders]);

    // Обработчик обновления
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            if (type === 'my' && accessRights.canViewMyOrders) {
                await loadMyOrders({ forceRefresh: true });
            } else if (type === 'staff' && accessRights.canViewStaffOrders) {
                await loadStaffOrders({ forceRefresh: true });
            }
        } catch (error) {
            setError(error.message);
            addErrorNotification('Ошибка при обновлении списка заказов');
        } finally {
            setRefreshing(false);
        }
    }, [type, accessRights, loadMyOrders, loadStaffOrders, addErrorNotification]);

    // Обработчик загрузки следующей страницы
    const handleLoadMore = useCallback(() => {
        if (isLoading || refreshing) return;

        // Здесь можно добавить логику пагинации
        // Например, загрузка следующей страницы через API
    }, [isLoading, refreshing]);

    // Обработчик изменения фильтров
    const handleFiltersChange = useCallback((newFilters) => {
        setLocalFilters(newFilters);
    }, []);

    // Рендер элемента списка
    const renderOrderItem = useCallback(({ item }) => (
        <OrderCard
            order={item}
            onPress={onOrderPress}
            onLongPress={onOrderLongPress}
            onStatusUpdate={onStatusUpdate}
            onAssign={onAssign}
            onCancel={onCancel}
            showClient={type === 'staff'}
            showActions={type === 'staff' && (accessRights.canUpdateOrderStatus || accessRights.canCancelOrders)}
            selectionMode={selectionMode}
            isSelected={selectedOrders.includes(item.id)}
        />
    ), [
        onOrderPress,
        onOrderLongPress,
        onStatusUpdate,
        onAssign,
        onCancel,
        type,
        accessRights,
        selectionMode,
        selectedOrders
    ]);

    // Рендер разделителя
    const renderSeparator = useCallback(() => (
        <View style={styles.separator} />
    ), []);

    // Рендер футера со спиннером загрузки
    const renderFooter = useCallback(() => {
        if (!isLoading) return null;

        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color="#2196f3" />
                <Text style={styles.footerText}>Загрузка...</Text>
            </View>
        );
    }, [isLoading]);

    // Рендер пустого состояния
    const renderEmptyComponent = useCallback(() => {
        if (isLoading && !refreshing) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196f3" />
                    <Text style={styles.loadingText}>Загрузка заказов...</Text>
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                    {type === 'my' ? 'У вас пока нет заказов' : 'Заказы не найдены'}
                </Text>
                <Text style={styles.emptyDescription}>
                    {type === 'my' 
                        ? 'Сделайте свой первый заказ и он появится здесь'
                        : 'Попробуйте изменить фильтры поиска'
                    }
                </Text>
            </View>
        );
    }, [isLoading, refreshing, type]);

    // Проверка доступа
    if (type === 'my' && !accessRights.canViewMyOrders) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Доступ запрещен</Text>
                <Text style={styles.errorDescription}>У вас нет прав для просмотра заказов</Text>
            </View>
        );
    }

    if (type === 'staff' && !accessRights.canViewStaffOrders) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Доступ запрещен</Text>
                <Text style={styles.errorDescription}>У вас нет прав для просмотра заказов персонала</Text>
            </View>
        );
    }

    // Отображение ошибки
    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Ошибка загрузки</Text>
                <Text style={styles.errorDescription}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            {/* Панель фильтров */}
            {showFilters && (
                <OrdersFilters
                    type={type}
                    filters={combinedFilters}
                    onFiltersChange={handleFiltersChange}
                    style={styles.filters}
                />
            )}

            {/* Список заказов */}
            <FlatList
                data={processedOrders}
                renderItem={renderOrderItem}
                keyExtractor={(item) => `order-${item.id}`}
                ItemSeparatorComponent={renderSeparator}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmptyComponent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={['#2196f3']}
                        tintColor="#2196f3"
                    />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.1}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={10}
                initialNumToRender={10}
                getItemLayout={(data, index) => ({
                    length: 200, // Примерная высота карточки
                    offset: 200 * index,
                    index,
                })}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.listContent,
                    processedOrders.length === 0 && styles.emptyListContent
                ]}
            />

            {/* Статистика */}
            {processedOrders.length > 0 && (
                <View style={styles.statsContainer}>
                    <Text style={styles.statsText}>
                        Показано: {processedOrders.length} заказов
                        {selectionMode && selectedOrders.length > 0 &&
                            ` • Выбрано: ${selectedOrders.length}`
                        }
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    filters: {
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        marginTop: 20
    },
    listContent: {
        paddingVertical: 8,
    },
    emptyListContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    separator: {
        height: 1,
        backgroundColor: 'transparent',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        gap: 8,
    },
    footerText: {
        fontSize: 14,
        color: '#666666',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 20,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#f44336',
        textAlign: 'center',
        marginBottom: 8,
    },
    errorDescription: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 20,
    },
    statsContainer: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    statsText: {
        fontSize: 12,
        color: '#666666',
        textAlign: 'center',
    },
});
