import React from 'react';
import { View, Modal, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ImageViewerModal } from '@shared/ui/ImageViewerModal/ui/ImageViewerModal';
import { ForwardMessageModal, ReactionPicker, FullEmojiPicker } from '@entities/chat';

export const ChatModals = ({
  // Image Viewer
  imageViewerVisible,
  selectedImageUri,
  imageList = [],
  currentImageIndex = 0,
  onImageViewerClose,
  onImageIndexChange,
  
  // Menu Modal
  menuModalVisible,
  onMenuModalClose,
  onDeleteChat,
  onLeaveGroup,
  showLeaveGroup = false,
  showDeleteGroup = false,
  roomType, // 'GROUP', 'BROADCAST', или undefined для прямых чатов
  
  // Delete Message Modal
  deleteMessageModalVisible,
  messagesToDelete,
  onDeleteMessageClose,
  onDeleteMessage,
  isSuperAdmin,
  currentUserId,
  canDeleteForAll,
  
  // Forward Modal
  forwardModalVisible,
  onForwardModalClose,
  messageToForward,
  onForwardMessage,
  
  // Reaction Picker
  reactionPickerVisible,
  reactionPickerPosition,
  onReactionPickerClose,
  onEmojiSelect,
  onShowFullEmojiPicker,
  
  // Full Emoji Picker
  fullEmojiPickerVisible,
  onFullEmojiPickerClose,
  onFullEmojiSelect,
}) => {
  // Проверяем, можно ли удалять у всех
  const canDeleteForAllResolved = typeof canDeleteForAll === 'boolean'
    ? canDeleteForAll
    : (isSuperAdmin || 
      (messagesToDelete && messagesToDelete.length > 0 && messagesToDelete.every(msg => {
        const messageSenderId = msg.senderId ? Number(msg.senderId) : null;
        const normalizedCurrentUserId = currentUserId ? Number(currentUserId) : null;
        return messageSenderId === normalizedCurrentUserId;
      })));

  // Определяем тексты для меню в зависимости от типа комнаты
  const getLeaveText = () => {
    if (roomType === 'BROADCAST') return 'Покинуть канал';
    return 'Покинуть группу';
  };

  const getDeleteText = () => {
    if (roomType === 'BROADCAST') return 'Удалить канал';
    if (roomType === 'GROUP') return 'Удалить группу';
    return 'Удалить чат';
  };

  return (
    <>
      {/* Image Viewer */}
      <ImageViewerModal
        visible={imageViewerVisible}
        imageUri={selectedImageUri}
        imageList={imageList}
        initialIndex={currentImageIndex}
        onClose={onImageViewerClose}
        onIndexChange={onImageIndexChange}
      />

      {/* Forward Message Modal */}
      <ForwardMessageModal
        visible={forwardModalVisible}
        onClose={onForwardModalClose}
        onForward={onForwardMessage}
        message={messageToForward}
      />

      {/* Reaction Picker */}
      <ReactionPicker
        visible={reactionPickerVisible}
        onClose={onReactionPickerClose}
        onEmojiSelect={onEmojiSelect}
        onShowMoreEmojis={onShowFullEmojiPicker}
        position={reactionPickerPosition}
      />

      {/* Full Emoji Picker */}
      <FullEmojiPicker
        visible={fullEmojiPickerVisible}
        onClose={onFullEmojiPickerClose}
        onEmojiSelect={onFullEmojiSelect}
      />

      {/* Menu Modal */}
      <Modal
        visible={menuModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={onMenuModalClose}
      >
        <TouchableOpacity
          style={styles.menuModalOverlay}
          activeOpacity={1}
          onPress={onMenuModalClose}
        >
          <View style={styles.menuModalContainer}>
            <View style={styles.menuModal}>
              {showLeaveGroup && onLeaveGroup && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={onLeaveGroup}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuItemText}>
                    {getLeaveText()}
                  </Text>
                </TouchableOpacity>
              )}
              {showDeleteGroup && onDeleteChat && (
                <>
                  {showLeaveGroup && onLeaveGroup && <View style={styles.menuDivider} />}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={onDeleteChat}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.menuItemText, styles.destructiveText]}>
                      {getDeleteText()}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              {!showLeaveGroup && !showDeleteGroup && onDeleteChat && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={onDeleteChat}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.menuItemText, styles.destructiveText]}>
                    {getDeleteText()}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Message Modal */}
      <Modal
        visible={deleteMessageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={onDeleteMessageClose}
      >
        <TouchableOpacity
          style={styles.menuModalOverlay}
          activeOpacity={1}
          onPress={onDeleteMessageClose}
        >
          <View style={styles.menuModalContainer}>
            <View style={styles.menuModal}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => onDeleteMessage && onDeleteMessage(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.menuItemText}>
                  Удалить у меня
                </Text>
              </TouchableOpacity>
              {canDeleteForAllResolved && (
                <>
                  <View style={styles.menuDivider} />
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => onDeleteMessage && onDeleteMessage(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.menuItemText, styles.destructiveText]}>
                      Удалить у всех
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuModalContainer: {
    padding: 16,
  },
  menuModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  destructiveText: {
    color: '#ff3b30',
  },
});
