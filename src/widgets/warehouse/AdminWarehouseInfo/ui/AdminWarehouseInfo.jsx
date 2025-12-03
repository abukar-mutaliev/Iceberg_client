import React from 'react';
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

export const AdminWarehouseInfo = ({
    warehousesWithStock,
    totalStock,
    availableStock,
    loading,
    error,
    productId,
    productBasePrice,
    onPriceUpdated
}) => {
    // Обогащаем данные складов информацией о ценах для редактирования
    const enrichedWarehouses = warehousesWithStock?.map(warehouse => {
        const priceInfo = warehouse.priceInfo || warehouse.productStock?.priceInfo;
        const warehousePrice = priceInfo?.warehousePrice ?? warehouse.warehousePrice;
        const basePrice = priceInfo?.basePrice ?? productBasePrice;

        return {
            ...warehouse,
            warehousePrice,
            basePrice,
            priceInfo
        };
    }) || [];

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
            {!loading && !error && enrichedWarehouses.length > 0 && (
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
    },
    priceEditorsTitle: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.bold,
        fontWeight: '700',
        color: Color.textPrimary,
        marginBottom: normalize(12),
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
    },
});







