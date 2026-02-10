import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { ProductWarehouseInfo } from '@entities/product/ui/ProductWarehouseInfo/ui/ProductWarehouseInfo';
import { WarehousePriceEditor } from '@widgets/warehouse/WarehousePriceEditor/ui/WarehousePriceEditor';
import { normalize } from '@shared/lib/normalize';

const getBoxesText = (count) => {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'коробка';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'коробки';
    } else {
        return 'коробок';
    }
};

const parseBoolean = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') return true;
        if (normalized === 'false' || normalized === '0') return false;
    }
    return Boolean(value);
};

const normalizeWarehouse = (warehouse) => {
    if (!warehouse) {
        return {
            name: 'Склад',
            isMain: false
        };
    }

    if (warehouse.warehouse) {
        const nestedIsMain = warehouse.warehouse.isMain ?? warehouse.warehouse.isMainWarehouse ?? warehouse.warehouse.isHead ?? warehouse.warehouse.isHeadWarehouse;
        return {
            name: warehouse.warehouse.name || warehouse.warehouseName || warehouse.name || 'Склад',
            isMain: parseBoolean(nestedIsMain ?? warehouse.isMain ?? warehouse.isMainWarehouse ?? warehouse.isHead ?? warehouse.isHeadWarehouse ?? false),
            raw: warehouse
        };
    }

    return {
        name: warehouse.warehouseName || warehouse.name || 'Склад',
        isMain: parseBoolean(warehouse.isMain ?? warehouse.isMainWarehouse ?? warehouse.isHead ?? warehouse.isHeadWarehouse ?? false),
        raw: warehouse
    };
};

const getWarehouseTypeLabel = (warehouse) => {
    const normalized = normalizeWarehouse(warehouse);
    const raw = normalized.raw || warehouse || {};

    const isBranchFlag = raw.isBranch === true;
    const typeValue = raw.type || raw.warehouseType;
    const normalizedType = typeValue ? String(typeValue).toLowerCase() : null;
    const isMainFlag = normalized.isMain === true || parseBoolean(raw.isMainWarehouse) || parseBoolean(raw.isHead) || parseBoolean(raw.isHeadWarehouse);

    if (isBranchFlag) {
        return 'Филиал';
    }

    if (normalizedType === 'main' || isMainFlag) {
        return 'Основной';
    }

    return 'Филиал';
};

export const AdminWarehouseInfo = ({
    warehousesWithStock,
    totalStock,
    availableStock,
    loading,
    error,
    productId,
    productBasePrice,
    canManagePrices,
    onPriceUpdated
}) => {
    // Обогащаем данные складов информацией о ценах для редактирования
    const enrichedWarehouses = warehousesWithStock?.map(warehouse => {
        const normalized = normalizeWarehouse(warehouse);
        const priceInfo = warehouse.priceInfo || warehouse.productStock?.priceInfo;
        const warehousePrice = priceInfo?.warehousePrice ?? warehouse.warehousePrice;
        const basePrice = priceInfo?.basePrice ?? productBasePrice;

        return {
            ...warehouse,
            name: normalized.name,
            isMain: normalized.isMain,
            warehousePrice,
            basePrice,
            priceInfo
        };
    }) || [];

    useEffect(() => {
        if (!warehousesWithStock || warehousesWithStock.length === 0) {
            return;
        }
        const sample = warehousesWithStock.slice(0, 3);
        console.log('[AdminWarehouseInfo] warehousesWithStock sample', sample);
        console.log('[AdminWarehouseInfo] enrichedWarehouses sample', enrichedWarehouses.slice(0, 3));
    }, [warehousesWithStock, enrichedWarehouses]);

    return (
        <View style={styles.container}>
            <ProductWarehouseInfo
                warehousesWithStock={warehousesWithStock}
                totalStock={totalStock}
                availableStock={availableStock}
                loading={loading}
                error={error}
            />

            {/* Редакторы цен для каждого склада (только для админов) */}
            {!loading && !error && enrichedWarehouses.length > 0 && canManagePrices && (
                <View style={styles.priceEditorsContainer}>
                    <Text style={styles.priceEditorsTitle}>Управление ценами на складах</Text>
                    {enrichedWarehouses.map((warehouse) => (
                        <View key={warehouse.id || warehouse.warehouseId} style={styles.priceEditorCard}>
                            <Text style={styles.warehouseName}>{warehouse.name}</Text>

                            <WarehousePriceEditor
                                warehouseId={warehouse.id || warehouse.warehouseId}
                                productId={productId}
                                currentPrice={warehouse.warehousePrice}
                                basePrice={warehouse.basePrice || productBasePrice}
                                onPriceUpdated={onPriceUpdated}
                            />
                        </View>
                    ))}
                </View>
            )}

            {!loading && !error && enrichedWarehouses.length > 0 && !canManagePrices && (
                <View style={styles.priceEditorsContainer}>
                    <Text style={styles.priceEditorsTitle}>Управление ценами на складах</Text>
                    <Text style={styles.priceEditorsHint}>
                        Изменение цен доступно только суперадмину.
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: normalize(16),
    },
    priceEditorsContainer: {
        marginTop: normalize(16),
        paddingHorizontal: normalize(16),
        paddingBottom: 90
    },
    priceEditorsTitle: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.bold,
        fontWeight: '700',
        color: Color.textPrimary,
        marginBottom: normalize(12),
    },
    priceEditorsHint: {
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        color: Color.textSecondary,
    },
    priceEditorCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: Border.br_base,
        padding: normalize(16),
        marginBottom: normalize(12),
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    warehouseName: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.bold,
        fontWeight: '600',
        color: Color.textPrimary,
        marginBottom: normalize(8),
    }
});







