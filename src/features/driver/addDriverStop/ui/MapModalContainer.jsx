import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, Alert, Dimensions } from 'react-native';
import UniversalMapView, { Marker } from '@shared/ui/Map/UniversalMapView';
import { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Color, FontFamily, FontSize } from '@app/styles/GlobalStyles';
import { logData } from '@shared/lib/logger';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import {BackButton} from "@shared/ui/Button/BackButton";

export const MapModalContainer = ({
                                    visible,
                                    setVisible,
                                    mapRegion,
                                    setMapRegion,
                                    markerPosition,
                                    setMarkerPosition,
                                    onConfirm
                                  }) => {
  // Обработчик выбора местоположения на карте
  const handleMapPress = (event) => {
    const { coordinate } = event.nativeEvent;
    setMarkerPosition(coordinate);
    setMapRegion({
      ...mapRegion,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude
    });
    const locationString = `${coordinate.latitude},${coordinate.longitude}`;
    logData('Выбрано местоположение на карте', locationString);
  };

  // Функция для подтверждения выбора координат с карты
  const confirmLocationSelection = async () => {
    if (markerPosition) {
      const locationString = `${markerPosition.latitude},${markerPosition.longitude}`;
      logData('Подтверждение локации из MapModalContainer', locationString);
      
      if (onConfirm && typeof onConfirm === 'function') {
        onConfirm(locationString);
        // Закрываем модальное окно после выбора
        setVisible(false);
      } else {
        Alert.alert('Ошибка', 'Не удалось обработать выбор местоположения');
      }
    } else {
      Alert.alert('Ошибка', 'Выберите местоположение на карте');
    }
  };

  // Функция для определения текущего местоположения
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
            'Требуется разрешение',
            'Для определения текущего местоположения необходимо разрешение на доступ к геолокации.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const { latitude, longitude } = location.coords;
      const locationString = `${latitude},${longitude}`;

      setMarkerPosition({ latitude, longitude });
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      });

      logData('Получены текущие координаты для карты', locationString);
    } catch (error) {
      logData('Ошибка при получении текущего местоположения для карты', error);
      Alert.alert('Ошибка', 'Не удалось определить текущее местоположение');
    }
  };

  const handleCloseModal = () => {
    logData('Закрытие модального окна с картой');
    setVisible(false);
  };

  return (
      <Modal
          animationType="slide"
          transparent={false}
          visible={visible}
          onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Заголовок модального окна */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
                style={styles.backButton}
                onPress={handleCloseModal}
            >
              <BackButton />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Выберите местоположение</Text>
          </View>
          
          {/* Карта */}
          <View style={styles.mapContainer}>
            <UniversalMapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={mapRegion}
                onPress={handleMapPress}
                showsUserLocation={true}
            >
              {markerPosition && (
                  <Marker
                      coordinate={markerPosition}
                      draggable
                      onDragEnd={(e) => setMarkerPosition(e.nativeEvent.coordinate)}
                  />
              )}
            </UniversalMapView>
          </View>

          <View style={styles.mapInstructionsContainer}>
            <Text style={styles.mapInstructions}>
              Нажмите на карту, чтобы выбрать местоположение или перетащите маркер
            </Text>

            <View style={styles.mapButtonsContainer}>
              <TouchableOpacity
                  style={styles.mapButton}
                  onPress={getCurrentLocation}
              >
                <Text style={styles.mapButtonText}>Мое местоположение</Text>
              </TouchableOpacity>

              <TouchableOpacity
                  style={[styles.mapButton, { backgroundColor: Color.blue2 }]}
                  onPress={confirmLocationSelection}
              >
                <Text style={styles.mapButtonText}>Подтвердить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: normalize(44),
    paddingHorizontal: normalize(20),
    borderBottomWidth: 0.5,
    borderBottomColor: '#ebebf0',
  },
  backButton: {
    padding: 15,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: normalizeFont(FontSize.size_sm),
    fontWeight: '600',
    color: Color.dark,
    fontFamily: FontFamily.sFProText,
    textAlign: 'center',
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapInstructionsContainer: {
    padding: normalize(20),
    backgroundColor: '#fff',
  },
  mapInstructions: {
    fontSize: normalizeFont(14),
    color: '#666',
    marginBottom: normalize(15),
    textAlign: 'center',
  },
  mapButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapButton: {
    backgroundColor: '#666',
    paddingHorizontal: normalize(15),
    paddingVertical: normalize(12),
    borderRadius: normalize(4),
    flex: 1,
    marginHorizontal: normalize(5),
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#fff',
    fontSize: normalizeFont(14),
    fontWeight: '500',
  }
});