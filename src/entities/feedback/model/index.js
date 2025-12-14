
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
        // Фильтруем только явно неправильные пути (placeholder, path/to)
        if (url.includes('placeholder') || url.includes('path/to')) {
            return null;
        }

        // Если URL уже полный и валидный, возвращаем как есть
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        // Обработка относительных путей с timestamp
        // Если URL содержит только timestamp (число), пытаемся построить полный путь
        const timestampMatch = url.match(/\/uploads\/avatars\/(\d+)/) || url.match(/^(\d+)$/);
        if (timestampMatch && timestampMatch[1]) {
            const timestamp = timestampMatch[1];
            // Пытаемся извлечь базовый URL из окружения или использовать дефолтный
            const baseUrl = process.env.REACT_APP_API_URL || 'http://212.67.11.134:5000';
            return `${baseUrl}/uploads/avatars/${timestamp}.jpg`;
        }

        // Если URL не соответствует ожидаемому формату, возвращаем исходный URL
        // Пусть клиент сам обработает ошибку загрузки
        return url;
    } catch (error) {
        if (__DEV__) {
            console.error('Ошибка обработки URL аватара:', error);
        }
        return url; // Возвращаем исходный URL вместо null
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