/**
 * CachedVoice - Оптимизированный компонент для голосовых сообщений
 * 
 * Улучшения:
 * - Надежная перемотка с точным позиционированием
 * - Компактный дизайн с меньшей высотой
 * - Разделение логики на кастомные хуки
 * - Улучшенная производительность
 */

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Pressable, Platform, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { getBaseUrl, getImageUrl } from '@shared/api/api';
import { audioManager } from '../../lib/audioManager';

// ============================================================================
// УТИЛИТЫ И КОНСТАНТЫ
// ============================================================================

const CACHE_DIR = `${FileSystem.documentDirectory}chat_voice/`;
const verifiedCachePaths = new Map();

// Условное логирование (только в dev режиме и только критичные сообщения)
const ENABLE_VERBOSE_LOGS = false; // Отключаем избыточное логирование для производительности

const devLog = (...args) => {
  if (__DEV__ && ENABLE_VERBOSE_LOGS) {
    console.log(...args);
  }
};

const devWarn = (...args) => {
  if (__DEV__) {
    console.warn(...args);
  }
};

// Хеширование URL для имени файла
const hashUrl = (url) => {
  const hash = url.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  return Math.abs(hash);
};

// Форматирование времени
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Генерация waveform на основе duration и размера файла (детерминированная)
const generateWaveform = (attachment, length = 40) => {
  if (!attachment) {
    // Fallback для случаев, когда attachment не определен
    return Array.from({ length }, () => 0.5);
  }

  const duration = attachment.duration || 0;
  const size = attachment.size || 0;
  const seed = (duration * 1000) + size + 12345; // Комбинируем duration и size для уникальности
  return Array.from({ length }, (_, i) => {
    const x = (seed * (i + 1)) % 100;
    return 0.3 + (x / 100) * 0.7;
  });
};

// ============================================================================
// КОМПОНЕНТЫ
// ============================================================================

const StatusTicks = memo(({ status }) => {
  const getTicksForStatus = () => {
    switch (status) {
      case 'SENDING':
        return <Text style={[styles.tick, styles.tickSending]}>✓</Text>;
      case 'FAILED':
        return <Text style={[styles.tick, styles.tickFailed]}>❌</Text>;
      case 'read':
      case 'READ':
        return (
          <>
            <Text style={[styles.tick, styles.tickRead]}>✓</Text>
            <Text style={[styles.tick, styles.tickRead, styles.secondTick]}>✓</Text>
          </>
        );
      case 'DELIVERED':
        return (
          <>
            <Text style={styles.tick}>✓</Text>
            <Text style={[styles.tick, styles.secondTick]}>✓</Text>
          </>
        );
      case 'SENT':
      default:
        return (
          <>
            <Text style={styles.tick}>✓</Text>
            <Text style={[styles.tick, styles.secondTick]}>✓</Text>
          </>
        );
    }
  };

  return <View style={styles.ticksContainer}>{getTicksForStatus()}</View>;
});

StatusTicks.displayName = 'StatusTicks';

// ============================================================================
// КАСТОМНЫЕ ХУКИ
// ============================================================================

// Хук для работы с аудио URI и кэшем
const useAudioUri = (attachment) => {
  return useMemo(() => {
    if (!attachment?.path) return { audioUri: null, cachedPath: null, fallbackUrls: [] };
    
    let path = attachment.path;
    
    // Уже локальный файл
    if (path.startsWith('file://')) {
      return { audioUri: path, cachedPath: path, fallbackUrls: [] };
    }
    
    // Формируем полный URL используя централизованную функцию с нормализацией
    // Это нормализует URL, заменяя старый IP на текущий базовый URL
    const normalizedUrl = getImageUrl(path);
    let fullUrl = normalizedUrl || path;
    const fallbackUrls = [];
    const baseUrl = getBaseUrl();
    
    // Если getImageUrl вернул null, используем оригинальный путь
    if (!fullUrl) {
      fullUrl = path;
    }
    
    // Для относительных путей добавляем fallback варианты
    if (!path.startsWith('http://') && !path.startsWith('https://')) {
      // Относительный путь - getImageUrl уже обработал его
      // Добавляем fallback варианты для старых сообщений
      const normalizedPath = path.replace(/\\/g, '/');
      const cleanPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
      
      // Fallback: старый формат без /uploads
      if (!cleanPath.includes('/uploads')) {
        fallbackUrls.push(`${baseUrl}${cleanPath}`);
      }
      // Fallback: вариант с прямым путем /uploads
      if (cleanPath.startsWith('/uploads')) {
        fallbackUrls.push(`${baseUrl}${cleanPath}`);
      } else {
        fallbackUrls.push(`${baseUrl}/uploads${cleanPath}`);
      }
    } else {
      // Если исходный path был полным URL, getImageUrl уже нормализовал его
      // Но нужно также нормализовать fallback варианты, если они были созданы из старого URL
      
      // Если нормализованный URL отличается от исходного, значит был старый IP
      // В этом случае не добавляем fallback с протоколом, так как URL уже нормализован
      if (normalizedUrl && normalizedUrl !== path) {
        // URL был нормализован (старый IP заменен), не добавляем fallback
      } else {
        // URL не был нормализован, добавляем fallback варианты
        try {
          const urlObj = new URL(fullUrl);
          
          // Пробуем вариант с другим протоколом (HTTPS -> HTTP)
          // ВАЖНО: не добавляем HTTP->HTTPS, иначе на Android получаем SSLException
          if (urlObj.protocol === 'https:') {
            const httpUrl = fullUrl.replace('https://', 'http://');
            if (httpUrl !== fullUrl) {
              fallbackUrls.push(httpUrl);
            }
          }
        } catch (e) {
          // Если не удалось распарсить URL, игнорируем
          devWarn('Failed to parse URL for fallbacks:', fullUrl, e);
        }
      }
    }
    
    // Вычисляем путь к кэшу
    // ВАЖНО для Android: корректное расширение файла повышает шанс успешного декодирования (особенно для m4a/mp4 контейнера).
    const mime = String(attachment?.mimeType || attachment?.mimetype || '').toLowerCase();
    const urlLower = String(fullUrl || '').toLowerCase();
    const isM4A =
      mime.includes('audio/mp4') ||
      mime.includes('audio/m4a') ||
      mime.includes('x-m4a') ||
      urlLower.includes('.m4a') ||
      urlLower.includes('.mp4');
    const extension = isM4A ? 'm4a' : 'aac';
    const cached = `${CACHE_DIR}voice_${hashUrl(fullUrl)}.${extension}`;
    
    return { audioUri: fullUrl, cachedPath: cached, fallbackUrls };
  }, [attachment?.path, attachment?.mimeType, attachment?.mimetype]);
};

// Хук для парсинга waveform
const useWaveform = (attachment, messageId) => {
  return useMemo(() => {
    if (attachment?.waveform) {
      try {
        const parsed = typeof attachment.waveform === 'string'
          ? JSON.parse(attachment.waveform)
          : attachment.waveform;

        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    }

    const generated = generateWaveform(attachment);
    return generated;
  }, [attachment?.waveform, attachment?.duration, attachment?.size, messageId]);
};

// Хук для управления анимацией прогресса
const useProgressAnimation = (playbackPosition, playbackDuration, isPlaying) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    if (playbackDuration > 0) {
      if (isPlaying) {
        const nextPosition = Math.min(playbackPosition + 1, playbackDuration);
        const nextProgress = (nextPosition / playbackDuration) * 100;
        
        animationRef.current = Animated.timing(progressAnim, {
          toValue: nextProgress,
          duration: 1000,
          useNativeDriver: false,
          easing: Easing.linear,
        });
        animationRef.current.start();
      } else {
        const targetProgress = (playbackPosition / playbackDuration) * 100;
        progressAnim.setValue(targetProgress);
      }
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [playbackPosition, playbackDuration, isPlaying, progressAnim]);

  useEffect(() => {
    if (!isPlaying && playbackPosition === 0) {
      progressAnim.setValue(0);
    }
  }, [isPlaying, playbackPosition, progressAnim]);

  return progressAnim;
};

// Хук для загрузки и управления аудио
const useAudioPlayer = (audioUri, cachedPath, messageId, onPlaybackStatusUpdate, fallbackUrls = []) => {
  const soundRef = useRef(null);
  const androidDownloadTriedRef = useRef(false);

  useEffect(() => {
    androidDownloadTriedRef.current = false;
  }, [audioUri, cachedPath]);

  const withTimeout = useCallback((promise, ms, label) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms)),
    ]);
  }, []);

  // Android: content:// нужен редко (обычно для расшаривания файла наружу),
  // а в некоторых случаях может ломать/подвешивать загрузку в expo-av.
  // Поэтому: сначала пробуем file://, и только если не загрузилось — пробуем content://.
  const createSoundAndroidFileFirst = useCallback(async (fileUri, soundOptions) => {
    const baseSource = { uri: fileUri };
    if (__DEV__) {
      devLog('🎧 [Android] createAsync(file://) attempt', { messageId, uri: fileUri });
    }
    try {
        const { sound } = await withTimeout(
          Audio.Sound.createAsync(baseSource, soundOptions, onPlaybackStatusUpdate),
          3000, // Увеличено с 1500 до 3000ms для медленных сетей
          'Audio.Sound.createAsync(file://)'
        );
      return sound;
    } catch (e1) {
      if (__DEV__) {
        devWarn('🎧 [Android] createAsync(file://) failed', { messageId, error: e1.message, uri: fileUri });
      }
      try {
        const contentUri = await withTimeout(
          FileSystem.getContentUriAsync(fileUri),
          2000, // Увеличено с 1000 до 2000ms
          'FileSystem.getContentUriAsync'
        );
        if (__DEV__) {
          devLog('🎧 [Android] createAsync(content://) attempt', { messageId, uri: contentUri });
        }
        const { sound } = await withTimeout(
          Audio.Sound.createAsync({ uri: contentUri }, soundOptions, onPlaybackStatusUpdate),
          3000, // Увеличено с 1500 до 3000ms
          'Audio.Sound.createAsync(content://)'
        );
        return sound;
      } catch (e2) {
        if (__DEV__) {
          devWarn('🎧 [Android] createAsync(content://) failed', { messageId, error: e2.message, uri: fileUri });
        }
        throw e1;
      }
    }
  }, [messageId, onPlaybackStatusUpdate, withTimeout]);

  const downloadInBackground = useCallback(async (url, destPath) => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
      
      const result = await FileSystem.downloadAsync(url, destPath);
      // Некоторые сервера (и/или клиенты) могут возвращать 206 Partial Content,
      // что для нас тоже успех, если файл корректно скачался.
      if ((result.status === 200 || result.status === 206) && result.uri) {
        verifiedCachePaths.set(destPath, true);
      }
    } catch {
      // Тихо игнорируем ошибки
    }
  }, []);

  // Загрузка файла через fetch и сохранение локально (для iOS с проблемными URL)
  const downloadAndCacheAudio = useCallback(async (url, destPath) => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
      
      if (__DEV__) {
        devLog(`📥 Downloading audio via fetch for message ${messageId}: ${url}`);
      }
      
      // Используем FileSystem.downloadAsync с дополнительными опциями.
      // ВАЖНО: для download Range не нужен (и часто приводит к status=206),
      // поэтому на Android оставляем только Accept.
      const downloadOptions = Platform.OS === 'ios'
        ? { cache: false }
        : {
            headers: {
              'Accept': 'audio/aac, audio/mpeg, audio/mp4, audio/*',
            }
          };
      
      const result = await FileSystem.downloadAsync(url, destPath, downloadOptions);
      
      if ((result.status === 200 || result.status === 206) && result.uri) {
        // Проверяем, что файл действительно сохранен и имеет размер
        try {
          const fileInfo = await FileSystem.getInfoAsync(result.uri);
          if (!fileInfo.exists || fileInfo.size === 0) {
            throw new Error('Downloaded file is empty or does not exist');
          }
          
          if (__DEV__) {
            devLog(`✅ Successfully downloaded and cached audio for message ${messageId}, size: ${fileInfo.size} bytes`);
          }
          
          verifiedCachePaths.set(destPath, true);
          return result.uri;
        } catch (checkError) {
          if (__DEV__) {
            devWarn(`⚠️ Downloaded file verification failed for message ${messageId}:`, checkError.message);
          }
          throw new Error(`File verification failed: ${checkError.message}`);
        }
      } else {
        throw new Error(`Download failed with status ${result.status}`);
      }
    } catch (error) {
      if (__DEV__) {
        devWarn(`❌ Failed to download audio via fetch for message ${messageId}:`, error.message);
      }
      verifiedCachePaths.set(destPath, false);
      throw error;
    }
  }, [messageId]);

  // Проверка доступности URL через HEAD запрос (только для iOS)
  // Используется только для fallback URLs, чтобы не замедлять основной поток
  const checkUrlAvailability = useCallback(async (url) => {
    if (Platform.OS !== 'ios') return true; // На Android пропускаем проверку
    
    try {
      // Используем таймаут для быстрой проверки
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500); // Уменьшено с 3000 до 1500ms
      
      const response = await fetch(url, { 
        method: 'HEAD', 
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      // Если проверка не удалась, все равно пробуем загрузить (может быть временная проблема)
      return true;
    }
  }, []);

  const loadAndPlayAudio = useCallback(async () => {
    if (!audioUri) return null;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    // Сначала проверяем кэш
    let cachedUri = null;
    if (cachedPath) {
      if (verifiedCachePaths.has(cachedPath)) {
        const isCached = verifiedCachePaths.get(cachedPath);
        if (isCached) {
            try {
              const fileInfo = await FileSystem.getInfoAsync(cachedPath);
              if (fileInfo.exists && fileInfo.size > 0) {
                cachedUri = cachedPath;
              } else {
              // Файл существует, но пустой или поврежден - помечаем как невалидный
              verifiedCachePaths.set(cachedPath, false);
              if (__DEV__) {
                devWarn(`⚠️ Cached file is empty or invalid for message ${messageId}, will re-download`);
              }
            }
          } catch {
            verifiedCachePaths.set(cachedPath, false);
          }
        }
      } else {
        try {
          const fileInfo = await FileSystem.getInfoAsync(cachedPath);
          if (fileInfo.exists && fileInfo.size > 0) {
            // Файл существует, но не проверен - проверим его при попытке загрузки
            // Пока не помечаем как валидный, чтобы попробовать загрузить сначала
          } else {
            verifiedCachePaths.set(cachedPath, false);
            // Запускаем фоновую загрузку
            downloadInBackground(audioUri, cachedPath);
          }
        } catch {
          verifiedCachePaths.set(cachedPath, false);
        }
      }
    }

    // ===== ANDROID: всегда предпочитаем локальный файл для сетевых voice =====
    // Практика: ExoPlayer/HTTP стриминг m4a иногда "молчит" или падает без понятной ошибки,
    // а локальный файл воспроизводится стабильно. Поэтому, если это сетевой URL и кэша нет —
    // скачиваем синхронно и играем локально.
    if (
      Platform.OS === 'android' &&
      audioUri &&
      !audioUri.startsWith('file://') &&
      cachedPath &&
      !cachedUri
    ) {
      try {
        const downloadedPath = await downloadAndCacheAudio(audioUri, cachedPath);
        const uriToLoad = downloadedPath && !downloadedPath.startsWith('file://')
          ? `file://${downloadedPath}`
          : downloadedPath;

        const localSound = await createSoundAndroidFileFirst(uriToLoad, { shouldPlay: false, volume: 1.0 });

        const localStatus = await localSound.getStatusAsync();
        if (localStatus.isLoaded) {
          verifiedCachePaths.set(cachedPath, true);
          return localSound;
        }

        if (__DEV__) {
          devWarn(`⚠️ Android localSound not loaded for message ${messageId}`, {
            status: localStatus,
            uri: uriToLoad
          });
        }
        await localSound.unloadAsync();
        verifiedCachePaths.set(cachedPath, false);
      } catch (androidPreErr) {
        if (__DEV__) {
          devWarn(`❌ Android pre-download failed for message ${messageId}:`, androidPreErr.message);
        }
        // Если не удалось скачать/проиграть локально — продолжаем стандартный цикл (stream/fallback)
      }
    }

    // Формируем список URL для попыток: сначала кэш, потом основной URL, потом fallback
    const urlsToTry = [];
    if (cachedUri) {
      urlsToTry.push(cachedUri);
    }
    urlsToTry.push(audioUri);
    // Добавляем fallback URLs, исключая дубликаты
    fallbackUrls.forEach(url => {
      if (url !== audioUri && !urlsToTry.includes(url)) {
        urlsToTry.push(url);
      }
    });

    // Пытаемся загрузить с каждого URL по очереди
    let lastError = null;
    
    for (const urlToTry of urlsToTry) {
      try {
        // На iOS проверяем доступность URL перед загрузкой только для fallback URLs
        // Основной URL и кэш пробуем сразу
        const isFallbackUrl = urlToTry !== audioUri && urlToTry !== cachedUri;
        if (Platform.OS === 'ios' && isFallbackUrl && !urlToTry.startsWith('file://')) {
          const isAvailable = await checkUrlAvailability(urlToTry);
          if (!isAvailable) {
            if (__DEV__) {
              devWarn(`⚠️ Fallback URL not available for message ${messageId}: ${urlToTry}`);
            }
            lastError = new Error(`URL not available: ${urlToTry}`);
            continue;
          }
        }

        // На iOS для локальных файлов и AAC используем дополнительные опции
        let soundOptions = { shouldPlay: false };
        if (Platform.OS === 'ios' && (urlToTry.startsWith('file://') || urlToTry.includes('.aac'))) {
          soundOptions = {
            shouldPlay: false,
            isMuted: false,
            volume: 1.0,
            rate: 1.0,
            shouldCorrectPitch: true,
            progressUpdateIntervalMillis: 1000,
          };
        }
        
        // Для сетевых URL добавляем заголовки и на iOS, и на Android:
        // - Accept: помогает корректно выбрать тип
        // - Range: позволяет стриминг/перемотку (сервер поддерживает Accept-Ranges)
        const isNetworkUrl = !urlToTry.startsWith('file://');
        const sourceOptions = isNetworkUrl
          ? {
              uri: urlToTry,
              headers: {
                'Accept': 'audio/aac, audio/mpeg, audio/mp4, audio/*',
                'Range': 'bytes=0-'
              }
            }
          : { uri: urlToTry };
        
        if (__DEV__) {
          devLog('🎧 createAsync attempt', { messageId, urlToTry, isNetworkUrl });
        }

        // Для Android локальные файлы пробуем file:// -> content:// (если понадобится)
        const newSound = (Platform.OS === 'android' && !isNetworkUrl)
          ? await createSoundAndroidFileFirst(sourceOptions.uri, soundOptions)
          : (await withTimeout(
              Audio.Sound.createAsync(sourceOptions, soundOptions, onPlaybackStatusUpdate),
              5000, // Увеличено с 2000 до 5000ms для медленных сетей
              'Audio.Sound.createAsync(network)'
            )).sound;

        const soundStatus = await newSound.getStatusAsync();
        if (soundStatus.isLoaded) {
          // Если это кэшированный файл, помечаем его как валидный
          if (urlToTry === cachedUri || urlToTry === cachedPath) {
            verifiedCachePaths.set(cachedPath, true);
            if (__DEV__) {
              devLog(`✅ Loaded from cache for message ${messageId}`);
            }
          } else if (urlToTry !== audioUri) {
            if (__DEV__) {
              devLog(`✅ Successfully loaded audio from fallback URL for message ${messageId}: ${urlToTry}`);
            }
          }
          return newSound;
        } else {
          if (__DEV__) {
            devWarn(`⚠️ Sound created but not loaded for message ${messageId}`, {
              urlToTry,
              status: soundStatus
            });
          }
          await newSound.unloadAsync();
          // Если это кэшированный файл и он не загрузился, помечаем как невалидный
          if (urlToTry === cachedUri || urlToTry === cachedPath) {
            verifiedCachePaths.set(cachedPath, false);
            if (__DEV__) {
              devWarn(`⚠️ Cached file failed to load for message ${messageId}, marking as invalid`);
            }
          }
          lastError = new Error('Sound not loaded');
        }
      } catch (err) {
        lastError = err;
        if (__DEV__) {
          devWarn(`❌ Failed to load audio from ${urlToTry} for message ${messageId}:`, err.message);
        }
        
        // ===== ANDROID FALLBACK =====
        // Если Android не смог загрузить по URL (часто бывает со стримингом m4a),
        // пробуем скачать файл в cachedPath и загрузить локально.
        if (
          Platform.OS === 'android' &&
          !androidDownloadTriedRef.current &&
          !urlToTry.startsWith('file://') &&
          cachedPath
        ) {
          androidDownloadTriedRef.current = true;
          try {
            if (__DEV__) {
              devLog(`📥 Android fallback download for message ${messageId}: ${urlToTry}`);
            }
            
            // Если в кэше уже лежит файл — но он мог быть битым, удалим перед скачиванием
            try {
              const existing = await FileSystem.getInfoAsync(cachedPath);
              if (existing.exists) {
                await FileSystem.deleteAsync(cachedPath, { idempotent: true });
                verifiedCachePaths.set(cachedPath, false);
              }
            } catch {
              // ignore
            }
            
            const downloadedPath = await downloadAndCacheAudio(urlToTry, cachedPath);
            const uriToLoad = downloadedPath && !downloadedPath.startsWith('file://')
              ? `file://${downloadedPath}`
              : downloadedPath;
            
            const { sound: localSound } = await Audio.Sound.createAsync(
              { uri: uriToLoad },
              { shouldPlay: false },
              onPlaybackStatusUpdate
            );
            
            const localStatus = await localSound.getStatusAsync();
            if (localStatus.isLoaded) {
              verifiedCachePaths.set(cachedPath, true);
              if (__DEV__) {
                devLog(`✅ Android fallback loaded from downloaded file for message ${messageId}`);
              }
              return localSound;
            }
            
            await localSound.unloadAsync();
          } catch (androidDlErr) {
            if (__DEV__) {
              devWarn(`❌ Android fallback download/load failed for message ${messageId}:`, androidDlErr.message);
            }
          }
        }
        
        // На iOS, если это сетевой URL и ошибка -11800, пробуем загрузить через fetch
        if (Platform.OS === 'ios' && 
            !urlToTry.startsWith('file://') && 
            cachedPath &&
            (err.message?.includes('11800') || err.message?.includes('AVFoundationErrorDomain'))) {
          
          try {
            if (__DEV__) {
              devLog(`🔄 Attempting to download via fetch for message ${messageId} due to AVFoundation error`);
            }
            
            // Если кэшированный файл существует, но поврежден, удаляем его
            try {
              const existingFileInfo = await FileSystem.getInfoAsync(cachedPath);
              if (existingFileInfo.exists) {
                await FileSystem.deleteAsync(cachedPath, { idempotent: true });
                verifiedCachePaths.set(cachedPath, false);
                if (__DEV__) {
                  devLog(`🗑️ Deleted corrupted cached file for message ${messageId}`);
                }
              }
            } catch (deleteErr) {
              // Игнорируем ошибки удаления
            }
            
            // Пытаемся загрузить через fetch и сохранить локально
            const downloadedPath = await downloadAndCacheAudio(urlToTry, cachedPath);
            
            // Проверяем файл перед попыткой воспроизведения
            try {
              const fileInfo = await FileSystem.getInfoAsync(downloadedPath);
              if (!fileInfo.exists || fileInfo.size === 0) {
                throw new Error('Downloaded file is invalid');
              }
              
              if (__DEV__) {
                devLog(`🎵 Attempting to load downloaded file for message ${messageId}, size: ${fileInfo.size} bytes`);
              }
              
              // На iOS добавляем небольшую задержку, чтобы файл точно был записан на диск
              if (Platform.OS === 'ios') {
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Дополнительная проверка, что файл все еще существует и имеет размер
                const recheckInfo = await FileSystem.getInfoAsync(downloadedPath);
                if (!recheckInfo.exists || recheckInfo.size === 0) {
                  throw new Error('File disappeared or became empty after download');
                }
              }
              
              // На iOS пробуем загрузить с дополнительными опциями для AAC файлов
              let soundOptions = { shouldPlay: false };
              
              // Для iOS добавляем дополнительные опции для AAC файлов
              if (Platform.OS === 'ios') {
                soundOptions = {
                  shouldPlay: false,
                  isMuted: false,
                  volume: 1.0,
                  rate: 1.0,
                  shouldCorrectPitch: true,
                  progressUpdateIntervalMillis: 1000,
                };
              }
              
              // Пробуем загрузить с локального файла
              // На iOS используем file:// префикс явно, если его нет
              const uriToLoad = Platform.OS === 'ios' && !downloadedPath.startsWith('file://') 
                ? `file://${downloadedPath}` 
                : downloadedPath;
              
              // На iOS пробуем загрузить с локального файла
              let downloadedSound = null;
              let downloadSuccess = false;
              
              try {
                if (__DEV__) {
                  devLog(`🎵 Trying to load from local file: ${uriToLoad}`);
                }
                
                // Для iOS добавляем дополнительные опции
                const localSourceOptions = Platform.OS === 'ios' 
                  ? { 
                      uri: uriToLoad,
                      headers: {
                        'Accept': 'audio/aac, audio/mpeg, audio/mp4, audio/*'
                      }
                    }
                  : { uri: uriToLoad };
                
                const { sound: localSound } = await Audio.Sound.createAsync(
                  localSourceOptions,
                  soundOptions,
                  onPlaybackStatusUpdate
                );
                
                const localStatus = await localSound.getStatusAsync();
                if (localStatus.isLoaded) {
                  downloadedSound = localSound;
                  downloadSuccess = true;
                  if (__DEV__) {
                    devLog(`✅ Local file loaded successfully for message ${messageId}`);
                  }
                } else {
                  await localSound.unloadAsync();
                  throw new Error(`Sound not loaded, status: ${JSON.stringify(localStatus)}`);
                }
              } catch (localErr) {
                if (__DEV__) {
                  devWarn(`⚠️ Failed to load from local file for message ${messageId}:`, {
                    error: localErr.message,
                    uri: uriToLoad,
                    fileSize: fileInfo.size,
                    fileExists: fileInfo.exists
                  });
                }
                
                // Если локальный файл не работает, пробуем загрузить напрямую с сервера
                // Это может помочь, если проблема в том, как файл сохраняется
                try {
                  if (__DEV__) {
                    devLog(`🔄 Trying direct URL as fallback: ${urlToTry}`);
                  }
                  
                  // Для iOS добавляем дополнительные опции
                  const directSourceOptions = Platform.OS === 'ios' 
                    ? { 
                        uri: urlToTry,
                        headers: {
                          'Accept': 'audio/aac, audio/mpeg, audio/mp4, audio/*',
                          'Range': 'bytes=0-'
                        }
                      }
                    : { uri: urlToTry };
                  
                  const { sound: directSound } = await Audio.Sound.createAsync(
                    directSourceOptions,
                    soundOptions,
                    onPlaybackStatusUpdate
                  );
                  
                  const directStatus = await directSound.getStatusAsync();
                  if (directStatus.isLoaded) {
                    downloadedSound = directSound;
                    downloadSuccess = true;
                    if (__DEV__) {
                      devLog(`✅ Successfully loaded audio directly from URL for message ${messageId}`);
                    }
                  } else {
                    await directSound.unloadAsync();
                    throw new Error(`Direct URL not loaded, status: ${JSON.stringify(directStatus)}`);
                  }
                } catch (directErr) {
                  if (__DEV__) {
                    console.error(`❌ Both local file and direct URL failed for message ${messageId}:`, {
                      localError: localErr.message,
                      directError: directErr.message,
                      filePath: uriToLoad,
                      url: urlToTry
                    });
                  }
                  throw localErr; // Выбрасываем исходную ошибку
                }
              }
              
              if (downloadSuccess && downloadedSound) {
                verifiedCachePaths.set(cachedPath, true);
                if (__DEV__) {
                  devLog(`✅ Successfully loaded audio via fetch download for message ${messageId}`);
                }
                return downloadedSound;
              } else {
                if (downloadedSound) {
                  await downloadedSound.unloadAsync();
                }
                verifiedCachePaths.set(cachedPath, false);
                throw new Error('Sound not loaded after download');
              }
            } catch (fileErr) {
              verifiedCachePaths.set(cachedPath, false);
              if (__DEV__) {
                devWarn(`⚠️ Downloaded file check failed for message ${messageId}:`, fileErr.message);
              }
              throw fileErr;
            }
          } catch (fetchErr) {
            verifiedCachePaths.set(cachedPath, false);
            if (__DEV__) {
              devWarn(`❌ Failed to download via fetch for message ${messageId}:`, fetchErr.message);
            }
            // Продолжаем пробовать другие URL
          }
        }
        
        // Если это кэшированный файл и он не загрузился, помечаем как невалидный
        if (urlToTry.startsWith('file://') && (urlToTry === cachedUri || urlToTry === cachedPath)) {
          verifiedCachePaths.set(cachedPath, false);
          if (__DEV__) {
            devWarn(`⚠️ Cached file failed to load for message ${messageId}, marking as invalid`);
          }
        }
        
        // Продолжаем пробовать другие URL
        continue;
      }
    }

    // Если все URL не сработали, выбрасываем последнюю ошибку
    if (lastError) {
      throw new Error(`Failed to load audio: ${lastError.message}`);
    }

    throw new Error('No valid audio URL found');
  }, [audioUri, cachedPath, fallbackUrls, messageId, onPlaybackStatusUpdate, downloadInBackground, checkUrlAvailability, downloadAndCacheAudio]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        audioManager.unregisterSound(messageId);
      }
    };
  }, [messageId]);

  return { soundRef, loadAndPlayAudio };
};

// ============================================================================
// ОСНОВНОЙ КОМПОНЕНТ
// ============================================================================

const CachedVoiceComponent = ({ messageId, attachment, isOwnMessage, time, status }) => {
  // Защита от undefined/null attachment
  if (!attachment || typeof attachment !== 'object') {
    if (__DEV__) {
      devWarn(`CachedVoice: Invalid attachment for message ${messageId}:`, attachment);
    }
    return null;
  }

  // Убрано избыточное логирование для производительности
  // devLog убирается отсюда полностью

  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(attachment?.duration || 0);
  const [error, setError] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1.0); // Скорость воспроизведения: 1x, 1.5x, 2x


  const messageIdRef = useRef(messageId);
  const waveformWidthRef = useRef(0);

  const { audioUri, cachedPath, fallbackUrls } = useAudioUri(attachment);
  const waveformData = useWaveform(attachment, messageId);

  // Обновляем duration при изменении attachment или загрузке звука
  useEffect(() => {
    if (attachment?.duration && attachment.duration !== playbackDuration) {
      setPlaybackDuration(attachment.duration);
    }
  }, [attachment?.duration, playbackDuration]);

  // Пытаемся получить duration из аудио файла, если ее нет в attachment
  useEffect(() => {
    const getDurationFromAudio = async () => {
      if (attachment?.duration && attachment.duration > 0) return; // Уже есть duration

      if (!audioUri) return;

      try {
        // Создаем временный Sound для получения duration
        // Для iOS добавляем дополнительные опции
        const tempSourceOptions = Platform.OS === 'ios' 
          ? { 
              uri: audioUri,
              headers: {
                'Accept': 'audio/aac, audio/mpeg, audio/mp4, audio/*'
              }
            }
          : { uri: audioUri };
        
        const { sound: tempSound } = await Audio.Sound.createAsync(
          tempSourceOptions,
          { shouldPlay: false }
        );

        const status = await tempSound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          const durationFromAudio = status.durationMillis / 1000;
          if (durationFromAudio > 0 && durationFromAudio !== playbackDuration) {
            setPlaybackDuration(durationFromAudio);
          }
        }

        await tempSound.unloadAsync();
      } catch (error) {
        // Игнорируем ошибки
      }
    };

    if (!attachment?.duration || attachment.duration === 0) {
      getDurationFromAudio();
    }
  }, [attachment?.duration, audioUri, playbackDuration]);

  const onPlaybackStatusUpdate = useCallback(async (playbackStatus) => {
    if (playbackStatus.isLoaded) {
      setPlaybackPosition(playbackStatus.positionMillis / 1000);
      setPlaybackDuration(playbackStatus.durationMillis / 1000);

      // Проверяем завершение воспроизведения двумя способами:
      // 1. Стандартный didJustFinish
      // 2. Позиция достигла конца (для случаев когда didJustFinish не срабатывает)
      const isFinished = playbackStatus.didJustFinish || 
        (!playbackStatus.isPlaying && 
         playbackStatus.positionMillis > 0 &&
         playbackStatus.durationMillis > 0 &&
         playbackStatus.positionMillis >= playbackStatus.durationMillis - 100); // 100ms допуск

      if (isFinished) {
        setIsPlaying(false);
        setPlaybackPosition(0);
        // Сбрасываем скорость воспроизведения после окончания
        setPlaybackRate(1.0);
        if (soundRef.current) {
          try {
            const currentStatus = await soundRef.current.getStatusAsync();
            if (currentStatus.isLoaded) {
              await soundRef.current.stopAsync();
              await soundRef.current.setPositionAsync(0);
              await soundRef.current.setRateAsync(1.0, true);
            }
          } catch (err) {
            // Игнорируем
          }
        }
        audioManager.unregisterSound(messageIdRef.current);
      }
    }
  }, []);

  const { soundRef, loadAndPlayAudio } = useAudioPlayer(
    audioUri, 
    cachedPath, 
    messageId, 
    onPlaybackStatusUpdate,
    fallbackUrls
  );

  const progressAnim = useProgressAnimation(playbackPosition, playbackDuration, isPlaying);

  // Слушатель событий от audioManager
  useEffect(() => {
    const handleAudioEvent = (soundId, event) => {
      if (event === 'stopped' && soundId === messageIdRef.current) {
        setIsPlaying(false);
        setPlaybackPosition(0);
        setPlaybackRate(1.0); // Сбрасываем скорость при остановке
        progressAnim.setValue(0);
      }
    };

    audioManager.addListener(handleAudioEvent);
    return () => audioManager.removeListener(handleAudioEvent);
  }, [progressAnim]);

  // Применяем скорость воспроизведения при изменении playbackRate во время воспроизведения
  useEffect(() => {
    const applyPlaybackRate = async () => {
      if (!soundRef.current || !isPlaying) return;
      
      try {
        const soundStatus = await soundRef.current.getStatusAsync();
        if (soundStatus.isLoaded) {
          await soundRef.current.setRateAsync(playbackRate, true);
        }
      } catch (err) {
        // Игнорируем ошибки, если звук не загружен
        if (err.message && !err.message.includes('not loaded')) {
          console.error('Error applying playback rate:', err);
        }
      }
    };

    applyPlaybackRate();
  }, [playbackRate, isPlaying]);

  // Функция для переключения скорости воспроизведения
  const togglePlaybackRate = useCallback(async () => {
    const rates = [1.0, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const nextRate = rates[nextIndex];
    
    if (__DEV__) {
      devLog('Toggle playback rate:', playbackRate, '->', nextRate);
    }
    
    setPlaybackRate(nextRate);
    
    // Если аудио сейчас воспроизводится, применяем новую скорость
    if (soundRef.current && isPlaying) {
      try {
        const soundStatus = await soundRef.current.getStatusAsync();
        if (soundStatus.isLoaded) {
          await soundRef.current.setRateAsync(nextRate, true);
        }
      } catch (err) {
        // Игнорируем ошибки, если звук не загружен
        if (err.message && !err.message.includes('not loaded')) {
          console.error('Error setting playback rate:', err);
        }
      }
    }
  }, [playbackRate, isPlaying]);

  const togglePlayPause = useCallback(async () => {
    try {
      setError(null);
      
      devLog('🎧 togglePlayPause start', {
        messageId,
        isPlaying,
        audioUri,
        cachedPath,
        fallbackCount: Array.isArray(fallbackUrls) ? fallbackUrls.length : 0
      });

      if (soundRef.current) {
        try {
          const soundStatus = await soundRef.current.getStatusAsync();
          devLog('🎧 current sound status', {
            messageId,
            isLoaded: soundStatus?.isLoaded,
            isPlaying: soundStatus?.isPlaying,
            durationMillis: soundStatus?.durationMillis,
            positionMillis: soundStatus?.positionMillis,
            error: soundStatus?.error
          });
          
          if (!soundStatus.isLoaded) {
            // Звук не загружен, очищаем ref и загружаем заново
            setSound(null);
            soundRef.current = null;
          } else {
            // Звук загружен, переключаем воспроизведение
            if (isPlaying) {
              setIsPlaying(false);
              try {
                await soundRef.current.pauseAsync();
              } catch (pauseErr) {
                // Игнорируем ошибки паузы
                if (pauseErr.message && !pauseErr.message.includes('not loaded')) {
                  devWarn('Ошибка при паузе:', pauseErr);
                }
              }
            } else {
              // Проверяем, что приложение в foreground перед воспроизведением
              const appState = AppState.currentState;
              if (appState !== 'active') {
                if (__DEV__) {
                  console.warn('⚠️ Приложение в фоне, откладываем воспроизведение голосового сообщения', {
                    appState,
                    messageId
                  });
                }
                setError('Приложение в фоне. Откройте приложение для воспроизведения.');
                setIsPlaying(false);
                return;
              }
              
              setIsPlaying(true);
              // ВАЖНО: Регистрируем звук в audioManager ДО запуска воспроизведения
              // Это остановит предыдущее воспроизводящееся аудио
              await audioManager.registerSound(messageIdRef.current, soundRef.current);
              
              // Настраиваем Audio режим для получения аудио-фокуса
              try {
                await Audio.setAudioModeAsync({
                  playsInSilentModeIOS: true,
                  staysActiveInBackground: false,
                  shouldDuckAndroid: true,
                  playThroughEarpieceAndroid: false,
                });
              } catch (audioModeErr) {
                if (__DEV__) {
                  console.warn('⚠️ Ошибка настройки Audio режима:', audioModeErr.message);
                }
                // Продолжаем попытку воспроизведения даже если не удалось настроить режим
              }
              
              // Применяем текущую скорость воспроизведения
              try {
                // Проверяем AppState перед вызовом setRateAsync
                const currentAppState = AppState.currentState;
                if (currentAppState !== 'active') {
                  if (__DEV__) {
                    console.warn('⚠️ Приложение в фоне, откладываем воспроизведение голосового сообщения', {
                      appState: currentAppState,
                      messageId
                    });
                  }
                  setError('Приложение в фоне. Откройте приложение для воспроизведения.');
                  setIsPlaying(false);
                  return;
                }
                
                try {
                  await soundRef.current.setRateAsync(playbackRate, true);
                } catch (rateErr) {
                  // Если setRateAsync не удался из-за AudioFocusNotAcquiredException, обрабатываем
                  if (rateErr.message && rateErr.message.includes('AudioFocusNotAcquiredException')) {
                    if (__DEV__) {
                      console.warn('⚠️ Error applying playback rate:', rateErr);
                    }
                    setError('Не удалось получить аудио-фокус. Попробуйте еще раз.');
                    setIsPlaying(false);
                    return;
                  }
                  throw rateErr;
                }
                
                // Пытаемся воспроизвести с повторной попыткой при ошибке AudioFocusNotAcquiredException
                let playAttempts = 0;
                const maxPlayAttempts = 2;
                let lastError = null;
                
                while (playAttempts < maxPlayAttempts) {
                  try {
                    // Проверяем AppState перед каждой попыткой
                    const checkAppState = AppState.currentState;
                    if (checkAppState !== 'active') {
                      throw new Error('App is in background');
                    }
                    
                    await soundRef.current.playAsync();
                    devLog('🎧 after playAsync status', {
                      messageId,
                      isLoaded: (await soundRef.current.getStatusAsync())?.isLoaded,
                      isPlaying: (await soundRef.current.getStatusAsync())?.isPlaying,
                    });
                    break; // Успешно воспроизвели, выходим из цикла
                  } catch (playErr) {
                    lastError = playErr;
                    playAttempts++;
                    
                    // Если приложение в фоне, не пытаемся повторно
                    if (playErr.message && playErr.message.includes('background')) {
                      setError('Приложение в фоне. Откройте приложение для воспроизведения.');
                      setIsPlaying(false);
                      return;
                    }
                    
                    // Если это AudioFocusNotAcquiredException и есть еще попытки, ждем и пробуем снова
                    if (playErr.message && playErr.message.includes('AudioFocusNotAcquiredException') && playAttempts < maxPlayAttempts) {
                      if (__DEV__) {
                        console.warn(`⚠️ Не удалось получить аудио-фокус, попытка ${playAttempts}/${maxPlayAttempts}, повтор через 300мс`, {
                          messageId,
                          appState: AppState.currentState
                        });
                      }
                      // Небольшая задержка перед повторной попыткой
                      await new Promise(resolve => setTimeout(resolve, 300));
                      
                      // Проверяем AppState после задержки
                      const checkAppStateAfterDelay = AppState.currentState;
                      if (checkAppStateAfterDelay !== 'active') {
                        setError('Приложение в фоне. Откройте приложение для воспроизведения.');
                        setIsPlaying(false);
                        return;
                      }
                      
                      // Повторно настраиваем Audio режим
                      try {
                        await Audio.setAudioModeAsync({
                          playsInSilentModeIOS: true,
                          staysActiveInBackground: false,
                          shouldDuckAndroid: true,
                          playThroughEarpieceAndroid: false,
                        });
                      } catch (audioModeErr) {
                        // Игнорируем ошибку настройки режима
                      }
                      continue; // Пробуем снова
                    } else {
                      // Другая ошибка или закончились попытки - выбрасываем ошибку
                      throw playErr;
                    }
                  }
                }
                
                // Если все попытки не удались
                if (playAttempts >= maxPlayAttempts && lastError) {
                  throw lastError;
                }
              } catch (playErr) {
                // Если не удалось воспроизвести, сбрасываем состояние
                if (playErr.message && playErr.message.includes('not loaded')) {
                  setSound(null);
                  soundRef.current = null;
                  setIsPlaying(false);
                  // Продолжаем загрузку нового звука
                } else if (playErr.message && (playErr.message.includes('AudioFocusNotAcquiredException') || playErr.message.includes('background'))) {
                  // Обрабатываем ошибку AudioFocusNotAcquiredException или background
                  setError('Приложение в фоне. Откройте приложение для воспроизведения.');
                  setIsPlaying(false);
                  if (__DEV__) {
                    console.warn('⚠️ Не удалось получить аудио-фокус после всех попыток', {
                      messageId,
                      appState: AppState.currentState,
                      error: playErr.message
                    });
                  }
                } else {
                  throw playErr;
                }
              }
            }
            return;
          }
        } catch (statusErr) {
          // Ошибка при получении статуса, очищаем и загружаем заново
          if (statusErr.message && statusErr.message.includes('not loaded')) {
            setSound(null);
            soundRef.current = null;
          } else {
            throw statusErr;
          }
        }
      }

      // Загружаем новый звук
      const newSound = await loadAndPlayAudio();
      if (!newSound) {
        throw new Error('Failed to load audio');
      }

      soundRef.current = newSound;
      setSound(newSound);
      
      // ВАЖНО: Регистрируем звук в audioManager ДО запуска воспроизведения
      await audioManager.registerSound(messageIdRef.current, newSound);
      devLog('🎧 newSound loaded status', {
        messageId,
        isLoaded: (await newSound.getStatusAsync())?.isLoaded,
      });
      // Применяем текущую скорость воспроизведения перед запуском
      try {
        // Проверяем, что приложение в foreground перед воспроизведением
        const appState = AppState.currentState;
        if (appState !== 'active') {
          if (__DEV__) {
            console.warn('⚠️ Приложение в фоне, откладываем воспроизведение голосового сообщения', {
              appState,
              messageId
            });
          }
          setError('Приложение в фоне. Откройте приложение для воспроизведения.');
          setIsPlaying(false);
          return;
        }
        
        // Настраиваем Audio режим для получения аудио-фокуса
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });
        } catch (audioModeErr) {
          if (__DEV__) {
            console.warn('⚠️ Ошибка настройки Audio режима:', audioModeErr.message);
          }
          // Продолжаем попытку воспроизведения даже если не удалось настроить режим
        }
        
        // Проверяем AppState перед вызовом setRateAsync
        const currentAppState = AppState.currentState;
        if (currentAppState !== 'active') {
          if (__DEV__) {
            console.warn('⚠️ Приложение в фоне, откладываем воспроизведение голосового сообщения', {
              appState: currentAppState,
              messageId
            });
          }
          setError('Приложение в фоне. Откройте приложение для воспроизведения.');
          setIsPlaying(false);
          return;
        }
        
        try {
          await newSound.setRateAsync(playbackRate, true);
        } catch (rateErr) {
          // Если setRateAsync не удался из-за AudioFocusNotAcquiredException, обрабатываем
          if (rateErr.message && rateErr.message.includes('AudioFocusNotAcquiredException')) {
            if (__DEV__) {
              console.warn('⚠️ Error applying playback rate:', rateErr);
            }
            setError('Не удалось получить аудио-фокус. Попробуйте еще раз.');
            setIsPlaying(false);
            return;
          }
          throw rateErr;
        }
        
        // Пытаемся воспроизвести с повторной попыткой при ошибке AudioFocusNotAcquiredException
        let playAttempts = 0;
        const maxPlayAttempts = 2;
        let lastError = null;
        
        while (playAttempts < maxPlayAttempts) {
          try {
            // Проверяем AppState перед каждой попыткой
            const checkAppState = AppState.currentState;
            if (checkAppState !== 'active') {
              throw new Error('App is in background');
            }
            
            await newSound.playAsync();
            setIsPlaying(true);
            devLog('🎧 newSound after playAsync status', {
              messageId,
              isLoaded: (await newSound.getStatusAsync())?.isLoaded,
              isPlaying: (await newSound.getStatusAsync())?.isPlaying,
            });
            break; // Успешно воспроизвели, выходим из цикла
          } catch (playErr) {
            lastError = playErr;
            playAttempts++;
            
            // Если приложение в фоне, не пытаемся повторно
            if (playErr.message && playErr.message.includes('background')) {
              setError('Приложение в фоне. Откройте приложение для воспроизведения.');
              setIsPlaying(false);
              return;
            }
            
            // Если это AudioFocusNotAcquiredException и есть еще попытки, ждем и пробуем снова
            if (playErr.message && playErr.message.includes('AudioFocusNotAcquiredException') && playAttempts < maxPlayAttempts) {
              if (__DEV__) {
                console.warn(`⚠️ Не удалось получить аудио-фокус, попытка ${playAttempts}/${maxPlayAttempts}, повтор через 300мс`, {
                  messageId,
                  appState: AppState.currentState
                });
              }
              // Небольшая задержка перед повторной попыткой
              await new Promise(resolve => setTimeout(resolve, 300));
              
              // Проверяем AppState после задержки
              const checkAppStateAfterDelay = AppState.currentState;
              if (checkAppStateAfterDelay !== 'active') {
                setError('Приложение в фоне. Откройте приложение для воспроизведения.');
                setIsPlaying(false);
                return;
              }
              
              // Повторно настраиваем Audio режим
              try {
                await Audio.setAudioModeAsync({
                  playsInSilentModeIOS: true,
                  staysActiveInBackground: false,
                  shouldDuckAndroid: true,
                  playThroughEarpieceAndroid: false,
                });
              } catch (audioModeErr) {
                // Игнорируем ошибку настройки режима
              }
              continue; // Пробуем снова
            } else {
              // Другая ошибка или закончились попытки - выбрасываем ошибку
              throw playErr;
            }
          }
        }
        
        // Если все попытки не удались
        if (playAttempts >= maxPlayAttempts && lastError) {
          throw lastError;
        }
      } catch (playErr) {
        console.error('Ошибка при воспроизведении загруженного звука:', playErr);
        
        // Обрабатываем ошибку AudioFocusNotAcquiredException
        if (playErr.message && (playErr.message.includes('AudioFocusNotAcquiredException') || playErr.message.includes('background'))) {
          setError('Приложение в фоне. Откройте приложение для воспроизведения.');
          if (__DEV__) {
            console.warn('⚠️ Не удалось получить аудио-фокус после всех попыток', {
              messageId,
              appState: AppState.currentState,
              error: playErr.message
            });
          }
          // Очищаем звук, чтобы можно было попробовать снова
          setSound(null);
          soundRef.current = null;
        } else {
          setError('Не удалось воспроизвести');
        }
        setIsPlaying(false);
      }

    } catch (err) {
      console.error('Audio playback error:', err);
      
      // Более информативное сообщение об ошибке
      let errorMessage = 'Не удалось воспроизвести';
      if (err.message) {
        if (err.message.includes('11800') || err.message.includes('AVFoundationErrorDomain')) {
          errorMessage = 'Файл недоступен';
        } else if (err.message.includes('not loaded')) {
          errorMessage = 'Ошибка загрузки';
        } else if (err.message.includes('Failed to load')) {
          errorMessage = 'Файл не найден';
        }
      }
      
      setError(errorMessage);
      setIsPlaying(false);
      
      console.error(`❌ Audio playback failed for message ${messageId}:`, {
        error: err.message,
        audioUri,
        fallbackUrls,
        cachedPath
      });
    }
  }, [isPlaying, loadAndPlayAudio, playbackRate, audioUri, cachedPath, fallbackUrls, messageId]);

  const handleWaveformLayout = useCallback((event) => {
    waveformWidthRef.current = event.nativeEvent.layout.width;
  }, []);

  const handleWaveformPress = useCallback((event) => {
    if (!soundRef.current || playbackDuration <= 0) return;
    
    // Останавливаем всплытие события, чтобы BubbleContainer не перехватывал нажатие
    if (event?.stopPropagation) {
      event.stopPropagation();
    }
    
    const { locationX, locationY } = event.nativeEvent || event;
    
    const width = waveformWidthRef.current || 200;
    
    if (__DEV__) {
      devLog('🎵 Waveform press:', { locationX, locationY, width });
    }
    
    // Мягкие границы для locationX - допускаем небольшое выхождение за пределы
    const validLocationX = Math.max(-10, Math.min(width + 10, locationX));
    
    // Игнорируем нажатия слишком далеко за пределами по горизонтали
    if (locationX < -20 || locationX > width + 20) {
      if (__DEV__) {
        devLog('🎵 Waveform press ignored: out of horizontal bounds');
      }
      return;
    }
    
    // Игнорируем нажатия слишком далеко внизу (вне области компонента)
    // locationY отсчитывается от начала Pressable
    const maxValidY = 100; // Разумное значение для области waveform + время
    
    if (locationY > maxValidY || locationY < -10) {
      if (__DEV__) {
        devLog('🎵 Waveform press ignored: out of vertical bounds');
      }
      return;
    }
    
    // Игнорируем нажатия с очень малым locationX только если трек уже играет и позиция > 5 секунд
    // Это предотвращает случайный сброс при нажатии на левый край, но позволяет перематывать в начало
    if (validLocationX < 3 && playbackPosition > 5) {
      if (__DEV__) {
        devLog('🎵 Waveform press ignored: too close to start while playing');
      }
      return; // Игнорируем нажатия в самом начале (меньше 3px), если трек уже играет больше 5 секунд
    }
    
    // Нормализуем locationX к диапазону [0, width]
    const normalizedX = Math.max(0, Math.min(width, validLocationX));
    const progress = Math.max(0, Math.min(100, (normalizedX / width) * 100));
    const newPosition = (progress / 100) * playbackDuration;
    
    if (__DEV__) {
      devLog('🎵 Seeking to:', { progress: progress.toFixed(1), newPosition: newPosition.toFixed(1) });
    }
    
    const seekAudio = async () => {
      if (!soundRef.current) return;
      
      try {
        // Проверяем статус перед перемоткой
        const soundStatus = await soundRef.current.getStatusAsync();
        if (!soundStatus.isLoaded) {
          if (__DEV__) {
            devWarn('🎵 Cannot seek: sound not loaded');
          }
          return; // Звук не загружен, не можем перематывать
        }
        
        await soundRef.current.setPositionAsync(newPosition * 1000);
        setPlaybackPosition(newPosition);
        progressAnim.setValue(progress);
        // Сохраняем текущую скорость при перемотке
        if (playbackRate !== 1.0) {
          await soundRef.current.setRateAsync(playbackRate, true);
        }
        
        if (__DEV__) {
          devLog('🎵 Seek successful');
        }
      } catch (err) {
        // Игнорируем ошибки перемотки (включая "not loaded")
        if (err.message && !err.message.includes('not loaded')) {
          devWarn('Ошибка при перемотке:', err);
        }
      }
    };
    
    seekAudio();
  }, [playbackDuration, progressAnim, playbackPosition, playbackRate]);

  return (
    <View style={styles.container}>
      {/* Кнопка воспроизведения */}
      <TouchableOpacity
        style={[
          styles.playButton,
          isOwnMessage ? styles.playButtonOwn : styles.playButtonOther
        ]}
        onPress={togglePlayPause}
        disabled={!!error}
        activeOpacity={0.7}
      >
        {error ? (
          <Text style={styles.errorIcon}>!</Text>
        ) : isPlaying ? (
          <View style={styles.pauseIcon}>
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </View>
        ) : (
          <View style={styles.playTriangle} />
        )}
      </TouchableOpacity>

      {/* Waveform и время */}
      <View style={styles.contentContainer}>
        <Pressable 
          onPress={handleWaveformPress}
          disabled={!soundRef.current}
          style={({ pressed }) => [
            styles.waveformPressable,
            pressed && Platform.OS === 'ios' && { opacity: 0.7 }
          ]}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <View 
            style={styles.waveformWrapper}
            onLayout={handleWaveformLayout}
          >
            <View style={styles.waveformBars}>
              {waveformData.map((height, i) => {
                const barPosition = (i / waveformData.length) * 100;
                
                const backgroundColor = progressAnim.interpolate({
                  inputRange: [
                    Math.max(0, barPosition - 3),
                    barPosition,
                    Math.min(100, barPosition + 1)
                  ],
                  outputRange: [
                    isOwnMessage ? 'rgba(9, 94, 84, 0.3)' : 'rgba(0, 0, 0, 0.2)',
                    isOwnMessage ? '#095E54' : '#25D366',
                    isOwnMessage ? '#095E54' : '#25D366'
                  ],
                  extrapolate: 'clamp'
                });
                
                return (
                  <View key={i} style={styles.waveBarContainer}>
                    <Animated.View
                      style={[
                        styles.waveBar,
                        {
                          height: `${height * 100}%`,
                          backgroundColor
                        }
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        </Pressable>

        <View style={styles.timeRow}>
          <View style={styles.durationContainer}>
            <Text style={[
              styles.duration,
              isOwnMessage ? styles.durationOwn : styles.durationOther
            ]}>
              {isPlaying ? formatTime(playbackPosition) : formatTime(playbackDuration)}
            </Text>
            {/* Кнопка переключения скорости */}
            <TouchableOpacity
              onPress={togglePlaybackRate}
              activeOpacity={0.6}
              style={[
                styles.speedButton,
                isOwnMessage ? styles.speedButtonOwn : styles.speedButtonOther
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {playbackRate === 1.0 ? (
                <Ionicons name="speedometer-outline" size={12} color={isOwnMessage ? '#095E54' : '#25D366'} />
              ) : (
                <Text style={[
                  styles.playbackRate,
                  isOwnMessage ? styles.playbackRateOwn : styles.playbackRateOther
                ]}>
                  {playbackRate}x
                </Text>
              )}
            </TouchableOpacity>
          </View>
          
          {time && (
            <View style={styles.timeAndStatus}>
              <Text style={styles.timestamp}>{time}</Text>
              {isOwnMessage && status && <StatusTicks status={status} />}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export const CachedVoice = memo(CachedVoiceComponent);
CachedVoice.displayName = 'CachedVoice';

// ============================================================================
// СТИЛИ
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 240,
    maxWidth: 260,
    paddingVertical: 2,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  playButtonOwn: {
    backgroundColor: '#095E54',
  },
  playButtonOther: {
    backgroundColor: '#25D366',
  },
  playTriangle: {
    width: 0,
    height: 0,
    marginLeft: 2,
    borderLeftWidth: 10,
    borderRightWidth: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: '#FFFFFF',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  pauseIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.5,
  },
  pauseBar: {
    width: 2.5,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  errorIcon: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 32,
  },
  waveformPressable: {
    width: '100%',
    paddingVertical: 8,
  },
  waveformWrapper: {
    width: '100%',
  },
  waveformBars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 18,
    gap: 1.5,
  },
  waveBarContainer: {
    flex: 1,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveBar: {
    width: '100%',
    borderRadius: 1.5,
    minHeight: 3,
    maxHeight: 18,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
    width: '100%',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  speedButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 20,
    minHeight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedButtonOwn: {
    backgroundColor: 'rgba(9, 94, 84, 0.1)',
  },
  speedButtonOther: {
    backgroundColor: 'rgba(37, 211, 102, 0.1)',
  },
  duration: {
    fontSize: 11,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
    lineHeight: 13,
  },
  durationOwn: {
    color: '#3C3C43',
  },
  durationOther: {
    color: '#3C3C43',
  },
  playbackRate: {
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
    lineHeight: 12,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'visible',
    minWidth: 24,
    textAlign: 'center',
  },
  playbackRateOwn: {
    color: '#095E54',
    backgroundColor: 'rgba(9, 94, 84, 0.15)',
  },
  playbackRateOther: {
    color: '#25D366',
    backgroundColor: 'rgba(37, 211, 102, 0.15)',
  },
  timeAndStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
    color: '#8696A0',
    marginRight: 3,
    lineHeight: 13,
  },
  ticksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    width: 12,
    height: 10,
    justifyContent: 'center',
  },
  tick: {
    fontSize: 12,
    color: '#8696A0',
    fontWeight: '600',
    lineHeight: 11,
    position: 'absolute',
    textAlignVertical: 'center',
  },
  secondTick: {
    left: 4,
  },
  tickRead: {
    color: '#4FC3F7',
  },
  tickSending: {
    color: '#B0B0B0',
    fontSize: 10,
    opacity: 0.7,
  },
  tickFailed: {
    color: '#F44336',
    fontSize: 12,
  },
});

export default CachedVoice;