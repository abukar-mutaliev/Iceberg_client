import React, { useMemo, useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useDispatch } from 'react-redux';
import { Border, Padding, Color } from '@app/styles/GlobalStyles';
import { sendText, sendImages } from '@entities/chat/model/slice';
import { AttachmentPreview } from './AttachmentPreview';
import { AttachIcon } from '@shared/ui/Icon/AttachIcon';
import { CameraIcon } from '@shared/ui/Icon/CameraIcon';

export const Composer = ({ roomId, onTyping }) => {
  const dispatch = useDispatch();
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [captions, setCaptions] = useState({});
  const isSendingRef = useRef(false);

  const canSend = useMemo(() => text.trim().length > 0 || files.length > 0, [text, files.length]);

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
    try {
      if (files.length > 0) {
        // FormData files
        const orderedCaptions = files.map((f) => captions[f.uri || f.name] || '');
        await dispatch(sendImages({ roomId, files, captions: orderedCaptions }));
        setFiles([]);
        setCaptions({});
      }
      if (text.trim().length > 0) {
        await dispatch(sendText({ roomId, content: text.trim() }));
        setText('');
      }
    } finally {
      isSendingRef.current = false;
      onTyping?.(false);
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
        
        {/* Кнопка отправки */}
        <TouchableOpacity onPress={doSend} disabled={!canSend} style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}>
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
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
  sendText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Composer;

