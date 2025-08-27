/**
 * Утилиты для безопасной отладки в production сборках
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEBUG_STORAGE_KEY = '@iceberg_debug_logs';
const MAX_LOGS = 100; // Максимальное количество логов в памяти

/**
 * Класс для безопасного логирования в production
 */
class ProductionDebugger {
    constructor() {
        this.logs = [];
        this.isEnabled = false;
        this.init();
    }

    async init() {
        try {
            const enabled = await AsyncStorage.getItem('@iceberg_debug_enabled');
            this.isEnabled = enabled === 'true';
            
            if (this.isEnabled) {
                const savedLogs = await AsyncStorage.getItem(DEBUG_STORAGE_KEY);
                if (savedLogs) {
                    this.logs = JSON.parse(savedLogs);
                }
            }
        } catch (error) {
            // Игнорируем ошибки инициализации
        }
    }

    /**
     * Включить/выключить отладку
     */
    async setEnabled(enabled) {
        this.isEnabled = enabled;
        try {
            await AsyncStorage.setItem('@iceberg_debug_enabled', enabled.toString());
            if (!enabled) {
                await this.clearLogs();
            }
        } catch (error) {
            // Игнорируем ошибки сохранения
        }
    }

    /**
     * Добавить лог
     */
    async log(level, message, data = null, component = 'App') {
        if (!this.isEnabled && __DEV__) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data: data ? JSON.stringify(data) : null,
            component
        };

        this.logs.push(logEntry);

        // Ограничиваем количество логов
        if (this.logs.length > MAX_LOGS) {
            this.logs = this.logs.slice(-MAX_LOGS);
        }

        try {
            await AsyncStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(this.logs));
        } catch (error) {
            // Если не можем сохранить, удаляем старые логи
            this.logs = this.logs.slice(-50);
        }
    }

    /**
     * Получить все логи
     */
    getLogs() {
        return this.logs;
    }

    /**
     * Очистить логи
     */
    async clearLogs() {
        this.logs = [];
        try {
            await AsyncStorage.removeItem(DEBUG_STORAGE_KEY);
        } catch (error) {
            // Игнорируем ошибки
        }
    }

    /**
     * Экспортировать логи как строку
     */
    exportLogs() {
        return this.logs.map(log => 
            `[${log.timestamp}] [${log.component}] ${log.level.toUpperCase()}: ${log.message}${log.data ? ` | Data: ${log.data}` : ''}`
        ).join('\n');
    }

    /**
     * Получить статистику логов
     */
    getStats() {
        const stats = {
            total: this.logs.length,
            errors: 0,
            warnings: 0,
            info: 0,
            lastLog: this.logs.length > 0 ? this.logs[this.logs.length - 1] : null
        };

        this.logs.forEach(log => {
            switch (log.level) {
                case 'error':
                    stats.errors++;
                    break;
                case 'warn':
                    stats.warnings++;
                    break;
                default:
                    stats.info++;
            }
        });

        return stats;
    }
}

// Создаем глобальный экземпляр
const productionDebugger = new ProductionDebugger();

/**
 * Безопасные методы логирования для production
 */
export const prodLog = {
    info: (message, data, component) => {
        productionDebugger.log('info', message, data, component);
    },
    warn: (message, data, component) => {
        productionDebugger.log('warn', message, data, component);
    },
    error: (message, data, component) => {
        productionDebugger.log('error', message, data, component);
    }
};

/**
 * Утилиты для управления отладкой
 */
export const debugUtils = {
    enable: () => productionDebugger.setEnabled(true),
    disable: () => productionDebugger.setEnabled(false),
    getLogs: () => productionDebugger.getLogs(),
    clearLogs: () => productionDebugger.clearLogs(),
    exportLogs: () => productionDebugger.exportLogs(),
    getStats: () => productionDebugger.getStats(),
    isEnabled: () => productionDebugger.isEnabled
};

export default productionDebugger; 