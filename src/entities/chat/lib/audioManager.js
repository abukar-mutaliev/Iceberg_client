/**
 * Глобальный менеджер аудио для управления воспроизведением голосовых сообщений
 * Гарантирует, что одновременно воспроизводится только одно аудио
 */

class AudioManager {
  constructor() {
    this.currentSound = null;
    this.currentSoundId = null;
    this.listeners = new Set();
  }

  /**
   * Регистрирует новое воспроизведение
   * @param {string} soundId - Уникальный идентификатор аудио (например, messageId)
   * @param {Audio.Sound} sound - Объект Sound из expo-av
   */
  async registerSound(soundId, sound) {
    // Если уже играет другое аудио, останавливаем его
    if (this.currentSound && this.currentSoundId !== soundId) {
      try {
        // Проверяем что звук загружен перед остановкой
        const status = await this.currentSound.getStatusAsync();
        if (status.isLoaded) {
          await this.currentSound.stopAsync();
          await this.currentSound.setPositionAsync(0);
        }
        
        // Уведомляем слушателей о остановке предыдущего аудио
        this.notifyListeners(this.currentSoundId, 'stopped');
      } catch (error) {
        console.warn('Ошибка при остановке предыдущего аудио:', error);
      }
    }

    this.currentSound = sound;
    this.currentSoundId = soundId;
  }

  /**
   * Снимает регистрацию аудио
   * @param {string} soundId - Уникальный идентификатор аудио
   */
  unregisterSound(soundId) {
    if (this.currentSoundId === soundId) {
      this.currentSound = null;
      this.currentSoundId = null;
    }
  }

  /**
   * Получает текущий активный sound ID
   * @returns {string|null}
   */
  getCurrentSoundId() {
    return this.currentSoundId;
  }

  /**
   * Проверяет, является ли данное аудио активным
   * @param {string} soundId
   * @returns {boolean}
   */
  isCurrentSound(soundId) {
    return this.currentSoundId === soundId;
  }

  /**
   * Добавляет слушателя для событий аудио
   * @param {Function} listener - Функция обратного вызова (soundId, event)
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Удаляет слушателя
   * @param {Function} listener
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Уведомляет всех слушателей о событии
   * @param {string} soundId
   * @param {string} event - 'stopped', 'playing', etc.
   */
  notifyListeners(soundId, event) {
    this.listeners.forEach(listener => {
      try {
        listener(soundId, event);
      } catch (error) {
        console.warn('Ошибка в слушателе аудио:', error);
      }
    });
  }

  /**
   * Останавливает все активные аудио
   */
  async stopAll() {
    if (this.currentSound) {
      try {
        const status = await this.currentSound.getStatusAsync();
        if (status.isLoaded) {
          await this.currentSound.stopAsync();
          await this.currentSound.setPositionAsync(0);
        }
        this.notifyListeners(this.currentSoundId, 'stopped');
      } catch (error) {
        console.warn('Ошибка при остановке всех аудио:', error);
      }
      this.currentSound = null;
      this.currentSoundId = null;
    }
  }
}

// Экспортируем синглтон
export const audioManager = new AudioManager();

