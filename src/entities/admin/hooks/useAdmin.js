import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import {
    fetchAllUsers,
    fetchAdmins,
    fetchStaff,
    createAdmin,
    createStaff,
    changeUserRole,
    deleteAdmin,
    deleteStaff,
    fetchWarehousesForSelection,
    fetchDistrictsForSelection,
    clearAdminErrors,
    clearOperationState,
    clearUsersList
} from '../model/slice';

import {
    selectAllUsers,
    selectUsersTotal,
    selectUsersPage,
    selectUsersPages,
    selectUsersLimit,
    selectUsersLoading,
    selectUsersError,
    selectAdmins,
    selectAdminsLoading,
    selectAdminsError,
    selectStaff,
    selectStaffTotal,
    selectStaffPage,
    selectStaffPages,
    selectStaffLoading,
    selectStaffError,
    selectOperationLoading,
    selectOperationError,
    selectOperationSuccess,
    selectWarehouses,
    selectWarehousesLoading,
    selectWarehousesError,
    selectDistricts,
    selectDistrictsLoading,
    selectDistrictsError
} from '../model/selectors';

export const useAdmin = () => {
    const dispatch = useDispatch();

    const users = useSelector(selectAllUsers);
    const usersTotal = useSelector(selectUsersTotal);
    const usersPage = useSelector(selectUsersPage);
    const usersPages = useSelector(selectUsersPages);
    const usersLimit = useSelector(selectUsersLimit);
    const usersLoading = useSelector(selectUsersLoading);
    const usersError = useSelector(selectUsersError);

    const admins = useSelector(selectAdmins);
    const adminsLoading = useSelector(selectAdminsLoading);
    const adminsError = useSelector(selectAdminsError);

    const staff = useSelector(selectStaff);
    const staffTotal = useSelector(selectStaffTotal);
    const staffPage = useSelector(selectStaffPage);
    const staffPages = useSelector(selectStaffPages);
    const staffLoading = useSelector(selectStaffLoading);
    const staffError = useSelector(selectStaffError);

    const operationLoading = useSelector(selectOperationLoading);
    const operationError = useSelector(selectOperationError);
    const operationSuccess = useSelector(selectOperationSuccess);

    const warehouses = useSelector(selectWarehouses);
    const warehousesLoading = useSelector(selectWarehousesLoading);
    const warehousesError = useSelector(selectWarehousesError);

    const districts = useSelector(selectDistricts);
    const districtsLoading = useSelector(selectDistrictsLoading);
    const districtsError = useSelector(selectDistrictsError);

    const loadAllUsers = useCallback((params = {}) => {
        return dispatch(fetchAllUsers(params));
    }, [dispatch]);

    const loadAdmins = useCallback(() => {
        return dispatch(fetchAdmins());
    }, [dispatch]);

    const loadStaff = useCallback((params = {}) => {
        return dispatch(fetchStaff(params));
    }, [dispatch]);

    const loadWarehouses = useCallback(() => {
        return dispatch(fetchWarehousesForSelection());
    }, [dispatch]);

    const loadDistricts = useCallback(() => {
        return dispatch(fetchDistrictsForSelection());
    }, [dispatch]);

    const addAdmin = useCallback((data) => {
        return new Promise((resolve, reject) => {
            dispatch(createAdmin(data))
                .unwrap()
                .then(result => {
                    resolve(result);
                })
                .catch(error => {
                    console.error('Error in addAdmin:', error);
                    reject(error);
                });
        });
    }, [dispatch]);

    const addStaff = useCallback((data) => {
        return new Promise((resolve, reject) => {
            dispatch(createStaff(data))
                .unwrap()
                .then(result => {
                    resolve(result);
                })
                .catch(error => {
                    console.error('Error in addStaff:', error);
                    reject(error);
                });
        });
    }, [dispatch]);

    const updateUserRole = useCallback((userId, data) => {
        return dispatch(changeUserRole({ userId, data }));
    }, [dispatch]);

    const removeAdmin = useCallback((adminId) => {
        return dispatch(deleteAdmin(adminId));
    }, [dispatch]);

    const removeStaff = useCallback((userId) => {
        return dispatch(deleteStaff(userId));
    }, [dispatch]);

    const clearErrors = useCallback(() => {
        dispatch(clearAdminErrors());
    }, [dispatch]);

    const clearOperation = useCallback(() => {
        dispatch(clearOperationState());
    }, [dispatch]);

    const clearUsers = useCallback(() => {
        dispatch(clearUsersList());
    }, [dispatch]);

    const getUsersByRole = useCallback((role) => {
        return users.filter(user => user.role === role);
    }, [users]);

    return {
        // Данные о пользователях
        users: {
            items: users,
            total: usersTotal,
            page: usersPage,
            pages: usersPages,
            limit: usersLimit,
            isLoading: usersLoading,
            error: usersError
        },

        // Данные об администраторах
        admins: {
            items: admins,
            isLoading: adminsLoading,
            error: adminsError
        },

        // Данные о персонале
        staff: {
            items: staff,
            total: staffTotal,
            page: staffPage,
            pages: staffPages,
            isLoading: staffLoading,
            error: staffError
        },

        // Данные об операциях
        operation: {
            isLoading: operationLoading,
            error: operationError,
            success: operationSuccess
        },

        // Данные о складах
        warehouses: {
            items: warehouses,
            isLoading: warehousesLoading,
            error: warehousesError
        },

        // Данные о районах
        districts: {
            items: districts,
            isLoading: districtsLoading,
            error: districtsError
        },

        // Функции получения данных
        loadAllUsers,
        loadAdmins,
        loadStaff,
        loadWarehouses,
        loadDistricts,

        // Функции создания и управления
        addAdmin,
        addStaff,
        updateUserRole,
        deleteAdmin: removeAdmin,
        deleteStaff: removeStaff,

        // Функции очистки
        clearErrors,
        clearOperation,
        clearUsers,

        // Вспомогательные функции
        getUsersByRole
    };
};