/**
 * Публичные экспорты модуля model
 * @module product-return/model
 */

// Экспорт reducer
export { default as productReturnReducer } from './slice';

// Экспорт всех actions и thunks из slice
export * from './slice';

// Экспорт всех selectors
export * from './selectors';

