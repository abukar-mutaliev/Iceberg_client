import { createSlice } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = 'app_search_history';

const initialState = {
    items: [],
    isLoading: false,
    error: null,
};

const searchHistorySlice = createSlice({
    name: 'searchHistory',
    initialState,
    reducers: {
        setSearchHistory: (state, action) => {
            state.items = action.payload;
        },
        addSearchQuery: (state, action) => {
            if (!Array.isArray(state.items)) {
                state.items = [];
            }
            
            if (!state.items.includes(action.payload)) {
                state.items = [action.payload, ...state.items.filter(item => item !== action.payload)].slice(0, 10);
                AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(state.items)).catch(error => {
                    console.error('Ошибка сохранения истории поиска:', error);
                });
            }
        },
        removeSearchQuery: (state, action) => {
            state.items = state.items.filter(item => item !== action.payload);
            AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(state.items)).catch(error => {
                console.error('Ошибка сохранения истории поиска:', error);
            });
        },
        clearSearchHistory: (state) => {
            state.items = [];
            AsyncStorage.removeItem(SEARCH_HISTORY_KEY).catch(error => {
                console.error('Ошибка удаления истории поиска:', error);
            });
        },
        loadSearchHistoryStart: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        loadSearchHistorySuccess: (state, action) => {
            state.items = action.payload;
            state.isLoading = false;
        },
        loadSearchHistoryFailure: (state, action) => {
            state.error = action.payload;
            state.isLoading = false;
        },
    },
});

export const {
    setSearchHistory,
    addSearchQuery,
    removeSearchQuery,
    clearSearchHistory,
    loadSearchHistoryStart,
    loadSearchHistorySuccess,
    loadSearchHistoryFailure,
} = searchHistorySlice.actions;

export const loadSearchHistory = () => async (dispatch) => {
    dispatch(loadSearchHistoryStart());
    try {
        const jsonValue = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
        const history = jsonValue != null ? JSON.parse(jsonValue) : [];
        dispatch(loadSearchHistorySuccess(history));
    } catch (error) {
        dispatch(loadSearchHistoryFailure(error.message));
        console.error('Ошибка загрузки истории поиска:', error);
    }
};

// Reducer
export default searchHistorySlice.reducer;