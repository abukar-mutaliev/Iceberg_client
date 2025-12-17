const { withAndroidManifest } = require('@expo/config-plugins');

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
        // Устанавливаем adjustPan|stateHidden для чатов
        // adjustPan - сдвигает экран вверх без изменения размеров
        // stateHidden - скрывает клавиатуру при переходе между экранами
        activity.$['android:windowSoftInputMode'] = 'adjustPan|stateHidden';
      }
    });

    return config;
  });
};

module.exports = withAndroidWindowSoftInputMode;

