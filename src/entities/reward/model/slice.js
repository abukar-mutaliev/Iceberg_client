import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { rewardApi } from '../api/rewardApi';

// Async thunks
export const fetchRewardSettings = createAsyncThunk(
    'rewards/fetchRewardSettings',
    async (_, { rejectWithValue }) => {
        try {
            const response = await rewardApi.getRewardSettings();
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка загрузки настроек вознаграждений');
        }
    }
);

export const createRewardSetting = createAsyncThunk(
    'rewards/createRewardSetting',
    async (data, { rejectWithValue }) => {
        try {
            const response = await rewardApi.createRewardSetting(data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка создания настройки вознаграждения');
        }
    }
);

export const updateRewardSetting = createAsyncThunk(
    'rewards/updateRewardSetting',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await rewardApi.updateRewardSetting(id, data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка обновления настройки вознаграждения');
        }
    }
);

export const fetchEmployeeRewards = createAsyncThunk(
    'rewards/fetchEmployeeRewards',
    async ({ employeeId, params = {} }, { rejectWithValue }) => {
        try {
            const response = await rewardApi.getEmployeeRewards(employeeId, params);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка загрузки вознаграждений сотрудника');
        }
    }
);

export const fetchMyRewards = createAsyncThunk(
    'rewards/fetchMyRewards',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await rewardApi.getMyRewards(params);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка загрузки ваших вознаграждений');
        }
    }
);

export const fetchAllEmployeesStats = createAsyncThunk(
    'rewards/fetchAllEmployeesStats',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await rewardApi.getAllEmployeesStats(params);
            
            // Формируем правильную структуру результата
            const result = {
                data: response.data,
                totalStats: response.totalStats
            };
            
            return result;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка загрузки статистики сотрудников');
        }
    }
);

export const processReward = createAsyncThunk(
    'rewards/processReward',
    async ({ id, status, comment }, { rejectWithValue }) => {
        try {
            const response = await rewardApi.processReward(id, { status, comment });
            
            if (!response || !response.data) {
                throw new Error('Пустой ответ от сервера');
            }
            
            // Проверяем структуру ответа
            let rewardData;
            if (response.data.data) {
                rewardData = response.data.data;
            } else if (response.data.status === 'success' && response.data) {
                rewardData = response.data;
            } else {
                rewardData = response.data;
            }
            
            // Убеждаемся что возвращаем правильные данные
            const result = {
                id: parseInt(id),
                ...rewardData,
                // Ensure we have the basic fields
                amount: rewardData.amount,
                status: rewardData.status || status,
                description: rewardData.description,
                updatedAt: rewardData.updatedAt || new Date().toISOString(),
                // Сохраняем связанные данные если они есть
                employeeId: rewardData.employeeId,
                orderId: rewardData.orderId,
                rewardSettingsId: rewardData.rewardSettingsId,
                processedAt: rewardData.processedAt,
                processedBy: rewardData.processedBy,
                createdAt: rewardData.createdAt,
                // Сохраняем связанные объекты
                employee: rewardData.employee,
                order: rewardData.order,
                rewardSettings: rewardData.rewardSettings,
                processor: rewardData.processor
            };
            
            return result;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message || 'Ошибка обработки вознаграждения');
        }
    }
);

export const fetchAllPendingRewards = createAsyncThunk(
    'rewards/fetchAllPendingRewards',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await rewardApi.getAllPendingRewards(params);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка загрузки pending вознаграждений');
        }
    }
);

export const batchProcessRewards = createAsyncThunk(
    'rewards/batchProcessRewards',
    async ({ employeeId, data }, { rejectWithValue }) => {
        try {
            const response = await rewardApi.batchProcessRewards(employeeId, data);
            return {
                employeeId: parseInt(employeeId),
                ...response.data,
                dateFrom: data.dateFrom,
                dateTo: data.dateTo
            };
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Ошибка массовой обработки вознаграждений');
        }
    }
);

const initialState = {
    // Настройки вознаграждений
    settings: [],
    settingsLoading: false,
    settingsError: null,

    // Вознаграждения сотрудника
    employeeRewards: [],
    employeeRewardsLoading: false,
    employeeRewardsError: null,
    employeeStatistics: null,
    employeeRewardsPagination: {
        page: 1,
        pages: 1,
        total: 0
    },

    // Статистика всех сотрудников
    allEmployeesStats: [],
    allEmployeesStatsLoading: false,
    allEmployeesStatsError: null,
    allEmployeesStatsPagination: {
        page: 1,
        pages: 1,
        total: 0
    },
    totalStats: null,

    // Pending вознаграждения
    pendingRewards: [],
    pendingRewardsLoading: false,
    pendingRewardsError: null,
    pendingRewardsPagination: {
        page: 1,
        pages: 1,
        total: 0
    },

    // UI состояния
    processingReward: false,
    processingError: null
};

const rewardSlice = createSlice({
    name: 'rewards',
    initialState,
    reducers: {
        clearEmployeeRewards: (state) => {
            state.employeeRewards = [];
            state.employeeStatistics = null;
            state.employeeRewardsError = null;
            state.employeeRewardsPagination = initialState.employeeRewardsPagination;
        },
        clearAllEmployeesStats: (state) => {
            state.allEmployeesStats = [];
            state.allEmployeesStatsError = null;
            state.allEmployeesStatsPagination = initialState.allEmployeesStatsPagination;
            state.totalStats = null;
        },
        clearPendingRewards: (state) => {
            state.pendingRewards = [];
            state.pendingRewardsError = null;
            state.pendingRewardsPagination = initialState.pendingRewardsPagination;
        },
        clearErrors: (state) => {
            state.settingsError = null;
            state.employeeRewardsError = null;
            state.allEmployeesStatsError = null;
            state.processingError = null;
        }
    },
    extraReducers: (builder) => {
        // Fetch reward settings
        builder
            .addCase(fetchRewardSettings.pending, (state) => {
                state.settingsLoading = true;
                state.settingsError = null;
            })
            .addCase(fetchRewardSettings.fulfilled, (state, action) => {
                state.settingsLoading = false;
                state.settings = action.payload;
            })
            .addCase(fetchRewardSettings.rejected, (state, action) => {
                state.settingsLoading = false;
                state.settingsError = action.payload;
            });

        // Create reward setting
        builder
            .addCase(createRewardSetting.pending, (state) => {
                state.settingsLoading = true;
                state.settingsError = null;
            })
            .addCase(createRewardSetting.fulfilled, (state, action) => {
                state.settingsLoading = false;
                state.settings.unshift(action.payload);
            })
            .addCase(createRewardSetting.rejected, (state, action) => {
                state.settingsLoading = false;
                state.settingsError = action.payload;
            });

        // Update reward setting
        builder
            .addCase(updateRewardSetting.pending, (state) => {
                state.settingsLoading = true;
                state.settingsError = null;
            })
            .addCase(updateRewardSetting.fulfilled, (state, action) => {
                state.settingsLoading = false;
                const index = state.settings.findIndex(setting => setting.id === action.payload.id);
                if (index !== -1) {
                    state.settings[index] = action.payload;
                }
            })
            .addCase(updateRewardSetting.rejected, (state, action) => {
                state.settingsLoading = false;
                state.settingsError = action.payload;
            });

        // Fetch employee rewards
        builder
            .addCase(fetchEmployeeRewards.pending, (state) => {
                state.employeeRewardsLoading = true;
                state.employeeRewardsError = null;
                // Очищаем старые данные при начале загрузки
                state.employeeRewards = [];
                state.employeeStatistics = null;
            })
            .addCase(fetchEmployeeRewards.fulfilled, (state, action) => {
                state.employeeRewardsLoading = false;
                
                if (!action.payload) {
                    state.employeeRewardsError = 'Получены некорректные данные от сервера';
                    return;
                }
                
                const { rewards, statistics, page, pages, total } = action.payload;
                
                if (page === 1) {
                    state.employeeRewards = rewards || [];
                } else {
                    state.employeeRewards.push(...(rewards || []));
                }
                
                state.employeeStatistics = statistics;
                state.employeeRewardsPagination = { 
                    page: page || 1, 
                    pages: pages || 1, 
                    total: total || 0,
                    currentPage: page || 1,
                    hasNextPage: page < pages
                };
            })
            .addCase(fetchEmployeeRewards.rejected, (state, action) => {
                state.employeeRewardsLoading = false;
                state.employeeRewardsError = action.payload;
            });

        // Fetch my rewards (for employees)
        builder
            .addCase(fetchMyRewards.pending, (state) => {
                state.employeeRewardsLoading = true;
                state.employeeRewardsError = null;
                // Очищаем старые данные при начале загрузки
                state.employeeRewards = [];
                state.employeeStatistics = null;
            })
            .addCase(fetchMyRewards.fulfilled, (state, action) => {
                state.employeeRewardsLoading = false;
                
                if (!action.payload) {
                    state.employeeRewardsError = 'Получены некорректные данные от сервера';
                    return;
                }
                
                const { rewards, statistics, page, pages, total } = action.payload;
                
                if (page === 1) {
                    state.employeeRewards = rewards || [];
                } else {
                    state.employeeRewards.push(...(rewards || []));
                }
                
                state.employeeStatistics = statistics;
                state.employeeRewardsPagination = { 
                    page: page || 1, 
                    pages: pages || 1, 
                    total: total || 0,
                    currentPage: page || 1,
                    hasNextPage: page < pages
                };
            })
            .addCase(fetchMyRewards.rejected, (state, action) => {
                state.employeeRewardsLoading = false;
                state.employeeRewardsError = action.payload;
            });

        // Fetch all employees stats
        builder
            .addCase(fetchAllEmployeesStats.pending, (state) => {
                state.allEmployeesStatsLoading = true;
                state.allEmployeesStatsError = null;
                // Очищаем старые данные при начале загрузки
                state.allEmployeesStats = [];
                state.totalStats = null;
            })
            .addCase(fetchAllEmployeesStats.fulfilled, (state, action) => {
                state.allEmployeesStatsLoading = false;
                
                if (!action.payload) {
                    console.error('❌ fetchAllEmployeesStats.fulfilled - payload is undefined or null');
                    state.allEmployeesStatsError = 'Получены некорректные данные от сервера';
                    return;
                }
                
                // Проверяем структуру payload
                if (Array.isArray(action.payload)) {
                    // Если payload - это массив, значит это новая структура от сервера
                    state.allEmployeesStats = action.payload;
                    state.totalStats = null; // totalStats будет в отдельном поле response
                } else if (action.payload.data && Array.isArray(action.payload.data)) {
                    // Если payload содержит data и totalStats
                    state.allEmployeesStats = action.payload.data;
                    state.totalStats = action.payload.totalStats || null;
                } else {
                    // Fallback для старой структуры
                    const employees = Array.isArray(action.payload.data) ? action.payload.data : action.payload;
                    const totalStats = action.payload.totalStats || null;
                    
                    state.allEmployeesStats = employees || [];
                    state.totalStats = totalStats;
                }
            })
            .addCase(fetchAllEmployeesStats.rejected, (state, action) => {
                state.allEmployeesStatsLoading = false;
                state.allEmployeesStatsError = action.payload;
            });

        // Process reward
        builder
            .addCase(processReward.pending, (state) => {
                state.processingReward = true;
                state.processingError = null;
            })
            .addCase(processReward.fulfilled, (state, action) => {
                state.processingReward = false;
                
                
                // Находим индекс и сохраняем старое вознаграждение
                const rewardIndex = state.employeeRewards.findIndex(r => r.id === action.payload.id);
                let oldReward = null;
                let statusChanged = false;
                
                if (rewardIndex !== -1) {
                    oldReward = state.employeeRewards[rewardIndex];
                    statusChanged = oldReward.status !== action.payload.status;
                    
                    
                    // Безопасное обновление вознаграждения в списке
                    state.employeeRewards[rewardIndex] = {
                        ...oldReward,
                        ...action.payload,
                        // Гарантированно сохраняем критически важные поля
                        id: action.payload.id ?? oldReward.id,
                        amount: action.payload.amount ?? oldReward.amount,
                        description: action.payload.description ?? oldReward.description,
                        employeeId: action.payload.employeeId ?? oldReward.employeeId,
                        orderId: action.payload.orderId ?? oldReward.orderId,
                        rewardSettingsId: action.payload.rewardSettingsId ?? oldReward.rewardSettingsId,
                        createdAt: action.payload.createdAt ?? oldReward.createdAt,
                        
                        // Обновляем статус и связанные поля из ответа
                        status: action.payload.status,
                        processedAt: action.payload.processedAt,
                        processedBy: action.payload.processedBy,
                        updatedAt: action.payload.updatedAt,
                        
                        // Сохраняем связанные объекты (приоритет новым данным)
                        employee: action.payload.employee ?? oldReward.employee,
                        order: action.payload.order ?? oldReward.order,
                        rewardSettings: action.payload.rewardSettings ?? oldReward.rewardSettings,
                        processor: action.payload.processor ?? oldReward.processor
                    };
                    
                }
                
                // Обновляем статистику если статус изменился
                if (statusChanged && state.employeeStatistics) {
                    
                    // Простое обнуление статистики для пересчета
                    // В реальном приложении лучше пересчитать локально
                    state.employeeStatistics = null;
                }

                // Обновляем pendingRewards если вознаграждение было обработано
                const pendingRewardIndex = state.pendingRewards.findIndex(r => r.id === action.payload.id);
                if (pendingRewardIndex !== -1) {
                    if (action.payload.status === 'PENDING') {
                        // Если статус остался PENDING, обновляем данные
                        state.pendingRewards[pendingRewardIndex] = {
                            ...state.pendingRewards[pendingRewardIndex],
                            ...action.payload,
                            // Сохраняем связанные объекты
                            employee: action.payload.employee ?? state.pendingRewards[pendingRewardIndex].employee,
                            order: action.payload.order ?? state.pendingRewards[pendingRewardIndex].order,
                            rewardSettings: action.payload.rewardSettings ?? state.pendingRewards[pendingRewardIndex].rewardSettings,
                            processor: action.payload.processor ?? state.pendingRewards[pendingRewardIndex].processor
                        };
                    } else {
                        // Если статус изменился с PENDING на другой, удаляем из pending списка
                        state.pendingRewards.splice(pendingRewardIndex, 1);
                        
                        // Обновляем пагинацию
                        state.pendingRewardsPagination.total = Math.max(0, state.pendingRewardsPagination.total - 1);
                        
                        console.log('✅ Вознаграждение удалено из pending списка');
                    }
                }

                // Обновляем totalStats если есть и статус изменился с PENDING
                if (statusChanged && state.totalStats && oldReward?.status === 'PENDING') {                    
                    const amount = action.payload.amount || oldReward.amount || 0;
                    
                    // Уменьшаем pendingAmount
                    state.totalStats.pendingAmount = Math.max(0, (state.totalStats.pendingAmount || 0) - amount);
                    
                    // Увеличиваем соответствующую сумму в зависимости от нового статуса
                    switch (action.payload.status) {
                        case 'APPROVED':
                            state.totalStats.approvedAmount = (state.totalStats.approvedAmount || 0) + amount;
                            break;
                        case 'PAID':
                            state.totalStats.paidAmount = (state.totalStats.paidAmount || 0) + amount;
                            break;
                        case 'CANCELLED':
                            state.totalStats.cancelledAmount = (state.totalStats.cancelledAmount || 0) + amount;
                            break;
                    }
                    
                    console.log('✅ TotalStats обновлено:', state.totalStats);
                }
            })
            .addCase(processReward.rejected, (state, action) => {
                state.processingReward = false;
                state.processingError = action.payload;
                console.error('❌ processReward.rejected:', action.payload);
            });

        // Fetch all pending rewards
        builder
            .addCase(fetchAllPendingRewards.pending, (state) => {
                state.pendingRewardsLoading = true;
                state.pendingRewardsError = null;
                state.pendingRewards = [];
            })
            .addCase(fetchAllPendingRewards.fulfilled, (state, action) => {
                state.pendingRewardsLoading = false;
            
                if (!action.payload) {
                    console.error('❌ fetchAllPendingRewards.fulfilled - payload отсутствует');
                    state.pendingRewardsError = 'Получены некорректные данные от сервера';
                    return;
                }
                
                const { allRewards, total, page, pages } = action.payload;
                
                if (page === 1) {
                    state.pendingRewards = allRewards || [];
                } else {
                    state.pendingRewards.push(...(allRewards || []));
                }
                
                state.pendingRewardsPagination = { 
                    page: page || 1, 
                    pages: pages || 1, 
                    total: total || 0
                };
            })
            .addCase(fetchAllPendingRewards.rejected, (state, action) => {
                state.pendingRewardsLoading = false;
                state.pendingRewardsError = action.payload;
            });

        // Batch process rewards
        builder
            .addCase(batchProcessRewards.pending, (state) => {
                state.processingReward = true;
                state.processingError = null;
            })
            .addCase(batchProcessRewards.fulfilled, (state, action) => {
                state.processingReward = false;
                
                
                // Обновляем статус всех вознаграждений сотрудника со статусами PENDING/APPROVED на новый статус
                const { employeeId, newStatus, dateFrom, dateTo } = action.payload;
                
                // Обновляем employeeRewards
                state.employeeRewards = state.employeeRewards.map(reward => {
                    // Проверяем что это вознаграждение подходит для обработки
                    const matchesEmployee = reward.employeeId === employeeId || reward.employee?.id === employeeId;
                    const matchesStatus = reward.status === 'PENDING' || reward.status === 'APPROVED';
                    
                    // Проверяем фильтр по датам если он был применен
                    let matchesDateFilter = true;
                    if (dateFrom || dateTo) {
                        const rewardDate = new Date(reward.createdAt);
                        if (dateFrom && rewardDate < new Date(dateFrom)) matchesDateFilter = false;
                        if (dateTo && rewardDate > new Date(dateTo)) matchesDateFilter = false;
                    }
                    
                    if (matchesEmployee && matchesStatus && matchesDateFilter) {
                        return {
                            ...reward,
                            status: newStatus,
                            processedAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };
                    }
                    return reward;
                });
                
                // Очищаем employeeStatistics для принудительной перезагрузки
                state.employeeStatistics = null;
                
                // Удаляем обработанные вознаграждения из pendingRewards
                state.pendingRewards = state.pendingRewards.filter(reward => {
                    const matchesEmployee = reward.employeeId === employeeId || reward.employee?.id === employeeId;
                    const matchesStatus = reward.status === 'PENDING' || reward.status === 'APPROVED';
                    
                    let matchesDateFilter = true;
                    if (dateFrom || dateTo) {
                        const rewardDate = new Date(reward.createdAt);
                        if (dateFrom && rewardDate < new Date(dateFrom)) matchesDateFilter = false;
                        if (dateTo && rewardDate > new Date(dateTo)) matchesDateFilter = false;
                    }
                    
                    // Оставляем только те, которые НЕ были обработаны
                    return !(matchesEmployee && matchesStatus && matchesDateFilter);
                });
                
            })
            .addCase(batchProcessRewards.rejected, (state, action) => {
                state.processingReward = false;
                state.processingError = action.payload;
                console.error('❌ batchProcessRewards.rejected:', action.payload);
            });
    }
});

export const { clearEmployeeRewards, clearAllEmployeesStats, clearPendingRewards, clearErrors } = rewardSlice.actions;

export default rewardSlice.reducer; 