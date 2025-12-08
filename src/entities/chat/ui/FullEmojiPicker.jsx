import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  UIManager,
} from 'react-native';

// ============================================================================
// КОНСТАНТЫ
// ============================================================================

// Включаем LayoutAnimation для Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.5; // 50% экрана
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.9; // 90% экрана
const DRAG_THRESHOLD = 50; // Порог для закрытия/расширения
const ANIMATION_DURATION = 300; // Длительность анимации (ms)
const DRAG_AREA_HEIGHT_COLLAPSED = 100; // Область для drag в свернутом состоянии
const DRAG_AREA_HEIGHT_EXPANDED = 150; // Область для drag в развернутом состоянии

// Категории эмодзи
const EMOJI_CATEGORIES = {
  'Популярные': ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥', '💯', '✨', '🎉', '💪'],
  'Лица': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😊', '😇', '🙂', '🙃', '😉',
    '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪',
    '🤨', '🧐', '🤓', '😎', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁',
    '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
    '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓',
  ],
  'Жесты': [
    '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
    '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜',
    '👏', '🙌', '👐', '🤲', '🤝', '🙏',
  ],
  'Сердца': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕',
    '💞', '💓', '💗', '💖', '💘', '💝',
  ],
  'Символы': [
    '🔥', '✨', '💫', '⭐', '🌟', '💯', '✅', '❌', '⚠️', '❗', '❓', '💤',
    '💢', '💬', '💭',
  ],
};

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Easing функция для плавной анимации (ease-out cubic)
 */
const easeOutCubic = (progress) => {
  return 1 - Math.pow(1 - progress, 3);
};

/**
 * Определяет, должно ли окно расшириться на основе жеста
 */
const shouldExpand = (gestureState, currentHeight) => {
  const { dy, vy } = gestureState;
  const midPoint = (EXPANDED_HEIGHT + COLLAPSED_HEIGHT) / 2;

  // Быстрый свайп вверх
  if (dy < -20 && vy < -0.5) return true;

  // Потянули вверх за порог
  if (dy < -DRAG_THRESHOLD) return true;

  // Текущая высота больше середины
  if (currentHeight >= midPoint) return true;

  return false;
};

/**
 * Определяет, должно ли окно закрыться на основе жеста
 */
const shouldClose = (gestureState) => {
  const { dy, vy } = gestureState;

  // Быстрый свайп вниз
  if (dy > 20 && vy > 0.5) return true;

  // Потянули вниз за порог
  if (dy > DRAG_THRESHOLD) return true;

  return false;
};

/**
 * Вычисляет новую высоту на основе жеста
 */
const calculateNewHeight = (currentHeight, gestureState) => {
  const heightDelta = -gestureState.dy;
  const newHeight = currentHeight + heightDelta;

  // Ограничиваем высоту между минимальной и максимальной
  return Math.max(COLLAPSED_HEIGHT, Math.min(EXPANDED_HEIGHT, newHeight));
};

// ============================================================================
// КАСТОМНЫЕ ХУКИ
// ============================================================================

/**
 * Хук для управления анимацией высоты
 */
const useHeightAnimation = () => {
  const [height, setHeight] = useState(COLLAPSED_HEIGHT);
  const animationRef = useRef(null);

  const animateHeight = useCallback((startHeight, endHeight, duration = ANIMATION_DURATION) => {
    // Отменяем предыдущую анимацию
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const currentHeight = startHeight + (endHeight - startHeight) * eased;

      setHeight(currentHeight);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setHeight(endHeight);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const cancelAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const resetHeight = useCallback(() => {
    cancelAnimation();
    setHeight(COLLAPSED_HEIGHT);
  }, [cancelAnimation]);

  return { height, setHeight, animateHeight, cancelAnimation, resetHeight };
};

/**
 * Хук для управления состоянием модального окна
 */
const useModalState = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const reset = useCallback(() => {
    setIsExpanded(false);
    setIsDragging(false);
  }, []);

  return { isExpanded, setIsExpanded, isDragging, setIsDragging, reset };
};

// ============================================================================
// ОСНОВНОЙ КОМПОНЕНТ
// ============================================================================

/**
 * Компонент для выбора эмодзи из расширенного списка
 */
export const FullEmojiPicker = ({ visible, onClose, onEmojiSelect, title = 'Выберите эмодзи' }) => {
  const { height: containerHeight, setHeight, animateHeight, cancelAnimation, resetHeight } = useHeightAnimation();
  const { isExpanded, setIsExpanded, isDragging, setIsDragging, reset: resetModalState } = useModalState();

  const translateY = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // ============================================================================
  // ЭФФЕКТЫ
  // ============================================================================

  /**
   * Управление видимостью модального окна
   */
  useEffect(() => {
    if (visible) {
      // Останавливаем все анимации и сбрасываем состояние
      translateY.stopAnimation();
      overlayOpacity.stopAnimation();
      cancelAnimation();
      resetModalState();
      resetHeight();

      // Анимация появления overlay
      overlayOpacity.setValue(0);
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Анимация появления контента снизу
      translateY.setValue(COLLAPSED_HEIGHT);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start();
    } else {
      // Сброс при закрытии
      translateY.stopAnimation();
      overlayOpacity.stopAnimation();
      cancelAnimation();
      translateY.setValue(COLLAPSED_HEIGHT);
      overlayOpacity.setValue(0);
      resetModalState();
      resetHeight();
    }
  }, [visible, cancelAnimation, resetModalState, resetHeight, translateY, overlayOpacity]);

  // ============================================================================
  // ОБРАБОТЧИКИ
  // ============================================================================

  /**
   * Расширение контейнера до максимальной высоты
   */
  const expandContainer = useCallback(() => {
    setIsExpanded(true);
    setIsDragging(false);
    animateHeight(containerHeight, EXPANDED_HEIGHT);
    
    // Убеждаемся, что контейнер видим
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 8,
    }).start();
  }, [containerHeight, animateHeight, translateY]);

  /**
   * Сворачивание контейнера до минимальной высоты
   */
  const collapseContainer = useCallback(() => {
    setIsExpanded(false);
    setIsDragging(false);
    animateHeight(containerHeight, COLLAPSED_HEIGHT);
    
    // Убеждаемся, что контейнер видим
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 8,
    }).start();
  }, [containerHeight, animateHeight, translateY]);

  /**
   * Закрытие модального окна
   */
  const handleClose = useCallback(() => {
    translateY.stopAnimation();
    overlayOpacity.stopAnimation();
    cancelAnimation();

    setIsDragging(false);
    setIsExpanded(false);
    resetHeight();

    // Анимация закрытия
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: COLLAPSED_HEIGHT,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }),
    ]).start();

    // Вызываем onClose сразу
    onClose();
  }, [translateY, overlayOpacity, cancelAnimation, resetHeight, onClose]);

  /**
   * Обработчик выбора эмодзи
   */
  const handleEmojiSelect = useCallback(
    (emoji) => {
      if (onEmojiSelect) {
        onEmojiSelect(emoji);
      }
      handleClose();
    },
    [onEmojiSelect, handleClose]
  );

  // ============================================================================
  // PAN RESPONDER
  // ============================================================================

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (evt) => {
          // Проверяем, началось ли касание в области drag
          const startY = evt.nativeEvent.pageY;
          const containerTop = SCREEN_HEIGHT - containerHeight;
          const dragAreaHeight = isExpanded ? DRAG_AREA_HEIGHT_EXPANDED : DRAG_AREA_HEIGHT_COLLAPSED;
          return startY >= containerTop && startY <= containerTop + dragAreaHeight;
        },
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Активируем только при вертикальном движении
          return Math.abs(gestureState.dy) > 5;
        },
        onPanResponderGrant: () => {
          // Останавливаем все анимации
          translateY.stopAnimation();
          cancelAnimation();
          setIsDragging(true);
        },
        onPanResponderMove: (evt, gestureState) => {
          const newHeight = calculateNewHeight(containerHeight, gestureState);
          setHeight(newHeight);

          // Если тянем за пределы минимальной высоты - начинаем скрывать
          if (newHeight <= COLLAPSED_HEIGHT && gestureState.dy > 0) {
            const excess = Math.max(0, gestureState.dy - (containerHeight - COLLAPSED_HEIGHT));
            translateY.setValue(excess);
          } else {
            translateY.setValue(0);
          }
        },
        onPanResponderRelease: (evt, gestureState) => {
          setIsDragging(false);

          // Определяем действие на основе жеста
          if (shouldClose(gestureState)) {
            handleClose();
          } else if (shouldExpand(gestureState, containerHeight)) {
            expandContainer();
          } else {
            collapseContainer();
          }
        },
      }),
    [
      containerHeight,
      isExpanded,
      translateY,
      cancelAnimation,
      setHeight,
      handleClose,
      expandContainer,
      collapseContainer,
    ]
  );

  // ============================================================================
  // РЕНДЕР
  // ============================================================================

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View
          style={[
            styles.container,
            {
              height: containerHeight,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Индикатор для drag */}
          <View style={styles.dragHandle} />

          {/* Заголовок */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Список эмодзи по категориям */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
              <EmojiCategory
                key={category}
                category={category}
                emojis={emojis}
                onEmojiSelect={handleEmojiSelect}
              />
            ))}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
// ============================================================================

/**
 * Компонент категории эмодзи
 */
const EmojiCategory = React.memo(({ category, emojis, onEmojiSelect }) => {
  return (
    <View style={styles.categoryContainer}>
      <Text style={styles.categoryTitle}>{category}</Text>
      <View style={styles.emojiGrid}>
        {emojis.map((emoji, index) => (
          <EmojiButton key={`${emoji}-${index}`} emoji={emoji} onPress={onEmojiSelect} />
        ))}
      </View>
    </View>
  );
});

/**
 * Компонент кнопки эмодзи
 */
const EmojiButton = React.memo(({ emoji, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(emoji);
  }, [emoji, onPress]);

  return (
    <TouchableOpacity style={styles.emojiButton} onPress={handlePress} activeOpacity={0.7}>
      <Text style={styles.emoji}>{emoji}</Text>
    </TouchableOpacity>
  );
});

// ============================================================================
// СТИЛИ
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  emoji: {
    fontSize: 28,
  },
});