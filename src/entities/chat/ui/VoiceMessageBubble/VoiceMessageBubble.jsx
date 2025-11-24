import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Easing, Pressable } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { getBaseUrl } from '@shared/api/api';
import { audioManager } from '../../lib/audioManager';

// StatusTicks компонент (копируем из MessageBubble для независимости)
const StatusTicks = React.memo(({status}) => {
    // Отправляется (оптимистичное сообщение) - как в WhatsApp
    if (status === 'SENDING') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick, styles.tickSending]}>✓</Text>
            </View>
        );
    }
    
    // Ошибка отправки
    if (status === 'FAILED') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick, styles.tickFailed]}>❌</Text>
            </View>
        );
    }
    
    // Прочитано
    if (status === 'read' || status === 'READ') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick, styles.tickRead]}>✓</Text>
                <Text style={[styles.tick, styles.tickRead, styles.secondTick]}>✓</Text>
            </View>
        );
    }
    
    // Доставлено
    if (status === 'DELIVERED') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick]}>✓</Text>
                <Text style={[styles.tick, styles.secondTick]}>✓</Text>
            </View>
        );
    }
    
    // Отправлено
    if (status === 'SENT') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick]}>✓</Text>
            </View>
        );
    }

    // По умолчанию - одна галочка
    return (
        <View style={styles.ticksContainer}>
            <Text style={[styles.tick]}>✓</Text>
        </View>
    );
});

// Компонент внутреннего содержимого (без пузыря, только контент)
export const VoiceMessageBubble = ({ messageId, attachment, isOwnMessage, time, status }) => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(attachment?.duration || 0);
  const [error, setError] = useState(null);

  const soundRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current; // Анимированный прогресс
  const messageIdRef = useRef(messageId); // Сохраняем messageId в ref для использования в коллбэках
  const isPreloading = useRef(false); // Флаг предзагрузки
  const [isSeeking, setIsSeeking] = useState(false); // Флаг перемотки
  const lastUpdateTime = useRef(Date.now()); // Время последнего обновления
  const animationRef = useRef(null); // Ссылка на текущую анимацию
  const waveformWidthRef = useRef(0); // Ширина waveform для расчета позиции
  
  // Парсим waveform если он пришёл как строка
  const waveformData = useMemo(() => {
    if (attachment?.waveform) {
      try {
        const parsed = typeof attachment.waveform === 'string' 
          ? JSON.parse(attachment.waveform) 
          : attachment.waveform;
        
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('Ошибка парсинга waveform:', e);
      }
    }
    // Fallback: генерируем случайную waveform
    return Array.from({ length: 40 }, () => 0.3 + Math.random() * 0.7);
  }, [attachment?.waveform]);

  // Функция получения URI аудио (вынесена для использования в предзагрузке)
  const getAudioUri = useCallback(() => {
    if (!attachment?.path) return null;
    
    let path = attachment.path;
    
    // Если путь уже полный URL (начинается с http:// или https://), используем его как есть
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Иначе строим URL из относительного пути
    if (path.startsWith('\\')) {
      path = path.replace(/\\/g, '/');
    }
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    return `${getBaseUrl()}/uploads${path}`;
  }, [attachment?.path]);

  // Обработчик обновления статуса воспроизведения (вынесен для использования в предзагрузке)
  const onPlaybackStatusUpdate = useCallback(async (status) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis / 1000);
      setPlaybackDuration(status.durationMillis / 1000);

      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
        if (soundRef.current) {
          try {
            // Проверяем что звук все еще загружен перед остановкой
            const currentStatus = await soundRef.current.getStatusAsync();
            if (currentStatus.isLoaded) {
              await soundRef.current.stopAsync();
              await soundRef.current.setPositionAsync(0);
            }
          } catch (error) {
            console.error('Ошибка при остановке аудио:', error);
          }
        }
        // Снимаем регистрацию из audioManager
        audioManager.unregisterSound(messageIdRef.current);
      }
    }
  }, []);

  // Предзагрузка аудио при монтировании компонента
  useEffect(() => {
    const preloadAudio = async () => {
      // ✅ Пропускаем предзагрузку для оптимистичных сообщений (проверяем по статусу)
      const isOptimistic = status === 'SENDING' || status === 'FAILED';
      
      if (isOptimistic) {
        if (__DEV__) {
          console.log('⏭️ Пропуск предзагрузки для оптимистичного сообщения:', {
            messageId,
            status
          });
        }
        return;
      }

      if (isPreloading.current || soundRef.current) {
        if (__DEV__) {
          console.log('⏭️ Пропуск предзагрузки:', {
            messageId,
            isPreloading: isPreloading.current,
            hasSoundRef: !!soundRef.current
          });
        }
        return; // Уже загружаем или загружено
      }
      
      try {
        isPreloading.current = true;

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        const audioUri = getAudioUri();
        
        if (!audioUri) {
          return;
        }

        // Пропускаем предзагрузку для локальных файлов
        if (audioUri.startsWith('file://')) {
          return;
        }

        // Создаём звук БЕЗ автозапуска для предзагрузки
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: false },
          onPlaybackStatusUpdate
        );

        // Проверяем что звук загружен
        const status = await newSound.getStatusAsync();
        if (status.isLoaded) {
          soundRef.current = newSound;
          setSound(newSound);
        }
      } catch (error) {
        // Тихо обрабатываем ошибки предзагрузки
        // Аудио загрузится при первом нажатии play
      } finally {
        isPreloading.current = false;
      }
    };

    // УМНАЯ СТРАТЕГИЯ ПРЕДЗАГРУЗКИ:
    // - Первые 3 аудио: загружаем сразу (100-300ms)
    // - Следующие 5 аудио: средний приоритет (500-1000ms)
    // - Остальные: низкий приоритет (2000-4000ms)
    let delay;
    const msgId = typeof messageId === 'number' ? messageId : parseInt(messageId, 10);
    const audioIndex = msgId % 100; // Используем остаток от деления для определения позиции
    
    if (audioIndex < 3) {
      // Высокий приоритет: видимые на экране
      delay = 100 + Math.random() * 200; // 100-300ms
    } else if (audioIndex < 8) {
      // Средний приоритет
      delay = 500 + Math.random() * 500; // 500-1000ms
    } else {
      // Низкий приоритет: загружаем позже
      delay = 2000 + Math.random() * 2000; // 2000-4000ms
    }
    
    const timer = setTimeout(() => {
      preloadAudio();
    }, delay);

    return () => clearTimeout(timer);
  }, [attachment?.path, messageId, status, getAudioUri, onPlaybackStatusUpdate]); // Перезагружаем если изменился путь к файлу или статус

  // Супер-плавная непрерывная анимация прогресса
  useEffect(() => {
    // Останавливаем предыдущую анимацию
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    if (playbackDuration > 0 && !isSeeking) {
      if (isPlaying) {
        // Во время воспроизведения: рассчитываем следующее обновление
        const now = Date.now();
        lastUpdateTime.current = now;
        
        // Предсказываем следующую позицию через 1 секунду
        const nextPosition = Math.min(playbackPosition + 1, playbackDuration);
        const nextProgress = (nextPosition / playbackDuration) * 100;
        
        // Анимируем до следующей предсказанной позиции
        animationRef.current = Animated.timing(progressAnim, {
          toValue: nextProgress,
          duration: 1000, // 1 секунда до следующего обновления
          useNativeDriver: false,
          easing: Easing.linear,
        });
        animationRef.current.start();
      } else {
        // Когда не играет - мгновенно
        const targetProgress = (playbackPosition / playbackDuration) * 100;
        progressAnim.setValue(targetProgress);
      }
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [playbackPosition, playbackDuration, isSeeking, isPlaying, progressAnim]);

  // Сброс анимации при завершении
  useEffect(() => {
    if (!isPlaying && playbackPosition === 0) {
      progressAnim.setValue(0);
    }
  }, [isPlaying, playbackPosition, progressAnim]);

  // Слушатель событий от audioManager для остановки при воспроизведении другого аудио
  useEffect(() => {
    const handleAudioEvent = (soundId, event) => {
      // Если остановлено другое аудио и это наше аудио, сбрасываем состояние
      if (event === 'stopped' && soundId === messageIdRef.current) {
        setIsPlaying(false);
        setPlaybackPosition(0);
        progressAnim.setValue(0);
      }
    };

    audioManager.addListener(handleAudioEvent);

    return () => {
      audioManager.removeListener(handleAudioEvent);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        audioManager.unregisterSound(messageIdRef.current);
      }
    };
  }, []);


  const togglePlayPause = async () => {
    try {
      setError(null);

      // Если звук уже загружен
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        
        // Проверяем что звук загружен перед операциями
        if (!status.isLoaded) {
          console.warn('⚠️ Звук был выгружен, перезагружаем...');
          // Сбрасываем состояние и перезагружаем
          setSound(null);
          soundRef.current = null;
          // Продолжаем выполнение для загрузки звука заново
        } else {
          // Звук загружен и готов
          if (isPlaying) {
            // Мгновенно обновляем UI
            setIsPlaying(false);
            
            // Если идет перемотка, завершаем ее
            if (isSeeking && lastSeekProgress.current !== null) {
              const newPosition = (lastSeekProgress.current / 100) * playbackDuration * 1000;
              await soundRef.current.setPositionAsync(newPosition);
              setPlaybackPosition(newPosition / 1000);
              setIsSeeking(false);
            }
            
            // Пауза
            await soundRef.current.pauseAsync();
            
            if (__DEV__) {
            }
          } else {
            // Мгновенно обновляем UI
            setIsPlaying(true);
            
            // Регистрируем и воспроизводим
            await audioManager.registerSound(messageIdRef.current, soundRef.current);
            await soundRef.current.playAsync();
            
          }
          return;
        }
      }

      // Загружаем звук (если не был загружен или был выгружен)
      setIsLoading(true);

      if (__DEV__) {
        console.log('🔄 Загрузка аудио для воспроизведения:', {
          messageId: messageIdRef.current,
          hasSound: !!sound,
          hasSoundRef: !!soundRef.current
        });
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const audioUri = getAudioUri();
      
      if (!audioUri) {
        throw new Error('Не удалось получить URL аудио файла');
      }

      // Создаём звук БЕЗ автозапуска
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false }, // ✅ Не запускаем автоматически
        onPlaybackStatusUpdate
      );

      // Проверяем что звук загружен
      const status = await newSound.getStatusAsync();
      if (!status.isLoaded) {
        throw new Error('Звук не загружен после создания');
      }

      soundRef.current = newSound;
      setSound(newSound);
      
      // Регистрируем новое аудио в audioManager
      await audioManager.registerSound(messageIdRef.current, newSound);
      
      // Только после регистрации запускаем воспроизведение
      await newSound.playAsync();
      
      setIsPlaying(true);
      setIsLoading(false);

    } catch (err) {
      console.error('Ошибка при воспроизведении аудио:', err);
      setError('Не удалось воспроизвести аудио');
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Функция перемотки аудио
  const seekToPosition = async (progress) => {
    if (!soundRef.current || !playbackDuration) {
      if (__DEV__) {
        console.warn('⚠️ Невозможно выполнить перемотку:', {
          hasSoundRef: !!soundRef.current,
          playbackDuration
        });
      }
      return;
    }

    try {
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) {
        if (__DEV__) {
          console.warn('⚠️ Звук не загружен для перемотки');
        }
        return;
      }

      const newPosition = (progress / 100) * playbackDuration * 1000; // В миллисекундах
      
      if (__DEV__) {
        console.log('🎯 Перемотка на позицию:', {
          progress: progress.toFixed(1) + '%',
          newPosition: (newPosition / 1000).toFixed(1) + 's',
          duration: playbackDuration.toFixed(1) + 's'
        });
      }
      
      await soundRef.current.setPositionAsync(newPosition);
      setPlaybackPosition(newPosition / 1000);
      
      // Обновляем анимацию прогресса
      progressAnim.setValue(progress);
    } catch (error) {
      console.error('❌ Ошибка при перемотке:', error);
      // Не показываем ошибку пользователю при перемотке
    }
  };

  // Обработчик измерения ширины waveform
  const handleWaveformLayout = useCallback((event) => {
    const { width } = event.nativeEvent.layout;
    waveformWidthRef.current = width;
  }, []);

  // Обработчик клика по waveform для перемотки
  const handleWaveformPress = useCallback((event) => {
    if (!soundRef.current || playbackDuration <= 0) return;
    
    const { locationX } = event.nativeEvent;
    const width = waveformWidthRef.current || 200; // Используем измеренную ширину или fallback
    
    // Вычисляем прогресс на основе позиции клика
    const progress = Math.max(0, Math.min(100, (locationX / width) * 100));
    const newPosition = (progress / 100) * playbackDuration;
    
    // Выполняем перемотку
    const seekAudio = async () => {
      try {
        const newPositionMs = newPosition * 1000;
        await soundRef.current.setPositionAsync(newPositionMs);
        setPlaybackPosition(newPosition);
        progressAnim.setValue(progress);
      } catch (error) {
        console.error('❌ Ошибка перемотки:', error);
      }
    };
    
    seekAudio();
  }, [playbackDuration, progressAnim]);

  return (
    <View style={styles.container}>
      {/* Кнопка воспроизведения - стиль WhatsApp */}
      <TouchableOpacity
        style={[
          styles.playButton,
          isOwnMessage ? styles.playButtonOwn : styles.playButtonOther
        ]}
        onPress={togglePlayPause}
        disabled={isLoading || !!error}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : error ? (
          <Ionicons name="alert-circle" size={24} color="#FF3B30" />
        ) : isPlaying ? (
          <View style={styles.pauseIcon}>
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </View>
        ) : (
          <View style={styles.playTriangle} />
        )}
      </TouchableOpacity>

      {/* Визуализация и время */}
      <View style={styles.waveformContainer}>
        {/* Интерактивная область с волнами (кликабельная) */}
        <Pressable 
          style={styles.waveformWrapper}
          onPress={handleWaveformPress}
          onLayout={handleWaveformLayout}
          disabled={!soundRef.current || isLoading}
          hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
        >
          {/* Прогресс бар - волны из реальной записи */}
          <View style={styles.waveformBars}>
            {waveformData.map((height, i) => {
              // Используем реальную высоту из waveform данных
              const heightPercent = height;
              const barPosition = (i / waveformData.length) * 100;
              
              // Создаём плавную интерполяцию цвета для каждого бара
              // Используем более широкий диапазон для плавного градиента
              const backgroundColor = progressAnim.interpolate({
                inputRange: [
                  Math.max(0, barPosition - 3),  // Начинаем анимацию раньше
                  barPosition,                    // Текущая позиция
                  Math.min(100, barPosition + 1)  // Завершаем позже
                ],
                outputRange: [
                  isOwnMessage ? 'rgba(9, 94, 84, 0.3)' : 'rgba(0, 0, 0, 0.2)', // Неактивный
                  isOwnMessage ? '#095E54' : '#25D366',                          // Активный
                  isOwnMessage ? '#095E54' : '#25D366'                           // Остаётся активным
                ],
                extrapolate: 'clamp'
              });
              
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.waveBar,
                    {
                      height: `${heightPercent * 100}%`,
                      backgroundColor
                    }
                  ]}
                />
              );
            })}
          </View>
        </Pressable>

        {/* Длительность, время и статус в одной строке */}
        <View style={styles.timeRow}>
          <Text style={[
            styles.duration,
            isOwnMessage ? styles.durationOwn : styles.durationOther
          ]}>
            {isPlaying ? formatTime(playbackPosition) : formatTime(playbackDuration)}
          </Text>
          
          {/* Время и галочки справа */}
          {time && (
            <View style={styles.timeAndStatus}>
              <Text style={styles.timestamp}>{time}</Text>
              {isOwnMessage && status && <StatusTicks status={status} />}
            </View>
          )}
        </View>
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 220,
    maxWidth: 260,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  playButtonOwn: {
    backgroundColor: '#095E54',
  },
  playButtonOther: {
    backgroundColor: '#25D366',
  },
  // Треугольник play 
  playTriangle: {
    width: 0,
    height: 0,
    marginLeft: 2,
    borderLeftWidth: 12,
    borderRightWidth: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftColor: '#FFFFFF',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  // Иконка паузы
  pauseIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  pauseBar: {
    width: 3,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  waveformContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  waveformWrapper: {
    position: 'relative',
    width: '100%',
  },
  waveformBars: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 19, // Компактная высота волн
    gap: 1.5, // Меньший промежуток между волнами
  },
  waveBar: {
    flex: 1,
    borderRadius: 1.5,
    marginTop: 25,
    minHeight: 3, // Минимальная видимая высота
  },
  // Строка с длительностью, временем и галочками
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    width: '100%',

  },
  duration: {
    fontSize: 11,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
    lineHeight: 14,
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
    lineHeight: 14,
  },
  // Галочки статуса
  ticksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    width: 12,
    height: 10,
    marginTop: 3,
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
  errorText: {
    fontSize: 11,
    color: '#FF3B30',
    marginTop: 4,
    position: 'absolute',
    bottom: -18,
  },
});

