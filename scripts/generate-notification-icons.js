/**
 * Скрипт для генерации иконок уведомлений разных размеров для Android
 * Использует expo-image-manipulator для изменения размера
 */

const fs = require('fs');
const path = require('path');
const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');

const sourceIcon = path.join(__dirname, '../assets/logo/logo.png');
const androidResPath = path.join(__dirname, '../android/app/src/main/res');

// Размеры для разных плотностей Android
const densities = {
    'drawable-mdpi': 24,
    'drawable-hdpi': 36,
    'drawable-xhdpi': 48,
    'drawable-xxhdpi': 72,
    'drawable-xxxhdpi': 96,
};

async function generateIcons() {
    console.log('🎨 Генерация иконок уведомлений для Android...');
    
    // Проверяем наличие исходного файла
    if (!fs.existsSync(sourceIcon)) {
        console.error(`❌ Исходный файл не найден: ${sourceIcon}`);
        process.exit(1);
    }

    // Генерируем иконки для каждой плотности
    for (const [folder, size] of Object.entries(densities)) {
        const targetDir = path.join(androidResPath, folder);
        const targetFile = path.join(targetDir, 'notification_icon.png');

        // Создаем директорию, если её нет
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        try {
            console.log(`📐 Генерация ${folder}: ${size}x${size}px`);
            
            // Используем expo-image-manipulator для изменения размера
            const result = await manipulateAsync(
                sourceIcon,
                [{ resize: { width: size, height: size } }],
                { compress: 1, format: SaveFormat.PNG }
            );

            // Копируем результат в целевую папку
            fs.copyFileSync(result.uri.replace('file://', ''), targetFile);
            console.log(`✅ Создано: ${targetFile}`);
        } catch (error) {
            console.error(`❌ Ошибка при создании ${folder}:`, error.message);
            // Fallback: просто копируем исходный файл
            console.log(`⚠️  Используем исходный файл как fallback`);
            fs.copyFileSync(sourceIcon, targetFile);
        }
    }

    console.log('✅ Генерация иконок завершена!');
}

// Запускаем скрипт
generateIcons().catch(console.error);







