import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import { useWarehouses } from '@entities/warehouse/hooks/useWarehouses';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

export const ProductWarehouseStockManager = ({
    productStocks = [], // [{ warehouseId, quantity, reserved?, isMain?, warehousePrice? }]
    onStocksChange,
    error,
    totalQuantity,
    onTotalQuantityChange,
    title = "Остатки по складам",
    canSetWarehousePrice = false,
    allowedWarehouseIds = null,
    basePrice = null
}) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const { warehouses: allWarehouses, loading: loadingWarehouses } = useWarehouses({ autoLoad: true });
    const warehouses = useMemo(() => {
        if (!allowedWarehouseIds?.length) return allWarehouses;
        return (allWarehouses || []).filter((w) => allowedWarehouseIds.includes(w.id));
    }, [allWarehouses, allowedWarehouseIds]);
    const [stocks, setStocks] = useState({});
    const [reservedMap, setReservedMap] = useState({});
    const [priceMap, setPriceMap] = useState({});
    const [showAllWarehouses, setShowAllWarehouses] = useState(false);

    const emitStocks = useCallback((nextStocks, nextReserved, nextPrices) => {
        if (!onStocksChange) return;
        const stockArray = Object.entries(nextStocks).map(([warehouseId, quantity]) => {
            const warehouse = warehouses.find((w) => w.id === parseInt(warehouseId, 10));
            return {
                warehouseId: parseInt(warehouseId, 10),
                quantity: quantity === '' || quantity === undefined ? 0 : parseInt(quantity, 10) || 0,
                reserved: nextReserved[warehouseId] || 0,
                isMain: Boolean(warehouse?.isMain),
                ...(canSetWarehousePrice && nextPrices[warehouseId] != null
                    ? { warehousePrice: nextPrices[warehouseId] }
                    : {})
            };
        });
        onStocksChange(stockArray);
    }, [onStocksChange, warehouses, canSetWarehousePrice]);

    useEffect(() => {
        if (Array.isArray(productStocks) && productStocks.length > 0) {
            const stocksMap = {};
            const nextReserved = {};
            const nextPrices = {};
            productStocks.forEach(stock => {
                if (stock.warehouseId && typeof stock.quantity === 'number') {
                    stocksMap[stock.warehouseId] = stock.quantity;
                    nextReserved[stock.warehouseId] = stock.reserved || 0;
                    if (stock.warehousePrice != null) {
                        nextPrices[stock.warehouseId] = stock.warehousePrice;
                    }
                }
            });
            setStocks(stocksMap);
            setReservedMap(nextReserved);
            setPriceMap(nextPrices);
        }
    }, [productStocks]);

    // Вычисляем общее количество на основе остатков по складам
    const calculatedTotal = useMemo(() => {
        return Object.values(stocks).reduce((sum, quantity) => {
            // Игнорируем пустые строки при вычислении общего количества
            const numValue = quantity === '' ? 0 : parseInt(quantity) || 0;
            return sum + numValue;
        }, 0);
    }, [stocks]);

    // Обновляем общее количество при изменении остатков (только если передан колбэк)
    useEffect(() => {
        if (onTotalQuantityChange && calculatedTotal !== totalQuantity) {
            onTotalQuantityChange(calculatedTotal);
        }
    }, [calculatedTotal, totalQuantity, onTotalQuantityChange]);

    // Отображаемое общее количество - используем переданное или рассчитанное
    const displayTotal = totalQuantity !== undefined ? totalQuantity : calculatedTotal;

    // Обработка изменения количества на складе
    const handleStockChange = useCallback((warehouseId, quantity) => {
        const reserved = reservedMap[warehouseId] || 0;
        const parsed = quantity === '' ? '' : parseInt(quantity, 10);
        const safeValue = parsed === '' ? '' : (Number.isNaN(parsed) ? reserved : Math.max(parsed, reserved));
        const newStocks = {
            ...stocks,
            [warehouseId]: safeValue
        };
        setStocks(newStocks);
        emitStocks(newStocks, reservedMap, priceMap);
    }, [stocks, reservedMap, priceMap, emitStocks]);

    const handlePriceChange = useCallback((warehouseId, priceText) => {
        const parsed = priceText === '' ? null : parseFloat(String(priceText).replace(',', '.'));
        const nextPrices = {
            ...priceMap,
            [warehouseId]: Number.isNaN(parsed) ? null : parsed
        };
        setPriceMap(nextPrices);
        emitStocks(stocks, reservedMap, nextPrices);
    }, [priceMap, stocks, reservedMap, emitStocks]);

    const handleAddWarehouse = useCallback((warehouseId) => {
        if (!warehouseId || stocks[warehouseId] !== undefined) return;
        const newStocks = {
            ...stocks,
            [warehouseId]: ''
        };
        setStocks(newStocks);
    }, [stocks]);

    const handleRemoveWarehouse = useCallback((warehouseId) => {
        if ((reservedMap[warehouseId] || 0) > 0) {
            Alert.alert('Нельзя убрать', 'На этом складе есть зарезервированные коробки');
            return;
        }
        const newStocks = { ...stocks };
        delete newStocks[warehouseId];
        setStocks(newStocks);
        emitStocks(newStocks, reservedMap, priceMap);
    }, [stocks, reservedMap, priceMap, emitStocks]);

    const handleDistributeToAll = useCallback(() => {
        if (!warehouses || warehouses.length === 0) return;
        if (Object.values(reservedMap).some((value) => value > 0)) {
            Alert.alert('Нельзя распределить', 'Есть резервы. Укажите количество по складам вручную.');
            return;
        }

        const totalToDistribute = displayTotal;
        if (totalToDistribute <= 0) {
            Alert.alert('Предупреждение', 'Нет количества для распределения');
            return;
        }

        Alert.alert(
            'Распределить по всем складам',
            `Распределить ${totalToDistribute} коробок равномерно по всем активным складам? Клиенты заказывают только с главного склада.`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Распределить',
                    onPress: () => {
                        const activeWarehouses = warehouses.filter(w => w.isActive);
                        const quantityPerWarehouse = Math.floor(totalToDistribute / activeWarehouses.length);
                        const remainder = totalToDistribute % activeWarehouses.length;

                        const newStocks = {};
                        activeWarehouses.forEach((warehouse, index) => {
                            const quantity = quantityPerWarehouse + (index < remainder ? 1 : 0);
                            if (quantity > 0) {
                                newStocks[warehouse.id] = quantity;
                            }
                        });

                        setStocks(newStocks);
                        emitStocks(newStocks, reservedMap, priceMap);
                    }
                }
            ]
        );
    }, [warehouses, displayTotal, reservedMap, priceMap, emitStocks]);

    // Склады с остатками (включая новые склады с пустыми значениями)
    const warehousesWithStock = useMemo(() => {
        if (!warehouses) return [];
        return Object.keys(stocks).map(warehouseId => {
            const warehouse = warehouses.find(w => w.id === parseInt(warehouseId));
            return warehouse ? { ...warehouse, stockQuantity: stocks[warehouseId] } : null;
        }).filter(Boolean);
    }, [warehouses, stocks]);

    // Доступные склады для добавления (все склады, включая неактивные)
    const availableWarehouses = useMemo(() => {
        if (!warehouses) return [];
        return warehouses.filter(w => stocks[w.id] === undefined);
    }, [warehouses, stocks]);

    if (loadingWarehouses) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.loadingText}>Загрузка складов...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Всего на складах:</Text>
                    <Text style={styles.totalValue}>{displayTotal} коробок</Text>
                </View>
            </View>

            {error && (
                <Text style={styles.errorText}>{error}</Text>
            )}

            {/* Склады с остатками */}
            {warehousesWithStock.length > 0 && (
                <View style={styles.stocksList}>
                    {warehousesWithStock.map(warehouse => (
                        <View key={warehouse.id} style={styles.stockItem}>
                            <View style={styles.warehouseInfo}>
                                <Text style={styles.warehouseName}>
                                    {warehouse.name}{warehouse.isMain ? ' · главный' : ' · филиал'}
                                </Text>
                                <Text style={styles.warehouseAddress}>{warehouse.address}</Text>
                                {(reservedMap[warehouse.id] || 0) > 0 ? (
                                    <Text style={styles.warehouseAddress}>
                                        Резерв: {reservedMap[warehouse.id]} кор.
                                    </Text>
                                ) : null}
                            </View>
                            <View style={styles.quantityContainer}>
                                <TextInput
                                    style={styles.quantityInput}
                                    value={stocks[warehouse.id] === '' ? '' : (stocks[warehouse.id]?.toString() || '')}
                                    onChangeText={(text) => handleStockChange(warehouse.id, text)}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={isDark ? colors.textTertiary : '#999'}
                                />
                                <Text style={styles.quantityLabel}>коробок</Text>
                                {canSetWarehousePrice ? (
                                    <TextInput
                                        style={[styles.quantityInput, { marginLeft: 8, minWidth: 72 }]}
                                        value={priceMap[warehouse.id] != null ? String(priceMap[warehouse.id]) : ''}
                                        onChangeText={(text) => handlePriceChange(warehouse.id, text)}
                                        keyboardType="numeric"
                                        placeholder={basePrice ? String(basePrice) : 'Цена'}
                                        placeholderTextColor={isDark ? colors.textTertiary : '#999'}
                                    />
                                ) : null}
                                {(reservedMap[warehouse.id] || 0) === 0 ? (
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => handleRemoveWarehouse(warehouse.id)}
                                    >
                                        <Text style={styles.removeButtonText}>✕</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Добавление склада */}
            {availableWarehouses.length > 0 && (
                <View style={styles.addSection}>
                    <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => setShowAllWarehouses(!showAllWarehouses)}
                    >
                        <Text style={styles.toggleButtonText}>
                            {showAllWarehouses ? 'Скрыть доступные склады' : 'Добавить склад'}
                        </Text>
                        <Text style={styles.toggleIcon}>
                            {showAllWarehouses ? '▲' : '▼'}
                        </Text>
                    </TouchableOpacity>

                    {showAllWarehouses && (
                        <View style={styles.availableWarehouses}>
                            {availableWarehouses.map(warehouse => (
                                <TouchableOpacity
                                    key={warehouse.id}
                                    style={styles.warehouseOption}
                                    onPress={() => {
                                        handleAddWarehouse(warehouse.id);
                                        setShowAllWarehouses(false);
                                    }}
                                >
                                    <Text style={styles.warehouseOptionName}>{warehouse.name}</Text>
                                    <Text style={styles.warehouseOptionAddress}>{warehouse.address}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Кнопки действий */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.distributeButton}
                    onPress={handleDistributeToAll}
                    disabled={!displayTotal || displayTotal <= 0}
                >
                    <Text style={styles.distributeButtonText}>
                        Распределить по всем складам
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Предупреждение если нет остатков на складах */}
            {warehousesWithStock.length === 0 && (
                <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>
                        ⚠️ Товар не размещен ни на одном складе
                    </Text>
                </View>
            )}
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
        borderRadius: normalize(12),
        padding: normalize(16),
        marginBottom: normalize(16),
        borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: normalize(16),
    },
    title: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: isDark ? colors.textPrimary : Color.dark,
        fontFamily: FontFamily.sFProDisplay,
    },
    totalContainer: {
        alignItems: 'flex-end',
    },
    totalLabel: {
        fontSize: normalizeFont(12),
        color: isDark ? colors.textSecondary : Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    totalValue: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: isDark ? colors.primary : Color.primary,
        fontFamily: FontFamily.sFProDisplay,
    },
    stocksList: {
        marginBottom: normalize(16),
    },
    stockItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: isDark ? colors.surfaceElevated : '#f8f9fa',
        borderRadius: normalize(8),
        padding: normalize(12),
        marginBottom: normalize(8),
        borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    warehouseInfo: {
        flex: 1,
        marginRight: normalize(12),
    },
    warehouseName: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: isDark ? colors.textPrimary : Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    warehouseAddress: {
        fontSize: normalizeFont(12),
        color: isDark ? colors.textSecondary : Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(2),
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quantityInput: {
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
        borderWidth: 1,
        borderColor: isDark ? colors.border : Color.border,
        borderRadius: normalize(6),
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(6),
        fontSize: normalizeFont(14),
        textAlign: 'center',
        minWidth: normalize(60),
        fontFamily: FontFamily.sFProText,
        color: isDark ? colors.textPrimary : Color.dark,
    },
    quantityLabel: {
        fontSize: normalizeFont(12),
        color: isDark ? colors.textSecondary : Color.textSecondary,
        marginLeft: normalize(6),
        fontFamily: FontFamily.sFProText,
    },
    removeButton: {
        marginLeft: normalize(8),
        backgroundColor: isDark ? colors.error : '#ff4757',
        borderRadius: normalize(12),
        width: normalize(24),
        height: normalize(24),
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeButtonText: {
        color: '#FFFFFF',
        fontSize: normalizeFont(12),
        fontWeight: 'bold',
    },
    addSection: {
        marginBottom: normalize(16),
    },
    toggleButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: isDark ? colors.surfaceElevated : '#e9ecef',
        borderRadius: normalize(8),
        padding: normalize(12),
        borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    toggleButtonText: {
        fontSize: normalizeFont(14),
        fontWeight: '500',
        color: isDark ? colors.textPrimary : Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    toggleIcon: {
        fontSize: normalizeFont(12),
        color: isDark ? colors.textSecondary : Color.textSecondary,
    },
    availableWarehouses: {
        marginTop: normalize(8),
        backgroundColor: isDark ? colors.surfaceElevated : '#f1f3f4',
        borderRadius: normalize(8),
        padding: normalize(4),
    },
    warehouseOption: {
        padding: normalize(12),
        borderRadius: normalize(6),
        backgroundColor: isDark ? colors.surface : Color.colorLightMode,
        marginBottom: normalize(4),
        borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
        borderColor: isDark ? colors.border : 'transparent',
    },
    warehouseOptionName: {
        fontSize: normalizeFont(14),
        fontWeight: '500',
        color: isDark ? colors.textPrimary : Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    warehouseOptionAddress: {
        fontSize: normalizeFont(12),
        color: isDark ? colors.textSecondary : Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(2),
    },
    actions: {
        marginBottom: normalize(8),
    },
    distributeButton: {
        backgroundColor: colors.primary,
        borderRadius: normalize(8),
        padding: normalize(12),
        alignItems: 'center',
    },
    distributeButtonText: {
        color: '#FFFFFF',
        fontSize: normalizeFont(14),
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    },
    warningContainer: {
        backgroundColor: isDark ? 'rgba(255, 210, 74, 0.12)' : '#fff3cd',
        borderRadius: normalize(6),
        padding: normalize(12),
        marginTop: normalize(8),
        borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
        borderColor: isDark ? 'rgba(255, 210, 74, 0.35)' : 'transparent',
    },
    warningText: {
        fontSize: normalizeFont(13),
        color: isDark ? '#FFD24A' : '#856404',
        textAlign: 'center',
        fontFamily: FontFamily.sFProText,
    },
    errorText: {
        color: colors.error,
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(8),
    },
    loadingText: {
        fontSize: normalizeFont(14),
        color: isDark ? colors.textSecondary : Color.textSecondary,
        textAlign: 'center',
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(20),
    },
});

export default ProductWarehouseStockManager; 