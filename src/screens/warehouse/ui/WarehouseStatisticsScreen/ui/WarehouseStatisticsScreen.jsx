import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import WarehouseService from '@entities/warehouse/api/warehouseApi';
import { AdminHeader } from '@widgets/admin/AdminHeader';
import { useAuth } from '@entities/auth/hooks/useAuth';

export const WarehouseStatisticsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { currentUser } = useAuth();
    const warehouseId = route.params?.warehouseId;
    const warehouseName = route.params?.warehouseName || 'Склад';

    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState('month');

    const loadStatistics = useCallback(async (periodOverride = null) => {
        if (!warehouseId) return;

        try {
            setError(null);
            setLoading(true);
            const currentPeriod = periodOverride || period;
            // Добавляем timestamp для предотвращения кэширования
            const response = await WarehouseService.getWarehouseStatistics(warehouseId, { 
                period: currentPeriod,
                _t: Date.now()
            });
            console.log('📊 Статистика загружена:', { 
                period: currentPeriod, 
                salesCount: response.data?.sales?.totalQuantity,
                topProductsCount: response.data?.topSellingProducts?.length,
                data: response.data 
            });
            setStatistics(response.data);
        } catch (err) {
            console.error('❌ Ошибка загрузки статистики:', err);
            setError(err.response?.data?.message || 'Не удалось загрузить статистику');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [warehouseId, period]);

    // Загружаем данные только при изменении warehouseId, но не при изменении периода
    // (период обрабатывается в handlePeriodChange)
    useEffect(() => {
        loadStatistics();
    }, [warehouseId]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadStatistics();
    }, [loadStatistics]);

    const handlePeriodChange = useCallback(async (newPeriod) => {
        if (newPeriod === period) return; // Если период не изменился, ничего не делаем
        
        console.log('🔄 Переключение периода:', { from: period, to: newPeriod });
        
        // Сначала сбрасываем состояние
        setStatistics(null);
        setError(null);
        setLoading(true);
        
        // Затем обновляем период
        setPeriod(newPeriod);

        // Немедленно загружаем данные с новым периодом через loadStatistics
        try {
            await loadStatistics(newPeriod);
        } catch (err) {
            console.error('❌ Ошибка загрузки статистики:', err);
            setError(err.response?.data?.message || 'Не удалось загрузить статистику');
            setLoading(false);
        }
    }, [period, warehouseId, loadStatistics]);

    const handleViewSales = useCallback(() => {
        navigation.navigate('WarehouseSales', {
            warehouseId,
            warehouseName
        });
    }, [navigation, warehouseId, warehouseName]);

    const handleViewOrders = useCallback(() => {
        navigation.navigate('StaffOrders');
    }, [navigation]);

    const handleViewAllProducts = useCallback(() => {
        navigation.navigate('ProductManagement', {
            fromScreen: 'WarehouseStatistics'
        });
    }, [navigation]);

    const handleViewActiveProducts = useCallback(() => {
        navigation.navigate('ProductManagement', {
            fromScreen: 'WarehouseStatistics'
        });
    }, [navigation]);

    const handleViewLowStockProducts = useCallback(() => {
        navigation.navigate('StockAlerts');
    }, [navigation]);

    const handleViewFastMovingProducts = useCallback(() => {
        navigation.navigate('FastMovingProducts', {
            warehouseId,
            warehouseName,
            fromScreen: 'WarehouseStatistics'
        });
    }, [navigation, warehouseId, warehouseName]);

    const handleViewSlowMovingProducts = useCallback(() => {
        navigation.navigate('SlowMovingProducts', {
            warehouseId,
            warehouseName,
            fromScreen: 'WarehouseStatistics'
        });
    }, [navigation, warehouseId, warehouseName]);

    const handleViewProductDetail = useCallback((productId) => {
        if (!productId) return;
        navigation.navigate('AdminProductDetail', {
            productId: parseInt(productId, 10),
            fromScreen: 'WarehouseStatistics'
        });
    }, [navigation]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value || 0);
    };

    const formatNumber = (value) => {
        return new Intl.NumberFormat('ru-RU').format(value || 0);
    };

    if (loading && !statistics) {
        return (
            <SafeAreaView style={styles.container}>
                <AdminHeader
                    title={warehouseName}
                    onBackPress={() => navigation.goBack()}
                    showBackButton={true}
                />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Color.blue2} />
                    <Text style={styles.loadingText}>Загрузка статистики...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error && !statistics) {
        return (
            <SafeAreaView style={styles.container}>
                <AdminHeader
                    title={warehouseName}
                    onBackPress={() => navigation.goBack()}
                    showBackButton={true}
                />
                <View style={styles.centered}>
                    <Text style={styles.errorText}>Ошибка: {error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={loadStatistics}>
                        <Text style={styles.retryButtonText}>Повторить</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const stats = statistics || {};

    return (
        <SafeAreaView style={styles.container}>
            <AdminHeader
                title={`Статистика: ${warehouseName}`}
                onBackPress={() => navigation.goBack()}
                showBackButton={true}
            />

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
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

                {/* Статистика продаж */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Продажи</Text>
                    <View style={styles.statsCard}>
                        <TouchableOpacity 
                            style={styles.statRow}
                            activeOpacity={0.7}
                            onPress={handleViewSales}
                        >
                            <Text style={styles.statLabel}>Выручка</Text>
                            <View style={styles.statValueContainer}>
                                <Text style={styles.statValue}>{formatCurrency(stats.sales?.totalSales)}</Text>
                                <Text style={styles.statArrow}>→</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.statRow}
                            activeOpacity={0.7}
                            onPress={handleViewSales}
                        >
                            <Text style={styles.statLabel}>Прибыль</Text>
                            <View style={styles.statValueContainer}>
                                <Text style={[styles.statValue, styles.profitValue]}>
                                    {formatCurrency(stats.sales?.totalProfit)}
                                </Text>
                                <Text style={styles.statArrow}>→</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.statRow}
                            activeOpacity={0.7}
                            onPress={handleViewSales}
                        >
                            <Text style={styles.statLabel}>Продано коробок</Text>
                            <View style={styles.statValueContainer}>
                                <Text style={styles.statValue}>{formatNumber(stats.sales?.totalQuantity)}</Text>
                                <Text style={styles.statArrow}>→</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.statRow}
                            activeOpacity={0.7}
                            onPress={handleViewOrders}
                        >
                            <Text style={styles.statLabel}>Заказов</Text>
                            <View style={styles.statValueContainer}>
                                <Text style={styles.statValue}>{formatNumber(stats.sales?.totalOrders)}</Text>
                                <Text style={styles.statArrow}>→</Text>
                            </View>
                        </TouchableOpacity>
                        <View style={styles.statRow}>
                            <Text style={styles.statLabel}>Средний чек</Text>
                            <Text style={styles.statValue}>{formatCurrency(stats.sales?.averageOrderValue)}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.viewButton} onPress={handleViewSales}>
                        <Text style={styles.viewButtonText}>Посмотреть все продажи →</Text>
                    </TouchableOpacity>
                </View>

                {/* Статистика товаров */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Товары</Text>
                    <View style={styles.statsCard}>
                        <TouchableOpacity 
                            style={styles.statRow}
                            activeOpacity={0.7}
                            onPress={handleViewAllProducts}
                        >
                            <Text style={styles.statLabel}>Всего товаров</Text>
                            <View style={styles.statValueContainer}>
                                <Text style={styles.statValue}>{formatNumber(stats.products?.totalProducts)}</Text>
                                <Text style={styles.statArrow}>→</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.statRow}
                            activeOpacity={0.7}
                            onPress={handleViewActiveProducts}
                        >
                            <Text style={styles.statLabel}>Активных товаров</Text>
                            <View style={styles.statValueContainer}>
                                <Text style={styles.statValue}>{formatNumber(stats.products?.activeProducts)}</Text>
                                <Text style={styles.statArrow}>→</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.statRow}
                            activeOpacity={0.7}
                            onPress={handleViewLowStockProducts}
                        >
                            <Text style={styles.statLabel}>Товаров с низким остатком</Text>
                            <View style={styles.statValueContainer}>
                                <Text style={[styles.statValue, styles.warningValue]}>
                                    {formatNumber(stats.products?.lowStockProducts)}
                                </Text>
                                <Text style={styles.statArrow}>→</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Оборачиваемость */}
                {stats.turnover && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Оборачиваемость</Text>
                        <View style={styles.statsCard}>
                            <View style={styles.statRow}>
                                <Text style={styles.statLabel}>Средняя оборачиваемость</Text>
                                <Text style={styles.statValue}>
                                    {stats.turnover.averageTurnoverDays?.toFixed(1) || 0} дней
                                </Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.statRow}
                                activeOpacity={0.7}
                                onPress={handleViewFastMovingProducts}
                            >
                                <Text style={styles.statLabel}>Быстро продающихся</Text>
                                <View style={styles.statValueContainer}>
                                    <Text style={[styles.statValue, styles.successValue]}>
                                        {formatNumber(stats.turnover.fastMovingProducts)}
                                    </Text>
                                    <Text style={styles.statArrow}>→</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.statRow}
                                activeOpacity={0.7}
                                onPress={handleViewSlowMovingProducts}
                            >
                                <Text style={styles.statLabel}>Медленно продающихся</Text>
                                <View style={styles.statValueContainer}>
                                    <Text style={[styles.statValue, styles.warningValue]}>
                                        {formatNumber(stats.turnover.slowMovingProducts)}
                                    </Text>
                                    <Text style={styles.statArrow}>→</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Топ продаваемых товаров */}
                {stats.topSellingProducts && stats.topSellingProducts.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Топ продаваемых товаров</Text>
                        <View style={styles.topProductsCard}>
                            {stats.topSellingProducts.slice(0, 5).map((product, index) => (
                                <TouchableOpacity
                                    key={product.productId || index}
                                    style={styles.topProductItem}
                                    activeOpacity={0.7}
                                    onPress={() => handleViewProductDetail(product.productId)}
                                >
                                    <View style={styles.topProductRank}>
                                        <Text style={styles.topProductRankText}>#{index + 1}</Text>
                                    </View>
                                    <View style={styles.topProductInfo}>
                                        <Text style={styles.topProductName} numberOfLines={1}>
                                            {product.productName || 'Неизвестный товар'}
                                        </Text>
                                        <Text style={styles.topProductStats}>
                                            {formatNumber(product.quantitySold)} коробок • {formatCurrency(product.revenue)}
                                        </Text>
                                    </View>
                                    <Text style={styles.statArrow}>→</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Color.colorLightMode,
    },
    scrollView: {
        flex: 1,
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
    section: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.bold,
        fontWeight: '700',
        color: Color.textPrimary,
        marginBottom: 12,
    },
    statsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: Border.br_base,
        padding: 16,
        ...Shadow.shadow_sm,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    statValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statArrow: {
        fontSize: FontSize.size_md,
        color: Color.blue2,
        fontWeight: '600',
    },
    statLabel: {
        fontSize: FontSize.size_md,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    statValue: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.bold,
        fontWeight: '700',
        color: Color.textPrimary,
    },
    profitValue: {
        color: '#4CAF50',
    },
    warningValue: {
        color: Color.orange,
    },
    successValue: {
        color: '#4CAF50',
    },
    viewButton: {
        marginTop: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    viewButtonText: {
        fontSize: FontSize.size_md,
        color: Color.blue2,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    topProductsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: Border.br_base,
        padding: 16,
        ...Shadow.shadow_sm,
    },
    topProductItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    topProductRank: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Color.blue2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    topProductRankText: {
        fontSize: FontSize.size_sm,
        color: '#FFFFFF',
        fontFamily: FontFamily.bold,
        fontWeight: '700',
    },
    topProductInfo: {
        flex: 1,
    },
    topProductName: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: 4,
    },
    topProductStats: {
        fontSize: FontSize.size_sm,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
});

