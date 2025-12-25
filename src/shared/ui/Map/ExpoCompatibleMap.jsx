import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { logData } from '@shared/lib/logger';

// Компонент-обёртка для MapView, совместимый с Expo Go
export const ExpoCompatibleMap = ({ 
  style, 
  children, 
  onError, 
  fallbackComponent: FallbackComponent,
  ...props 
}) => {
  const handleMapError = (error) => {
    logData('ExpoCompatibleMap: Ошибка карты', {
      error: error?.nativeEvent || error,
      message: 'Возможно отсутствует Google Maps API ключ в Expo Go'
    });
    
    if (onError) {
      onError(error);
    }
  };

  const handleMapReady = () => {
    logData('ExpoCompatibleMap: Карта готова к использованию');
  };

  return (
    <View style={style}>
      <MapView
        {...props}
        style={StyleSheet.absoluteFillObject}
        onError={handleMapError}
        onMapReady={handleMapReady}
        // Не используем provider для совместимости с Expo Go
        showsUserLocation={props.showsUserLocation ?? true}
        showsMyLocationButton={props.showsMyLocationButton ?? false}
        toolbarEnabled={props.toolbarEnabled ?? false}
        // Добавляем дополнительные настройки для стабильности
        loadingEnabled={true}
        mapType="standard"
      >
        {children}
      </MapView>
    </View>
  );
};

// Компонент для отображения в случае ошибки карты
export const MapErrorFallback = ({ message, onRetry }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorTitle}>Проблема с загрузкой карты</Text>
    <Text style={styles.errorMessage}>
      {message || 'Карта временно недоступна. Это может быть связано с настройками Expo Go.'}
    </Text>
    {onRetry && (
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Попробовать снова</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 