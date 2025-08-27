import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
import UniversalMapView, { Marker } from '@shared/ui/Map/UniversalMapView';
import { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { logData } from '@shared/lib/logger';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Ionicons } from '@expo/vector-icons';
import { normalizeCoordinates, parseCoordinates } from '@/shared/lib/coordinatesHelper';

export const MapScreen = ({ navigation, route }) => {
    const { initialLocation, returnScreen, timestamp } = route.params || {};
    const instanceId = useRef(Math.random().toString(36).substr(2, 9)).current;

    logData('MapScreen: Компонент инициализирован', {
      instanceId,
      initialLocation,
      returnScreen,
      timestamp: new Date().toISOString()
    });

    // Создаем дефолтный регион (координаты Москвы)
    const defaultRegion = useMemo(() => ({
        latitude: 55.751244,
        longitude: 37.618423,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
    }), []);

    // Если начальные координаты переданы, используем их
    const initialRegion = useMemo(() => {
        if (initialLocation) {
            try {
                // Используем parseCoordinates для безопасного парсинга координат
                const parsedCoords = parseCoordinates(initialLocation);

                logData('MapScreen: Парсинг начальных координат', {
                    initialLocation,
                    parsedCoords,
                    instanceId
                });

                if (parsedCoords && parsedCoords.latitude && parsedCoords.longitude) {
                    return {
                        latitude: parsedCoords.latitude,
                        longitude: parsedCoords.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01
                    };
                }
            } catch (e) {
                // Если не удалось распарсить координаты, используем дефолтный регион
                logData('MapScreen: Ошибка при парсинге координат', {
                    error: e.message,
                    initialLocation,
                    instanceId
                });
            }
        }

        return defaultRegion;
    }, [initialLocation, defaultRegion]);

    const [region, setRegion] = useState(initialRegion);
    const [markerPosition, setMarkerPosition] = useState(
        initialRegion !== defaultRegion
            ? { latitude: initialRegion.latitude, longitude: initialRegion.longitude }
            : null
    );
    const [isLoading, setIsLoading] = useState(!initialLocation);
    const mapRef = useRef(null);

    // Добавляем журналирование для начального положения маркера
    useEffect(() => {
        if (markerPosition) {
            logData('MapScreen: Начальное положение маркера', {
                latitude: markerPosition.latitude,
                longitude: markerPosition.longitude,
                instanceId
            });
        }
    }, []);

    // Загружаем текущее местоположение только если нет начальных координат
    useEffect(() => {
        if (!initialLocation) {
            setupInitialLocation();
        } else {
            setIsLoading(false);
        }
    }, [initialLocation]);

    const setupInitialLocation = async () => {
        try {
            setIsLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Требуется разрешение',
                    'Для работы с картой необходим доступ к геолокации',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced // Используем более низкую точность для скорости
            });

            const { latitude, longitude } = location.coords;
            const newRegion = {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
            };

            setRegion(newRegion);
            setMarkerPosition({ latitude, longitude });
            logData('MapScreen: Установлена текущая локация', {
                newRegion,
                instanceId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logData('MapScreen: Ошибка при установке локации', {
                error: error.message,
                instanceId
            });
            Alert.alert('Ошибка', 'Не удалось определить местоположение');
            // Не закрываем экран при ошибке, а просто показываем карту с дефолтным регионом
        } finally {
            setIsLoading(false);
        }
    };

    const handleMapPress = useCallback((event) => {
        const { coordinate } = event.nativeEvent;
        setMarkerPosition(coordinate);
        logData('MapScreen: Выбрана новая локация на карте', {
          coordinate,
          instanceId,
          timestamp: new Date().toISOString()
        });
    }, [instanceId]);

    // Добавляем функцию обратного геокодирования
    const reverseGeocode = useCallback(async (latitude, longitude) => {
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
                    logData('MapScreen: Получен адрес из координат', {
                        addressString,
                        coordinates: { latitude, longitude },
                        instanceId
                    });
                    return addressString;
                }
            }
            return null;
        } catch (error) {
            logData('MapScreen: Ошибка при получении адреса из координат', {
                error: error.message,
                instanceId
            });
            return null;
        }
    }, [instanceId]);

    const confirmLocation = useCallback(async () => {
        if (!markerPosition) {
            Alert.alert('Ошибка', 'Выберите местоположение на карте');
            return;
        }

        // Используем normalizeCoordinates для гарантии правильного формата
        const locationString = normalizeCoordinates(markerPosition);

        // Проверяем корректность нормализованных координат и логируем
        const checkParsed = parseCoordinates(locationString);
        logData('MapScreen: Проверка нормализованных координат', {
            original: markerPosition,
            normalized: locationString,
            parsedBack: checkParsed,
            equal: checkParsed && markerPosition &&
                   checkParsed.latitude === markerPosition.latitude &&
                   checkParsed.longitude === markerPosition.longitude,
            instanceId
        });

        // Получаем адрес для выбранных координат
        const addressString = await reverseGeocode(markerPosition.latitude, markerPosition.longitude);

        logData('MapScreen: Подтверждена локация', {
          locationString,
          addressString,
          markerPosition,
          timestamp: new Date().toISOString()
        });

        if (returnScreen) {
            try {
              const returnScreenParts = returnScreen.split('/');
              const returnScreenName = returnScreenParts[returnScreenParts.length - 1];

              // Проверяем типы данных перед отправкой
              const locationToSend = locationString || `${markerPosition.latitude},${markerPosition.longitude}`;

              logData('MapScreen: Возврат на предыдущий экран', {
                returnScreen,
                returnScreenName,
                selectedLocation: locationToSend,
                addressString,
                markerPosition,
                timestamp: new Date().toISOString()
              });

              // Передаем координаты и адрес через параметры навигации
              navigation.navigate({
                  name: returnScreenName,
                  params: {
                      selectedLocation: locationToSend,
                      addressString: addressString,
                      timestamp: new Date().getTime(), // добавляем временную метку для гарантии уникальности
                      navId: instanceId // добавляем идентификатор для отслеживания
                  },
                  merge: true
              });

              logData('MapScreen: Навигация выполнена', {
                  location: locationToSend,
                  address: addressString,
                  screen: returnScreenName,
                  navId: instanceId,
                  timestamp: new Date().toISOString()
              });
            } catch (error) {
              logData('MapScreen: Ошибка при навигации', {
                error: error.message,
                returnScreen,
                instanceId
              });
              Alert.alert('Ошибка', 'Не удалось вернуться на предыдущий экран');
            }
        }
    }, [markerPosition, returnScreen, navigation, instanceId, reverseGeocode]);

    // Оптимизированная функция для анимации к начальному региону
    const animateToRegion = useCallback((targetRegion) => {
        if (mapRef.current && targetRegion) {
            mapRef.current.animateToRegion(targetRegion, 500);
        }
    }, []);

    // Оптимизация: используем анимацию к текущему местоположению
    const goToCurrentLocation = useCallback(async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Требуется разрешение', 'Для определения текущего местоположения необходим доступ к геолокации');
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });

            const { latitude, longitude } = location.coords;
            const newRegion = {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
            };

            setRegion(newRegion);
            setMarkerPosition({ latitude, longitude });
            animateToRegion(newRegion);

            logData('MapScreen: Переход к текущему местоположению', {
                newRegion,
                instanceId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logData('MapScreen: Ошибка при получении текущего местоположения', {
                error: error.message,
                instanceId
            });
            Alert.alert('Ошибка', 'Не удалось определить текущее местоположение');
        }
    }, [animateToRegion, instanceId]);

    // Оптимизация: запускаем анимацию карты при монтировании компонента
    useEffect(() => {
        if (initialRegion && mapRef.current) {
            // Небольшая задержка для гарантии, что карта уже отрендерена
            setTimeout(() => {
                animateToRegion(initialRegion);
            }, 300);
        }
    }, [initialRegion, animateToRegion]);

    return (
        <View style={styles.container}>
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Загрузка карты...</Text>
                </View>
            ) : (
                <>
                    <UniversalMapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        style={styles.map}
                        initialRegion={initialRegion}
                        onPress={handleMapPress}
                        showsUserLocation={true}
                        showsMyLocationButton={false}
                    >
                        {markerPosition && (
                            <Marker coordinate={markerPosition} />
                        )}
                    </UniversalMapView>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={confirmLocation}
                        >
                            <Text style={styles.buttonText}>Подтвердить</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.locationButton}
                            onPress={goToCurrentLocation}
                        >
                            <Ionicons name="locate" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    map: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: Color.primary,
        paddingVertical: normalize(12),
        paddingHorizontal: normalize(20),
        borderRadius: normalize(8),
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    buttonText: {
        color: 'white',
        fontFamily: FontFamily.regular,
        fontSize: normalizeFont(16),
        fontWeight: '600',
    },
    locationButton: {
        backgroundColor: Color.primary,
        width: normalize(48),
        height: normalize(48),
        borderRadius: normalize(24),
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    loadingText: {
        fontFamily: FontFamily.regular,
        fontSize: normalizeFont(18),
        color: Color.primary,
    },
});