import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import DeliveryService from '../api/deliveryApi';

const initialState = {
    // Текущий расчет доставки
    currentDeliveryFee: null,
    deliveryDistance: null,
    isFreeDelivery: false,
    deliveryCost: 0,
    warehouseName: null,
    deliveryAddress: null,
    
    // Тип доставки
    selectedDeliveryType: 'DELIVERY', // 'DELIVERY' или 'PICKUP'
    
    // Активный тариф
    activeTariff: null,
    
    // Информация о бесплатной доставке
    freeDeliveryInfo: null,
    
    // Расчеты для нескольких складов
    multipleDeliveryOptions: [],
    
    // Состояния загрузки
    loading: false,
    calculating: false,
    tariffLoading: false,
    
    // Ошибки
    error: null,
    
    // Кеш
    lastCalculation: null,
    lastCalculationTime: null,
};

// ===== ASYNC THUNKS =====

/**
 * Расчет стоимости доставки
 */
export const calculateDeliveryFee = createAsyncThunk(
    'delivery/calculateDeliveryFee',
    async ({ warehouseId, deliveryAddressId, orderAmount }, { rejectWithValue }) => {
        try {
            const response = await DeliveryService.calculateDeliveryFee(
                warehouseId,
                deliveryAddressId,
                orderAmount
            );

            if (response.status === 'success') {
                return {
                    ...response.data,
                    calculatedAt: Date.now()
                };
            } else {
                throw new Error(response.message || 'Ошибка при расчете доставки');
            }
        } catch (error) {
            console.error('Ошибка при расчете доставки:', error);
            return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка при расчете доставки');
        }
    }
);

/**
 * Расчет стоимости доставки для нескольких складов
 */
export const calculateMultipleDeliveryFees = createAsyncThunk(
    'delivery/calculateMultipleDeliveryFees',
    async ({ warehouseIds, deliveryAddressId, orderAmount }, { rejectWithValue }) => {
        try {
            const response = await DeliveryService.calculateMultipleDeliveryFees(
                warehouseIds,
                deliveryAddressId,
                orderAmount
            );

            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Ошибка при расчете доставки');
            }
        } catch (error) {
            console.error('Ошибка при расчете доставки для нескольких складов:', error);
            return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка при расчете доставки');
        }
    }
);

/**
 * Получение информации о бесплатной доставке
 */
export const fetchFreeDeliveryInfo = createAsyncThunk(
    'delivery/fetchFreeDeliveryInfo',
    async ({ distance, orderAmount }, { rejectWithValue }) => {
        try {
            const response = await DeliveryService.getFreeDeliveryInfo(distance, orderAmount);

            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Ошибка при загрузке информации о бесплатной доставке');
            }
        } catch (error) {
            console.error('Ошибка при загрузке информации о бесплатной доставке:', error);
            return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка при загрузке информации о бесплатной доставке');
        }
    }
);

/**
 * Получение активного тарифа
 */
export const fetchActiveTariff = createAsyncThunk(
    'delivery/fetchActiveTariff',
    async (_, { rejectWithValue }) => {
        try {
            const response = await DeliveryService.getActiveTariff();

            if (response.status === 'success') {
                return response.data;
            } else {
                throw new Error(response.message || 'Ошибка при загрузке тарифа');
            }
        } catch (error) {
            console.error('Ошибка при загрузке тарифа:', error);
            return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка при загрузке тарифа');
        }
    }
);

// ===== SLICE =====

const deliverySlice = createSlice({
    name: 'delivery',
    initialState,
    reducers: {
        /**
         * Установить тип доставки
         */
        setDeliveryType: (state, action) => {
            state.selectedDeliveryType = action.payload;
            
            // Если выбран самовывоз, сбрасываем стоимость доставки
            if (action.payload === 'PICKUP') {
                state.currentDeliveryFee = 0;
                state.deliveryCost = 0;
                state.isFreeDelivery = false;
            }
        },

        /**
         * Очистить текущий расчет доставки
         */
        clearDeliveryCalculation: (state) => {
            state.currentDeliveryFee = null;
            state.deliveryDistance = null;
            state.isFreeDelivery = false;
            state.deliveryCost = 0;
            state.warehouseName = null;
            state.deliveryAddress = null;
            state.lastCalculation = null;
            state.lastCalculationTime = null;
            state.error = null;
        },

        /**
         * Очистить ошибку
         */
        clearDeliveryError: (state) => {
            state.error = null;
        },

        /**
         * Сбросить состояние доставки
         */
        resetDeliveryState: (state) => {
            return initialState;
        },
    },
    extraReducers: (builder) => {
        builder
            // ===== РАСЧЕТ ДОСТАВКИ =====
            .addCase(calculateDeliveryFee.pending, (state) => {
                state.calculating = true;
                state.error = null;
            })
            .addCase(calculateDeliveryFee.fulfilled, (state, action) => {
                state.calculating = false;
                state.currentDeliveryFee = action.payload;
                state.deliveryDistance = action.payload.distance;
                state.isFreeDelivery = action.payload.isFreeDelivery;
                state.deliveryCost = action.payload.deliveryCost;
                state.warehouseName = action.payload.warehouseName;
                state.deliveryAddress = action.payload.deliveryAddress;
                state.lastCalculation = action.payload;
                state.lastCalculationTime = action.payload.calculatedAt;
            })
            .addCase(calculateDeliveryFee.rejected, (state, action) => {
                state.calculating = false;
                state.error = action.payload;
            })

            // ===== РАСЧЕТ ДЛЯ НЕСКОЛЬКИХ СКЛАДОВ =====
            .addCase(calculateMultipleDeliveryFees.pending, (state) => {
                state.calculating = true;
                state.error = null;
            })
            .addCase(calculateMultipleDeliveryFees.fulfilled, (state, action) => {
                state.calculating = false;
                state.multipleDeliveryOptions = action.payload;
            })
            .addCase(calculateMultipleDeliveryFees.rejected, (state, action) => {
                state.calculating = false;
                state.error = action.payload;
            })

            // ===== ИНФОРМАЦИЯ О БЕСПЛАТНОЙ ДОСТАВКЕ =====
            .addCase(fetchFreeDeliveryInfo.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchFreeDeliveryInfo.fulfilled, (state, action) => {
                state.loading = false;
                state.freeDeliveryInfo = action.payload;
            })
            .addCase(fetchFreeDeliveryInfo.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // ===== ПОЛУЧЕНИЕ ТАРИФА =====
            .addCase(fetchActiveTariff.pending, (state) => {
                state.tariffLoading = true;
                state.error = null;
            })
            .addCase(fetchActiveTariff.fulfilled, (state, action) => {
                state.tariffLoading = false;
                state.activeTariff = action.payload;
            })
            .addCase(fetchActiveTariff.rejected, (state, action) => {
                state.tariffLoading = false;
                state.error = action.payload;
            });
    },
});

export const {
    setDeliveryType,
    clearDeliveryCalculation,
    clearDeliveryError,
    resetDeliveryState,
} = deliverySlice.actions;

export default deliverySlice.reducer;

