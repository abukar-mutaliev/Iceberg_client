/**
 * Скрипт для копирования иконки уведомлений во все папки Android
 * Копирует иконки правильных размеров из assets/notifications
 */

const fs = require('fs');
const path = require('path');

const notificationsPath = path.join(__dirname, '../assets/notifications');
const androidResPath = path.join(__dirname, '../android/app/src/main/res');

// Маппинг плотностей Android к файлам
const densityMap = {
    'drawable-mdpi': 'mdpi.png',      // 24x24px
    'drawable-hdpi': 'hdpi.png',      // 36x36px
    'drawable-xhdpi': 'xhdpi.png',    // 48x48px
    'drawable-xxhdpi': 'xxhdpi.png', // 72x72px
    'drawable-xxxhdpi': 'xxxhdpi.png', // 96x96px
};

function copyIcons() {
    console.log('📋 Копирование иконок уведомлений правильных размеров для Android...');
    console.log(`📂 Источник: ${notificationsPath}\n`);
    
    let successCount = 0;
    let errorCount = 0;

    // Копируем иконку в каждую папку
    for (const [folder, sourceFile] of Object.entries(densityMap)) {
        const sourceIcon = path.join(notificationsPath, sourceFile);
        const targetDir = path.join(androidResPath, folder);
        const targetFile = path.join(targetDir, 'notification_icon.png');

        // Проверяем наличие исходного файла
        if (!fs.existsSync(sourceIcon)) {
            console.error(`❌ Исходный файл не найден: ${sourceFile}`);
            console.error(`   Ожидаемый путь: ${sourceIcon}`);
            errorCount++;
            continue;
        }

        // Создаем директорию, если её нет
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
            console.log(`📁 Создана папка: ${folder}`);
        }

        try {
            // Копируем файл
            fs.copyFileSync(sourceIcon, targetFile);
            console.log(`✅ Скопировано: ${sourceFile} → ${folder}/notification_icon.png`);
            successCount++;
        } catch (error) {
            console.error(`❌ Ошибка при копировании в ${folder}:`, error.message);
            errorCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    if (successCount > 0) {
        console.log(`✅ Успешно скопировано: ${successCount} иконок`);
    }
    if (errorCount > 0) {
        console.log(`❌ Ошибок: ${errorCount}`);
    }
    console.log('='.repeat(50));
}

// Запускаем скрипт
copyIcons();

