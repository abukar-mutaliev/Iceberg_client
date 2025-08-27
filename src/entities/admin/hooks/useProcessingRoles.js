import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchEmployeesWithProcessingRoles,
  assignProcessingRole,
  setFilters,
  clearFilters,
  clearError
} from '../model/processingRolesSlice';

export const useProcessingRoles = () => {
  const dispatch = useDispatch();
  const userRole = useSelector(state => state.auth?.user?.role);
  
  // Состояние из Redux
  const employees = useSelector(state => state.processingRoles.employees);
  const loading = useSelector(state => state.processingRoles.loading);
  const error = useSelector(state => state.processingRoles.error);
  const total = useSelector(state => state.processingRoles.total);
  const page = useSelector(state => state.processingRoles.page);
  const pages = useSelector(state => state.processingRoles.pages);
  const filters = useSelector(state => state.processingRoles.filters);

  // Проверка прав доступа  
  const accessRights = useMemo(() => ({
    canViewProcessingRoles: userRole === 'ADMIN',
    canAssignProcessingRoles: userRole === 'ADMIN', // Только суперадмин может назначать должности
    isSuperAdmin: userRole === 'ADMIN' // В реальном приложении нужно проверять isSuperAdmin
  }), [userRole]);

  // Загрузка сотрудников с должностями
  const loadEmployees = useCallback(async (options = {}) => {
    if (!accessRights.canViewProcessingRoles) {
      throw new Error('Access denied: Cannot view processing roles');
    }

    try {
      const result = await dispatch(fetchEmployeesWithProcessingRoles({ ...filters, ...options })).unwrap();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [dispatch, accessRights.canViewProcessingRoles, filters]);

  // Назначение должности сотруднику
  const assignRole = useCallback(async (employeeId, processingRole) => {
    if (!accessRights.canAssignProcessingRoles) {
      throw new Error('Access denied: Cannot assign processing roles');
    }

    try {
      const result = await dispatch(assignProcessingRole({ employeeId, processingRole })).unwrap();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [dispatch, accessRights.canAssignProcessingRoles]);

  // Установка фильтров
  const setFilter = useCallback((filterData) => {
    dispatch(setFilters(filterData));
  }, [dispatch]);

  // Очистка фильтров
  const clearAllFilters = useCallback(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  // Очистка ошибок
  const clearErrors = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Получение сотрудников по должности
  const getEmployeesByRole = useCallback((processingRole) => {
    return employees.filter(employee => employee.processingRole === processingRole);
  }, [employees]);

  // Получение сотрудников без назначенной должности
  const getUnassignedEmployees = useCallback(() => {
    return employees.filter(employee => !employee.processingRole);
  }, [employees]);

  // Статистика по должностям
  const roleStatistics = useMemo(() => {
    const stats = {
      PICKER: 0,
      PACKER: 0,
      QUALITY_CHECKER: 0,
      COURIER: 0,
      SUPERVISOR: 0,
      UNASSIGNED: 0
    };

    employees.forEach(employee => {
      if (employee.processingRole) {
        stats[employee.processingRole]++;
      } else {
        stats.UNASSIGNED++;
      }
    });

    return stats;
  }, [employees]);

  return {
    // Данные
    employees,
    loading,
    error,
    total,
    page,
    pages,
    filters,
    accessRights,
    roleStatistics,

    // Функции
    loadEmployees,
    assignRole,
    setFilter,
    clearAllFilters,
    clearErrors,
    getEmployeesByRole,
    getUnassignedEmployees
  };
}; 