/**
 * Универсальный хелпер для повторных попыток API запросов
 * Особенно полезен для загрузки файлов при нестабильном соединении
 */

/**
 * Задержка между попытками (экспоненциальная)
 * @param {number} attempt - номер попытки (начиная с 0)
 * @returns {Promise<void>}
 */
const delay = (attempt) => {
  const baseDelay = 1000; // 1 секунда базовая задержка
  const delayTime = Math.min(baseDelay * Math.pow(2, attempt), 10000); // максимум 10 секунд
  return new Promise(resolve => setTimeout(resolve, delayTime));
};

/**
 * Проверяет, является ли ошибка сетевой (стоит ли повторять запрос)
 * @param {Error} error - объект ошибки
 * @returns {boolean}
 */
const isRetryableError = (error) => {
  // Сетевые ошибки
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return true;
  }
  
  // Таймауты - ВАЖНО для медленных соединений
  if (error.code === 'ECONNABORTED' || 
      error.code === 'ETIMEDOUT' ||
      error.message?.includes('timeout') ||
      error.message?.includes('timed out') ||
      error.message?.toLowerCase().includes('превышено время')) {
    return true;
  }
  
  // Ошибки загрузки файлов
  if (error.message?.includes('загрузки файла') ||
      error.message?.includes('upload') ||
      error.message?.includes('Upload')) {
    return true;
  }
  
  // 5xx ошибки сервера (временные проблемы на сервере)
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return true;
  }
  
  // 408 Request Timeout
  if (error.response?.status === 408) {
    return true;
  }
  
  // 429 Too Many Requests (rate limiting) - стоит подождать и повторить
  if (error.response?.status === 429) {
    return true;
  }
  
  // 503 Service Unavailable
  if (error.response?.status === 503) {
    return true;
  }
  
  return false;
};

/**
 * Выполняет запрос с автоматическими повторными попытками
 * @param {Function} requestFunction - функция, выполняющая запрос (должна возвращать Promise)
 * @param {Object} options - настройки retry
 * @param {number} options.maxRetries - максимальное количество попыток (по умолчанию 3)
 * @param {Function} options.onRetry - callback при каждой повторной попытке (attempt, error) => void
 * @param {Function} options.shouldRetry - кастомная функция проверки, стоит ли повторять (error) => boolean
 * @returns {Promise<any>} - результат успешного запроса
 * @throws {Error} - ошибка последней неудачной попытки
 */
export const retryRequest = async (requestFunction, options = {}) => {
  const {
    maxRetries = 3,
    onRetry = null,
    shouldRetry = isRetryableError
  } = options;
  
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (__DEV__ && attempt > 0) {
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries}`);
      }
      
      // Выполняем запрос
      const result = await requestFunction();
      
      if (__DEV__ && attempt > 0) {
        console.log(`✅ Request succeeded on attempt ${attempt + 1}`);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Проверяем, стоит ли повторять запрос
      const shouldRetryThisError = shouldRetry(error);
      const hasMoreAttempts = attempt < maxRetries;
      
      if (__DEV__) {
        console.log(`❌ Request failed on attempt ${attempt + 1}/${maxRetries + 1}`, {
          error: error.message,
          code: error.code,
          status: error.response?.status,
          shouldRetry: shouldRetryThisError,
          hasMoreAttempts
        });
      }
      
      // Если это последняя попытка или ошибка не подлежит повтору
      if (!hasMoreAttempts || !shouldRetryThisError) {
        if (__DEV__) {
          console.log(`❌ Giving up after ${attempt + 1} attempts`);
        }
        throw error;
      }
      
      // Вызываем callback перед повтором
      if (onRetry) {
        onRetry(attempt + 1, error);
      }
      
      // Ждем перед следующей попыткой
      await delay(attempt);
    }
  }
  
  // Если дошли сюда, выбрасываем последнюю ошибку
  throw lastError;
};

/**
 * Специализированная функция для загрузки файлов с автоматическими повторными попытками
 * @param {Function} uploadFunction - функция загрузки файла
 * @param {Object} options - настройки
 * @param {number} options.maxRetries - максимальное количество попыток (по умолчанию 5 для файлов)
 * @param {Function} options.onRetry - callback при каждой повторной попытке
 * @returns {Promise<any>}
 */
export const retryFileUpload = async (uploadFunction, options = {}) => {
  return retryRequest(uploadFunction, {
    maxRetries: options.maxRetries || 5, // Для файлов больше попыток
    onRetry: options.onRetry,
    shouldRetry: (error) => {
      // Для файлов более агрессивный retry
      return isRetryableError(error) || 
             error.message?.includes('upload') ||
             error.message?.includes('file');
    }
  });
};

/**
 * Вспомогательная функция для форматирования сообщения о повторной попытке
 * @param {number} attempt - номер попытки
 * @param {number} maxRetries - максимальное количество попыток
 * @returns {string}
 */
export const formatRetryMessage = (attempt, maxRetries) => {
  if (attempt === 1) {
    return 'Повторная попытка соединения...';
  }
  return `Попытка ${attempt} из ${maxRetries}...`;
};

