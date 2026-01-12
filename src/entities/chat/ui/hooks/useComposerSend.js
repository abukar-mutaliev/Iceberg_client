import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  sendText, 
  sendImages, 
  sendVoice, 
  sendPoll, 
  addOptimisticMessage 
} from '@entities/chat/model/slice';
import { playSendSound } from '@entities/chat/lib/sendSound';

/**
 * Хук для отправки сообщений
 * Содержит всю логику создания и отправки разных типов сообщений
 */
export const useComposerSend = ({
  roomId,
  replyTo,
  onCancelReply,
  isSendingRef,
  stopTyping,
}) => {
  const dispatch = useDispatch();
  const currentUserId = useSelector(state => state.auth?.user?.id);
  const currentUser = useSelector(state => state.auth?.user);
  
  // ============ HELPERS ============
  
  const createOptimisticMessage = useCallback((type, data) => {
    const temporaryId = `temp_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const replyToIdToSend = replyTo?.id || null;
    const replyToData = replyTo || null;
    
    const baseMessage = {
      id: temporaryId,
      temporaryId,
      roomId,
      type,
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
    
    return { ...baseMessage, ...data, temporaryId, replyToIdToSend, replyToData };
  }, [roomId, currentUserId, currentUser, replyTo]);
  
  // ============ SEND TEXT ============
  
  const sendTextMessage = useCallback(async (text) => {
    const { temporaryId, replyToIdToSend, replyToData, ...optimisticMessage } = 
      createOptimisticMessage('TEXT', {
        content: text,
      });
    
    // Отменяем ответ СРАЗУ для лучшего UX
    onCancelReply?.();
    
    // Добавляем оптимистичное сообщение
    dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));
    
    // Отправляем на сервер
    await dispatch(sendText({ 
      roomId, 
      content: text, 
      temporaryId, 
      replyToId: replyToIdToSend 
    })).unwrap();
    
    playSendSound();
  }, [dispatch, roomId, createOptimisticMessage, onCancelReply]);
  
  // ============ SEND IMAGES ============
  
  const sendImageMessages = useCallback(async (files, captions) => {
    const { temporaryId, replyToIdToSend, replyToData, ...optimisticMessage } = 
      createOptimisticMessage('IMAGE', {
        content: '',
        attachments: files.map((f) => ({
          type: 'IMAGE',
          path: f.uri,
          mimeType: f.type || 'image/jpeg',
          size: f.size,
          caption: captions[f.uri || f.name] || ''
        })),
      });
    
    // Отменяем ответ СРАЗУ для лучшего UX
    onCancelReply?.();
    
    // Добавляем оптимистичное сообщение
    dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));
    
    const orderedCaptions = files.map((f) => captions[f.uri || f.name] || '');
    
    // Отправляем на сервер
    await dispatch(sendImages({ 
      roomId, 
      files, 
      captions: orderedCaptions,
      temporaryId,
      replyToId: replyToIdToSend
    })).unwrap();
    
    playSendSound();
  }, [dispatch, roomId, createOptimisticMessage, onCancelReply]);
  
  // ============ SEND VOICE ============
  
  const sendVoiceMessage = useCallback(async (voiceData) => {
    const { temporaryId, replyToIdToSend, replyToData, ...optimisticMessage } = 
      createOptimisticMessage('VOICE', {
        content: '',
        attachments: [{
          type: 'VOICE',
          path: voiceData.uri,
          mimeType: voiceData.type || 'audio/aac',
          size: voiceData.size,
          duration: voiceData.duration,
          waveform: voiceData.waveform || [],
        }],
      });
    
    // Отменяем ответ СРАЗУ для лучшего UX
    onCancelReply?.();
    
    // Добавляем оптимистичное сообщение
    dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));
    
    // Отправляем на сервер
    await dispatch(sendVoice({ 
      roomId, 
      voice: voiceData,
      temporaryId,
      replyToId: replyToIdToSend
    })).unwrap();
    
    playSendSound();
  }, [dispatch, roomId, createOptimisticMessage, onCancelReply]);
  
  // ============ SEND POLL ============
  
  const sendPollMessage = useCallback(async (pollData) => {
    const { temporaryId, replyToIdToSend, replyToData, ...optimisticMessage } = 
      createOptimisticMessage('POLL', {
        content: pollData.question,
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
      });
    
    // Отменяем ответ СРАЗУ для лучшего UX
    onCancelReply?.();
    
    // Добавляем оптимистичное сообщение
    dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));
    
    // Отправляем на сервер
    await dispatch(sendPoll({ 
      roomId, 
      pollData,
      temporaryId,
      replyToId: replyToIdToSend
    })).unwrap();
    
    playSendSound();
  }, [dispatch, roomId, createOptimisticMessage, onCancelReply]);
  
  // ============ MAIN SEND HANDLER ============
  
  const handleSend = useCallback(async (text, files, captions, clearForm) => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    
    // Сохраняем текущие значения
    const currentText = text.trim();
    const currentFiles = [...files];
    const currentCaptions = { ...captions };
    
    // Очищаем форму немедленно для лучшего UX
    clearForm();
    stopTyping();
    
    try {
      // Отправляем изображения
      if (currentFiles.length > 0) {
        await sendImageMessages(currentFiles, currentCaptions);
      }
      
      // Отправляем текст
      if (currentText.length > 0) {
        await sendTextMessage(currentText);
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      // В случае ошибки восстанавливаем содержимое
      // (но НЕ восстанавливаем - лучше показать ошибку)
    } finally {
      isSendingRef.current = false;
    }
  }, [
    isSendingRef, 
    stopTyping, 
    sendImageMessages, 
    sendTextMessage
  ]);
  
  return {
    handleSend,
    sendVoiceMessage,
    sendPollMessage,
  };
};