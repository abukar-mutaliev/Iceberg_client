import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchWarehouses,
    fetchWarehousesByDistrict,
    clearWarehouses
} from '../model/slice';
import {
    selectWarehouses,
    selectWarehousesLoading,
    selectWarehousesError,
    selectWarehousesByDistrict,
    selectActiveWarehouses,
    selectWarehousesStats
} from '../model/selectors';

/**
 * Хук для работы с общим списком складов
 * @param {Object} options - Опции загрузки
 * @param {boolean} options.autoLoad - Автоматически загружать при монтировании
 * @param {number} options.districtId - ID района для фильтрации
 * @param {boolean} options.activeOnly - Загружать только активные склады
 * @returns {Object} - Данные и методы для работы со складами
 */
export const useWarehouses = ({
    autoLoad = true,
    districtId = null,
    activeOnly = false
} = {}) => {
    const dispatch = useDispatch();

    // Селекторы
    const allWarehouses = useSelector(selectWarehouses);
    const warehousesLoading = useSelector(selectWarehousesLoading);
    const warehousesError = useSelector(selectWarehousesError);
    const warehousesStats = useSelector(selectWarehousesStats);

    // Фильтрованные склады
    const filteredWarehouses = useSelector(state => {
        if (districtId) {
            return selectWarehousesByDistrict(state, districtId);
        }
        return activeOnly ? selectActiveWarehouses(state) : selectWarehouses(state);
    });

    // Загрузка складов
    const loadWarehouses = useCallback(async (forceRefresh = false) => {
        try {
            if (districtId) {
                await dispatch(fetchWarehousesByDistrict(districtId)).unwrap();
            } else {
                await dispatch(fetchWarehouses(forceRefresh)).unwrap();
            }
        } catch (error) {
            console.error('useWarehouses: Ошибка загрузки складов:', error);
            throw error;
        }
    }, [dispatch, districtId]);

    // Обновление данных
    const refreshWarehouses = useCallback(async () => {
        return loadWarehouses(true);
    }, [loadWarehouses]);

    // Очистка кэша
    const clearWarehousesCache = useCallback(() => {
        dispatch(clearWarehouses());
    }, [dispatch]);

    // Автоматическая загрузка при монтировании
    useEffect(() => {
        if (autoLoad && (!allWarehouses.length || (districtId && !filteredWarehouses.length))) {
            loadWarehouses();
        }
    }, [autoLoad, districtId, allWarehouses.length, filteredWarehouses.length, loadWarehouses]);

    return {
        // Данные
        warehouses: filteredWarehouses,
        allWarehouses,
        warehousesStats,
        
        // Состояние
        loading: warehousesLoading,
        error: warehousesError,
        
        // Методы
        loadWarehouses,
        refreshWarehouses,
        clearWarehousesCache,
        
        // Вспомогательные свойства
        isEmpty: !warehousesLoading && filteredWarehouses.length === 0,
        hasError: !!warehousesError
    };
}; 