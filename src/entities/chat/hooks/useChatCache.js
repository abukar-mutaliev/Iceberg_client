/**
 * useChatCache - Хук для работы с кэшем чата
 * 
 * Обеспечивает:
 * - Мгновенную загрузку из локального кэша
 * - Фоновую синхронизацию с сервером
 * - Управление состоянием загрузки
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppState } from 'react-native';
import { chatCacheService } from '../lib/chatCacheService';
import {
  fetchRooms,
  fetchMessages,
  hydrateRooms,
  hydrateRoomMessages,
  receiveSocketMessage,
} from '../model/slice';

/**
 * Хук для инициализации и управления кэшем чата
 */
export const useChatCacheInit = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [cacheSize, setCacheSize] = useState(null);

  useEffect(() => {
    const init = async () => {
      await chatCacheService.initialize();
      setIsInitialized(true);
      
      // Получаем размер кэша
      const size = await chatCacheService.getCacheSize();
      setCacheSize(size);
    };

    init();

    // Периодическая очистка кэша
    const cleanupInterval = setInterval(() => {
      chatCacheService.cleanupStaleCache();
    }, 24 * 60 * 60 * 1000); // Раз в день

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  const clearCache = useCallback(async () => {
    await chatCacheService.clearAllCache();
    const size = await chatCacheService.getCacheSize();
    setCacheSize(size);
  }, []);

  const refreshCacheSize = useCallback(async () => {
    const size = await chatCacheService.getCacheSize();
    setCacheSize(size);
  }, []);

  return {
    isInitialized,
    cacheSize,
    clearCache,
    refreshCacheSize,
  };
};

/**
 * Хук для загрузки комнат с поддержкой кэша
 * Сначала показывает данные из кэша, потом синхронизирует с сервером
 */
export const useCachedRooms = () => {
  const dispatch = useDispatch();
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(true);
  const [isLoadingFromServer, setIsLoadingFromServer] = useState(false);
  const hasLoadedFromCache = useRef(false);

  // Загрузка из кэша при монтировании
  useEffect(() => {
    const loadFromCache = async () => {
      if (hasLoadedFromCache.current) return;
      hasLoadedFromCache.current = true;

      try {
        const cached = await chatCacheService.loadRooms();
        
        if (cached?.rooms && cached.rooms.length > 0) {
          // Гидратируем Redux store данными из кэша
          dispatch(hydrateRooms({ rooms: cached.rooms }));
          console.log(`✅ Loaded ${cached.rooms.length} rooms from cache`);
        }
      } catch (error) {
        console.warn('Failed to load rooms from cache:', error);
      } finally {
        setIsLoadingFromCache(false);
      }
    };

    loadFromCache();
  }, [dispatch]);

  // Синхронизация с сервером
  const syncWithServer = useCallback(async (forceRefresh = false) => {
    setIsLoadingFromServer(true);

    try {
      const result = await dispatch(fetchRooms({ page: 1, limit: 20, forceRefresh }));
      
      if (!result.error && result.payload?.rooms) {
        // Сохраняем в кэш
        await chatCacheService.saveRooms(result.payload.rooms);
      }
    } catch (error) {
      console.warn('Failed to sync rooms with server:', error);
    } finally {
      setIsLoadingFromServer(false);
    }
  }, [dispatch]);

  // Автоматическая синхронизация после загрузки из кэша
  useEffect(() => {
    if (!isLoadingFromCache) {
      syncWithServer();
    }
  }, [isLoadingFromCache, syncWithServer]);

  return {
    isLoadingFromCache,
    isLoadingFromServer,
    isLoading: isLoadingFromCache || isLoadingFromServer,
    syncWithServer,
  };
};

/**
 * Хук для загрузки сообщений комнаты с поддержкой кэша
 */
export const useCachedMessages = (roomId) => {
  const dispatch = useDispatch();
  const deletedRoomIds = useSelector((s) => s.chat?.deletedRoomIds || []);
  const isRoomDeleted = roomId ? deletedRoomIds.includes(roomId) : false;
  const [messages, setMessages] = useState([]);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(true);
  const [isLoadingFromServer, setIsLoadingFromServer] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(null);
  const hasLoadedFromCache = useRef(false);
  const currentRoomId = useRef(roomId);

  // Обновляем ref при изменении roomId
  useEffect(() => {
    currentRoomId.current = roomId;
    hasLoadedFromCache.current = false;
    setIsLoadingFromCache(true);
    setCacheInfo(null);
    setMessages([]);
  }, [roomId]);

  // Загрузка из кэша при монтировании или смене комнаты
  useEffect(() => {
    if (!roomId || hasLoadedFromCache.current || isRoomDeleted) return;

    const loadFromCache = async () => {
      hasLoadedFromCache.current = true;

      try {
        const cached = await chatCacheService.loadRoomMessages(roomId);
        
        if (cached?.messages && Array.isArray(cached.messages) && cached.messages.length > 0) {
          // КРИТИЧНО: Фильтруем удаленные сообщения при загрузке из кэша
          // Это предотвращает показ удаленных сообщений при повторном входе в чат
          const validMessages = cached.messages.filter(msg => {
            // Исключаем сообщения, удаленные для всех
            if (msg.isDeletedForAll === true) {
              return false;
            }
            return true;
          });
          
          if (validMessages.length > 0) {
            // Устанавливаем сообщения из кэша
            setMessages(validMessages);
            
            // Гидратируем Redux store данными из кэша только если Redux пустой
            // hydrateRoomMessages теперь сама проверяет наличие сообщений
            dispatch(hydrateRoomMessages({ 
              roomId, 
              messages: validMessages 
            }));
            
            setCacheInfo({
              count: validMessages.length,
              cachedAt: cached.cachedAt,
              isStale: cached.isStale,
            });
            
            if (__DEV__) {
              console.log(`✅ Loaded ${validMessages.length} messages from cache for room ${roomId} (filtered ${cached.messages.length - validMessages.length} deleted)`);
            }
          } else {
            // Если все сообщения были удалены, очищаем состояние
            setMessages([]);
            setIsLoadingFromCache(false);
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to load messages from cache:', error);
      } finally {
        if (currentRoomId.current === roomId) {
          setIsLoadingFromCache(false);
        }
      }
    };

    loadFromCache();
  }, [roomId, dispatch, isRoomDeleted]);

  // Синхронизация с сервером (в фоне, не блокирует UI)
  const syncWithServer = useCallback(async (options = {}) => {
    if (!roomId || isRoomDeleted) return;
    
    const { limit = 100, cursorId = null, direction = 'backward', silent = false } = options;
    
    // Если silent=true, не показываем индикатор загрузки
    if (!silent) {
      setIsLoadingFromServer(true);
    }

    try {
      const result = await dispatch(fetchMessages({ 
        roomId, 
        limit, 
        cursorId,
        direction 
      }));
      
      if (!result.error && result.payload?.messages) {
        // Обновляем время синхронизации
        await chatCacheService.updateRoomSyncTime(roomId);
      }
    } catch (error) {
      // Тихо игнорируем ошибки синхронизации
    } finally {
      if (currentRoomId.current === roomId && !silent) {
        setIsLoadingFromServer(false);
      }
    }
  }, [roomId, dispatch]);

  // Фоновая синхронизация после загрузки из кэша (тихая, без блокировки)
  useEffect(() => {
    if (isLoadingFromCache || !roomId || isRoomDeleted) return;

    let cancelled = false;
    let timer = null;

    (async () => {
      try {
        // ✅ Важно: синхронизируем не только "устаревший кэш", иначе в проде можно застрять
        // на локальных данных и не видеть последние сообщения.
        //
        // Берём throttle по sync-state, чтобы не дергать сервер слишком часто.
        // Уменьшили throttle с 15 секунд до 5 секунд для более быстрой синхронизации
        const shouldSync = await chatCacheService.needsSync(roomId, 5_000);
        if (!shouldSync || cancelled) return;

        // Небольшая задержка, чтобы сначала отрисовать кэш (мгновенный UI)
        timer = setTimeout(() => {
          if (!cancelled) {
            syncWithServer({ silent: true, limit: 100, cursorId: null, direction: 'backward' });
          }
        }, 250);
      } catch {
        // noop
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isLoadingFromCache, roomId, syncWithServer, isRoomDeleted]);

  // Добавление нового сообщения в кэш
  const addMessageToCache = useCallback(async (message) => {
    if (!roomId || !message) return;
    await chatCacheService.addMessageToCache(roomId, message);
  }, [roomId]);

  // Обновление сообщения в кэше
  const updateMessageInCache = useCallback(async (messageId, updates) => {
    if (!roomId || !messageId) return;
    await chatCacheService.updateMessageInCache(roomId, messageId, updates);
  }, [roomId]);

  // Удаление сообщения из кэша
  const removeMessageFromCache = useCallback(async (messageId) => {
    if (!roomId || !messageId) return;
    await chatCacheService.removeMessageFromCache(roomId, messageId);
  }, [roomId]);

  return {
    messages,
    isLoadingFromCache,
    isLoadingFromServer,
    isLoading: isLoadingFromCache || isLoadingFromServer,
    cacheInfo,
    syncWithServer,
    addMessageToCache,
    updateMessageInCache,
    removeMessageFromCache,
  };
};

/**
 * Хук для автоматической синхронизации при восстановлении приложения из фона
 */
export const useChatBackgroundSync = (activeRoomId = null) => {
  const dispatch = useDispatch();
  const appState = useRef(AppState.currentState);
  const activeRoomIdFromRedux = useSelector((s) => s.chat?.activeRoomId);
  
  // Используем переданный activeRoomId или из Redux
  const currentActiveRoomId = activeRoomId || activeRoomIdFromRedux;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // Если приложение возвращается из фона
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        console.log('📱 App returned from background, syncing chat...', {
          activeRoomId: currentActiveRoomId
        });
        
        // Синхронизируем комнаты
        dispatch(fetchRooms({ page: 1, limit: 20, forceRefresh: true }));
        
        // КРИТИЧНО: Синхронизируем сообщения активной комнаты если она открыта
        if (currentActiveRoomId) {
          console.log('📱 Syncing messages for active room:', currentActiveRoomId);
          // Небольшая задержка чтобы не перегружать сервер
          setTimeout(() => {
            dispatch(fetchMessages({ 
              roomId: currentActiveRoomId, 
              limit: 100 
            }));
          }, 500);
        }
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [dispatch, currentActiveRoomId]);
};

/**
 * Хук для предзагрузки медиа в видимых сообщениях
 */
export const useMediaPreload = (roomId, messages) => {
  useEffect(() => {
    if (!roomId || !messages || !Array.isArray(messages) || messages.length === 0) return;

    // Предзагружаем медиа для первых N сообщений
    const visibleMessages = messages.slice(0, 10);
    chatCacheService.queueMediaCaching(visibleMessages);
  }, [roomId, messages]);
};

export default {
  useChatCacheInit,
  useCachedRooms,
  useCachedMessages,
  useChatBackgroundSync,
  useMediaPreload,
};

