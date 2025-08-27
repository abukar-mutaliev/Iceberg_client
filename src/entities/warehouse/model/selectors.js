import { createSelector } from "@reduxjs/toolkit";

// Константы для предотвращения создания новых ссылок
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

// Базовые селекторы
export const selectWarehouses = (state) => state.warehouse?.warehouses || EMPTY_ARRAY;
export const selectWarehousesLoading = (state) => state.warehouse?.warehousesLoading || false;
export const selectWarehousesError = (state) => state.warehouse?.warehousesError || null;

export const selectCurrentWarehouse = (state) => state.warehouse?.currentWarehouse || null;
export const selectCurrentWarehouseLoading = (state) => state.warehouse?.currentWarehouseLoading || false;
export const selectCurrentWarehouseError = (state) => state.warehouse?.currentWarehouseError || null;

// Селектор для получения склада по ID
export const selectWarehouseById = createSelector(
    [selectWarehouses, (state, warehouseId) => warehouseId],
    (warehouses, warehouseId) => {
        if (!warehouseId || !Array.isArray(warehouses)) return null;
        
        const numericId = parseInt(warehouseId, 10);
        if (isNaN(numericId)) return null;
        
        return warehouses.find(warehouse => warehouse && warehouse.id === numericId) || null;
    }
);

// Селектор для получения складов по району
export const selectWarehousesByDistrict = createSelector(
    [selectWarehouses, (state, districtId) => districtId],
    (warehouses, districtId) => {
        if (!districtId || !Array.isArray(warehouses)) return EMPTY_ARRAY;
        
        const numericDistrictId = parseInt(districtId, 10);
        if (isNaN(numericDistrictId)) return EMPTY_ARRAY;
        
        return warehouses.filter(warehouse => 
            warehouse && warehouse.districtId === numericDistrictId
        );
    }
);

// Селектор для получения активных складов
export const selectActiveWarehouses = createSelector(
    [selectWarehouses],
    (warehouses) => {
        if (!Array.isArray(warehouses)) return EMPTY_ARRAY;
        
        return warehouses.filter(warehouse => 
            warehouse && warehouse.isActive !== false
        );
    }
);

// Селектор для получения активных складов в формате для dropdown
export const selectWarehousesForDropdown = createSelector(
    [selectActiveWarehouses],
    (warehouses) => {
        if (!Array.isArray(warehouses)) return EMPTY_ARRAY;
        
        return warehouses.map(warehouse => ({
            value: warehouse.id,
            label: `${warehouse.name} (${warehouse.district?.name || 'Неизвестный район'})`
        }));
    }
);

// Селектор для получения загрузки складов (псевдоним для совместимости)
export const selectWarehouseLoading = selectWarehousesLoading;

// Селекторы для товаров на складе
export const selectWarehouseProducts = (state, warehouseId) => {
    return state.warehouse?.warehouseProducts?.[warehouseId] || EMPTY_ARRAY;
};

export const selectWarehouseProductsLoading = (state, warehouseId) => {
    return state.warehouse?.warehouseProductsLoading?.[warehouseId] || false;
};

export const selectWarehouseProductsError = (state, warehouseId) => {
    return state.warehouse?.warehouseProductsError?.[warehouseId] || null;
};

// Селекторы для остатков товара
export const selectProductStocks = (state, productId) => {
    return state.warehouse?.productStocks?.[productId] || EMPTY_ARRAY;
};

export const selectProductStocksLoading = (state, productId) => {
    return state.warehouse?.productStocksLoading?.[productId] || false;
};

export const selectProductStocksError = (state, productId) => {
    return state.warehouse?.productStocksError?.[productId] || null;
};

// Селектор для получения общего количества товара на всех складах
export const selectProductTotalStock = createSelector(
    [
        (state, productId) => selectProductStocks(state, productId),
        (state, productId) => selectWarehousesWithProduct(state, productId)
    ],
    (stocks, warehouses) => {
        // Если есть остатки из API product-stock, используем их
        if (Array.isArray(stocks) && stocks.length > 0) {
            return stocks.reduce((total, stock) => {
                return total + (stock.quantity || 0);
            }, 0);
        }
        
        // Если остатков нет, используем данные из find-with-product API
        if (Array.isArray(warehouses) && warehouses.length > 0) {
            return warehouses.reduce((total, warehouse) => {
                return total + (warehouse.quantity || 0);
            }, 0);
        }
        
        return 0;
    }
);

// Селектор для получения доступного количества товара (не резервированного)
export const selectProductAvailableStock = createSelector(
    [
        (state, productId) => selectProductStocks(state, productId),
        (state, productId) => selectWarehousesWithProduct(state, productId)
    ],
    (stocks, warehouses) => {
        // Если есть остатки из API product-stock, используем их
        if (Array.isArray(stocks) && stocks.length > 0) {
            return stocks.reduce((total, stock) => {
                const quantity = stock.quantity || 0;
                const reserved = stock.reserved || 0;
                return total + Math.max(0, quantity - reserved);
            }, 0);
        }
        
        // Если остатков нет, используем данные из find-with-product API
        if (Array.isArray(warehouses) && warehouses.length > 0) {
            return warehouses.reduce((total, warehouse) => {
                return total + (warehouse.available || 0);
            }, 0);
        }
        
        return 0;
    }
);

// Селектор для поиска складов с товаром
export const selectWarehousesWithProduct = (state, productId) => {
    return state.warehouse?.warehousesWithProduct?.[productId] || EMPTY_ARRAY;
};

export const selectWarehousesWithProductLoading = (state, productId) => {
    return state.warehouse?.warehousesWithProductLoading?.[productId] || false;
};

export const selectWarehousesWithProductError = (state, productId) => {
    return state.warehouse?.warehousesWithProductError?.[productId] || null;
};

// Мемоизированный селектор для получения складов с товаром и их остатками
export const selectWarehousesWithProductAndStock = createSelector(
    [
        (state, productId) => selectWarehousesWithProduct(state, productId),
        (state, productId) => selectProductStocks(state, productId)
    ],
    (warehouses, stocks) => {
        if (!Array.isArray(warehouses)) return EMPTY_ARRAY;
        
        // Если есть остатки из API product-stock, используем их
        if (Array.isArray(stocks) && stocks.length > 0) {
            return warehouses.map(warehouse => {
                const stock = stocks.find(s => s.warehouseId === warehouse.warehouseId);
                return {
                    ...warehouse,
                    stock: stock || { quantity: 0, reserved: 0 },
                    availableQuantity: stock ? Math.max(0, (stock.quantity || 0) - (stock.reserved || 0)) : 0
                };
            }).filter(warehouse => warehouse.availableQuantity > 0);
        }
        
        // Если остатков нет, используем данные из find-with-product API
        return warehouses.map(warehouse => ({
            ...warehouse,
            id: warehouse.warehouseId,
            name: warehouse.warehouseName,
            address: warehouse.warehouseAddress,
            availableQuantity: warehouse.available || 0,
            totalQuantity: warehouse.quantity || 0,
            stock: {
                quantity: warehouse.quantity || 0,
                reserved: warehouse.reserved || 0
            }
        })).filter(warehouse => warehouse.availableQuantity > 0);
    }
);

// Селектор для получения ближайших складов с товаром (можно расширить с геолокацией)
export const selectNearestWarehousesWithProduct = createSelector(
    [(state, productId) => selectWarehousesWithProductAndStock(state, productId)],
    (warehousesWithStock) => {
        if (!Array.isArray(warehousesWithStock)) return EMPTY_ARRAY;
        
        // Пока сортируем по количеству товара (можно добавить сортировку по расстоянию)
        return warehousesWithStock
            .sort((a, b) => b.availableQuantity - a.availableQuantity)
            .slice(0, 5); // Топ 5 складов
    }
);

// Селектор для получения статистики по складам
export const selectWarehousesStats = createSelector(
    [selectWarehouses],
    (warehouses) => {
        if (!Array.isArray(warehouses)) {
            return {
                total: 0,
                active: 0,
                inactive: 0,
                byDistrict: {}
            };
        }
        
        const stats = {
            total: warehouses.length,
            active: 0,
            inactive: 0,
            byDistrict: {}
        };
        
        warehouses.forEach(warehouse => {
            if (warehouse.isActive !== false) {
                stats.active++;
            } else {
                stats.inactive++;
            }
            
            const districtName = warehouse.district?.name || 'Неизвестный район';
            if (!stats.byDistrict[districtName]) {
                stats.byDistrict[districtName] = 0;
            }
            stats.byDistrict[districtName]++;
        });
        
        return stats;
    }
); 