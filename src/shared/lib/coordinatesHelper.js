/**
 * coordinatesHelper.js
 * Набор утилит для работы с координатами в разных форматах
 */

import { logData } from '@/shared/lib/logger';

/**
 * Безопасно парсит JSON без выброса исключений
 * @param {string} jsonString - JSON строка для парсинга
 * @returns {object|array|null} - Распарсенный объект или null при ошибке
 */
const safeParseJSON = (jsonString) => {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        logData('Ошибка при парсинге JSON:', error.message);
        return null;
    }
};

/**
 * Проверяет, являются ли координаты валидными (в правильных диапазонах)
 * @param {number} lat - Широта
 * @param {number} lng - Долгота
 * @returns {boolean} - true, если координаты в правильных диапазонах
 */
const isValidCoordinatePair = (lat, lng) => {
    return !isNaN(lat) && !isNaN(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180;
};

/**
 * Преобразует координаты из различных форматов в стандартный формат "lat,lng"
 * @param {string|object|array} coordinates - Координаты в различных форматах
 * @returns {string|null} - Строка "lat,lng" или null при ошибке
 */
export const normalizeCoordinates = (coordinates) => {
    try {
        // Если координаты не предоставлены
        if (!coordinates) {
            return null;
        }

        // Если координаты уже в формате строки
        if (typeof coordinates === 'string') {
            const trimmed = coordinates.trim();
            
            // Если это пустая строка
            if (trimmed === '') {
                return null;
            }
            
            // Проверяем формат "lat,lng" с проверкой позиций
            if (trimmed.includes(',')) {
                let parts = trimmed.split(',').map(part => parseFloat(part.trim()));
                
                // Фильтруем части, оставляя только числа
                parts = parts.filter(part => !isNaN(part));
                
                // Если у нас есть хотя бы две числовые части
                if (parts.length >= 2) {
                    const lat = parts[0];
                    const lng = parts[1];
                    
                    // Проверяем, находятся ли числа в правильных диапазонах
                    if (isValidCoordinatePair(lat, lng)) {
                        return `${lat},${lng}`;
                    }
                    
                    // Если числа в неправильных диапазонах, возможно они перепутаны местами
                    if (isValidCoordinatePair(lng, lat)) {
                        logData('Координаты кажутся перепутанными, меняем местами');
                        return `${lng},${lat}`;
                    }
                }
            }

            // Попытка парсинга JSON
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                const parsed = safeParseJSON(trimmed);
                
                if (parsed) {
                    // Массив [lat, lng]
                    if (Array.isArray(parsed) && parsed.length >= 2) {
                        const lat = parseFloat(parsed[0]);
                        const lng = parseFloat(parsed[1]);
                        
                        if (isValidCoordinatePair(lat, lng)) {
                            return `${lat},${lng}`;
                        }
                        
                        // Проверка на перепутанные координаты
                        if (isValidCoordinatePair(lng, lat)) {
                            return `${lng},${lat}`;
                        }
                    }

                    // Объект {lat, lng} или {latitude, longitude}
                    if (parsed && typeof parsed === 'object') {
                        if ('lat' in parsed && 'lng' in parsed) {
                            const lat = parseFloat(parsed.lat);
                            const lng = parseFloat(parsed.lng);
                            if (isValidCoordinatePair(lat, lng)) {
                                return `${lat},${lng}`;
                            }
                        }
                        
                        if ('latitude' in parsed && 'longitude' in parsed) {
                            const lat = parseFloat(parsed.latitude);
                            const lng = parseFloat(parsed.longitude);
                            if (isValidCoordinatePair(lat, lng)) {
                                return `${lat},${lng}`;
                            }
                        }
                    }
                }
            }
            
            // Для других строковых форматов, пытаемся извлечь числа
            const numbers = trimmed.match(/-?\d+(\.\d+)?/g);
            if (numbers && numbers.length >= 2) {
                const lat = parseFloat(numbers[0]);
                const lng = parseFloat(numbers[1]);
                
                if (isValidCoordinatePair(lat, lng)) {
                    return `${lat},${lng}`;
                }
                
                // Проверка на перепутанные координаты
                if (isValidCoordinatePair(lng, lat)) {
                    return `${lng},${lat}`;
                }
            }
        }

        // Если координаты представлены в виде объекта
        if (typeof coordinates === 'object' && coordinates !== null) {
            // Массив [lat, lng]
            if (Array.isArray(coordinates) && coordinates.length >= 2) {
                const lat = parseFloat(coordinates[0]);
                const lng = parseFloat(coordinates[1]);
                
                if (isValidCoordinatePair(lat, lng)) {
                    return `${lat},${lng}`;
                }
                
                // Проверка на перепутанные координаты
                if (isValidCoordinatePair(lng, lat)) {
                    return `${lng},${lat}`;
                }
            }

            // Объект {lat, lng}
            if ('lat' in coordinates && 'lng' in coordinates) {
                const lat = parseFloat(coordinates.lat);
                const lng = parseFloat(coordinates.lng);
                if (isValidCoordinatePair(lat, lng)) {
                    return `${lat},${lng}`;
                }
            }

            // Объект {latitude, longitude}
            if ('latitude' in coordinates && 'longitude' in coordinates) {
                const lat = parseFloat(coordinates.latitude);
                const lng = parseFloat(coordinates.longitude);
                if (isValidCoordinatePair(lat, lng)) {
                    return `${lat},${lng}`;
                }
            }
        }

        // Если ни один из форматов не подошел
        logData('Неизвестный формат координат:', coordinates);
        
        // Возвращаем строку, только если она похожа на координаты
        if (typeof coordinates === 'string' && coordinates.includes(',')) {
            return coordinates;
        }
        
        return null;
    } catch (error) {
        logData('Ошибка при нормализации координат:', error);
        return null;
    }
};

/**
 * Проверяет, являются ли координаты валидными
 * @param {string|object|array} coordinates - Координаты для проверки
 * @returns {boolean} - true, если координаты валидны
 */
export const isValidCoordinates = (coordinates) => {
    const normalized = normalizeCoordinates(coordinates);

    if (!normalized) {
        return false;
    }

    const [lat, lng] = normalized.split(',').map(Number);

    // Проверка на валидные границы широты и долготы
    return isValidCoordinatePair(lat, lng);
};

/**
 * Безопасно парсит координаты из строки в объект
 * @param {string} coordinatesString - Строка с координатами
 * @returns {object|null} - Объект {latitude, longitude} или null при ошибке
 */
export const parseCoordinates = (coordinatesString) => {
    const normalized = normalizeCoordinates(coordinatesString);

    if (!normalized) {
        return null;
    }

    const [lat, lng] = normalized.split(',').map(Number);

    if (isNaN(lat) || isNaN(lng)) {
        return null;
    }

    return {
        latitude: lat,
        longitude: lng
    };
};

/**
 * Преобразует координаты для безопасной отправки на сервер
 * @param {string|object|array} coordinates - Координаты в различных форматах
 * @returns {string} - Строка координат для сервера или пустая строка при ошибке
 */
export const prepareCoordinatesForServer = (coordinates) => {
    try {
        const normalized = normalizeCoordinates(coordinates);
        return normalized || '';
    } catch (error) {
        logData('Ошибка при подготовке координат для сервера:', error);
        return '';
    }
};

/**
 * Форматирует координаты для отображения пользователю
 * @param {string|object|array} coordinates - Координаты в различных форматах
 * @param {string} format - Формат отображения ("decimal" или "dms")
 * @returns {string} - Форматированная строка координат
 */
export const formatCoordinatesForDisplay = (coordinates, format = 'decimal') => {
    const normalized = normalizeCoordinates(coordinates);

    if (!normalized) {
        return '';
    }

    const [lat, lng] = normalized.split(',').map(Number);

    if (format === 'dms') {
        // Преобразование в формат градусы, минуты, секунды
        return `${convertToDMS(lat, 'lat')} ${convertToDMS(lng, 'lng')}`;
    }

    // Формат с десятичными градусами (по умолчанию)
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

/**
 * Преобразует десятичные градусы в формат градусы, минуты, секунды
 * @param {number} value - Значение координаты в десятичных градусах
 * @param {string} type - Тип координаты ('lat' или 'lng')
 * @returns {string} - Строка в формате DMS
 */
const convertToDMS = (value, type) => {
    const absolute = Math.abs(value);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

    const direction = type === 'lat'
        ? (value >= 0 ? 'N' : 'S')
        : (value >= 0 ? 'E' : 'W');

    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
};