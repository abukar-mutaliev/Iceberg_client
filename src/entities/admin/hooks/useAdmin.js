// Исправленные хуки в файле entities/admin/model/hooks/useAdmin.js
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
    clearAdminErrors,
    clearOperationState
} from '../slice';

export const useAdmin = () => {
    const dispatch = useDispatch();

    // Получаем данные из состояния с явным указанием селекторов
    const users = useSelector((state) => state.admin?.users?.items || []);
    const usersTotal = useSelector((state) => state.admin?.users?.total || 0);
    const usersPage = useSelector((state) => state.admin?.users?.page || 1);
    const usersPages = useSelector((state) => state.admin?.users?.pages || 1);
    const usersLimit = useSelector((state) => state.admin?.users?.limit || 10);
    const usersLoading = useSelector((state) => state.admin?.users?.isLoading || false);
    const usersError = useSelector((state) => state.admin?.users?.error || null);

    const admins = useSelector((state) => state.admin?.admins?.items || []);
    const adminsLoading = useSelector((state) => state.admin?.admins?.isLoading || false);
    const adminsError = useSelector((state) => state.admin?.admins?.error || null);

    const staff = useSelector((state) => state.admin?.staff?.items || []);
    const staffTotal = useSelector((state) => state.admin?.staff?.total || 0);
    const staffPage = useSelector((state) => state.admin?.staff?.page || 1);
    const staffPages = useSelector((state) => state.admin?.staff?.pages || 1);
    const staffLoading = useSelector((state) => state.admin?.staff?.isLoading || false);
    const staffError = useSelector((state) => state.admin?.staff?.error || null);

    const operationLoading = useSelector((state) => state.admin?.operation?.isLoading || false);
    const operationError = useSelector((state) => state.admin?.operation?.error || null);
    const operationSuccess = useSelector((state) => state.admin?.operation?.success || null);

    // Функции для работы с данными
    const loadAllUsers = useCallback((params = {}) => {
        return dispatch(fetchAllUsers(params));
    }, [dispatch]);

    const loadAdmins = useCallback(() => {
        return dispatch(fetchAdmins());
    }, [dispatch]);

    const loadStaff = useCallback((params = {}) => {
        return dispatch(fetchStaff(params));
    }, [dispatch]);

    // Изменяем функции так, чтобы они возвращали промисы для обработки ошибок
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

    // Вспомогательные функции
    const getUsersByRole = useCallback((role) => {
        return users.filter(user => user.role === role);
    }, [users]);

    // Возвращаем все нужные данные и функции
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

        // Функции получения данных
        loadAllUsers,
        loadAdmins,
        loadStaff,

        // Функции создания и управления
        addAdmin,
        addStaff,
        updateUserRole,
        deleteAdmin: removeAdmin,
        deleteStaff: removeStaff,

        // Функции очистки
        clearErrors,
        clearOperation,

        // Вспомогательные функции
        getUsersByRole
    };
};