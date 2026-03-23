import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'react-redux';
import { ChatBackground } from '@entities/chat/ui/ChatBackground';
import { Composer } from '@entities/chat/ui/Composer/Composer';
import { TypingIndicator } from '@entities/chat';
import { Ionicons } from '@expo/vector-icons';
import { MessageList } from '../components/MessageList';
import { ChatModals } from '../components/ChatModals';
import { useGroupChatData } from '../hooks/useGroupChatData';
import { useGroupChatActions } from '../hooks/useGroupChatActions';
import { useChatSelection } from '../hooks/useChatSelection';
import { useChatKeyboard } from '../hooks/useChatKeyboard';
import { useChatLifecycle } from '../hooks/useChatLifecycle';
import { useChatNavigation } from '../hooks/useChatNavigation';
import { useChatModals } from '../hooks/useChatModals';
import { useChatReactions } from '../hooks/useChatReactions';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';
import { selectIsProductDeleted } from '@entities/product/model/selectors';
import { useChatSocketActions } from '@entities/chat/hooks/useChatSocketActions';
import PushNotificationService from '@shared/services/PushNotificationService';

export const GroupChatScreen = ({ route, navigation }) => {
  const {
    roomId,
    productId: shareProductId,
    autoFocusInput = false,
  } = route.params || {};
  
  // ============ HOOKS ============
  const store = useStore();
  const insets = useSafeAreaInsets();
  const { showError, showWarning, showConfirm } = useCustomAlert();
  const { emitActiveRoom } = useChatSocketActions();
  
  // Данные группового чата
  const chatData = useGroupChatData(roomId);
  const {
    messages,
    loading,
    hasMore,
    currentUserId,
    currentUser,
    roomData,
    isRoomDeleted,
    rooms,
    isSuperAdmin,
    isAdmin,
    canSendMessages,
    cursorId,
  } = chatData;
  
  const maxImages = useMemo(() => (isSuperAdmin || isAdmin) ? 30 : 10, [isSuperAdmin, isAdmin]);
  
  // Управление клавиатурой
  const keyboard = useChatKeyboard(insets, {
    headerOffset: 64,
    androidVerticalOffset: 84,
    enableKeyboardGap: true,
  });
  const {
    composerContainerStyle,
    dismissKeyboard,
    keyboardAvoidingBehavior,
    keyboardAvoidingOffset,
  } = keyboard;
  
  // Режим выбора
  const selection = useChatSelection();
  const {
    isSelectionMode,
    selectedMessages,
    setIsSelectionMode,
    clearSelection,
    toggleMessageSelection,
  } = selection;
  
  // ============ REFS ============
  const flatListRef = useRef(null);
  const isRoomDeletedRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const paddingTopAnimRef = useRef(0);
  
  // ============ STATE ============
  const [retryingMessages, setRetryingMessages] = useState(new Set());
  const [pressedMessageId, setPressedMessageId] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [animatedPaddingTop, setAnimatedPaddingTop] = useState(0);
  const [composerHeight, setComposerHeight] = useState(56);
  
  // Действия для групп
  const actions = useGroupChatActions({
    roomId,
    currentUserId,
    messages,
    isSuperAdmin,
    isAdmin,
    showError,
    showWarning,
    showConfirm,
    navigation,
    isRoomDeletedRef,
    emitActiveRoom,
  });
  
  // Модальные окна
  const modals = useChatModals();
  const {
    imageViewerVisible,
    selectedImageUri,
    imageList,
    currentImageIndex,
    handleImagePress,
    handleImageViewerClose,
    handleImageIndexChange,
    menuModalVisible,
    handleMenuPress,
    closeMenuModal,
    deleteMessageModalVisible,
    messagesToDelete,
    openDeleteMessageModal,
    closeDeleteMessageModal,
    forwardModalVisible,
    messageToForward,
    openForwardModal,
    closeForwardModal,
  } = modals;
  
  // Реакции
  const reactions = useChatReactions(
    actions.handleToggleReaction,
    toggleMessageSelection
  );
  const {
    reactionPickerVisible,
    reactionPickerMessageId,
    reactionPickerPosition,
    fullEmojiPickerVisible,
    handleShowReactionPicker,
    handleCloseReactionPicker,
    handleEmojiSelect,
    handleShowFullEmojiPicker,
    handleCloseFullEmojiPicker,
    handleFullEmojiSelect,
  } = reactions;
  
  // ============ LIFECYCLE ============
  const lifecycle = useChatLifecycle({
    roomId,
    userId: null, // В групповых чатах нет конкретного userId
    isRoomDeleted,
    isRoomDeletedRef,
    autoSendProduct: false,
    productInfo: null,
    messages,
    currentUserId,
    navigation,
    paddingTopAnimRef,
    setAnimatedPaddingTop,
    cursorId,
    hasMore,
    isLoadingMoreRef,
  });
  const { loadMoreMessages } = lifecycle;
  
  // ============ CALLBACKS (определяем перед useChatNavigation) ============
  
  const handleReplyToSelected = useCallback(() => {
    if (selectedMessages.size === 1) {
      const messageId = Array.from(selectedMessages)[0];
      const message = messages.find(m => m.id === messageId);
      if (message) {
        setReplyTo(message);
        clearSelection();
      }
    }
  }, [selectedMessages, messages, clearSelection]);


  const handleForwardSelectedMessages = useCallback(() => {
    if (selectedMessages.size > 0) {
      openForwardModal(null);
    }
  }, [selectedMessages, openForwardModal]);
  
  const deleteSelectedMessages = useCallback(() => {
    if (selectedMessages.size === 0) return;
    
    const messageIds = Array.from(selectedMessages);
    const messagesToDeleteData = messageIds
      .map(id => messages.find(m => m.id === id))
      .filter(Boolean)
      .filter(msg => actions.canDeleteMessage(msg));
    
    if (messagesToDeleteData.length === 0) {
      showWarning('Удаление', 'Нет сообщений, которые можно удалить');
      return;
    }
    
    openDeleteMessageModal(messagesToDeleteData);
  }, [selectedMessages, messages, actions, showWarning, openDeleteMessageModal]);
  
  // Навигация
  useChatNavigation({
    navigation,
    route,
    isSelectionMode,
    selectedMessages,
    messages,
    canSendMessages,
    canDeleteMessage: actions.canDeleteMessage,
    clearSelection,
    onReply: handleReplyToSelected,
    onCopy: () => actions.handleCopyMessages(Array.from(selectedMessages)),
    onForward: handleForwardSelectedMessages,
    onDelete: deleteSelectedMessages,
    isSuperAdmin, // Передаем напрямую для надежной проверки
    isAdmin, // Передаем напрямую для надежной проверки
  });

  // Отладочная информация для суперадмина
  useEffect(() => {
    if (__DEV__ && isSelectionMode) {
      console.log('[GroupChatScreen] Selection mode debug', {
        isSuperAdmin,
        isAdmin,
        selectedCount: selectedMessages.size,
        messagesCount: messages.length,
      });
    }
  }, [isSelectionMode, isSuperAdmin, isAdmin, selectedMessages.size, messages.length]);
  
  // ============ NOTIFICATION MANAGEMENT ============
  
  // Очистка push-уведомлений при открытии группового чата
  useEffect(() => {
    const clearNotifications = async () => {
      try {
        if (!roomId) return;
        
        // Устанавливаем активный чат для подавления будущих уведомлений
        PushNotificationService.setActiveChatRoomId(roomId);
        
        // Очищаем существующие уведомления для этого чата
        await PushNotificationService.clearChatNotifications(roomId);
        
        if (__DEV__) {
          console.log('[GroupChatScreen] ✅ Уведомления очищены', { roomId });
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[GroupChatScreen] ⚠️ Ошибка при очистке уведомлений:', error?.message);
        }
      }
    };
    
    clearNotifications();
    
    // Очищаем активный чат при размонтировании
    return () => {
      PushNotificationService.setActiveChatRoomId(null);
      
      if (__DEV__) {
        console.log('[GroupChatScreen] 🔄 Сброшен активный чат', { roomId });
      }
    };
  }, [roomId]);
  
  // ============ ADDITIONAL CALLBACKS ============

  const handleForwardMessage = useCallback(async (roomIds) => {
    const messageIds = selectedMessages.size > 0 
      ? Array.from(selectedMessages)
      : messageToForward ? [messageToForward.id] : [];
    
    if (messageIds.length === 0) return;
    
    const success = await actions.handleForwardMessage(messageIds, roomIds);
    
    if (success) {
      clearSelection();
      closeForwardModal();
      
      if (roomIds.length === 1) {
        const targetRoomId = roomIds[0];
        const targetRoom = rooms.find(r => r.id === targetRoomId);
        
        if (targetRoom) {
          navigation.navigate('ChatRoom', {
            roomId: targetRoomId,
            roomData: targetRoom
          });
        }
      }
    }
  }, [selectedMessages, messageToForward, rooms, navigation, actions, clearSelection, closeForwardModal]);
  
  const handleDeleteSelectedMessages = useCallback(async (forAll) => {
    const success = await actions.handleDeleteMessages(messagesToDelete, forAll);
    if (success) {
      closeDeleteMessageModal();
      clearSelection();
    }
  }, [messagesToDelete, actions, clearSelection, closeDeleteMessageModal]);
  
  const handleReply = useCallback((message) => {
    if (canSendMessages) setReplyTo(message);
  }, [canSendMessages]);
  
  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const handleComposerLayout = useCallback((event) => {
    const nextHeight = Math.round(event?.nativeEvent?.layout?.height || 0);
    if (!nextHeight) return;
    setComposerHeight((prev) => (prev !== nextHeight ? nextHeight : prev));
  }, []);
  
  const handleReplyPress = useCallback((message) => {
    if (!message || !flatListRef.current) return;
    
    const messageIndex = messages.findIndex(m => m.id === message.id);
    if (messageIndex === -1) return;
    
    setTimeout(() => {
      try {
        flatListRef.current?.scrollToIndex({
          index: messageIndex,
          animated: true,
          viewPosition: 0.5,
        });
        
        setTimeout(() => {
          setHighlightedMessageId(message.id);
          setTimeout(() => setHighlightedMessageId(null), 2000);
        }, 400);
      } catch (error) {
        console.log('scrollToIndex failed:', error);
      }
    }, 100);
  }, [messages]);
  
  const handleMessagePress = useCallback((messageId) => {
    if (isSelectionMode) return;
    setPressedMessageId(messageId);
    setTimeout(() => setPressedMessageId(null), 150);
  }, [isSelectionMode]);
  
  const handleMessageLongPress = useCallback((messageId, position) => {
    if (!isSelectionMode) setIsSelectionMode(true);
    toggleMessageSelection(messageId);
    if (position) {
      handleShowReactionPicker(messageId, position);
    }
  }, [isSelectionMode, setIsSelectionMode, toggleMessageSelection, handleShowReactionPicker]);
  
  const handleOpenProduct = useCallback((productId) => {
    if (isSelectionMode) return;
    
    if (selectIsProductDeleted(store.getState(), productId)) {
      showWarning('Товар недоступен', 'Этот товар был удален');
      return;
    }
    
    const rootNav = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
    const params = {
      productId,
      fromScreen: 'ChatRoom',
      roomId,
    };

    // Важно: из чата открываем товар через push, чтобы не переиспользовать
    // уже существующий ProductDetail в стеке и не зациклить back-навигацию.
    if (rootNav && typeof rootNav.push === 'function') {
      rootNav.push('ProductDetail', params);
      return;
    }

    rootNav.navigate('ProductDetail', params);
  }, [isSelectionMode, store, navigation, roomId, showWarning]);
  
  const handleOpenStop = useCallback((stopId) => {
    if (isSelectionMode) return;
    // Открываем остановку в корневом AppStack (там же где ChatRoom),
    // чтобы back возвращал обратно в комнату чата.
    const rootNav = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
    rootNav.navigate('StopDetails', { 
      stopId,
      fromScreen: 'ChatRoom',
      roomId
    });
  }, [isSelectionMode, navigation, roomId]);

  const handleOpenContact = useCallback((userId) => {
    if (isSelectionMode) return;
    
    const rootNav = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
    rootNav.navigate('UserPublicProfile', { 
      userId, 
      fromScreen: 'GroupChatRoom', 
      roomId 
    });
  }, [isSelectionMode, navigation, roomId]);

  const handleOpenWarehouse = useCallback((warehouseId) => {
    if (isSelectionMode) return;
    // Открываем склад в корневом AppStack (там же где ChatRoom),
    // чтобы back возвращал обратно в комнату чата.
    const rootNav = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
    
    try {
      if (rootNav && typeof rootNav.navigate === 'function') {
        rootNav.navigate('WarehouseDetails', { 
          warehouseId,
          fromScreen: 'ChatRoom',
          roomId
        });
      } else {
        // Fallback через navigationRef
        const { navigationRef } = require('@shared/utils/NavigationRef');
        if (navigationRef?.isReady?.()) {
          navigationRef.navigate('WarehouseDetails', {
            warehouseId,
            fromScreen: 'ChatRoom',
            roomId
          });
        } else {
          navigation.navigate('WarehouseDetails', {
            warehouseId,
            fromScreen: 'ChatRoom',
            roomId
          });
        }
      }
    } catch (error) {
      console.error('❌ GroupChatScreen: Navigation error to WarehouseDetails', error);
    }
  }, [isSelectionMode, navigation, roomId]);

  const handleSenderNamePress = useCallback((senderId) => {
    if (!senderId || senderId === currentUserId) return;
    
    const rootNav = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
    rootNav.navigate('UserPublicProfile', { 
      userId: senderId, 
      fromScreen: 'GroupChatRoom', 
      roomId 
    });
  }, [currentUserId, navigation, roomId]);
  
  const handleLeaveGroup = useCallback(() => {
    closeMenuModal();
    showConfirm(
      'Покинуть группу',
      'Вы уверены, что хотите покинуть эту группу?',
      () => actions.handleLeaveGroup()
    );
  }, [actions, showConfirm, closeMenuModal]);

  const handleDeleteGroup = useCallback(() => {
    closeMenuModal();
    showConfirm(
      'Удалить группу',
      'Все сообщения будут удалены безвозвратно.',
      () => actions.handleDeleteGroup()
    );
  }, [actions, showConfirm, closeMenuModal]);
  
  const handleScrollToIndexFailed = useCallback((info) => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
        viewPosition: 0.5,
      });
    }, 100);
  }, []);
  
  // ============ COMPUTED ============
  
  const systemBarStyle = useMemo(() => ({
    height: insets.bottom,
    backgroundColor: '#ffffff',
    width: '100%',
  }), [insets.bottom]);
  
  const canDeleteForAllSelected = useMemo(() => {
    if (!messagesToDelete?.length) return false;
    return messagesToDelete.every(msg => {
      if (isSuperAdmin || isAdmin) return true;
      return Number(msg?.senderId) === Number(currentUserId);
    });
  }, [messagesToDelete, isSuperAdmin, isAdmin, currentUserId]);

  const typingIndicatorBottomOffset = useMemo(() => {
    if (Platform.OS === 'ios') {
      return Math.max(50, composerHeight + 1);
    }
    if (Platform.OS !== 'android') {
      return composerHeight + 8;
    }
    // On Android keep indicator lower to avoid overlapping the last message.
    return Math.min(44, Math.max(30, composerHeight - 20));
  }, [composerHeight]);
  
  // ============ RENDER ============
  
  return (
    <View style={styles.container}>
      <ChatBackground>
        <View style={styles.chatContent}>
          <MessageList
            messages={messages}
            loading={loading}
            hasMore={hasMore}
            currentUserId={currentUserId}
            isSelectionMode={isSelectionMode}
            selectedMessages={selectedMessages}
            highlightedMessageId={highlightedMessageId}
            pressedMessageId={pressedMessageId}
            retryingMessages={retryingMessages}
            canDeleteMessage={actions.canDeleteMessage}
            partnerAvatar={null}
            roomType={roomData?.type}
            participants={roomData?.participants}
            animatedPaddingTop={animatedPaddingTop}
            onLoadMore={loadMoreMessages}
            onScrollToIndexFailed={handleScrollToIndexFailed}
            onPress={handleMessagePress}
            onLongPress={handleMessageLongPress}
            onToggleSelection={toggleMessageSelection}
            onOpenProduct={handleOpenProduct}
            onOpenStop={handleOpenStop}
            onOpenContact={handleOpenContact}
            onOpenWarehouse={handleOpenWarehouse}
            onImagePress={(imageUri) => handleImagePress(imageUri, messages)}
            onAvatarPress={() => {}} // В групповых чатах аватар не кликабелен
            onContactDriver={() => {}} // Не используется в групповых чатах
            onReply={handleReply}
            onReplyPress={handleReplyPress}
            onAddReaction={actions.handleToggleReaction}
            onShowReactionPicker={handleShowReactionPicker}
            onRetryMessage={(msg) => actions.handleRetryMessage(msg, setRetryingMessages)}
            onCancelMessage={actions.handleCancelMessage}
            onSenderNamePress={handleSenderNamePress}
            onDismissKeyboard={dismissKeyboard}
            flatListRef={flatListRef}
          />
          
          <KeyboardAvoidingView
            behavior={keyboardAvoidingBehavior}
            keyboardVerticalOffset={keyboardAvoidingOffset}
            style={styles.keyboardAvoid}
            enabled={true}
          >
            {canSendMessages ? (
              <View style={[styles.composerContainer, composerContainerStyle]}>
                <View onLayout={handleComposerLayout}>
                  <Composer
                    roomId={roomId}
                    onTyping={() => {}}
                    shareProductId={shareProductId}
                    onMenuPress={handleMenuPress}
                    replyTo={replyTo}
                    onCancelReply={handleCancelReply}
                    autoFocus={autoFocusInput}
                    participants={roomData?.participants}
                    maxImages={maxImages}
                  />
                </View>
                <TypingIndicator roomId={roomId} bottomOffset={typingIndicatorBottomOffset} />
              </View>
            ) : (
              <View style={styles.lockedChat}>
                <View style={styles.lockedMessage}>
                  <Ionicons name="lock-closed" size={20} color="#999" />
                  <Text style={styles.lockedText}>
                    {roomData?.type === 'BROADCAST' 
                      ? 'Только администраторы могут отправлять сообщения.'
                      : 'Только администраторы могут отправлять сообщения.'}
                  </Text>
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
          
          {insets.bottom > 0 && <View style={systemBarStyle} />}
        </View>
      </ChatBackground>

      <ChatModals
        imageViewerVisible={imageViewerVisible}
        selectedImageUri={selectedImageUri}
        imageList={imageList}
        currentImageIndex={currentImageIndex}
        onImageViewerClose={handleImageViewerClose}
        onImageIndexChange={handleImageIndexChange}
        menuModalVisible={menuModalVisible}
        onMenuModalClose={closeMenuModal}
        onDeleteChat={handleDeleteGroup}
        onLeaveGroup={!isAdmin ? handleLeaveGroup : undefined}
        showLeaveGroup={!isAdmin}
        showDeleteGroup={isAdmin || isSuperAdmin}
        roomType={roomData?.type}
        deleteMessageModalVisible={deleteMessageModalVisible}
        messagesToDelete={messagesToDelete}
        onDeleteMessageClose={closeDeleteMessageModal}
        onDeleteMessage={handleDeleteSelectedMessages}
        isSuperAdmin={isSuperAdmin}
        currentUserId={currentUserId}
        canDeleteForAll={canDeleteForAllSelected}
        forwardModalVisible={forwardModalVisible}
        onForwardModalClose={closeForwardModal}
        messageToForward={messageToForward}
        onForwardMessage={handleForwardMessage}
        reactionPickerVisible={reactionPickerVisible}
        reactionPickerPosition={reactionPickerPosition}
        onReactionPickerClose={handleCloseReactionPicker}
        onEmojiSelect={handleEmojiSelect}
        onShowFullEmojiPicker={handleShowFullEmojiPicker}
        fullEmojiPickerVisible={fullEmojiPickerVisible}
        onFullEmojiPickerClose={handleCloseFullEmojiPicker}
        onFullEmojiSelect={handleFullEmojiSelect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatContent: {
    flex: 1,
  },
  keyboardAvoid: {},
  composerContainer: {
    position: 'relative',
  },
  lockedChat: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  lockedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lockedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    flex: 1,
  },
});

