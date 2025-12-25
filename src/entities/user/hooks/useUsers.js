// entities/user/model/hooks/useUsers.js
import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { userSelectors } from '../model/selectors';
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
} from '../model/slice';

export const useUsers = () => {
    const dispatch = useDispatch();

    // Получаем данные из состояния через селекторы
    const users = useSelector((state) => state.user?.users?.items || []);
    const usersTotal = useSelector((state) => state.user?.users?.total || 0);
    const usersPage = useSelector((state) => state.user?.users?.page || 1);
    const usersPages = useSelector((state) => state.user?.users?.pages || 1);
    const usersLoading = useSelector((state) => state.user?.users?.isLoading || false);
    const usersError = useSelector((state) => state.user?.users?.error || null);

    const clients = useSelector((state) => state.user?.clients?.items || []);
    const clientsTotal = useSelector((state) => state.user?.clients?.total || 0);
    const clientsPage = useSelector((state) => state.user?.clients?.page || 1);
    const clientsPages = useSelector((state) => state.user?.clients?.pages || 1);
    const clientsLoading = useSelector((state) => state.user?.clients?.isLoading || false);
    const clientsError = useSelector((state) => state.user?.clients?.error || null);

    const employees = useSelector((state) => state.user?.employees?.items || []);
    const employeesTotal = useSelector((state) => state.user?.employees?.total || 0);
    const employeesPage = useSelector((state) => state.user?.employees?.page || 1);
    const employeesPages = useSelector((state) => state.user?.employees?.pages || 1);
    const employeesLoading = useSelector((state) => state.user?.employees?.isLoading || false);
    const employeesError = useSelector((state) => state.user?.employees?.error || null);

    const suppliers = useSelector((state) => state.user?.suppliers?.items || []);
    const suppliersTotal = useSelector((state) => state.user?.suppliers?.total || 0);
    const suppliersPage = useSelector((state) => state.user?.suppliers?.page || 1);
    const suppliersPages = useSelector((state) => state.user?.suppliers?.pages || 1);
    const suppliersLoading = useSelector((state) => state.user?.suppliers?.isLoading || false);
    const suppliersError = useSelector((state) => state.user?.suppliers?.error || null);

    const drivers = useSelector((state) => state.user?.drivers?.items || []);
    const driversTotal = useSelector((state) => state.user?.drivers?.total || 0);
    const driversPage = useSelector((state) => state.user?.drivers?.page || 1);
    const driversPages = useSelector((state) => state.user?.drivers?.pages || 1);
    const driversLoading = useSelector((state) => state.user?.drivers?.isLoading || false);
    const driversError = useSelector((state) => state.user?.drivers?.error || null);

    const allDrivers = useSelector((state) => state.user?.allDrivers?.items || []);
    const allDriversLoading = useSelector((state) => state.user?.allDrivers?.isLoading || false);
    const allDriversError = useSelector((state) => state.user?.allDrivers?.error || null);

    const currentUser = useSelector((state) => state.user?.currentUser?.data || null);
    const currentUserLoading = useSelector((state) => state.user?.currentUser?.isLoading || false);
    const currentUserError = useSelector((state) => state.user?.currentUser?.error || null);

    const currentSupplier = useSelector((state) => state.user?.currentSupplier?.data || null);
    const currentSupplierLoading = useSelector((state) => state.user?.currentSupplier?.isLoading || false);
    const currentSupplierError = useSelector((state) => state.user?.currentSupplier?.error || null);

    const currentDriver = useSelector((state) => state.user?.currentDriver?.data || null);
    const currentDriverLoading = useSelector((state) => state.user?.currentDriver?.isLoading || false);
    const currentDriverError = useSelector((state) => state.user?.currentDriver?.error || null);

    const driverStops = useSelector((state) => state.user?.driverStops?.items || []);
    const driverStopsLoading = useSelector((state) => state.user?.driverStops?.isLoading || false);
    const driverStopsError = useSelector((state) => state.user?.driverStops?.error || null);

    // Функции для работы с данными
    const loadAllUsers = useCallback((params = {}) => {
        return dispatch(fetchAllUsers(params));
    }, [dispatch]);

    const loadUserById = useCallback((id) => {
        return dispatch(fetchUserById(id));
    }, [dispatch]);

    const loadClients = useCallback((params = {}) => {
        return dispatch(fetchClients(params));
    }, [dispatch]);

    const loadEmployees = useCallback((params = {}) => {
        return dispatch(fetchEmployees(params));
    }, [dispatch]);

    const loadSuppliers = useCallback((params = {}) => {
        return dispatch(fetchSuppliers(params));
    }, [dispatch]);

    const loadSupplierById = useCallback((id) => {
        return dispatch(fetchSupplierById(id));
    }, [dispatch]);

    const loadDrivers = useCallback((params = {}) => {
        return dispatch(fetchDrivers(params));
    }, [dispatch]);

    const loadAllDrivers = useCallback(() => {
        return dispatch(fetchAllDrivers());
    }, [dispatch]);

    const loadDriverById = useCallback((id) => {
        return dispatch(fetchDriverById(id));
    }, [dispatch]);

    const loadDriverStops = useCallback((id, params = {}) => {
        return dispatch(fetchDriverStops({ id, params }));
    }, [dispatch]);

    const clearUserData = useCallback(() => {
        dispatch(clearCurrentUser());
    }, [dispatch]);

    const clearSupplierData = useCallback(() => {
        dispatch(clearCurrentSupplier());
    }, [dispatch]);

    const clearDriverData = useCallback(() => {
        dispatch(clearCurrentDriver());
    }, [dispatch]);

    const clearErrors = useCallback(() => {
        dispatch(clearUserErrors());
    }, [dispatch]);

    const clearState = useCallback(() => {
        dispatch(clearUserState());
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
            isLoading: usersLoading,
            error: usersError
        },

        // Данные о клиентах
        clients: {
            items: clients,
            total: clientsTotal,
            page: clientsPage,
            pages: clientsPages,
            isLoading: clientsLoading,
            error: clientsError
        },

        // Данные о сотрудниках
        employees: {
            items: employees,
            total: employeesTotal,
            page: employeesPage,
            pages: employeesPages,
            isLoading: employeesLoading,
            error: employeesError
        },

        // Данные о поставщиках
        suppliers: {
            items: suppliers,
            total: suppliersTotal,
            page: suppliersPage,
            pages: suppliersPages,
            isLoading: suppliersLoading,
            error: suppliersError
        },

        // Данные о водителях
        drivers: {
            items: drivers,
            total: driversTotal,
            page: driversPage,
            pages: driversPages,
            isLoading: driversLoading,
            error: driversError
        },

        // Данные о всех водителях
        allDrivers: {
            items: allDrivers,
            isLoading: allDriversLoading,
            error: allDriversError
        },

        // Данные о текущем пользователе
        currentUser: {
            data: currentUser,
            isLoading: currentUserLoading,
            error: currentUserError
        },

        // Данные о текущем поставщике
        currentSupplier: {
            data: currentSupplier,
            isLoading: currentSupplierLoading,
            error: currentSupplierError
        },

        // Данные о текущем водителе
        currentDriver: {
            data: currentDriver,
            isLoading: currentDriverLoading,
            error: currentDriverError
        },

        // Данные об остановках водителя
        driverStops: {
            items: driverStops,
            isLoading: driverStopsLoading,
            error: driverStopsError
        },

        // Функции получения данных
        loadAllUsers,
        loadUserById,
        loadClients,
        loadEmployees,
        loadSuppliers,
        loadSupplierById,
        loadDrivers,
        loadAllDrivers,
        loadDriverById,
        loadDriverStops,

        // Функции очистки
        clearUserData,
        clearSupplierData,
        clearDriverData,
        clearErrors,
        clearState,

        // Вспомогательные функции
        getUsersByRole
    };
};