/**
 * Функция для логирования данных с префиксом имени компонента
 * @param {string} message - Сообщение для вывода в консоль
 * @param {any} data - Данные для логирования (опционально)
 * @param {string} componentName - Имя компонента (по умолчанию 'App')
 */
export const logData = (message, data, componentName = 'App') => {
    if (__DEV__) { // Логируем только в режиме разработки
        if (data !== undefined) {
            console.log(`[${componentName}] ${message}:`, data);
        } else {
            console.log(`[${componentName}] ${message}`);
        }
    }
};

/**
 * Функция для логирования ошибок
 * @param {string} message - Сообщение об ошибке
 * @param {Error|any} error - Объект ошибки
 * @param {string} componentName - Имя компонента
 */
export const logError = (message, error, componentName = 'App') => {
    if (__DEV__) { // Логируем только в режиме разработки
        console.error(`[${componentName}] ERROR: ${message}`, error);

        // Дополнительная информация об ошибке, если доступна
        if (error && typeof error === 'object') {
            if (error.stack) {
                console.error(`[${componentName}] Stack trace:`, error.stack);
            }
            if (error.response) {
                console.error(`[${componentName}] Response error:`, {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data
                });
            }
        }
    }
};

/**
 * Функция для логирования предупреждений
 * @param {string} message - Предупреждающее сообщение
 * @param {any} data - Дополнительные данные
 * @param {string} componentName - Имя компонента
 */
export const logWarning = (message, data, componentName = 'App') => {
    if (__DEV__) { // Логируем только в режиме разработки
        if (data !== undefined) {
            console.warn(`[${componentName}] WARNING: ${message}`, data);
        } else {
            console.warn(`[${componentName}] WARNING: ${message}`);
        }
    }
};

/**
 * Функция для логирования отладочной информации
 * @param {string} message - Отладочное сообщение
 * @param {any} data - Данные для отладки
 * @param {string} componentName - Имя компонента
 */
export const logDebug = (message, data, componentName = 'App') => {
    if (__DEV__) { // Логируем только в режиме разработки
        if (data !== undefined) {
            console.log(`[${componentName}] DEBUG: ${message}`, data);
        } else {
            console.log(`[${componentName}] DEBUG: ${message}`);
        }
    }
};

/**
 * Функция для логирования производительности
 * @param {string} operation - Название операции
 * @param {string} componentName - Имя компонента
 * @returns {function} - Функция для завершения измерения
 */
export const logPerformance = (operation, componentName = 'App') => {
    if (__DEV__) { // Логируем только в режиме разработки
        const startTime = Date.now();
        console.log(`[${componentName}] PERF: ${operation} started`);

        return () => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            console.log(`[${componentName}] PERF: ${operation} completed in ${duration}ms`);
        };
    } else {
        // В production возвращаем пустую функцию
        return () => {};
    }
};