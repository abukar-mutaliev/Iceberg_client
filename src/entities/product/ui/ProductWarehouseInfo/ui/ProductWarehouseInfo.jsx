import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily, Border, Shadow } from '@app/styles/GlobalStyles';

// Функция для правильного склонения слова "коробка"
const getBoxesText = (count) => {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'коробка';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'коробки';
    } else {
        return 'коробок';
    }
};

export const ProductWarehouseInfo = ({
                                         warehousesWithStock,
                                         totalStock,
                                         availableStock,
                                         loading,
                                         error
                                     }) => {

    const normalizedWarehouses = useMemo(() => {
        if (!warehousesWithStock) return [];

        if (Array.isArray(warehousesWithStock)) {
            return warehousesWithStock;
        }

        if (typeof warehousesWithStock === 'object') {
            if (warehousesWithStock.warehouses) {
                return Array.isArray(warehousesWithStock.warehouses) ? warehousesWithStock.warehouses : [];
            }
            if (warehousesWithStock.data) {
                return Array.isArray(warehousesWithStock.data) ? warehousesWithStock.data : [];
            }
        }

        return [];
    }, [warehousesWithStock]);

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
                </View>
            );
        }

        if (!normalizedWarehouses || normalizedWarehouses.length === 0) {
            return (
                <View style={styles.centeredContainer}>
                    <Text style={styles.emptyIcon}>📦</Text>
                    <Text style={styles.noDataText}>Товар не найден на складах</Text>
                    <Text style={styles.noDataSubtext}>
                        Возможно, товар временно отсутствует или еще не поступил на склады
                    </Text>
                </View>
            );
        }

        return (
            <>
                {/* Общая статистика */}
                <View style={styles.stockSummaryCard}>
                    <View style={styles.stockSummaryRow}>
                        <View style={styles.stockSummaryItem}>
                            <Text style={styles.stockSummaryLabel}>Всего на складах</Text>
                            <Text style={[styles.stockSummaryValue, styles.totalStock]}>
                                {totalStock || 0} {getBoxesText(totalStock || 0)}
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.stockSummaryItem}>
                            <Text style={styles.stockSummaryLabel}>Доступно</Text>
                            <Text style={[styles.stockSummaryValue, styles.availableStock]}>
                                {availableStock || 0} {getBoxesText(availableStock || 0)}
                            </Text>
                        </View>
                    </View>

                    {/* Индикатор статуса */}
                    <View style={styles.statusIndicator}>
                        <View style={[
                            styles.statusDot,
                            (availableStock || 0) > 0 ? styles.statusAvailable : styles.statusUnavailable
                        ]} />
                        <Text style={styles.statusText}>
                            {(availableStock || 0) > 0 ? 'В наличии' : 'Нет в наличии'}
                        </Text>
                    </View>
                </View>

                {/* Список складов */}
                <View style={styles.warehousesList}>
                    <Text style={styles.warehousesTitle}>Склады с товаром ({normalizedWarehouses.length})</Text>
                    {normalizedWarehouses
                        .sort((a, b) => (b.availableQuantity || 0) - (a.availableQuantity || 0))
                        .map((warehouse, index) => (
                            <WarehouseCard key={warehouse.id || warehouse.warehouseId || index} warehouse={warehouse} />
                        ))}
                </View>
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

const WarehouseCard = React.memo(({ warehouse }) => {
    // Обрабатываем разные структуры данных
    const warehouseData = useMemo(() => {
        // Если это данные из API /find-with-product
        if (warehouse.warehouse) {
            return {
                id: warehouse.warehouseId || warehouse.id,
                name: warehouse.warehouse.name || warehouse.warehouseName || warehouse.name || 'Склад без названия',
                address: warehouse.warehouse.address || warehouse.warehouseAddress || warehouse.address,
                district: warehouse.warehouse.district || warehouse.district,
                totalQuantity: warehouse.totalQuantity || warehouse.quantity || 0,
                availableQuantity: warehouse.availableQuantity || warehouse.quantity || 0,
                priceInfo: warehouse.priceInfo || warehouse.productStock?.priceInfo
            };
        }

        // Если это прямые данные склада
        return {
            id: warehouse.id || warehouse.warehouseId,
            name: warehouse.warehouseName || warehouse.name || 'Склад без названия',
            address: warehouse.warehouseAddress || warehouse.address,
            district: warehouse.district,
            totalQuantity: warehouse.totalQuantity || warehouse.quantity || 0,
            availableQuantity: warehouse.availableQuantity || warehouse.quantity || 0,
            priceInfo: warehouse.priceInfo || warehouse.productStock?.priceInfo
        };
    }, [warehouse]);

    const reservedQuantity = warehouseData.totalQuantity - warehouseData.availableQuantity;
    const hasReserved = reservedQuantity > 0;
    
    // Получаем информацию о ценах
    const priceInfo = warehouseData.priceInfo;
    const warehousePrice = priceInfo?.warehousePrice;
    const effectivePrice = priceInfo?.effectivePrice ?? warehousePrice;
    const basePrice = priceInfo?.basePrice;
    const discount = priceInfo?.discount;
    const discountPercent = priceInfo?.discountPercent;

    return (
        <View style={styles.warehouseCard}>
            <View style={styles.warehouseHeader}>
                <View style={styles.warehouseMainInfo}>
                    <Text style={styles.warehouseName}>{warehouseData.name}</Text>
                    {warehouseData.address && (
                        <Text style={styles.warehouseAddress}>{warehouseData.address}</Text>
                    )}
                </View>
                <View style={styles.warehouseQuantityContainer}>
                    <Text style={styles.warehouseQuantity}>
                        {warehouseData.availableQuantity} {getBoxesText(warehouseData.availableQuantity)}
                    </Text>
                    <Text style={styles.warehouseQuantityLabel}>доступно</Text>
                </View>
            </View>

            {/* Информация о ценах */}
            {(effectivePrice || basePrice) && (
                <View style={styles.priceInfoContainer}>
                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Цена за коробку:</Text>
                        <Text style={styles.priceValue}>
                            {effectivePrice ? parseFloat(effectivePrice).toFixed(0) : parseFloat(basePrice).toFixed(0)} ₽
                        </Text>
                    </View>
                    {warehousePrice !== null && warehousePrice !== undefined && (
                        <View style={styles.warehousePriceRow}>
                            <Text style={styles.warehousePriceLabel}>Цена для склада:</Text>
                            <Text style={styles.warehousePriceValue}>
                                {parseFloat(warehousePrice).toFixed(0)} ₽
                            </Text>
                        </View>
                    )}
                    {warehousePrice !== null && warehousePrice !== undefined && basePrice && discount < 0 && (
                        <View style={styles.discountRow}>
                            <Text style={styles.discountText}>
                                Скидка: {Math.abs(discount).toFixed(0)} ₽ ({Math.abs(discountPercent || 0).toFixed(1)}%)
                            </Text>
                            <Text style={styles.basePriceText}>
                                Базовая: {parseFloat(basePrice).toFixed(0)} ₽
                            </Text>
                        </View>
                    )}
                    {warehousePrice === null && basePrice && (
                        <Text style={styles.fallbackPriceText}>
                            Используется базовая цена: {parseFloat(basePrice).toFixed(0)} ₽
                        </Text>
                    )}
                </View>
            )}

            {warehouseData.district && (
                <View style={styles.warehouseDistrict}>
                    <Text style={styles.districtIcon}>📍</Text>
                    <Text style={styles.warehouseDistrictText}>
                        {typeof warehouseData.district === 'object'
                            ? warehouseData.district.name || warehouseData.district
                            : warehouseData.district
                        }
                    </Text>
                </View>
            )}

            {hasReserved && (
                <View style={styles.reservedInfo}>
                    <Text style={styles.reservedIcon}>🔒</Text>
                    <Text style={styles.reservedQuantity}>
                        Зарезервировано: {reservedQuantity} {getBoxesText(reservedQuantity)}
                    </Text>
                </View>
            )}

            {/* Дополнительная информация для отладки */}
            {warehouseData.totalQuantity !== undefined && (
                <View style={styles.debugInfo}>
                    <Text style={styles.debugText}>
                        Общее количество: {warehouseData.totalQuantity} {getBoxesText(warehouseData.totalQuantity)}
                    </Text>
                </View>
            )}
        </View>
    );
});

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
    stockSummaryCard: {
        backgroundColor: Color.lightGray,
        borderRadius: Border.radius.small,
        padding: normalize(16),
        marginBottom: normalize(16),
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
    statusUnavailable: {
        backgroundColor: '#f44336',
    },
    statusText: {
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
        color: Color.textSecondary,
    },
    warehousesList: {
        gap: normalize(12),
    },
    warehousesTitle: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: Color.dark,
        marginBottom: normalize(8),
        fontFamily: FontFamily.sFProText,
    },
    warehouseCard: {
        backgroundColor: '#F8F9FA',
        borderRadius: Border.radius.small,
        padding: normalize(12),
        borderWidth: 0.5,
        borderColor: Color.border,
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
    warehouseName: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProDisplay,
        marginBottom: normalize(2),
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
    debugInfo: {
        marginTop: normalize(4),
        paddingTop: normalize(4),
        borderTopWidth: 0.5,
        borderTopColor: Color.border,
    },
    debugText: {
        fontSize: normalizeFont(10),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        fontStyle: 'italic',
    },
    priceInfoContainer: {
        marginTop: normalize(8),
        paddingTop: normalize(8),
        borderTopWidth: 0.5,
        borderTopColor: Color.border,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(4),
    },
    priceLabel: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    priceValue: {
        fontSize: normalizeFont(16),
        fontWeight: '700',
        color: Color.blue2,
        fontFamily: FontFamily.sFProDisplay,
    },
    warehousePriceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: normalize(4),
        paddingTop: normalize(4),
        borderTopWidth: 0.5,
        borderTopColor: Color.border,
    },
    warehousePriceLabel: {
        fontSize: normalizeFont(11),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    warehousePriceValue: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: '#3B43A2',
        fontFamily: FontFamily.sFProDisplay,
    },
    discountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: normalize(4),
    },
    discountText: {
        fontSize: normalizeFont(11),
        color: '#4CAF50',
        fontFamily: FontFamily.sFProText,
        fontWeight: '500',
    },
    basePriceText: {
        fontSize: normalizeFont(10),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        textDecorationLine: 'line-through',
    },
    fallbackPriceText: {
        fontSize: normalizeFont(10),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        fontStyle: 'italic',
        marginTop: normalize(4),
    },
});

// Правильный экспорт компонента
export default ProductWarehouseInfo;