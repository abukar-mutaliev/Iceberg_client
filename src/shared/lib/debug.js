// src/shared/utils/debug.js

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Debug configuration
export const DEBUG_CONFIG = {
    enabled: __DEV__,
    logToFile: true,
    logToConsole: true,
    maxLogFileSize: 5 * 1024 * 1024, // 5MB
    categories: {
        AUTH: true,
        API: true,
        NAVIGATION: true,
        REDUX: true,
        FONTS: true,
        INIT: true,
        ERROR: true,
        NETWORK: true,
        STORAGE: true,
    }
};

// Log levels
export const LOG_LEVELS = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    FATAL: 'FATAL'
};

// Logger class
class DebugLogger {
    constructor() {
        this.logs = [];
        this.logFilePath = `${FileSystem.documentDirectory}debug-logs.txt`;
        this.sessionId = Date.now().toString();
        this.deviceInfo = this.getDeviceInfo();

        this.initializeLogger();
    }

    getDeviceInfo() {
        return {
            platform: Platform.OS,
            version: Platform.Version,
            isTV: Platform.isTV,
            constants: Platform.constants,
        };
    }

    async initializeLogger() {
        if (!DEBUG_CONFIG.enabled) return;

        try {
            // Создаем или очищаем файл логов
            const fileInfo = await FileSystem.getInfoAsync(this.logFilePath);
            if (fileInfo.exists && fileInfo.size > DEBUG_CONFIG.maxLogFileSize) {
                await FileSystem.deleteAsync(this.logFilePath);
            }

            // Записываем начальную информацию о сессии
            await this.writeToFile(`\n\n========== NEW SESSION ${this.sessionId} ==========\n`);
            await this.writeToFile(`Device Info: ${JSON.stringify(this.deviceInfo, null, 2)}\n`);
            await this.writeToFile(`Timestamp: ${new Date().toISOString()}\n`);
            await this.writeToFile(`========================================\n\n`);
        } catch (error) {
            console.error('Failed to initialize logger:', error);
        }
    }

    async writeToFile(content) {
        if (!DEBUG_CONFIG.logToFile) return;

        try {
            await FileSystem.writeAsStringAsync(
                this.logFilePath,
                content,
                { append: true }
            );
        } catch (error) {
            console.error('Failed to write log to file:', error);
        }
    }

    formatLog(level, category, message, data) {
        const timestamp = new Date().toISOString();
        let formattedLog = `[${timestamp}] [${level}] [${category}] ${message}`;

        if (data) {
            try {
                formattedLog += `\nData: ${JSON.stringify(data, null, 2)}`;
            } catch (e) {
                formattedLog += `\nData: [Circular or non-serializable object]`;
            }
        }

        return formattedLog;
    }

    log(level, category, message, data = null) {
        if (!DEBUG_CONFIG.enabled) return;
        if (!DEBUG_CONFIG.categories[category]) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            data,
            sessionId: this.sessionId
        };

        // Сохраняем в памяти
        this.logs.push(logEntry);
        if (this.logs.length > 1000) {
            this.logs.shift(); // Удаляем старые логи
        }

        // Выводим в консоль
        if (DEBUG_CONFIG.logToConsole) {
            const formattedLog = this.formatLog(level, category, message, data);

            switch (level) {
                case LOG_LEVELS.ERROR:
                case LOG_LEVELS.FATAL:
                    console.error(formattedLog);
                    break;
                case LOG_LEVELS.WARN:
                    console.warn(formattedLog);
                    break;
                default:
                    console.log(formattedLog);
            }
        }

        // Записываем в файл
        this.writeToFile(this.formatLog(level, category, message, data) + '\n\n');

        // Отправляем в глобальное хранилище для UI
        if (global.debugLogs) {
            global.debugLogs.push(logEntry);
            if (global.debugLogs.length > 500) {
                global.debugLogs.shift();
            }
        }
    }

    debug(category, message, data) {
        this.log(LOG_LEVELS.DEBUG, category, message, data);
    }

    info(category, message, data) {
        this.log(LOG_LEVELS.INFO, category, message, data);
    }

    warn(category, message, data) {
        this.log(LOG_LEVELS.WARN, category, message, data);
    }

    error(category, message, data) {
        this.log(LOG_LEVELS.ERROR, category, message, data);
    }

    fatal(category, message, data) {
        this.log(LOG_LEVELS.FATAL, category, message, data);
    }

    async exportLogs() {
        try {
            const logs = await FileSystem.readAsStringAsync(this.logFilePath);
            return logs;
        } catch (error) {
            console.error('Failed to export logs:', error);
            return JSON.stringify(this.logs, null, 2);
        }
    }

    async clearLogs() {
        this.logs = [];
        global.debugLogs = [];

        try {
            await FileSystem.deleteAsync(this.logFilePath);
            await this.initializeLogger();
        } catch (error) {
            console.error('Failed to clear logs:', error);
        }
    }

    getRecentLogs(count = 50) {
        return this.logs.slice(-count);
    }

    getLogsByCategory(category) {
        return this.logs.filter(log => log.category === category);
    }

    getErrorLogs() {
        return this.logs.filter(log =>
            log.level === LOG_LEVELS.ERROR || log.level === LOG_LEVELS.FATAL
        );
    }
}

// Singleton instance
export const logger = new DebugLogger();

// Helper functions
export const debugLog = (category, message, data) => {
    logger.debug(category, message, data);
};

export const logInfo = (category, message, data) => {
    logger.info(category, message, data);
};

export const logWarn = (category, message, data) => {
    logger.warn(category, message, data);
};

export const logError = (category, message, data) => {
    logger.error(category, message, data);
};

export const logFatal = (category, message, data) => {
    logger.fatal(category, message, data);
};

// Performance monitoring
export class PerformanceMonitor {
    constructor(name) {
        this.name = name;
        this.startTime = Date.now();
        this.marks = [];
    }

    mark(label) {
        const now = Date.now();
        const elapsed = now - this.startTime;
        const lastMark = this.marks.length > 0 ? this.marks[this.marks.length - 1] : null;
        const sinceLastMark = lastMark ? now - lastMark.timestamp : elapsed;

        const mark = {
            label,
            timestamp: now,
            elapsed,
            sinceLastMark
        };

        this.marks.push(mark);

        debugLog('PERFORMANCE', `${this.name} - ${label}`, {
            elapsed: `${elapsed}ms`,
            sinceLastMark: `${sinceLastMark}ms`
        });

        return mark;
    }

    end() {
        const totalTime = Date.now() - this.startTime;

        debugLog('PERFORMANCE', `${this.name} - Completed`, {
            totalTime: `${totalTime}ms`,
            marks: this.marks.map(m => ({
                label: m.label,
                elapsed: `${m.elapsed}ms`,
                sinceLastMark: `${m.sinceLastMark}ms`
            }))
        });

        return {
            name: this.name,
            totalTime,
            marks: this.marks
        };
    }
}

// Network monitoring
export const networkMonitor = {
    requests: [],

    logRequest(config) {
        if (!DEBUG_CONFIG.enabled) return;

        const requestId = Date.now().toString();
        const request = {
            id: requestId,
            url: config.url,
            method: config.method,
            headers: config.headers,
            timestamp: new Date().toISOString(),
            data: config.data
        };

        this.requests.push(request);

        debugLog('NETWORK', `Request: ${config.method} ${config.url}`, {
            id: requestId,
            headers: config.headers,
            data: config.data
        });

        return requestId;
    },

    logResponse(requestId, response) {
        if (!DEBUG_CONFIG.enabled) return;

        const request = this.requests.find(r => r.id === requestId);
        if (request) {
            request.response = {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: response.data,
                duration: Date.now() - new Date(request.timestamp).getTime()
            };

            debugLog('NETWORK', `Response: ${response.status} ${request.url}`, {
                id: requestId,
                duration: `${request.response.duration}ms`,
                status: response.status,
                data: response.data
            });
        }
    },

    logError(requestId, error) {
        if (!DEBUG_CONFIG.enabled) return;

        const request = this.requests.find(r => r.id === requestId);
        if (request) {
            request.error = {
                message: error.message,
                code: error.code,
                response: error.response?.data,
                duration: Date.now() - new Date(request.timestamp).getTime()
            };

            logError('NETWORK', `Request failed: ${request.url}`, {
                id: requestId,
                duration: `${request.error.duration}ms`,
                error: error.message,
                response: error.response?.data
            });
        }
    },

    getRecentRequests(count = 20) {
        return this.requests.slice(-count);
    },

    getFailedRequests() {
        return this.requests.filter(r => r.error);
    },

    getSlowRequests(threshold = 2000) {
        return this.requests.filter(r =>
            r.response && r.response.duration > threshold
        );
    },

    clear() {
        this.requests = [];
    }
};

// Redux action logger
export const reduxLogger = {
    actions: [],

    logAction(action, prevState, nextState) {
        if (!DEBUG_CONFIG.enabled) return;

        const actionLog = {
            type: action.type,
            payload: action.payload,
            timestamp: new Date().toISOString(),
            prevState: this.getStateDiff(prevState),
            nextState: this.getStateDiff(nextState),
            stateChanged: JSON.stringify(prevState) !== JSON.stringify(nextState)
        };

        this.actions.push(actionLog);

        debugLog('REDUX', `Action: ${action.type}`, {
            payload: action.payload,
            stateChanged: actionLog.stateChanged
        });
    },

    getStateDiff(state) {
        // Получаем только ключи верхнего уровня для избежания слишком больших логов
        const summary = {};
        for (const key in state) {
            if (typeof state[key] === 'object' && state[key] !== null) {
                summary[key] = `[${typeof state[key]}] ${Object.keys(state[key]).length} keys`;
            } else {
                summary[key] = state[key];
            }
        }
        return summary;
    },

    getRecentActions(count = 50) {
        return this.actions.slice(-count);
    },

    getActionsByType(type) {
        return this.actions.filter(a => a.type === type);
    },

    clear() {
        this.actions = [];
    }
};

// Memory monitor
export const memoryMonitor = {
    snapshots: [],

    takeSnapshot(label) {
        if (!DEBUG_CONFIG.enabled) return;

        const snapshot = {
            label,
            timestamp: new Date().toISOString(),
            jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit,
            totalJSHeapSize: performance.memory?.totalJSHeapSize,
            usedJSHeapSize: performance.memory?.usedJSHeapSize,
        };

        this.snapshots.push(snapshot);

        debugLog('MEMORY', `Snapshot: ${label}`, {
            used: `${(snapshot.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
            total: `${(snapshot.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
            limit: `${(snapshot.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
        });

        return snapshot;
    },

    getSnapshots() {
        return this.snapshots;
    },

    detectLeaks() {
        if (this.snapshots.length < 2) return null;

        const recent = this.snapshots.slice(-10);
        const first = recent[0];
        const last = recent[recent.length - 1];

        const growth = last.usedJSHeapSize - first.usedJSHeapSize;
        const growthPercentage = (growth / first.usedJSHeapSize) * 100;

        if (growthPercentage > 20) {
            logWarn('MEMORY', 'Potential memory leak detected', {
                growth: `${(growth / 1024 / 1024).toFixed(2)} MB`,
                percentage: `${growthPercentage.toFixed(2)}%`
            });
        }

        return {
            growth,
            growthPercentage,
            snapshots: recent
        };
    },

    clear() {
        this.snapshots = [];
    }
};

// Crash reporter
export const crashReporter = {
    crashes: [],

    reportCrash(error, context = {}) {
        const crash = {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context,
            deviceInfo: logger.deviceInfo,
            sessionId: logger.sessionId
        };

        this.crashes.push(crash);

        logFatal('CRASH', error.message, {
            stack: error.stack,
            context
        });

        // Сохраняем краш в файл
        this.saveCrashReport(crash);

        return crash;
    },

    async saveCrashReport(crash) {
        try {
            const crashFilePath = `${FileSystem.documentDirectory}crash-${crash.timestamp.replace(/:/g, '-')}.json`;
            await FileSystem.writeAsStringAsync(
                crashFilePath,
                JSON.stringify(crash, null, 2)
            );
        } catch (error) {
            console.error('Failed to save crash report:', error);
        }
    },

    async getCrashReports() {
        try {
            const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
            const crashFiles = files.filter(f => f.startsWith('crash-'));

            const reports = [];
            for (const file of crashFiles) {
                const content = await FileSystem.readAsStringAsync(
                    `${FileSystem.documentDirectory}${file}`
                );
                reports.push(JSON.parse(content));
            }

            return reports;
        } catch (error) {
            console.error('Failed to read crash reports:', error);
            return this.crashes;
        }
    },

    async clearCrashReports() {
        try {
            const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
            const crashFiles = files.filter(f => f.startsWith('crash-'));

            for (const file of crashFiles) {
                await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${file}`);
            }

            this.crashes = [];
        } catch (error) {
            console.error('Failed to clear crash reports:', error);
        }
    }
};

// Export all debug utilities
export default {
    logger,
    debugLog,
    logInfo,
    logWarn,
    logError,
    logFatal,
    PerformanceMonitor,
    networkMonitor,
    reduxLogger,
    memoryMonitor,
    crashReporter,
    DEBUG_CONFIG,
    LOG_LEVELS
};