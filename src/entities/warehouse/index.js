// API
export { default as WarehouseService } from './api/warehouseApi';

// Redux
export { default as warehouseReducer } from './model/slice';
export {
    fetchWarehouses,
    fetchWarehouses as fetchAllWarehouses, // Псевдоним для совместимости
    fetchWarehouseById,
    fetchWarehousesByDistrict,
    fetchWarehouseProducts,
    fetchProductStock,
    findWarehousesWithProduct,
    clearWarehouses,
    clearCurrentWarehouse,
    clearWarehouseProducts,
    clearProductStocks
} from './model/slice';

// Selectors
export {
    selectWarehouses,
    selectWarehousesLoading,
    selectWarehousesError,
    selectCurrentWarehouse,
    selectCurrentWarehouseLoading,
    selectCurrentWarehouseError,
    selectWarehouseById,
    selectWarehousesByDistrict,
    selectActiveWarehouses,
    selectWarehousesForDropdown,
    selectWarehouseLoading,
    selectWarehouseProducts,
    selectWarehouseProductsLoading,
    selectWarehouseProductsError,
    selectProductStocks,
    selectProductStocksLoading,
    selectProductStocksError,
    selectProductTotalStock,
    selectProductAvailableStock,
    selectWarehousesWithProduct,
    selectWarehousesWithProductLoading,
    selectWarehousesWithProductError,
    selectWarehousesWithProductAndStock,
    selectNearestWarehousesWithProduct,
    selectWarehousesStats
} from './model/selectors';

// Hooks
export { useWarehouses } from '@entities/warehouse/hooks/useWarehouses';
export { useWarehouseDetail } from '@entities/warehouse/hooks/useWarehouseDetail';
export { useProductStock } from '@entities/warehouse/hooks/useProductStock';