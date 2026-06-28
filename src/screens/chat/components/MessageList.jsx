import React, { useCallback, useRef, useMemo, memo, useState, useEffect } from 'react';
import { FlatList, View, Text, StyleSheet, TouchableWithoutFeedback, Animated, Easing, Platform } from 'react-native';
import { SwipeableMessageBubble } from '@entities/chat';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

const useListStyles = () => {
  const { colors, isDark } = useTheme();
  return useMemo(() => createStyles(colors, isDark), [colors, isDark]);
};

// Константы
const LOAD_MORE_THRESHOLD = 2000;
const HEADER_OFFSET = 64;
const TELEGRAM_DELETE_FADE_DURATION = 220;
const TELEGRAM_DELETE_COLLAPSE_DURATION = 300;

const getDayKey = (dateLike) => {
  const date = dateLike ? new Date(dateLike) : null;
  if (!date || Number.isNaN(date.getTime())) return 'unknown';

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const formatDateLabel = (dateLike) => {
  const date = dateLike ? new Date(dateLike) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Без даты';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return 'Сегодня';
  if (target.getTime() === yesterday.getTime()) return 'Вчера';

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const DateSeparator = memo(({ label }) => {
  const styles = useListStyles();
  return (
    <View style={styles.dateSeparatorContainer}>
      <View style={styles.dateSeparatorChip}>
        <Text style={styles.dateSeparatorText}>{label}</Text>
      </View>
    </View>
  );
});

DateSeparator.displayName = 'DateSeparator';

/**
 * Оптимизированный компонент одного сообщения
 * Мемоизирован для предотвращения лишних ре-рендеров
 */
const MessageItem = memo(({
  item,
  currentUserId,
  isSelectionMode,
  selectedMessages,
  highlightedMessageId,
  pressedMessageId,
  canDeleteMessage,
  partnerAvatar,
  roomType,
  participants,
  participantsById,
  onPress,
  onLongPress,
  onToggleSelection,
  onOpenProduct,
  onOpenStop,
  onOpenWarehouse,
  onOpenContact,
  onImagePress,
  onAvatarPress,
  onContactDriver,
  onReply,
  onReplyPress,
  onAddReaction,
  onShowReactionPicker,
  onRetryMessage,
  onCancelMessage,
  isRetrying,
  onSenderNamePress,
  activeSwipeId,
  onSwipeStart,
  onSwipeEnd,
  isDeleting,
  onDeleteAnimationEnd,
  reactionsRenderTick = 0,
}) => {
  const styles = useListStyles();
  const shouldReset = activeSwipeId !== null && activeSwipeId !== item.id;
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const [isHeightLocked, setIsHeightLocked] = useState(false);
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const scaleXAnim = useRef(new Animated.Value(1)).current;
  const scaleYAnim = useRef(new Animated.Value(1)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);
  const animationCycleRef = useRef(0);
  const deleteAnimationTriggeredRef = useRef(false);
  const wasDeletingRef = useRef(false);

  const handleLayout = useCallback((event) => {
    const nextHeight = Math.ceil(event?.nativeEvent?.layout?.height || 0);
    if (!nextHeight || nextHeight === measuredHeight) return;

    setMeasuredHeight(nextHeight);
    if (!isHeightLocked) {
      heightAnim.setValue(nextHeight);
    }
  }, [heightAnim, isHeightLocked, measuredHeight]);

  useEffect(() => {
    // Анимация "удаления" (fade + collapse) — запускается ТОЛЬКО при переходе
    // из обычного состояния в isDeleting. Анимация "восстановления" запускается
    // лишь при отмене удаления (было isDeleting -> стало false).
    // Раньше восстановление запускалось при каждом монтировании элемента,
    // что давало 6 параллельных Animated.timing на каждое сообщение при
    // первом открытии чата — это и создавало заметный рывок.
    if (isDeleting) {
      if (deleteAnimationTriggeredRef.current) return;

      animationCycleRef.current += 1;
      const animationCycle = animationCycleRef.current;
      deleteAnimationTriggeredRef.current = true;
      wasDeletingRef.current = true;
      setIsHeightLocked(true);
      animationRef.current?.stop?.();
      animationRef.current = Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: TELEGRAM_DELETE_FADE_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleXAnim, {
          toValue: 0.97,
          duration: TELEGRAM_DELETE_FADE_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleYAnim, {
          toValue: 0.86,
          duration: TELEGRAM_DELETE_FADE_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateXAnim, {
          toValue: 10,
          duration: TELEGRAM_DELETE_FADE_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: -6,
          duration: TELEGRAM_DELETE_FADE_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heightAnim, {
          toValue: 0,
          duration: TELEGRAM_DELETE_COLLAPSE_DURATION,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
      ], {
        stopTogether: false,
      });
      if (!measuredHeight) {
        heightAnim.setValue(1);
      }
      animationRef.current.start(({ finished }) => {
        if (
          finished &&
          animationCycleRef.current === animationCycle &&
          deleteAnimationTriggeredRef.current
        ) {
          onDeleteAnimationEnd?.(item.id);
        }
      });
      return;
    }

    // Мы НЕ в состоянии удаления.
    deleteAnimationTriggeredRef.current = false;

    // На первом монтировании ничего анимировать не нужно — значения уже
    // инициализированы в "нормальном" состоянии (opacity=1, scale=1, translate=0).
    // Высоту проставит handleLayout. Запускаем восстановление ТОЛЬКО если
    // прежде было удаление (т.е. это отмена удаления).
    if (!wasDeletingRef.current) {
      return;
    }

    wasDeletingRef.current = false;
    animationCycleRef.current += 1;
    setIsHeightLocked(true);
    animationRef.current?.stop?.();
    animationRef.current = Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleXAnim, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleYAnim, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateXAnim, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(heightAnim, {
        toValue: measuredHeight || 0,
        duration: 170,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]);
    animationRef.current.start(() => {
      setIsHeightLocked(false);
    });
  }, [
    isDeleting,
    item.id,
    measuredHeight,
    onDeleteAnimationEnd,
    opacityAnim,
    scaleXAnim,
    scaleYAnim,
    translateXAnim,
    translateYAnim,
    heightAnim,
  ]);

  return (
    <Animated.View
      onLayout={handleLayout}
      style={[
        styles.messageDeleteAnimation,
        isHeightLocked || isDeleting ? { height: heightAnim } : null,
        {
          overflow: isHeightLocked || isDeleting ? 'hidden' : 'visible',
        },
      ]}
    >
      <Animated.View
        style={{
          opacity: opacityAnim,
          transform: [
            { translateX: translateXAnim },
            { translateY: translateYAnim },
            { scaleX: scaleXAnim },
            { scaleY: scaleYAnim },
          ],
        }}
      >
        <SwipeableMessageBubble
          message={item}
          currentUserId={currentUserId}
          onOpenProduct={onOpenProduct}
          onOpenStop={onOpenStop}
          onOpenWarehouse={onOpenWarehouse}
          onOpenContact={onOpenContact}
          onImagePress={onImagePress}
          incomingAvatarUri={partnerAvatar}
          isSelectionMode={isSelectionMode}
          isSelected={selectedMessages.has(item.id)}
          isHighlighted={highlightedMessageId === item.id}
          isPressed={pressedMessageId === item.id}
          isContextMenuActive={false}
          hasContextMenu={false}
          canDelete={canDeleteMessage(item)}
          onToggleSelection={onToggleSelection}
          onPress={onPress}
          onLongPress={onLongPress}
          onRetryMessage={onRetryMessage}
          onCancelMessage={onCancelMessage}
          isRetrying={isRetrying}
          onAvatarPress={onAvatarPress}
          onContactDriver={onContactDriver}
          onReply={onReply}
          onReplyPress={onReplyPress}
          onAddReaction={onAddReaction}
          onShowReactionPicker={onShowReactionPicker}
          roomType={roomType}
          participants={participants}
          participantsById={participantsById}
          onSenderNamePress={onSenderNamePress}
          onSwipeStart={onSwipeStart}
          onSwipeEnd={onSwipeEnd}
          shouldReset={shouldReset}
          reactionsRenderTick={reactionsRenderTick}
        />
      </Animated.View>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения для оптимизации
  // Рендерим только если изменились критические пропсы
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item._reactionsUpdated === nextProps.item._reactionsUpdated &&
    prevProps.item._pollUpdated === nextProps.item._pollUpdated &&
    prevProps.isSelectionMode === nextProps.isSelectionMode &&
    prevProps.selectedMessages.has(prevProps.item.id) === nextProps.selectedMessages.has(nextProps.item.id) &&
    prevProps.highlightedMessageId === nextProps.highlightedMessageId &&
    prevProps.pressedMessageId === nextProps.pressedMessageId &&
    prevProps.isRetrying === nextProps.isRetrying &&
    prevProps.item.status === nextProps.item.status &&
    prevProps.activeSwipeId === nextProps.activeSwipeId &&
    prevProps.isDeleting === nextProps.isDeleting &&
    prevProps.reactionsRenderTick === nextProps.reactionsRenderTick
  );
});

MessageItem.displayName = 'MessageItem';

/**
 * Оптимизированный список сообщений
 */
export const MessageList = memo(({
  messages,
  loading,
  hasMore,
  currentUserId,
  isSelectionMode,
  selectedMessages,
  highlightedMessageId,
  pressedMessageId,
  retryingMessages,
  deletingMessageIds = new Set(),
  hiddenMessageIds = new Set(),
  canDeleteMessage,
  partnerAvatar,
  roomType,
  participants,
  participantsById,
  animatedPaddingTop,
  onLoadMore,
  onScroll,
  onScrollToIndexFailed,
  onPress,
  onLongPress,
  onToggleSelection,
  onOpenProduct,
  onOpenStop,
  onOpenWarehouse,
  onOpenContact,
  onImagePress,
  onAvatarPress,
  onContactDriver,
  onReply,
  onReplyPress,
  onAddReaction,
  onShowReactionPicker,
  onRetryMessage,
  onCancelMessage,
  onSenderNamePress,
  onDismissKeyboard,
  flatListRef,
  onDeleteAnimationEnd,
  reactionsRenderTick = 0,
}) => {
  const styles = useListStyles();
  const isLoadingMoreRef = useRef(false);
  const [activeSwipeId, setActiveSwipeId] = useState(null);
  const visibleMessages = useMemo(
    () => messages.filter((message) => !hiddenMessageIds.has(message.id)),
    [messages, hiddenMessageIds]
  );
  const listItems = useMemo(() => {
    const items = [];

    visibleMessages.forEach((message, index) => {
      const messageId = message?.id ?? message?.temporaryId ?? index;
      const currentDayKey = getDayKey(message?.createdAt);
      const nextMessage = visibleMessages[index + 1];
      const nextDayKey = getDayKey(nextMessage?.createdAt);

      items.push({
        type: 'message',
        key: `message-${messageId}`,
        message,
      });

      if (!nextMessage || currentDayKey !== nextDayKey) {
        items.push({
          type: 'date-separator',
          key: `date-${currentDayKey}-${messageId}`,
          label: formatDateLabel(message?.createdAt),
        });
      }
    });

    return items;
  }, [visibleMessages]);

  // Обработчик начала свайпа
  const handleSwipeStart = useCallback((messageId) => {
    setActiveSwipeId(messageId);
  }, []);

  // Обработчик завершения свайпа
  const handleSwipeEnd = useCallback((messageId) => {
    setActiveSwipeId((currentId) => {
      // Сбрасываем только если это тот же элемент
      return currentId === messageId ? null : currentId;
    });
  }, []);

  // Отслеживаем, инициировано ли движение списка реальным касанием пользователя.
  // На MIUI (Xiaomi) inverted-список переанкеривается при отложенных обновлениях
  // данных (markAsRead/fetchRoom/fetchMessages) и сообщает это как scroll-drag,
  // из-за чего клавиатура закрывалась через пару секунд после открытия.
  const userDraggingRef = useRef(false);

  const handleTouchStart = useCallback(() => {
    userDraggingRef.current = true;
  }, []);

  const handleTouchEnd = useCallback(() => {
    userDraggingRef.current = false;
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    if (userDraggingRef.current) {
      onDismissKeyboard?.();
    }
  }, [onDismissKeyboard]);
  
  // Стабильный стиль контента списка
  const listContentStyle = useMemo(() => [
    styles.listContent,
    { 
      paddingTop: animatedPaddingTop, 
      paddingBottom: HEADER_OFFSET 
    }
  ], [animatedPaddingTop]);
  
  // Проверка необходимости подгрузки
  const checkAndLoadMore = useCallback((event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const maxOffset = contentSize.height - layoutMeasurement.height;
    const distanceToTop = maxOffset - contentOffset.y;
    
    if (distanceToTop < LOAD_MORE_THRESHOLD && hasMore && !isLoadingMoreRef.current) {
      isLoadingMoreRef.current = true;
      onLoadMore?.();
      setTimeout(() => {
        isLoadingMoreRef.current = false;
      }, 1000);
    }
  }, [hasMore, onLoadMore]);
  
  // Рендер элемента списка
  const renderItem = useCallback(({item}) => {
    if (item.type === 'date-separator') {
      return <DateSeparator label={item.label} />;
    }

    const message = item.message;
    const isRetrying = message.temporaryId ? retryingMessages.has(message.temporaryId) : false;
    
    return (
      <MessageItem
        item={message}
        currentUserId={currentUserId}
        isSelectionMode={isSelectionMode}
        selectedMessages={selectedMessages}
        highlightedMessageId={highlightedMessageId}
        pressedMessageId={pressedMessageId}
        canDeleteMessage={canDeleteMessage}
        partnerAvatar={partnerAvatar}
        roomType={roomType}
        participants={participants}
        participantsById={participantsById}
        onPress={() => onPress?.(message.id)}
        onLongPress={(position) => onLongPress?.(message.id, position)}
        onToggleSelection={() => onToggleSelection?.(message.id)}
        onOpenProduct={onOpenProduct}
        onOpenStop={onOpenStop}
        onOpenWarehouse={onOpenWarehouse}
        onOpenContact={onOpenContact}
        onImagePress={onImagePress}
        onAvatarPress={onAvatarPress}
        onContactDriver={onContactDriver}
        onReply={() => onReply?.(message)}
        onReplyPress={() => onReplyPress?.(message)}
        onAddReaction={(emoji) => onAddReaction?.(message.id, emoji)}
        onShowReactionPicker={(position) => onShowReactionPicker?.(message.id, position)}
        onRetryMessage={() => onRetryMessage?.(message)}
        onCancelMessage={() => onCancelMessage?.(message)}
        isRetrying={isRetrying}
        onSenderNamePress={onSenderNamePress}
        activeSwipeId={activeSwipeId}
        onSwipeStart={handleSwipeStart}
        onSwipeEnd={handleSwipeEnd}
        isDeleting={deletingMessageIds.has(message.id)}
        onDeleteAnimationEnd={onDeleteAnimationEnd}
        reactionsRenderTick={reactionsRenderTick}
      />
    );
  }, [
    currentUserId,
    isSelectionMode,
    selectedMessages,
    highlightedMessageId,
    pressedMessageId,
    retryingMessages,
    canDeleteMessage,
    partnerAvatar,
    roomType,
    participants,
    participantsById,
    onPress,
    onLongPress,
    onToggleSelection,
    onOpenProduct,
    onOpenStop,
    onOpenWarehouse,
  onOpenContact,
    onImagePress,
    onAvatarPress,
    onContactDriver,
    onReply,
    onReplyPress,
    onAddReaction,
    onShowReactionPicker,
    onRetryMessage,
    onCancelMessage,
    onSenderNamePress,
    activeSwipeId,
    deletingMessageIds,
    handleSwipeStart,
    handleSwipeEnd,
    onDeleteAnimationEnd,
    reactionsRenderTick,
  ]);
  
  // Стабильный keyExtractor
  const keyExtractor = useCallback((item) => item.key, []);
  
  // extraData для контроля ре-рендеров
  const extraData = useMemo(() => ({
    isSelectionMode,
    selectedSize: selectedMessages.size,
    highlightedId: highlightedMessageId,
    pressedId: pressedMessageId,
    activeSwipeId,
    deletingCount: deletingMessageIds.size,
    hiddenCount: hiddenMessageIds.size,
    // Хэш реакций для обнаружения изменений
    reactionsHash: visibleMessages.map(m => `${m.id}:${m._reactionsUpdated || 0}`).join(','),
    pollsHash: visibleMessages.map(m => `${m.id}:${m._pollUpdated || 0}`).join(','),
    reactionsRenderTick,
    separatorCount: listItems.length - visibleMessages.length,
  }), [
    isSelectionMode,
    selectedMessages.size,
    highlightedMessageId,
    pressedMessageId,
    activeSwipeId,
    deletingMessageIds.size,
    hiddenMessageIds.size,
    visibleMessages,
    reactionsRenderTick,
    listItems.length,
  ]);
  
  if (!loading && (!visibleMessages || visibleMessages.length === 0)) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>Начните общение</Text>
      </View>
    );
  }
  
  return (
    <TouchableWithoutFeedback onPress={onDismissKeyboard}>
      <FlatList
        ref={flatListRef}
        data={listItems}
        extraData={extraData}
        inverted
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReachedThreshold={0.8}
        onEndReached={onLoadMore}
        onScroll={checkAndLoadMore}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={checkAndLoadMore}
        onMomentumScrollEnd={checkAndLoadMore}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        scrollEventThrottle={32}
        contentContainerStyle={listContentStyle}
        initialNumToRender={12}
        windowSize={9}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        legacyImplementation={false}
        // ВАЖНО: держим removeClippedSubviews=false на всех платформах.
        // При true на Android отсоединение/переподключение нативных вью
        // клипнутых ячеек при обновлении данных (markAsRead/fetchRoom через
        // несколько секунд после открытия) вызывает relayout окна, из-за
        // которого MIUI/Xiaomi сбрасывает фокус и закрывает клавиатуру.
        // На iOS true конфликтует с gesture-handler.
        removeClippedSubviews={false}
        keyboardShouldPersistTaps="handled"
        // Нативный on-drag dismiss оставляем только на iOS. На Android (особенно
        // MIUI/Xiaomi) он закрывает клавиатуру при программном переанкеривании
        // inverted-списка; закрытием по реальному жесту управляет
        // handleScrollBeginDrag с проверкой касания пользователя.
        keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
        onScrollToIndexFailed={onScrollToIndexFailed}
      />
    </TouchableWithoutFeedback>
  );
});

MessageList.displayName = 'MessageList';

const createStyles = (colors, isDark) => StyleSheet.create({
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: isDark ? colors.textSecondary : '#999',
  },
  dateSeparatorContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dateSeparatorChip: {
    backgroundColor: isDark ? 'rgba(26, 28, 36, 0.92)' : 'rgba(241, 247, 251, 0.96)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.25 : 0.08,
    shadowRadius: 1,
    elevation: 1,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: isDark ? colors.textSecondary : '#54656F',
    fontWeight: '500',
  },
  messageDeleteAnimation: {
    overflow: 'hidden',
  },
});