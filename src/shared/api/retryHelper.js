/**
 * Универсальный хелпер для повторных попыток API запросов
 * Особенно полезен для загрузки файлов при нестабильном соединении
 */
import NetInfo from '@react-native-community/netinfo';

/**
 * Задержка между попытками (экспоненциальная)
 * @param {number} attempt - номер попытки (начиная с 0)
 * @returns {Promise<void>}
 */
const delay = (attempt, options = {}) => {
  const {
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    jitter = true
  } = options;
  const rawDelay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
  const jitterFactor = jitter ? (0.6 + Math.random() * 0.8) : 1;
  const delayTime = Math.round(rawDelay * jitterFactor);
  return new Promise(resolve => setTimeout(resolve, delayTime));
};

const getErrorMessage = (error) => {
  if (!error) return '';
  return (
    error.message ||
    error.error ||
    error.response?.data?.message ||
    error.originalError?.message ||
    error.originalError?.response?.data?.message ||
    ''
  );
};

const getErrorCode = (error) => {
  return error?.code || error?.originalError?.code || error?.errorCode || '';
};

const getStatusCode = (error) => {
  return error?.response?.status || error?.status || error?.code || null;
};

export const waitForConnection = async (timeoutMs = 20000) => {
  try {
    const state = await NetInfo.fetch();
    const isOnline = state.isConnected && state.isInternetReachable !== false;
    if (isOnline) {
      return true;
    }

    return await new Promise((resolve) => {
      let timeoutId = null;
      const unsubscribe = NetInfo.addEventListener(nextState => {
        const online = nextState.isConnected && nextState.isInternetReachable !== false;
        if (online) {
          if (timeoutId) clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      });

      timeoutId = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeoutMs);
    });
  } catch (error) {
    return false;
  }
};

/**
 * Проверяет, является ли ошибка сетевой (стоит ли повторять запрос)
 * @param {Error} error - объект ошибки
 * @returns {boolean}
 */
const isRetryableError = (error) => {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  const status = getStatusCode(error);
  const messageLower = String(message || '').toLowerCase();

  // Сетевые ошибки
  if (code === 'ERR_NETWORK' || message === 'Network Error') {
    return true;
  }

  if (!error?.response && (
      messageLower.includes('network') ||
      messageLower.includes('internet') ||
      messageLower.includes('интернет') ||
      messageLower.includes('соедин') ||
      messageLower.includes('сетев')
    )) {
    return true;
  }
  
  // Таймауты - ВАЖНО для медленных соединений
  if (code === 'ECONNABORTED' || 
      code === 'ETIMEDOUT' ||
      messageLower.includes('timeout') ||
      messageLower.includes('timed out') ||
      messageLower.includes('превышено время')) {
    return true;
  }
  
  // Ошибки загрузки файлов
  if (messageLower.includes('загрузки файла') ||
      messageLower.includes('upload') ||
      messageLower.includes('file')) {
    return true;
  }
  
  // 5xx ошибки сервера (временные проблемы на сервере)
  if (status >= 500 && status < 600) {
    return true;
  }
  
  // 408 Request Timeout
  if (status === 408) {
    return true;
  }
  
  // 429 Too Many Requests (rate limiting) - стоит подождать и повторить
  if (status === 429) {
    return true;
  }
  
  // 503 Service Unavailable
  if (status === 503) {
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
    shouldRetry = isRetryableError,
    waitForConnection: shouldWaitForConnection = false,
    connectionTimeoutMs = 20000,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    jitter = true
  } = options;
  
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (shouldWaitForConnection) {
        const isOnline = await waitForConnection(connectionTimeoutMs);
        if (!isOnline) {
          throw new Error('Отсутствует подключение к интернету');
        }
      }

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
          error: getErrorMessage(error),
          code: getErrorCode(error),
          status: getStatusCode(error),
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
      await delay(attempt, { baseDelayMs, maxDelayMs, jitter });
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
    waitForConnection: options.waitForConnection,
    connectionTimeoutMs: options.connectionTimeoutMs,
    baseDelayMs: options.baseDelayMs,
    maxDelayMs: options.maxDelayMs,
    jitter: options.jitter,
    shouldRetry: (error) => {
      // Для файлов более агрессивный retry
      const message = getErrorMessage(error).toLowerCase();
      return isRetryableError(error) ||
             message.includes('upload') ||
             message.includes('file') ||
             message.includes('загрузк');
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

