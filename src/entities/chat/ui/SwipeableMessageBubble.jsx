import React, { useRef, useEffect } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { MessageBubble } from './MessageBubble';

const SWIPE_THRESHOLD = 80; // Минимальная дистанция свайпа для триггера (увеличено для предотвращения случайных срабатываний)
const MAX_TRANSLATE = 100; // Максимальное смещение при свайпе

export const SwipeableMessageBubble = ({ 
  onReply, 
  message,
  isHighlighted = false,
  isPressed = false,
  onPress,
  onAddReaction,
  onRemoveReaction,
  onSwipeStart,
  onSwipeEnd,
  shouldReset = false,
  ...props 
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const currentTranslateX = useRef(0);
  const isResetting = useRef(false);

  // Сброс анимации при shouldReset
  useEffect(() => {
    if (shouldReset && currentTranslateX.current > 0 && !isResetting.current) {
      isResetting.current = true;
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start(() => {
        currentTranslateX.current = 0;
        isResetting.current = false;
      });
    }
  }, [shouldReset, translateX]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { 
      useNativeDriver: true,
      listener: (event) => {
        const { translationX } = event.nativeEvent;
        // Сохраняем текущее значение с ограничением для использования в onHandlerStateChange
        if (translationX < 0) {
          currentTranslateX.current = 0;
        } else if (translationX > MAX_TRANSLATE) {
          currentTranslateX.current = MAX_TRANSLATE;
        } else {
          currentTranslateX.current = translationX;
        }
      }
    }
  );

  // Используем интерполяцию для ограничения диапазона визуального отображения
  const clampedTranslateX = translateX.interpolate({
    inputRange: [-100, 0, MAX_TRANSLATE, MAX_TRANSLATE + 100],
    outputRange: [0, 0, MAX_TRANSLATE, MAX_TRANSLATE],
    extrapolate: 'clamp',
  });

  const onHandlerStateChange = ({ nativeEvent }) => {
    if (nativeEvent.state === State.ACTIVE) {
      // Уведомляем родительский компонент о начале свайпа
      if (onSwipeStart) {
        onSwipeStart(message.id);
      }
    }

    if (nativeEvent.state === State.END) {
      // Используем сохраненное значение вместо nativeEvent.translationX
      const translationX = currentTranslateX.current;

      // Если свайп был достаточно длинным, вызываем onReply
      if (translationX >= SWIPE_THRESHOLD && onReply) {
        onReply(message);
      }

      // Всегда возвращаем в исходное положение
      isResetting.current = true;
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start(() => {
        currentTranslateX.current = 0;
        isResetting.current = false;
        // Уведомляем о завершении свайпа
        if (onSwipeEnd) {
          onSwipeEnd(message.id);
        }
      });
    }
  };

  // Вычисляем opacity для иконки ответа (используем исходный translateX, так как clampedTranslateX уже ограничен)
  const iconOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const iconScale = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0.5, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.replyIconContainer,
          {
            opacity: iconOpacity,
            transform: [{ scale: iconScale }],
          }
        ]}
      >
        <Ionicons name="arrow-undo" size={24} color="#007AFF" />
      </Animated.View>

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={10}
        failOffsetY={[-10, 10]}
      >
        <Animated.View 
          style={[
            styles.messageWrapper,
            {
              transform: [{ translateX: clampedTranslateX }],
            }
          ]}
        >
          <MessageBubble 
            message={message}
            onReply={onReply}
            isHighlighted={isHighlighted}
            isPressed={isPressed}
            onPress={onPress}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
            {...props} 
          />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  messageWrapper: {
    zIndex: 2,
  },
  replyIconContainer: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
});

