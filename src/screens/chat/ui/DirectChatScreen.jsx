import React, { useRef, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Composer } from '@entities/chat/ui/Composer/Composer';
import { ChatBackground } from '@entities/chat/ui/ChatBackground';
import { TypingIndicator } from '@entities/chat';
import ChatApi from '@entities/chat/api/chatApi';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';
import { navigationRef } from '@shared/utils/NavigationRef';
import { MessageList } from '../components/MessageList';
import { ChatModals } from '../components/ChatModals';
import { useChatActions } from '../hooks/useChatActions';
import { useChatData } from '../hooks/useChatData';
import { useChatKeyboard } from '../hooks/useChatKeyboard';
import { useChatLifecycle } from '../hooks/useChatLifecycle';
import { useChatModals } from '../hooks/useChatModals';
import { useChatNavigation } from '../hooks/useChatNavigation';
import { useChatReactions } from '../hooks/useChatReactions';
import { useChatSelection } from '../hooks/useChatSelection';

const MESSAGE_DELETE_WINDOW_HOURS = 48;

export const DirectChatScreen = ({ route, navigation }) => {
  const {
    roomId,
    productId: shareProductId,
    productInfo,
    autoSendProduct,
    userId,
  } = route.params || {};
  
  const insets = useSafeAreaInsets();
  const { showError, showWarning, showConfirm } = useCustomAlert();
  
  // ============ DATA ============
  const chatData = useChatData(roomId);
  const {
    messages,
    loading,
    hasMore,
    cursorId,
    currentUserId,
    currentUser,
    roomData,
    isRoomDeleted,
    rooms,
    isSuperAdmin,
    chatPartner,
    peerUserId,
    partnerAvatar,
    canSendMessages,
  } = chatData;
  
  const isAdmin = useMemo(() => currentUser?.role === 'ADMIN', [currentUser?.role]);
  
  // ============ STATE ============
  const [retryingMessages, setRetryingMessages] = useState(new Set());
  const [pressedMessageId, setPressedMessageId] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [animatedPaddingTop, setAnimatedPaddingTop] = useState(0);
  
  // ============ REFS ============
  const flatListRef = useRef(null);
  const isRoomDeletedRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const paddingTopAnimRef = useRef(0);
  
  // ============ HOOKS ============
  const keyboard = useChatKeyboard(insets, {
    headerOffset: 64,
    androidVerticalOffset: 84,
    androidBehavior: 'height',
    enableSamsungBehavior: true,
    enableSamsungGap: true,
  });
  const {
    composerContainerStyle,
    dismissKeyboard,
    keyboardAvoidingBehavior,
    keyboardAvoidingOffset,
  } = keyboard;
  
  const selection = useChatSelection();
  const {
    isSelectionMode,
    selectedMessages,
    setIsSelectionMode,
    clearSelection,
    toggleMessageSelection,
  } = selection;
  
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
  
  const canDeleteForAllMessage = useCallback((message) => {
    if (!message) return false;
    if (isSuperAdmin || isAdmin) return true;
    
    const isAuthor = Number(message.senderId) === Number(currentUserId);
    if (!isAuthor) return false;
    
    if (!message.createdAt) return true;
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    return messageAge <= MESSAGE_DELETE_WINDOW_HOURS * 3600 * 1000;
  }, [isSuperAdmin, isAdmin, currentUserId]);
  
  const actions = useChatActions({
    roomId,
    currentUserId,
    messages,
    isSuperAdmin,
    isAdmin,
    canDeleteForAll: canDeleteForAllMessage,
    showError,
    showWarning,
    showConfirm,
    navigation,
  });
  
  const reactions = useChatReactions(actions.handleToggleReaction, toggleMessageSelection);
  const {
    reactionPickerVisible,
    reactionPickerPosition,
    fullEmojiPickerVisible,
    handleShowReactionPicker,
    handleCloseReactionPicker,
    handleEmojiSelect,
    handleShowFullEmojiPicker,
    handleCloseFullEmojiPicker,
    handleFullEmojiSelect,
  } = reactions;
  
  const clearSelectionAndCloseReactions = useCallback(() => {
    clearSelection();
    handleCloseReactionPicker(true);
    handleCloseFullEmojiPicker();
  }, [clearSelection, handleCloseReactionPicker, handleCloseFullEmojiPicker]);
  
  const lifecycle = useChatLifecycle({
    roomId,
    userId: peerUserId || userId || null,
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
  
  // ============ CALLBACKS ============
  const handleReplyToSelected = useCallback(() => {
    if (selectedMessages.size !== 1) return;
    
    const messageId = Array.from(selectedMessages)[0];
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setReplyTo(message);
      clearSelectionAndCloseReactions();
    }
  }, [selectedMessages, messages, clearSelectionAndCloseReactions]);
  
  const handleForwardSelectedMessages = useCallback(() => {
    if (selectedMessages.size > 0) {
      openForwardModal(null);
    }
  }, [selectedMessages, openForwardModal]);
  
  const deleteSelectedMessages = useCallback(() => {
    if (selectedMessages.size === 0) return;
    
    const selectedIds = Array.from(selectedMessages);
    const messagesToDeleteData = selectedIds
      .map(id => messages.find(m => m.id === id))
      .filter(Boolean)
      .filter(msg => actions.canDeleteMessage(msg));
    
    if (messagesToDeleteData.length === 0) {
      showWarning('Удаление', 'Нет сообщений, которые можно удалить');
      return;
    }
    
    openDeleteMessageModal(messagesToDeleteData);
  }, [selectedMessages, messages, actions, showWarning, openDeleteMessageModal]);
  
  useChatNavigation({
    navigation,
    route,
    isSelectionMode,
    selectedMessages,
    messages,
    canSendMessages,
    canDeleteMessage: actions.canDeleteMessage,
    clearSelection: clearSelectionAndCloseReactions,
    onReply: handleReplyToSelected,
    onCopy: () => {
      actions.handleCopyMessages(Array.from(selectedMessages));
      clearSelectionAndCloseReactions();
    },
    onForward: handleForwardSelectedMessages,
    onDelete: deleteSelectedMessages,
    isSuperAdmin,
    isAdmin,
  });
  
  const handleForwardMessage = useCallback(async (roomIds) => {
    const messageIds = selectedMessages.size > 0
      ? Array.from(selectedMessages)
      : messageToForward ? [messageToForward.id] : [];
    
    if (messageIds.length === 0) return;
    
    const success = await actions.handleForwardMessage(messageIds, roomIds);
    if (success) {
      clearSelectionAndCloseReactions();
      closeForwardModal();
      
      if (roomIds.length === 1) {
        const targetRoomId = roomIds[0];
        const targetRoom = rooms.find(r => r.id === targetRoomId);
        
        if (targetRoom) {
          navigation.navigate('ChatRoom', {
            roomId: targetRoomId,
            roomData: targetRoom,
          });
        }
      }
    }
  }, [selectedMessages, messageToForward, rooms, navigation, actions, clearSelectionAndCloseReactions, closeForwardModal]);
  
  const handleDeleteSelectedMessages = useCallback(async (forAll) => {
    const success = await actions.handleDeleteMessages(messagesToDelete, forAll);
    if (success) {
      closeDeleteMessageModal();
      clearSelectionAndCloseReactions();
    }
  }, [messagesToDelete, actions, clearSelectionAndCloseReactions, closeDeleteMessageModal]);
  
  const handleReply = useCallback((message) => {
    if (canSendMessages) setReplyTo(message);
  }, [canSendMessages]);
  
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
        if (__DEV__) {
          console.log('scrollToIndex failed:', error);
        }
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
    
    const rootNav = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
    rootNav.navigate('ProductDetail', { 
      productId, 
      fromScreen: 'ChatRoom', 
      roomId 
    });
  }, [isSelectionMode, navigation, roomId]);
  
  const handleOpenStop = useCallback((stopId) => {
    if (isSelectionMode) return;
    
    const rootNav = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
    rootNav.navigate('StopDetails', { 
      stopId,
      fromScreen: 'ChatRoom',
      roomId
    });
  }, [isSelectionMode, navigation, roomId]);
  
  const handleOpenContact = useCallback((targetUserId) => {
    if (isSelectionMode) return;
    
    const rootNav = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
    rootNav.navigate('UserPublicProfile', { 
      userId: targetUserId, 
      fromScreen: 'ChatRoom', 
      roomId 
    });
  }, [isSelectionMode, navigation, roomId]);
  
  const handleOpenWarehouse = useCallback((warehouseId) => {
    if (isSelectionMode) return;
    
    const rootNav = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
    
    try {
      if (rootNav && typeof rootNav.navigate === 'function') {
        rootNav.navigate('WarehouseDetails', { 
          warehouseId,
          fromScreen: 'ChatRoom',
          roomId
        });
      } else if (navigationRef?.isReady?.()) {
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
    } catch (error) {
      console.error('❌ DirectChatScreen: Navigation error to WarehouseDetails', error);
    }
  }, [isSelectionMode, navigation, roomId]);
  
  const handleAvatarPress = useCallback(() => {
    if (!chatPartner) return;
    
    const partnerId = chatPartner?.userId ?? chatPartner?.user?.id ?? chatPartner?.id;
    if (!partnerId || partnerId === currentUserId) return;
    
    const rootNav = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
    rootNav.navigate('UserPublicProfile', {
      userId: partnerId,
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
        fromScreen: 'DirectChat',
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
            fromScreen: 'DirectChat',
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
    
    const rootNav = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
    rootNav.navigate('UserPublicProfile', { 
      userId: senderId, 
      fromScreen: 'DirectChatRoom', 
      roomId 
    });
  }, [currentUserId, navigation, roomId]);
  
  const handleDeleteChat = useCallback(() => {
    closeMenuModal();
    showConfirm(
      'Удалить чат',
      'Вы уверены, что хотите удалить этот чат? Все сообщения будут удалены безвозвратно.',
      async () => {
        try {
          isRoomDeletedRef.current = true;
          const success = await actions.handleDeleteChat();
          if (!success) {
            isRoomDeletedRef.current = false;
            return;
          }
          
          const parent = navigation.getParent();
          if (parent) {
            parent.navigate('ChatMain');
          } else if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('ChatMain');
          }
        } catch (error) {
          console.error('Ошибка при удалении чата:', error);
          showError('Ошибка', 'Не удалось удалить чат');
          isRoomDeletedRef.current = false;
        }
      }
    );
  }, [actions, navigation, closeMenuModal, showConfirm, showError]);
  
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
    return messagesToDelete.every(msg => canDeleteForAllMessage(msg));
  }, [messagesToDelete, canDeleteForAllMessage]);
  
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
            behavior={Platform.OS === 'ios' ? 'padding' : keyboardAvoidingBehavior}
            keyboardVerticalOffset={keyboardAvoidingOffset}
            style={styles.keyboardAvoid}
            enabled={true}
          >
            <View style={composerContainerStyle}>
              <Composer
                roomId={roomId}
                onTyping={() => {}}
                shareProductId={shareProductId}
                onMenuPress={handleMenuPress}
                replyTo={replyTo}
                onCancelReply={handleCancelReply}
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
        imageList={imageList}
        currentImageIndex={currentImageIndex}
        onImageViewerClose={handleImageViewerClose}
        onImageIndexChange={handleImageIndexChange}
        menuModalVisible={menuModalVisible}
        onMenuModalClose={closeMenuModal}
        onDeleteChat={handleDeleteChat}
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
});