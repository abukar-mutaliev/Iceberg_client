import {api} from "@shared/api/api";

export const notificationSettingsApi = {
    /**
     * Получение настроек уведомлений пользователя
     */
    getSettings: async () => {
        const response = await api.get('/api/notification-settings');
        return response.data.data;
    },

    /**
     * Обновление настроек уведомлений пользователя
     */
    updateSettings: async (settings) => {
        const response = await api.put('/api/notification-settings', settings);
        return response.data.data;
    },

    /**
     * Сброс настроек к значениям по умолчанию
     */
    resetToDefaults: async () => {
        const response = await api.post('/api/notification-settings/reset');
        return response.data.data;
    }
};
