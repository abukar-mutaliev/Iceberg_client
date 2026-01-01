import { createApiModule } from '@shared/services/ApiClient';

const supportTicketApiModule = createApiModule('/api/support-tickets');

const SupportTicketApi = {
    /**
     * Получить свои обращения
     */
    getMyTickets: (params = {}) => supportTicketApiModule.get('/my', params),

    /**
     * Получить обращение по ID
     */
    getTicketById: (id) => supportTicketApiModule.get(`/${id}`),

    /**
     * Создать обращение
     */
    createTicket: (formData) => {
        // Для FormData не нужно явно указывать Content-Type, браузер/axios сам установит правильный заголовок с boundary
        return supportTicketApiModule.post('/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    /**
     * Обновить обращение (только для админов)
     */
    updateTicket: (id, data) => supportTicketApiModule.put(`/${id}`, data),

    /**
     * Изменить статус обращения (только для админов)
     */
    updateTicketStatus: (id, status) => supportTicketApiModule.patch(`/${id}/status`, { status }),

    /**
     * Получить все обращения (только для админов)
     */
    getAllTickets: (params = {}) => supportTicketApiModule.get('/', params),
};

export default SupportTicketApi;

