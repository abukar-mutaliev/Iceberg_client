import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MapModalContainer } from './MapModalContainer';
import { normalize } from "@shared/lib/normalize";
import { logData } from '@shared/lib/logger';
import { Color } from '@app/styles/GlobalStyles';

export const LocationInput = ({ label, value, onChange, error }) => {
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    logData('LocationInput (EditDriverStop): Инициализация/обновление компонента', { 
      value, 
      timestamp: new Date().toISOString(),
      componentInstance: Math.random().toString(36).substr(2, 9)
    });
  }, []);

  useEffect(() => {
    logData('LocationInput (EditDriverStop): Получено новое значение value', { 
      value,
      timestamp: new Date().toISOString()
    });
    
    if (value && typeof value === 'string') {
      try {
        const [latitude, longitude] = value.split(',').map(Number);
        if (!isNaN(latitude) && !isNaN(longitude)) {
          setLocation({ latitude, longitude });
          logData('LocationInput (EditDriverStop): Распарсены координаты', { latitude, longitude });
        }
      } catch (error) {
        logData('LocationInput (EditDriverStop): Ошибка при парсинге координат:', error);
      }
    }
  }, [value]);

  const handleToggleMapModal = () => {
    logData('LocationInput (EditDriverStop): Переключение видимости карты', {
      isVisible: !isMapModalVisible,
      currentValue: value
    });
    setIsMapModalVisible(!isMapModalVisible);
  };

  const handleLocationConfirm = (locationString) => {
    setIsLoading(true);
    logData('LocationInput (EditDriverStop): Координаты подтверждены:', {
      locationString,
      oldValue: value,
      timestamp: new Date().toISOString()
    });
    
    onChange(locationString);
    
    try {
      const [latitude, longitude] = locationString.split(',').map(Number);
      setLocation({ latitude, longitude });
    } catch (error) {
      logData('LocationInput (EditDriverStop): Ошибка при парсинге координат:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatLocation = () => {
    if (!value) return 'Не выбрано';
    
    try {
      const [lat, lng] = value.split(',');
      return `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
    } catch (error) {
      return 'Неверный формат';
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity 
        style={[styles.locationButton, error ? styles.errorInput : null]} 
        onPress={handleToggleMapModal}
        disabled={isLoading}
      >
        <View style={styles.locationTextContainer}>
          {isLoading ? (
            <ActivityIndicator size="small" color={Color.blue2} />
          ) : (
            <>
              <Text style={styles.locationText}>
                {value ? formatLocation() : 'Выбрать на карте'}
              </Text>
              <MaterialIcons name="location-on" size={24} color={Color.blue2} />
            </>
          )}
        </View>
      </TouchableOpacity>
      
      {error && <Text style={styles.errorText}>{error}</Text>}

      <MapModalContainer
        visible={isMapModalVisible}
        onClose={handleToggleMapModal}
        onConfirm={handleLocationConfirm}
        initialLocation={location}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: normalize(16),
  },
  label: {
    fontSize: normalize(16),
    fontWeight: '500',
    marginBottom: normalize(8),
    color: '#333',
  },
  locationButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: normalize(8),
    paddingHorizontal: normalize(12),
    paddingVertical: normalize(10),
    backgroundColor: '#F9F9F9',
  },
  locationTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationText: {
    fontSize: normalize(16),
    color: '#333',
    flex: 1,
  },
  errorInput: {
    borderColor: Color.red,
  },
  errorText: {
    color: Color.red,
    fontSize: normalize(12),
    marginTop: normalize(4),
  },
}); 