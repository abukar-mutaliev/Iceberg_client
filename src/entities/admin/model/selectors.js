// Константы для предотвращения создания новых ссылок
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

// Базовые селекторы администратора
export const selectAdminState = (state) => state.admin;

// Селекторы для списка всех пользователей
export const selectAllUsers = (state) => state.admin?.users?.items || EMPTY_ARRAY;
export const selectUsersTotal = (state) => state.admin?.users?.total || 0;
export const selectUsersPage = (state) => state.admin?.users?.page || 1;
export const selectUsersPages = (state) => state.admin?.users?.pages || 1;
export const selectUsersLimit = (state) => state.admin?.users?.limit || 10;
export const selectUsersLoading = (state) => state.admin?.users?.isLoading || false;
export const selectUsersError = (state) => state.admin?.users?.error || null;

// Селекторы для администраторов
export const selectAdmins = (state) => state.admin?.admins?.items || EMPTY_ARRAY;
export const selectAdminsLoading = (state) => state.admin?.admins?.isLoading || false;
export const selectAdminsError = (state) => state.admin?.admins?.error || null;

// Селекторы для персонала
export const selectStaff = (state) => state.admin?.staff?.items || EMPTY_ARRAY;
export const selectStaffTotal = (state) => state.admin?.staff?.total || 0;
export const selectStaffPage = (state) => state.admin?.staff?.page || 1;
export const selectStaffPages = (state) => state.admin?.staff?.pages || 1;
export const selectStaffLoading = (state) => state.admin?.staff?.isLoading || false;
export const selectStaffError = (state) => state.admin?.staff?.error || null;

// Селекторы для операций
export const selectOperationLoading = (state) => state.admin?.operation?.isLoading || false;
export const selectOperationError = (state) => state.admin?.operation?.error || null;
export const selectOperationSuccess = (state) => state.admin?.operation?.success || null;

// Селекторы для складов
export const selectWarehouses = (state) => state.admin?.warehouses?.items || EMPTY_ARRAY;
export const selectWarehousesLoading = (state) => state.admin?.warehouses?.isLoading || false;
export const selectWarehousesError = (state) => state.admin?.warehouses?.error || null;

// Селекторы для районов
export const selectDistricts = (state) => state.admin?.districts?.items || EMPTY_ARRAY;
export const selectDistrictsLoading = (state) => state.admin?.districts?.isLoading || false;
export const selectDistrictsError = (state) => state.admin?.districts?.error || null;

// Группируем селекторы администратора для удобства
export const adminSelectors = {
    selectAdminState,

    // Селекторы для пользователей
    selectAllUsers,
    selectUsersTotal,
    selectUsersPage,
    selectUsersPages,
    selectUsersLimit,
    selectUsersLoading,
    selectUsersError,

    // Селекторы для администраторов
    selectAdmins,
    selectAdminsLoading,
    selectAdminsError,

    // Селекторы для персонала
    selectStaff,
    selectStaffTotal,
    selectStaffPage,
    selectStaffPages,
    selectStaffLoading,
    selectStaffError,

    // Селекторы для операций
    selectOperationLoading,
    selectOperationError,
    selectOperationSuccess,

    // Селекторы для складов
    selectWarehouses,
    selectWarehousesLoading,
    selectWarehousesError,

    // Селекторы для районов
    selectDistricts,
    selectDistrictsLoading,
    selectDistrictsError
};