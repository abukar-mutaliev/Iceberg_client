import React, { useMemo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectTypingActivities, selectRoomsList } from '@entities/chat/model/selectors';

const TYPING_TIMEOUT = 5000; // 5 секунд таймаут для индикатора

export const TypingIndicator = ({ roomId }) => {
  const typingActivities = useSelector((state) => selectTypingActivities(state, roomId));
  const rooms = useSelector(selectRoomsList);
  const currentUserId = useSelector((state) => state.auth?.user?.id);

  // Фильтруем активность: только актуальная (не старше 5 секунд) и не от текущего пользователя
  const activeTypingUsers = useMemo(() => {
    const now = Date.now();
    const activeUsers = [];

    Object.entries(typingActivities).forEach(([userId, activity]) => {
      // Пропускаем текущего пользователя (приводим к строкам для сравнения)
      if (String(userId) === String(currentUserId)) return;

      // Проверяем таймаут
      if (now - activity.timestamp > TYPING_TIMEOUT) return;

      activeUsers.push({
        userId,
        type: activity.type,
        timestamp: activity.timestamp
      });
    });

    return activeUsers;
  }, [typingActivities, currentUserId]);

  // Получаем информацию о пользователях из комнаты
  const typingUsersInfo = useMemo(() => {
    if (!roomId || activeTypingUsers.length === 0) return [];

    const room = rooms.find(r => r.id === roomId);
    if (!room) return [];

    return activeTypingUsers.map(user => {
      // Ищем пользователя в участниках комнаты
      let userInfo = null;

      if (room.participants) {
        const participant = room.participants.find(p =>
          (p?.userId ?? p?.user?.id ?? p?.id) === user.userId
        );

        if (participant) {
          userInfo = {
            id: user.userId,
            name: participant?.user?.name || participant?.user?.firstName || participant?.name || 'Пользователь',
            avatar: participant?.user?.avatar || participant?.avatar,
            type: user.type
          };
        }
      }

      // Если не нашли в участниках, возвращаем базовую информацию
      return userInfo || {
        id: user.userId,
        name: 'Пользователь',
        avatar: null,
        type: user.type
      };
    }).filter(Boolean);
  }, [activeTypingUsers, rooms, roomId]);

  // Если никто не печатает, не показываем индикатор
  if (typingUsersInfo.length === 0) {
    return null;
  }


  // Группируем по типу активности
  // Логируем для диагностики
  console.log('TypingIndicator: typingUsersInfo:', JSON.stringify(typingUsersInfo));
  console.log('TypingIndicator: typingActivities from Redux:', JSON.stringify(typingActivities));
  
  // Явно разделяем пользователей по типу активности
  const textTypingUsers = typingUsersInfo.filter(u => {
    // Текст: если тип явно 'text' или не определен (undefined/null)
    const isText = u.type === 'text' || u.type === undefined || u.type === null;
    console.log('Filtering text user:', { userId: u.id, type: u.type, isText, rawType: typeof u.type });
    return isText;
  });
  
  const voiceTypingUsers = typingUsersInfo.filter(u => {
    // Голос: только если тип явно 'voice'
    const isVoice = u.type === 'voice';
    console.log('Filtering voice user:', { userId: u.id, type: u.type, isVoice, rawType: typeof u.type });
    return isVoice;
  });
  
  console.log('TypingIndicator: Filtered - text:', textTypingUsers.length, 'voice:', voiceTypingUsers.length);
  console.log('TypingIndicator: Text users:', textTypingUsers.map(u => ({ id: u.id, type: u.type })));
  console.log('TypingIndicator: Voice users:', voiceTypingUsers.map(u => ({ id: u.id, type: u.type })));

  const renderTypingUsers = (users, activityType) => {
    if (users.length === 0) return null;

    return (
      <View style={styles.simpleContainer}>
        {activityType === 'voice' ? (
          <View style={styles.voiceIndicator}>
            <Ionicons name="mic" size={16} color="#666" />
          </View>
        ) : (
          <AnimatedDots />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderTypingUsers(textTypingUsers, 'text')}
      {renderTypingUsers(voiceTypingUsers, 'voice')}
    </View>
  );
};

// Компонент анимированных точек
const AnimatedDots = () => {
  const dot1Opacity = React.useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = React.useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const animateDots = () => {
      Animated.sequence([
        Animated.timing(dot1Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3Opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot1Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3Opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        // Повторяем анимацию
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

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    left: 26,
    zIndex: 10,
  },
  simpleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  voiceIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
    marginHorizontal: 1,
  },
});

export default TypingIndicator;
