export { userApi } from './api/userApi';
export {
    fetchUserById,
    fetchClients,
    fetchEmployees,
    fetchAllUsers,
    createUser,
    updateUser,
    deleteUser,
    clearError,
    setCurrentUser,
    clearCurrentUser
} from './model/slice';
export {
    selectAllUsers,
    selectClients,
    selectEmployees,
    selectCurrentUser,
    selectUserLoading,
    selectUserError,
    selectUserById
} from './model/selectors';

export { default as userReducer } from './model/slice';

