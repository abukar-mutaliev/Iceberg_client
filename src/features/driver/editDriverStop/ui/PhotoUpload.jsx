import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import { logData } from '@shared/lib/logger';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { getImageUrl } from '@shared/api/api';

export const PhotoUpload = ({ photo, setPhoto, error }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Проверяем, является ли фото URL строкой или объектом
  const isPhotoUrl = photo && typeof photo.uri === 'string' && (
    photo.uri.startsWith('http://') || 
    photo.uri.startsWith('https://') || 
    photo.uri.startsWith('file://')
  );

  // Нормализуем URL изображения через getImageUrl (включая замену старых IP-адресов)
  const normalizedPhotoUri = useMemo(() => {
    if (!photo || !photo.uri) return null;
    
    // Если это локальный файл (file://), возвращаем как есть
    if (photo.uri.startsWith('file://') || photo.uri.startsWith('content://')) {
      return photo.uri;
    }
    
    // Для всех остальных URL используем getImageUrl для нормализации
    return getImageUrl(photo.uri);
  }, [photo?.uri]);

  useEffect(() => {
    setImageError(false);
  }, [photo]);

  const handlePickImage = async () => {
    try {
      setIsLoading(true);
      
      // Запрашиваем разрешение на доступ к медиа-библиотеке
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Требуется разрешение',
          'Для выбора фотографии необходимо разрешение на доступ к галерее.'
        );
        setIsLoading(false);
        return;
      }
      
      // Запускаем галерею для выбора изображения
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setPhoto(selectedAsset);
        logData('Выбрано изображение', { uri: selectedAsset.uri });
      }
    } catch (error) {
      logData('Ошибка при выборе изображения', error);
      Alert.alert('Ошибка', 'Не удалось выбрать изображение.');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик ошибки загрузки изображения
  const handleImageLoadError = () => {
    logData('Ошибка загрузки изображения', { uri: photo?.uri });
    setImageError(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Добавьте фото *</Text>
      <TouchableOpacity 
        style={[styles.photoBox, error ? styles.photoBoxError : null]} 
        onPress={handlePickImage}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={Color.blue2} />
        ) : normalizedPhotoUri && !imageError ? (
          <Image 
            source={{ uri: normalizedPhotoUri }} 
            style={styles.selectedPhoto} 
            resizeMode="cover"
            onError={handleImageLoadError}
          />
        ) : (
          <View style={styles.placeholder}>
            <Feather name="camera" size={24} color="#888" />
            <Text style={styles.placeholderText}>
              {imageError ? 'Ошибка загрузки фото' : 'Загрузить фото'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      {error && typeof error === 'string' && error.trim() ? <Text style={styles.errorText}>{String(error)}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: normalize(16),
  },
  label: {
    fontSize: normalizeFont(13),
    fontWeight: '600',
    color: Color.dark,
    opacity: 0.4,
    marginBottom: normalize(10),
    fontFamily: FontFamily.sFProText,
  },
  photoBox: {
    width: normalize(150),
    height: normalize(150),
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: normalize(4),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  photoBoxError: {
    borderColor: '#FF3B30',
    borderWidth: 1.5,
  },
  selectedPhoto: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: normalizeFont(12),
    color: '#888',
    marginTop: normalize(8),
    textAlign: 'center',
    fontFamily: FontFamily.sFProText,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: normalizeFont(12),
    marginTop: normalize(4),
    fontFamily: FontFamily.sFProText,
  },
}); 