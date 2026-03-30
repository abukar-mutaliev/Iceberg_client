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
 * Плагин для установки default notification icon через meta-data в AndroidManifest.
 * Используется Firebase и системой Android, когда push не указывает иконку явно.
 */
const withFirebaseNotificationIcon = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = Array.isArray(androidManifest.manifest.application)
      ? androidManifest.manifest.application[0]
      : androidManifest.manifest.application;

    if (!application) return config;

    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    const metaEntries = [
      {
        name: 'com.google.firebase.messaging.default_notification_icon',
        resource: '@drawable/ic_stat_iceberg',
      },
      {
        name: 'com.google.firebase.messaging.default_notification_color',
        resource: '@color/notification_icon_color',
      },
    ];

    for (const entry of metaEntries) {
      const existing = application['meta-data'].find(
        (m) => m.$?.['android:name'] === entry.name
      );
      if (!existing) {
        application['meta-data'].push({
          $: {
            'android:name': entry.name,
            'android:resource': entry.resource,
          },
        });
      }
    }

    return config;
  });
};

/**
 * Копирует иконки уведомлений из assets/notification-icons/ в android/app/src/main/res/drawable-*.
 * Гарантирует, что иконки переживут prebuild --clean.
 */
const withNotificationIcons = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidResPath = path.join(projectRoot, 'android/app/src/main/res');
      const sourceDir = path.join(projectRoot, 'assets/notification-icons');

      const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
      const targetNames = ['ic_stat_iceberg.png', 'notification_icon.png'];

      for (const density of densities) {
        const sourceFile = path.join(sourceDir, `ic_stat_iceberg-${density}.png`);
        const targetDir = path.join(androidResPath, `drawable-${density}`);

        if (!fs.existsSync(sourceFile)) {
          console.warn(`⚠️ [Notification Icons] Источник не найден: ic_stat_iceberg-${density}.png`);
          continue;
        }

        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        for (const targetIconName of targetNames) {
          const targetFile = path.join(targetDir, targetIconName);
          fs.copyFileSync(sourceFile, targetFile);
          console.log(`✅ [Notification Icons] drawable-${density}/${targetIconName} скопирован`);
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

/**
 * Исправление: FirebaseCoreInternal (Swift pod) зависит от GoogleUtilities,
 * который не определяет module maps. При сборке static libraries это обязательно.
 * Добавляем modular_headers для проблемных Firebase-зависимостей в Podfile.
 */
const withFirebaseModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');

        const marker = '# FIREBASE FIX: modular headers for GoogleUtilities';
        if (!podfileContent.includes(marker)) {
          const modularHeadersBlock = [
            '',
            marker,
            "pod 'GoogleUtilities', :modular_headers => true",
            "pod 'FirebaseCore', :modular_headers => true",
            "pod 'FirebaseCoreInternal', :modular_headers => true",
            "pod 'FirebaseCoreExtension', :modular_headers => true",
            "pod 'FirebaseInstallations', :modular_headers => true",
            "pod 'FirebaseMessaging', :modular_headers => true",
            "pod 'GoogleDataTransport', :modular_headers => true",
            "pod 'nanopb', :modular_headers => true",
            '',
          ].join('\n  ');

          const targetRegex = /target ['"]Iceberg['"] do/;
          const targetMatch = podfileContent.match(targetRegex);

          if (targetMatch) {
            podfileContent = podfileContent.replace(
              targetRegex,
              `${targetMatch[0]}\n  ${modularHeadersBlock}`
            );
          }

          fs.writeFileSync(podfilePath, podfileContent, 'utf8');
          console.log('✅ [Firebase Fix] Добавлены modular headers для GoogleUtilities и Firebase pods');
        }
      }

      return config;
    },
  ]);
};

/**
 * Плагин для настройки RuStore Push SDK (VKPNS) — fallback для FCM в России.
 * Добавляет meta-data в AndroidManifest и инициализацию в MainApplication.
 */
const withRuStorePush = (config) => {
  const rustoreProjectId = process.env.EXPO_PUBLIC_RUSTORE_PROJECT_ID || config?.extra?.rustoreProjectId || '';

  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = Array.isArray(androidManifest.manifest.application)
      ? androidManifest.manifest.application[0]
      : androidManifest.manifest.application;

    if (!application) return config;

    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    const rustoreMetaEntries = [
      {
        name: 'ru.rustore.sdk.pushclient.params_class',
        value: 'com.rustorepush.RuStorePushClientParams',
      },
      {
        name: 'ru.rustore.sdk.pushclient.default_notification_icon',
        resource: '@drawable/ic_stat_iceberg',
      },
      {
        name: 'ru.rustore.sdk.pushclient.default_notification_color',
        resource: '@color/notification_icon_color',
      },
    ];

    for (const entry of rustoreMetaEntries) {
      const existing = application['meta-data'].find(
        (m) => m.$?.['android:name'] === entry.name
      );
      if (!existing) {
        const metaItem = { $: { 'android:name': entry.name } };
        if (entry.resource) {
          metaItem.$['android:resource'] = entry.resource;
        } else if (entry.value) {
          metaItem.$['android:value'] = entry.value;
        }
        application['meta-data'].push(metaItem);
      }
    }

    console.log('✅ [RuStore Push] meta-data добавлены в AndroidManifest');
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const mainAppPath = path.join(
        projectRoot,
        'android/app/src/main/java/com/abuingush/iceberg/MainApplication.kt'
      );

      if (!rustoreProjectId) {
        console.warn('⚠️ [RuStore Push] EXPO_PUBLIC_RUSTORE_PROJECT_ID не задан — инициализация RuStore пропущена');
        return config;
      }

      if (fs.existsSync(mainAppPath)) {
        let content = fs.readFileSync(mainAppPath, 'utf8');
        const initMarker = 'RustorePush.init';

        if (!content.includes(initMarker)) {
          const importLine = 'import com.rustorepush.RustorePush';
          if (!content.includes(importLine)) {
            content = content.replace(
              /^(package .+\n)/m,
              `$1\n${importLine}\n`
            );
          }

          const onCreateRegex = /override\s+fun\s+onCreate\s*\(\s*\)\s*\{[^}]*super\.onCreate\(\)/;
          const onCreateMatch = content.match(onCreateRegex);

          if (onCreateMatch) {
            content = content.replace(
              onCreateMatch[0],
              `${onCreateMatch[0]}\n      RustorePush.init(this, "${rustoreProjectId}")`
            );
            console.log('✅ [RuStore Push] Инициализация добавлена в MainApplication.onCreate()');
          } else {
            console.warn('⚠️ [RuStore Push] Не удалось найти onCreate в MainApplication.kt');
          }

          fs.writeFileSync(mainAppPath, content, 'utf8');
        }
      } else {
        console.warn('⚠️ [RuStore Push] MainApplication.kt не найден — инициализация будет добавлена после prebuild');
      }

      return config;
    },
  ]);

  return config;
};

module.exports = (config) => {
  config = withAndroidWindowSoftInputMode(config);
  config = withAndroid15Compatibility(config);
  config = withFirebaseNotificationIcon(config);
  config = withFirebaseModularHeaders(config);
  config = withReactNativeMapsFix(config);
  config = withNotificationIcons(config);
  config = withRuStorePush(config);
  return config;
};

