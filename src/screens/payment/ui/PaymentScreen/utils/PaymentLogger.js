// ==========================================
// PaymentScreen/utils/PaymentLogger.js
// Утилита для логирования
// ==========================================

const LOG_PREFIX = '💳 [Payment]';

export const PaymentLogger = {
    log: (message, ...args) => {
        console.log(`${LOG_PREFIX} ${message}`, ...args);
    },

    success: (message, ...args) => {
        console.log(`✅ ${LOG_PREFIX} ${message}`, ...args);
    },

    error: (message, ...args) => {
        console.error(`❌ ${LOG_PREFIX} ${message}`, ...args);
    },

    warn: (message, ...args) => {
        console.warn(`⚠️ ${LOG_PREFIX} ${message}`, ...args);
    }
};


