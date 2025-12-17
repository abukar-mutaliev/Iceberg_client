/**
 * Centralized Logger for Push Notifications
 * Sends logs both to console and to diagnostic screen
 */

class PushLogger {
    constructor() {
        this.listeners = [];
    }

    // Add listener for diagnostic screen
    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }

    // Remove listener
    removeListener(callback) {
        this.listeners = this.listeners.filter(cb => cb !== callback);
    }

    // Clear all listeners
    clearListeners() {
        this.listeners = [];
    }

    // Emit log to all listeners
    emit(message, type = 'info') {
        this.listeners.forEach(listener => {
            try {
                listener(message, type);
            } catch (e) {
                // Ignore listener errors
            }
        });
    }

    // Log with different levels
    log(message) {
        console.log(message);
        this.emit(message, 'info');
    }

    info(message) {
        console.log(message);
        this.emit(message, 'info');
    }

    success(message) {
        console.log(message);
        this.emit(message, 'success');
    }

    warn(message) {
        console.warn(message);
        this.emit(message, 'warning');
    }

    error(message) {
        console.error(message);
        this.emit(message, 'error');
    }

    // Formatted logs for OneSignal
    oneSignal(message, type = 'info') {
        const formatted = `[OneSignal] ${message}`;
        console.log(formatted);
        this.emit(formatted, type);
    }

    // Formatted logs for PushService
    pushService(message, type = 'info') {
        const formatted = `[PushService] ${message}`;
        console.log(formatted);
        this.emit(formatted, type);
    }
}

// Export singleton
const pushLogger = new PushLogger();
export default pushLogger;





