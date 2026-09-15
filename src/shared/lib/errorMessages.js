/**
 * Приведение любой ошибки (axios, тело ответа сервера, строка, Error)
 * к тексту, который можно показать пользователю.
 */

export const DEFAULT_ERROR_MESSAGE = 'Что-то пошло не так. Попробуйте ещё раз.';

export const NETWORK_ERROR_MESSAGE =
    'Нет связи с сервером. Проверьте подключение к интернету и попробуйте снова.';

const STATUS_MESSAGES = {
    400: 'Проверьте введённые данные и попробуйте снова.',
    401: 'Не удалось подтвердить вход. Начните авторизацию заново.',
    403: 'Доступ к этому действию закрыт.',
    404: 'Сервис временно недоступен. Попробуйте позже.',
    408: 'Сервер не ответил вовремя. Попробуйте ещё раз.',
    409: 'Такие данные уже используются.',
    422: 'Проверьте введённые данные и попробуйте снова.',
    429: 'Слишком много попыток. Подождите немного и попробуйте снова.',
    500: 'На сервере произошла ошибка. Попробуйте позже.',
    502: 'Сервер временно недоступен. Попробуйте через минуту.',
    503: 'Сервис временно недоступен. Попробуйте через минуту.',
    504: 'Сервер не успел ответить. Попробуйте ещё раз.',
};

// Тексты, которые пришли из транспорта или библиотек — пользователю они ничего не объясняют.
const TECHNICAL_MESSAGE_PATTERNS = [
    /^\s*$/,
    /^(undefined|null|\[object [a-z]+\])$/i,
    /^unknown error$/i,
    /network error/i,
    /request failed with status/i,
    /^axios/i,
    /^err_/i,
    /^e[a-z]{3,}$/i, // ECONNABORTED, ETIMEDOUT и подобные
    /timeout of \d+ms exceeded/i,
    /^не авторизован$/i,
    /^unauthorized$/i,
    /^forbidden$/i,
    /^internal server error$/i,
    /^bad gateway$/i,
    /^service unavailable$/i,
    /json parse error/i,
    /^\{.*\}$/,
];

const NETWORK_CODES = new Set([
    'ERR_NETWORK',
    'ECONNABORTED',
    'ECONNREFUSED',
    'ECONNRESET',
    'ENOTFOUND',
    'ENETUNREACH',
    'EHOSTUNREACH',
    'ETIMEDOUT',
    'EAI_AGAIN',
]);

// Статус может лежать в разных полях: у axios — в response.status,
// у тела ответа сервера — в code, у части хелперов — в status.
const readStatus = (error) => {
    if (!error || typeof error !== 'object') return null;

    const candidates = [error.response?.status, error.status, error.code, error.statusCode];
    for (const candidate of candidates) {
        const parsed = Number(candidate);
        if (Number.isInteger(parsed) && parsed >= 100 && parsed <= 599) {
            return parsed;
        }
    }
    return null;
};

/** Похоже ли, что связи с сервером не было вовсе. */
export const looksLikeNetworkError = (error) => {
    if (!error) return false;
    if (typeof error === 'string') {
        return /(network|интернет|соедин|подключ|timeout|таймаут)/i.test(error);
    }
    if (error.isNetworkError || error.isWatchdogTimeout) return true;
    if (error.response) return false;
    if (NETWORK_CODES.has(error.code) || NETWORK_CODES.has(error.originalError?.code)) return true;

    const message = String(error.message || '').toLowerCase();
    return (
        message.includes('network') ||
        message.includes('failed to fetch') ||
        message.includes('timeout') ||
        message.includes('интернет') ||
        message.includes('соедин')
    );
};

const isTechnicalMessage = (message) =>
    TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));

const collectFieldErrors = (error) => {
    const list = error?.errors || error?.response?.data?.errors || error?.details;
    if (!Array.isArray(list)) return '';
    return list
        .map((item) => item?.message || item?.msg || '')
        .filter(Boolean)
        .join('\n');
};

const collectRawMessage = (error) => {
    if (!error) return '';
    if (typeof error === 'string') return error;

    return (
        error.response?.data?.message ||
        error.data?.message ||
        error.userMessage ||
        error.message ||
        error.error ||
        ''
    );
};

/**
 * Возвращает понятный пользователю текст ошибки.
 *
 * @param {*} error - ошибка любого происхождения
 * @param {string} [fallback] - что показать, если внятного текста нет
 * @returns {string}
 */
export const getUserFriendlyError = (error, fallback = DEFAULT_ERROR_MESSAGE) => {
    if (!error) return fallback;

    if (looksLikeNetworkError(error)) {
        return NETWORK_ERROR_MESSAGE;
    }

    const fieldErrors = collectFieldErrors(error);
    const raw = String(collectRawMessage(error)).trim();

    if (raw && !isTechnicalMessage(raw)) {
        return fieldErrors && !raw.includes(fieldErrors) ? `${raw}\n${fieldErrors}` : raw;
    }

    if (fieldErrors) {
        return fieldErrors;
    }

    const status = readStatus(error);
    if (status && STATUS_MESSAGES[status]) {
        return STATUS_MESSAGES[status];
    }
    if (status && status >= 500) {
        return STATUS_MESSAGES[500];
    }

    return fallback;
};
