import React, { useRef } from 'react';
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
  onAddReaction,
  onRemoveReaction,
  isSelectionMode = false,
  hasContextMenu = false,
  ...props 
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  // Отключаем свайп если активен режим выбора или контекстное меню
  const isSwipeDisabled = isSelectionMode || hasContextMenu;

  if (__DEV__ && isSwipeDisabled) {
    console.log('🔄 SwipeableMessageBubble disabled:', {
      messageId: message?.id,
      isSelectionMode,
      hasContextMenu,
      isSwipeDisabled
    });
  }

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { 
      useNativeDriver: true,
      listener: (event) => {
        if (isSwipeDisabled) return;
        
        const { translationX } = event.nativeEvent;
        // Ограничиваем перемещение: только вправо и не более MAX_TRANSLATE
        if (translationX < 0) {
          translateX.setValue(0);
        } else if (translationX > MAX_TRANSLATE) {
          translateX.setValue(MAX_TRANSLATE);
        }
      }
    }
  );

  const onHandlerStateChange = ({ nativeEvent }) => {
    if (isSwipeDisabled) return;
    
    if (nativeEvent.state === State.END) {
      const { translationX } = nativeEvent;

      // Если свайп был достаточно длинным, вызываем onReply
      if (translationX >= SWIPE_THRESHOLD && onReply) {
        onReply(message);
      }

      // Возвращаем в исходное положение
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();

      lastOffset.current = 0;
    }
  };

  // Вычисляем opacity для иконки ответа
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
        enabled={!isSwipeDisabled}
      >
        <Animated.View 
          style={[
            styles.messageWrapper,
            {
              transform: [{ translateX }],
            }
          ]}
        >
          <MessageBubble 
            message={message}
            onReply={onReply}
            isHighlighted={isHighlighted}
            onAddReaction={onAddReaction}
            onRemoveReaction={onRemoveReaction}
            isSelectionMode={isSelectionMode}
            hasContextMenu={hasContextMenu}
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

