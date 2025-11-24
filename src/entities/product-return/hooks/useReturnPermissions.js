/**
 * Хук для проверки прав доступа к операциям с возвратами
 * @module product-return/hooks/useReturnPermissions
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ProductReturnStatus } from '../lib/constants';

/**
 * Хук для проверки прав доступа к операциям с возвратами
 * @param {Object} [productReturn] - Данные возврата
 * @returns {Object} Объект с флагами прав доступа
 */
export const useReturnPermissions = (productReturn = null) => {
  // Получаем данные текущего пользователя из Redux
  const currentUser = useSelector((state) => state.auth?.user);
  
  const userRole = currentUser?.role;

  // Мемоизируем вычисление прав доступа
  const permissions = useMemo(() => {
    const isAdmin = userRole === 'ADMIN';
    const isEmployee = userRole === 'EMPLOYEE';
    const isSupplier = userRole === 'SUPPLIER';
    const isClient = userRole === 'CLIENT';

    // Базовые права
    const canView = isAdmin || isEmployee || isSupplier;
    const canCreate = isAdmin || isEmployee;

    // Права на конкретный возврат
    let canApprove = false;
    let canReject = false;
    let canComplete = false;
    let canStart = false;
    let canCancel = false;

    if (productReturn) {
      const { status } = productReturn;

      // Одобрение (только ADMIN для PENDING)
      canApprove = isAdmin && status === ProductReturnStatus.PENDING;

      // Отклонение (только ADMIN для PENDING)
      canReject = isAdmin && status === ProductReturnStatus.PENDING;

      // Завершение (ADMIN или EMPLOYEE для APPROVED или IN_PROGRESS)
      canComplete =
        (isAdmin || isEmployee) &&
        (status === ProductReturnStatus.APPROVED ||
          status === ProductReturnStatus.IN_PROGRESS);

      // Начало процесса (ADMIN, EMPLOYEE или SUPPLIER для APPROVED)
      canStart =
        (isAdmin || isEmployee || isSupplier) &&
        status === ProductReturnStatus.APPROVED;

      // Отмена (только ADMIN для PENDING или APPROVED)
      canCancel =
        isAdmin &&
        (status === ProductReturnStatus.PENDING ||
          status === ProductReturnStatus.APPROVED);
    }

    return {
      // Проверки роли
      isAdmin,
      isEmployee,
      isSupplier,
      isClient,
      
      // Общие права
      canView,
      canCreate,
      canViewStatistics: isAdmin || isEmployee,
      canRunStagnantCheck: isAdmin,
      
      // Права на конкретный возврат
      canApprove,
      canReject,
      canComplete,
      canStart,
      canCancel,
      
      // Вспомогательные флаги
      hasAnyActionPermission: canApprove || canReject || canComplete || canStart || canCancel,
      canModify: canApprove || canReject || canComplete || canCancel,
    };
  }, [userRole, productReturn]);

  return permissions;
};

