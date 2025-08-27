/**
 * Тесты для консольного полифилла
 */

import { initConsolePolyfill, restoreConsole, safeConsole } from '../consolePolyfill';

describe('Console Polyfill', () => {
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info
    };

    beforeEach(() => {
        // Восстанавливаем оригинальную консоль перед каждым тестом
        restoreConsole();
    });

    afterEach(() => {
        // Восстанавливаем оригинальную консоль после каждого теста
        Object.keys(originalConsole).forEach(method => {
            console[method] = originalConsole[method];
        });
    });

    it('should disable console methods in production mode', () => {
        // Мокаем __DEV__ как false
        global.__DEV__ = false;

        const mockLog = jest.fn();
        const mockError = jest.fn();
        console.log = mockLog;
        console.error = mockError;

        initConsolePolyfill();

        console.log('test message');
        console.error('test error');

        expect(mockLog).not.toHaveBeenCalled();
        expect(mockError).not.toHaveBeenCalled();
    });

    it('should preserve console methods in development mode', () => {
        // Мокаем __DEV__ как true
        global.__DEV__ = true;

        const mockLog = jest.fn();
        const mockError = jest.fn();
        console.log = mockLog;
        console.error = mockError;

        initConsolePolyfill();

        console.log('test message');
        console.error('test error');

        expect(mockLog).toHaveBeenCalledWith('test message');
        expect(mockError).toHaveBeenCalledWith('test error');
    });

    it('should provide safe console methods that work only in development', () => {
        global.__DEV__ = false;

        const consoleSpy = jest.spyOn(originalConsole, 'log');

        safeConsole.log('test message');

        expect(consoleSpy).not.toHaveBeenCalled();

        global.__DEV__ = true;

        safeConsole.log('test message');

        expect(consoleSpy).toHaveBeenCalledWith('test message');

        consoleSpy.mockRestore();
    });
}); 