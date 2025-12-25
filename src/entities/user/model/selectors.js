import { createSelector } from '@reduxjs/toolkit';

// Базовые селекторы пользователя
export const selectUserState = (state) => state.user;
export const selectUserEntities = (state) => state.user.entities;
export const selectUserById = createSelector(
    [selectUserEntities, (_, userId) => userId],
    (entities, userId) => {
        const user = entities?.byId[userId];
        if (!user) return null;
        
        // Выполняем трансформацию данных
        return {
            ...user,
            // Добавляем вычисляемое поле
            fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            // Форматируем дату если есть
            formattedRegistrationDate: user.registrationDate 
                ? new Date(user.registrationDate).toLocaleDateString() 
                : '',
            // Добавляем поле с полным адресом
            fullAddress: user.address ? `${user.address.city || ''}, ${user.address.street || ''}`.trim() : ''
        };
    }
);

// Селекторы для списка всех пользователей
export const selectUsers = (state) => state.user?.users?.items || [];
export const selectUsersTotal = (state) => state.user?.users?.total || 0;
export const selectUsersPage = (state) => state.user?.users?.page || 1;
export const selectUsersPages = (state) => state.user?.users?.pages || 1;
export const selectUsersLoading = (state) => state.user?.users?.isLoading || false;
export const selectUsersError = (state) => state.user?.users?.error || null;

// Селекторы для клиентов
export const selectClients = (state) => state.user?.clients?.items || [];
export const selectClientsTotal = (state) => state.user?.clients?.total || 0;
export const selectClientsPage = (state) => state.user?.clients?.page || 1;
export const selectClientsPages = (state) => state.user?.clients?.pages || 1;
export const selectClientsLoading = (state) => state.user?.clients?.isLoading || false;
export const selectClientsError = (state) => state.user?.clients?.error || null;

// Селекторы для сотрудников
export const selectEmployees = (state) => state.user?.employees?.items || [];
export const selectEmployeesTotal = (state) => state.user?.employees?.total || 0;
export const selectEmployeesPage = (state) => state.user?.employees?.page || 1;
export const selectEmployeesPages = (state) => state.user?.employees?.pages || 1;
export const selectEmployeesLoading = (state) => state.user?.employees?.isLoading || false;
export const selectEmployeesError = (state) => state.user?.employees?.error || null;

// Селекторы для поставщиков
export const selectSuppliers = (state) => state.user?.suppliers?.items || [];
export const selectSuppliersTotal = (state) => state.user?.suppliers?.total || 0;
export const selectSuppliersPage = (state) => state.user?.suppliers?.page || 1;
export const selectSuppliersPages = (state) => state.user?.suppliers?.pages || 1;
export const selectSuppliersLoading = (state) => state.user?.suppliers?.isLoading || false;
export const selectSuppliersError = (state) => state.user?.suppliers?.error || null;

// Селекторы для водителей
export const selectDrivers = (state) => state.user?.drivers?.items || [];
export const selectDriversTotal = (state) => state.user?.drivers?.total || 0;
export const selectDriversPage = (state) => state.user?.drivers?.page || 1;
export const selectDriversPages = (state) => state.user?.drivers?.pages || 1;
export const selectDriversLoading = (state) => state.user?.drivers?.isLoading || false;
export const selectDriversError = (state) => state.user?.drivers?.error || null;

// Селекторы для всех водителей
export const selectAllDrivers = (state) => state.user?.allDrivers?.items || [];
export const selectAllDriversLoading = (state) => state.user?.allDrivers?.isLoading || false;
export const selectAllDriversError = (state) => state.user?.allDrivers?.error || null;

// Селекторы для текущего пользователя
export const selectCurrentUserLoading = (state) => state.user?.currentUser?.isLoading || false;
export const selectCurrentUserError = (state) => state.user?.currentUser?.error || null;

// Селекторы для текущего поставщика
export const selectCurrentSupplier = (state) => state.user?.currentSupplier?.data || null;
export const selectCurrentSupplierLoading = (state) => state.user?.currentSupplier?.isLoading || false;
export const selectCurrentSupplierError = (state) => state.user?.currentSupplier?.error || null;

// Селекторы для текущего водителя
export const selectCurrentDriver = (state) => state.user?.currentDriver?.data || null;
export const selectCurrentDriverLoading = (state) => state.user?.currentDriver?.isLoading || false;
export const selectCurrentDriverError = (state) => state.user?.currentDriver?.error || null;

// Селекторы для остановок водителя
export const selectDriverStops = (state) => state.user?.driverStops?.items || [];
export const selectDriverStopsLoading = (state) => state.user?.driverStops?.isLoading || false;
export const selectDriverStopsError = (state) => state.user?.driverStops?.error || null;

// Селекторы для профиля пользователя
export const selectProfile = (state) => state.profile?.data;
export const selectProfileIsLoading = (state) => state.profile?.isLoading;
export const selectProfileError = (state) => state.profile?.error;
export const selectAvatar = createSelector(
    [(state) => selectProfile(state)],
    (profile) => profile?.user?.avatar
);

// Группируем селекторы профиля для удобства импорта
export const profileSelectors = {
    selectProfile,
    selectIsLoading: selectProfileIsLoading,
    selectError: selectProfileError,
    selectAvatar,
};

// Комбинированные селекторы
export const selectCurrentUserComplete = createSelector(
    [(state) => state?.auth?.user, selectProfile],
    (authUser, profileData) => {
        if (!authUser && !profileData) return null;
        return {
            ...authUser,
            ...profileData,
        };
    }
);

export const combinedSelectors = {
    selectCurrentUserComplete,
};

// Селектор для авторизованного пользователя (импортируем из auth)
export const selectUser = (state) => state?.auth?.user || null;

// Группируем все селекторы пользователя для удобства
export const userSelectors = {
    // Базовые селекторы
    selectUserState,
    selectUserEntities,
    selectUserById,

    // Селекторы для всех пользователей
    selectUsers,
    selectUsersTotal,
    selectUsersPage,
    selectUsersPages,
    selectUsersLoading,
    selectUsersError,

    // Селекторы для клиентов
    selectClients,
    selectClientsTotal,
    selectClientsPage,
    selectClientsPages,
    selectClientsLoading,
    selectClientsError,

    // Селекторы для сотрудников
    selectEmployees,
    selectEmployeesTotal,
    selectEmployeesPage,
    selectEmployeesPages,
    selectEmployeesLoading,
    selectEmployeesError,

    // Селекторы для поставщиков
    selectSuppliers,
    selectSuppliersTotal,
    selectSuppliersPage,
    selectSuppliersPages,
    selectSuppliersLoading,
    selectSuppliersError,

    // Селекторы для водителей
    selectDrivers,
    selectDriversTotal,
    selectDriversPage,
    selectDriversPages,
    selectDriversLoading,
    selectDriversError,

    // Селекторы для всех водителей
    selectAllDrivers,
    selectAllDriversLoading,
    selectAllDriversError,

    // Селекторы для текущего пользователя
    selectUser,
    selectCurrentUserComplete,
    selectCurrentUserLoading,
    selectCurrentUserError,

    // Селекторы для текущего поставщика
    selectCurrentSupplier,
    selectCurrentSupplierLoading,
    selectCurrentSupplierError,

    // Селекторы для текущего водителя
    selectCurrentDriver,
    selectCurrentDriverLoading,
    selectCurrentDriverError,

    // Селекторы для остановок водителя
    selectDriverStops,
    selectDriverStopsLoading,
    selectDriverStopsError,

    // Селекторы профиля
    selectProfile,
    selectProfileIsLoading,
    selectProfileError,
    selectAvatar,
};