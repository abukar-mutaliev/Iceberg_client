import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import { useWarehouses } from '@entities/warehouse/hooks/useWarehouses';

export const ProductWarehouseStockManager = ({
    productStocks = [], // [{ warehouseId, quantity }]
    onStocksChange,
    error,
    totalQuantity, // Теперь необязательный
    onTotalQuantityChange, // Теперь необязательный  
    title = "Остатки по складам"
}) => {
    const { warehouses, loading: loadingWarehouses } = useWarehouses({ autoLoad: true });
    const [stocks, setStocks] = useState({});
    const [showAllWarehouses, setShowAllWarehouses] = useState(false);

    // Инициализация состояния из пропсов
    useEffect(() => {
        if (Array.isArray(productStocks) && productStocks.length > 0) {
            const stocksMap = {};
            productStocks.forEach(stock => {
                if (stock.warehouseId && typeof stock.quantity === 'number') {
                    stocksMap[stock.warehouseId] = stock.quantity;
                }
            });
            setStocks(stocksMap);
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
        const newStocks = {
            ...stocks,
            [warehouseId]: quantity // Сохраняем значение как есть, включая пустую строку
        };

        setStocks(newStocks);

        // Уведомляем родительский компонент со всеми складами, включая те что с нулевым количеством
        if (onStocksChange) {
            const stockArray = Object.entries(newStocks)
                .map(([warehouseId, quantity]) => ({
                    warehouseId: parseInt(warehouseId),
                    quantity: quantity === '' || quantity === undefined ? 0 : parseInt(quantity) || 0
                }));
            onStocksChange(stockArray);
        }
    }, [stocks, onStocksChange]);

    // Добавление склада
    const handleAddWarehouse = useCallback((warehouseId) => {
        if (!warehouseId || stocks[warehouseId] !== undefined) return;
        
        const newStocks = {
            ...stocks,
            [warehouseId]: '' // Добавляем с пустым значением для ввода
        };
        
        setStocks(newStocks);
        
        // Не уведомляем родительский компонент пока не введено количество
    }, [stocks]);

    // Удаление склада
    const handleRemoveWarehouse = useCallback((warehouseId) => {
        const newStocks = { ...stocks };
        delete newStocks[warehouseId];
        setStocks(newStocks);

        if (onStocksChange) {
            const stockArray = Object.entries(newStocks).map(([warehouseId, quantity]) => ({
                warehouseId: parseInt(warehouseId),
                quantity: quantity === '' || quantity === undefined ? 0 : parseInt(quantity) || 0
            }));
            onStocksChange(stockArray);
        }
    }, [stocks, onStocksChange]);

    // Автоматическое распределение по всем складам
    const handleDistributeToAll = useCallback(() => {
        if (!warehouses || warehouses.length === 0) return;

        const totalToDistribute = displayTotal;
        if (totalToDistribute <= 0) {
            Alert.alert('Предупреждение', 'Нет количества для распределения');
            return;
        }

        Alert.alert(
            'Распределить по всем складам',
            `Распределить ${totalToDistribute} коробок равномерно по всем активным складам?`,
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

                        if (onStocksChange) {
                            const stockArray = Object.entries(newStocks).map(([warehouseId, quantity]) => ({
                                warehouseId: parseInt(warehouseId),
                                quantity: quantity === '' || quantity === undefined ? 0 : parseInt(quantity) || 0
                            }));
                            onStocksChange(stockArray);
                        }
                    }
                }
            ]
        );
    }, [warehouses, displayTotal, onStocksChange]);

    // Склады с остатками (включая новые склады с пустыми значениями)
    const warehousesWithStock = useMemo(() => {
        if (!warehouses) return [];
        return Object.keys(stocks).map(warehouseId => {
            const warehouse = warehouses.find(w => w.id === parseInt(warehouseId));
            return warehouse ? { ...warehouse, stockQuantity: stocks[warehouseId] } : null;
        }).filter(Boolean);
    }, [warehouses, stocks]);

    // Доступные склады для добавления
    const availableWarehouses = useMemo(() => {
        if (!warehouses) return [];
        return warehouses.filter(w => w.isActive && stocks[w.id] === undefined);
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
                    <Text style={styles.totalLabel}>Общий остаток:</Text>
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
                                <Text style={styles.warehouseName}>{warehouse.name}</Text>
                                <Text style={styles.warehouseAddress}>{warehouse.address}</Text>
                            </View>
                            <View style={styles.quantityContainer}>
                                <TextInput
                                    style={styles.quantityInput}
                                    value={stocks[warehouse.id] === '' ? '' : (stocks[warehouse.id]?.toString() || '')}
                                    onChangeText={(text) => handleStockChange(warehouse.id, text)}
                                    keyboardType="numeric"
                                    placeholder="0"
                                />
                                <Text style={styles.quantityLabel}>коробок</Text>
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => handleRemoveWarehouse(warehouse.id)}
                                >
                                    <Text style={styles.removeButtonText}>✕</Text>
                                </TouchableOpacity>
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

const styles = StyleSheet.create({
    container: {
        backgroundColor: Color.colorLightMode,
        borderRadius: normalize(12),
        padding: normalize(16),
        marginBottom: normalize(16),
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
        color: Color.dark,
        fontFamily: FontFamily.sFProDisplay,
    },
    totalContainer: {
        alignItems: 'flex-end',
    },
    totalLabel: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
    },
    totalValue: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: Color.primary,
        fontFamily: FontFamily.sFProDisplay,
    },
    stocksList: {
        marginBottom: normalize(16),
    },
    stockItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: normalize(8),
        padding: normalize(12),
        marginBottom: normalize(8),
    },
    warehouseInfo: {
        flex: 1,
        marginRight: normalize(12),
    },
    warehouseName: {
        fontSize: normalizeFont(14),
        fontWeight: '600',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    warehouseAddress: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(2),
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    quantityInput: {
        backgroundColor: Color.colorLightMode,
        borderWidth: 1,
        borderColor: Color.border,
        borderRadius: normalize(6),
        paddingHorizontal: normalize(8),
        paddingVertical: normalize(6),
        fontSize: normalizeFont(14),
        textAlign: 'center',
        minWidth: normalize(60),
        fontFamily: FontFamily.sFProText,
    },
    quantityLabel: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        marginLeft: normalize(6),
        fontFamily: FontFamily.sFProText,
    },
    removeButton: {
        marginLeft: normalize(8),
        backgroundColor: '#ff4757',
        borderRadius: normalize(12),
        width: normalize(24),
        height: normalize(24),
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeButtonText: {
        color: Color.colorLightMode,
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
        backgroundColor: '#e9ecef',
        borderRadius: normalize(8),
        padding: normalize(12),
    },
    toggleButtonText: {
        fontSize: normalizeFont(14),
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    toggleIcon: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
    },
    availableWarehouses: {
        marginTop: normalize(8),
        backgroundColor: '#f1f3f4',
        borderRadius: normalize(8),
        padding: normalize(4),
    },
    warehouseOption: {
        padding: normalize(12),
        borderRadius: normalize(6),
        backgroundColor: Color.colorLightMode,
        marginBottom: normalize(4),
    },
    warehouseOptionName: {
        fontSize: normalizeFont(14),
        fontWeight: '500',
        color: Color.dark,
        fontFamily: FontFamily.sFProText,
    },
    warehouseOptionAddress: {
        fontSize: normalizeFont(12),
        color: Color.textSecondary,
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(2),
    },
    actions: {
        marginBottom: normalize(8),
    },
    distributeButton: {
        backgroundColor: Color.primary,
        borderRadius: normalize(8),
        padding: normalize(12),
        alignItems: 'center',
    },
    distributeButtonText: {
        color: Color.colorLightMode,
        fontSize: normalizeFont(14),
        fontWeight: '500',
        fontFamily: FontFamily.sFProText,
    },
    warningContainer: {
        backgroundColor: '#fff3cd',
        borderRadius: normalize(6),
        padding: normalize(12),
        marginTop: normalize(8),
    },
    warningText: {
        fontSize: normalizeFont(13),
        color: '#856404',
        textAlign: 'center',
        fontFamily: FontFamily.sFProText,
    },
    errorText: {
        color: '#dc3545',
        fontSize: normalizeFont(12),
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(8),
    },
    loadingText: {
        fontSize: normalizeFont(14),
        color: Color.textSecondary,
        textAlign: 'center',
        fontFamily: FontFamily.sFProText,
        marginTop: normalize(20),
    },
});

export default ProductWarehouseStockManager; 