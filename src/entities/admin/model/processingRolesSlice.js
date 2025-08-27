import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminApi } from '../api/adminApi';

// Async thunks
export const fetchEmployeesWithProcessingRoles = createAsyncThunk(
  'processingRoles/fetchEmployees',
  async (options = {}, { rejectWithValue }) => {
    try {
      const response = await adminApi.getEmployeesWithProcessingRoles(options);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const assignProcessingRole = createAsyncThunk(
  'processingRoles/assignRole',
  async ({ employeeId, processingRole }, { rejectWithValue }) => {
    try {
      const response = await adminApi.assignProcessingRole(employeeId, processingRole);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const processingRolesSlice = createSlice({
  name: 'processingRoles',
  initialState: {
    employees: [],
    loading: false,
    error: null,
    total: 0,
    page: 1,
    pages: 0,
    filters: {
      search: '',
      processingRole: null
    }
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        search: '',
        processingRole: null
      };
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchEmployeesWithProcessingRoles
      .addCase(fetchEmployeesWithProcessingRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployeesWithProcessingRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload.employees;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.pages = action.payload.pages;
      })
      .addCase(fetchEmployeesWithProcessingRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // assignProcessingRole
      .addCase(assignProcessingRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(assignProcessingRole.fulfilled, (state, action) => {
        state.loading = false;
        // Обновляем сотрудника в списке
        const updatedEmployee = action.payload.employee;
        const index = state.employees.findIndex(emp => emp.id === updatedEmployee.id);
        if (index !== -1) {
          state.employees[index] = updatedEmployee;
        }
      })
      .addCase(assignProcessingRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { setFilters, clearFilters, clearError } = processingRolesSlice.actions;
export default processingRolesSlice.reducer; 