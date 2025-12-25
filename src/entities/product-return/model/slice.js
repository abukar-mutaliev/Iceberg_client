/**
 * Redux slice для управления возвратами товаров
 * @module product-return/model/slice
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productReturnApi } from '../api/productReturnApi';
import { handleApiError } from '../api/errorHandler';

// ==================== НАЧАЛЬНОЕ СОСТОЯНИЕ ====================

const initialState = {
  // Залежавшиеся товары
  stagnantProducts: {
    items: [],
    filters: { daysThreshold: 21 },
    loading: false,
    error: null,
    lastFetch: null,
  },
  
  // Список возвратов
  returns: {
    items: [],
    filters: {},
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      itemsPerPage: 20,
    },
    loading: false,
    error: null,
    lastFetch: null,
  },
  
  // Детали конкретного возврата
  returnDetail: {
    data: null,
    loading: false,
    error: null,
  },
  
  // Статистика
  statistics: {
    data: null,
    loading: false,
    error: null,
    filters: {},
  },
  
  // UI состояние
  ui: {
    isCreatingReturn: false,
    isApprovingReturn: false,
    isRejectingReturn: false,
    isCompletingReturn: false,
    selectedProductIds: [],
    selectedReturnIds: [],
  },
};

// ==================== ASYNC THUNKS ====================

/**
 * Загрузить список залежавшихся товаров
 */
export const fetchStagnantProducts = createAsyncThunk(
  'productReturn/fetchStagnantProducts',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await productReturnApi.getStagnantProducts(filters);
      // Сервер возвращает { status, data: { products, summary } }
      const products = response.data?.products || response.products || response;
      return { data: products, filters };
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Загрузить список возвратов
 */
export const fetchProductReturns = createAsyncThunk(
  'productReturn/fetchProductReturns',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const response = await productReturnApi.getReturns(filters);
      // Сервер возвращает { status, data: { returns, pagination } }
      const data = response.data || response;
      return { ...data, filters };
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Загрузить детали возврата
 */
export const fetchReturnDetail = createAsyncThunk(
  'productReturn/fetchReturnDetail',
  async (returnId, { rejectWithValue }) => {
    try {
      const response = await productReturnApi.getReturnById(returnId);
      // Сервер возвращает { status, data: { productReturn } }
      const productReturn = response.data?.productReturn || response.productReturn || response;
      return productReturn;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Создать запрос на возврат
 */
export const createProductReturn = createAsyncThunk(
  'productReturn/createProductReturn',
  async (data, { rejectWithValue }) => {
    try {
      const result = await productReturnApi.createReturn(data);
      return result;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Одобрить возврат
 */
export const approveProductReturn = createAsyncThunk(
  'productReturn/approveProductReturn',
  async (data, { rejectWithValue }) => {
    try {
      const result = await productReturnApi.approveReturn(data);
      return result;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Отклонить возврат
 */
export const rejectProductReturn = createAsyncThunk(
  'productReturn/rejectProductReturn',
  async (data, { rejectWithValue }) => {
    try {
      const result = await productReturnApi.rejectReturn(data);
      return result;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Завершить возврат
 */
export const completeProductReturn = createAsyncThunk(
  'productReturn/completeProductReturn',
  async (data, { rejectWithValue }) => {
    try {
      const result = await productReturnApi.completeReturn(data);
      return result;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Начать процесс возврата
 */
export const startProductReturn = createAsyncThunk(
  'productReturn/startProductReturn',
  async (returnId, { rejectWithValue }) => {
    try {
      const result = await productReturnApi.startReturn(returnId);
      return result;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Отменить возврат
 */
export const cancelProductReturn = createAsyncThunk(
  'productReturn/cancelProductReturn',
  async ({ returnId, reason }, { rejectWithValue }) => {
    try {
      const result = await productReturnApi.cancelReturn(returnId, reason);
      return result;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Загрузить статистику возвратов
 */
export const fetchReturnStatistics = createAsyncThunk(
  'productReturn/fetchReturnStatistics',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const data = await productReturnApi.getStatistics(filters);
      return { data, filters };
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Запустить проверку залежавшихся товаров
 */
export const runStagnantCheck = createAsyncThunk(
  'productReturn/runStagnantCheck',
  async (_, { rejectWithValue }) => {
    try {
      const result = await productReturnApi.runStagnantCheck();
      return result;
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

// ==================== SLICE ====================

const productReturnSlice = createSlice({
  name: 'productReturn',
  initialState,
  reducers: {
    // Обновить фильтры залежавшихся товаров
    setStagnantProductsFilters: (state, action) => {
      state.stagnantProducts.filters = {
        ...state.stagnantProducts.filters,
        ...action.payload,
      };
    },

    // Сбросить фильтры залежавшихся товаров
    resetStagnantProductsFilters: (state) => {
      state.stagnantProducts.filters = initialState.stagnantProducts.filters;
    },

    // Обновить фильтры возвратов
    setProductReturnsFilters: (state, action) => {
      state.returns.filters = {
        ...state.returns.filters,
        ...action.payload,
      };
    },

    // Сбросить фильтры возвратов
    resetProductReturnsFilters: (state) => {
      state.returns.filters = initialState.returns.filters;
    },

    // Очистить список залежавшихся товаров
    clearStagnantProducts: (state) => {
      state.stagnantProducts.items = [];
      state.stagnantProducts.lastFetch = null;
    },

    // Очистить список возвратов
    clearProductReturns: (state) => {
      state.returns.items = [];
      state.returns.lastFetch = null;
    },

    // Очистить детали возврата
    clearReturnDetail: (state) => {
      state.returnDetail = initialState.returnDetail;
    },

    // Очистить статистику
    clearReturnStatistics: (state) => {
      state.statistics = initialState.statistics;
    },

    // UI действия - выбор продуктов
    toggleProductSelection: (state, action) => {
      const index = state.ui.selectedProductIds.indexOf(action.payload);
      if (index > -1) {
        state.ui.selectedProductIds.splice(index, 1);
      } else {
        state.ui.selectedProductIds.push(action.payload);
      }
    },

    clearProductSelection: (state) => {
      state.ui.selectedProductIds = [];
    },

    selectAllProducts: (state) => {
      state.ui.selectedProductIds = state.stagnantProducts.items.map(
        p => p.productId
      );
    },

    // UI действия - выбор возвратов
    toggleReturnSelection: (state, action) => {
      const index = state.ui.selectedReturnIds.indexOf(action.payload);
      if (index > -1) {
        state.ui.selectedReturnIds.splice(index, 1);
      } else {
        state.ui.selectedReturnIds.push(action.payload);
      }
    },

    clearReturnSelection: (state) => {
      state.ui.selectedReturnIds = [];
    },

    selectAllReturns: (state) => {
      state.ui.selectedReturnIds = state.returns.items.map(r => r.id);
    },

    // Очистить ошибки
    clearErrors: (state) => {
      state.stagnantProducts.error = null;
      state.returns.error = null;
      state.returnDetail.error = null;
      state.statistics.error = null;
    },
  },
  extraReducers: (builder) => {
    // ===== Залежавшиеся товары =====
    builder
      .addCase(fetchStagnantProducts.pending, (state) => {
        state.stagnantProducts.loading = true;
        state.stagnantProducts.error = null;
      })
      .addCase(fetchStagnantProducts.fulfilled, (state, action) => {
        state.stagnantProducts.loading = false;
        state.stagnantProducts.items = action.payload.data;
        state.stagnantProducts.filters = action.payload.filters;
        state.stagnantProducts.lastFetch = Date.now();
      })
      .addCase(fetchStagnantProducts.rejected, (state, action) => {
        state.stagnantProducts.loading = false;
        state.stagnantProducts.error = action.payload;
      });

    // ===== Список возвратов =====
    builder
      .addCase(fetchProductReturns.pending, (state) => {
        state.returns.loading = true;
        state.returns.error = null;
      })
      .addCase(fetchProductReturns.fulfilled, (state, action) => {
        state.returns.loading = false;
        state.returns.items = action.payload.returns;
        state.returns.pagination = action.payload.pagination;
        state.returns.filters = action.payload.filters;
        state.returns.lastFetch = Date.now();
      })
      .addCase(fetchProductReturns.rejected, (state, action) => {
        state.returns.loading = false;
        state.returns.error = action.payload;
      });

    // ===== Детали возврата =====
    builder
      .addCase(fetchReturnDetail.pending, (state) => {
        state.returnDetail.loading = true;
        state.returnDetail.error = null;
      })
      .addCase(fetchReturnDetail.fulfilled, (state, action) => {
        state.returnDetail.loading = false;
        state.returnDetail.data = action.payload;
      })
      .addCase(fetchReturnDetail.rejected, (state, action) => {
        state.returnDetail.loading = false;
        state.returnDetail.error = action.payload;
      });

    // ===== Создание возврата =====
    builder
      .addCase(createProductReturn.pending, (state) => {
        state.ui.isCreatingReturn = true;
      })
      .addCase(createProductReturn.fulfilled, (state, action) => {
        state.ui.isCreatingReturn = false;
        // Добавляем в начало списка
        state.returns.items.unshift(action.payload);
        if (state.returns.pagination.totalItems !== undefined) {
          state.returns.pagination.totalItems += 1;
        }
      })
      .addCase(createProductReturn.rejected, (state) => {
        state.ui.isCreatingReturn = false;
      });

    // ===== Одобрение возврата =====
    builder
      .addCase(approveProductReturn.pending, (state) => {
        state.ui.isApprovingReturn = true;
      })
      .addCase(approveProductReturn.fulfilled, (state, action) => {
        state.ui.isApprovingReturn = false;
        // Обновляем в списке
        const index = state.returns.items.findIndex(
          (r) => r.id === action.payload.id
        );
        if (index > -1) {
          state.returns.items[index] = action.payload;
        }
        // Обновляем детали если открыты
        if (state.returnDetail.data?.id === action.payload.id) {
          state.returnDetail.data = action.payload;
        }
      })
      .addCase(approveProductReturn.rejected, (state) => {
        state.ui.isApprovingReturn = false;
      });

    // ===== Отклонение возврата =====
    builder
      .addCase(rejectProductReturn.pending, (state) => {
        state.ui.isRejectingReturn = true;
      })
      .addCase(rejectProductReturn.fulfilled, (state, action) => {
        state.ui.isRejectingReturn = false;
        const index = state.returns.items.findIndex(
          (r) => r.id === action.payload.id
        );
        if (index > -1) {
          state.returns.items[index] = action.payload;
        }
        if (state.returnDetail.data?.id === action.payload.id) {
          state.returnDetail.data = action.payload;
        }
      })
      .addCase(rejectProductReturn.rejected, (state) => {
        state.ui.isRejectingReturn = false;
      });

    // ===== Завершение возврата =====
    builder
      .addCase(completeProductReturn.pending, (state) => {
        state.ui.isCompletingReturn = true;
      })
      .addCase(completeProductReturn.fulfilled, (state, action) => {
        state.ui.isCompletingReturn = false;
        const index = state.returns.items.findIndex(
          (r) => r.id === action.payload.id
        );
        if (index > -1) {
          state.returns.items[index] = action.payload;
        }
        if (state.returnDetail.data?.id === action.payload.id) {
          state.returnDetail.data = action.payload;
        }
      })
      .addCase(completeProductReturn.rejected, (state) => {
        state.ui.isCompletingReturn = false;
      });

    // ===== Начало процесса возврата =====
    builder
      .addCase(startProductReturn.pending, (state) => {
        // Можно добавить UI индикатор если нужно
      })
      .addCase(startProductReturn.fulfilled, (state, action) => {
        const index = state.returns.items.findIndex(
          (r) => r.id === action.payload.id
        );
        if (index > -1) {
          state.returns.items[index] = action.payload;
        }
        if (state.returnDetail.data?.id === action.payload.id) {
          state.returnDetail.data = action.payload;
        }
      })
      .addCase(startProductReturn.rejected, (state) => {
        // Обработка ошибки
      });

    // ===== Отмена возврата =====
    builder
      .addCase(cancelProductReturn.pending, (state) => {
        // Можно добавить UI индикатор если нужно
      })
      .addCase(cancelProductReturn.fulfilled, (state, action) => {
        const index = state.returns.items.findIndex(
          (r) => r.id === action.payload.id
        );
        if (index > -1) {
          state.returns.items[index] = action.payload;
        }
        if (state.returnDetail.data?.id === action.payload.id) {
          state.returnDetail.data = action.payload;
        }
      })
      .addCase(cancelProductReturn.rejected, (state) => {
        // Обработка ошибки
      });

    // ===== Статистика =====
    builder
      .addCase(fetchReturnStatistics.pending, (state) => {
        state.statistics.loading = true;
        state.statistics.error = null;
      })
      .addCase(fetchReturnStatistics.fulfilled, (state, action) => {
        state.statistics.loading = false;
        state.statistics.data = action.payload.data;
        state.statistics.filters = action.payload.filters;
      })
      .addCase(fetchReturnStatistics.rejected, (state, action) => {
        state.statistics.loading = false;
        state.statistics.error = action.payload;
      });

    // ===== Проверка залежавшихся =====
    builder
      .addCase(runStagnantCheck.pending, (state) => {
        state.stagnantProducts.loading = true;
      })
      .addCase(runStagnantCheck.fulfilled, (state) => {
        state.stagnantProducts.loading = false;
        // После проверки можно перезагрузить список
        state.stagnantProducts.lastFetch = null;
      })
      .addCase(runStagnantCheck.rejected, (state, action) => {
        state.stagnantProducts.loading = false;
        state.stagnantProducts.error = action.payload;
      });
  },
});

// Экспорт actions
export const {
  setStagnantProductsFilters,
  resetStagnantProductsFilters,
  setProductReturnsFilters,
  resetProductReturnsFilters,
  clearStagnantProducts,
  clearProductReturns,
  clearReturnDetail,
  clearReturnStatistics,
  toggleProductSelection,
  clearProductSelection,
  selectAllProducts,
  toggleReturnSelection,
  clearReturnSelection,
  selectAllReturns,
  clearErrors,
} = productReturnSlice.actions;

// Экспорт reducer
export default productReturnSlice.reducer;

