import { createSlice } from '@reduxjs/toolkit';

// Начальное состояние фильтра
const initialState = {
    criteria: {
        minPrice: 45,
        maxPrice: 1800,
        categories: [],
        brands: [],
        minRating: 4.5,
        compositions: [],
        quantity: [],
        suppliers: [],
    },
    isActive: false
};

const filterSlice = createSlice({
    name: 'filter',
    initialState,
    reducers: {
        setFilterCriteria: (state, action) => {
            // Получаем новое значение критериев
            const newCriteria = action.payload;

            // Обновляем критерии
            state.criteria = {
                ...state.criteria,
                ...newCriteria
            };

            // Проверяем, есть ли активные фильтры
            state.isActive = (
                (state.criteria.minPrice > 45) ||
                (state.criteria.maxPrice < 1800) ||
                (Array.isArray(state.criteria.categories) && state.criteria.categories.length > 0) ||
                (Array.isArray(state.criteria.brands) && state.criteria.brands.length > 0) ||
                (state.criteria.minRating !== 4.5) ||
                (Array.isArray(state.criteria.compositions) && state.criteria.compositions.length > 0) ||
                (Array.isArray(state.criteria.quantity) && state.criteria.quantity.length > 0) ||
                (Array.isArray(state.criteria.suppliers) && state.criteria.suppliers.length > 0)
            );

            console.log('REDUX: Фильтры обновлены:', JSON.stringify(state.criteria));
            console.log('REDUX: Фильтры активны:', state.isActive);
        },

        clearFilterCriteria: (state) => {
            state.criteria = initialState.criteria;
            state.isActive = false;
            console.log('REDUX: Фильтры сброшены');
        },

        resetFilter: () => {
            console.log('REDUX: Полный сброс фильтров');
            return initialState;
        },

        saveFilters: (state) => {
            // Перепроверяем активность на всякий случай
            state.isActive = (
                (state.criteria.minPrice > 45) ||
                (state.criteria.maxPrice < 1800) ||
                (Array.isArray(state.criteria.categories) && state.criteria.categories.length > 0) ||
                (Array.isArray(state.criteria.brands) && state.criteria.brands.length > 0) ||
                (state.criteria.minRating !== 4.5) ||
                (Array.isArray(state.criteria.compositions) && state.criteria.compositions.length > 0) ||
                (Array.isArray(state.criteria.quantity) && state.criteria.quantity.length > 0) ||
                (Array.isArray(state.criteria.suppliers) && state.criteria.suppliers.length > 0)
            );

            console.log('REDUX: Фильтры сохранены:', JSON.stringify(state.criteria));
            console.log('REDUX: Фильтры активны:', state.isActive);
        }
    }
});

export const {
    setFilterCriteria,
    clearFilterCriteria,
    resetFilter,
    saveFilters
} = filterSlice.actions;

export default filterSlice.reducer;