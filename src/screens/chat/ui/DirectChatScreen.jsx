import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from 'react-redux';
import { ChatBackground } from '@entities/chat/ui/ChatBackground';
import { Composer } from '@entities/chat/ui/Composer';
import { TypingIndicator } from '@entities/chat';
import { MessageList } from '../components/MessageList';
import { ChatModals } from '../components/ChatModals';
import { useChatData } from '../hooks/useChatData';
import { useChatActions } from '../hooks/useChatActions';
import { useChatSelection } from '../hooks/useChatSelection';
import { useChatKeyboard } from '../hooks/useChatKeyboard';
import { useChatLifecycle } from '../hooks/useChatLifecycle';
import { useChatNavigation } from '../hooks/useChatNavigation';
import { useChatModals } from '../hooks/useChatModals';
import { useChatReactions } from '../hooks/useChatReactions';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';
import { selectIsProductDeleted } from '@entities/product/model/selectors';
import ChatApi from '@entities/chat/api/chatApi';
import PushNotificationService from '@shared/services/PushNotificationService';

export const DirectChatScreen = ({ route, navigation }) => {
  const {
    roomId,
    productId: shareProductId,
    productInfo,
    autoSendProduct,
    userId,
    autoFocusInput = false,
  } = route.params || {};
  
  // ============ HOOKS ============
  const store = useStore();
  const insets = useSafeAreaInsets();
  const { showError, showWarning, showConfirm } = useCustomAlert();
  
  // Данные чата
  const chatData = useChatData(roomId);
  const {
    messages,
    loading,
    hasMore,
    cursorId,
    currentUserId,
    currentUser,
    chatPartner,
    peerUserId,
    partnerAvatar,
    roomData,
    isRoomDeleted,
    rooms,
    isSuperAdmin,
    canSendMessages,
  } = chatData;
  
  // Управление клавиатурой
  const keyboard = useChatKeyboard(insets);
  const {
    keyboardVisible,
    keyboardVerticalOffset,
    composerContainerStyle,
    dismissKeyboard,
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
  
  // Действия
  const actions = useChatActions({
    roomId,
    currentUserId,
    messages,
    isSuperAdmin,
    showError,
    showWarning,
    showConfirm,
    navigation,
  });
  
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
  
  // Модальные окна
  const modals = useChatModals();
  const {
    imageViewerVisible,
    selectedImageUri,
    handleImagePress,
    handleImageViewerClose,
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
    userId: peerUserId,
    isRoomDeleted,
    isRoomDeletedRef,
    autoSendProduct,
    productInfo,
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
  });
  
  // ============ NOTIFICATION MANAGEMENT ============
  
  // Очистка push-уведомлений при открытии чата
  useEffect(() => {
    const clearNotifications = async () => {
      try {
        if (!roomId) return;
        
        // Устанавливаем активный чат для подавления будущих уведомлений
        PushNotificationService.setActiveChatRoomId(roomId);
        
        // Если есть peerUserId, устанавливаем его для подавления уведомлений от этого пользователя
        if (peerUserId) {
          PushNotificationService.setActiveChatPeerUserId(peerUserId);
        }
        
        // Очищаем существующие уведомления для этого чата
        await PushNotificationService.clearChatNotifications(roomId);
        
        // Если есть peer user, очищаем и его уведомления
        if (peerUserId) {
          await PushNotificationService.clearChatNotificationsForPeerUser(peerUserId);
        }
        
        if (__DEV__) {
          console.log('[DirectChatScreen] ✅ Уведомления очищены', {
            roomId,
            peerUserId
          });
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[DirectChatScreen] ⚠️ Ошибка при очистке уведомлений:', error?.message);
        }
      }
    };
    
    clearNotifications();
    
    // Очищаем активный чат при размонтировании
    return () => {
      PushNotificationService.setActiveChatRoomId(null);
      PushNotificationService.setActiveChatPeerUserId(null);
      
      if (__DEV__) {
        console.log('[DirectChatScreen] 🔄 Сброшен активный чат', { roomId });
      }
    };
  }, [roomId, peerUserId]);
  
  // ============ CALLBACKS ============
  
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
  
  const handleDeleteSelectedMessages = useCallback(async (forAll) => {
    const success = await actions.handleDeleteMessages(messagesToDelete, forAll);
    if (success) {
      closeDeleteMessageModal();
      clearSelection();
    }
  }, [messagesToDelete, actions, clearSelection, closeDeleteMessageModal]);
  
  const handleReply = useCallback((message) => {
    setReplyTo(message);
  }, []);
  
  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
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
    if (isSelectionMode) {
      // В режиме выбора просто выбираем сообщение
      return;
    }
    
    if (selectIsProductDeleted(store.getState(), productId)) {
      showWarning('Товар недоступен', 'Этот товар был удален');
      return;
    }
    
    const rootNav = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
    rootNav.navigate('ProductDetail', { 
      productId, 
      fromScreen: 'ChatRoom', 
      roomId 
    });
  }, [isSelectionMode, store, navigation, roomId, showWarning]);
  
  const handleOpenStop = useCallback((stopId) => {
    if (isSelectionMode) return;
    navigation.navigate('StopDetails', { stopId });
  }, [isSelectionMode, navigation]);
  
  
  const handleAvatarPress = useCallback(() => {
    if (!chatPartner) return;
    
    const userId = chatPartner?.userId ?? chatPartner?.user?.id ?? chatPartner?.id;
    if (!userId || userId === currentUserId) return;
    
    const rootNavigation = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
    (rootNavigation || navigation).navigate('UserPublicProfile', {
      userId,
      fromScreen: 'ChatRoom',
      roomId,
    });
  }, [chatPartner, currentUserId, navigation, roomId]);
  
  const handleContactDriver = useCallback(async (type, stopData) => {
    if (!stopData) return;
    
    const driverUserId = stopData.driverUserId || stopData.driver?.userId;
    const driverName = stopData.driverName || stopData.driver?.name || 'Водитель';
    
    if (!driverUserId) {
      showError('Ошибка', 'Информация о водителе недоступна');
      return;
    }
    
    const existingChat = rooms.find(room => {
      if (room.type !== 'DIRECT') return false;
      return room.participants?.some(p => {
        const pId = p?.userId ?? p?.user?.id ?? p?.id;
        return pId === driverUserId;
      });
    });
    
    if (existingChat) {
      navigation.navigate('ChatRoom', {
        roomId: existingChat.id,
        roomTitle: driverName,
        roomData: existingChat,
        userId: driverUserId,
        fromScreen: 'DirectChat'
      });
    } else {
      try {
        const formData = new FormData();
        formData.append('type', 'DIRECT');
        formData.append('title', driverName);
        formData.append('members', JSON.stringify([driverUserId]));
        
        const response = await ChatApi.createRoom(formData);
        const room = response?.data?.room || response?.data;
        
        if (room?.id) {
          navigation.navigate('ChatRoom', {
            roomId: room.id,
            roomTitle: driverName,
            roomData: room,
            userId: driverUserId,
            fromScreen: 'DirectChat'
          });
        }
      } catch (error) {
        console.error('Error creating chat with driver:', error);
        showError('Ошибка', 'Не удалось создать чат с водителем');
      }
    }
  }, [rooms, navigation, showError]);
  
  const handleSenderNamePress = useCallback((senderId) => {
    if (!senderId || senderId === currentUserId) return;
    
    const rootNavigation = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
    (rootNavigation || navigation).navigate('UserPublicProfile', {
      userId: senderId,
      fromScreen: 'DirectChatRoom',
      roomId,
    });
  }, [currentUserId, navigation, roomId]);
  
  const handleLoadMore = useCallback(() => {
    loadMoreMessages();
  }, [loadMoreMessages]);
  
  const handleScrollToIndexFailed = useCallback((info) => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
        viewPosition: 0.5,
      });
    }, 100);
  }, []);
  
  const handleDeleteChat = useCallback(() => {
    closeMenuModal();
    showConfirm(
      'Удалить чат',
      'Вы уверены, что хотите удалить этот чат? Все сообщения будут удалены безвозвратно.',
      async () => {
        isRoomDeletedRef.current = true;
        const success = await actions.handleDeleteChat();
        if (success) {
          const parent = navigation.getParent();
          if (parent) {
            parent.navigate('ChatMain');
          } else if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('ChatMain');
          }
        } else {
          isRoomDeletedRef.current = false;
        }
      }
    );
  }, [navigation, showConfirm, actions, closeMenuModal]);
  
  // ============ COMPUTED ============
  
  const systemBarStyle = useMemo(() => ({
    height: insets.bottom,
    backgroundColor: '#ffffff',
    width: '100%',
  }), [insets.bottom]);
  
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
            partnerAvatar={partnerAvatar}
            roomType={roomData?.type}
            participants={roomData?.participants}
            animatedPaddingTop={animatedPaddingTop}
            onLoadMore={handleLoadMore}
            onScrollToIndexFailed={handleScrollToIndexFailed}
            onPress={handleMessagePress}
            onLongPress={handleMessageLongPress}
            onToggleSelection={toggleMessageSelection}
            onOpenProduct={handleOpenProduct}
            onOpenStop={handleOpenStop}
            onImagePress={handleImagePress}
            onAvatarPress={handleAvatarPress}
            onContactDriver={handleContactDriver}
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={keyboardVerticalOffset}
            style={styles.keyboardAvoid}
            enabled={true}
          >
            <View style={[styles.composerContainer, composerContainerStyle]}>
              <Composer
                roomId={roomId}
                onTyping={() => {}}
                shareProductId={shareProductId}
                onMenuPress={handleMenuPress}
                replyTo={replyTo}
                onCancelReply={handleCancelReply}
                autoFocus={autoFocusInput}
              />
              <TypingIndicator roomId={roomId} />
            </View>
          </KeyboardAvoidingView>
          
          {insets.bottom > 0 && <View style={systemBarStyle} />}
        </View>
      </ChatBackground>

      <ChatModals
        imageViewerVisible={imageViewerVisible}
        selectedImageUri={selectedImageUri}
        onImageViewerClose={handleImageViewerClose}
        menuModalVisible={menuModalVisible}
        onMenuModalClose={closeMenuModal}
        onDeleteChat={handleDeleteChat}
        deleteMessageModalVisible={deleteMessageModalVisible}
        messagesToDelete={messagesToDelete}
        onDeleteMessageClose={closeDeleteMessageModal}
        onDeleteMessage={handleDeleteSelectedMessages}
        isSuperAdmin={isSuperAdmin}
        currentUserId={currentUserId}
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
});