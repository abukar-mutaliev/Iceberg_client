export { default as authReducer } from '@entities/auth/model/slice';
export * from '@entities/auth/model/slice';
export * from '@entities/auth/model/selectors';
export * from '@entities/auth/api/authApi';
// Важно: не ре-экспортировать useAuth отсюда, чтобы избежать require cycle

