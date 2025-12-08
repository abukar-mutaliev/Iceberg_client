/**
 * Утилита для воспроизведения звука отправки сообщения (как в WhatsApp)
 * Использует системный звук уведомления для простоты
 */

import { Audio } from 'expo-av';

let isInitialized = false;
let currentSound = null;

/**
 * Инициализирует звук отправки сообщения
 */
const initializeSendSound = async () => {
  if (isInitialized) return;
  
  try {
    // Настраиваем режим аудио для воспроизведения системных звуков
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    
    isInitialized = true;
  } catch (error) {
    // Игнорируем ошибки инициализации
  }
};


export const playSendSound = async () => {
  try {
    await initializeSendSound();
    
    // Останавливаем предыдущий звук, если он еще играет
    if (currentSound) {
      try {
        const status = await currentSound.getStatusAsync();
        if (status.isLoaded) {
          await currentSound.stopAsync();
          await currentSound.unloadAsync();
        }
      } catch (e) {
        // Игнорируем ошибки
      }
      currentSound = null;
    }
    
    // Пытаемся загрузить звуковой файл из assets
    // Если файл отсутствует, просто игнорируем ошибку
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../../assets/sounds/send.mp3'),
        { 
          shouldPlay: true, 
          volume: 0.3,
        }
      );
      
      currentSound = sound;
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          currentSound = null;
        }
      });
      
   
    } catch (error) {
      // Тихо игнорируем - звук не критичен для работы приложения
    }
  } catch (error) {
    // Тихо игнорируем ошибки воспроизведения звука
  }
};

