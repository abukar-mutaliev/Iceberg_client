import React, { useMemo, useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Platform, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch, useSelector } from 'react-redux';
import { Border, Padding, Color } from '@app/styles/GlobalStyles';
import { sendText, sendImages, sendVoice, addOptimisticMessage } from '@entities/chat/model/slice';
import { AttachmentPreview } from './AttachmentPreview';
import { VoiceRecorder } from './VoiceRecorder';
import { AttachIcon } from '@shared/ui/Icon/AttachIcon';
import { CameraIcon } from '@shared/ui/Icon/CameraIcon';
import { Ionicons } from '@expo/vector-icons';

export const Composer = ({ roomId, onTyping }) => {
  const dispatch = useDispatch();
  const currentUserId = useSelector(state => state.auth?.user?.id);
  const currentUser = useSelector(state => state.auth?.user);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [captions, setCaptions] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const isSendingRef = useRef(false);

  const canSend = useMemo(() => text.trim().length > 0 || files.length > 0, [text, files.length]);
  const showVoiceButton = useMemo(() => text.trim().length === 0 && files.length === 0, [text, files.length]);

  const pickImages = async () => {
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
    setText(val);
    onTyping?.(true);
  };

  const handleBlur = () => onTyping?.(false);

  const onChangeCaption = (key, value) => setCaptions((prev) => ({ ...prev, [key]: value }));
  const onRemove = (key) => setFiles((prev) => prev.filter((f) => (f.uri || f.name) !== key));

  const doSend = async () => {
    if (!canSend || isSendingRef.current) return;
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
    onTyping?.(false);
    
    try {
      if (currentFiles.length > 0) {
        // Для изображений пока не реализуем оптимистичные обновления (сложнее из-за обработки)
        const orderedCaptions = currentFiles.map((f) => currentCaptions[f.uri || f.name] || '');
        await dispatch(sendImages({ roomId, files: currentFiles, captions: orderedCaptions }));
      }
      
      if (currentText.length > 0) {
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
        };
        
        // Добавляем сообщение в UI немедленно
        if (__DEV__) {
          console.log('📤 Composer: Adding optimistic message:', {
            temporaryId,
            content: currentText,
            roomId
          });
        }
        dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));
        
        // Отправляем на сервер в фоне
        if (__DEV__) {
          console.log('📤 Composer: Sending message to server:', { temporaryId, roomId });
        }
        dispatch(sendText({ roomId, content: currentText, temporaryId }));
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
    setIsRecording(true);
  };

  const handleCancelRecording = () => {
    setIsRecording(false);
  };

  const handleSendVoice = async (voiceData) => {
    if (isSendingRef.current) return;
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
        status: 'SENDING',
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };

      // Добавляем оптимистичное сообщение в стор
      dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));

      // Отправляем голосовое сообщение с temporaryId
      await dispatch(sendVoice({ 
        roomId, 
        voice: voiceData,
        temporaryId 
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

  return (
    <View style={styles.container}>
      {files.length > 0 && (
        <AttachmentPreview files={files} captions={captions} onChangeCaption={onChangeCaption} onRemove={onRemove} />
      )}
      <View style={styles.row}>
        {/* Поле ввода */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Сообщение"
            value={text}
            onChangeText={handleChangeText}
            onBlur={handleBlur}
            multiline
            placeholderTextColor="#999999"
          />
          
          {/* Кнопки справа в поле ввода */}
          <View style={styles.rightButtons}>
            <TouchableOpacity onPress={pickImages} style={styles.attachBtn}>
              <AttachIcon size={20} color="#8696A0" />
            </TouchableOpacity>
            <TouchableOpacity onPress={takePhoto} style={styles.cameraBtn}>
              <CameraIcon size={20} color="#8696A0" />
            </TouchableOpacity>
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
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent', 
    borderTopWidth: 0, 
    paddingBottom: Platform.OS === 'ios' ? 20 : 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Полупрозрачный белый фон
    borderRadius: 25,
    marginRight: 8,
    paddingHorizontal: 4,
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
});

export default Composer;

