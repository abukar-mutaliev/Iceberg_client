import userReducer from './model/slice';
import {
    fetchAllUsers,
    fetchUserById,
    fetchClients,
    fetchEmployees,
    fetchSuppliers,
    fetchSupplierById,
    fetchDrivers,
    fetchAllDrivers,
    fetchDriverById,
    fetchDriverStops,
    clearCurrentUser,
    clearCurrentSupplier,
    clearCurrentDriver,
    clearUserErrors,
    clearUserState
} from './model/slice';
import { userApi, employeeApi } from './api/userApi';
import { userSelectors } from './model/selectors';
import { useUsers } from '@entities/user/hooks/useUsers';
export { UserCard } from './ui/UserCard';
export { EmployeeDistrictsModal } from './ui/EmployeeDistrictsModal';

export {
    // Редьюсер
    userReducer,

    // Actions
    fetchAllUsers,
    fetchUserById,
    fetchClients,
    fetchEmployees,
    fetchSuppliers,
    fetchSupplierById,
    fetchDrivers,
    fetchAllDrivers,
    fetchDriverById,
    fetchDriverStops,
    clearCurrentUser,
    clearCurrentSupplier,
    clearCurrentDriver,
    clearUserErrors,
    clearUserState,

    // API
    userApi,
    employeeApi,

    // Селекторы
    userSelectors,

    // Хук
    useUsers
};