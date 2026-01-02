import React from 'react';
import { Modal, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { ImageViewerModal } from '@shared/ui/ImageViewerModal/ui/ImageViewerModal';
import { ForwardMessageModal } from '@entities/chat/ui/ForwardMessageModal';
import { ReactionPicker } from '@entities/chat/ui/ReactionPicker';
import { FullEmojiPicker } from '@entities/chat/ui/FullEmojiPicker';

/**
 * Компонент, объединяющий все модальные окна чата
 */
export const ChatModals = ({
  // Image Viewer
  imageViewerVisible,
  selectedImageUri,
  onImageViewerClose,
  
  // Menu Modal
  menuModalVisible,
  onMenuModalClose,
  onDeleteChat,
  onLeaveGroup, // Для групповых чатов
  showLeaveGroup = false, // Показать опцию выхода из группы
  showDeleteGroup = false, // Показать опцию удаления группы
  
  // Delete Message Modal
  deleteMessageModalVisible,
  messagesToDelete,
  onDeleteMessageClose,
  onDeleteMessage,
  isSuperAdmin,
  currentUserId,
  
  // Forward Modal
  forwardModalVisible,
  onForwardModalClose,
  messageToForward,
  onForwardMessage,
  
  // Reactions
  reactionPickerVisible,
  reactionPickerPosition,
  onReactionPickerClose,
  onEmojiSelect,
  onShowFullEmojiPicker,
  fullEmojiPickerVisible,
  onFullEmojiPickerClose,
  onFullEmojiSelect,
}) => {
  return (
    <>
      {/* Image Viewer Modal */}
      <ImageViewerModal
        visible={imageViewerVisible}
        imageUri={selectedImageUri}
        onClose={onImageViewerClose}
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
        transparent
        animationType="fade"
        onRequestClose={onMenuModalClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onMenuModalClose}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modal}>
              {showLeaveGroup && onLeaveGroup && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={onLeaveGroup}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuText}>Покинуть группу</Text>
                </TouchableOpacity>
              )}
              {showDeleteGroup && onDeleteChat && (
                <>
                  {showLeaveGroup && <View style={styles.menuDivider} />}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={onDeleteChat}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.menuText, styles.destructive]}>
                      Удалить {showLeaveGroup ? 'группу' : 'чат'}
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
                  <Text style={[styles.menuText, styles.destructive]}>
                    Удалить чат
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
        transparent
        animationType="fade"
        onRequestClose={onDeleteMessageClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onDeleteMessageClose}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modal}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => onDeleteMessage(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.menuText}>Удалить у меня</Text>
              </TouchableOpacity>
              {(() => {
                const canDeleteForAll = isSuperAdmin || 
                  (messagesToDelete.length > 0 && messagesToDelete.every(msg => 
                    Number(msg.senderId) === Number(currentUserId)
                  ));
                
                if (!canDeleteForAll) return null;
                
                return (
                  <>
                    <View style={styles.menuDivider} />
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => onDeleteMessage(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.menuText, styles.destructive]}>
                        Удалить у всех
                      </Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    padding: 16,
  },
  modal: {
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
  menuText: {
    fontSize: 16,
    color: '#333',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  destructive: {
    color: '#ff3b30',
  },
});
