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
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { getBaseUrl } from '@shared/api/api';
import { audioManager } from '../../lib/audioManager';

// ============================================================================
// УТИЛИТЫ И КОНСТАНТЫ
// ============================================================================

const CACHE_DIR = `${FileSystem.documentDirectory}chat_voice/`;
const verifiedCachePaths = new Map();

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
        return <Text style={styles.tick}>✓</Text>;
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
    
    // Формируем полный URL и fallback варианты для старых сообщений
    let fullUrl = path;
    const fallbackUrls = [];
    
    if (!path.startsWith('http://') && !path.startsWith('https://')) {
      path = path.replace(/\\/g, '/');
      if (!path.startsWith('/')) path = '/' + path;
      
      const baseUrl = getBaseUrl();
      
      // Основной URL с /uploads
      fullUrl = `${baseUrl}/uploads${path}`;
      
      // Fallback варианты для старых сообщений
      // Старый формат без /uploads
      if (!path.includes('/uploads')) {
        fallbackUrls.push(`${baseUrl}${path}`);
      }
      // Вариант с прямым путем
      if (path.startsWith('/uploads')) {
        fallbackUrls.push(`${baseUrl}${path}`);
      } else {
        fallbackUrls.push(`${baseUrl}/uploads${path}`);
      }
    } else {
      // Если уже полный URL, используем как есть
      fullUrl = path;
    }
    
    // Вычисляем путь к кэшу
    const extension = fullUrl.includes('.m4a') ? 'm4a' : 'aac';
    const cached = `${CACHE_DIR}voice_${hashUrl(fullUrl)}.${extension}`;
    
    return { audioUri: fullUrl, cachedPath: cached, fallbackUrls };
  }, [attachment?.path]);
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
          if (__DEV__) {
            console.log(`🎵 Using saved waveform for message ${messageId}, length: ${parsed.length}`);
          }
          return parsed;
        }
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    }

    const generated = generateWaveform(attachment);
    if (__DEV__) {
      console.log(`🎵 Generated waveform for message ${messageId}, duration: ${attachment?.duration}, size: ${attachment?.size}, length: ${generated.length}`);
    }
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
const useAudioPlayer = (audioUri, cachedPath, messageId, onPlaybackStatusUpdate) => {
  const soundRef = useRef(null);

  const downloadInBackground = useCallback(async (url, destPath) => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
      
      const result = await FileSystem.downloadAsync(url, destPath);
      if (result.status === 200) {
        verifiedCachePaths.set(destPath, true);
      }
    } catch {
      // Тихо игнорируем ошибки
    }
  }, []);

  const loadAndPlayAudio = useCallback(async () => {
    if (!audioUri) return null;

    let uriToLoad = audioUri;
    
    // Проверяем кэш
    if (cachedPath && verifiedCachePaths.has(cachedPath)) {
      uriToLoad = verifiedCachePaths.get(cachedPath) ? cachedPath : audioUri;
    } else if (cachedPath) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(cachedPath);
        if (fileInfo.exists) {
          verifiedCachePaths.set(cachedPath, true);
          uriToLoad = cachedPath;
        } else {
          verifiedCachePaths.set(cachedPath, false);
          downloadInBackground(audioUri, cachedPath);
        }
      } catch {
        verifiedCachePaths.set(cachedPath, false);
      }
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: uriToLoad },
      { shouldPlay: false },
      onPlaybackStatusUpdate
    );

    const soundStatus = await newSound.getStatusAsync();
    if (!soundStatus.isLoaded) {
      throw new Error('Sound not loaded');
    }

    // Устанавливаем duration из загруженного звука, если она не была установлена из attachment
    // Note: attachment is not available in this hook scope, duration is handled in component level

    return newSound;
  }, [audioUri, cachedPath, onPlaybackStatusUpdate, downloadInBackground]);

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
      console.warn(`CachedVoice: Invalid attachment for message ${messageId}:`, attachment);
    }
    return null;
  }

  if (__DEV__) {
    console.log(`CachedVoice: Rendering message ${messageId}, attachment:`, {
      hasPath: !!attachment.path,
      duration: attachment.duration,
      hasWaveform: !!attachment.waveform,
      size: attachment.size
    });
  }

  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(attachment?.duration || 0);
  const [error, setError] = useState(null);
  const [playbackRate, setPlaybackRate] = useState(1.0); // Скорость воспроизведения: 1x, 1.5x, 2x


  const messageIdRef = useRef(messageId);
  const waveformWidthRef = useRef(0);

  const { audioUri, cachedPath } = useAudioUri(attachment);
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
        const { sound: tempSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
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

      if (playbackStatus.didJustFinish) {
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
    onPlaybackStatusUpdate
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
      console.log('Toggle playback rate:', playbackRate, '->', nextRate);
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

      if (soundRef.current) {
        try {
          const soundStatus = await soundRef.current.getStatusAsync();
          
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
                  console.warn('Ошибка при паузе:', pauseErr);
                }
              }
            } else {
              setIsPlaying(true);
              await audioManager.registerSound(messageIdRef.current, soundRef.current);
              // Применяем текущую скорость воспроизведения
              try {
                await soundRef.current.setRateAsync(playbackRate, true);
                await soundRef.current.playAsync();
              } catch (playErr) {
                // Если не удалось воспроизвести, сбрасываем состояние
                if (playErr.message && playErr.message.includes('not loaded')) {
                  setSound(null);
                  soundRef.current = null;
                  setIsPlaying(false);
                  // Продолжаем загрузку нового звука
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
      
      await audioManager.registerSound(messageIdRef.current, newSound);
      // Применяем текущую скорость воспроизведения перед запуском
      try {
        await newSound.setRateAsync(playbackRate, true);
        await newSound.playAsync();
        setIsPlaying(true);
      } catch (playErr) {
        console.error('Ошибка при воспроизведении загруженного звука:', playErr);
        setError('Не удалось воспроизвести');
        setIsPlaying(false);
      }

    } catch (err) {
      console.error('Audio playback error:', err);
      setError('Не удалось воспроизвести');
      setIsPlaying(false);
    }
  }, [isPlaying, loadAndPlayAudio, playbackRate]);

  const handleWaveformLayout = useCallback((event) => {
    waveformWidthRef.current = event.nativeEvent.layout.width;
  }, []);

  const handleWaveformPress = useCallback((event) => {
    if (!soundRef.current || playbackDuration <= 0) return;
    
    const { locationX, locationY } = event.nativeEvent;
    
    const width = waveformWidthRef.current || 200;
    
    // Мягкие границы для locationX - допускаем небольшое выхождение за пределы
    const validLocationX = Math.max(-10, Math.min(width + 10, locationX));
    
    // Игнорируем нажатия слишком далеко за пределами по горизонтали
    if (locationX < -20 || locationX > width + 20) {
      return;
    }
    
    // Игнорируем нажатия слишком далеко внизу (вне области компонента)
    // locationY отсчитывается от начала Pressable, который теперь включает весь контейнер
    const maxValidY = 1000; // Большое значение, так как Pressable теперь включает весь контейнер
    
    if (locationY > maxValidY || locationY < 0) {
      return;
    }
    
    // Игнорируем нажатия с очень малым locationX только если трек уже играет и позиция > 5 секунд
    // Это предотвращает случайный сброс при нажатии на левый край, но позволяет перематывать в начало
    if (validLocationX < 3 && playbackPosition > 5) {
      return; // Игнорируем нажатия в самом начале (меньше 3px), если трек уже играет больше 5 секунд
    }
    
    // Нормализуем locationX к диапазону [0, width]
    const normalizedX = Math.max(0, Math.min(width, validLocationX));
    const progress = Math.max(0, Math.min(100, (normalizedX / width) * 100));
    const newPosition = (progress / 100) * playbackDuration;
    
    const seekAudio = async () => {
      if (!soundRef.current) return;
      
      try {
        // Проверяем статус перед перемоткой
        const soundStatus = await soundRef.current.getStatusAsync();
        if (!soundStatus.isLoaded) {
          return; // Звук не загружен, не можем перематывать
        }
        
        await soundRef.current.setPositionAsync(newPosition * 1000);
        setPlaybackPosition(newPosition);
        progressAnim.setValue(progress);
        // Сохраняем текущую скорость при перемотке
        if (playbackRate !== 1.0) {
          await soundRef.current.setRateAsync(playbackRate, true);
        }
      } catch (err) {
        // Игнорируем ошибки перемотки (включая "not loaded")
        if (err.message && !err.message.includes('not loaded')) {
          console.warn('Ошибка при перемотке:', err);
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
        <TouchableWithoutFeedback 
          onPress={handleWaveformPress}
          disabled={!soundRef.current}
        >
          <View 
            style={styles.waveformPressable}
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
        </TouchableWithoutFeedback>

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
    paddingTop: 0,
    paddingBottom: 0,
    justifyContent: 'center',
  },
  waveformBars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 18,
    gap: 1.5,
    marginTop: 7,
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