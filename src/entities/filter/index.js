export {
    setFilterCriteria,
    clearFilterCriteria,
    resetFilter,
    saveFilters
} from './model/slice';

export { default as filterReducer } from './model/slice';

export {
    selectFilterCriteria,
    selectIsFilterActive,
    selectAppliedFilters,
    selectFilteredProductsBySearch
} from './model/selectors';

export { applyFiltersToProducts } from './lib/applyFiltersToProducts';