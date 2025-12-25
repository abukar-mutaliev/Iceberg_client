import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchOrdersByStage,
  assignOrderToStage,
  updateStageStatus,
  fetchProcessingStatistics,
  fetchAvailableEmployees,
  fetchEmployeeWorkload,
  forceCompleteStage,
  autoReassignOrders,
  moveToNextStage,
  setCurrentStage,
  clearProcessingError,
  setFilters,
  clearFilters,
  setPagination,
  clearStages,
  clearStatistics,
  clearEmployees
} from '../model/processingSlice';
import {PROCESSING_ROLES, PROCESSING_STAGES, ROLE_STAGE_MAPPING} from "@entities/order/lib/constants";

export const useOrderProcessing = () => {
  const dispatch = useDispatch();
  const userRole = useSelector(state => state.auth?.user?.role);
  const employee = useSelector(state => state.auth?.user?.employee);
  
  // Состояние из Redux
  const stages = useSelector(state => state.orderProcessing.stages);
  const statistics = useSelector(state => state.orderProcessing.statistics);
  const loading = useSelector(state => state.orderProcessing.loading);
  const loadingStages = useSelector(state => state.orderProcessing.loadingStages);
  const loadingStatistics = useSelector(state => state.orderProcessing.loadingStatistics);
  const loadingEmployees = useSelector(state => state.orderProcessing.loadingEmployees);
  const error = useSelector(state => state.orderProcessing.error);
  const stageError = useSelector(state => state.orderProcessing.stageError);
  const statisticsError = useSelector(state => state.orderProcessing.statisticsError);
  const employeeError = useSelector(state => state.orderProcessing.employeeError);
  const currentStage = useSelector(state => state.orderProcessing.currentStage);
  const availableEmployees = useSelector(state => state.orderProcessing.availableEmployees);
  const employeeWorkload = useSelector(state => state.orderProcessing.employeeWorkload);
  const filters = useSelector(state => state.orderProcessing.filters);
  const pagination = useSelector(state => state.orderProcessing.pagination);

  // Проверка прав доступа
  const accessRights = useMemo(() => ({
    canViewProcessing: ['ADMIN', 'EMPLOYEE'].includes(userRole),
    canAssignOrders: userRole === 'ADMIN' || employee?.processingRole === 'SUPERVISOR',
    canUpdateStages: ['ADMIN', 'EMPLOYEE'].includes(userRole),
    canViewStatistics: userRole === 'ADMIN' || employee?.processingRole === 'SUPERVISOR',
    canForceComplete: userRole === 'ADMIN' || employee?.processingRole === 'SUPERVISOR',
    canAutoReassign: userRole === 'ADMIN' || employee?.processingRole === 'SUPERVISOR',
    processingRole: employee?.processingRole,
    employeeId: employee?.id
  }), [userRole, employee]);

  // Загрузка заказов по этапу
  const loadOrdersByStage = useCallback(async (stage, options = {}) => {
    if (!accessRights.canViewProcessing) {
      throw new Error('Access denied: Cannot view processing orders');
    }

    try {
      const result = await dispatch(fetchOrdersByStage({ stage, ...options })).unwrap();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message || 'Ошибка загрузки заказов' };
    }
  }, [dispatch, accessRights.canViewProcessing]);

  // Назначение заказа на этап
  const assignOrder = useCallback(async (orderId, stage, employeeId, priority = 'MEDIUM') => {
    if (!accessRights.canAssignOrders) {
      throw new Error('Access denied: Cannot assign orders');
    }

    try {
      const result = await dispatch(assignOrderToStage({ orderId, stage, employeeId, priority })).unwrap();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message || 'Ошибка назначения заказа' };
    }
  }, [dispatch, accessRights.canAssignOrders]);

  // Обновление статуса этапа
  const updateStage = useCallback(async (orderId, stage, status, notes = null) => {
    if (!accessRights.canUpdateStages) {
      throw new Error('Access denied: Cannot update stages');
    }

    try {
      const result = await dispatch(updateStageStatus({ orderId, stage, status, notes })).unwrap();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message || 'Ошибка обновления статуса' };
    }
  }, [dispatch, accessRights.canUpdateStages]);

  // Загрузка статистики
  const loadStatistics = useCallback(async (date, warehouseId = null) => {
    if (!accessRights.canViewStatistics) {
      throw new Error('Access denied: Cannot view statistics');
    }

    try {
      const result = await dispatch(fetchProcessingStatistics({ date, warehouseId })).unwrap();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message || 'Ошибка загрузки статистики' };
    }
  }, [dispatch, accessRights.canViewStatistics]);

  // Загрузка доступных сотрудников
  const loadAvailableEmployees = useCallback(async (stage) => {
    try {
      const result = await dispatch(fetchAvailableEmployees(stage)).unwrap();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message || 'Ошибка загрузки сотрудников' };
    }
  }, [dispatch]);

  // Загрузка загруженности сотрудника
  const loadEmployeeWorkload = useCallback(async (employeeId, stage) => {
    try {
      const result = await dispatch(fetchEmployeeWorkload({ employeeId, stage })).unwrap();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message || 'Ошибка загрузки загруженности' };
    }
  }, [dispatch]);

  // Принудительное завершение этапа
  const forceComplete = useCallback(async (stageId, notes = null) => {
    if (!accessRights.canForceComplete) {
      throw new Error('Access denied: Cannot force complete stages');
    }

    try {
      const result = await dispatch(forceCompleteStage({ stageId, notes })).unwrap();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message || 'Ошибка принудительного завершения' };
    }
  }, [dispatch, accessRights.canForceComplete]);

  // Автоматическое переназначение
  const autoReassign = useCallback(async () => {
    if (!accessRights.canAutoReassign) {
      throw new Error('Access denied: Cannot auto reassign orders');
    }

    try {
      const result = await dispatch(autoReassignOrders()).unwrap();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message || 'Ошибка автопереназначения' };
    }
  }, [dispatch, accessRights.canAutoReassign]);

  // Переход к следующему этапу
  const moveToNext = useCallback(async (orderId, currentStage) => {
    try {
      const result = await dispatch(moveToNextStage({ orderId, currentStage })).unwrap();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message || 'Ошибка перехода к следующему этапу' };
    }
  }, [dispatch]);

  // Установка текущего этапа
  const setStage = useCallback((stage) => {
    dispatch(setCurrentStage(stage));
  }, [dispatch]);

  // Очистка ошибок
  const clearError = useCallback(() => {
    dispatch(clearProcessingError());
  }, [dispatch]);

  const clearStageError = useCallback(() => {
    dispatch(clearStageError());
  }, [dispatch]);

  const clearStatisticsError = useCallback(() => {
    dispatch(clearStatisticsError());
  }, [dispatch]);

  const clearEmployeeError = useCallback(() => {
    dispatch(clearEmployeeError());
  }, [dispatch]);

  // Управление фильтрами
  const updateFilters = useCallback((newFilters) => {
    dispatch(setFilters(newFilters));
  }, [dispatch]);

  const resetFilters = useCallback(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  // Управление пагинацией
  const updatePagination = useCallback((newPagination) => {
    dispatch(setPagination(newPagination));
  }, [dispatch]);

  // Очистка данных
  const clearStagesData = useCallback(() => {
    dispatch(clearStages());
  }, [dispatch]);

  const clearStatisticsData = useCallback(() => {
    dispatch(clearStatistics());
  }, [dispatch]);

  const clearEmployeesData = useCallback(() => {
    dispatch(clearEmployees());
  }, [dispatch]);

  // Получение заказов для текущей роли
  const getOrdersForRole = useCallback((stage = null) => {
    if (!accessRights.processingRole) return [];

    const targetStage = stage || currentStage;
    if (!targetStage) return [];

    // Фильтруем заказы по роли сотрудника
    const allowedStage = ROLE_STAGE_MAPPING[accessRights.processingRole];
    if (allowedStage && targetStage !== allowedStage) return [];

    return stages[targetStage] || [];
  }, [accessRights.processingRole, currentStage, stages]);

  // Получение заказов для конкретного заказа
  const getStagesForOrder = useCallback((orderId) => {
    return stages[orderId] || [];
  }, [stages]);

  // Проверка, может ли сотрудник работать с этапом
  const canWorkWithStage = useCallback((stage) => {
    if (!accessRights.processingRole) return false;

    const allowedStage = ROLE_STAGE_MAPPING[accessRights.processingRole];
    return allowedStage === null || allowedStage === stage;
  }, [accessRights.processingRole]);

  // Получение статистики загруженности сотрудника
  const getEmployeeWorkloadStats = useCallback((employeeId) => {
    return employeeWorkload[employeeId] || null;
  }, [employeeWorkload]);

  // Проверка, загружен ли сотрудник
  const isEmployeeOverloaded = useCallback((employeeId, role) => {
    const workload = employeeWorkload[employeeId];
    if (!workload) return false;

    const maxOrders = {
      [PROCESSING_ROLES.PICKER]: 20,
      [PROCESSING_ROLES.PACKER]: 25,
      [PROCESSING_ROLES.QUALITY_CHECKER]: 30,
      [PROCESSING_ROLES.COURIER]: 15,
      [PROCESSING_ROLES.SUPERVISOR]: 50
    };

    return workload.currentOrders >= maxOrders[role];
  }, [employeeWorkload]);

  // Получение общего состояния загрузки
  const isLoading = useMemo(() => {
    return loading || loadingStages || loadingStatistics || loadingEmployees;
  }, [loading, loadingStages, loadingStatistics, loadingEmployees]);

  return {
    // Данные
    stages,
    statistics,
    currentStage,
    loading,
    loadingStages,
    loadingStatistics,
    loadingEmployees,
    isLoading,
    error,
    stageError,
    statisticsError,
    employeeError,
    accessRights,
    availableEmployees,
    employeeWorkload,
    filters,
    pagination,

    // Функции
    loadOrdersByStage,
    assignOrder,
    updateStage,
    loadStatistics,
    loadAvailableEmployees,
    loadEmployeeWorkload,
    forceComplete,
    autoReassign,
    moveToNext,
    setStage,
    clearError,
    clearStageError,
    clearStatisticsError,
    clearEmployeeError,
    updateFilters,
    resetFilters,
    updatePagination,
    clearStagesData,
    clearStatisticsData,
    clearEmployeesData,
    getOrdersForRole,
    getStagesForOrder,
    canWorkWithStage,
    getEmployeeWorkloadStats,
    isEmployeeOverloaded
  };
}; 