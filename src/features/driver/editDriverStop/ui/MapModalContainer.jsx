import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Platform, Alert } from 'react-native';
import UniversalMapView, { Marker } from '@shared/ui/Map/UniversalMapView';
import { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { normalize } from "@shared/lib/normalize";
import CloseIcon from "@shared/ui/Icon/Profile/CloseIcon";
import { Color } from "@app/styles/GlobalStyles";

export const MapModalContainer = ({ visible, onClose, onConfirm, initialLocation }) => {
  const [region, setRegion] = useState({
    latitude: 55.751244,
    longitude: 37.618423,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  
  const [markerPosition, setMarkerPosition] = useState(null);
  const [loading, setLoading] = useState(false);

  // Установка начальной локации, если она передана
  useEffect(() => {
    if (initialLocation && initialLocation.latitude && initialLocation.longitude) {
      const { latitude, longitude } = initialLocation;
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      setMarkerPosition({ latitude, longitude });
    }
  }, [initialLocation]);

  // Обработчик нажатия на карту
  const handleMapPress = (event) => {
    const { coordinate } = event.nativeEvent;
    setMarkerPosition(coordinate);
  };

  // Подтверждение выбора локации
  const handleConfirmLocation = () => {
    if (markerPosition) {
      const locationString = `${markerPosition.latitude},${markerPosition.longitude}`;
      onConfirm(locationString);
      onClose();
    } else {
      Alert.alert('Ошибка', 'Необходимо выбрать локацию на карте');
    }
  };


  // Получение текущей локации пользователя
  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      console.log('Запрос на получение текущей локации');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Отказано в доступе к геолокации', 'Для определения вашего местоположения необходимо разрешение');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      console.log('Получена текущая локация', { latitude, longitude });
      
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      setMarkerPosition({ latitude, longitude });
    } catch (error) {
      console.error('Ошибка при получении текущей локации', error);
      Alert.alert('Ошибка', 'Не удалось получить текущую локацию');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <CloseIcon name="close" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Выберите локацию</Text>
          <View style={styles.emptySpace} />
        </View>

        <UniversalMapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={handleMapPress}
        >
          {markerPosition && (
            <Marker
              coordinate={markerPosition}
              draggable
              onDragEnd={(e) => setMarkerPosition(e.nativeEvent.coordinate)}
            />
          )}
        </UniversalMapView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.getCurrentButton]}
            onPress={getCurrentLocation}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Загрузка...' : 'Моя локация'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.confirmButton]}
            onPress={handleConfirmLocation}
          >
            <Text style={styles.buttonText}>Подтвердить</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: normalize(16),
    height: normalize(56),
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: normalize(18),
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: normalize(8),
  },
  emptySpace: {
    width: normalize(40),
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: normalize(16),
    paddingBottom: Platform.OS === 'ios' ? normalize(32) : normalize(16),
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    flex: 1,
    borderRadius: normalize(8),
    paddingVertical: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  getCurrentButton: {
    backgroundColor: '#F5F5F5',
    marginRight: normalize(8),
  },
  confirmButton: {
    backgroundColor: Color.blue2,
    marginLeft: normalize(8),
  },
  buttonText: {
    fontSize: normalize(16),
    fontWeight: '500',
    color: '#000',
  },
}); 