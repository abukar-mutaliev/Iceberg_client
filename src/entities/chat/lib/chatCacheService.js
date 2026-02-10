/**
 * ChatCacheService - Полноценный сервис кэширования чата
 * 
 * Обеспечивает:
 * - Локальное хранение всех сообщений
 * - Кэширование изображений и голосовых сообщений на устройстве
 * - Offline-first подход: сначала показываем кэш, потом синхронизируем
 * - Автоматическую очистку старых данных для экономии места
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { getImageUrl } from '@shared/api/api';
import { chatMessagesDb } from './chatMessagesDb';

// Константы конфигурации
const CONFIG = {
  // Лимиты хранения
  MAX_MESSAGES_PER_ROOM: 5000,      // Максимум сообщений на комнату
  MAX_CACHED_ROOMS: 100,           // Максимум кэшированных комнат
  
  // Лимиты медиа
  MAX_CACHED_IMAGES_MB: 5000,       // Максимум места для изображений (MB)
  MAX_CACHED_VOICE_MB: 2000,        // Максимум места для голосовых (MB)
  
  // Время жизни кэша (дни)
  MESSAGES_CACHE_DAYS: 30,         // Сообщения хранятся 30 дней
  MEDIA_CACHE_DAYS: 7,             // Медиа хранится 7 дней
  
  // Директории
  CACHE_DIR: FileSystem.documentDirectory,  // Постоянное хранилище (не очищается системой)
  IMAGES_DIR: 'chat_images/',
  VOICE_DIR: 'chat_voice/',
  
  // Ключи AsyncStorage
  STORAGE_KEYS: {
    ROOMS: 'chat_cache_rooms',
    MESSAGES_PREFIX: 'chat_cache_messages_',
    SYNC_STATE: 'chat_cache_sync_state',
    MEDIA_INDEX: 'chat_cache_media_index',
  }
};

class ChatCacheService {
  constructor() {
    this.isInitialized = false;
    this.mediaIndex = new Map(); // URL -> localPath маппинг
    this.pendingDownloads = new Map(); // Трекинг активных загрузок
    this.downloadQueue = []; // Очередь загрузок
    this.isProcessingQueue = false;
    this.failedUrls = new Set(); // URL, по которым получен 404 — не повторять
    this.queuedUrls = new Set(); // URL уже в очереди — дедупликация
  }

  /**
   * Инициализация сервиса кэширования
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Создаем директории для кэша если не существуют
      await this.ensureDirectories();
      
      // Загружаем индекс медиафайлов
      await this.loadMediaIndex();

      // Инициализируем SQLite для сообщений
      await chatMessagesDb.initialize();
      
      this.isInitialized = true;
      console.log('✅ ChatCacheService initialized');
    } catch (error) {
      console.error('❌ ChatCacheService initialization failed:', error);
    }
  }

  /**
   * Создание необходимых директорий
   */
  async ensureDirectories() {
    const dirs = [
      `${CONFIG.CACHE_DIR}${CONFIG.IMAGES_DIR}`,
      `${CONFIG.CACHE_DIR}${CONFIG.VOICE_DIR}`,
    ];

    for (const dir of dirs) {
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
    }
  }

  /**
   * Загрузка индекса медиафайлов из хранилища
   */
  async loadMediaIndex() {
    try {
      const indexJson = await AsyncStorage.getItem(CONFIG.STORAGE_KEYS.MEDIA_INDEX);
      if (indexJson) {
        const index = JSON.parse(indexJson);
        this.mediaIndex = new Map(Object.entries(index));
      }
    } catch (error) {
      console.warn('Failed to load media index:', error);
      this.mediaIndex = new Map();
    }
  }

  /**
   * Сохранение индекса медиафайлов
   */
  async saveMediaIndex() {
    try {
      const indexObj = Object.fromEntries(this.mediaIndex);
      await AsyncStorage.setItem(
        CONFIG.STORAGE_KEYS.MEDIA_INDEX, 
        JSON.stringify(indexObj)
      );
    } catch (error) {
      console.warn('Failed to save media index:', error);
    }
  }

  // ===========================================
  // КЭШИРОВАНИЕ СООБЩЕНИЙ
  // ===========================================

  /**
   * Получить ключ для сообщений комнаты
   */
  getMessagesKey(roomId) {
    return `${CONFIG.STORAGE_KEYS.MESSAGES_PREFIX}${roomId}`;
  }

  /**
   * Legacy: загрузить сообщения комнаты из AsyncStorage (старый формат chat_cache_messages_*)
   * Нужен для миграции в SQLite.
   */
  async loadRoomMessagesFromLegacyStorage(roomId) {
    if (!roomId) return null;
    try {
      const cacheJson = await AsyncStorage.getItem(this.getMessagesKey(roomId));
      if (!cacheJson) return null;

      const cacheData = JSON.parse(cacheJson);
      if (!cacheData?.messages || !Array.isArray(cacheData.messages)) return null;

      // Проверяем срок годности
      const ageInDays = (Date.now() - cacheData.cachedAt) / (1000 * 60 * 60 * 24);

      // Заменяем URL на локальные пути для кэшированных медиа
      const messagesWithLocalMedia = this.replaceWithLocalMedia(cacheData.messages);

      return {
        messages: messagesWithLocalMedia,
        cachedAt: cacheData.cachedAt,
        isStale: ageInDays > 1,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Сохранить сообщения комнаты
   */
  async saveRoomMessages(roomId, messages) {
    if (!roomId || !messages) return;

    try {
      // КРИТИЧНО: Фильтруем удаленные сообщения перед сохранением в кэш
      // Это предотвращает сохранение сообщений, которые были удалены для всех
      const validMessages = messages.filter(msg => {
        // Исключаем сообщения, удаленные для всех
        if (msg.isDeletedForAll === true) {
          return false;
        }
        return true;
      });
      
      // Ограничиваем количество сообщений
      const messagesToSave = validMessages.slice(0, CONFIG.MAX_MESSAGES_PER_ROOM);
      
      // Нормализуем waveform для голосовых сообщений перед сохранением
      const normalizedMessages = messagesToSave.map(message => {
        if (message.type === 'VOICE' && message.attachments?.length > 0) {
          const normalizedAttachments = message.attachments.map(attachment => {
            if (attachment.type === 'VOICE' && attachment.waveform) {
              // Убеждаемся, что waveform в правильном формате для сохранения
              let normalizedWaveform = attachment.waveform;
              
              // Если waveform - это массив, оставляем как есть (JSON.stringify обработает)
              if (Array.isArray(normalizedWaveform)) {
                // Все в порядке
              } 
              // Если waveform - это строка, проверяем, не двойная ли это JSON строка
              else if (typeof normalizedWaveform === 'string') {
                try {
                  // Пытаемся распарсить, если это JSON строка
                  const parsed = JSON.parse(normalizedWaveform);
                  if (Array.isArray(parsed)) {
                    // Нормализуем обратно в массив для правильного сохранения
                    normalizedWaveform = parsed;
                  }
                } catch {
                  // Если не JSON, оставляем как есть
                }
              }
              
              return {
                ...attachment,
                waveform: normalizedWaveform
              };
            }
            return attachment;
          });
          
          return {
            ...message,
            attachments: normalizedAttachments
          };
        }
        return message;
      });
      
      // ✅ Новое хранилище: SQLite (быстрее и надежнее для больших объемов)
      await chatMessagesDb.saveRoomMessages(roomId, normalizedMessages, CONFIG.MAX_MESSAGES_PER_ROOM);

      // Запускаем фоновое кэширование медиа
      this.queueMediaCaching(messagesToSave);

    } catch (error) {
      console.warn('Failed to save room messages:', error);
    }
  }

  /**
   * Загрузить сообщения комнаты из кэша
   */
  async loadRoomMessages(roomId) {
    if (!roomId) return null;

    try {
      // 1) Пробуем SQLite
      const dbResult = await chatMessagesDb.loadRoomMessages(roomId, CONFIG.MAX_MESSAGES_PER_ROOM);
      if (dbResult?.messages && dbResult.messages.length > 0) {
        const cachedAt = dbResult.cachedAt || Date.now();
        const ageInDays = (Date.now() - cachedAt) / (1000 * 60 * 60 * 24);
        const messagesWithLocalMedia = this.replaceWithLocalMedia(dbResult.messages);
        return {
          messages: messagesWithLocalMedia,
          cachedAt,
          isStale: ageInDays > 1,
        };
      }

      // 2) Если SQLite пуст — мигрируем старый AsyncStorage кэш "на лету"
      const legacy = await this.loadRoomMessagesFromLegacyStorage(roomId);
      if (legacy?.messages && legacy.messages.length > 0) {
        try {
          await chatMessagesDb.saveRoomMessages(roomId, legacy.messages, CONFIG.MAX_MESSAGES_PER_ROOM);
          // Не обязательно удалять legacy ключ сразу, но можно для экономии места
          await AsyncStorage.removeItem(this.getMessagesKey(roomId));
        } catch {
          // noop
        }
        return legacy;
      }

      return null;
    } catch (error) {
      console.warn('Failed to load room messages:', error);
      return null;
    }
  }

  /**
   * Добавить новое сообщение в кэш
   */
  async addMessageToCache(roomId, message) {
    if (!roomId || !message) return;

    try {
      await chatMessagesDb.saveRoomMessages(roomId, [message], CONFIG.MAX_MESSAGES_PER_ROOM);

      // Кэшируем медиа нового сообщения
      this.queueMediaCaching([message]);

    } catch (error) {
      console.warn('Failed to add message to cache:', error);
    }
  }

  /**
   * Обновить сообщение в кэше (например, статус доставки)
   */
  async updateMessageInCache(roomId, messageId, updates) {
    if (!roomId || !messageId) return;

    try {
      // Загружаем одно сообщение из SQLite, обновляем и сохраняем обратно
      const loaded = await chatMessagesDb.loadRoomMessages(roomId, CONFIG.MAX_MESSAGES_PER_ROOM);
      const existing = (loaded?.messages || []).find(m => String(m?.id) === String(messageId));
      if (!existing) return;
      const merged = { ...existing, ...updates };
      await chatMessagesDb.saveRoomMessages(roomId, [merged], CONFIG.MAX_MESSAGES_PER_ROOM);
    } catch (error) {
      console.warn('Failed to update message in cache:', error);
    }
  }

  /**
   * Удалить сообщение из кэша
   */
  async removeMessageFromCache(roomId, messageId) {
    if (!roomId || !messageId) return;

    try {
      // Удаляем из SQLite
      await chatMessagesDb.deleteMessage(roomId, messageId);
      
      // КРИТИЧНО: Также удаляем из legacy AsyncStorage кэша
      // Это предотвращает загрузку старых сообщений при следующем открытии чата
      try {
        const legacyKey = this.getMessagesKey(roomId);
        const cached = await AsyncStorage.getItem(legacyKey);
        if (cached) {
          const cacheData = JSON.parse(cached);
          if (cacheData?.messages && Array.isArray(cacheData.messages)) {
            // Фильтруем удаленное сообщение
            const filteredMessages = cacheData.messages.filter(msg => {
              const msgId = msg?.id || msg?.temporaryId;
              return msgId && String(msgId) !== String(messageId);
            });
            
            // Обновляем кэш только если есть изменения
            if (filteredMessages.length !== cacheData.messages.length) {
              await AsyncStorage.setItem(legacyKey, JSON.stringify({
                ...cacheData,
                messages: filteredMessages
              }));
              
              if (__DEV__) {
                console.log('🗑️ Removed message from legacy cache:', {
                  roomId,
                  messageId,
                  remainingMessages: filteredMessages.length
                });
              }
            }
          }
        }
      } catch (legacyError) {
        // Игнорируем ошибки legacy кэша
        if (__DEV__) {
          console.warn('Failed to remove from legacy cache:', legacyError);
        }
      }
      
      if (__DEV__) {
        console.log('✅ Message removed from cache:', { roomId, messageId });
      }
    } catch (error) {
      console.warn('Failed to remove message from cache:', error);
    }
  }

  // ===========================================
  // КЭШИРОВАНИЕ КОМНАТ
  // ===========================================

  /**
   * Сохранить список комнат
   */
  async saveRooms(rooms) {
    if (!rooms) return;

    try {
      const cacheData = {
        rooms: rooms.slice(0, CONFIG.MAX_CACHED_ROOMS),
        cachedAt: Date.now(),
        version: 1,
      };
      
      await AsyncStorage.setItem(
        CONFIG.STORAGE_KEYS.ROOMS,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.warn('Failed to save rooms:', error);
    }
  }

  /**
   * Загрузить список комнат из кэша
   */
  async loadRooms() {
    try {
      const cacheJson = await AsyncStorage.getItem(CONFIG.STORAGE_KEYS.ROOMS);
      if (!cacheJson) return null;

      const cacheData = JSON.parse(cacheJson);
      
      return {
        rooms: cacheData.rooms,
        cachedAt: cacheData.cachedAt,
      };
    } catch (error) {
      console.warn('Failed to load rooms:', error);
      return null;
    }
  }

  // ===========================================
  // КЭШИРОВАНИЕ МЕДИА
  // ===========================================

  /**
   * Генерация локального пути для файла
   */
  getLocalMediaPath(url, type = 'image') {
    if (!url) return null;
    
    // Создаем хеш из URL для уникального имени файла
    const urlHash = url.split('').reduce((acc, char) => {
      const hash = ((acc << 5) - acc) + char.charCodeAt(0);
      return hash & hash;
    }, 0);
    
    const absHash = Math.abs(urlHash);
    const dir = type === 'voice' ? CONFIG.VOICE_DIR : CONFIG.IMAGES_DIR;
    
    // Определяем расширение
    let extension = 'jpg';
    if (type === 'voice') {
      extension = url.includes('.m4a') ? 'm4a' : 'aac';
    } else if (url.includes('.png')) {
      extension = 'png';
    } else if (url.includes('.gif')) {
      extension = 'gif';
    } else if (url.includes('.webp')) {
      extension = 'webp';
    }
    
    return `${CONFIG.CACHE_DIR}${dir}${type}_${absHash}.${extension}`;
  }

  /**
   * Проверить, есть ли файл в кэше
   */
  async isMediaCached(url) {
    if (!url) return false;
    
    // Проверяем в индексе
    if (this.mediaIndex.has(url)) {
      const localPath = this.mediaIndex.get(url);
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        return localPath;
      } else {
        // Файл удален, убираем из индекса
        this.mediaIndex.delete(url);
      }
    }
    
    return false;
  }

  /**
   * Получить локальный путь к медиафайлу (или URL если не кэширован)
   */
  async getMediaUri(url, type = 'image') {
    if (!url) return null;
    
    // Проверяем локальный кэш
    const cachedPath = await this.isMediaCached(url);
    if (cachedPath) {
      return cachedPath;
    }
    
    // Возвращаем оригинальный URL
    return url;
  }

  /**
   * Кэшировать медиафайл
   */
  async cacheMedia(url, type = 'image') {
    if (!url) return null;
    
    // Пропускаем локальные файлы
    if (url.startsWith('file://') || url.startsWith('content://')) {
      return url;
    }
    
    if (this.failedUrls.has(url)) return url;
    
    // Проверяем, есть ли уже в кэше
    const cachedPath = await this.isMediaCached(url);
    if (cachedPath) {
      return cachedPath;
    }
    
    // Проверяем, не загружается ли уже
    if (this.pendingDownloads.has(url)) {
      return this.pendingDownloads.get(url);
    }
    
    const localPath = this.getLocalMediaPath(url, type);
    
    // Создаем промис загрузки
    const downloadPromise = this.downloadMedia(url, localPath, type);
    this.pendingDownloads.set(url, downloadPromise);
    
    try {
      const result = await downloadPromise;
      return result;
    } finally {
      this.pendingDownloads.delete(url);
    }
  }

  /**
   * Загрузить медиафайл
   */
  async downloadMedia(url, localPath, type) {
    try {
      const absoluteUrl = getImageUrl(url);
      const downloadResult = await FileSystem.downloadAsync(absoluteUrl, localPath);
      
      if (downloadResult.status === 200) {
        this.mediaIndex.set(url, localPath);
        if (this.mediaIndex.size % 10 === 0) {
          this.saveMediaIndex();
        }
        return localPath;
      }
      // 404 — не повторять, один раз логируем
      if (downloadResult.status === 404) {
        if (!this.failedUrls.has(url)) {
          this.failedUrls.add(url);
          if (__DEV__) {
            console.warn(`[ChatCache] Изображение недоступно (404): ${url}`);
          }
        }
      }
      return url;
    } catch (error) {
      if (__DEV__) {
        console.warn(`[ChatCache] Ошибка кэширования ${url}:`, error.message);
      }
      return url;
    }
  }

  /**
   * Добавить медиа в очередь кэширования (с дедупликацией и пропуском ранее провалившихся)
   */
  queueMediaCaching(messages) {
    if (!messages || !Array.isArray(messages)) return;

    const addToQueue = (url, type) => {
      if (!url || this.failedUrls.has(url) || this.queuedUrls.has(url) || this.mediaIndex.has(url)) return;
      this.queuedUrls.add(url);
      this.downloadQueue.push({ url, type });
    };

    for (const message of messages) {
      // Кэшируем изображения из attachments
      if (message.attachments && Array.isArray(message.attachments)) {
        for (const attachment of message.attachments) {
          if (attachment.type === 'IMAGE' && attachment.path) {
            addToQueue(attachment.path, 'image');
          } else if (attachment.type === 'VOICE' && attachment.path) {
            addToQueue(attachment.path, 'voice');
          }
        }
      }

      // Кэшируем изображение склада из сообщений WAREHOUSE
      const warehouseImage = message?.warehouse?.image;
      if (warehouseImage && typeof warehouseImage === 'string' && !warehouseImage.startsWith('file://') && !warehouseImage.startsWith('content://')) {
        addToQueue(warehouseImage, 'image');
      }
    }
    
    this.processDownloadQueue();
  }

  /**
   * Обработать очередь загрузок
   */
  async processDownloadQueue() {
    if (this.isProcessingQueue || this.downloadQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    try {
      while (this.downloadQueue.length > 0) {
        const batch = this.downloadQueue.splice(0, 3);
        for (const item of batch) {
          this.queuedUrls.delete(item.url);
        }
        await Promise.allSettled(
          batch.map(item => this.cacheMedia(item.url, item.type))
        );
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.isProcessingQueue = false;
      await this.saveMediaIndex();
    }
  }

  /**
   * Заменить URL на локальные пути в сообщениях
   */
  replaceWithLocalMedia(messages) {
    if (!messages || !Array.isArray(messages)) return messages;

    return messages.map(message => {
      let result = { ...message };

      // Подмена путей в attachments
      if (message.attachments && Array.isArray(message.attachments)) {
        result.attachments = message.attachments.map(attachment => {
          if (!attachment.path) return attachment;

          const localPath = this.mediaIndex.get(attachment.path);
          if (localPath) {
            return {
              ...attachment,
              originalPath: attachment.path,
              path: localPath,
              isCached: true,
            };
          }
          return attachment;
        });
      }

      // Подмена изображения склада в сообщениях WAREHOUSE
      if (message?.warehouse && message.warehouse.image && typeof message.warehouse.image === 'string') {
        const warehouseImagePath = message.warehouse.image;
        // Проверяем по исходному пути и по нормализованному URL (разные форматы от API)
        const localPath = this.mediaIndex.get(warehouseImagePath) || 
          this.mediaIndex.get(getImageUrl(warehouseImagePath) || warehouseImagePath);
        if (localPath) {
          result = {
            ...result,
            warehouse: {
              ...result.warehouse,
              originalImage: warehouseImagePath,
              image: localPath,
              isImageCached: true,
            },
          };
        }
      }

      return result;
    });
  }

  // ===========================================
  // ГОЛОСОВЫЕ СООБЩЕНИЯ
  // ===========================================

  /**
   * Получить кэшированный путь к голосовому сообщению
   */
  async getCachedVoicePath(voiceUrl) {
    if (!voiceUrl) return null;
    
    // Проверяем кэш
    const cachedPath = await this.isMediaCached(voiceUrl);
    if (cachedPath) {
      return cachedPath;
    }
    
    // Кэшируем и возвращаем
    return this.cacheMedia(voiceUrl, 'voice');
  }

  /**
   * Предзагрузить голосовое сообщение
   */
  async preloadVoice(voiceUrl) {
    if (!voiceUrl) return;
    
    // Добавляем в очередь с высоким приоритетом
    this.downloadQueue.unshift({ url: voiceUrl, type: 'voice' });
    this.processDownloadQueue();
  }

  // ===========================================
  // СИНХРОНИЗАЦИЯ
  // ===========================================

  /**
   * Получить состояние синхронизации
   */
  async getSyncState() {
    try {
      const stateJson = await AsyncStorage.getItem(CONFIG.STORAGE_KEYS.SYNC_STATE);
      return stateJson ? JSON.parse(stateJson) : {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Сохранить состояние синхронизации
   */
  async saveSyncState(state) {
    try {
      await AsyncStorage.setItem(
        CONFIG.STORAGE_KEYS.SYNC_STATE,
        JSON.stringify(state)
      );
    } catch (error) {
      console.warn('Failed to save sync state:', error);
    }
  }

  /**
   * Обновить время последней синхронизации комнаты
   */
  async updateRoomSyncTime(roomId) {
    const state = await this.getSyncState();
    state[roomId] = Date.now();
    await this.saveSyncState(state);
  }

  /**
   * Проверить, нужна ли синхронизация для комнаты
   */
  async needsSync(roomId, maxAgeMs = 60000) {
    const state = await this.getSyncState();
    const lastSync = state[roomId] || 0;
    return (Date.now() - lastSync) > maxAgeMs;
  }

  // ===========================================
  // ОЧИСТКА КЭША
  // ===========================================

  /**
   * Очистить устаревший кэш
   */
  async cleanupStaleCache() {
    try {
      console.log('🧹 Starting cache cleanup...');

      // Очистка устаревших сообщений в SQLite
      await chatMessagesDb.cleanupOldMessages(CONFIG.MESSAGES_CACHE_DAYS);
      
      // Очистка устаревших медиафайлов
      await this.cleanupStaleMedia();
      
      console.log('✅ Cache cleanup completed');
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }

  /**
   * Очистить устаревшие медиафайлы
   */
  async cleanupStaleMedia() {
    const dirs = [
      `${CONFIG.CACHE_DIR}${CONFIG.IMAGES_DIR}`,
      `${CONFIG.CACHE_DIR}${CONFIG.VOICE_DIR}`,
    ];

    const maxAgeMs = CONFIG.MEDIA_CACHE_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const dir of dirs) {
      try {
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) continue;

        const files = await FileSystem.readDirectoryAsync(dir);
        
        for (const file of files) {
          const filePath = `${dir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath, { modificationTime: true });
          
          if (fileInfo.exists && fileInfo.modificationTime) {
            const fileAge = now - (fileInfo.modificationTime * 1000);
            if (fileAge > maxAgeMs) {
              await FileSystem.deleteAsync(filePath, { idempotent: true });
              
              // Удаляем из индекса
              for (const [url, path] of this.mediaIndex) {
                if (path === filePath) {
                  this.mediaIndex.delete(url);
                  break;
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to cleanup directory ${dir}:`, e);
      }
    }
    
    await this.saveMediaIndex();
  }

  /**
   * Получить размер кэша
   */
  async getCacheSize() {
    let totalSize = 0;
    
    const dirs = [
      `${CONFIG.CACHE_DIR}${CONFIG.IMAGES_DIR}`,
      `${CONFIG.CACHE_DIR}${CONFIG.VOICE_DIR}`,
    ];

    for (const dir of dirs) {
      try {
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) continue;

        const files = await FileSystem.readDirectoryAsync(dir);
        
        for (const file of files) {
          const filePath = `${dir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath, { size: true });
          if (fileInfo.exists && fileInfo.size) {
            totalSize += fileInfo.size;
          }
        }
      } catch (e) {
        // Игнорируем ошибки
      }
    }
    
    return {
      bytes: totalSize,
      mb: (totalSize / (1024 * 1024)).toFixed(2),
      formatted: totalSize > 1024 * 1024 
        ? `${(totalSize / (1024 * 1024)).toFixed(1)} MB`
        : `${(totalSize / 1024).toFixed(1)} KB`,
    };
  }

  /**
   * Полная очистка кэша
   */
  async clearAllCache() {
    try {
      // Очистка AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const chatKeys = keys.filter(k => 
        k.startsWith('chat_cache_') || 
        k.startsWith('chat.') // Старый формат
      );
      await AsyncStorage.multiRemove(chatKeys);

      // Очистка SQLite
      await chatMessagesDb.clearAll();
      
      // Очистка файлов
      const dirs = [
        `${CONFIG.CACHE_DIR}${CONFIG.IMAGES_DIR}`,
        `${CONFIG.CACHE_DIR}${CONFIG.VOICE_DIR}`,
      ];

      for (const dir of dirs) {
        try {
          await FileSystem.deleteAsync(dir, { idempotent: true });
        } catch (e) {
          // Игнорируем ошибки удаления
        }
      }
      
      // Пересоздаем директории
      await this.ensureDirectories();
      
      // Очищаем индекс
      this.mediaIndex.clear();
      
      console.log('✅ All chat cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // ===========================================
  // АЛИАСЫ ДЛЯ СОВМЕСТИМОСТИ
  // ===========================================

  /**
   * Алиас для saveRoomMessages
   */
  async saveMessages(roomId, messages) {
    return this.saveRoomMessages(roomId, messages);
  }

  /**
   * Алиас для loadRoomMessages - возвращает только сообщения
   */
  async getMessages(roomId) {
    const cached = await this.loadRoomMessages(roomId);
    return cached?.messages || [];
  }

  /**
   * Алиас для loadRooms - возвращает только комнаты
   */
  async getRooms() {
    const cached = await this.loadRooms();
    return cached?.rooms || [];
  }

  /**
   * Кэшировать изображение
   */
  async cacheImage(url) {
    return this.cacheMedia(url, 'image');
  }

  /**
   * Кэшировать аудио
   */
  async cacheAudio(url) {
    return this.cacheMedia(url, 'voice');
  }

  /**
   * Получить кэшированный путь к изображению
   */
  async getImageCachedPath(imageUrl) {
    if (!imageUrl) return null;
    const cachedPath = await this.isMediaCached(imageUrl);
    return cachedPath || null;
  }

  /**
   * Получить кэшированный путь к аудио
   */
  async getAudioCachedPath(audioUrl) {
    return this.getCachedVoicePath(audioUrl);
  }

  /**
   * Очистить кэш конкретной комнаты
   */
  async clearRoomCache(roomId) {
    if (!roomId) return;

    try {
      // Удаляем сообщения комнаты (SQLite + legacy ключ на всякий)
      await chatMessagesDb.clearRoom(roomId);
      await AsyncStorage.removeItem(this.getMessagesKey(roomId));
      
      // Удаляем из sync state
      const state = await this.getSyncState();
      delete state[roomId];
      await this.saveSyncState(state);
      
      console.log(`🗑️ Cleared cache for room ${roomId}`);
    } catch (error) {
      console.warn('Failed to clear room cache:', error);
    }
  }
}

// Экспортируем синглтон
export const chatCacheService = new ChatCacheService();
export default chatCacheService;
