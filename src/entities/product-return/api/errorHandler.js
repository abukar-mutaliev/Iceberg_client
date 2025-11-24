/**
 * Обработчик ошибок API для возвратов товаров
 * @module product-return/api/errorHandler
 */

/**
 * Класс кастомной ошибки API возвратов
 */
export class ProductReturnApiError extends Error {
  /**
   * @param {string} message - Сообщение об ошибке
   * @param {number} [statusCode] - HTTP код ошибки
   * @param {any} [response] - Ответ сервера
   */
  constructor(message, statusCode, response) {
    super(message);
    this.name = 'ProductReturnApiError';
    this.statusCode = statusCode;
    this.response = response;
    
    // Поддержка stack trace в V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ProductReturnApiError);
    }
  }
}

/**
 * Обрабатывает ошибки API и возвращает понятное сообщение
 * @param {Error|Object} error - Объект ошибки
 * @returns {string} Сообщение об ошибке для пользователя
 */
export const handleApiError = (error) => {
  // Если это уже ProductReturnApiError, возвращаем её сообщение
  if (error instanceof ProductReturnApiError) {
    return error.message;
  }

  // Если есть response от сервера
  if (error.response) {
    const message = error.response.data?.message || error.response.data?.error;
    const status = error.response.status;
    
    switch (status) {
      case 400:
        return message || 'Неверные данные запроса. Проверьте введенные данные';
      
      case 401:
        return 'Требуется авторизация. Пожалуйста, войдите в систему';
      
      case 403:
        return message || 'Недостаточно прав для выполнения этой операции';
      
      case 404:
        return message || 'Запрашиваемый ресурс не найден';
      
      case 409:
        return message || 'Конфликт данных. Возможно, запись уже существует';
      
      case 422:
        return message || 'Ошибка валидации данных';
      
      case 429:
        return 'Слишком много запросов. Пожалуйста, попробуйте позже';
      
      case 500:
        return message || 'Ошибка сервера. Пожалуйста, попробуйте позже';
      
      case 502:
        return 'Сервер временно недоступен. Попробуйте позже';
      
      case 503:
        return 'Сервис временно недоступен. Ведутся технические работы';
      
      default:
        return message || `Ошибка сервера (код ${status})`;
    }
  }
  
  // Если запрос был отправлен, но ответа не было
  if (error.request) {
    return 'Нет связи с сервером. Проверьте подключение к интернету';
  }
  
  // Ошибка при настройке запроса или другая ошибка
  if (error.message) {
    // Специфичные сетевые ошибки
    if (error.message.includes('Network Error')) {
      return 'Ошибка сети. Проверьте подключение к интернету';
    }
    if (error.message.includes('timeout')) {
      return 'Превышено время ожидания ответа от сервера';
    }
    return error.message;
  }
  
  // Неизвестная ошибка
  return 'Произошла неизвестная ошибка. Попробуйте еще раз';
};

/**
 * Создает ProductReturnApiError из любой ошибки
 * @param {Error|Object} error - Исходная ошибка
 * @returns {ProductReturnApiError} Кастомная ошибка
 */
export const createApiError = (error) => {
  const message = handleApiError(error);
  const statusCode = error.response?.status;
  const response = error.response?.data;
  
  return new ProductReturnApiError(message, statusCode, response);
};

/**
 * Проверяет, является ли ошибка ошибкой авторизации
 * @param {Error|Object} error - Ошибка
 * @returns {boolean} true если это ошибка авторизации
 */
export const isAuthError = (error) => {
  return error.response?.status === 401;
};

/**
 * Проверяет, является ли ошибка ошибкой прав доступа
 * @param {Error|Object} error - Ошибка
 * @returns {boolean} true если это ошибка прав доступа
 */
export const isForbiddenError = (error) => {
  return error.response?.status === 403;
};

/**
 * Проверяет, является ли ошибка ошибкой валидации
 * @param {Error|Object} error - Ошибка
 * @returns {boolean} true если это ошибка валидации
 */
export const isValidationError = (error) => {
  return error.response?.status === 400 || error.response?.status === 422;
};

/**
 * Проверяет, является ли ошибка сетевой ошибкой
 * @param {Error|Object} error - Ошибка
 * @returns {boolean} true если это сетевая ошибка
 */
export const isNetworkError = (error) => {
  return !error.response && error.request;
};

/**
 * Извлекает поля с ошибками валидации из ответа сервера
 * @param {Error|Object} error - Ошибка
 * @returns {Object|null} Объект с полями и их ошибками
 */
export const getValidationErrors = (error) => {
  if (!isValidationError(error)) {
    return null;
  }
  
  const errors = error.response?.data?.errors || error.response?.data?.validationErrors;
  
  if (!errors) {
    return null;
  }
  
  // Если errors это объект вида { field: ['error1', 'error2'] }
  if (typeof errors === 'object' && !Array.isArray(errors)) {
    return errors;
  }
  
  // Если errors это массив объектов вида [{ field: 'name', message: 'error' }]
  if (Array.isArray(errors)) {
    return errors.reduce((acc, err) => {
      if (err.field && err.message) {
        acc[err.field] = acc[err.field] || [];
        acc[err.field].push(err.message);
      }
      return acc;
    }, {});
  }
  
  return null;
};

