const LOG_PREFIX = '💳 [Payment]';

export const PaymentLogger = {
    log: () => {},
    success: () => {},

    error: (message, ...args) => {
        console.error(`${LOG_PREFIX} ${message}`, ...args);
    },

    warn: (message, ...args) => {
        console.warn(`${LOG_PREFIX} ${message}`, ...args);
    }
};
