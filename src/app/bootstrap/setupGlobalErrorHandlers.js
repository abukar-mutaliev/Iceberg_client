import { initConsolePolyfill } from '@shared/lib/consolePolyfill';

let isConfigured = false;

export const setupGlobalErrorHandlers = () => {
    if (isConfigured) return;
    isConfigured = true;

    initConsolePolyfill();

    if (typeof ErrorUtils !== 'undefined') {
        const originalGlobalHandler = ErrorUtils.getGlobalHandler();

        ErrorUtils.setGlobalHandler((error, isFatal) => {
            const errorInfo = {
                message: error?.message || 'Unknown error',
                stack: error?.stack || 'No stack trace',
                name: error?.name || 'Error',
                isFatal: isFatal || false,
                timestamp: new Date().toISOString(),
            };

            console.error('🚨 GLOBAL ERROR HANDLER:', errorInfo);
            console.error('🚨 Error details:', JSON.stringify(errorInfo, null, 2));

            if (error?.stack) {
                console.error('🚨 Stack trace:', error.stack);
            }

            if (originalGlobalHandler) {
                originalGlobalHandler(error, isFatal);
            }
        });
    }

    if (typeof global !== 'undefined') {
        const originalUnhandledRejection = global.onunhandledrejection;

        global.onunhandledrejection = (event) => {
            const errorInfo = {
                reason: event?.reason || 'Unknown rejection',
                message: event?.reason?.message || String(event?.reason || 'Unhandled promise rejection'),
                stack: event?.reason?.stack || 'No stack trace',
                timestamp: new Date().toISOString(),
            };

            console.error('🚨 UNHANDLED PROMISE REJECTION:', errorInfo);
            console.error('🚨 Rejection details:', JSON.stringify(errorInfo, null, 2));

            if (originalUnhandledRejection) {
                originalUnhandledRejection(event);
            }
        };
    }
};
