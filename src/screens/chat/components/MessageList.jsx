import React, { useCallback, useRef, useMemo, memo, useState } from 'react';
import { FlatList, View, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { SwipeableMessageBubble } from '@entities/chat';

// Константы
const LOAD_MORE_THRESHOLD = 2000;
const HEADER_OFFSET = 64;

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
  onPress,
  onLongPress,
  onToggleSelection,
  onOpenProduct,
  onOpenStop,
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
}) => {
  const shouldReset = activeSwipeId !== null && activeSwipeId !== item.id;

  return (
    <SwipeableMessageBubble
      message={item}
      currentUserId={currentUserId}
      onOpenProduct={onOpenProduct}
      onOpenStop={onOpenStop}
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
      onSenderNamePress={onSenderNamePress}
      onSwipeStart={onSwipeStart}
      onSwipeEnd={onSwipeEnd}
      shouldReset={shouldReset}
    />
  );
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения для оптимизации
  // Рендерим только если изменились критические пропсы
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item._reactionsUpdated === nextProps.item._reactionsUpdated &&
    prevProps.isSelectionMode === nextProps.isSelectionMode &&
    prevProps.selectedMessages.has(prevProps.item.id) === nextProps.selectedMessages.has(nextProps.item.id) &&
    prevProps.highlightedMessageId === nextProps.highlightedMessageId &&
    prevProps.pressedMessageId === nextProps.pressedMessageId &&
    prevProps.isRetrying === nextProps.isRetrying &&
    prevProps.item.status === nextProps.item.status &&
    prevProps.activeSwipeId === nextProps.activeSwipeId
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
  canDeleteMessage,
  partnerAvatar,
  roomType,
  participants,
  animatedPaddingTop,
  onLoadMore,
  onScroll,
  onScrollToIndexFailed,
  onPress,
  onLongPress,
  onToggleSelection,
  onOpenProduct,
  onOpenStop,
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
}) => {
  const isLoadingMoreRef = useRef(false);
  const [activeSwipeId, setActiveSwipeId] = useState(null);

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
    const isRetrying = item.temporaryId ? retryingMessages.has(item.temporaryId) : false;
    
    return (
      <MessageItem
        item={item}
        currentUserId={currentUserId}
        isSelectionMode={isSelectionMode}
        selectedMessages={selectedMessages}
        highlightedMessageId={highlightedMessageId}
        pressedMessageId={pressedMessageId}
        canDeleteMessage={canDeleteMessage}
        partnerAvatar={partnerAvatar}
        roomType={roomType}
        participants={participants}
        onPress={() => onPress?.(item.id)}
        onLongPress={(position) => onLongPress?.(item.id, position)}
        onToggleSelection={() => onToggleSelection?.(item.id)}
        onOpenProduct={onOpenProduct}
        onOpenStop={onOpenStop}
        onImagePress={onImagePress}
        onAvatarPress={onAvatarPress}
        onContactDriver={onContactDriver}
        onReply={() => onReply?.(item)}
        onReplyPress={() => onReplyPress?.(item)}
        onAddReaction={(emoji) => onAddReaction?.(item.id, emoji)}
        onShowReactionPicker={(position) => onShowReactionPicker?.(item.id, position)}
        onRetryMessage={() => onRetryMessage?.(item)}
        onCancelMessage={() => onCancelMessage?.(item)}
        isRetrying={isRetrying}
        onSenderNamePress={onSenderNamePress}
        activeSwipeId={activeSwipeId}
        onSwipeStart={handleSwipeStart}
        onSwipeEnd={handleSwipeEnd}
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
    onPress,
    onLongPress,
    onToggleSelection,
    onOpenProduct,
    onOpenStop,
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
    handleSwipeStart,
    handleSwipeEnd,
  ]);
  
  // Стабильный keyExtractor
  const keyExtractor = useCallback((item) => 
    item.temporaryId ? `temp_${item.temporaryId}` : `msg_${item.id}`,
  []);
  
  // extraData для контроля ре-рендеров
  const extraData = useMemo(() => ({
    isSelectionMode,
    selectedSize: selectedMessages.size,
    highlightedId: highlightedMessageId,
    pressedId: pressedMessageId,
    activeSwipeId,
    // Хэш реакций для обнаружения изменений
    reactionsHash: messages.map(m => `${m.id}:${m._reactionsUpdated || 0}`).join(',')
  }), [
    isSelectionMode,
    selectedMessages.size,
    highlightedMessageId,
    pressedMessageId,
    activeSwipeId,
    messages
  ]);
  
  if (!loading && (!messages || messages.length === 0)) {
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
        data={messages}
        extraData={extraData}
        inverted
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReachedThreshold={0.8}
        onEndReached={onLoadMore}
        onScroll={checkAndLoadMore}
        onScrollBeginDrag={onDismissKeyboard}
        onScrollEndDrag={checkAndLoadMore}
        onMomentumScrollEnd={checkAndLoadMore}
        scrollEventThrottle={200}
        contentContainerStyle={listContentStyle}
        initialNumToRender={10}
        windowSize={5}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={100}
        legacyImplementation={false}
        removeClippedSubviews={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollToIndexFailed={onScrollToIndexFailed}
      />
    </TouchableWithoutFeedback>
  );
});

MessageList.displayName = 'MessageList';

const styles = StyleSheet.create({
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
    color: '#999',
  },
});