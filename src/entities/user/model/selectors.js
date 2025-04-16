
// Общие селекторы
export const selectAllUsers = (state) => state.user?.allUsers || [];
export const selectClients = (state) => state.user?.clients || [];
export const selectEmployees = (state) => state.user?.employees || [];
export const selectCurrentUser = (state) => state.user?.currentUser || null;
export const selectUserLoading = (state) => state.user?.isLoading || false;
export const selectUserError = (state) => state.user?.error || null;

// Селекторы для мап (быстрый доступ по ID)
export const selectUsersMap = (state) => state.user?.usersMap || { clients: {}, employees: {}, suppliers: {}, all: {} };
export const selectClientsMap = (state) => state.user?.usersMap?.clients || {};
export const selectEmployeesMap = (state) => state.user?.usersMap?.employees || {};


// Получение пользователя по ID из любого типа
export const selectUserById = (state, userId) => {
    const user = state.user?.usersMap?.all[userId];
    return user || null;
};

export const selectClientById = (state, clientId) => {
    const user = state.user?.usersMap?.clients[clientId];
    return user ? user.client : null;
};

export const selectEmployeeById = (state, employeeId) => {
    const user = state.user?.usersMap?.employees[employeeId];
    return user ? user.employee : null;
};

// Получение пользователей по роли
export const selectUsersByRole = (state, role) => {
    switch (role.toUpperCase()) {
        case 'CLIENT':
            return selectClients(state);
        case 'EMPLOYEE':
            return selectEmployees(state);
        default:
            return selectAllUsers(state).filter(user => user.role === role);
    }
};