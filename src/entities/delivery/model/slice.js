import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import DeliveryService from '../api/deliveryApi';

const extractData = (response) => {
    if (response?.status === 'success') {
        return response.data;
    }
    throw new Error(response?.message || 'Ошибка запроса доставки');
};

const extractErrorMessage = (error) =>
    error.response?.data?.message || error.message || 'Ошибка запроса доставки';

export const calculateDeliveryFee = createAsyncThunk(
    'delivery/calculateDeliveryFee',
    async ({ deliveryType = 'DELIVERY' } = {}, { rejectWithValue }) => {
        try {
            return await extractData(
                await DeliveryService.calculateDeliveryFee({ deliveryType })
            );
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error));
        }
    }
);

export const fetchActiveTariff = createAsyncThunk(
    'delivery/fetchActiveTariff',
    async (_, { rejectWithValue }) => {
        try {
            return await extractData(await DeliveryService.getActiveTariff());
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error));
        }
    }
);

export const fetchFreeDeliveryInfo = createAsyncThunk(
    'delivery/fetchFreeDeliveryInfo',
    async (_, { rejectWithValue }) => {
        try {
            return await extractData(await DeliveryService.getFreeDeliveryInfo());
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error));
        }
    }
);

const initialState = {
    selectedDeliveryType: 'DELIVERY',
    deliveryCost: null,
    lastCalculation: null,
    activeTariff: null,
    freeDeliveryInfo: null,
    calculating: false,
    tariffLoading: false,
    error: null
};

const deliverySlice = createSlice({
    name: 'delivery',
    initialState,
    reducers: {
        setDeliveryType: (state, action) => {
            state.selectedDeliveryType = action.payload;
            state.error = null;

            if (action.payload === 'PICKUP') {
                state.deliveryCost = 0;
            }
        },
        clearDeliveryCalculation: (state) => {
            state.lastCalculation = null;
            state.deliveryCost = state.selectedDeliveryType === 'PICKUP' ? 0 : null;
            state.error = null;
        },
        clearDeliveryError: (state) => {
            state.error = null;
        },
        resetDeliveryState: () => initialState
    },
    extraReducers: (builder) => {
        builder
            .addCase(calculateDeliveryFee.pending, (state) => {
                state.calculating = true;
                state.error = null;
            })
            .addCase(calculateDeliveryFee.fulfilled, (state, action) => {
                state.calculating = false;
                state.lastCalculation = action.payload;
                state.deliveryCost = action.payload?.deliveryCost ?? null;

                if (action.payload?.deliveryType) {
                    state.selectedDeliveryType = action.payload.deliveryType;
                }
                if (action.payload?.tariff) {
                    state.activeTariff = action.payload.tariff;
                }
            })
            .addCase(calculateDeliveryFee.rejected, (state, action) => {
                state.calculating = false;
                state.error = action.payload;
            })

            .addCase(fetchActiveTariff.pending, (state) => {
                state.tariffLoading = true;
            })
            .addCase(fetchActiveTariff.fulfilled, (state, action) => {
                state.tariffLoading = false;
                state.activeTariff = action.payload;
            })
            .addCase(fetchActiveTariff.rejected, (state, action) => {
                state.tariffLoading = false;
                state.error = action.payload;
            })

            .addCase(fetchFreeDeliveryInfo.fulfilled, (state, action) => {
                state.freeDeliveryInfo = action.payload;
            });
    }
});

export const {
    setDeliveryType,
    clearDeliveryCalculation,
    clearDeliveryError,
    resetDeliveryState
} = deliverySlice.actions;

export default deliverySlice.reducer;
