export { default as searchHistoryReducer } from './model/slice';
export {
    selectSearchHistoryItems,
    selectSearchHistoryLoading,
    selectSearchHistoryError
}
from './model/selectors';export {
    addSearchQuery,
    removeSearchQuery,
    clearSearchHistory,
    loadSearchHistory,
} from './model/slice';