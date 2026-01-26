import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import WarehouseService from '@entities/warehouse/api/warehouseApi';
import { AdminHeader } from '@widgets/admin/AdminHeader';

export const WarehouseSalesScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const warehouseId = route.params?.warehouseId;
    const warehouseName = route.params?.warehouseName || 'Склад';

    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [period, setPeriod] = useState('month');
    const [filters, setFilters] = useState({
        saleType: null,
        productId: null,
        startDate: null,
        endDate: null
    });
    const [isPeriodChanging, setIsPeriodChanging] = useState(false);

    const loadSales = useCallback(async (pageNum = 1, reset = false, periodOverride = null) => {
        if (!warehouseId) return;
        
        // Если идет изменение периода, не загружаем данные через loadSales
        if (isPeriodChanging && !periodOverride) {
            console.log('⏸️ Пропуск загрузки продаж - идет изменение периода');
            return;
        }

        try {
            setError(null);
            if (reset) {
                setLoading(true);
            }
            
            const currentPeriod = periodOverride || period;
            const requestParams = {
                page: pageNum,
                limit: 20,
                period: currentPeriod,
                ...filters,
                _t: Date.now() // Добавляем timestamp для предотвращения кэширования
            };
            
            console.log('📤 Загрузка продаж:', { 
                warehouseId, 
                period: currentPeriod, 
                page: pageNum,
                params: requestParams 
            });
            
            const response = await WarehouseService.getWarehouseSales(warehouseId, requestParams);

            // Проверяем структуру ответа - может быть response.data.data или response.data
            const newSales = response.data?.data?.sales || response.data?.sales || [];
            const pagination = response.data?.data?.pagination || response.data?.pagination || {};
            

            if (reset) {
                setSales(newSales);
            } else {
                setSales(prev => [...prev, ...newSales]);
            }

            setHasMore(pagination.page < pagination.pages);
            setPage(pageNum);
        } catch (err) {
            console.error('❌ Ошибка загрузки продаж:', err);
            setError(err.response?.data?.message || 'Не удалось загрузить продажи');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [warehouseId, period, filters, isPeriodChanging]);

    // Загружаем данные только при изменении warehouseId или filters, но не при изменении периода
    // (период обрабатывается в handlePeriodChange)
    useEffect(() => {
        if (!isPeriodChanging) {
            loadSales(1, true);
        }
    }, [warehouseId, filters]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadSales(1, true);
    }, [loadSales]);

    const handleLoadMore = useCallback(() => {
        if (!loading && hasMore) {
            loadSales(page + 1, false);
        }
    }, [loading, hasMore, page, loadSales]);

    const handlePeriodChange = useCallback(async (newPeriod) => {
        if (newPeriod === period) return;
        
        console.log('🔄 Переключение периода продаж:', { from: period, to: newPeriod });
        
        // Устанавливаем флаг изменения периода
        setIsPeriodChanging(true);
        
        // Сбрасываем состояние
        setSales([]);
        setError(null);
        setLoading(true);
        setPage(1);
        setHasMore(true);
        
        // Обновляем период
        setPeriod(newPeriod);

        // Немедленно загружаем данные с новым периодом
        try {
            const requestParams = { 
                page: 1,
                limit: 20,
                period: newPeriod,
                ...filters,
                _t: Date.now()
            };
            
            
            const response = await WarehouseService.getWarehouseSales(warehouseId, requestParams);
            
            
            // Проверяем структуру ответа
            const salesData = response.data?.data?.sales || response.data?.sales || [];
            const paginationData = response.data?.data?.pagination || response.data?.pagination || {};
            
            
            setSales(salesData);
            setHasMore(paginationData.page < paginationData.pages);
            setPage(1);
        } catch (err) {
            console.error('❌ Ошибка загрузки продаж:', err);
            setError(err.response?.data?.message || 'Не удалось загрузить продажи');
        } finally {
            setLoading(false);
            // Сбрасываем флаг после небольшой задержки, чтобы useEffect не перезагрузил данные
            setTimeout(() => {
                setIsPeriodChanging(false);
            }, 100);
        }
    }, [period, warehouseId, filters]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getSaleTypeLabel = (type) => {
        const labels = {
            ORDER: 'Заказ',
            STOP: 'Фургон',
            DIRECT: 'Прямая продажа'
        };
        return labels[type] || type;
    };

    const handleSalePress = useCallback((sale) => {
        // Если есть orderId, переходим к деталям заказа
        if (sale.orderId) {
            navigation.navigate('StaffOrderDetails', {
                orderId: sale.orderId
            });
        }
    }, [navigation]);

    const renderSaleItem = ({ item }) => {
        const hasOrder = !!item.orderId;
        
        const SaleCardContent = () => (
            <>
                <View style={styles.saleHeader}>
                    <View style={styles.saleInfo}>
                        <Text style={styles.productName} numberOfLines={1}>
                            {item.product?.name || 'Неизвестный товар'}
                        </Text>
                        <Text style={styles.saleDate}>{formatDate(item.soldAt)}</Text>
                    </View>
                    <View style={[styles.saleTypeBadge, styles[`badge${item.saleType}`]]}>
                        <Text style={styles.saleTypeText}>{getSaleTypeLabel(item.saleType)}</Text>
                    </View>
                </View>

                <View style={styles.saleDetails}>
                    <View style={styles.saleDetailRow}>
                        <Text style={styles.saleDetailLabel}>Количество:</Text>
                        <Text style={styles.saleDetailValue}>{item.quantity} коробок</Text>
                    </View>
                    <View style={styles.saleDetailRow}>
                        <Text style={styles.saleDetailLabel}>Цена продажи:</Text>
                        <Text style={styles.saleDetailValue}>{formatCurrency(item.salePrice)}</Text>
                    </View>
                    <View style={styles.saleDetailRow}>
                        <Text style={styles.saleDetailLabel}>Цена склада:</Text>
                        <Text style={styles.saleDetailValue}>{formatCurrency(item.warehousePrice)}</Text>
                    </View>
                    {item.order?.totalAmount !== undefined && (
                        <View style={styles.saleDetailRow}>
                            <Text style={styles.saleDetailLabel}>Сумма заказа:</Text>
                            <Text style={styles.saleDetailValue}>
                                {formatCurrency(item.order.totalAmount)}
                            </Text>
                        </View>
                    )}
                    <View style={styles.saleDetailRow}>
                        <Text style={styles.saleDetailLabel}>Прибыль:</Text>
                        <Text style={[styles.saleDetailValue, styles.profitValue]}>
                            {formatCurrency(item.profit)}
                        </Text>
                    </View>
                </View>

                {item.order && (
                    <View style={styles.sourceInfo}>
                        <View style={styles.orderInfoContainer}>
                            <Text 
                                style={styles.sourceText}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                Заказ: {item.order.orderNumber || `#${item.orderId}`}
                            </Text>
                            {hasOrder && (
                                <Text style={styles.viewOrderText} numberOfLines={1}>
                                    Просмотр →
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {item.client && (
                    <View style={styles.sourceInfo}>
                        <Text style={styles.sourceText}>
                            Клиент: {item.client.name || 'Неизвестный'}
                        </Text>
                    </View>
                )}
            </>
        );

        // Если есть заказ, делаем карточку кликабельной
        if (hasOrder) {
            return (
                <TouchableOpacity
                    style={[styles.saleItem, styles.saleItemClickable]}
                    activeOpacity={0.7}
                    onPress={() => handleSalePress(item)}
                >
                    <SaleCardContent />
                </TouchableOpacity>
            );
        }

        // Если заказа нет, обычная карточка
        return (
            <View style={styles.saleItem}>
                <SaleCardContent />
            </View>
        );
    };

    const renderFooter = () => {
        if (!hasMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Color.blue2} />
            </View>
        );
    };

    if (loading && sales.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <AdminHeader
                    title={`Продажи: ${warehouseName}`}
                    onBackPress={() => navigation.goBack()}
                    showBackButton={true}
                />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Color.blue2} />
                    <Text style={styles.loadingText}>Загрузка продаж...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error && sales.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <AdminHeader
                    title={`Продажи: ${warehouseName}`}
                    onBackPress={() => navigation.goBack()}
                    showBackButton={true}
                />
                <View style={styles.centered}>
                    <Text style={styles.errorText}>Ошибка: {error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => loadSales(1, true)}>
                        <Text style={styles.retryButtonText}>Повторить</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const totalProfit = sales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.salePrice * sale.quantity || 0), 0);

    return (
        <SafeAreaView style={styles.container}>
            <AdminHeader
                title={`Продажи: ${warehouseName}`}
                onBackPress={() => navigation.goBack()}
                showBackButton={true}
            />

            {/* Выбор периода */}
            <View style={styles.periodSelector}>
                {['day', 'week', 'month', 'year'].map((p) => (
                    <TouchableOpacity
                        key={p}
                        style={[styles.periodButton, period === p && styles.periodButtonActive]}
                        onPress={() => handlePeriodChange(p)}
                    >
                        <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
                            {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Год'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Итоговая статистика */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Всего продаж</Text>
                        <Text style={styles.summaryValue}>{sales.length}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Выручка</Text>
                        <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Прибыль</Text>
                        <Text style={[styles.summaryValue, styles.profitValue]}>
                            {formatCurrency(totalProfit)}
                        </Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={sales}
                renderItem={renderSaleItem}
                keyExtractor={(item, index) => `sale-${item.id}-${index}`}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Продажи не найдены</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: FontSize.size_md,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    errorText: {
        fontSize: FontSize.size_md,
        color: Color.colorCrimson,
        textAlign: 'center',
        marginBottom: 16,
        fontFamily: FontFamily.sFProText,
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: Color.blue2,
        borderRadius: Border.br_base,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginVertical: 12,
        padding: 16,
        borderRadius: Border.br_base,
        ...Shadow.shadow_sm,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: FontSize.size_sm,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.bold,
        fontWeight: '700',
        color: Color.textPrimary,
    },
    profitValue: {
        color: '#4CAF50',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    saleItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: Border.br_base,
        padding: 16,
        marginBottom: 12,
        ...Shadow.shadow_sm,
    },
    saleItemClickable: {
        borderWidth: 1,
        borderColor: Color.blue2 + '40',
    },
    saleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    saleInfo: {
        flex: 1,
        marginRight: 12,
    },
    productName: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.bold,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: 4,
    },
    saleDate: {
        fontSize: FontSize.size_sm,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    saleTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: Border.br_sm,
    },
    badgeORDER: {
        backgroundColor: '#E3F2FD',
    },
    badgeSTOP: {
        backgroundColor: '#FFF3E0',
    },
    badgeDIRECT: {
        backgroundColor: '#E8F5E9',
    },
    saleTypeText: {
        fontSize: FontSize.size_xs,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.textPrimary,
    },
    saleDetails: {
        marginTop: 8,
    },
    saleDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    saleDetailLabel: {
        fontSize: FontSize.size_sm,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    saleDetailValue: {
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.textPrimary,
    },
    sourceInfo: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    orderInfoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    sourceText: {
        fontSize: FontSize.size_xs,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        flex: 1,
        flexShrink: 1,
        marginRight: 8,
    },
    viewOrderText: {
        fontSize: FontSize.size_xs,
        color: Color.blue2,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        flexShrink: 0,
    },
    emptyContainer: {
        paddingVertical: 48,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: FontSize.size_md,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    periodSelector: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: Border.br_base,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
    },
    periodButtonActive: {
        backgroundColor: Color.blue2,
    },
    periodButtonText: {
        fontSize: FontSize.size_sm,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    periodButtonTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
});

