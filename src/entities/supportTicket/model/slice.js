import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Platform } from 'react-native';
import SupportTicketApi from '../api/supportTicketApi';

const initialState = {
    tickets: [],
    currentTicket: null,
    loading: false,
    submitting: false,
    uploading: false,
    error: null,
    pagination: {
        page: 1,
        totalPages: 1,
        hasMore: true,
        total: 0
    }
};

/**
 * Получить свои обращения
 */
export const fetchMySupportTickets = createAsyncThunk(
    'supportTicket/fetchMySupportTickets',
    async (params = {}, { rejectWithValue }) => {
        try {
            const { page = 1, limit = 10, status } = params;
            const response = await SupportTicketApi.getMyTickets({ page, limit, status });
            
            if (response?.status === 'success') {
                return {
                    tickets: response.data.tickets,
                    pagination: response.data.pagination
                };
            }
            
            throw new Error(response?.message || 'Не удалось загрузить обращения');
        } catch (error) {
            console.error('Ошибка при загрузке обращений:', error);
            
            const errorMessage = error.response?.data?.message || 
                                error.message || 
                                'Не удалось загрузить обращения';
            
            return rejectWithValue(errorMessage);
        }
    }
);

/**
 * Получить обращение по ID
 */
export const fetchSupportTicketById = createAsyncThunk(
    'supportTicket/fetchSupportTicketById',
    async (id, { rejectWithValue }) => {
        try {
            const response = await SupportTicketApi.getTicketById(id);
            
            if (response?.status === 'success') {
                return response.data;
            }
            
            throw new Error(response?.message || 'Не удалось загрузить обращение');
        } catch (error) {
            console.error('Ошибка при загрузке обращения:', error);
            
            const errorMessage = error.response?.data?.message || 
                                error.message || 
                                'Не удалось загрузить обращение';
            
            return rejectWithValue(errorMessage);
        }
    }
);

/**
 * Создать обращение
 */
export const createSupportTicket = createAsyncThunk(
    'supportTicket/createSupportTicket',
    async (ticketData, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('subject', ticketData.subject);
            formData.append('message', ticketData.message);
            
            // Добавляем файлы
            if (ticketData.attachments && ticketData.attachments.length > 0) {
                ticketData.attachments.forEach((file, index) => {
                    // Правильная обработка URI для Android
                    const uri = Platform.OS === 'android' 
                        ? (file.uri?.startsWith('file://') ? file.uri : `file://${file.uri}`)
                        : file.uri;
                    
                    formData.append('attachments', {
                        uri: uri,
                        type: file.type || 'image/jpeg',
                        name: file.name || `attachment_${index}.jpg`
                    });
                });
            }

            const response = await SupportTicketApi.createTicket(formData);
            
            if (response?.status === 'success') {
                return response.data;
            }
            
            throw new Error(response?.message || 'Не удалось создать обращение');
        } catch (error) {
            console.error('Ошибка при создании обращения:', error);
            
            const errorMessage = error.response?.data?.message || 
                                error.message || 
                                'Не удалось создать обращение';
            
            return rejectWithValue(errorMessage);
        }
    }
);

/**
 * Обновить обращение (только для админов)
 */
export const updateSupportTicket = createAsyncThunk(
    'supportTicket/updateSupportTicket',
    async ({ id, ...data }, { rejectWithValue }) => {
        try {
            const response = await SupportTicketApi.updateTicket(id, data);
            
            if (response?.status === 'success') {
                return response.data;
            }
            
            throw new Error(response?.message || 'Не удалось обновить обращение');
        } catch (error) {
            console.error('Ошибка при обновлении обращения:', error);
            
            const errorMessage = error.response?.data?.message || 
                                error.message || 
                                'Не удалось обновить обращение';
            
            return rejectWithValue(errorMessage);
        }
    }
);

const supportTicketSlice = createSlice({
    name: 'supportTicket',
    initialState,
    reducers: {
        clearTickets: (state) => {
            state.tickets = [];
            state.pagination = initialState.pagination;
        },
        setCurrentTicket: (state, action) => {
            state.currentTicket = action.payload;
        },
        clearCurrentTicket: (state) => {
            state.currentTicket = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // fetchMySupportTickets
        builder
            .addCase(fetchMySupportTickets.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMySupportTickets.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload.pagination.page === 1) {
                    state.tickets = action.payload.tickets;
                } else {
                    state.tickets = [...state.tickets, ...action.payload.tickets];
                }
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchMySupportTickets.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // fetchSupportTicketById
        builder
            .addCase(fetchSupportTicketById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSupportTicketById.fulfilled, (state, action) => {
                state.loading = false;
                state.currentTicket = action.payload;
            })
            .addCase(fetchSupportTicketById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // createSupportTicket
        builder
            .addCase(createSupportTicket.pending, (state) => {
                state.submitting = true;
                state.error = null;
            })
            .addCase(createSupportTicket.fulfilled, (state, action) => {
                state.submitting = false;
                state.tickets = [action.payload, ...state.tickets];
                state.currentTicket = action.payload;
            })
            .addCase(createSupportTicket.rejected, (state, action) => {
                state.submitting = false;
                state.error = action.payload;
            });

        // updateSupportTicket
        builder
            .addCase(updateSupportTicket.pending, (state) => {
                state.submitting = true;
                state.error = null;
            })
            .addCase(updateSupportTicket.fulfilled, (state, action) => {
                state.submitting = false;
                state.currentTicket = action.payload;
                // Обновляем в списке
                const index = state.tickets.findIndex(t => t.id === action.payload.id);
                if (index !== -1) {
                    state.tickets[index] = action.payload;
                }
            })
            .addCase(updateSupportTicket.rejected, (state, action) => {
                state.submitting = false;
                state.error = action.payload;
            });
    },
});

export const { clearTickets, setCurrentTicket, clearCurrentTicket, clearError } = supportTicketSlice.actions;
export const supportTicketSliceReducer = supportTicketSlice.reducer;
export { supportTicketSlice };

