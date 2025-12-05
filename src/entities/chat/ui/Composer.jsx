import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Platform, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { Border, Padding, Color } from '@app/styles/GlobalStyles';
import { sendText, sendImages, sendVoice, sendPoll, addOptimisticMessage } from '@entities/chat/model/slice';
import { AttachmentPreview } from './AttachmentPreview';
import { VoiceRecorder } from './VoiceRecorder';
import { PollCreationModal } from './PollCreationModal';
import { ReplyPreview } from './ReplyPreview';
import { AttachIcon } from '@shared/ui/Icon/AttachIcon';
import { CameraIcon } from '@shared/ui/Icon/CameraIcon';
import { Ionicons } from '@expo/vector-icons';
import ChatApi from '@entities/chat/api/chatApi';
import { useChatSocketActions } from '@entities/chat/hooks/useChatSocketActions';

export const Composer = ({ roomId, onTyping, replyTo, onCancelReply, disabled = false }) => {
  const dispatch = useDispatch();
  const currentUserId = useSelector(state => state.auth?.user?.id);
  const currentUser = useSelector(state => state.auth?.user);
  const { emitTyping } = useChatSocketActions();
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [captions, setCaptions] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const isSendingRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  const canSend = useMemo(() => !disabled && (text.trim().length > 0 || files.length > 0), [disabled, text, files.length]);
  const showVoiceButton = useMemo(() => !disabled && text.trim().length === 0 && files.length === 0, [disabled, text, files.length]);

  // Очищаем таймер при размонтировании
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const pickImages = async () => {
    if (disabled) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.9,
      });

      if (!result.canceled) {
        const selected = (result.assets || []).map((asset) => ({
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
        }));
        setFiles((prev) => [...prev, ...selected]);
      }
    } catch (e) {
      // noop
    }
  };

  const takePhoto = async () => {
    if (disabled) return;
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });

      if (!result.canceled) {
        const selected = (result.assets || []).map((asset) => ({
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
        }));
        setFiles((prev) => [...prev, ...selected]);
      }
    } catch (e) {
      // noop
    }
  };

  const handleChangeText = (val) => {
    if (disabled) return;

    const wasEmpty = text.trim().length === 0;
    const isEmpty = val.trim().length === 0;

    setText(val);

    // Управляем индикатором печати
    if (!isEmpty && wasEmpty) {
      // Начал печатать - отправляем событие
      onTyping?.(true);
      if (roomId) {
        emitTyping(roomId, true, 'text');
      }
    } else if (isEmpty && !wasEmpty) {
      // Закончил печатать - отправляем событие окончания
      onTyping?.(false);
      if (roomId) {
        emitTyping(roomId, false, 'text');
      }
    } else if (!isEmpty) {
      // Продолжает печатать - сбрасываем таймер
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Устанавливаем таймер для отправки события окончания печати
      typingTimeoutRef.current = setTimeout(() => {
        onTyping?.(false);
        if (roomId) {
          emitTyping(roomId, false, 'text');
        }
      }, 2000); // 2 секунды бездействия
    }
  };

  const handleBlur = () => {
    // Очищаем таймер печати
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    onTyping?.(false);
    // Отправляем событие окончания печати через WebSocket
    if (roomId && text.trim().length > 0) {
      emitTyping(roomId, false, 'text');
    }
  };

  const onChangeCaption = (key, value) => setCaptions((prev) => ({ ...prev, [key]: value }));
  const onRemove = (key) => setFiles((prev) => prev.filter((f) => (f.uri || f.name) !== key));

  const doSend = async () => {
    if (disabled || !canSend || isSendingRef.current) return;
    isSendingRef.current = true;
    
    // Генерируем временный ID для отслеживания оптимистичного сообщения
    const temporaryId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Сохраняем текущие значения
    const currentText = text.trim();
    const currentFiles = [...files];
    const currentCaptions = { ...captions };
    
    // Очищаем форму немедленно для лучшего UX
    if (currentText.length > 0) {
      setText('');
    }
    if (currentFiles.length > 0) {
      setFiles([]);
      setCaptions({});
    }
    // Очищаем таймер печати
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    onTyping?.(false);
    // Отправляем событие окончания печати через WebSocket
    if (roomId) {
      emitTyping(roomId, false, 'text');
    }

    try {
      if (currentFiles.length > 0) {
        // Создаем временный ID для оптимистичного сообщения
        const temporaryId = `temp_image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const replyToIdToSend = replyTo?.id || null;
        const replyToData = replyTo || null;
        
        // Отменяем ответ СРАЗУ для лучшего UX
        onCancelReply?.();
        
        // Подготавливаем attachments для оптимистичного сообщения
        const optimisticAttachments = currentFiles.map((f, idx) => ({
          type: 'IMAGE',
          path: f.uri,
          mimeType: f.type || 'image/jpeg',
          size: f.size,
          caption: currentCaptions[f.uri || f.name] || ''
        }));
        
        // Создаем оптимистичное сообщение для изображений
        const optimisticMessage = {
          id: temporaryId,
          temporaryId,
          roomId,
          type: 'IMAGE',
          content: '', // Подписи будут в attachments
          senderId: currentUserId,
          sender: {
            id: currentUserId,
            name: currentUser?.name || currentUser?.firstName || 'Вы',
            avatar: currentUser?.avatar,
            role: currentUser?.role,
          },
          attachments: optimisticAttachments,
          replyToId: replyToIdToSend,
          replyTo: replyToData,
          status: 'SENDING',
          createdAt: new Date().toISOString(),
          isOptimistic: true,
        };

        // Добавляем оптимистичное сообщение в стор
        dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));

        const orderedCaptions = currentFiles.map((f) => currentCaptions[f.uri || f.name] || '');
        
        // Отправляем изображения с temporaryId и replyToId
        await dispatch(sendImages({ 
          roomId, 
          files: currentFiles, 
          captions: orderedCaptions,
          temporaryId,
          replyToId: replyToIdToSend
        })).unwrap();
      }
      
      if (currentText.length > 0) {
        const replyToIdToSend = replyTo?.id || null;
        const replyToData = replyTo || null;
        
        // Отменяем ответ СРАЗУ для лучшего UX
        onCancelReply?.();
        
        // Создаем оптимистичное сообщение
        const optimisticMessage = {
          id: temporaryId, // Используем temporaryId как ID
          temporaryId, // Также сохраняем для поиска
          roomId,
          type: 'TEXT',
          content: currentText,
          senderId: currentUserId,
          sender: {
            id: currentUserId,
            name: currentUser?.name || currentUser?.firstName || 'Вы',
            avatar: currentUser?.avatar,
            role: currentUser?.role,
          },
          replyToId: replyToIdToSend,
          replyTo: replyToData,
          status: 'SENDING',
          createdAt: new Date().toISOString(),
          isOptimistic: true,
        };
        
        // Добавляем сообщение в UI немедленно
        if (__DEV__) {
          console.log('📤 Composer: Adding optimistic message:', {
            temporaryId,
            content: currentText,
            roomId,
            replyToId: replyToIdToSend
          });
        }
        dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));
        
        // Отправляем на сервер с await для синхронизации
        if (__DEV__) {
          console.log('📤 Composer: Sending message to server:', { temporaryId, roomId, replyToId: replyToIdToSend });
        }
        await dispatch(sendText({ roomId, content: currentText, temporaryId, replyToId: replyToIdToSend })).unwrap();
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      // В случае ошибки возвращаем текст обратно
      if (currentText.length > 0) {
        setText(currentText);
      }
      if (currentFiles.length > 0) {
        setFiles(currentFiles);
        setCaptions(currentCaptions);
      }
    } finally {
      isSendingRef.current = false;
    }
  };

  const handleStartRecording = () => {
    if (disabled) return;
    setIsRecording(true);
  };

  const handleCancelRecording = () => {
    setIsRecording(false);
  };

  const handleSendVoice = async (voiceData) => {
    if (disabled || isSendingRef.current) return;
    isSendingRef.current = true;

    try {
      setIsRecording(false);
      
      if (__DEV__) {
        console.log('🎤 Composer: Sending voice message:', {
          duration: voiceData.duration,
          size: voiceData.size,
          uri: voiceData.uri,
          roomId
        });
      }

      // Создаем временный ID
      const temporaryId = `temp_voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const replyToIdToSend = replyTo?.id || null;
      const replyToData = replyTo || null;
      
      // Отменяем ответ СРАЗУ для лучшего UX
      onCancelReply?.();
      
      // Создаем оптимистичное голосовое сообщение
      const optimisticMessage = {
        id: temporaryId,
        temporaryId,
        roomId,
        type: 'VOICE',
        content: '',
        senderId: currentUserId,
        sender: {
          id: currentUserId,
          name: currentUser?.name || currentUser?.firstName || 'Вы',
          avatar: currentUser?.avatar,
          role: currentUser?.role,
        },
        attachments: [{
          type: 'VOICE',
          path: voiceData.uri,
          mimeType: voiceData.type || 'audio/aac',
          size: voiceData.size,
          duration: voiceData.duration,
          waveform: voiceData.waveform || [], // ✅ Добавляем waveform
        }],
        replyToId: replyToIdToSend,
        replyTo: replyToData,
        status: 'SENDING',
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };

      // Добавляем оптимистичное сообщение в стор
      dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));

      // Отправляем голосовое сообщение с temporaryId и replyToId
      await dispatch(sendVoice({ 
        roomId, 
        voice: voiceData,
        temporaryId,
        replyToId: replyToIdToSend
      })).unwrap();
      
      if (__DEV__) {
        console.log('✅ Голосовое сообщение успешно отправлено');
      }
      
    } catch (error) {
      console.error('❌ Ошибка отправки голосового сообщения:', error);
    } finally {
      isSendingRef.current = false;
    }
  };

  const handleCreatePoll = async (pollData) => {
    if (disabled || isSendingRef.current) return;
    isSendingRef.current = true;

    try {
      const temporaryId = `temp_poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const replyToIdToSend = replyTo?.id || null;
      const replyToData = replyTo || null;

      // Отменяем ответ СРАЗУ для лучшего UX
      onCancelReply?.();

      // Создаем оптимистичное сообщение с опросом
      const optimisticMessage = {
        id: temporaryId,
        temporaryId,
        roomId,
        type: 'POLL',
        content: pollData.question,
        senderId: currentUserId,
        sender: {
          id: currentUserId,
          name: currentUser?.name || currentUser?.firstName || 'Вы',
          avatar: currentUser?.avatar,
          role: currentUser?.role,
        },
        poll: {
          id: temporaryId,
          question: pollData.question,
          allowMultiple: pollData.allowMultiple,
          options: pollData.options.map((text, index) => ({
            id: `temp_option_${index}`,
            text,
            order: index,
            votes: [],
          })),
        },
        replyToId: replyToIdToSend,
        replyTo: replyToData,
        status: 'SENDING',
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };

      dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));

      // Отправляем опрос через thunk (как sendText/sendVoice)
      await dispatch(sendPoll({ 
        roomId, 
        pollData,
        temporaryId,
        replyToId: replyToIdToSend
      })).unwrap();
    } catch (error) {
      console.error('❌ Ошибка отправки опроса:', error);
    } finally {
      isSendingRef.current = false;
    }
  };

  return (
    <View style={styles.container}>
      {files.length > 0 && (
        <AttachmentPreview files={files} captions={captions} onChangeCaption={onChangeCaption} onRemove={onRemove} />
      )}
      <View style={styles.row}>
        {/* Поле ввода */}
        <View style={styles.inputContainer}>
          {/* Превью ответа - прикреплено к полю ввода */}
          {replyTo && (
            <View style={styles.replyContainer}>
              <ReplyPreview
                replyTo={replyTo}
                onCancel={onCancelReply}
                isInMessage={false}
                currentUserId={currentUserId}
              />
            </View>
          )}
          
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, disabled && styles.inputDisabled]}
              placeholder="Сообщение"
              value={text}
              onChangeText={handleChangeText}
              onBlur={handleBlur}
              multiline
              placeholderTextColor="#999999"
              editable={!disabled}
            />
            
            {/* Кнопки справа в поле ввода */}
            {!disabled && (
              <View style={styles.rightButtons}>
                <TouchableOpacity 
                  onPress={() => {
                    if (!disabled) setShowAttachmentMenu(true);
                  }} 
                  style={styles.attachBtn}
                  disabled={disabled}
                >
                  <AttachIcon size={20} color={disabled ? "#CCCCCC" : "#8696A0"} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={takePhoto} 
                  style={styles.cameraBtn}
                  disabled={disabled}
                >
                  <CameraIcon size={20} color={disabled ? "#CCCCCC" : "#8696A0"} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        
        {/* Кнопка отправки или записи голоса */}
        {showVoiceButton ? (
          <TouchableOpacity onPress={handleStartRecording} style={styles.voiceBtn}>
            <Ionicons name="mic" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={doSend} disabled={!canSend} style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}>
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Модальное окно записи голоса */}
      <Modal
        visible={isRecording}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelRecording}
      >
        <View style={styles.recordingModalOverlay}>
          <VoiceRecorder
            onSend={handleSendVoice}
            onCancel={handleCancelRecording}
            roomId={roomId}
          />
        </View>
      </Modal>

      {/* Меню прикрепления */}
      <Modal
        visible={showAttachmentMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAttachmentMenu(false)}
      >
        <TouchableOpacity
          style={styles.attachmentMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachmentMenu(false)}
        >
          <View style={styles.attachmentMenu}>
            <TouchableOpacity
              style={styles.attachmentMenuItem}
              onPress={() => {
                setShowAttachmentMenu(false);
                pickImages();
              }}
            >
              <View style={[styles.attachmentMenuIcon, { backgroundColor: '#2196F3' }]}>
                <Ionicons name="images" size={24} color="#fff" />
              </View>
              <Text style={styles.attachmentMenuText}>Галерея</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attachmentMenuItem}
              onPress={() => {
                setShowAttachmentMenu(false);
                takePhoto();
              }}
            >
              <View style={[styles.attachmentMenuIcon, { backgroundColor: '#E91E63' }]}>
                <Ionicons name="camera" size={24} color="#fff" />
              </View>
              <Text style={styles.attachmentMenuText}>Камера</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.attachmentMenuItem}
              onPress={() => {
                setShowAttachmentMenu(false);
                setShowPollModal(true);
              }}
            >
              <View style={[styles.attachmentMenuIcon, { backgroundColor: '#FFC107' }]}>
                <Ionicons name="bar-chart" size={24} color="#fff" />
              </View>
              <Text style={styles.attachmentMenuText}>Опрос</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Модальное окно создания опроса */}
      <PollCreationModal
        visible={showPollModal}
        onClose={() => setShowPollModal(false)}
        onSubmit={handleCreatePoll}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent', 
    borderTopWidth: 0, 
    paddingBottom: Platform.OS === 'ios' ? 20 : 6,
  },
  replyContainer: {
    backgroundColor: '#F0F0F0',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Полупрозрачный белый фон
    borderRadius: 25,
    marginRight: 8,
    overflow: 'hidden', // Важно для скругленных углов
    // Тень как в WhatsApp
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(229, 229, 229, 0.8)', // Полупрозрачная граница
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 16,
    lineHeight: 20,
    color: '#000000',
  },
  inputDisabled: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: 'rgba(37, 211, 102, 0.95)', // Полупрозрачный WhatsApp зеленый
    alignItems: 'center',
    justifyContent: 'center',
    // Тень как в WhatsApp
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(176, 190, 197, 0.8)', // Полупрозрачный серый для заблокированной кнопки
  },
  voiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37, 211, 102, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  attachmentMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  attachmentMenu: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
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
    color: '#333',
    marginTop: 4,
  },
});

export default Composer;

