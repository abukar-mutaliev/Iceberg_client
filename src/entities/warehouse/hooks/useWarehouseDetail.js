import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchWarehouseById,
    fetchWarehouseProducts,
    clearCurrentWarehouse,
    clearWarehouseProducts
} from '../model/slice';
import {
    selectCurrentWarehouse,
    selectCurrentWarehouseLoading,
    selectCurrentWarehouseError,
    selectWarehouseProducts,
    selectWarehouseProductsLoading,
    selectWarehouseProductsError,
    selectWarehouseById
} from '../model/selectors';

/**
 * Хук для работы с детальной информацией о складе
 * @param {number|string} warehouseId - ID склада
 * @param {Object} options - Опции загрузки
 * @param {boolean} options.autoLoad - Автоматически загружать при монтировании
 * @param {boolean} options.loadProducts - Загружать товары склада
 * @returns {Object} - Данные и методы для работы со складом
 */
export const useWarehouseDetail = (warehouseId, {
    autoLoad = true,
    loadProducts = false
} = {}) => {
    const dispatch = useDispatch();
    const isMountedRef = useRef(true);

    // Валидация ID
    const validWarehouseId = warehouseId ? parseInt(warehouseId, 10) : null;

    // Селекторы для текущего склада
    const currentWarehouse = useSelector(selectCurrentWarehouse);
    const currentWarehouseLoading = useSelector(selectCurrentWarehouseLoading);
    const currentWarehouseError = useSelector(selectCurrentWarehouseError);

    // Селекторы для кэшированного склада
    const cachedWarehouse = useSelector(state =>
        validWarehouseId ? selectWarehouseById(state, validWarehouseId) : null
    );

    // Используем текущий или кэшированный склад
    const warehouse = currentWarehouse || cachedWarehouse;

    // Селекторы для товаров склада
    const warehouseProducts = useSelector(state =>
        validWarehouseId ? selectWarehouseProducts(state, validWarehouseId) : []
    );
    const warehouseProductsLoading = useSelector(state =>
        validWarehouseId ? selectWarehouseProductsLoading(state, validWarehouseId) : false
    );
    const warehouseProductsError = useSelector(state =>
        validWarehouseId ? selectWarehouseProductsError(state, validWarehouseId) : null
    );

    // Обработка размонтирования
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Загрузка информации о складе
    const loadWarehouse = useCallback(async (forceRefresh = false) => {
        if (!validWarehouseId) return;

        try {
            await dispatch(fetchWarehouseById(validWarehouseId)).unwrap();
        } catch (error) {
            console.error(`Ошибка загрузки склада ${validWarehouseId}:`, error);
            throw error;
        }
    }, [dispatch, validWarehouseId]);

    // Загрузка товаров склада
    const loadWarehouseProducts = useCallback(async (params = {}) => {
        if (!validWarehouseId) return;

        try {
            await dispatch(fetchWarehouseProducts({
                warehouseId: validWarehouseId,
                params
            })).unwrap();
        } catch (error) {
            console.error(`Ошибка загрузки товаров склада ${validWarehouseId}:`, error);
            throw error;
        }
    }, [dispatch, validWarehouseId]);

    // Обновление данных
    const refreshWarehouse = useCallback(async () => {
        const promises = [loadWarehouse(true)];
        
        if (loadProducts) {
            promises.push(loadWarehouseProducts());
        }
        
        await Promise.all(promises);
    }, [loadWarehouse, loadWarehouseProducts, loadProducts]);

    // Очистка данных
    const clearWarehouseData = useCallback(() => {
        dispatch(clearCurrentWarehouse());
        if (validWarehouseId) {
            dispatch(clearWarehouseProducts(validWarehouseId));
        }
    }, [dispatch, validWarehouseId]);

    // Автоматическая загрузка при монтировании
    useEffect(() => {
        if (autoLoad && validWarehouseId) {
            const shouldLoadWarehouse = !warehouse || 
                (warehouse.id !== validWarehouseId);
            
            const shouldLoadProducts = loadProducts && 
                !warehouseProducts.length && 
                !warehouseProductsLoading;

            if (shouldLoadWarehouse) {
                loadWarehouse();
            }

            if (shouldLoadProducts && warehouse) {
                loadWarehouseProducts();
            }
        }
    }, [
        autoLoad,
        validWarehouseId,
        warehouse,
        warehouseProducts.length,
        warehouseProductsLoading,
        loadProducts,
        loadWarehouse,
        loadWarehouseProducts
    ]);

    // Определяем состояние загрузки
    const isLoading = currentWarehouseLoading && !warehouse;
    const isProductsLoading = warehouseProductsLoading;

    return {
        // Данные
        warehouse,
        warehouseProducts,
        
        // Состояние загрузки
        loading: isLoading,
        productsLoading: isProductsLoading,
        
        // Ошибки
        error: currentWarehouseError,
        productsError: warehouseProductsError,
        
        // Методы
        loadWarehouse,
        loadWarehouseProducts,
        refreshWarehouse,
        clearWarehouseData,
        
        // Вспомогательные свойства
        isReady: !!warehouse && warehouse.id === validWarehouseId,
        hasProducts: warehouseProducts.length > 0,
        hasError: !!currentWarehouseError || !!warehouseProductsError,
        
        // Статистика склада
        stats: warehouse ? {
            totalProducts: warehouseProducts.length,
            activeProducts: warehouseProducts.filter(p => p.quantity > 0).length,
            totalQuantity: warehouseProducts.reduce((sum, p) => sum + (p.quantity || 0), 0),
            lowStockProducts: warehouseProducts.filter(p => 
                p.quantity > 0 && p.quantity <= (p.lowStockThreshold || 10)
            ).length
        } : null
    };
}; 