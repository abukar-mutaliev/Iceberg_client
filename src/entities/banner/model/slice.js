import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {bannerApi} from "@entities/banner/api/bannerApi";

export const fetchBanners = createAsyncThunk(
    'banner/fetchBanners',
    async (params = {}, { rejectWithValue, getState }) => {
        try {
            const state = getState();
            const { refresh = false } = params;
            
            // Проверяем кэш если не принудительное обновление
            if (!refresh && isCacheValid(state.banner.lastFetchTime) && state.banner.banners && state.banner.banners.length > 0) {
                return { 
                    data: state.banner.banners, 
                    fromCache: true 
                };
            }

            const response = await bannerApi.getBanners(params);
            return { data: response.data, fromCache: false };
        } catch (error) {
            return rejectWithValue(error.response?.data || { message: error.message });
        }
    }
);

export const fetchBannerById = createAsyncThunk(
    'banner/fetchBannerById',
    async (id, { rejectWithValue }) => {
        try {
            const response = await bannerApi.getBannerById(id);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || { message: error.message });
        }
    }
);

export const createBanner = createAsyncThunk(
    'banner/createBanner',
    async (bannerData, { rejectWithValue }) => {
        try {
            const response = await bannerApi.createBanner(bannerData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || { message: error.message });
        }
    }
);

export const updateBanner = createAsyncThunk(
    'banner/updateBanner',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await bannerApi.updateBanner(id, data);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || { message: error.message });
        }
    }
);

export const deleteBanner = createAsyncThunk(
    'banner/deleteBanner',
    async (id, { rejectWithValue }) => {
        try {
            const response = await bannerApi.deleteBanner(id);
            return { id, response: response };
        } catch (error) {
            return rejectWithValue(error.response?.data || { message: error.message });
        }
    }
);

const initialState = {
    banners: [],
    mainBanners: [],
    supplierBanners: [],
    currentBanner: null,
    status: 'idle',
    error: null,
    lastFetchTime: null
};

const CACHE_EXPIRY_TIME = 10 * 60 * 1000; // 10 минут

const isCacheValid = (lastFetchTime) => {
    return lastFetchTime && Date.now() - lastFetchTime < CACHE_EXPIRY_TIME;
};

const bannerSlice = createSlice({
    name: 'banner',
    initialState,
    reducers: {
        setCurrentBanner: (state, action) => {
            state.currentBanner = action.payload;
        },
        clearCurrentBanner: (state) => {
            state.currentBanner = null;
        },
        setBanners: (state, action) => {
            state.banners = action.payload;
            state.mainBanners = action.payload.filter(banner => banner.bannerType === 'MAIN');
            state.supplierBanners = action.payload.filter(banner => banner.bannerType === 'SUPPLIER');
            state.status = 'succeeded';
            state.lastFetchTime = Date.now();
        },
        resetBannerState: () => initialState
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchBanners.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchBanners.fulfilled, (state, action) => {
                state.status = 'succeeded';
                
                if (!action.payload.fromCache) {
                    state.banners = action.payload.data;
                    state.mainBanners = action.payload.data.filter(banner => banner.bannerType === 'MAIN');
                    state.supplierBanners = action.payload.data.filter(banner => banner.bannerType === 'SUPPLIER');
                    state.lastFetchTime = Date.now();
                }
                
                state.error = null;
            })
            .addCase(fetchBanners.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload?.message || 'Не удалось загрузить баннеры';
            })

            .addCase(fetchBannerById.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchBannerById.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.currentBanner = action.payload;
                state.error = null;
            })
            .addCase(fetchBannerById.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload?.message || 'Не удалось загрузить баннер';
            })

            .addCase(createBanner.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(createBanner.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.banners.push(action.payload);
                if (action.payload.bannerType === 'MAIN') {
                    state.mainBanners.push(action.payload);
                } else if (action.payload.bannerType === 'SUPPLIER') {
                    state.supplierBanners.push(action.payload);
                }
                state.error = null;
            })
            .addCase(createBanner.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload?.message || 'Не удалось создать баннер';
            })

            .addCase(updateBanner.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(updateBanner.fulfilled, (state, action) => {
                state.status = 'succeeded';

                const index = state.banners.findIndex(banner => banner.id === action.payload.id);
                if (index !== -1) {
                    state.banners[index] = action.payload;
                }

                if (action.payload.bannerType === 'MAIN') {
                    const mainIndex = state.mainBanners.findIndex(banner => banner.id === action.payload.id);
                    if (mainIndex !== -1) {
                        state.mainBanners[mainIndex] = action.payload;
                    } else {
                        state.mainBanners.push(action.payload);
                        state.supplierBanners = state.supplierBanners.filter(banner => banner.id !== action.payload.id);
                    }
                } else if (action.payload.bannerType === 'SUPPLIER') {
                    const supplierIndex = state.supplierBanners.findIndex(banner => banner.id === action.payload.id);
                    if (supplierIndex !== -1) {
                        state.supplierBanners[supplierIndex] = action.payload;
                    } else {
                        state.supplierBanners.push(action.payload);
                        state.mainBanners = state.mainBanners.filter(banner => banner.id !== action.payload.id);
                    }
                }

                if (state.currentBanner && state.currentBanner.id === action.payload.id) {
                    state.currentBanner = action.payload;
                }

                state.error = null;
            })
            .addCase(updateBanner.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload?.message || 'Не удалось обновить баннер';
            })

            .addCase(deleteBanner.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(deleteBanner.fulfilled, (state, action) => {
                state.status = 'succeeded';

                state.banners = state.banners.filter(banner => banner.id !== action.payload.id);
                state.mainBanners = state.mainBanners.filter(banner => banner.id !== action.payload.id);
                state.supplierBanners = state.supplierBanners.filter(banner => banner.id !== action.payload.id);

                if (state.currentBanner && state.currentBanner.id === action.payload.id) {
                    state.currentBanner = null;
                }

                state.error = null;
            })
            .addCase(deleteBanner.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload?.message || 'Не удалось удалить баннер';
            });
    }
});

export const { setCurrentBanner, clearCurrentBanner, setBanners, resetBannerState } = bannerSlice.actions;

export const bannerReducer = bannerSlice.reducer;
export default bannerReducer;