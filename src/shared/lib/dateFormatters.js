/**
 * Форматирует время в формате ЧЧ:ММ
 * @param {string} dateString - Строка с датой/временем
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
 * Форматирует дату в формате ДД.ММ.ГГГГ
 * @param {string} dateString - Строка с датой/временем
 * @returns {string} Отформатированная дата
 */
export const formatDate = (dateString) => {
    if (!dateString) return "Дата не указана";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Некорректная дата";

    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Форматирует время и дату в формате ЧЧ:ММ, ДД.ММ.ГГГГ
 * @param {string} dateString - Строка с датой/временем
 * @returns {string} Отформатированные время и дата
 */
export const formatDateTime = (dateString) => {
    if (!dateString) return "Время не указано";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Некорректное время";

    const time = formatTime(dateString);
    const formattedDate = formatDate(dateString);

    return `${time}, ${formattedDate}`;
};

/**
 * Форматирует временной диапазон
 * @param {string} startTime - Начальное время
 * @param {string} endTime - Конечное время
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

    const startDateStr = formatDate(startTime);
    const endDateStr = formatDate(endTime);

    if (startDateStr === endDateStr) {
        return `${startTimeStr} - ${endTimeStr}, ${startDateStr}`;
    } else {
        return `${startTimeStr}, ${startDateStr} - ${endTimeStr}, ${endDateStr}`;
    }
};