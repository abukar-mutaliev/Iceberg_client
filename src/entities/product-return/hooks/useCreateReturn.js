/**
 * Хук для создания возврата
 * @module product-return/hooks/useCreateReturn
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createProductReturn } from '../model/slice';
import { selectIsCreatingReturn } from '../model/selectors';
import { validateReturnData } from '../lib/utils';

/**
 * Хук для создания возврата товара с валидацией
 * @returns {Object} Объект с методами и состоянием
 */
export const useCreateReturn = () => {
  const dispatch = useDispatch();
  const isCreating = useSelector(selectIsCreatingReturn);

  /**
   * Создать возврат с валидацией
   * @param {Object} data - Данные возврата
   * @param {number} data.productId - ID продукта
   * @param {number} data.warehouseId - ID склада
   * @param {number} data.quantity - Количество коробок
   * @param {string} data.reason - Причина возврата
   * @param {string} [data.notes] - Дополнительные заметки
   * @returns {Promise<Object>} Результат создания
   */
  const createReturn = useCallback(async (data) => {
    // Валидация данных
    const validation = validateReturnData(data);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        validationFailed: true,
      };
    }

    try {
      const result = await dispatch(createProductReturn(data)).unwrap();
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error,
        message: typeof error === 'string' ? error : 'Не удалось создать возврат',
      };
    }
  }, [dispatch]);

  /**
   * Валидировать данные без создания
   * @param {Object} data - Данные для валидации
   * @returns {Object} Результат валидации
   */
  const validate = useCallback((data) => {
    return validateReturnData(data);
  }, []);

  return {
    createReturn,
    validate,
    isCreating,
    isLoading: isCreating,
  };
};

