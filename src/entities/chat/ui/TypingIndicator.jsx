import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectTypingActivities, selectRoomsList } from '@entities/chat/model/selectors';

// ============================================================================
// КОНСТАНТЫ
// ============================================================================
const TYPING_TIMEOUT = 20000; // 20 секунд таймаут для индикатора
const INDICATOR_HEIGHT = 10; // Высота индикатора в пикселях
const PAUSE_DELAY = 500; // Задержка перед пометкой паузы (ms)
const TYPING_TYPES = {
  TEXT: 'text',
  VOICE: 'voice',
};

// ============================================================================
// ГЛОБАЛЬНОЕ ХРАНИЛИЩЕ ДЛЯ УПРАВЛЕНИЯ ПАУЗАМИ
// ============================================================================
class PauseManager {
  constructor() {
    this.pausedUsers = new Map(); // Map<string, boolean>
    this.updateKey = 0;
    this.listeners = new Set();
  }

  setPause(roomId, userId) {
    const key = this.createKey(roomId, userId);
    this.pausedUsers.set(key, true);
    this.notifyListeners();
  }

  clearPause(roomId, userId) {
    const key = this.createKey(roomId, userId);
    const hadPause = this.pausedUsers.has(key);
    this.pausedUsers.delete(key);
    if (hadPause) {
      this.notifyListeners();
    }
  }

  hasPause(roomId, userId) {
    const key = this.createKey(roomId, userId);
    return this.pausedUsers.has(key);
  }

  clearRoomPauses(roomId, activeUserIds) {
    const roomPrefix = `${roomId}:`;
    let hasChanges = false;

    this.pausedUsers.forEach((_, key) => {
      if (key.startsWith(roomPrefix)) {
        const userId = key.replace(roomPrefix, '');
        if (!activeUserIds.has(userId)) {
          this.pausedUsers.delete(key);
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      this.notifyListeners();
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.updateKey++;
    this.listeners.forEach(listener => listener());
  }

  createKey(roomId, userId) {
    return `${roomId}:${userId}`;
  }
}

const pauseManager = new PauseManager();

// ============================================================================
// ХЕЛПЕРЫ
// ============================================================================

/**
 * Проверяет, является ли активность текущей (не истекшей)
 */
const isActivityCurrent = (timestamp, timeout = TYPING_TIMEOUT) => {
  return Date.now() - timestamp <= timeout;
};

/**
 * Извлекает информацию о пользователе из участников комнаты
 */
const getUserInfoFromParticipants = (userId, participants) => {
  if (!participants) return null;

  const participant = participants.find(p =>
    (p?.userId ?? p?.user?.id ?? p?.id) === userId
  );

  if (!participant) return null;

  return {
    id: userId,
    name: participant?.user?.name || participant?.user?.firstName || participant?.name || 'Пользователь',
    avatar: participant?.user?.avatar || participant?.avatar,
  };
};

/**
 * Определяет тип активности (text или voice)
 */
const normalizeActivityType = (type) => {
  if (String(type).toLowerCase() === TYPING_TYPES.VOICE) {
    return TYPING_TYPES.VOICE;
  }
  return TYPING_TYPES.TEXT;
};

/**
 * Группирует пользователей по типу активности
 */
const groupUsersByType = (users) => {
  return users.reduce(
    (acc, user) => {
      if (user.type === TYPING_TYPES.VOICE) {
        acc.voice.push(user);
      } else {
        acc.text.push(user);
      }
      return acc;
    },
    { text: [], voice: [] }
  );
};

// ============================================================================
// КАСТОМНЫЕ ХУКИ
// ============================================================================

/**
 * Хук для получения высоты индикатора (для поднятия сообщений)
 */
export const useTypingIndicatorHeight = (roomId) => {
  const typingActivities = useSelector((state) => selectTypingActivities(state, roomId));
  const rooms = useSelector(selectRoomsList);
  const currentUserId = useSelector((state) => state.auth?.user?.id);
  const [pauseKey, setPauseKey] = useState(0);

  useEffect(() => {
    return pauseManager.subscribe(() => {
      setPauseKey(pauseManager.updateKey);
    });
  }, []);

  return useMemo(() => {
    const activeUsers = Object.entries(typingActivities || {}).filter(([userId, activity]) => {
      if (String(userId) === String(currentUserId)) return false;
      if (!isActivityCurrent(activity.timestamp)) return false;
      if (pauseManager.hasPause(roomId, userId)) return false;
      return true;
    });

    if (activeUsers.length === 0) return 0;

    const room = rooms.find(r => r.id === roomId);
    return room ? INDICATOR_HEIGHT : 0;
  }, [typingActivities, rooms, roomId, currentUserId, pauseKey]);
};

/**
 * Хук для получения активных пользователей с их типами активности
 */
const useActiveTypingUsers = (roomId, typingActivities, currentUserId) => {
  const shownUsersRef = useRef(new Set());
  const pauseActionsRef = useRef({ toSet: [], toClear: [] });

  const activeUsers = useMemo(() => {
    const now = Date.now();
    const users = [];
    const currentUserIds = new Set();
    
    // Сбрасываем накопленные действия
    pauseActionsRef.current = { toSet: [], toClear: [] };

    Object.entries(typingActivities).forEach(([userId, activity]) => {
      if (String(userId) === String(currentUserId)) return;

      const userKey = String(userId);
      currentUserIds.add(userKey);

      if (!isActivityCurrent(activity.timestamp, TYPING_TIMEOUT)) {
        if (shownUsersRef.current.has(userKey)) {
          // Откладываем установку паузы
          pauseActionsRef.current.toSet.push(userKey);
        }
        return;
      }

      // Откладываем очистку паузы для активного пользователя
      if (pauseManager.hasPause(roomId, userKey)) {
        pauseActionsRef.current.toClear.push(userKey);
      }

      shownUsersRef.current.add(userKey);

      users.push({
        userId,
        type: normalizeActivityType(activity.type),
        timestamp: activity.timestamp,
      });
    });

    return { users, currentUserIds };
  }, [typingActivities, currentUserId, roomId]);

  // Применяем отложенные действия с паузами в useEffect
  useEffect(() => {
    const { toSet, toClear } = pauseActionsRef.current;
    
    // Устанавливаем паузы
    toSet.forEach(userKey => {
      pauseManager.setPause(roomId, userKey);
    });
    
    // Очищаем паузы
    toClear.forEach(userKey => {
      pauseManager.clearPause(roomId, userKey);
      if (__DEV__) {
        console.log('[TypingIndicator] Cleared pause for user:', userKey, 'in room:', roomId);
      }
    });
    
    // Очищаем паузы для пользователей, которых больше нет в активных
    if (activeUsers.currentUserIds.size > 0) {
      pauseManager.clearRoomPauses(roomId, activeUsers.currentUserIds);
    }
  }, [roomId, typingActivities]);

  return activeUsers.users;
};

/**
 * Хук для получения детальной информации о печатающих пользователях
 */
const useTypingUsersInfo = (roomId, activeTypingUsers, rooms) => {
  return useMemo(() => {
    if (!roomId || activeTypingUsers.length === 0) return [];

    const room = rooms.find(r => r.id === roomId);
    if (!room) return [];

    return activeTypingUsers
      .map(user => {
        const userInfo = getUserInfoFromParticipants(user.userId, room.participants);
        return userInfo
          ? { ...userInfo, type: user.type }
          : { id: user.userId, name: 'Пользователь', avatar: null, type: user.type };
      })
      .filter(Boolean);
  }, [activeTypingUsers, rooms, roomId]);
};

/**
 * Хук для фильтрации пользователей с учетом пауз
 */
const useFilteredUsers = (users, roomId) => {
  const [pauseKey, setPauseKey] = useState(0);

  useEffect(() => {
    return pauseManager.subscribe(() => {
      setPauseKey(pauseManager.updateKey);
    });
  }, []);

  return useMemo(() => {
    return users.filter(user => !pauseManager.hasPause(roomId, user.id));
  }, [users, roomId, pauseKey]);
};

/**
 * Хук для управления паузами при изменении активных пользователей
 */
const usePauseManagement = (textUsers, voiceUsers, roomId) => {
  const prevActiveUserIdsRef = useRef(new Set());
  const pauseTimeoutsRef = useRef(new Map());

  useEffect(() => {
    const currentUserIds = new Set([
      ...textUsers.map(u => String(u.id)),
      ...voiceUsers.map(u => String(u.id)),
    ]);

    // Обработка активных пользователей
    currentUserIds.forEach(userId => {
      const timeoutKey = pauseManager.createKey(roomId, userId);

      // Отменяем таймаут пометки паузы
      const existingTimeout = pauseTimeoutsRef.current.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        pauseTimeoutsRef.current.delete(timeoutKey);
        if (__DEV__) {
          console.log('[TypingIndicator] Cancelled pause timeout for user:', userId);
        }
      }

      // Очищаем паузу
      if (pauseManager.hasPause(roomId, userId)) {
        pauseManager.clearPause(roomId, userId);
        if (__DEV__) {
          console.log('[TypingIndicator] Cleared pause in useEffect for user:', userId, 'in room:', roomId);
        }
      }
    });

    // Обработка неактивных пользователей
    prevActiveUserIdsRef.current.forEach(userId => {
      if (!currentUserIds.has(userId)) {
        const timeoutKey = pauseManager.createKey(roomId, userId);

        // Очищаем предыдущий таймаут
        const existingTimeout = pauseTimeoutsRef.current.get(timeoutKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Устанавливаем новый таймаут для пометки паузы
        const timeoutId = setTimeout(() => {
          if (pauseTimeoutsRef.current.has(timeoutKey)) {
            pauseManager.setPause(roomId, userId);
            if (__DEV__) {
              console.log('[TypingIndicator] Marked pause for user:', userId, 'in room:', roomId);
            }
          }
          pauseTimeoutsRef.current.delete(timeoutKey);
        }, PAUSE_DELAY);

        pauseTimeoutsRef.current.set(timeoutKey, timeoutId);
      }
    });

    prevActiveUserIdsRef.current = new Set(currentUserIds);

    return () => {
      pauseTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      pauseTimeoutsRef.current.clear();
    };
  }, [textUsers, voiceUsers, roomId]);
};

/**
 * Хук для анимации появления/исчезновения индикатора
 */
const useIndicatorAnimation = (hasActiveUsers) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasActiveUsers) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [hasActiveUsers, slideAnim]);

  return slideAnim;
};

// ============================================================================
// АНИМИРОВАННЫЕ КОМПОНЕНТЫ
// ============================================================================

/**
 * Компонент анимированных точек
 */
const AnimatedDots = () => {
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDots = () => {
      Animated.sequence([
        Animated.timing(dot1Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot1Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(animateDots, 500);
      });
    };

    animateDots();
  }, [dot1Opacity, dot2Opacity, dot3Opacity]);

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
      <Animated.View style={[styles.dot, { opacity: dot2Opacity }]} />
      <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
    </View>
  );
};

/**
 * Компонент анимированного микрофона
 */
const AnimatedMicrophone = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animateMicrophone = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.6, duration: 600, useNativeDriver: true }),
        ]),
      ]).start(() => {
        setTimeout(animateMicrophone, 0);
      });
    };

    animateMicrophone();
  }, [pulseAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.microphoneContainer,
        {
          transform: [{ scale: pulseAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Ionicons name="mic" size={18} color="#666" />
    </Animated.View>
  );
};

/**
 * Рендерит индикатор для конкретного типа активности
 */
const TypingActivityIndicator = ({ users, activityType }) => {
  if (users.length === 0) return null;

  return (
    <View style={styles.simpleContainer}>
      {activityType === TYPING_TYPES.VOICE ? <AnimatedMicrophone /> : <AnimatedDots />}
    </View>
  );
};

// ============================================================================
// ОСНОВНОЙ КОМПОНЕНТ
// ============================================================================

export const TypingIndicator = ({ roomId }) => {
  const typingActivities = useSelector((state) => selectTypingActivities(state, roomId));
  const rooms = useSelector(selectRoomsList);
  const currentUserId = useSelector((state) => state.auth?.user?.id);

  // Получение активных пользователей
  const activeTypingUsers = useActiveTypingUsers(roomId, typingActivities, currentUserId);

  // Получение детальной информации о пользователях
  const typingUsersInfo = useTypingUsersInfo(roomId, activeTypingUsers, rooms);

  // Группировка по типу активности
  const { text: textTypingUsers, voice: voiceTypingUsers } = useMemo(
    () => groupUsersByType(typingUsersInfo),
    [typingUsersInfo]
  );

  // Фильтрация пользователей с паузами
  const filteredTextUsers = useFilteredUsers(textTypingUsers, roomId);
  const filteredVoiceUsers = useFilteredUsers(voiceTypingUsers, roomId);

  // Управление паузами
  usePauseManagement(textTypingUsers, voiceTypingUsers, roomId);

  // Анимация
  const hasActiveUsers = filteredTextUsers.length > 0 || filteredVoiceUsers.length > 0;
  const slideAnim = useIndicatorAnimation(hasActiveUsers);

  // Debug логирование
  if (__DEV__ && typingUsersInfo.length > 0) {
    console.log('[TypingIndicator] Users:', typingUsersInfo.map(u => ({ id: u.id, type: u.type })));
    console.log('[TypingIndicator] Text users:', textTypingUsers.length, 'Voice users:', voiceTypingUsers.length);
  }

  // Ранний выход, если нет активных пользователей
  if (typingUsersInfo.length === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -15],
              }),
            },
          ],
          opacity: slideAnim,
        },
      ]}
    >
      <TypingActivityIndicator users={filteredTextUsers} activityType={TYPING_TYPES.TEXT} />
      <TypingActivityIndicator users={filteredVoiceUsers} activityType={TYPING_TYPES.VOICE} />
    </Animated.View>
  );
};

// ============================================================================
// СТИЛИ
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  simpleContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  microphoneContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 14,
    backgroundColor: 'rgba(102, 102, 102, 0.15)',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#666',
    marginHorizontal: 1.5,
  },
});

export default TypingIndicator;