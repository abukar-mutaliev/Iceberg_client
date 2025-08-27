import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, Border, Shadow } from '@app/styles/GlobalStyles';

export const WarehouseStockInfo = ({
                                       warehousesWithStock = [],
                                       totalStock = 0,
                                       availableStock = 0,
                                       loading = false,
                                       error = null,
                                       // Дополнительные данные из useProductStock
                                       productStocks = [],
                                       nearestWarehouses = [],
                                       hasStock = false,
                                       isLowStock = false,
                                       stockStats = null,
                                       // Опциональные обработчики
                                       onWarehousePress = null,
                                       onRefresh = null
                                   }) => {
    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.centeredContainer}>
                    <ActivityIndicator size="small" color={Color.blue2} />
                    <Text style={styles.loadingText}>Загрузка данных о складах...</Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.centeredContainer}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>Ошибка загрузки данных о складах</Text>
                    <Text style={styles.errorSubtext}>{error}</Text>
                    {onRefresh && (
                        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                            <Text style={styles.retryButtonText}>Повторить</Text>
                        </TouchableOpacity>
                    )}
                </View>
            );
        }

        if (!hasStock || (!warehousesWithStock || warehousesWithStock.length === 0)) {
            return (
                <View style={styles.centeredContainer}>
                    <Text style={styles.emptyIcon}>📦</Text>
                    <Text style={styles.noDataText}>Товар не найден на складах</Text>
                    <Text style={styles.noDataSubtext}>
                        Возможно, товар временно отсутствует или еще не поступил на склады
                    </Text>
                    {onRefresh && (
                        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                            <Text style={styles.retryButtonText}>Обновить</Text>
                        </TouchableOpacity>
                    )}
                </View>
            );
        }

        return (
            <>
                {/* Общая статистика */}
                <View style={[styles.stockSummaryCard, isLowStock && styles.lowStockCard]}>
                    <View style={styles.stockSummaryRow}>
                        <View style={styles.stockSummaryItem}>
                            <Text style={styles.stockSummaryLabel}>Всего на складах</Text>
                            <Text style={[styles.stockSummaryValue, styles.totalStock]}>
                                {totalStock} шт.
                            </Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.stockSummaryItem}>
                            <Text style={styles.stockSummaryLabel}>Доступно</Text>
                            <Text style={[
                                styles.stockSummaryValue,
                                isLowStock ? styles.lowStock : styles.availableStock
                            ]}>
                                {availableStock} шт.
                            </Text>
                        </View>
                    </View>

                    {/* Индикатор статуса */}
                    <View style={styles.statusIndicator}>
                        <View style={[
                            styles.statusDot,
                            getStatusDotStyle(availableStock, isLowStock)
                        ]} />
                        <Text style={styles.statusText}>
                            {getStatusText(availableStock, isLowStock)}
                        </Text>
                        {stockStats && (
                            <Text style={styles.statsText}>
                                • {stockStats.warehousesWithStock || 0} из {stockStats.totalWarehouses || 0} складов
                            </Text>
                        )}
                    </View>
                </View>

                {/* Список складов */}
                <View style={styles.warehousesList}>
                    <View style={styles.warehousesHeader}>
                        <Text style={styles.warehousesTitle}>Склады с товаром</Text>
                        {nearestWarehouses && nearestWarehouses.length > 0 && (
                            <Text style={styles.nearestLabel}>📍 Ближайшие</Text>
                        )}
                    </View>

                    {warehousesWithStock
                        .sort((a, b) => (b.availableQuantity || 0) - (a.availableQuantity || 0))
                        .map((warehouse, index) => (
                            <WarehouseCard
                                key={warehouse.id}
                                warehouse={warehouse}
                                onPress={onWarehousePress}
                                isNearest={nearestWarehouses?.some(nw => nw.id === warehouse.id)}
                            />
                        ))}
                </View>

                {/* Дополнительная статистика */}
                {stockStats && (
                    <View style={styles.additionalStats}>
                        <Text style={styles.statsTitle}>Статистика</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Всего складов</Text>
                                <Text style={styles.statValue}>{stockStats.totalWarehouses}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>С товаром</Text>
                                <Text style={styles.statValue}>{stockStats.warehousesWithStock}</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Зарезервировано</Text>
                                <Text style={styles.statValue}>{stockStats.totalReserved} шт.</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>% резерва</Text>
                                <Text style={styles.statValue}>{stockStats.reservedPercentage}%</Text>
                            </View>
                        </View>
                    </View>
                )}
            </>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Информация о складах</Text>
            {renderContent()}
        </View>
    );
};

// Компонент карточки склада
const WarehouseCard = React.memo(({ warehouse, onPress, isNearest = false }) => {
    const reservedQuantity = (warehouse.totalQuantity || 0) - (warehouse.availableQuantity || 0);
    const hasReserved = reservedQuantity > 0;

    const handlePress = () => {
        if (onPress) {
            onPress(warehouse);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.warehouseCard, isNearest && styles.nearestWarehouseCard]}
            onPress={handlePress}
            disabled={!onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={styles.warehouseHeader}>
                <View style={styles.warehouseMainInfo}>
                    <View style={styles.warehouseNameRow}>
                        <Text style={styles.warehouseName}>{warehouse.name}</Text>
                        {isNearest && <Text style={styles.nearestBadge}>📍</Text>}
                    </View>
                    {warehouse.address && (
                        <Text style={styles.warehouseAddress}>{warehouse.address}</Text>
                    )}
                </View>
                <View style={styles.warehouseQuantityContainer}>
                    <Text style={styles.warehouseQuantity}>
                        {warehouse.availableQuantity || 0} шт.
                    </Text>
                    <Text style={styles.warehouseQuantityLabel}>доступно</Text>
                </View>
            </View>

            {warehouse.district && (
                <View style={styles.warehouseDistrict}>
                    <Text style={styles.districtIcon}>📍</Text>
                    <Text style={styles.warehouseDistrictText}>
                        {warehouse.district.name || warehouse.district}
                    </Text>
                </View>
            )}

            {hasReserved && (
                <View style={styles.reservedInfo}>
                    <Text style={styles.reservedIcon}>🔒</Text>
                    <Text style={styles.reservedQuantity}>
                        Зарезервировано: {reservedQuantity} шт.
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
});

// Вспомогательные функции
const getStatusDotStyle = (availableStock, isLowStock) => {
    if (availableStock <= 0) return styles.statusUnavailable;
    if (isLowStock) return styles.statusLowStock;
    return styles.statusAvailable;
};

const getStatusText = (availableStock, isLowStock) => {
    if (availableStock <= 0) return 'Нет в наличии';
    if (isLowStock) return 'Заканчивается';
    return 'В наличии';
};

const styles = StyleSheet.create({
    container: {
        margin: normalize(16),
        backgroundColor: Color.colorLightMode,
        borderRadius: Border.radius.medium,
        padding: normalize(16),
        ...Shadow.light,
    },
    sectionTitle: {
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: Color.dark,
        marginBottom: normalize(16),
        fontFamily: FontFamily.sFProDisplay,
    },
    centeredContainer: {
        alignItems: 'center',
        paddingVertical: normalize(20),
    },
    loadingText: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        marginTop: normalize(8),
        fontFamily: FontFamily.sFProText,
    },
    errorIcon: {
        fontSize: normalizeFont(32),
        marginBottom: normalize(8),
    },
    errorText: {
        fontSize: normalizeFont(14),
        color: Color.red,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        textAlign: 'center',
    },
    errorSubtext: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginTop: normalize(4),
    },
    emptyIcon: {
        fontSize: normalizeFont(32),
        marginBottom: normalize(8),
    },
    noDataText: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        textAlign: 'center',
    },
    noDataSubtext: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginTop: normalize(8),
        paddingHorizontal: normalize(20),
    },
    retryButton: {
        backgroundColor: Color.blue2,
        paddingHorizontal: normalize(16),
        paddingVertical: normalize(8),
        borderRadius: normalize(16),
        marginTop: normalize(12),
    },
    retryButtonText: {
        color: Color.colorLightMode,
        fontSize: normalizeFont(12),
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    },
    stockSummaryCard: {
        backgroundColor: Color.lightGray,
        borderRadius: Border.radius.small,
        padding: normalize(16),
        marginBottom: normalize(16),
    },
    lowStockCard: {
        backgroundColor: '#FFF3CD',
        borderLeftWidth: 4,
        borderLeftColor: '#FFC107',
    },
    stockSummaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stockSummaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        height: normalize(40),
        backgroundColor: Color.border,
        marginHorizontal: normalize(16),
    },
    stockSummaryLabel: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
        textAlign: 'center',
    },
    stockSummaryValue: {
        fontSize: normalizeFont(20),
        fontWeight: '700',
        fontFamily: FontFamily.sFProDisplay,
    },
    totalStock: {
        color: Color.blue2,
    },
    availableStock: {
        color: '#4CAF50',
    },
    lowStock: {
        color: '#FFC107',
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: normalize(12),
        paddingTop: normalize(12),
        borderTopWidth: 0.5,
        borderTopColor: Color.border,
    },
    statusDot: {
        width: normalize(8),
        height: normalize(8),
        borderRadius: normalize(4),
        marginRight: normalize(6),
    },
    statusAvailable: {
        backgroundColor: '#4CAF50',
    },
    statusLowStock: {
        backgroundColor: '#FFC107',
    },
    statusUnavailable: {
        backgroundColor: '#f44336',
    },
    statusText: {
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: Color.textSecondary,
    },
    statsText: {
        fontSize: normalizeFont(10),
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
        marginLeft: normalize(8),
    },
    warehousesList: {
        gap: normalize(12),
    },
    warehousesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(8),
    },
    warehousesTitle: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    nearestLabel: {
        fontSize: normalizeFont(10),
        color: Color.blue2,
        fontFamily: FontFamily.sFProText,
    },
    warehouseCard: {
        backgroundColor: '#F8F9FA',
        borderRadius: Border.radius.small,
        padding: normalize(12),
        borderWidth: 0.5,
        borderColor: Color.border,
    },
    nearestWarehouseCard: {
        borderColor: Color.blue2,
        borderWidth: 1,
    },
    warehouseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: normalize(8),
    },
    warehouseMainInfo: {
        flex: 1,
        marginRight: normalize(12),
    },
    warehouseNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    warehouseName: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: normalize(2),
        flex: 1,
    },
    nearestBadge: {
        fontSize: normalizeFont(12),
        marginLeft: normalize(4),
    },
    warehouseAddress: {
        fontSize: normalizeFont(13),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    warehouseQuantityContainer: {
        alignItems: 'flex-end',
    },
    warehouseQuantity: {
        fontSize: normalizeFont(18),
        fontWeight: '700',
        color: Color.blue2,
        fontFamily: FontFamily.sFProDisplay,
    },
    warehouseQuantityLabel: {
        fontSize: normalizeFont(10),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(2),
    },
    warehouseDistrict: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: normalize(4),
    },
    districtIcon: {
        fontSize: normalizeFont(12),
        marginRight: normalize(4),
    },
    warehouseDistrictText: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    reservedInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: normalize(4),
        paddingTop: normalize(8),
        borderTopWidth: 0.5,
        borderTopColor: Color.border,
    },
    reservedIcon: {
        fontSize: normalizeFont(12),
        marginRight: normalize(4),
    },
    reservedQuantity: {
        fontSize: normalizeFont(12),
        color: Color.orange,
        fontFamily: FontFamily.sFProText,
        fontStyle: 'italic',
    },
    additionalStats: {
        marginTop: normalize(16),
        paddingTop: normalize(16),
        borderTopWidth: 0.5,
        borderTopColor: Color.border,
    },
    statsTitle: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: Color.dark,
        marginBottom: normalize(12),
        fontFamily: FontFamily.sFProText,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: normalizeFont(10),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginBottom: normalize(4),
    },
    statValue: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProDisplay,
    },
}); 