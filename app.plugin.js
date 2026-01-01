const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Плагин для настройки windowSoftInputMode в AndroidManifest.xml
 * Обеспечивает корректное поведение клавиатуры в production AAB бандлах
 * 
 * adjustPan - сдвигает окно вверх при открытии клавиатуры (лучше для чатов)
 * adjustResize - изменяет размер окна (может вызывать белый фон сверху)
 */
const withAndroidWindowSoftInputMode = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest.application) {
      return config;
    }

    const application = Array.isArray(manifest.application)
      ? manifest.application[0]
      : manifest.application;

    if (!application.activity) {
      return config;
    }

    const activities = Array.isArray(application.activity)
      ? application.activity
      : [application.activity];

    // Обновляем windowSoftInputMode для всех активностей
    activities.forEach((activity) => {
      if (activity.$) {
        // Устанавливаем adjustResize|stateHidden для корректной работы клавиатуры
        // adjustResize - изменяет размер окна, правильно компенсируя клавиатуру
        // stateHidden - скрывает клавиатуру при переходе между экранами
        // Примечание: для фиксации хедера используется keyboardHandlingEnabled: false и абсолютная позиция
        activity.$['android:windowSoftInputMode'] = 'adjustResize|stateHidden';
      }
    });

    return config;
  });
};

/**
 * Плагин для автоматического копирования иконок уведомлений в Android проект
 * Копирует иконки из src/assets/icons/push/ в android/app/src/main/res/drawable-*
 * Это гарантирует, что иконки будут доступны даже после удаления папки android
 */
const withNotificationIcons = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidResPath = path.join(projectRoot, 'android/app/src/main/res');
      
      // Маппинг плотностей Android к файлам
      const densityMap = {
        'drawable-mdpi': 'drawable-mdpi/ic_stat_.png',
        'drawable-hdpi': 'drawable-hdpi/ic_stat_.png',
        'drawable-xhdpi': 'drawable-xhdpi/ic_stat_.png',
        'drawable-xxhdpi': 'drawable-xxhdpi/ic_stat_.png',
        'drawable-xxxhdpi': 'drawable-xxxhdpi/ic_stat_.png',
      };

      const sourceBasePath = path.join(projectRoot, 'src/assets/icons/push');
      const targetIconName = 'ic_stat_iceberg.png';

      console.log('📋 [Notification Icons Plugin] Копирование иконок уведомлений...');

      for (const [folder, sourceFile] of Object.entries(densityMap)) {
        const sourceIcon = path.join(sourceBasePath, sourceFile);
        const targetDir = path.join(androidResPath, folder);
        const targetFile = path.join(targetDir, targetIconName);

        // Проверяем наличие исходного файла
        if (!fs.existsSync(sourceIcon)) {
          console.warn(`⚠️ [Notification Icons Plugin] Исходный файл не найден: ${sourceFile}`);
          continue;
        }

        // Создаем директорию, если её нет
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        try {
          // Копируем файл
          fs.copyFileSync(sourceIcon, targetFile);
          console.log(`✅ [Notification Icons Plugin] Скопировано: ${folder}/${targetIconName}`);
        } catch (error) {
          console.error(`❌ [Notification Icons Plugin] Ошибка при копировании в ${folder}:`, error.message);
        }
      }

      return config;
    },
  ]);
};

module.exports = (config) => {
  config = withAndroidWindowSoftInputMode(config);
  config = withNotificationIcons(config);
  return config;
};

