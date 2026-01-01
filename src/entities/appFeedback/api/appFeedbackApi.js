import { createApiModule } from '@shared/services/ApiClient';

const appFeedbackApiModule = createApiModule('/api/app-feedback');

const AppFeedbackApi = {
    /**
     * Получить свой отзыв о приложении
     */
    getMyFeedback: () => appFeedbackApiModule.get('/my'),

    /**
     * Создать отзыв о приложении
     */
    createFeedback: (data) => appFeedbackApiModule.post('/', data),

    /**
     * Обновить отзыв о приложении
     */
    updateFeedback: (id, data) => appFeedbackApiModule.put(`/${id}`, data),

    /**
     * Удалить отзыв о приложении
     */
    deleteFeedback: (id) => appFeedbackApiModule.delete(`/${id}`),

    /**
     * Получить все отзывы (только для админов)
     */
    getAllFeedbacks: (params = {}) => appFeedbackApiModule.get('/', params),
};

export default AppFeedbackApi;


