import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { InteractionManager } from 'react-native';
import {
    fetchProductStock,
    findWarehousesWithProduct,
    clearProductStocks
} from '../model/slice';
import {
    selectProductStocks,
    selectProductStocksLoading,
    selectProductStocksError,
    selectProductTotalStock,
    selectProductAvailableStock,
    selectWarehousesWithProduct,
    selectWarehousesWithProductLoading,
    selectWarehousesWithProductError,
    selectWarehousesWithProductAndStock,
    selectNearestWarehousesWithProduct
} from '../model/selectors';

/**
 * Хук для работы с остатками товара на складах
 * @param {number|string} productId - ID товара
 * @param {Object} options - Опции загрузки
 * @param {boolean} options.autoLoad - Автоматически загружать при монтировании
 * @param {boolean} options.findWarehouses - Искать склады с товаром
 * @returns {Object} - Данные и методы для работы с остатками
 */
export const useProductStock = (productId, {
    autoLoad = true,
    findWarehouses = false
} = {}) => {
    const dispatch = useDispatch();

    // Ref для отслеживания состояния компонента
    const isMountedRef = useRef(true);
    // Ref для отслеживания запущенных запросов
    const requestsRef = useRef(new Set());
    // Ref для отслеживания уже загруженных данных
    const loadedDataRef = useRef(new Set());

    // Валидация ID
    const validProductId = productId ? parseInt(productId, 10) : null;

    // Управление жизненным циклом компонента
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Мемоизированные селекторы для предотвращения лишних ререндеров
    const productStocksSelector = useMemo(() =>
            (state) => validProductId ? selectProductStocks(state, validProductId) : [],
        [validProductId]
    );
    const productStocksLoadingSelector = useMemo(() =>
            (state) => validProductId ? selectProductStocksLoading(state, validProductId) : false,
        [validProductId]
    );
    const productStocksErrorSelector = useMemo(() =>
            (state) => validProductId ? selectProductStocksError(state, validProductId) : null,
        [validProductId]
    );
    const totalStockSelector = useMemo(() =>
            (state) => validProductId ? selectProductTotalStock(state, validProductId) : 0,
        [validProductId]
    );
    const availableStockSelector = useMemo(() =>
            (state) => validProductId ? selectProductAvailableStock(state, validProductId) : 0,
        [validProductId]
    );
    const warehousesWithProductSelector = useMemo(() =>
            (state) => validProductId ? selectWarehousesWithProduct(state, validProductId) : [],
        [validProductId]
    );
    const warehousesWithProductLoadingSelector = useMemo(() =>
            (state) => validProductId ? selectWarehousesWithProductLoading(state, validProductId) : false,
        [validProductId]
    );
    const warehousesWithProductErrorSelector = useMemo(() =>
            (state) => validProductId ? selectWarehousesWithProductError(state, validProductId) : null,
        [validProductId]
    );
    const warehousesWithStockSelector = useMemo(() =>
            (state) => validProductId ? selectWarehousesWithProductAndStock(state, validProductId) : [],
        [validProductId]
    );
    const nearestWarehousesSelector = useMemo(() =>
            (state) => validProductId ? selectNearestWarehousesWithProduct(state, validProductId) : [],
        [validProductId]
    );

    // Селекторы для остатков товара
    const productStocks = useSelector(productStocksSelector);
    const productStocksLoading = useSelector(productStocksLoadingSelector);
    const productStocksError = useSelector(productStocksErrorSelector);

    // Вычисляемые значения
    const totalStock = useSelector(totalStockSelector);
    const availableStock = useSelector(availableStockSelector);

    // Селекторы для складов с товаром
    const warehousesWithProduct = useSelector(warehousesWithProductSelector);
    const warehousesWithProductLoading = useSelector(warehousesWithProductLoadingSelector);
    const warehousesWithProductError = useSelector(warehousesWithProductErrorSelector);

    // Склады с товаром и остатками
    const warehousesWithStock = useSelector(warehousesWithStockSelector);

    // Ближайшие склады с товаром
    const nearestWarehouses = useSelector(nearestWarehousesSelector);

    // Загрузка остатков товара с защитой от race conditions
    const loadProductStock = useCallback(async () => {
        if (!validProductId || !isMountedRef.current) return;

        const requestKey = `stock-${validProductId}`;

        // Проверяем, что запрос еще не выполняется
        if (requestsRef.current.has(requestKey)) {
            console.log(`useProductStock: Запрос остатков для ${validProductId} уже выполняется`);
            return;
        }

        try {
            requestsRef.current.add(requestKey);

            if (isMountedRef.current) {
                await dispatch(fetchProductStock(validProductId)).unwrap();
                loadedDataRef.current.add(requestKey);
            }
        } catch (error) {
            console.error(`Ошибка загрузки остатков товара ${validProductId}:`, error);
            throw error;
        } finally {
            requestsRef.current.delete(requestKey);
        }
    }, [dispatch, validProductId]);

    // Поиск складов с товаром с защитой от race conditions
    const findWarehousesWithProductStock = useCallback(async (params = {}) => {
        if (!validProductId || !isMountedRef.current) return;

        const requestKey = `warehouses-${validProductId}`;

        // Проверяем, что запрос еще не выполняется
        if (requestsRef.current.has(requestKey)) {
            console.log(`useProductStock: Запрос складов для ${validProductId} уже выполняется`);
            return;
        }

        try {
            requestsRef.current.add(requestKey);

            if (isMountedRef.current) {
                await dispatch(findWarehousesWithProduct({
                    productId: validProductId,
                    params
                })).unwrap();
                loadedDataRef.current.add(requestKey);
            }
        } catch (error) {
            console.error(`Ошибка поиска складов с товаром ${validProductId}:`, error);
            throw error;
        } finally {
            requestsRef.current.delete(requestKey);
        }
    }, [dispatch, validProductId]);

    // Обновление данных
    const refreshProductStock = useCallback(async () => {
        if (!isMountedRef.current) return;

        const promises = [];

        // Сбрасываем кэш загруженных данных для принудительного обновления
        loadedDataRef.current.clear();

        promises.push(loadProductStock());

        if (findWarehouses) {
            promises.push(findWarehousesWithProductStock());
        }

        await Promise.all(promises);
    }, [loadProductStock, findWarehousesWithProductStock, findWarehouses]);

    // Очистка данных
    const clearProductStockData = useCallback(() => {
        if (validProductId && isMountedRef.current) {
            dispatch(clearProductStocks(validProductId));
            loadedDataRef.current.clear();
            requestsRef.current.clear();
        }
    }, [dispatch, validProductId]);

    // Автоматическая загрузка при монтировании - улучшенная версия
    useEffect(() => {
        if (!autoLoad || !validProductId) return;

        // Используем InteractionManager для отложенной загрузки
        const task = InteractionManager.runAfterInteractions(() => {
            if (!isMountedRef.current) return;

            const stockKey = `stock-${validProductId}`;
            const warehousesKey = `warehouses-${validProductId}`;

            // Загружаем остатки если они еще не загружались
            if (!loadedDataRef.current.has(stockKey) &&
                !requestsRef.current.has(stockKey) &&
                !productStocksLoading) {

                console.log(`useProductStock: Автозагрузка остатков для продукта ${validProductId}`);
                loadProductStock().catch(error => {
                    console.error(`useProductStock: Ошибка автозагрузки остатков ${validProductId}:`, error);
                });
            }

            // Загружаем склады если нужно
            if (findWarehouses &&
                !loadedDataRef.current.has(warehousesKey) &&
                !requestsRef.current.has(warehousesKey) &&
                !warehousesWithProductLoading) {

                console.log(`useProductStock: Автозагрузка складов для продукта ${validProductId}`);
                findWarehousesWithProductStock().catch(error => {
                    console.error(`useProductStock: Ошибка автозагрузки складов ${validProductId}:`, error);
                });
            }
        });

        return () => task.cancel();
    }, [validProductId]); // Минимальные зависимости

    // Получить остаток на конкретном складе
    const getWarehouseStock = useCallback((warehouseId) => {
        if (!warehouseId || !productStocks.length) return null;

        const numericWarehouseId = parseInt(warehouseId, 10);
        return productStocks.find(stock => stock.warehouseId === numericWarehouseId) || null;
    }, [productStocks]);

    // Проверить наличие товара на складе
    const hasStockInWarehouse = useCallback((warehouseId, minQuantity = 1) => {
        const stock = getWarehouseStock(warehouseId);
        if (!stock) return false;

        const available = Math.max(0, (stock.quantity || 0) - (stock.reserved || 0));
        return available >= minQuantity;
    }, [getWarehouseStock]);

    // Получить доступное количество на складе
    const getAvailableQuantity = useCallback((warehouseId) => {
        const stock = getWarehouseStock(warehouseId);
        if (!stock) return 0;

        return Math.max(0, (stock.quantity || 0) - (stock.reserved || 0));
    }, [getWarehouseStock]);

    // Мемоизированная статистика
    const stats = useMemo(() => {
        const totalReserved = productStocks.reduce((sum, s) => sum + (s.reserved || 0), 0);

        return {
            totalWarehouses: productStocks.length,
            warehousesWithStock: productStocks.filter(s => s.quantity > 0).length,
            warehousesWithAvailableStock: productStocks.filter(s =>
                Math.max(0, (s.quantity || 0) - (s.reserved || 0)) > 0
            ).length,
            totalReserved,
            reservedPercentage: totalStock > 0 ?
                ((totalReserved / totalStock) * 100).toFixed(1) : 0
        };
    }, [productStocks, totalStock]);

    return {
        // Данные остатков
        productStocks,
        totalStock,
        availableStock,

        // Склады с товаром
        warehousesWithProduct,
        warehousesWithStock,
        nearestWarehouses,

        // Состояние загрузки
        loading: productStocksLoading,
        warehousesLoading: warehousesWithProductLoading,

        // Ошибки
        error: productStocksError,
        warehousesError: warehousesWithProductError,

        // Методы
        loadProductStock,
        findWarehousesWithProductStock,
        refreshProductStock,
        clearProductStockData,
        getWarehouseStock,
        hasStockInWarehouse,
        getAvailableQuantity,

        // Вспомогательные свойства
        hasStock: totalStock > 0,
        isAvailable: availableStock > 0,
        isLowStock: availableStock > 0 && availableStock <= 5,
        hasError: !!productStocksError || !!warehousesWithProductError,

        // Статистика
        stats
    };
};