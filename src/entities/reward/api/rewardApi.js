import { createProtectedRequest } from '@shared/api/api';

export const rewardApi = {
    // Получить настройки вознаграждений (только для супер-админа)
    getRewardSettings: () => {
        return createProtectedRequest('GET', '/api/rewards/settings');
    },

    // Создать настройку вознаграждения (только для супер-админа)
    createRewardSetting: (data) => {
        return createProtectedRequest('POST', '/api/rewards/settings', data);
    },

    // Обновить настройку вознаграждения (только для супер-админа)
    updateRewardSetting: (id, data) => {
        return createProtectedRequest('PUT', `/api/rewards/settings/${id}`, data);
    },

    // Получить историю вознаграждений сотрудника
    getEmployeeRewards: (employeeId, params = {}) => {
        return createProtectedRequest('GET', `/api/rewards/employees/${employeeId}`, null, { params });
    },

    // Получить свои вознаграждения (для сотрудников)
    getMyRewards: (params = {}) => {
        return createProtectedRequest('GET', '/api/rewards/my-rewards', null, { params });
    },

    // Получить статистику по всем сотрудникам (только для админов)
    getAllEmployeesStats: (params = {}) => {
        return createProtectedRequest('GET', '/api/rewards/statistics/all', null, { params });
    },

    // Получить все вознаграждения в ожидании (только для админов)
    getAllPendingRewards: (params = {}) => {
        return createProtectedRequest('GET', '/api/rewards/pending', null, { params });
    },

    // Обработать вознаграждение (одобрить/отклонить) - только для админов
    processReward: (id, data) => {
        return createProtectedRequest('PATCH', `/api/rewards/${id}/process`, data);
    },

    // Массовая обработка вознаграждений сотрудника (только для админов)
    // Позволяет пометить все вознаграждения сотрудника как выплаченные одной кнопкой
    batchProcessRewards: (employeeId, data) => {
        return createProtectedRequest('POST', `/api/rewards/employees/${employeeId}/batch-process`, data);
    }
};

export default rewardApi; 