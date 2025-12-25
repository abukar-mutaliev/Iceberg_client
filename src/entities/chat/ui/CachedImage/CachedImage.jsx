import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { getBaseUrl } from '@shared/api/api';

// Глобальный кэш проверенных путей
const verifiedPaths = new Map();

/**
 * CachedImage - Компонент для кэширования изображений
 */
export function CachedImage({ source, style, resizeMode = 'cover', ...props }) {
  // Вычисляем абсолютный URL и путь к хранилищу
  const { absoluteUri, storagePath, isLocalFile } = useMemo(() => {
    if (!source?.uri) return { absoluteUri: null, storagePath: null, isLocalFile: false };

    const imageUri = source.uri;
    
    // Локальный файл
    if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
      return { absoluteUri: imageUri, storagePath: imageUri, isLocalFile: true };
    }

    // Формируем URL
    let fullUrl = imageUri;
    if (!imageUri.startsWith('http://') && !imageUri.startsWith('https://')) {
      let path = imageUri.replace(/\\/g, '/');
      if (!path.startsWith('/')) path = '/' + path;
      fullUrl = `${getBaseUrl()}${path}`;
    }

    // Путь к хранилищу
    const urlParts = fullUrl.split('/');
    const lastPart = urlParts[urlParts.length - 1] || fullUrl;
    const urlHash = lastPart.split('').reduce((acc, char) => {
      const hash = ((acc << 5) - acc) + char.charCodeAt(0);
      return hash & hash;
    }, 0);
    
    const extension = lastPart.includes('.') 
      ? lastPart.split('.').pop()?.split('?')[0] || 'jpg'
      : 'jpg';
    
    const fileName = `img_${Math.abs(urlHash)}.${extension}`;
    const storageDir = `${FileSystem.documentDirectory}chat_media/`;

    return { absoluteUri: fullUrl, storagePath: `${storageDir}${fileName}`, isLocalFile: false };
  }, [source?.uri]);

  // Определяем URI на основе глобального кэша
  const getInitialUri = useCallback(() => {
    if (!absoluteUri) return null;
    if (isLocalFile) return absoluteUri;
    if (verifiedPaths.has(storagePath)) {
      return verifiedPaths.get(storagePath) ? storagePath : absoluteUri;
    }
    return absoluteUri;
  }, [absoluteUri, storagePath, isLocalFile]);

  const [displayUri, setDisplayUri] = useState(getInitialUri);

  // Проверяем хранилище и кэшируем
  useEffect(() => {
    if (!absoluteUri || !storagePath || isLocalFile) return;
    if (verifiedPaths.has(storagePath)) return;

    let isMounted = true;

    const checkAndCache = async () => {
      try {
        const fileInfo = await FileSystem.getInfoAsync(storagePath);
        
        if (fileInfo.exists && fileInfo.size > 0) {
          verifiedPaths.set(storagePath, true);
          if (isMounted) setDisplayUri(storagePath);
        } else {
          verifiedPaths.set(storagePath, false);
          // Скачиваем в фоне
          try {
            const storageDir = `${FileSystem.documentDirectory}chat_media/`;
            const dirInfo = await FileSystem.getInfoAsync(storageDir);
            if (!dirInfo.exists) {
              await FileSystem.makeDirectoryAsync(storageDir, { intermediates: true });
            }
            const result = await FileSystem.downloadAsync(absoluteUri, storagePath);
            if (result.status === 200) {
              verifiedPaths.set(storagePath, true);
            }
          } catch (e) {
            // Игнорируем
          }
        }
      } catch (e) {
        verifiedPaths.set(storagePath, false);
      }
    };

    checkAndCache();
    return () => { isMounted = false; };
  }, [absoluteUri, storagePath, isLocalFile]);

  // Обработка ошибки
  const handleError = useCallback(() => {
    if (displayUri === storagePath && absoluteUri) {
      verifiedPaths.set(storagePath, false);
      setDisplayUri(absoluteUri);
    }
  }, [displayUri, storagePath, absoluteUri]);

  if (!displayUri) {
    return <View style={[style, styles.placeholder]} />;
  }

  return (
    <Image
      source={{ uri: displayUri }}
      style={style}
      resizeMode={resizeMode}
      onError={handleError}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#E0E0E0',
  },
});
