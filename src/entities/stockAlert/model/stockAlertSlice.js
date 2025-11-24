import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import StockAlertApi from '../api/stockAlertApi';

/**
 * Асинхронные действия для работы с уведомлениями об остатках
 */

// Получение статистики по остаткам
export const fetchStockStats = createAsyncThunk(
    'stockAlert/fetchStats',
    async (warehouseId = null, { rejectWithValue }) => {
        try {
            const response = await StockAlertApi.getStockStats(warehouseId);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Получение критических товаров
export const fetchCriticalStock = createAsyncThunk(
    'stockAlert/fetchCritical',
    async ({ warehouseId = null, limit = 50 } = {}, { rejectWithValue }) => {
        try {
            const response = await StockAlertApi.getCriticalStock(warehouseId, limit);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Получение истории уведомлений
export const fetchAlertHistory = createAsyncThunk(
    'stockAlert/fetchHistory',
    async ({ page = 1, limit = 20, filters = {} } = {}, { rejectWithValue }) => {
        try {
            const response = await StockAlertApi.getAlertHistory(page, limit, filters);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Ручная проверка всех остатков
export const checkAllStock = createAsyncThunk(
    'stockAlert/checkAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await StockAlertApi.checkAllStock();
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Проверка конкретного товара
export const checkProductStock = createAsyncThunk(
    'stockAlert/checkProduct',
    async ({ productId, warehouseId }, { rejectWithValue }) => {
        try {
            const response = await StockAlertApi.checkProductStock(productId, warehouseId);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const stockAlertSlice = createSlice({
    name: 'stockAlert',
    initialState: {
        // Статистика по остаткам
        stats: null,
        statsLoading: false,
        statsError: null,

        // Критические товары
        criticalItems: [],
        criticalLoading: false,
        criticalError: null,

        // История уведомлений
        history: {
            alerts: [],
            pagination: {
                total: 0,
                page: 1,
                limit: 20,
                pages: 0
            }
        },
        historyLoading: false,
        historyError: null,

        // Ручная проверка
        checkLoading: false,
        checkError: null,
        checkResult: null,

        // Проверка товара
        productCheckLoading: false,
        productCheckError: null,
        productCheckResult: null,
    },
    reducers: {
        // Очистка ошибок
        clearErrors: (state) => {
            state.statsError = null;
            state.criticalError = null;
            state.historyError = null;
            state.checkError = null;
            state.productCheckError = null;
        },

        // Очистка результатов проверки
        clearCheckResult: (state) => {
            state.checkResult = null;
        },

        // Очистка результатов проверки товара
        clearProductCheckResult: (state) => {
            state.productCheckResult = null;
        },

        // Очистка состояния при выходе
        resetStockAlertState: (state) => {
            state.stats = null;
            state.criticalItems = [];
            state.history = {
                alerts: [],
                pagination: {
                    total: 0,
                    page: 1,
                    limit: 20,
                    pages: 0
                }
            };
            state.checkResult = null;
            state.productCheckResult = null;
            state.statsError = null;
            state.criticalError = null;
            state.historyError = null;
            state.checkError = null;
            state.productCheckError = null;
        },
    },
    extraReducers: (builder) => {
        // fetchStockStats
        builder
            .addCase(fetchStockStats.pending, (state) => {
                state.statsLoading = true;
                state.statsError = null;
            })
            .addCase(fetchStockStats.fulfilled, (state, action) => {
                state.statsLoading = false;
                state.stats = action.payload.data || action.payload;
            })
            .addCase(fetchStockStats.rejected, (state, action) => {
                state.statsLoading = false;
                state.statsError = action.payload || action.error.message;
            });

        // fetchCriticalStock
        builder
            .addCase(fetchCriticalStock.pending, (state) => {
                state.criticalLoading = true;
                state.criticalError = null;
            })
            .addCase(fetchCriticalStock.fulfilled, (state, action) => {
                state.criticalLoading = false;
                state.criticalItems = action.payload.items || action.payload.data?.items || [];
            })
            .addCase(fetchCriticalStock.rejected, (state, action) => {
                state.criticalLoading = false;
                state.criticalError = action.payload || action.error.message;
            });

        // fetchAlertHistory
        builder
            .addCase(fetchAlertHistory.pending, (state) => {
                state.historyLoading = true;
                state.historyError = null;
            })
            .addCase(fetchAlertHistory.fulfilled, (state, action) => {
                state.historyLoading = false;
                state.history = action.payload;
            })
            .addCase(fetchAlertHistory.rejected, (state, action) => {
                state.historyLoading = false;
                state.historyError = action.payload || action.error.message;
            });

        // checkAllStock
        builder
            .addCase(checkAllStock.pending, (state) => {
                state.checkLoading = true;
                state.checkError = null;
            })
            .addCase(checkAllStock.fulfilled, (state, action) => {
                state.checkLoading = false;
                state.checkResult = action.payload;
            })
            .addCase(checkAllStock.rejected, (state, action) => {
                state.checkLoading = false;
                state.checkError = action.payload || action.error.message;
            });

        // checkProductStock
        builder
            .addCase(checkProductStock.pending, (state) => {
                state.productCheckLoading = true;
                state.productCheckError = null;
            })
            .addCase(checkProductStock.fulfilled, (state, action) => {
                state.productCheckLoading = false;
                state.productCheckResult = action.payload;
            })
            .addCase(checkProductStock.rejected, (state, action) => {
                state.productCheckLoading = false;
                state.productCheckError = action.payload || action.error.message;
            });
    },
});

// Селекторы
export const selectStockStats = (state) => state.stockAlert.stats;
export const selectStockStatsLoading = (state) => state.stockAlert.statsLoading;
export const selectStockStatsError = (state) => state.stockAlert.statsError;

export const selectCriticalStock = (state) => state.stockAlert.criticalItems;
export const selectCriticalStockLoading = (state) => state.stockAlert.criticalLoading;
export const selectCriticalStockError = (state) => state.stockAlert.criticalError;

export const selectAlertHistory = (state) => state.stockAlert.history;
export const selectAlertHistoryLoading = (state) => state.stockAlert.historyLoading;
export const selectAlertHistoryError = (state) => state.stockAlert.historyError;

export const selectCheckAllLoading = (state) => state.stockAlert.checkLoading;
export const selectCheckAllError = (state) => state.stockAlert.checkError;
export const selectCheckAllResult = (state) => state.stockAlert.checkResult;

export const selectProductCheckLoading = (state) => state.stockAlert.productCheckLoading;
export const selectProductCheckError = (state) => state.stockAlert.productCheckError;
export const selectProductCheckResult = (state) => state.stockAlert.productCheckResult;

// Селектор для подсчета общего количества уведомлений (только критические + предупреждения)
export const selectTotalAlertsCount = (state) => {
    const stats = state.stockAlert.stats;
    if (!stats) return 0;

    return (stats.summary?.critical || 0) +
           (stats.summary?.warning || 0);
};

export const { clearErrors, clearCheckResult, clearProductCheckResult, resetStockAlertState } = stockAlertSlice.actions;

export default stockAlertSlice.reducer;
