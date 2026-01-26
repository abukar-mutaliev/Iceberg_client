const { withAndroidManifest, withDangerousMod, withGradleProperties, withEntitlementsPlist } = require('@expo/config-plugins');
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
 * Плагин для настройки edge-to-edge и совместимости с Android 15+
 * Решает проблемы Google Play:
 * 1. Deprecated Status Bar APIs (через ProGuard rules)
 * 2. Ограничения ориентации ML Kit barcode scanner для Android 16+
 */
const withAndroid15Compatibility = (config) => {
  config = withGradleProperties(config, (config) => {
    const props = config.modResults;
    const setProp = (key, value) => {
      const existing = props.find(
        (item) => item.type === 'property' && item.key === key
      );
      if (existing) {
        existing.value = value;
      } else {
        props.push({ type: 'property', key, value });
      }
    };

    // Отключаем edge-to-edge в RN/Expo, чтобы не использовать deprecated APIs
    setProp('edgeToEdgeEnabled', 'false');
    setProp('expo.edgeToEdgeEnabled', 'false');
    setProp('react.edgeToEdgeEnabled', 'false');

    return config;
  });

  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    // Убеждаемся, что namespace tools объявлен для использования tools:replace
    if (!manifest.$) {
      manifest.$ = {};
    }
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    if (!manifest.application) {
      return config;
    }

    const application = Array.isArray(manifest.application)
      ? manifest.application[0]
      : manifest.application;

    // Убеждаемся, что application тег поддерживает большие экраны
    // Это требование Android 16+ для складных телефонов и планшетов
    if (application.$) {
      // resizeableActivity = true позволяет приложению работать в split-screen и freeform режимах
      application.$['android:resizeableActivity'] = 'true';
    }

    if (!application.activity) {
      // Создаем массив активностей, если его нет
      application.activity = [];
    }

    const activities = Array.isArray(application.activity)
      ? application.activity
      : [application.activity];

    // ИСПРАВЛЕНИЕ 1: Override ML Kit barcode scanner для поддержки больших экранов
    // Убираем ограничение screenOrientation="PORTRAIT"
    const mlKitActivityName = 'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity';
    const mlKitActivity = activities.find(
      (activity) => activity.$?.['android:name'] === mlKitActivityName
    );

    if (!mlKitActivity) {
      // Добавляем override для ML Kit activity
      // tools:replace и tools:node нужны для правильного разрешения конфликтов manifest merger
      application.activity.push({
        $: {
          'android:name': mlKitActivityName,
          'android:screenOrientation': 'unspecified',
          'android:resizeableActivity': 'true',
          'android:exported': 'false',
          'tools:node': 'merge',
          'tools:replace': 'android:screenOrientation,android:resizeableActivity',
        },
      });
      console.log('✅ [Android 15/16 Plugin] Добавлен override для ML Kit barcode scanner');
    } else {
      // Обновляем существующий
      mlKitActivity.$['android:screenOrientation'] = 'unspecified';
      mlKitActivity.$['android:resizeableActivity'] = 'true';
      // Убеждаемся, что tools:replace присутствует
      if (!mlKitActivity.$['tools:replace']) {
        mlKitActivity.$['tools:replace'] = 'android:screenOrientation,android:resizeableActivity';
      }
      if (!mlKitActivity.$['tools:node']) {
        mlKitActivity.$['tools:node'] = 'merge';
      }
      console.log('✅ [Android 15/16 Plugin] Обновлен ML Kit barcode scanner');
    }

    // ИСПРАВЛЕНИЕ 2: Обновляем MainActivity для поддержки изменения размера
    activities.forEach((activity) => {
      if (activity.$ && activity.$['android:name'] === '.MainActivity') {
        // Добавляем configChanges для правильной обработки изменений ориентации и размера
        const currentConfigChanges = activity.$['android:configChanges'] || '';
        const requiredChanges = ['screenSize', 'smallestScreenSize', 'screenLayout', 'orientation'];
        
        const configChangesSet = new Set(currentConfigChanges.split('|').filter(Boolean));
        requiredChanges.forEach(change => configChangesSet.add(change));
        
        activity.$['android:configChanges'] = Array.from(configChangesSet).join('|');
        
        // Добавляем поддержку изменения размера
        activity.$['android:resizeableActivity'] = 'true';
      }
    });

    return config;
  });
};

/**
 * Плагин для настройки App Group для OneSignal Notification Service Extension
 * Добавляет App Group в entitlements для iOS, чтобы расширение могло обмениваться данными с основным приложением
 */
const withOneSignalAppGroup = (config) => {
  // Используем Bundle ID с суффиксом для App Group
  // Если этот идентификатор недоступен, попробуйте: group.com.abuingush.iceberg.shared
  const appGroup = 'group.com.abuingush.iceberg.shared';
  
  // Добавляем App Group для основного приложения
  config = withEntitlementsPlist(config, (config) => {
    const entitlements = config.modResults;
    
    if (!entitlements['com.apple.security.application-groups']) {
      entitlements['com.apple.security.application-groups'] = [];
    }
    
    if (!entitlements['com.apple.security.application-groups'].includes(appGroup)) {
      entitlements['com.apple.security.application-groups'].push(appGroup);
    }
    
    console.log('✅ [OneSignal App Group Plugin] Добавлен App Group для основного приложения:', appGroup);
    
    return config;
  });
  
  // Добавляем App Group для OneSignalNotificationServiceExtension
  config = withEntitlementsPlist(config, (config) => {
    const entitlements = config.modResults;
    
    if (!entitlements['com.apple.security.application-groups']) {
      entitlements['com.apple.security.application-groups'] = [];
    }
    
    if (!entitlements['com.apple.security.application-groups'].includes(appGroup)) {
      entitlements['com.apple.security.application-groups'].push(appGroup);
    }
    
    console.log('✅ [OneSignal App Group Plugin] Добавлен App Group для расширения:', appGroup);
    
    return config;
  }, { targetName: 'OneSignalNotificationServiceExtension' });
  
  return config;
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

/**
 * Плагин для исправления ошибки компиляции react-native-maps с useFrameworks
 * Глобально отключает warnings as errors для всех таргетов
 */
const withReactNativeMapsFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');
        
        const fixMarker = '# GLOBAL FIX: Disable warnings as errors';
        if (!podfileContent.includes(fixMarker)) {
          const fixCode = `
  ${fixMarker}
  # Глобально отключаем warnings as errors для всего проекта
  installer.pods_project.build_configurations.each do |config|
    config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
    config.build_settings['WARNING_CFLAGS'] = ['-Wno-error=non-modular-include-in-framework-module']
  end
  
  # Применяем фикс ко всем таргетам
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
      config.build_settings['WARNING_CFLAGS'] ||= ['$(inherited)']
      config.build_settings['WARNING_CFLAGS'] << '-Wno-error=non-modular-include-in-framework-module'
      config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'NO'
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
    end
  end
`;
          
          const postInstallRegex = /post_install do \|installer\|([\s\S]*?)end/m;
          const match = podfileContent.match(postInstallRegex);
          
          if (match) {
            const postInstallContent = match[1];
            const newPostInstallContent = postInstallContent + fixCode;
            podfileContent = podfileContent.replace(postInstallRegex, `post_install do |installer|${newPostInstallContent}end`);
          } else {
            podfileContent += `

post_install do |installer|${fixCode}end
`;
          }
          
          fs.writeFileSync(podfilePath, podfileContent, 'utf8');
          console.log('✅ [Global Fix] Отключены warnings as errors во всех targets');
        }
      }
      
      return config;
    },
  ]);
};

module.exports = (config) => {
  config = withAndroidWindowSoftInputMode(config);
  config = withAndroid15Compatibility(config);
  config = withOneSignalAppGroup(config);
  config = withReactNativeMapsFix(config);
  config = withNotificationIcons(config);
  return config;
};

