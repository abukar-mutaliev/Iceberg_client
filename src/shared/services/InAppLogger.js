/**
 * InAppLogger - Служба для сбора логов в реальном времени
 * Работает на prod/preview для отладки уведомлений
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_LOGS = 200; // Максимальное количество логов в памяти
const STORAGE_KEY = 'in_app_logs_v1';

class InAppLoggerService {
    constructor() {
        this.logs = [];
        this.listeners = [];
        this.isEnabled = true;
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info,
        };
        
        // Автоматически перехватываем console при создании
        this.interceptConsole();
        
        // Загружаем сохраненные логи
        this.loadLogs();
    }

    /**
     * Перехватываем console методы
     */
    interceptConsole() {
        // Сохраняем оригинальные методы
        const original = this.originalConsole;
        
        // Перехватываем console.log
        console.log = (...args) => {
            original.log(...args);
            this.addLog('log', args);
        };
        
        // Перехватываем console.warn
        console.warn = (...args) => {
            original.warn(...args);
            this.addLog('warn', args);
        };
        
        // Перехватываем console.error
        console.error = (...args) => {
            original.error(...args);
            this.addLog('error', args);
        };
        
        // Перехватываем console.info
        console.info = (...args) => {
            original.info(...args);
            this.addLog('info', args);
        };
    }

    /**
     * Добавляет лог
     */
    addLog(type, args) {
        if (!this.isEnabled) return;
        
        try {
            // Форматируем аргументы в строку
            const message = args.map(arg => {
                if (typeof arg === 'string') return arg;
                if (arg instanceof Error) return `${arg.message}\n${arg.stack}`;
                try {
                    return JSON.stringify(arg);
                } catch {
                    return String(arg);
                }
            }).join(' ');
            
            // Фильтруем только интересующие нас логи
            const relevantPrefixes = [
                '[OneSignal]',
                '[HeadsUpPrompt]',
                '[PushNotification]',
                '[Notification]',
            ];
            
            const isRelevant = relevantPrefixes.some(prefix => 
                message.includes(prefix)
            );
            
            if (!isRelevant) return; // Игнорируем неактуальные логи
            
            const logEntry = {
                id: Date.now() + Math.random(),
                timestamp: new Date().toISOString(),
                type,
                message,
            };
            
            // Добавляем в начало массива (новые логи сверху)
            this.logs.unshift(logEntry);
            
            // Ограничиваем размер массива
            if (this.logs.length > MAX_LOGS) {
                this.logs = this.logs.slice(0, MAX_LOGS);
            }
            
            // Уведомляем слушателей
            this.notifyListeners();
            
            // Сохраняем в AsyncStorage (с дебаунсом)
            this.scheduleSave();
            
        } catch (error) {
            // Не ломаем приложение если логирование упало
            this.originalConsole.error('[InAppLogger] Error:', error);
        }
    }

    /**
     * Сохранение логов в AsyncStorage с дебаунсом
     */
    scheduleSave() {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }
        
        this.saveTimer = setTimeout(() => {
            this.saveLogs();
        }, 2000); // Сохраняем каждые 2 секунды
    }

    /**
     * Сохраняет логи в AsyncStorage
     */
    async saveLogs() {
        try {
            const logsToSave = this.logs.slice(0, 100); // Сохраняем только последние 100
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logsToSave));
        } catch (error) {
            this.originalConsole.error('[InAppLogger] Failed to save logs:', error);
        }
    }

    /**
     * Загружает логи из AsyncStorage
     */
    async loadLogs() {
        try {
            const saved = await AsyncStorage.getItem(STORAGE_KEY);
            if (saved) {
                this.logs = JSON.parse(saved);
                this.notifyListeners();
            }
        } catch (error) {
            this.originalConsole.error('[InAppLogger] Failed to load logs:', error);
        }
    }

    /**
     * Получить все логи
     */
    getLogs() {
        return [...this.logs];
    }

    /**
     * Очистить логи
     */
    async clearLogs() {
        this.logs = [];
        this.notifyListeners();
        
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            this.originalConsole.error('[InAppLogger] Failed to clear logs:', error);
        }
    }

    /**
     * Подписка на изменения логов
     */
    subscribe(listener) {
        this.listeners.push(listener);
        
        // Возвращаем функцию отписки
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Уведомить всех слушателей
     */
    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener(this.logs);
            } catch (error) {
                this.originalConsole.error('[InAppLogger] Listener error:', error);
            }
        });
    }

    /**
     * Включить/выключить логирование
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    /**
     * Экспорт логов в текст
     */
    exportLogs() {
        return this.logs.map(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            return `[${time}] [${log.type.toUpperCase()}] ${log.message}`;
        }).join('\n');
    }
}

// Экспортируем синглтон
const InAppLogger = new InAppLoggerService();
export default InAppLogger;


