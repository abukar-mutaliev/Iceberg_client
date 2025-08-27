/**
 * Console polyfill для production сборок
 * Заглушает все console методы в preview/production сборках
 */

// Сохраняем оригинальные методы консоли для разработки
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    trace: console.trace,
    time: console.time,
    timeEnd: console.timeEnd,
    group: console.group,
    groupEnd: console.groupEnd,
    groupCollapsed: console.groupCollapsed,
    table: console.table,
    clear: console.clear,
    assert: console.assert,
    count: console.count,
    countReset: console.countReset,
    dir: console.dir,
    dirxml: console.dirxml,
    profile: console.profile,
    profileEnd: console.profileEnd,
    timeLog: console.timeLog,
    timeStamp: console.timeStamp
};

// Пустая функция для заглушки
const noop = () => {};

/**
 * Инициализация полифилла консоли
 */
export const initConsolePolyfill = () => {
    if (!__DEV__) {
        // В production/preview сборках заглушаем все методы консоли
        console.log = noop;
        console.error = noop;
        console.warn = noop;
        console.info = noop;
        console.debug = noop;
        console.trace = noop;
        console.time = noop;
        console.timeEnd = noop;
        console.group = noop;
        console.groupEnd = noop;
        console.groupCollapsed = noop;
        console.table = noop;
        console.clear = noop;
        console.assert = noop;
        console.count = noop;
        console.countReset = noop;
        console.dir = noop;
        console.dirxml = noop;
        console.profile = noop;
        console.profileEnd = noop;
        console.timeLog = noop;
        console.timeStamp = noop;
    }
};

/**
 * Восстановление оригинальных методов консоли (для тестирования)
 */
export const restoreConsole = () => {
    Object.keys(originalConsole).forEach(method => {
        console[method] = originalConsole[method];
    });
};

/**
 * Безопасные методы логирования для критических ошибок
 * Эти методы работают только в development режиме
 */
export const safeConsole = {
    log: (...args) => {
        if (__DEV__) {
            originalConsole.log(...args);
        }
    },
    error: (...args) => {
        if (__DEV__) {
            originalConsole.error(...args);
        }
    },
    warn: (...args) => {
        if (__DEV__) {
            originalConsole.warn(...args);
        }
    },
    info: (...args) => {
        if (__DEV__) {
            originalConsole.info(...args);
        }
    }
}; 