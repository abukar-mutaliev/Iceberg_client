
/**
 * @typedef {Object} FeedbackClient
 * @property {string} name - Имя клиента
 * @property {Object} [user] - Информация о пользователе
 * @property {string} [user.avatar] - Аватар пользователя
 */

/**
 * @typedef {Object} Feedback
 * @property {string} id - Идентификатор отзыва
 * @property {FeedbackClient} [client] - Информация о клиенте
 * @property {string} [clientId] - ID клиента
 * @property {string} [createdAt] - Дата создания
 * @property {number} [rating] - Рейтинг
 * @property {string} [comment] - Текст отзыва
 * @property {string} [reply] - Ответ на отзыв
 * @property {string} [avatar] - Аватар клиента
 * @property {string[]} [photoUrls] - URL фотографий
 */

/**
 * Форматирует дату отзыва в российском формате
 * @param {string} date - Дата в ISO формате
 * @returns {string} Форматированная дата
 */
export const formatFeedbackDate = (date) => {
    if (!date) return '';

    return new Date(date).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).replace(',', '');
};

/**
 * Исправляет URL аватара
 * @param {string} url - Исходный URL
 * @returns {string|null} Исправленный URL или null
 */
export const fixAvatarUrl = (url) => {
    if (!url) return null;

    try {
        const timestampMatch = url.match(/\/uploads\/avatars\/(\d+)/);
        if (timestampMatch && timestampMatch[1]) {
            const timestamp = timestampMatch[1];
            const baseUrl = url.split('/uploads/')[0];
            return `${baseUrl}/uploads/avatars/${timestamp}.jpg`;
        }
        return url;
    } catch (error) {
        console.error('Ошибка обработки URL аватара:', error);
        return url;
    }
};

/**
 * Обрезает текст до указанной длины и добавляет многоточие
 * @param {string} text - Текст для обрезки
 * @param {number} maxLength - Максимальная длина
 * @returns {string} Обрезанный текст
 */
export const truncateText = (text, maxLength) => {
    if (!text) return '';

    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '';
};