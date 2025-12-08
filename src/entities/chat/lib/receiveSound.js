/**
 * Утилита для воспроизведения звука входящего сообщения (как в WhatsApp)
 */

import { Audio } from 'expo-av';

let isInitialized = false;
let currentSound = null;

/**
 * Инициализирует звук входящего сообщения
 */
const initializeReceiveSound = async () => {
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
    if (__DEV__) {
      console.warn('⚠️ Failed to initialize receive sound:', error.message);
    }
  }
};

/**
 * Воспроизводит звук входящего сообщения
 * Используется когда приходит новое сообщение в открытом чате
 */
export const playReceiveSound = async () => {
  try {
    await initializeReceiveSound();
    
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
    try {
      if (__DEV__) {
        console.log('🔊 Attempting to play receive.mp3');
      }
      
      const { sound } = await Audio.Sound.createAsync(
        require('../../../assets/sounds/receive.mp3'),
        { 
          shouldPlay: true, 
          volume: 0.5, // Немного громче, чем звук отправки
        }
      );
      
      currentSound = sound;
      
      if (__DEV__) {
        console.log('✅ Successfully loaded receive.mp3');
      }
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          currentSound = null;
        }
      });
    } catch (error) {
      // Если файл receive.mp3 не найден, используем send.mp3 как fallback
      if (__DEV__) {
        console.warn('⚠️ Failed to load receive.mp3, using send.mp3 as fallback:', error.message);
      }
      
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../../assets/sounds/send.mp3'),
          { 
            shouldPlay: true, 
            volume: 0.5,
          }
        );
        
        currentSound = sound;
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
            currentSound = null;
          }
        });
      } catch (fallbackError) {
        if (__DEV__) {
          console.error('❌ Failed to load fallback send.mp3:', fallbackError.message);
        }
      }
    }
  } catch (error) {
    // Тихо игнорируем ошибки воспроизведения звука
  }
};

