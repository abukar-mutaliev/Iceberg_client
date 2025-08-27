import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { OrderProcessingApi } from '../api/orderProcessingApi';

// Async thunks для обработки заказов
export const fetchOrdersByStage = createAsyncThunk(
  'orderProcessing/fetchOrdersByStage',
  async ({ stage, page = 1, limit = 20, priority, employeeId }, { rejectWithValue }) => {
    try {
      const response = await OrderProcessingApi.getOrdersByStage(stage, { page, limit, priority, employeeId });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const assignOrderToStage = createAsyncThunk(
  'orderProcessing/assignOrderToStage',
  async ({ orderId, stage, employeeId, priority }, { rejectWithValue }) => {
    try {
      const response = await OrderProcessingApi.assignOrderToStage(orderId, stage, employeeId, priority);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateStageStatus = createAsyncThunk(
  'orderProcessing/updateStageStatus',
  async ({ orderId, stage, status, notes }, { rejectWithValue }) => {
    try {
      const response = await OrderProcessingApi.updateStageStatus(orderId, stage, status, notes);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchProcessingStatistics = createAsyncThunk(
  'orderProcessing/fetchStatistics',
  async ({ date, warehouseId }, { rejectWithValue }) => {
    try {
      const response = await OrderProcessingApi.getStageStatistics(date, warehouseId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAvailableEmployees = createAsyncThunk(
  'orderProcessing/fetchAvailableEmployees',
  async (stage, { rejectWithValue }) => {
    try {
      const response = await OrderProcessingApi.getAvailableEmployees(stage);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchEmployeeWorkload = createAsyncThunk(
  'orderProcessing/fetchEmployeeWorkload',
  async ({ employeeId, stage }, { rejectWithValue }) => {
    try {
      const response = await OrderProcessingApi.getEmployeeWorkload(employeeId, stage);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const forceCompleteStage = createAsyncThunk(
  'orderProcessing/forceCompleteStage',
  async ({ stageId, notes }, { rejectWithValue }) => {
    try {
      const response = await OrderProcessingApi.forceCompleteStage(stageId, notes);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const autoReassignOrders = createAsyncThunk(
  'orderProcessing/autoReassignOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await OrderProcessingApi.autoReassignOrders();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const moveToNextStage = createAsyncThunk(
  'orderProcessing/moveToNextStage',
  async ({ orderId, currentStage }, { rejectWithValue }) => {
    try {
      const response = await OrderProcessingApi.moveToNextStage(orderId, currentStage);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice для обработки заказов
const orderProcessingSlice = createSlice({
  name: 'orderProcessing',
  initialState: {
    // Данные этапов обработки
    stages: {},
    
    // Статистика
    statistics: {},
    
    // Назначения
    assignments: {},
    
    // Состояние загрузки
    loading: false,
    loadingStages: false,
    loadingStatistics: false,
    loadingEmployees: false,
    
    // Ошибки
    error: null,
    stageError: null,
    statisticsError: null,
    employeeError: null,
    
    // Текущий этап
    currentStage: null,
    
    // Доступные сотрудники
    availableEmployees: [],
    
    // Загруженность сотрудников
    employeeWorkload: {},
    
    // Фильтры
    filters: {
      stage: null,
      priority: null,
      employeeId: null,
      date: null
    },
    
    // Пагинация
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      hasMore: true
    }
  },
  reducers: {
    setCurrentStage: (state, action) => {
      state.currentStage = action.payload;
    },
    clearProcessingError: (state) => {
      state.error = null;
    },
    clearStageError: (state) => {
      state.stageError = null;
    },
    clearStatisticsError: (state) => {
      state.statisticsError = null;
    },
    clearEmployeeError: (state) => {
      state.employeeError = null;
    },
    updateStageInList: (state, action) => {
      const { orderId, stageData } = action.payload;
      if (!state.stages[orderId]) {
        state.stages[orderId] = [];
      }
      const stageIndex = state.stages[orderId].findIndex(s => s.id === stageData.id);
      if (stageIndex !== -1) {
        state.stages[orderId][stageIndex] = stageData;
      } else {
        state.stages[orderId].push(stageData);
      }
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        stage: null,
        priority: null,
        employeeId: null,
        date: null
      };
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearStages: (state) => {
      state.stages = {};
    },
    clearStatistics: (state) => {
      state.statistics = {};
    },
    clearEmployees: (state) => {
      state.availableEmployees = [];
      state.employeeWorkload = {};
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchOrdersByStage
      .addCase(fetchOrdersByStage.pending, (state) => {
        state.loadingStages = true;
        state.stageError = null;
      })
      .addCase(fetchOrdersByStage.fulfilled, (state, action) => {
        state.loadingStages = false;
        const { stages, total, page, pages } = action.payload;
        
        // Обновляем данные этапов
        Object.keys(stages).forEach(orderId => {
          if (!state.stages[orderId]) {
            state.stages[orderId] = [];
          }
          state.stages[orderId] = stages[orderId];
        });
        
        // Обновляем пагинацию
        state.pagination = {
          page,
          total,
          pages,
          hasMore: page < pages
        };
      })
      .addCase(fetchOrdersByStage.rejected, (state, action) => {
        state.loadingStages = false;
        state.stageError = action.payload;
      })
      
      // assignOrderToStage
      .addCase(assignOrderToStage.fulfilled, (state, action) => {
        const { orderId, stageData } = action.payload;
        if (!state.stages[orderId]) {
          state.stages[orderId] = [];
        }
        state.stages[orderId].push(stageData);
      })
      
      // updateStageStatus
      .addCase(updateStageStatus.fulfilled, (state, action) => {
        const { orderId, stageData } = action.payload;
        if (state.stages[orderId]) {
          const stageIndex = state.stages[orderId].findIndex(s => s.id === stageData.id);
          if (stageIndex !== -1) {
            state.stages[orderId][stageIndex] = stageData;
          }
        }
      })
      
      // fetchProcessingStatistics
      .addCase(fetchProcessingStatistics.pending, (state) => {
        state.loadingStatistics = true;
        state.statisticsError = null;
      })
      .addCase(fetchProcessingStatistics.fulfilled, (state, action) => {
        state.loadingStatistics = false;
        state.statistics = action.payload;
      })
      .addCase(fetchProcessingStatistics.rejected, (state, action) => {
        state.loadingStatistics = false;
        state.statisticsError = action.payload;
      })
      
      // fetchAvailableEmployees
      .addCase(fetchAvailableEmployees.pending, (state) => {
        state.loadingEmployees = true;
        state.employeeError = null;
      })
      .addCase(fetchAvailableEmployees.fulfilled, (state, action) => {
        state.loadingEmployees = false;
        state.availableEmployees = action.payload.employees || [];
      })
      .addCase(fetchAvailableEmployees.rejected, (state, action) => {
        state.loadingEmployees = false;
        state.employeeError = action.payload;
      })
      
      // fetchEmployeeWorkload
      .addCase(fetchEmployeeWorkload.fulfilled, (state, action) => {
        const { employeeId, workload } = action.payload;
        state.employeeWorkload[employeeId] = workload;
      })
      
      // moveToNextStage
      .addCase(moveToNextStage.fulfilled, (state, action) => {
        const { orderId, nextStageData } = action.payload;
        if (!state.stages[orderId]) {
          state.stages[orderId] = [];
        }
        state.stages[orderId].push(nextStageData);
      });
  }
});

export const { 
  setCurrentStage, 
  clearProcessingError, 
  clearStageError,
  clearStatisticsError,
  clearEmployeeError,
  updateStageInList,
  setFilters,
  clearFilters,
  setPagination,
  clearStages,
  clearStatistics,
  clearEmployees
} = orderProcessingSlice.actions;

export default orderProcessingSlice.reducer; 