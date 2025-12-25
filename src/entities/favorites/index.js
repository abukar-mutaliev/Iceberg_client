export * from './model/slice';
export * from './model/selectors';
export * from './api/favoritesApi';

export { useFavorites } from '@entities/favorites/hooks/useFavorites';
export { useFavoriteStatus } from '@entities/favorites/hooks/useFavoriteStatus';

export { default as favoritesReducer } from './model/slice';
