/**
 * Форматирует время из ISO строки в локальный формат времени
 * @param {string} dateString - ISO строка даты
 * @returns {string} Отформатированное время
 */
export const formatTime = (dateString) => {
    if (!dateString) return "Время не указано";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Некорректное время";

    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Форматирует дату из ISO строки в локальный формат даты
 * @param {string} dateString - ISO строка даты
 * @returns {string} Отформатированная дата
 */
export const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Форматирует временной диапазон из начальной и конечной даты
 * @param {string} startTime - ISO строка начальной даты
 * @param {string} endTime - ISO строка конечной даты
 * @returns {string} Отформатированный временной диапазон
 */
export const formatTimeRange = (startTime, endTime) => {
    if (!startTime || !endTime) return "Время не указано";

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()))
        return "Некорректное время";

    const startTimeStr = formatTime(startTime);
    const endTimeStr = formatTime(endTime);

    const dateStr = formatDate(startTime);

    const startDateStr = formatDate(startTime);
    const endDateStr = formatDate(endTime);

    if (startDateStr === endDateStr) {
        return `${startTimeStr} - ${endTimeStr}, ${dateStr}`;
    } else {
        return `${startTimeStr}, ${startDateStr} - ${endTimeStr}, ${endDateStr}`;
    }
};

/**
 * Проверяет, активна ли остановка в данный момент
 * @param {Object} stop - Объект остановки
 * @returns {boolean} True, если остановка активна в данный момент
 */
export const isStopActive = (stop) => {
    if (!stop.startTime || !stop.endTime) return false;

    const now = new Date();
    const startTime = new Date(stop.startTime);
    const endTime = new Date(stop.endTime);

    return startTime <= now && endTime >= now;
}; 