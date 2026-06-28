import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchWarehouseById,
    fetchWarehouseProducts,
    clearCurrentWarehouse,
    clearWarehouseProducts,
    WAREHOUSE_PRODUCTS_PAGE_SIZE
} from '../model/slice';
import {
    selectCurrentWarehouse,
    selectCurrentWarehouseLoading,
    selectCurrentWarehouseError,
    selectWarehouseProducts,
    selectWarehouseProductsLoading,
    selectWarehouseProductsLoadingMore,
    selectWarehouseProductsError,
    selectWarehouseProductsHasMore,
    selectWarehouseProductsPagination,
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
    const hasLoadedProductsRef = useRef(false);
    const hasLoadedWarehouseRef = useRef(false);

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
    const warehouseProductsLoadingMore = useSelector(state =>
        validWarehouseId ? selectWarehouseProductsLoadingMore(state, validWarehouseId) : false
    );
    const warehouseProductsError = useSelector(state =>
        validWarehouseId ? selectWarehouseProductsError(state, validWarehouseId) : null
    );
    const warehouseProductsHasMore = useSelector(state =>
        validWarehouseId ? selectWarehouseProductsHasMore(state, validWarehouseId) : false
    );
    const warehouseProductsPagination = useSelector(state =>
        validWarehouseId ? selectWarehouseProductsPagination(state, validWarehouseId) : null
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

    // Загрузка товаров склада (первая страница / обновление)
    const loadWarehouseProducts = useCallback(async (params = {}) => {
        if (!validWarehouseId) return;

        try {
            await dispatch(fetchWarehouseProducts({
                warehouseId: validWarehouseId,
                params: { page: 1, limit: WAREHOUSE_PRODUCTS_PAGE_SIZE, ...params }
            })).unwrap();
        } catch (error) {
            console.error(`Ошибка загрузки товаров склада ${validWarehouseId}:`, error);
            throw error;
        }
    }, [dispatch, validWarehouseId]);

    // Догрузка следующей страницы товаров при прокрутке
    const loadMoreProducts = useCallback(async () => {
        if (!validWarehouseId) return;
        // Не догружаем, если уже идёт загрузка или больше нет данных
        if (warehouseProductsLoading || warehouseProductsLoadingMore || !warehouseProductsHasMore) {
            return;
        }

        const currentPage = warehouseProductsPagination?.page || 1;
        const nextPage = currentPage + 1;

        try {
            await dispatch(fetchWarehouseProducts({
                warehouseId: validWarehouseId,
                params: { page: nextPage, limit: WAREHOUSE_PRODUCTS_PAGE_SIZE }
            })).unwrap();
        } catch (error) {
            // 429 не считаем фатальной — просто прекращаем подгрузку
            if (error?.response?.status !== 429) {
                console.error(`Ошибка догрузки товаров склада ${validWarehouseId}:`, error);
            }
        }
    }, [
        dispatch,
        validWarehouseId,
        warehouseProductsLoading,
        warehouseProductsLoadingMore,
        warehouseProductsHasMore,
        warehouseProductsPagination?.page
    ]);

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
        if (!autoLoad || !validWarehouseId) return;

        const shouldLoadWarehouse = !warehouse || 
            (warehouse.id !== validWarehouseId);
        
        if (shouldLoadWarehouse && !hasLoadedWarehouseRef.current && !currentWarehouseLoading) {
            hasLoadedWarehouseRef.current = true;
            loadWarehouse().catch(() => {
                // При ошибке сбрасываем флаг для возможности повторной попытки
                hasLoadedWarehouseRef.current = false;
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoLoad, validWarehouseId, currentWarehouseLoading]);

    // Загрузка товаров после загрузки склада
    useEffect(() => {
        if (!loadProducts || !validWarehouseId || !warehouse || warehouse.id !== validWarehouseId) return;
        if (hasLoadedProductsRef.current || warehouseProductsLoading || warehouseProducts.length > 0) return;
        
        hasLoadedProductsRef.current = true;
        loadWarehouseProducts().catch((error) => {
            // При ошибке 429 не сбрасываем флаг, чтобы не повторять запросы
            if (error?.response?.status !== 429) {
                hasLoadedProductsRef.current = false;
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warehouse?.id, loadProducts, validWarehouseId, warehouseProductsLoading, warehouseProducts.length]);

    // Сброс флагов при изменении warehouseId
    useEffect(() => {
        hasLoadedWarehouseRef.current = false;
        hasLoadedProductsRef.current = false;
    }, [validWarehouseId]);

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
        productsLoadingMore: warehouseProductsLoadingMore,
        productsHasMore: warehouseProductsHasMore,
        productsPagination: warehouseProductsPagination,
        
        // Ошибки
        error: currentWarehouseError,
        productsError: warehouseProductsError,
        
        // Методы
        loadWarehouse,
        loadWarehouseProducts,
        loadMoreProducts,
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