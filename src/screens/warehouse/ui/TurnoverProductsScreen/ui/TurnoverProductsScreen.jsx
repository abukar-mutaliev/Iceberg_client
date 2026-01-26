import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Color, FontFamily, FontSize, Border, Shadow } from '@app/styles/GlobalStyles';
import WarehouseService from '@entities/warehouse/api/warehouseApi';
import { AdminHeader } from '@widgets/admin/AdminHeader';

export const TurnoverProductsScreen = (props) => {
    const navigation = useNavigation();
    const route = props?.route || useRoute();
    const warehouseId = route.params?.warehouseId;
    const warehouseName = route.params?.warehouseName || 'Склад';
    const type = route.params?.type || 'fast';
    const fromScreen = route.params?.fromScreen;

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [period, setPeriod] = useState('month');

    const title = type === 'fast' ? 'Быстро продающиеся товары' : 'Медленно продающиеся товары';
    const description = type === 'fast' 
        ? 'Товары с оборачиваемостью ≤ 7 дней'
        : 'Товары с оборачиваемостью > 30 дней';

    const loadProducts = useCallback(async (pageNum = 1, reset = false) => {
        if (!warehouseId) return;

        try {
            setError(null);
            if (reset) {
                setLoading(true);
            }

            const requestParams = {
                page: pageNum,
                limit: 20,
                period,
                _t: Date.now()
            };

            console.log('📤 Загрузка товаров по оборачиваемости:', { 
                warehouseId, 
                type, 
                period, 
                page: pageNum,
                params: requestParams
            });

            const response = await WarehouseService.getProductsByTurnover(warehouseId, type, requestParams);

            console.log('📥 Ответ от API (loadProducts):', {
                hasData: !!response.data,
                productsCount: response.data?.products?.length,
                pagination: response.data?.pagination,
                period: response.data?.period
            });

            const newProducts = response.data?.products || [];
            const pagination = response.data?.pagination || {};

            if (reset) {
                setProducts(newProducts);
            } else {
                setProducts(prev => [...prev, ...newProducts]);
            }

            setHasMore(pagination.page < pagination.pages);
            setPage(pageNum);
        } catch (err) {
            console.error('❌ Ошибка загрузки товаров:', err);
            setError(err.response?.data?.message || 'Не удалось загрузить товары');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [warehouseId, type, period]);

    useEffect(() => {
        loadProducts(1, true);
    }, [loadProducts]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        loadProducts(1, true);
    }, [loadProducts]);

    const handleLoadMore = useCallback(() => {
        if (!loading && hasMore) {
            loadProducts(page + 1, false);
        }
    }, [loading, hasMore, page, loadProducts]);

    const handlePeriodChange = useCallback(async (newPeriod) => {
        if (newPeriod === period) return;
        
        console.log('🔄 Переключение периода товаров по оборачиваемости:', { 
            from: period, 
            to: newPeriod,
            type,
            warehouseId 
        });
        
        setProducts([]);
        setError(null);
        setLoading(true);
        setPage(1);
        setHasMore(true);
        setPeriod(newPeriod);
        
        try {
            const requestParams = {
                page: 1,
                limit: 20,
                period: newPeriod,
                _t: Date.now()
            };
            
            console.log('📤 Запрос товаров по оборачиваемости:', requestParams);
            
            const response = await WarehouseService.getProductsByTurnover(warehouseId, type, requestParams);
            
            console.log('📥 Ответ от API:', {
                hasData: !!response.data,
                productsCount: response.data?.products?.length,
                pagination: response.data?.pagination,
                period: response.data?.period
            });
            
            const newProducts = response.data?.products || [];
            const pagination = response.data?.pagination || {};
            
            console.log('📊 Товары загружены (период изменен):', {
                period: newPeriod,
                type,
                productsCount: newProducts.length,
                totalCount: pagination.total,
                sampleProducts: newProducts.slice(0, 3).map(p => ({
                    productId: p.productId,
                    productName: p.product?.name,
                    turnoverDays: p.turnoverDays,
                    totalSold: p.totalSold
                }))
            });
            
            setProducts(newProducts);
            setHasMore(pagination.page < pagination.pages);
            setPage(1);
        } catch (err) {
            console.error('❌ Ошибка загрузки товаров:', err);
            setError(err.response?.data?.message || 'Не удалось загрузить товары');
        } finally {
            setLoading(false);
        }
    }, [period, warehouseId, type]);

    const handleProductPress = useCallback((productId) => {
        navigation.navigate('AdminProductDetail', {
            productId: parseInt(productId, 10),
            fromScreen: fromScreen || 'TurnoverProducts'
        });
    }, [navigation, fromScreen]);

    const formatNumber = (value) => {
        return new Intl.NumberFormat('ru-RU').format(value || 0);
    };

    const renderProductItem = useCallback(({ item }) => {
        const product = item.product || {};
        const imageUrl = product.images?.[0] || null;

        return (
            <TouchableOpacity
                style={styles.productCard}
                activeOpacity={0.7}
                onPress={() => handleProductPress(item.productId)}
            >
                {imageUrl && (
                    <Image source={{ uri: imageUrl }} style={styles.productImage} />
                )}
                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                        {product.name || 'Неизвестный товар'}
                    </Text>
                    <View style={styles.productStats}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Остаток:</Text>
                            <Text style={styles.statValue}>{formatNumber(item.currentStock)} коробок</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Продано:</Text>
                            <Text style={styles.statValue}>{formatNumber(item.totalSold)} коробок</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Оборачиваемость:</Text>
                            <Text style={[styles.statValue, styles.turnoverValue]}>
                                {item.turnoverDays?.toFixed(1) || '—'} дней
                            </Text>
                        </View>
                    </View>
                </View>
                <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
        );
    }, [handleProductPress]);

    return (
        <SafeAreaView style={styles.container}>
            <AdminHeader
                title={title}
                onBackPress={() => navigation.goBack()}
                showBackButton={true}
            />

            <View style={styles.content}>
                <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionText}>{description}</Text>
                </View>

                {/* Селектор периода */}
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

                {loading && products.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Color.blue2} />
                        <Text style={styles.loadingText}>Загрузка товаров...</Text>
                    </View>
                ) : error && products.length === 0 ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                            <Text style={styles.retryButtonText}>Попробовать снова</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={products}
                        renderItem={renderProductItem}
                        keyExtractor={(item, index) => `product-${item.productId}-${index}`}
                        contentContainerStyle={styles.listContainer}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                            />
                        }
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>
                                    {type === 'fast' 
                                        ? 'Нет быстро продающихся товаров' 
                                        : 'Нет медленно продающихся товаров'}
                                </Text>
                            </View>
                        }
                        ListFooterComponent={
                            loading && products.length > 0 ? (
                                <ActivityIndicator size="small" color={Color.blue2} style={styles.footerLoader} />
                            ) : null
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FBFAFF',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    descriptionContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: Border.br_base,
        padding: 12,
        marginBottom: 16,
        ...Shadow.shadow_sm,
    },
    descriptionText: {
        fontSize: FontSize.size_sm,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
    periodSelector: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 8,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: Border.br_base,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        alignItems: 'center',
    },
    periodButtonActive: {
        backgroundColor: Color.blue2,
        borderColor: Color.blue2,
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
    listContainer: {
        paddingBottom: 20,
    },
    productCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: Border.br_base,
        padding: 12,
        marginBottom: 12,
        alignItems: 'center',
        ...Shadow.shadow_sm,
    },
    productImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: 8,
    },
    productStats: {
        gap: 4,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: FontSize.size_xs,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginRight: 8,
    },
    statValue: {
        fontSize: FontSize.size_xs,
        color: Color.textPrimary,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    turnoverValue: {
        color: Color.blue2,
    },
    arrow: {
        fontSize: FontSize.size_lg,
        color: Color.blue2,
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: FontSize.size_sm,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: FontSize.size_md,
        color: Color.red,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: Color.blue2,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: Border.br_base,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: FontSize.size_md,
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
    },
    footerLoader: {
        marginVertical: 20,
    },
});

