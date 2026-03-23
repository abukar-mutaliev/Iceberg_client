import React, { useEffect, useRef, memo, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Image, Platform, Linking } from 'react-native';
import * as Location from 'expo-location';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { logData } from '@shared/lib/logger';
import { Ionicons } from '@expo/vector-icons';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { normalizeCoordinates } from '@/shared/lib/coordinatesHelper';
import { useToast } from '@shared/ui/Toast';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';

export const LocationInput = memo(({
                                     mapLocation,
                                     setMapLocation,
                                     isLocationLoading,
                                     setIsLocationLoading,
                                     onOpenMap,
                                     error,
                                     setAddress
                                   }) => {
  const { showSuccess, showError } = useToast();
  const { showAlert, showWarning } = useCustomAlert();
  const [locationPermissionStatus, setLocationPermissionStatus] = React.useState(null);
  const [showPreview, setShowPreview] = React.useState(false);

  const componentId = useRef(Math.random().toString(36).substr(2, 9)).current;
  const prevMapLocationRef = useRef(mapLocation);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;

    isInitialized.current = true;

    logData('LocationInput (AddDriverStop): Компонент инициализирован', {
      componentId,
      initialMapLocation: mapLocation,
      timestamp: new Date().toISOString()
    });

    checkLocationPermission();

    return () => {
      logData('LocationInput (AddDriverStop): Компонент размонтирован', {
        componentId,
        timestamp: new Date().toISOString()
      });
    };
  }, []);

  useEffect(() => {
    if (mapLocation !== prevMapLocationRef.current) {
      logData('LocationInput (AddDriverStop): Обновлены координаты в компоненте', {
        mapLocation,
        prevMapLocation: prevMapLocationRef.current,
        componentId,
        timestamp: new Date().toISOString()
      });

      prevMapLocationRef.current = mapLocation;
    }
  }, [mapLocation]);

  const checkLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermissionStatus(status);
      logData('LocationInput (AddDriverStop): Статус разрешения на геолокацию', {
        status,
        componentId
      });
    } catch (error) {
      logData('LocationInput (AddDriverStop): Ошибка при запросе разрешений', {
        error: error.message,
        componentId
      });
    }
  }, [componentId]);

  const reverseGeocode = useCallback(async (latitude, longitude, setAddressCallback) => {
    try {
      const location = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      if (location && location.length > 0) {
        const loc = location[0];
        const addressComponents = [];

        if (loc.city) addressComponents.push(loc.city);
        if (loc.street) addressComponents.push(loc.street);
        if (loc.name) addressComponents.push(loc.name);

        if (addressComponents.length > 0) {
          const addressString = addressComponents.join(', ');
          if (setAddressCallback) {
            setAddressCallback(addressString);
          }
          logData('Получен адрес из координат', addressString);
          return addressString;
        }
      }
      return null;
    } catch (error) {
      logData('Ошибка при получении адреса из координат', error);
      return null;
    }
  }, []);

  const isGettingLocation = useRef(false);

  const getCurrentLocation = useCallback(async () => {
    if (isGettingLocation.current || isLocationLoading) return;
    isGettingLocation.current = true;

    try {
      const openLocationSettings = async () => {
        try {
          await Linking.openSettings();
        } catch (settingsError) {
          logData('LocationInput (AddDriverStop): Ошибка открытия настроек', settingsError);
          showError('Не удалось открыть настройки. Откройте их вручную и выдайте доступ к геолокации.');
        }
      };

      const showDeniedLocationAlert = () => {
        if (Platform.OS === 'ios') {
          showAlert({
            type: 'warning',
            title: 'Доступ к геолокации',
            message: 'Разрешите доступ к местоположению в настройках устройства, чтобы определить текущую позицию.',
            buttons: [
              {
                text: 'Открыть настройки',
                style: 'primary',
                onPress: () => setTimeout(() => openLocationSettings(), 250),
              },
              { text: 'Отмена', style: 'cancel' }
            ],
            autoClose: false,
            showCloseButton: true,
          });
        } else {
          showWarning(
            'Доступ к геолокации',
            'Для определения текущего местоположения необходимо разрешение на доступ к геолокации.'
          );
        }
      };

      // Always request fresh permission state on press.
      let permission = await Location.getForegroundPermissionsAsync();
      setLocationPermissionStatus(permission.status);

      if (permission.status !== 'granted' && permission.canAskAgain) {
        permission = await Location.requestForegroundPermissionsAsync();
        setLocationPermissionStatus(permission.status);
      }

      if (permission.status !== 'granted') {
        showDeniedLocationAlert();
        return;
      }

      setIsLocationLoading(true);

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const { latitude, longitude } = location.coords;
      const locationString = normalizeCoordinates({ latitude, longitude });

      logData('LocationInput (AddDriverStop): Получены текущие координаты', {
        locationString,
        componentId,
        previousMapLocation: mapLocation,
        timestamp: new Date().toISOString()
      });

      setMapLocation(locationString);

      await reverseGeocode(latitude, longitude, setAddress);

      showSuccess('Координаты успешно определены');
    } catch (error) {
      logData('LocationInput (AddDriverStop): Ошибка при получении текущего местоположения', error);
      showError('Не удалось определить текущее местоположение');
    } finally {
      setIsLocationLoading(false);
      isGettingLocation.current = false;
    }
  }, [
    isLocationLoading,
    setIsLocationLoading,
    componentId,
    mapLocation,
    setMapLocation,
    reverseGeocode,
    setAddress,
    showSuccess,
    showError,
    showAlert,
    showWarning
  ]);

  const handleOpenMap = useCallback(() => {
    if (isLocationLoading) return;

    logData('LocationInput (AddDriverStop): Открытие карты', {
      currentLocation: mapLocation,
      componentId,
      timestamp: new Date().toISOString()
    });

    const normalizedCoords = normalizeCoordinates(mapLocation);
    onOpenMap(normalizedCoords || '');
  }, [mapLocation, componentId, onOpenMap, isLocationLoading]);

  // Парсинг координат для предварительного просмотра
  const parseCoordinates = (coords) => {
    if (!coords || typeof coords !== 'string') return null;

    const parts = coords.split(',');
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0].trim());
      const lng = parseFloat(parts[1].trim());

      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
    return null;
  };

  const parsedCoords = parseCoordinates(mapLocation);
  const hasValidCoords = parsedCoords &&
      parsedCoords.latitude >= -90 && parsedCoords.latitude <= 90 &&
      parsedCoords.longitude >= -180 && parsedCoords.longitude <= 180;

  return (
      <View style={styles.container}>
        <Text style={styles.label}>Координаты на карте *</Text>

        <View style={[styles.locationCard, error ? styles.locationCardError : null]}>
          <View style={styles.locationInputContainer}>
            <Ionicons
                name="location"
                size={normalize(20)}
                color={error ? "#FF3B30" : (hasValidCoords ? "#28a745" : "#3B43A2")}
                style={styles.locationIcon}
            />
            <TextInput
                style={[styles.locationInput, error ? styles.inputError : null]}
                value={mapLocation ? String(mapLocation) : ''}
                onChangeText={(text) => {
                  const normalizedText = normalizeCoordinates(text) || text;
                  setMapLocation(normalizedText);
                  logData('Изменены координаты через текстовое поле', {
                    input: text,
                    normalized: normalizedText
                  });
                }}
                placeholder="Введите координаты (широта, долгота)"
                editable={!isLocationLoading}
            />
            {isLocationLoading && (
                <ActivityIndicator
                    size="small"
                    color={Color.blue2}
                    style={styles.locationLoader}
                />
            )}
            {hasValidCoords && (
                <Ionicons
                    name="checkmark-circle"
                    size={normalize(20)}
                    color="#28a745"
                    style={styles.validIcon}
                />
            )}
          </View>

          {/* Предварительный просмотр координат */}
          {hasValidCoords && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewText}>
                  📍 {parsedCoords.latitude.toFixed(6)}, {parsedCoords.longitude.toFixed(6)}
                </Text>
                <TouchableOpacity
                    style={styles.previewToggle}
                    onPress={() => setShowPreview(!showPreview)}
                >
                  <Text style={styles.previewToggleText}>
                    {showPreview ? 'Скрыть карту' : 'Показать карту'}
                  </Text>
                </TouchableOpacity>
              </View>
          )}

          <View style={styles.divider} />

          <View style={styles.locationButtonsContainer}>
            <TouchableOpacity
                style={[
                  styles.locationButton,
                  isLocationLoading && styles.disabledButton
                ]}
                onPress={getCurrentLocation}
                disabled={isLocationLoading}
            >
              <Ionicons name="locate" size={normalize(16)} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.locationButtonText}>Определить</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                  styles.locationButton,
                  { marginLeft: normalize(10), backgroundColor: '#FF6B35' },
                  isLocationLoading && styles.disabledButton
                ]}
                onPress={handleOpenMap}
                disabled={isLocationLoading}
            >
              <Ionicons name="map" size={normalize(16)} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.locationButtonText}>Выбрать на карте</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Встроенная мини-карта для предварительного просмотра */}
        {hasValidCoords && showPreview && (
            <View style={styles.miniMapContainer}>
              <Text style={styles.miniMapTitle}>Предварительный просмотр:</Text>
              <View style={styles.miniMapWrapper}>
                <Image
                    source={{
                      uri: `https://static-maps.yandex.ru/1.x/?ll=${parsedCoords.longitude},${parsedCoords.latitude}&size=300,150&z=15&l=map&pt=${parsedCoords.longitude},${parsedCoords.latitude},pm2rdm`
                    }}
                    style={styles.miniMapImage}
                    resizeMode="cover"
                />
                <View style={styles.miniMapOverlay}>
                  <TouchableOpacity
                      style={styles.miniMapButton}
                      onPress={handleOpenMap}
                  >
                    <Ionicons name="expand" size={16} color="white" />
                    <Text style={styles.miniMapButtonText}>Открыть карту</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Подсказки по использованию */}
        <View style={styles.hintsContainer}>
          <Text style={styles.hintsTitle}>💡 Способы ввода координат:</Text>
          <Text style={styles.hintText}>• Вручную: 43.172837, 44.811913</Text>
          <Text style={styles.hintText}>• Кнопка "Определить" - текущая геолокация</Text>
          <Text style={styles.hintText}>• Кнопка "Интерактивная карта" - выбор на карте</Text>
        </View>
      </View>
  );
}, (prevProps, nextProps) => {
  return (
      prevProps.mapLocation === nextProps.mapLocation &&
      prevProps.isLocationLoading === nextProps.isLocationLoading &&
      prevProps.error === nextProps.error &&
      prevProps.onOpenMap === nextProps.onOpenMap
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: normalize(20),
  },
  label: {
    fontSize: normalizeFont(FontSize.size_sm),
    fontWeight: '600',
    color: Color.dark,
    opacity: 0.4,
    marginBottom: normalize(10),
    fontFamily: FontFamily.sFProText,
  },
  locationCard: {
    backgroundColor: '#f7f7f7',
    borderRadius: normalize(8),
    padding: normalize(12),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: normalize(2),
    },
    shadowOpacity: 0.08,
    shadowRadius: normalize(3),
    elevation: normalize(3),
  },
  locationCardError: {
    shadowColor: "#FF3B30",
    borderColor: "#FF3B30",
    borderWidth: 1,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(10)
  },
  locationIcon: {
    marginRight: normalize(8),
  },
  locationLoader: {
    marginLeft: normalize(10)
  },
  validIcon: {
    marginLeft: normalize(8),
  },
  locationInput: {
    flex: 1,
    height: normalize(60),
    fontSize: normalizeFont(FontSize.size_md),
    color: Color.dark,
    fontFamily: FontFamily.sFProText,
  },
  inputError: {
    color: '#FF3B30',
  },
  previewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    borderRadius: normalize(6),
    padding: normalize(8),
    marginBottom: normalize(8),
  },
  previewText: {
    fontSize: normalizeFont(12),
    color: '#28a745',
    fontWeight: '500',
    flex: 1,
  },
  previewToggle: {
    paddingHorizontal: normalize(8),
    paddingVertical: normalize(4),
    backgroundColor: '#28a745',
    borderRadius: normalize(4),
  },
  previewToggleText: {
    fontSize: normalizeFont(10),
    color: 'white',
    fontWeight: '500',
  },
  miniMapContainer: {
    marginTop: normalize(12),
    borderRadius: normalize(8),
    overflow: 'hidden',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  miniMapTitle: {
    fontSize: normalizeFont(12),
    fontWeight: '500',
    color: Color.dark,
    padding: normalize(8),
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  miniMapWrapper: {
    position: 'relative',
    height: 150,
  },
  miniMapImage: {
    width: '100%',
    height: '100%',
  },
  miniMapOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  miniMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  miniMapButtonText: {
    color: 'white',
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '500',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: normalizeFont(FontSize.size_xs),
    marginTop: normalize(5),
    fontFamily: FontFamily.sFProText,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: normalize(10),
  },
  locationButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationButton: {
    backgroundColor: '#3B43A2',
    paddingHorizontal: normalize(15),
    paddingVertical: normalize(10),
    borderRadius: normalize(6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  buttonIcon: {
    marginRight: normalize(5),
  },
  locationButtonText: {
    color: '#fff',
    fontSize: normalizeFont(14),
    fontWeight: '600',
    fontFamily: FontFamily.sFProText,
  },
  disabledButton: {
    backgroundColor: '#a0a0a0',
  },
  hintsContainer: {
    marginTop: normalize(12),
    padding: normalize(10),
    backgroundColor: 'rgba(51, 57, 176, 0.05)',
    borderRadius: normalize(6),
    borderLeftWidth: 3,
    borderLeftColor: '#3B43A2',
  },
  hintsTitle: {
    fontSize: normalizeFont(12),
    fontWeight: '600',
    color: '#3B43A2',
    marginBottom: normalize(4),
    fontFamily: FontFamily.sFProText,
  },
  hintText: {
    fontSize: normalizeFont(11),
    color: '#666',
    marginBottom: normalize(2),
    fontFamily: FontFamily.sFProText,
  },
});