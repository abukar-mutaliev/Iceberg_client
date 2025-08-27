import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import WarehouseService from '../api/warehouseApi';

const initialState = {
    // Все склады
    warehouses: [],
    warehousesLoading: false,
    warehousesError: null,
    lastFetchTime: null,

    // Текущий склад
    currentWarehouse: null,
    currentWarehouseLoading: false,
    currentWarehouseError: null,

    // Товары на складе
    warehouseProducts: {},
    warehouseProductsLoading: {},
    warehouseProductsError: {},

    // Остатки товаров по складам
    productStocks: {},
    productStocksLoading: {},
    productStocksError: {},

    // Поиск складов с товаром
    warehousesWithProduct: {},
    warehousesWithProductLoading: {},
    warehousesWithProductError: {}
};

const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 минут

const isCacheValid = (lastFetchTime) => {
    return lastFetchTime && Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
};

// Получить все склады
export const fetchWarehouses = createAsyncThunk(
    'warehouse/fetchWarehouses',
    async (forceRefresh = false, { rejectWithValue, getState }) => {
        try {
            const state = getState();

            if (!forceRefresh && isCacheValid(state.warehouse.lastFetchTime)) {
                return { data: state.warehouse.warehouses, fromCache: true };
            }

            const response = await WarehouseService.getWarehouses();

            let warehouses = [];
            
            // Проверяем структуру ответа от сервера
            if (response.data?.warehouses) {
                // Прямой формат: { warehouses: [...], pagination: {...} }
                warehouses = response.data.warehouses;
            } else if (response.data?.data?.warehouses) {
                // Вложенный формат: { status: 'success', data: { warehouses: [...] } }
                warehouses = response.data.data.warehouses;
            } else if (Array.isArray(response.data?.data)) {
                // Формат: { status: 'success', data: [...] }
                warehouses = response.data.data;
            } else if (Array.isArray(response.data)) {
                // Прямой массив: [...]
                warehouses = response.data;
            } else {
                warehouses = [];
            }
            return { data: warehouses, fromCache: false };
        } catch (error) {
            return rejectWithValue(error.message || 'Ошибка при загрузке складов');
        }
    }
);

// Получить склад по ID
export const fetchWarehouseById = createAsyncThunk(
    'warehouse/fetchWarehouseById',
    async (warehouseId, { rejectWithValue, getState }) => {
        try {
            const numericId = parseInt(warehouseId, 10);
            if (isNaN(numericId)) {
                return rejectWithValue('Некорректный ID склада');
            }

            const state = getState();
            const cachedWarehouse = state.warehouse.warehouses.find(w => w?.id === numericId);
            
            if (cachedWarehouse) {
                return { data: cachedWarehouse, fromCache: true };
            }

            const response = await WarehouseService.getWarehouseById(numericId);
            const warehouse = response.data.status === 'success' ? response.data.data : response.data;

            if (!warehouse?.id) {
                return rejectWithValue('Склад не найден');
            }

            return { data: warehouse, fromCache: false };
        } catch (error) {
            console.error(`Ошибка при загрузке склада ${warehouseId}:`, error);
            return rejectWithValue(error.message || 'Ошибка при загрузке склада');
        }
    }
);

// Получить склады по району
export const fetchWarehousesByDistrict = createAsyncThunk(
    'warehouse/fetchWarehousesByDistrict',
    async (districtId, { rejectWithValue }) => {
        try {
            const response = await WarehouseService.getWarehousesByDistrict(districtId);
            
            let warehouses = [];
            // Проверяем структуру ответа от сервера
            if (response.data?.warehouses) {
                warehouses = response.data.warehouses;
            } else if (response.data?.data?.warehouses) {
                warehouses = response.data.data.warehouses;
            } else if (Array.isArray(response.data?.data)) {
                warehouses = response.data.data;
            } else if (Array.isArray(response.data)) {
                warehouses = response.data;
            } else {
                warehouses = [];
            }

            return { districtId, warehouses };
        } catch (error) {
            console.error(`Ошибка при загрузке складов района ${districtId}:`, error);
            return rejectWithValue(error.message || 'Ошибка при загрузке складов района');
        }
    }
);

// Получить товары на складе
export const fetchWarehouseProducts = createAsyncThunk(
    'warehouse/fetchWarehouseProducts',
    async ({ warehouseId, params = {} }, { rejectWithValue }) => {
        try {
            const response = await WarehouseService.getWarehouseProducts(warehouseId, params);
            
            let products = [];
            if (response.data?.status === 'success') {
                products = response.data.data || [];
            } else if (Array.isArray(response.data)) {
                products = response.data;
            }

            return { warehouseId, products };
        } catch (error) {
            console.error(`Ошибка при загрузке товаров склада ${warehouseId}:`, error);
            return rejectWithValue(error.message || 'Ошибка при загрузке товаров склада');
        }
    }
);

// Получить остатки товара по всем складам
export const fetchProductStock = createAsyncThunk(
    'warehouse/fetchProductStock',
    async (productId, { rejectWithValue }) => {
        try {
            const response = await WarehouseService.getProductStock(productId);
            
            let stocks = [];
            if (response.data?.status === 'success') {
                stocks = response.data.data || [];
            } else if (response.data?.stocks) {
                // API возвращает данные в поле stocks
                stocks = response.data.stocks || [];
            } else if (Array.isArray(response.data)) {
                stocks = response.data;
            }
            return { productId, stocks };
        } catch (error) {
            console.error(`Ошибка при загрузке остатков товара ${productId}:`, error);
            return rejectWithValue(error.message || 'Ошибка при загрузке остатков товара');
        }
    }
);

// Поиск складов с товаром
export const findWarehousesWithProduct = createAsyncThunk(
    'warehouse/findWarehousesWithProduct',
    async ({ productId, params = {} }, { rejectWithValue }) => {
        try {
            const response = await WarehouseService.findWarehousesWithProduct(productId, params);
            
            let warehouses = [];
            if (response.data?.status === 'success') {
                warehouses = response.data.data || [];
            } else if (response.data?.warehouses) {
                warehouses = response.data.warehouses || [];
            } else if (Array.isArray(response.data)) {
                warehouses = response.data;
            }
            return { productId, warehouses };
        } catch (error) {
            console.error(`Ошибка при поиске складов с товаром ${productId}:`, error);
            return rejectWithValue(error.message || 'Ошибка при поиске складов с товаром');
        }
    }
);

const warehouseSlice = createSlice({
    name: 'warehouse',
    initialState,
    reducers: {
        clearWarehouses: (state) => {
            state.warehouses = [];
            state.lastFetchTime = null;
        },
        clearCurrentWarehouse: (state) => {
            state.currentWarehouse = null;
        },
        clearWarehouseProducts: (state, action) => {
            const warehouseId = action.payload;
            if (warehouseId) {
                delete state.warehouseProducts[warehouseId];
                delete state.warehouseProductsLoading[warehouseId];
                delete state.warehouseProductsError[warehouseId];
            } else {
                state.warehouseProducts = {};
                state.warehouseProductsLoading = {};
                state.warehouseProductsError = {};
            }
        },
        clearProductStocks: (state, action) => {
            const productId = action.payload;
            if (productId) {
                delete state.productStocks[productId];
                delete state.productStocksLoading[productId];
                delete state.productStocksError[productId];
            } else {
                state.productStocks = {};
                state.productStocksLoading = {};
                state.productStocksError = {};
            }
        }
    },
    extraReducers: (builder) => {
        builder
            // Загрузка всех складов
            .addCase(fetchWarehouses.pending, (state) => {
                state.warehousesLoading = true;
                state.warehousesError = null;
            })
            .addCase(fetchWarehouses.fulfilled, (state, action) => {
                state.warehousesLoading = false;
                if (!action.payload.fromCache) {
                    state.warehouses = action.payload.data;
                    state.lastFetchTime = Date.now();
                }
            })
            .addCase(fetchWarehouses.rejected, (state, action) => {
                state.warehousesLoading = false;
                state.warehousesError = action.payload;
            })

            // Загрузка склада по ID
            .addCase(fetchWarehouseById.pending, (state) => {
                state.currentWarehouseLoading = true;
                state.currentWarehouseError = null;
            })
            .addCase(fetchWarehouseById.fulfilled, (state, action) => {
                state.currentWarehouseLoading = false;
                const { data, fromCache } = action.payload;
                state.currentWarehouse = data;

                if (!fromCache) {
                    const index = state.warehouses.findIndex(w => w?.id === data.id);
                    if (index !== -1) {
                        state.warehouses[index] = data;
                    } else {
                        state.warehouses.push(data);
                    }
                }
            })
            .addCase(fetchWarehouseById.rejected, (state, action) => {
                state.currentWarehouseLoading = false;
                state.currentWarehouseError = action.payload;
            })

            // Загрузка складов по району
            .addCase(fetchWarehousesByDistrict.fulfilled, (state, action) => {
                const { districtId, warehouses } = action.payload;
                // Обновляем склады в общем списке
                warehouses.forEach(warehouse => {
                    const index = state.warehouses.findIndex(w => w?.id === warehouse.id);
                    if (index !== -1) {
                        state.warehouses[index] = warehouse;
                    } else {
                        state.warehouses.push(warehouse);
                    }
                });
            })

            // Загрузка товаров склада
            .addCase(fetchWarehouseProducts.pending, (state, action) => {
                const warehouseId = action.meta.arg.warehouseId;
                state.warehouseProductsLoading[warehouseId] = true;
                state.warehouseProductsError[warehouseId] = null;
            })
            .addCase(fetchWarehouseProducts.fulfilled, (state, action) => {
                const { warehouseId, products } = action.payload;
                state.warehouseProductsLoading[warehouseId] = false;
                state.warehouseProducts[warehouseId] = products;
            })
            .addCase(fetchWarehouseProducts.rejected, (state, action) => {
                const warehouseId = action.meta.arg.warehouseId;
                state.warehouseProductsLoading[warehouseId] = false;
                state.warehouseProductsError[warehouseId] = action.payload;
            })

            // Загрузка остатков товара
            .addCase(fetchProductStock.pending, (state, action) => {
                const productId = action.meta.arg;
                state.productStocksLoading[productId] = true;
                state.productStocksError[productId] = null;
            })
            .addCase(fetchProductStock.fulfilled, (state, action) => {
                const { productId, stocks } = action.payload;
                state.productStocksLoading[productId] = false;
                state.productStocks[productId] = stocks;
            })
            .addCase(fetchProductStock.rejected, (state, action) => {
                const productId = action.meta.arg;
                state.productStocksLoading[productId] = false;
                state.productStocksError[productId] = action.payload;
            })

            // Поиск складов с товаром
            .addCase(findWarehousesWithProduct.pending, (state, action) => {
                const productId = action.meta.arg.productId;
                state.warehousesWithProductLoading[productId] = true;
                state.warehousesWithProductError[productId] = null;
            })
            .addCase(findWarehousesWithProduct.fulfilled, (state, action) => {
                const { productId, warehouses } = action.payload;
                state.warehousesWithProductLoading[productId] = false;
                state.warehousesWithProduct[productId] = warehouses;
            })
            .addCase(findWarehousesWithProduct.rejected, (state, action) => {
                const productId = action.meta.arg.productId;
                state.warehousesWithProductLoading[productId] = false;
                state.warehousesWithProductError[productId] = action.payload;
            });
    }
});

export const {
    clearWarehouses,
    clearCurrentWarehouse,
    clearWarehouseProducts,
    clearProductStocks
} = warehouseSlice.actions;

export default warehouseSlice.reducer; 