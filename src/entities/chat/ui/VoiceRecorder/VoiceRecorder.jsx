import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';

export const VoiceRecorder = ({ onSend, onCancel }) => {
  const [recording, setRecording] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerInterval = useRef(null);
  const waveformData = useRef([]); // Массив для хранения высот волн

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
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      // Анимация пульсации для кнопки записи
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isRecording, isPaused]);

  const startRecording = async () => {
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
      const { recording: newRecording } = await Audio.Recording.createAsync(
        // Настройки записи для высокого качества
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
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

      setRecording(newRecording);
      setIsRecording(true);

    } catch (error) {
      console.error('Ошибка при начале записи:', error);
      onCancel();
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return null;

      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }

      setIsRecording(false);
      
      // ✅ Получаем финальный статус перед остановкой
      const status = await recording.getStatusAsync();
      const finalDuration = status.durationMillis ? Math.floor(status.durationMillis / 1000) : recordingDuration;
      
      await recording.stopAndUnloadAsync();
      
      const uri = recording.getURI();
      
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
          
          if (__DEV__) {
            console.log('🎤 VoiceRecorder: Запись остановлена', {
              uri,
              duration: finalDuration,
              size: fileInfo.size,
              waveformPoints: normalizedWaveform.length
            });
          }
          
          return {
            uri,
            duration: finalDuration,
            size: fileInfo.size,
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
    const audioData = await stopRecording();
    if (audioData && onSend) {
      onSend(audioData);
    }
  };

  const handleCancel = async () => {
    if (recording) {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
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
            },
          ]}
        />
        <Text style={styles.recordingText}>Запись...</Text>
      </View>

      {/* Таймер */}
      <Text style={styles.timer}>{formatDuration(recordingDuration)}</Text>

      {/* Визуализация формы волны (упрощенная) */}
      <View style={styles.waveformContainer}>
        {[...Array(20)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.waveformBar,
              {
                height: Math.random() * 30 + 10,
                opacity: isRecording ? 1 : 0.3,
              },
            ]}
          />
        ))}
      </View>

      {/* Кнопки управления */}
      <View style={styles.controls}>
        {/* Кнопка отмены */}
        <TouchableOpacity
          style={[styles.controlButton, styles.cancelButton]}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color="#FF3B30" />
        </TouchableOpacity>

        {/* Кнопка отправки */}
        <TouchableOpacity
          style={[styles.controlButton, styles.sendButton]}
          onPress={handleSend}
          activeOpacity={0.7}
          disabled={recordingDuration < 1}
        >
          <Ionicons name="send" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Подсказка */}
      {recordingDuration < 1 && (
        <Text style={styles.hint}>Говорите...</Text>
      )}
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
    justifyContent: 'space-between',
    height: 60,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#25D366',
    borderRadius: 2,
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cancelButton: {
    backgroundColor: '#FFE8E8',
  },
  sendButton: {
    backgroundColor: '#25D366',
  },
  hint: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 12,
  },
});

