/**
 * Хук для работы с деталями одного возврата
 * @module product-return/hooks/useProductReturn
 */

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchReturnDetail,
  clearReturnDetail,
  approveProductReturn,
  rejectProductReturn,
  completeProductReturn,
  startProductReturn,
  cancelProductReturn,
} from '../model/slice';
import {
  selectReturnDetailFormatted,
  selectReturnDetailLoading,
  selectReturnDetailError,
  selectIsApprovingReturn,
  selectIsRejectingReturn,
  selectIsCompletingReturn,
} from '../model/selectors';

/**
 * Хук для работы с деталями возврата и выполнения операций
 * @param {number} returnId - ID возврата
 * @param {Object} [options] - Опции
 * @param {boolean} [options.autoLoad=true] - Автоматически загружать данные
 * @returns {Object} Объект с данными и методами
 */
export const useProductReturn = (returnId, options = {}) => {
  const { autoLoad = true } = options;

  const dispatch = useDispatch();
  
  // Селекторы
  const returnDetail = useSelector(selectReturnDetailFormatted);
  const loading = useSelector(selectReturnDetailLoading);
  const error = useSelector(selectReturnDetailError);
  const isApproving = useSelector(selectIsApprovingReturn);
  const isRejecting = useSelector(selectIsRejectingReturn);
  const isCompleting = useSelector(selectIsCompletingReturn);

  // Метод загрузки деталей
  const loadDetail = useCallback(() => {
    if (returnId) {
      return dispatch(fetchReturnDetail(returnId));
    }
    return Promise.resolve();
  }, [dispatch, returnId]);

  // Метод обновления деталей
  const refresh = useCallback(() => {
    return loadDetail();
  }, [loadDetail]);

  // Метод одобрения возврата
  const approve = useCallback(async (notes = null) => {
    if (!returnId) return { success: false };
    
    try {
      const data = { returnId };
      // Добавляем notes только если оно не пустое
      if (notes && notes.trim()) {
        data.notes = notes.trim();
      }
      
      const result = await dispatch(approveProductReturn(data)).unwrap();
      
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err };
    }
  }, [dispatch, returnId]);

  // Метод отклонения возврата
  const reject = useCallback(async (rejectionReason) => {
    if (!returnId || !rejectionReason) return { success: false };
    
    try {
      const result = await dispatch(rejectProductReturn({
        returnId,
        rejectionReason,
      })).unwrap();
      
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err };
    }
  }, [dispatch, returnId]);

  // Метод завершения возврата
  const complete = useCallback(async (notes = null) => {
    if (!returnId) return { success: false };
    
    try {
      const data = { returnId };
      // Добавляем notes только если оно не пустое
      if (notes && notes.trim()) {
        data.notes = notes.trim();
      }
      
      const result = await dispatch(completeProductReturn(data)).unwrap();
      
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err };
    }
  }, [dispatch, returnId]);

  // Метод начала процесса возврата
  const start = useCallback(async () => {
    if (!returnId) return { success: false };
    
    try {
      const result = await dispatch(startProductReturn(returnId)).unwrap();
      
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err };
    }
  }, [dispatch, returnId]);

  // Метод отмены возврата
  const cancel = useCallback(async (reason = null) => {
    if (!returnId) return { success: false };
    
    try {
      const data = { returnId };
      // Добавляем reason только если оно не пустое
      if (reason && reason.trim()) {
        data.reason = reason.trim();
      }
      
      const result = await dispatch(cancelProductReturn(data)).unwrap();
      
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err };
    }
  }, [dispatch, returnId]);

  // Метод очистки деталей
  const clear = useCallback(() => {
    dispatch(clearReturnDetail());
  }, [dispatch]);

  // Автозагрузка
  useEffect(() => {
    if (autoLoad && returnId) {
      loadDetail();
    }
    
    // Очистка при размонтировании
    return () => {
      if (autoLoad) {
        dispatch(clearReturnDetail());
      }
    };
  }, [autoLoad, returnId]); // Специально не добавляем loadDetail и dispatch

  return {
    // Данные
    returnDetail,
    loading,
    error,
    
    // Методы загрузки
    loadDetail,
    refresh,
    clear,
    
    // Методы операций
    approve,
    reject,
    complete,
    start,
    cancel,
    
    // Флаги состояния операций
    isApproving,
    isRejecting,
    isCompleting,
    isPerformingAction: isApproving || isRejecting || isCompleting,
    
    // Флаги данных
    isLoading: loading,
    hasError: Boolean(error),
    hasData: Boolean(returnDetail),
    isCorrectReturn: returnDetail?.id === returnId,
  };
};

