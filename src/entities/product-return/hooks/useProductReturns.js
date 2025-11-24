/**
 * Хук для работы со списком возвратов
 * @module product-return/hooks/useProductReturns
 */

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchProductReturns,
  setProductReturnsFilters,
  resetProductReturnsFilters,
  clearProductReturns,
} from '../model/slice';
import {
  selectProductReturnsFormatted,
  selectProductReturnsLoading,
  selectProductReturnsError,
  selectProductReturnsFilters,
  selectProductReturnsPagination,
  selectProductReturnsLastFetch,
  selectReturnsByStatus,
  selectReturnsCounts,
  selectActiveReturns,
  selectCompletedReturns,
  selectPendingReturns,
  selectProductReturnsMeta,
  selectCanLoadMoreReturns,
} from '../model/selectors';
import { shouldRefreshData } from '../lib/helpers';

/**
 * Хук для работы со списком возвратов с пагинацией и кэшированием
 * @param {Object} [options] - Опции
 * @param {Object} [options.filters] - Начальные фильтры
 * @param {boolean} [options.autoLoad=true] - Автоматически загружать данные
 * @param {boolean} [options.forceRefresh=false] - Принудительно обновить
 * @returns {Object} Объект с данными и методами
 */
export const useProductReturns = (options = {}) => {
  const {
    filters: initialFilters = {},
    autoLoad = true,
    forceRefresh = false,
  } = options;

  const dispatch = useDispatch();
  
  // Селекторы
  const returns = useSelector(selectProductReturnsFormatted);
  const loading = useSelector(selectProductReturnsLoading);
  const error = useSelector(selectProductReturnsError);
  const currentFilters = useSelector(selectProductReturnsFilters);
  const pagination = useSelector(selectProductReturnsPagination);
  const lastFetch = useSelector(selectProductReturnsLastFetch);
  const returnsByStatus = useSelector(selectReturnsByStatus);
  const counts = useSelector(selectReturnsCounts);
  const activeReturns = useSelector(selectActiveReturns);
  const completedReturns = useSelector(selectCompletedReturns);
  const pendingReturns = useSelector(selectPendingReturns);
  const meta = useSelector(selectProductReturnsMeta);
  const canLoadMore = useSelector(selectCanLoadMoreReturns);

  // Метод загрузки данных
  const loadReturns = useCallback((filters = {}) => {
    const filtersToApply = { ...currentFilters, ...filters };
    return dispatch(fetchProductReturns(filtersToApply));
  }, [dispatch, currentFilters]);

  // Метод загрузки следующей страницы
  const loadMore = useCallback(() => {
    if (canLoadMore && !loading) {
      const nextPage = pagination.currentPage + 1;
      return dispatch(fetchProductReturns({
        ...currentFilters,
        page: nextPage,
      }));
    }
    return Promise.resolve();
  }, [dispatch, currentFilters, pagination.currentPage, canLoadMore, loading]);

  // Метод обновления данных (первая страница)
  const refresh = useCallback(() => {
    return dispatch(fetchProductReturns({ ...currentFilters, page: 1 }));
  }, [dispatch, currentFilters]);

  // Метод применения фильтров (сбрасывает на первую страницу)
  const applyFilters = useCallback((newFilters) => {
    dispatch(setProductReturnsFilters(newFilters));
    return dispatch(fetchProductReturns({ 
      ...currentFilters, 
      ...newFilters,
      page: 1,
    }));
  }, [dispatch, currentFilters]);

  // Метод сброса фильтров
  const resetFilters = useCallback(() => {
    dispatch(resetProductReturnsFilters());
    return dispatch(fetchProductReturns({ page: 1 }));
  }, [dispatch]);

  // Метод очистки данных
  const clear = useCallback(() => {
    dispatch(clearProductReturns());
  }, [dispatch]);

  // Автозагрузка с проверкой кэша
  useEffect(() => {
    if (autoLoad) {
      if (forceRefresh || shouldRefreshData(lastFetch)) {
        loadReturns(initialFilters);
      }
    }
  }, [autoLoad, forceRefresh]); // Специально не добавляем все зависимости

  return {
    // Данные
    returns,
    loading,
    error,
    filters: currentFilters,
    pagination,
    lastFetch,
    
    // Производные данные
    returnsByStatus,
    counts,
    activeReturns,
    completedReturns,
    pendingReturns,
    meta,
    
    // Методы
    loadReturns,
    loadMore,
    refresh,
    applyFilters,
    resetFilters,
    clear,
    
    // Флаги состояния
    isEmpty: meta.isEmpty,
    hasError: meta.hasError,
    isLoading: loading,
    canLoadMore,
    hasMore: meta.hasMore,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    hasPending: counts.pending > 0,
  };
};

