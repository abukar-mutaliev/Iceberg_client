import React, { memo, useCallback, useMemo, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Contacts from 'expo-contacts';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';

// Hooks
import { useComposerState } from './hooks/useComposerState';
import { useComposerTyping } from './hooks/useComposerTyping';
import { useComposerSend } from './hooks/useComposerSend';
import { useComposerKeyboard } from './hooks/useComposerKeyboard';
import { useComposerMedia } from './hooks/useComposerMedia';

// Components
import { AttachmentPreview } from '../AttachmentPreview';
import { VoiceRecorder } from '../VoiceRecorder';
import { PollCreationModal } from '../PollCreationModal';
import { ReplyPreview } from '../ReplyPreview';
import { FullEmojiPicker } from '../FullEmojiPicker';
import { ContactPicker } from '../ContactPicker/ContactPicker';
import { PermissionInfoModal } from './components/PermissionInfoModal';
import { AttachIcon } from '@shared/ui/Icon/AttachIcon';
import { CameraIcon } from '@shared/ui/Icon/CameraIcon';

// ============ MEMOIZED COMPONENTS ============

const AttachmentMenuItem = memo(({ icon, backgroundColor, text, onPress, disabled, styles }) => (
  <TouchableOpacity style={styles.attachmentMenuItem} onPress={onPress} disabled={disabled}>
    <View style={[styles.attachmentMenuIcon, { backgroundColor }]}>
      <Ionicons name={icon} size={24} color="#fff" />
    </View>
    <Text style={styles.attachmentMenuText}>{text}</Text>
  </TouchableOpacity>
));

const ComposerModals = memo(({ 
  isRecording, 
  showAttachmentMenu, 
  showPollModal,
  showContactPicker,
  pendingAction,
  onCancelRecording,
  onSendVoice,
  onCloseAttachmentMenu,
  onDismissAttachmentMenu,
  onGalleryPress,
  onCameraPress,
  onPollPress,
  onContactPress,
  onClosePollModal,
  onCloseContactPicker,
  onCreatePoll,
  onSelectContact,
  roomId,
  disabled,
  styles,
}) => (
  <>
    {/* Voice Recording Modal */}
    <Modal
      visible={isRecording}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancelRecording}
    >
      <View style={styles.recordingModalOverlay}>
        <VoiceRecorder
          onSend={onSendVoice}
          onCancel={onCancelRecording}
          roomId={roomId}
        />
      </View>
    </Modal>

    {/* Attachment Menu Modal */}
    <Modal
      visible={showAttachmentMenu}
      transparent={true}
      animationType="fade"
      onRequestClose={onCloseAttachmentMenu}
      onDismiss={onDismissAttachmentMenu}
    >
      <TouchableOpacity
        style={styles.attachmentMenuOverlay}
        activeOpacity={1}
        onPress={onCloseAttachmentMenu}
      >
        <View style={styles.attachmentMenu}>
          <AttachmentMenuItem
            icon="images"
            backgroundColor="#2196F3"
            text="Галерея"
            onPress={onGalleryPress}
            disabled={disabled}
            styles={styles}
          />
          <AttachmentMenuItem
            icon="camera"
            backgroundColor="#E91E63"
            text="Камера"
            onPress={onCameraPress}
            disabled={disabled}
            styles={styles}
          />
          <AttachmentMenuItem
            icon="bar-chart"
            backgroundColor="#FFC107"
            text="Опрос"
            onPress={onPollPress}
            disabled={disabled}
            styles={styles}
          />
          <AttachmentMenuItem
            icon="person"
            backgroundColor="#9C27B0"
            text="Контакт"
            onPress={onContactPress}
            disabled={disabled}
            styles={styles}
          />
        </View>
      </TouchableOpacity>
    </Modal>

    {/* Poll Creation Modal */}
    <PollCreationModal
      visible={showPollModal}
      onClose={onClosePollModal}
      onSubmit={onCreatePoll}
    />

    {/* Contact Picker Modal */}
    <ContactPicker
      visible={showContactPicker}
      onClose={onCloseContactPicker}
      onSelect={onSelectContact}
    />
  </>
));

// ============ MAIN COMPONENT ============

export const Composer = memo(({
  roomId,
  onTyping,
  replyTo,
  onCancelReply,
  disabled = false,
  participantsById,
  participants,
  autoFocus = false,
  maxImages = 10,
}) => {
  const { colors, isDark } = useTheme();

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // ============ STATE ============

  const state = useComposerState(disabled);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [permissionType, setPermissionType] = useState('photos');
  const [showContactPicker, setShowContactPicker] = useState(false);
  
  const {
    text,
    setText,
    files,
    captions,
    onChangeCaption,
    onRemoveFile,
    isRecording,
    setIsRecording,
    showAttachmentMenu,
    setShowAttachmentMenu,
    showPollModal,
    setShowPollModal,
    showEmojiPicker,
    setShowEmojiPicker,
    isKeyboardVisible,
    setIsKeyboardVisible,
    pendingAction,
    setPendingAction,
    isSendingRef,
    typingTimeoutRef,
    textInputRef,
    isSwitchingToKeyboardRef,
    isSwitchingToEmojiRef,
    canSend,
    showVoiceButton,
    clearForm,
  } = state;
  
  // ============ TYPING ============
  
  const typing = useComposerTyping({
    roomId,
    onTyping,
    typingTimeoutRef,
    disabled,
  });
  
  // ============ SEND ============
  
  const send = useComposerSend({
    roomId,
    replyTo,
    onCancelReply,
    isSendingRef,
    stopTyping: typing.stopTyping,
  });
  
  // ============ KEYBOARD ============
  
  const keyboard = useComposerKeyboard({
    textInputRef,
    autoFocus,
    showEmojiPicker,
    setShowEmojiPicker,
    setIsKeyboardVisible,
    isSwitchingToKeyboardRef,
    isSwitchingToEmojiRef,
    disabled,
  });
  
  // ============ PERMISSION HANDLERS ============
  
  const handleShowPermissionModal = useCallback((type) => {
    console.log('🔔 handleShowPermissionModal вызван', { type });
    setPermissionType(type);
    setPermissionModalVisible(true);
    console.log('🔔 Модальное окно должно быть видимым сейчас');
  }, []);
  
  const handleClosePermissionModal = useCallback(() => {
    setPermissionModalVisible(false);
  }, []);

  // ============ MEDIA ============
  
  const media = useComposerMedia({
    disabled,
    setFiles: state.setFiles,
    setShowAttachmentMenu,
    setPendingAction,
    setShowPollModal,
    onShowPermissionModal: handleShowPermissionModal,
    maxImages,
  });
  
  // ============ HANDLERS ============
  
  const handleChangeText = useCallback((value) => {
    typing.handleTextChange(setText, text, value);
  }, [typing, setText, text]);
  
  const handleSend = useCallback(() => {
    send.handleSend(text, files, captions, clearForm);
  }, [send, text, files, captions, clearForm]);
  
  const handleEmojiSelect = useCallback((emoji) => {
    setText(prevText => prevText + emoji);
  }, [setText]);
  
  const handleStartRecording = useCallback(async () => {
    if (disabled) return;
    
    try {
      const currentPermission = await Audio.getPermissionsAsync();

      if (currentPermission.granted) {
        setIsRecording(true);
        return;
      }

      // Для Expo / Android getPermissionsAsync может вернуть устаревший статус.
      // Повторно синхронизируем разрешение через requestPermissionsAsync перед показом модалки.
      const permission = await Audio.requestPermissionsAsync();
      if (permission.granted) {
        setIsRecording(true);
        return;
      }

      console.log('🔔 Composer: Нет доступа к микрофону', {
        currentStatus: currentPermission.status,
        requestedStatus: permission.status,
        canAskAgain: permission.canAskAgain,
      });
      setPermissionType('microphone');
      setPermissionModalVisible(true);
    } catch (error) {
      console.error('Ошибка при проверке разрешения микрофона:', error);
    }
  }, [disabled, setIsRecording, setPermissionType, setPermissionModalVisible]);
  
  const handleCancelRecording = useCallback(() => {
    setIsRecording(false);
  }, [setIsRecording]);
  
  const handleSendVoice = useCallback(async (voiceData) => {
    setIsRecording(false);
    await send.sendVoiceMessage(voiceData);
  }, [setIsRecording, send]);
  
  const handleCreatePoll = useCallback(async (pollData) => {
    setShowPollModal(false);
    await send.sendPollMessage(pollData);
  }, [setShowPollModal, send]);
  
  const handlePollPress = useCallback(() => {
    media.handlePollPress(setShowPollModal);
  }, [media, setShowPollModal]);

  const handleContactPress = useCallback(async () => {
    setShowAttachmentMenu(false);
    
    try {
      // Проверяем разрешение ПЕРЕД открытием ContactPicker
      const { status: currentStatus } = await Contacts.getPermissionsAsync();

      if (currentStatus === 'granted') {
        // Разрешение есть - открываем ContactPicker
        setShowContactPicker(true);
      } else if (currentStatus === 'undetermined') {
        // Первый запрос - запрашиваем разрешение
        const permission = await Contacts.requestPermissionsAsync();
        if (permission.granted) {
          // Разрешение получено - открываем ContactPicker
          setShowContactPicker(true);
        } else {
          // Пользователь отказал - показываем модальное окно настроек
          console.log('🔔 Composer: Пользователь отказал от разрешения контактов');
          setPermissionType('contacts');
          setPermissionModalVisible(true);
        }
      } else {
        // Разрешение denied или restricted - показываем модальное окно настроек
        console.log('🔔 Composer: Разрешение контактов отклонено, показываем настройки');
        setPermissionType('contacts');
        setPermissionModalVisible(true);
      }
    } catch (error) {
      console.error('Ошибка при проверке разрешения контактов:', error);
    }
  }, [setShowAttachmentMenu, setShowContactPicker, setPermissionType, setPermissionModalVisible]);

  const handleSelectContact = useCallback(async (contactUser) => {
    // Закрываем пикер ПЕРЕД отправкой, чтобы избежать двойных нажатий
    setShowContactPicker(false);
    
    // Добавляем небольшую задержку для анимации закрытия модального окна
    // но отправляем сразу, чтобы не задерживать отправку
    await send.sendContactMessage(contactUser);
  }, [send]);

  const handleCloseContactPicker = useCallback(() => {
    setShowContactPicker(false);
  }, []);
  
  const handleDismissAttachmentMenu = useCallback(() => {
    if (pendingAction === 'gallery') {
      setPendingAction(null);
      media.pickImages();
    } else if (pendingAction === 'camera') {
      setPendingAction(null);
      media.takePhoto();
    } else if (pendingAction === 'poll') {
      setPendingAction(null);
      setShowPollModal(true);
    }
  }, [pendingAction, setPendingAction, media, setShowPollModal]);
  
  // ============ COMPUTED VALUES ============
  
  // Стабилизируем placeholder чтобы избежать мерцания
  const inputPlaceholder = useMemo(() => {
    return files.length > 0 ? "Подпись..." : "Сообщение";
  }, [files.length]);

  const inputStyle = useMemo(() => (
    [
      styles.input,
      files.length > 0 && styles.inputWithAttachments,
      disabled && styles.inputDisabled,
    ]
  ), [files.length, disabled]);
  
  // ============ RENDER ============
  
  return (
    <View style={styles.container}>
      {/* Attachment Preview */}
      {files.length > 0 && (
        <AttachmentPreview 
          files={files} 
          onRemove={onRemoveFile} 
        />
      )}
      
      {/* Input Row */}
      <View style={styles.row}>
        {/* Input Container */}
        <View style={styles.inputContainer}>
          {/* Reply Preview */}
          {replyTo && (
            <View style={styles.replyContainer}>
              <ReplyPreview
                replyTo={replyTo}
                onCancel={onCancelReply}
                isInMessage={false}
                currentUserId={state.currentUserId}
                participantsById={participantsById}
                participants={participants}
              />
            </View>
          )}
          
          {/* Input Wrapper */}
          <View style={styles.inputWrapper}>
            {/* Emoji/Keyboard Toggle Button */}
            {!disabled && (
              <TouchableOpacity
                onPress={keyboard.toggleEmojiPicker}
                style={styles.emojiBtn}
                disabled={disabled}
              >
                <Ionicons
                  name={showEmojiPicker && !isKeyboardVisible ? "create-outline" : "happy-outline"}
                  size={24}
                  color={disabled
                    ? (isDark ? colors.textTertiary : "#CCCCCC")
                    : (showEmojiPicker && !isKeyboardVisible
                      ? (isDark ? colors.primary : "#00A884")
                      : (isDark ? colors.textSecondary : "#8696A0"))}
                />
              </TouchableOpacity>
            )}
            
            {/* Text Input */}
            <TextInput
              ref={textInputRef}
              style={inputStyle}
              placeholder={inputPlaceholder}
              value={text}
              onChangeText={handleChangeText}
              onBlur={typing.handleBlur}
              onFocus={keyboard.handleInputFocus}
              multiline
              scrollEnabled={true}
              placeholderTextColor={isDark ? colors.textTertiary : "#999999"}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              editable={!disabled}
            />
            
            {/* Right Buttons */}
            {!disabled && (
              <View style={styles.rightButtons}>
                <TouchableOpacity 
                  onPress={() => setShowAttachmentMenu(true)} 
                  style={styles.attachBtn}
                  disabled={disabled}
                >
                  <AttachIcon size={20} color={disabled
                    ? (isDark ? colors.textTertiary : "#CCCCCC")
                    : (isDark ? colors.textSecondary : "#8696A0")} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={media.takePhoto} 
                  style={styles.cameraBtn}
                  disabled={disabled}
                >
                  <CameraIcon size={20} color={disabled
                    ? (isDark ? colors.textTertiary : "#CCCCCC")
                    : (isDark ? colors.textSecondary : "#8696A0")} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        
        {/* Send/Voice Button */}
        {showVoiceButton ? (
          <TouchableOpacity onPress={handleStartRecording} style={styles.voiceBtn}>
            <Ionicons name="mic" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            onPress={handleSend} 
            disabled={!canSend} 
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          >
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modals */}
      <ComposerModals
        isRecording={isRecording}
        showAttachmentMenu={showAttachmentMenu}
        showPollModal={showPollModal}
        showContactPicker={showContactPicker}
        pendingAction={pendingAction}
        onCancelRecording={handleCancelRecording}
        onSendVoice={handleSendVoice}
        onCloseAttachmentMenu={() => setShowAttachmentMenu(false)}
        onDismissAttachmentMenu={handleDismissAttachmentMenu}
        onGalleryPress={media.handleGalleryPress}
        onCameraPress={media.handleCameraPress}
        onPollPress={handlePollPress}
        onContactPress={handleContactPress}
        onClosePollModal={() => setShowPollModal(false)}
        onCloseContactPicker={handleCloseContactPicker}
        onCreatePoll={handleCreatePoll}
        onSelectContact={handleSelectContact}
        roomId={roomId}
        disabled={disabled}
        styles={styles}
      />

      {/* Emoji Picker */}
      <FullEmojiPicker
        visible={showEmojiPicker}
        onClose={() => {}}
        onEmojiSelect={handleEmojiSelect}
      />

      {/* Permission Info Modal */}
      <PermissionInfoModal
        visible={permissionModalVisible}
        onClose={handleClosePermissionModal}
        type={permissionType}
      />
    </View>
  );
});

// ============ STYLES ============

const createStyles = (colors, isDark) => StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 6,
  },
  replyContainer: {
    backgroundColor: isDark ? colors.surfaceElevated : '#F0F0F0',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? colors.divider : '#E0E0E0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: isDark ? colors.surfaceElevated : 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    marginRight: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.35 : 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: isDark ? colors.divider : 'rgba(229, 229, 229, 0.8)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  emojiBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 16,
    lineHeight: 20,
    color: isDark ? colors.textPrimary : '#000000',
    textAlignVertical: 'top',
  },
  inputWithAttachments: {
    maxHeight: 84,
  },
  inputDisabled: {
    opacity: 0.5,
    backgroundColor: isDark ? colors.surface : '#f5f5f5',
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  attachBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  cameraBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? colors.primary : 'rgba(37, 211, 102, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.4 : 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: isDark ? colors.surfaceElevated : 'rgba(176, 190, 197, 0.8)',
  },
  voiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? colors.primary : 'rgba(37, 211, 102, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.4 : 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingModalOverlay: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  attachmentMenuOverlay: {
    flex: 1,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  attachmentMenu: {
    backgroundColor: isDark ? colors.surface : '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: isDark ? 1 : 0,
    borderTopColor: isDark ? colors.divider : 'transparent',
  },
  attachmentMenuItem: {
    alignItems: 'center',
    flex: 1,
  },
  attachmentMenuIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  attachmentMenuText: {
    fontSize: 12,
    color: isDark ? colors.textSecondary : '#333',
    marginTop: 4,
  },
});

export default Composer;