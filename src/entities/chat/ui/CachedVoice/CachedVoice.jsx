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
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
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

// Генерация waveform на основе messageId (детерминированная)
const generateWaveform = (messageId, length = 40) => {
  const seed = typeof messageId === 'number' ? messageId : 12345;
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
    if (!attachment?.path) return { audioUri: null, cachedPath: null };
    
    let path = attachment.path;
    
    // Уже локальный файл
    if (path.startsWith('file://')) {
      return { audioUri: path, cachedPath: path };
    }
    
    // Формируем полный URL
    let fullUrl = path;
    if (!path.startsWith('http://') && !path.startsWith('https://')) {
      path = path.replace(/\\/g, '/');
      if (!path.startsWith('/')) path = '/' + path;
      fullUrl = `${getBaseUrl()}/uploads${path}`;
    }
    
    // Вычисляем путь к кэшу
    const extension = fullUrl.includes('.m4a') ? 'm4a' : 'aac';
    const cached = `${CACHE_DIR}voice_${hashUrl(fullUrl)}.${extension}`;
    
    return { audioUri: fullUrl, cachedPath: cached };
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
          return parsed;
        }
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    }
    return generateWaveform(messageId);
  }, [attachment?.waveform, messageId]);
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
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(attachment?.duration || 0);
  const [error, setError] = useState(null);

  const messageIdRef = useRef(messageId);
  const waveformWidthRef = useRef(0);

  const { audioUri, cachedPath } = useAudioUri(attachment);
  const waveformData = useWaveform(attachment, messageId);

  const onPlaybackStatusUpdate = useCallback(async (playbackStatus) => {
    if (playbackStatus.isLoaded) {
      setPlaybackPosition(playbackStatus.positionMillis / 1000);
      setPlaybackDuration(playbackStatus.durationMillis / 1000);

      if (playbackStatus.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
        if (soundRef.current) {
          try {
            const currentStatus = await soundRef.current.getStatusAsync();
            if (currentStatus.isLoaded) {
              await soundRef.current.stopAsync();
              await soundRef.current.setPositionAsync(0);
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
        progressAnim.setValue(0);
      }
    };

    audioManager.addListener(handleAudioEvent);
    return () => audioManager.removeListener(handleAudioEvent);
  }, [progressAnim]);

  const togglePlayPause = useCallback(async () => {
    try {
      setError(null);

      if (soundRef.current) {
        const soundStatus = await soundRef.current.getStatusAsync();
        
        if (!soundStatus.isLoaded) {
          setSound(null);
          soundRef.current = null;
        } else {
          if (isPlaying) {
            setIsPlaying(false);
            await soundRef.current.pauseAsync();
          } else {
            setIsPlaying(true);
            await audioManager.registerSound(messageIdRef.current, soundRef.current);
            await soundRef.current.playAsync();
          }
          return;
        }
      }

      const newSound = await loadAndPlayAudio();
      if (!newSound) {
        throw new Error('Failed to load audio');
      }

      soundRef.current = newSound;
      setSound(newSound);
      
      await audioManager.registerSound(messageIdRef.current, newSound);
      await newSound.playAsync();
      
      setIsPlaying(true);

    } catch (err) {
      console.error('Audio playback error:', err);
      setError('Не удалось воспроизвести');
      setIsPlaying(false);
    }
  }, [isPlaying, loadAndPlayAudio]);

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
      try {
        await soundRef.current.setPositionAsync(newPosition * 1000);
        setPlaybackPosition(newPosition);
        progressAnim.setValue(progress);
      } catch (err) {
        // Игнорируем ошибки перемотки
      }
    };
    
    seekAudio();
  }, [playbackDuration, progressAnim, playbackPosition]);

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
          <Text style={[
            styles.duration,
            isOwnMessage ? styles.durationOwn : styles.durationOther
          ]}>
            {isPlaying ? formatTime(playbackPosition) : formatTime(playbackDuration)}
          </Text>
          
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