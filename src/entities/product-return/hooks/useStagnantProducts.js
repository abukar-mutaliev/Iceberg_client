/**
 * Хук для работы с залежавшимися товарами
 * @module product-return/hooks/useStagnantProducts
 */

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchStagnantProducts,
  setStagnantProductsFilters,
  resetStagnantProductsFilters,
  clearStagnantProducts,
} from '../model/slice';
import {
  selectStagnantProductsFormatted,
  selectFilteredStagnantProducts,
  selectStagnantProductsLoading,
  selectStagnantProductsError,
  selectStagnantProductsFilters,
  selectStagnantProductsLastFetch,
  selectStagnantProductsByUrgency,
  selectStagnantProductsCounts,
  selectCriticalStagnantProducts,
  selectStagnantProductsMeta,
} from '../model/selectors';
import { shouldRefreshData } from '../lib/helpers';

/**
 * Хук для работы с залежавшимися товарами с кэшированием
 * @param {Object} [options] - Опции
 * @param {Object} [options.filters] - Начальные фильтры
 * @param {boolean} [options.autoLoad=true] - Автоматически загружать данные
 * @param {boolean} [options.forceRefresh=false] - Принудительно обновить
 * @returns {Object} Объект с данными и методами
 */
export const useStagnantProducts = (options = {}) => {
  const {
    filters: initialFilters = {},
    autoLoad = true,
    forceRefresh = false,
  } = options;

  const dispatch = useDispatch();
  
  // Селекторы
  const products = useSelector(selectFilteredStagnantProducts); // Используем фильтрованные товары
  const loading = useSelector(selectStagnantProductsLoading);
  const error = useSelector(selectStagnantProductsError);
  const currentFilters = useSelector(selectStagnantProductsFilters);
  const lastFetch = useSelector(selectStagnantProductsLastFetch);
  const productsByUrgency = useSelector(selectStagnantProductsByUrgency);
  const counts = useSelector(selectStagnantProductsCounts);
  const criticalProducts = useSelector(selectCriticalStagnantProducts);
  const meta = useSelector(selectStagnantProductsMeta);

  // Метод загрузки данных
  const loadProducts = useCallback((filters = {}) => {
    const filtersToApply = { ...currentFilters, ...filters };
    // Убираем urgencyLevel из запроса на сервер (это клиентский фильтр)
    const { urgencyLevel, ...serverFilters } = filtersToApply;
    return dispatch(fetchStagnantProducts(serverFilters));
  }, [dispatch, currentFilters]);

  // Метод обновления данных
  const refresh = useCallback(() => {
    // Убираем urgencyLevel из запроса на сервер (это клиентский фильтр)
    const { urgencyLevel, ...serverFilters } = currentFilters;
    return dispatch(fetchStagnantProducts(serverFilters));
  }, [dispatch, currentFilters]);

  // Метод применения фильтров
  const applyFilters = useCallback((newFilters) => {
    // Обновляем фильтры в стейте
    dispatch(setStagnantProductsFilters(newFilters));
    
    // Если фильтр только по urgencyLevel, то не делаем запрос на сервер
    // (фильтрация происходит на клиенте через selectFilteredStagnantProducts)
    const hasOnlyClientFilters = 
      newFilters.urgencyLevel !== undefined && 
      Object.keys(newFilters).length === 1;
    
    if (!hasOnlyClientFilters) {
      // Для серверных фильтров (warehouseId, supplierId, daysThreshold) делаем запрос
      // Убираем urgencyLevel из запроса на сервер
      const { urgencyLevel, ...serverFilters } = { ...currentFilters, ...newFilters };
      return dispatch(fetchStagnantProducts(serverFilters));
    }
    
    // Для клиентских фильтров возвращаем resolved промис
    return Promise.resolve();
  }, [dispatch, currentFilters]);

  // Метод сброса фильтров
  const resetFilters = useCallback(() => {
    dispatch(resetStagnantProductsFilters());
    return dispatch(fetchStagnantProducts({}));
  }, [dispatch]);

  // Метод очистки данных
  const clear = useCallback(() => {
    dispatch(clearStagnantProducts());
  }, [dispatch]);

  // Автозагрузка с проверкой кэша
  useEffect(() => {
    if (autoLoad) {
      if (forceRefresh || shouldRefreshData(lastFetch)) {
        loadProducts(initialFilters);
      }
    }
  }, [autoLoad, forceRefresh]); // Специально не добавляем все зависимости, чтобы избежать лишних загрузок

  return {
    // Данные
    products,
    loading,
    error,
    filters: currentFilters,
    lastFetch,
    
    // Производные данные
    productsByUrgency,
    counts,
    criticalProducts,
    meta,
    
    // Методы
    loadProducts,
    refresh,
    applyFilters,
    resetFilters,
    clear,
    
    // Флаги состояния
    isEmpty: meta.isEmpty,
    hasError: meta.hasError,
    isLoading: loading,
    hasCritical: counts.critical > 0,
  };
};

