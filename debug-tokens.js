/**
 * Быстрая диагностика токенов для React Native приложения
 * Запуск: node debug-tokens.js
 */

const TokenDebugger = require('./src/debug/TokenDebugger').default;

async function runDiagnostic() {
    console.log('🚀 Запуск диагностики токенов...\n');

    try {
        const result = await TokenDebugger.runFullDiagnostic();

        console.log('\n=== РЕЗУЛЬТАТ ДИАГНОСТИКИ ===');
        if (result.success) {
            console.log('✅ Все проверки пройдены!');
            console.log('✅ Токены готовы для Socket.IO');
        } else {
            console.log('❌ Найдены проблемы:');
            result.issues?.forEach(issue => console.log('  ', issue));

            console.log('\n💡 Рекомендации:');
            if (result.issues?.some(issue => issue.includes('не найдены'))) {
                console.log('  - Войдите в приложение заново');
            }
            if (result.issues?.some(issue => issue.includes('истек'))) {
                console.log('  - Токен истек, приложение должно обновить его автоматически');
            }
            if (result.issues?.some(issue => issue.includes('парсинга'))) {
                console.log('  - Очистите AsyncStorage и войдите заново');
            }
        }

        return result;
    } catch (error) {
        console.error('❌ Ошибка при запуске диагностики:', error);
        return null;
    }
}

// Экспортируем для использования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runDiagnostic };
}

// Автоматический запуск если файл запущен напрямую
if (typeof require !== 'undefined' && require.main === module) {
    runDiagnostic();
}
