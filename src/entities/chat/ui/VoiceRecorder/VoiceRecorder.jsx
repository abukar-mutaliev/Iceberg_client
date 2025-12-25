import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useChatSocketActions } from '@entities/chat/hooks/useChatSocketActions';

const WAVEFORM_BARS_COUNT = 20;
const MIN_BAR_HEIGHT = 8;
const MAX_BAR_HEIGHT = 50;

export const VoiceRecorder = ({ onSend, onCancel, roomId }) => {
  const { emitTyping } = useChatSocketActions();
  const [recording, setRecording] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const indicatorOpacityAnim = useRef(new Animated.Value(0.3)).current; // Отдельная анимация для индикатора
  const timerScaleAnim = useRef(new Animated.Value(1)).current;
  const sendButtonScale = useRef(new Animated.Value(1)).current;
  const sendButtonOpacity = useRef(new Animated.Value(0.6)).current; // Анимация прозрачности кнопки отправки (0.6 когда disabled)
  const cancelButtonScale = useRef(new Animated.Value(1)).current;
  const hintOpacity = useRef(new Animated.Value(1)).current; // Анимация для подсказки "Говорите..."
  const timerInterval = useRef(null);
  const waveformData = useRef([]); // Массив для хранения высот волн
  const waveformAnims = useRef(
    Array.from({ length: WAVEFORM_BARS_COUNT }, () => new Animated.Value(MIN_BAR_HEIGHT))
  ).current; // Анимированные значения для каждого бара
  const waveformOpacityAnim = useRef(new Animated.Value(0.3)).current; // Отдельная анимация для waveform (без нативного драйвера)
  const waveformUpdateInterval = useRef(null);
  const waveformCurrentHeights = useRef(Array(WAVEFORM_BARS_COUNT).fill(MIN_BAR_HEIGHT)); // Текущие высоты баров
  const isStartingRef = useRef(false); // Флаг для предотвращения множественных попыток запуска
  const recordingRef = useRef(null); // Ref для синхронного доступа к recording

  useEffect(() => {
    // Анимация появления
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7
    }).start();

    // Запускаем запись
    startRecording();

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      if (waveformUpdateInterval.current) {
        clearInterval(waveformUpdateInterval.current);
      }
      const currentRecording = recordingRef.current;
      if (currentRecording) {
        // Безопасная остановка записи при размонтировании
        currentRecording.getStatusAsync()
          .then(status => {
            if (status && status.canRecord !== false) {
              return currentRecording.stopAndUnloadAsync();
            }
          })
          .catch(() => {
            // Игнорируем ошибки при cleanup
          });
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      // Плавная анимация пульсации для индикатора записи
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.3,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(indicatorOpacityAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(indicatorOpacityAnim, {
              toValue: 0.6,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
      
      // Отдельная анимация для waveform opacity (без нативного драйвера, так как используется с height)
      Animated.timing(waveformOpacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      pulseAnim.setValue(1);
      indicatorOpacityAnim.setValue(0.3);
      Animated.timing(waveformOpacityAnim, {
        toValue: 0.3,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isRecording, isPaused]);

  // Обновление waveform баров на основе данных
  useEffect(() => {
    if (isRecording && !isPaused) {
      const updateWaveform = () => {
        if (waveformData.current.length > 0) {
          // Берем последние значения для более плавной анимации
          const dataLength = waveformData.current.length;
          const windowSize = Math.min(dataLength, WAVEFORM_BARS_COUNT * 2);
          const recentData = waveformData.current.slice(-windowSize);
          
          // Обновляем каждый бар с плавной интерполяцией
          waveformAnims.forEach((anim, index) => {
            let value;
            
            if (recentData.length >= WAVEFORM_BARS_COUNT) {
              // Используем сэмплирование для более плавного распределения
              const sampleIndex = Math.floor((index / WAVEFORM_BARS_COUNT) * recentData.length);
              const nextIndex = Math.min(sampleIndex + 1, recentData.length - 1);
              
              // Интерполяция между соседними значениями для плавности
              const currentValue = recentData[sampleIndex] || 0.5;
              const nextValue = recentData[nextIndex] || 0.5;
              const t = (index / WAVEFORM_BARS_COUNT) * recentData.length - sampleIndex;
              value = currentValue + (nextValue - currentValue) * t;
            } else {
              // Если данных мало, используем доступные данные с интерполяцией
              const dataIndex = Math.floor((index / WAVEFORM_BARS_COUNT) * recentData.length);
              value = recentData[dataIndex] || 0.4;
            }
            
            // Добавляем небольшую вариацию для более естественного вида
            const variation = (Math.random() - 0.5) * 0.1;
            value = Math.max(0.2, Math.min(1.0, value + variation));
            
            // Преобразуем нормализованное значение (0.2-1.0) в высоту (MIN-MAX)
            const height = MIN_BAR_HEIGHT + (value - 0.2) * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) / 0.8;
            
            // Получаем текущее значение и обновляем только если изменение значительное
            const currentHeight = waveformCurrentHeights.current[index] || MIN_BAR_HEIGHT;
            if (Math.abs(currentHeight - height) > 1.5) {
              waveformCurrentHeights.current[index] = height;
              // Останавливаем предыдущую анимацию перед запуском новой
              anim.stopAnimation(() => {
                Animated.timing(anim, {
                  toValue: height,
                  duration: 150,
                  useNativeDriver: false,
                }).start();
              });
            }
          });
        } else {
          // Если данных нет, создаем плавную волну с задержкой для каждого бара
          const time = Date.now();
          waveformAnims.forEach((anim, index) => {
            const phase = (time / 250) + (index * 0.4);
            const value = 0.35 + Math.sin(phase) * 0.25 + Math.cos(phase * 1.5) * 0.15;
            const height = MIN_BAR_HEIGHT + (value - 0.2) * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) / 0.8;
            
            const currentHeight = waveformCurrentHeights.current[index] || MIN_BAR_HEIGHT;
            if (Math.abs(currentHeight - height) > 1.5) {
              waveformCurrentHeights.current[index] = height;
              anim.stopAnimation(() => {
                Animated.timing(anim, {
                  toValue: height,
                  duration: 200,
                  useNativeDriver: false,
                }).start();
              });
            }
          });
        }
      };
      
      waveformUpdateInterval.current = setInterval(updateWaveform, 100);
    } else {
      if (waveformUpdateInterval.current) {
        clearInterval(waveformUpdateInterval.current);
        waveformUpdateInterval.current = null;
      }
      // Плавно уменьшаем бары при остановке
      waveformAnims.forEach((anim, index) => {
        waveformCurrentHeights.current[index] = MIN_BAR_HEIGHT;
        anim.stopAnimation(() => {
          Animated.timing(anim, {
            toValue: MIN_BAR_HEIGHT,
            duration: 400,
            useNativeDriver: false,
          }).start();
        });
      });
    }

    return () => {
      if (waveformUpdateInterval.current) {
        clearInterval(waveformUpdateInterval.current);
        waveformUpdateInterval.current = null;
      }
      // Останавливаем все анимации при размонтировании
      waveformAnims.forEach((anim) => {
        anim.stopAnimation();
      });
    };
  }, [isRecording, isPaused]);

  // Анимация таймера при обновлении
  useEffect(() => {
    if (recordingDuration > 0) {
      Animated.sequence([
        Animated.timing(timerScaleAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(timerScaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [recordingDuration]);

  // Анимация кнопки отправки и подсказки при изменении длительности
  useEffect(() => {
    if (recordingDuration >= 1) {
      // Плавно показываем кнопку отправки и скрываем подсказку
      Animated.parallel([
        Animated.timing(sendButtonOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(hintOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Плавно скрываем кнопку отправки и показываем подсказку
      Animated.parallel([
        Animated.timing(sendButtonOpacity, {
          toValue: 0.6,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(hintOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [recordingDuration]);

  const startRecording = async () => {
    // Защита от множественных попыток запуска
    if (isStartingRef.current) {
      return;
    }
    
    // Проверяем, нет ли уже активной записи
    if (recordingRef.current) {
      try {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          // Запись уже активна, не создаем новую
          return;
        }
      } catch {
        // Игнорируем ошибки проверки статуса
      }
    }
    
    isStartingRef.current = true;
    
    try {
      // Запрашиваем разрешение
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        console.error('Разрешение на запись аудио не предоставлено');
        onCancel();
        return;
      }

      // Настраиваем аудио режим
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Создаем запись
      // ✅ ИСПРАВЛЕНИЕ: iOS записывает M4A с новым 'chnl' box (version 1),
      // который не поддерживается FFmpeg 6.1.1
      // Решение: записываем в формате CAF (Core Audio Format) с LinearPCM,
      // который FFmpeg отлично обрабатывает
      const recordingOptions = Platform.OS === 'ios' ? {
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 1, // Моно для голосовых сообщений (экономия трафика)
          bitRate: 128000,
        },
        ios: {
          extension: '.caf',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 1, // Моно для голосовых сообщений
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      } : Audio.RecordingOptionsPresets.HIGH_QUALITY;
      
      const { recording: newRecording } = await Audio.Recording.createAsync(
        recordingOptions,
        (status) => {
          // ✅ Обновление длительности из callback
          if (status.isRecording && status.durationMillis !== undefined) {
            const durationSec = Math.floor(status.durationMillis / 1000);
            setRecordingDuration(durationSec);
            
            // Генерируем waveform данные на основе metering (если доступно)
            // Или используем случайные значения для визуализации
            if (status.metering !== undefined) {
              // Нормализуем metering от -160 до 0 dB в диапазон 0.2-1.0
              const normalized = Math.max(0.2, Math.min(1.0, (status.metering + 160) / 160));
              waveformData.current.push(normalized);
            } else {
              // Генерируем случайное значение для красивой визуализации
              const randomHeight = 0.3 + Math.random() * 0.7;
              waveformData.current.push(randomHeight);
            }
          }
        },
        100 // Интервал обновления в мс
      );

      recordingRef.current = newRecording;
      setRecording(newRecording);
      setIsRecording(true);

      // Отправляем событие начала голосового сообщения
      if (roomId) {
        emitTyping(roomId, true, 'voice');
      }

    } catch (error) {
      console.error('Ошибка при начале записи:', error);
      onCancel();
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopRecording = async () => {
    try {
      const currentRecording = recordingRef.current || recording;
      if (!currentRecording) return null;

      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }

      setIsRecording(false);
      
      // ✅ Получаем финальный статус перед остановкой
      let status;
      let finalDuration = recordingDuration;
      try {
        status = await currentRecording.getStatusAsync();
        finalDuration = status.durationMillis ? Math.floor(status.durationMillis / 1000) : recordingDuration;
      } catch (err) {
        // Если не удалось получить статус, используем текущую длительность
        console.warn('Не удалось получить статус записи:', err);
      }
      
      // Проверяем, что запись еще не была выгружена
      try {
        if (status && status.canRecord !== false) {
          await currentRecording.stopAndUnloadAsync();
        }
      } catch (err) {
        // Игнорируем ошибки, если запись уже была выгружена
        if (err.message && err.message.includes('already been unloaded')) {
          // Запись уже выгружена, это нормально
        } else {
          console.warn('Ошибка при остановке записи:', err);
        }
      }
      
      let uri = null;
      try {
        uri = currentRecording.getURI();
      } catch (err) {
        // Игнорируем ошибки получения URI
        console.warn('Не удалось получить URI записи:', err);
      }
      
      // Очищаем ref
      recordingRef.current = null;
      
      if (uri) {
        // Получаем информацию о файле
        const fileInfo = await FileSystem.getInfoAsync(uri);
        
        if (fileInfo.exists) {
          // Нормализуем waveform до 40 точек для отображения
          const targetWaveformLength = 40;
          let normalizedWaveform = [];
          
          if (waveformData.current.length > 0) {
            const step = waveformData.current.length / targetWaveformLength;
            for (let i = 0; i < targetWaveformLength; i++) {
              const index = Math.floor(i * step);
              normalizedWaveform.push(waveformData.current[index] || 0.5);
            }
          } else {
            // Если нет данных, создаём случайную waveform
            normalizedWaveform = Array.from({ length: targetWaveformLength }, () => 0.3 + Math.random() * 0.7);
          }
          
          // ✅ Определяем MIME-тип на основе расширения файла
          const fileExtension = uri.split('.').pop().toLowerCase();
          const mimeType = fileExtension === 'm4a' ? 'audio/mp4' : 'audio/aac';
          
          if (__DEV__) {
            console.log('🎤 VoiceRecorder: Запись остановлена', {
              uri,
              duration: finalDuration,
              size: fileInfo.size,
              waveformPoints: normalizedWaveform.length,
              mimeType,
              fileExtension
            });
          }
          
          return {
            uri,
            duration: finalDuration,
            size: fileInfo.size,
            type: mimeType, // ✅ Добавляем MIME-тип
            waveform: normalizedWaveform // ✅ Добавляем waveform данные
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка при остановке записи:', error);
      return null;
    }
  };

  const handleSend = async () => {
    // Отправляем событие окончания голосового сообщения
    if (roomId) {
      emitTyping(roomId, false, 'voice');
    }

    // Анимация нажатия
    Animated.sequence([
      Animated.timing(sendButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(sendButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const audioData = await stopRecording();
    if (audioData && onSend) {
      onSend(audioData);
    }
  };

  const handleCancel = async () => {
    // Отправляем событие окончания голосового сообщения
    if (roomId) {
      emitTyping(roomId, false, 'voice');
    }

    // Анимация нажатия
    Animated.sequence([
      Animated.timing(cancelButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cancelButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const currentRecording = recordingRef.current || recording;
    if (currentRecording) {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      setIsRecording(false);
      try {
        // Проверяем статус перед остановкой
        const status = await currentRecording.getStatusAsync();
        if (status && status.canRecord !== false) {
          await currentRecording.stopAndUnloadAsync();
        }
      } catch (error) {
        // Игнорируем ошибки при остановке (включая "already been unloaded")
        if (error.message && !error.message.includes('already been unloaded')) {
          console.warn('Ошибка при отмене записи:', error);
        }
      }
      recordingRef.current = null;
    }
    if (onCancel) {
      onCancel();
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            },
          ],
          opacity: slideAnim,
        },
      ]}
    >
      {/* Индикатор записи */}
      <View style={styles.recordingIndicator}>
        <Animated.View
          style={[
            styles.pulsingDot,
            {
              transform: [{ scale: pulseAnim }],
              opacity: indicatorOpacityAnim,
            },
          ]}
        />
        <Animated.Text 
          style={[
            styles.recordingText,
            {
              opacity: indicatorOpacityAnim,
            },
          ]}
        >
          Запись...
        </Animated.Text>
      </View>

      {/* Таймер */}
      <Animated.Text 
        style={[
          styles.timer,
          {
            transform: [{ scale: timerScaleAnim }],
          },
        ]}
      >
        {formatDuration(recordingDuration)}
      </Animated.Text>

      {/* Визуализация формы волны */}
      <View style={styles.waveformContainer}>
        {waveformAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.waveformBar,
              {
                height: anim,
                opacity: waveformOpacityAnim,
              },
            ]}
          />
        ))}
      </View>

      {/* Кнопки управления */}
      <View style={styles.controls}>
        {/* Кнопка отмены */}
        <Animated.View
          style={{
            transform: [{ scale: cancelButtonScale }],
          }}
        >
          <TouchableOpacity
            style={[styles.controlButton, styles.cancelButton]}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={28} color="#FF3B30" />
          </TouchableOpacity>
        </Animated.View>

        {/* Кнопка отправки */}
        <Animated.View
          style={{
            transform: [{ scale: sendButtonScale }],
            opacity: sendButtonOpacity,
          }}
        >
          <TouchableOpacity
            style={[
              styles.controlButton, 
              styles.sendButton,
              recordingDuration < 1 && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            activeOpacity={recordingDuration < 1 ? 1 : 0.8}
            disabled={recordingDuration < 1}
            android_ripple={{ color: 'transparent', borderless: false }}
          >
            <Ionicons 
              name="send" 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Подсказка - всегда занимает место, но плавно появляется/исчезает */}
      <View style={styles.hintContainer}>
        {recordingDuration < 1 && (
          <Text style={styles.hint}>Говорите...</Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  timer: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
    fontVariant: ['tabular-nums'],
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginBottom: 24,
    paddingHorizontal: 10,
    gap: 3,
  },
  waveformBar: {
    width: 4,
    backgroundColor: '#25D366',
    borderRadius: 2,
    minHeight: MIN_BAR_HEIGHT,
    alignSelf: 'flex-end',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        // Тени отключены для предотвращения визуальных артефактов
      },
    }),
  },
  cancelButton: {
    backgroundColor: '#FFE8E8',
  },
  sendButton: {
    backgroundColor: '#25D366',
  },
  sendButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  hintContainer: {
    minHeight: 40, // Минимальная высота для предотвращения дергания
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'transparent',
  },
  hint: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
});

