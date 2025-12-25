import React from 'react';
import { Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Constants from 'expo-constants';
import { logData } from '@shared/lib/logger';

// Универсальный компонент карты с поддержкой ref
export const UniversalMapView = React.forwardRef(({ children, provider, ...otherProps }, ref) => {
  // Проверяем наличие Google Maps конфигурации
  const hasGoogleMapsConfig = React.useMemo(() => {
    try {
      // Проверяем все возможные источники конфигурации
      const manifest = Constants.manifest;
      const expoConfig = Constants.expoConfig;
      const manifest2 = Constants.manifest2;

      // Проверяем все возможные источники API ключа в порядке приоритета
      const sources = [
        // Из expoConfig (приоритет для development builds)
        { key: expoConfig?.android?.config?.googleMaps?.apiKey, source: 'expoConfig.android.config.googleMaps.apiKey' },
        { key: expoConfig?.ios?.config?.googleMapsApiKey, source: 'expoConfig.ios.config.googleMapsApiKey' },
        { key: expoConfig?.extra?.googleMapsApiKey, source: 'expoConfig.extra.googleMapsApiKey' },
        // Из manifest2 (для EAS builds)
        { key: manifest2?.android?.config?.googleMaps?.apiKey, source: 'manifest2.android.config.googleMaps.apiKey' },
        { key: manifest2?.ios?.config?.googleMapsApiKey, source: 'manifest2.ios.config.googleMapsApiKey' },
        { key: manifest2?.extra?.googleMapsApiKey, source: 'manifest2.extra.googleMapsApiKey' },
        // Из manifest (для Expo Go)
        { key: manifest?.android?.config?.googleMaps?.apiKey, source: 'manifest.android.config.googleMaps.apiKey' },
        { key: manifest?.ios?.config?.googleMapsApiKey, source: 'manifest.ios.config.googleMapsApiKey' },
        { key: manifest?.extra?.googleMapsApiKey, source: 'manifest.extra.googleMapsApiKey' },
        // Из environment variables
        { key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY, source: 'process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY' },
        { key: process.env.GOOGLE_MAPS_API_KEY, source: 'process.env.GOOGLE_MAPS_API_KEY' },
        // Hardcoded fallback для development (не рекомендуется для production)
        { key: "AIzaSyDev-AMb24bvlQn3a-b4DGsItiYB6su6_E", source: 'hardcoded_fallback' }
      ];

      const foundSource = sources.find(item => item.key && typeof item.key === 'string' && item.key.length > 0);

      // Подробная диагностика
      logData('🗺️ Google Maps Diagnostic', {
        nodeEnv: process.env.NODE_ENV,
        platform: Platform.OS,
        isDevice: Constants.isDevice,
        expoVersion: Constants.expoVersion,
        appOwnership: Constants.appOwnership,
        // Основные источники
        manifestExists: !!manifest,
        expoConfigExists: !!expoConfig,
        manifest2Exists: !!manifest2,
        // Ключи из разных источников
        expoConfigAndroid: expoConfig?.android?.config?.googleMaps?.apiKey ? 'FOUND' : 'NOT_FOUND',
        expoConfigIOS: expoConfig?.ios?.config?.googleMapsApiKey ? 'FOUND' : 'NOT_FOUND',
        expoConfigExtra: expoConfig?.extra?.googleMapsApiKey ? 'FOUND' : 'NOT_FOUND',
        manifestAndroid: manifest?.android?.config?.googleMaps?.apiKey ? 'FOUND' : 'NOT_FOUND',
        manifestIOS: manifest?.ios?.config?.googleMapsApiKey ? 'FOUND' : 'NOT_FOUND',
        manifestExtra: manifest?.extra?.googleMapsApiKey ? 'FOUND' : 'NOT_FOUND',
        // Результат поиска
        foundApiKey: !!foundSource,
        foundFrom: foundSource?.source || 'NONE',
        totalSourcesChecked: sources.length
      });

      if (foundSource) {
        logData('✅ Google Maps API ключ найден!', {
          keyLength: foundSource.key.length,
          keyPrefix: foundSource.key.substring(0, 10) + '...',
          platform: Platform.OS,
          source: foundSource.source,
          sourceIndex: sources.indexOf(foundSource),
          appOwnership: Constants.appOwnership
        });
        return true;
      } else {
        logData('❌ Google Maps API ключ НЕ найден в конфигурации!', {
          checkedSources: sources.length,
          platform: Platform.OS,
          appOwnership: Constants.appOwnership,
          manifestExists: !!manifest,
          expoConfigExists: !!expoConfig
        });
        return false;
      }
    } catch (error) {
      logData('❌ Ошибка при проверке Google Maps конфигурации', {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }, []);

  // Определяем провайдер карты
  const mapProvider = React.useMemo(() => {
    if (hasGoogleMapsConfig && provider) {
      logData('🗺️ UniversalMapView: Используем Google Maps');
      return provider;
    } else {
      logData('🗺️ UniversalMapView: Используем платформенные карты');
      return undefined; // Использует платформенные карты
    }
  }, [hasGoogleMapsConfig, provider]);

  return (
      <MapView
          ref={ref}
          {...otherProps}
          provider={mapProvider}
          onError={(error) => {
            logData('🗺️ UniversalMapView: Ошибка карты', {
              error,
              provider: mapProvider,
              hasGoogleConfig: hasGoogleMapsConfig
            });
            if (otherProps.onError) {
              otherProps.onError(error);
            }
          }}
          onMapReady={() => {
            logData('🗺️ UniversalMapView: Карта готова к использованию', {
              provider: mapProvider,
              hasGoogleConfig: hasGoogleMapsConfig
            });
            if (otherProps.onMapReady) {
              otherProps.onMapReady();
            }
          }}
      >
        {children}
      </MapView>
  );
});

// Добавляем displayName для лучшей отладки
UniversalMapView.displayName = 'UniversalMapView';

// Экспортируем также и Marker для удобства
export { Marker };

export default UniversalMapView;