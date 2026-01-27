import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  sendText, 
  sendImages, 
  sendVoice, 
  sendPoll, 
  addOptimisticMessage 
} from '@entities/chat/model/slice';
import { playSendSound } from '@entities/chat/lib/sendSound';
import { waitForConnection } from '@shared/api/retryHelper';

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
  const queueRef = useRef([]);
  const isProcessingRef = useRef(false);
  const waitForOnline = useCallback(async () => {
    while (true) {
      const isOnline = await waitForConnection(20000);
      if (isOnline) return true;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }, []);
  
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
  
  const sendTextToServer = useCallback(async ({ text, temporaryId, replyToId }) => {
    await dispatch(sendText({ 
      roomId, 
      content: text, 
      temporaryId, 
      replyToId 
    })).unwrap();
    playSendSound();
  }, [dispatch, roomId]);

  const sendTextMessage = useCallback((text) => {
    const { temporaryId, replyToIdToSend, replyToData, ...optimisticMessage } = 
      createOptimisticMessage('TEXT', {
        content: text,
      });
    
    // Отменяем ответ СРАЗУ для лучшего UX
    onCancelReply?.();
    
    // Добавляем оптимистичное сообщение
    dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));
    queueRef.current.push({
      type: 'text',
      text,
      temporaryId,
      replyToId: replyToIdToSend
    });
    processQueue();
  }, [dispatch, roomId, createOptimisticMessage, onCancelReply]);
  
  // ============ SEND IMAGES ============
  
  const sendImagesToServer = useCallback(async ({ files, captions, temporaryId, replyToId }) => {
    const orderedCaptions = files.map((f) => captions[f.uri || f.name] || '');
    await dispatch(sendImages({ 
      roomId, 
      files, 
      captions: orderedCaptions,
      temporaryId,
      replyToId
    })).unwrap();
    playSendSound();
  }, [dispatch, roomId]);

  const sendImageMessages = useCallback((files, captions) => {
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
    queueRef.current.push({
      type: 'images',
      files,
      captions,
      temporaryId,
      replyToId: replyToIdToSend
    });
    processQueue();
  }, [dispatch, roomId, createOptimisticMessage, onCancelReply]);
  
  // ============ SEND VOICE ============
  
  const sendVoiceToServer = useCallback(async ({ voiceData, temporaryId, replyToId }) => {
    await dispatch(sendVoice({ 
      roomId, 
      voice: voiceData,
      temporaryId,
      replyToId
    })).unwrap();
    playSendSound();
  }, [dispatch, roomId]);

  const sendVoiceMessage = useCallback((voiceData) => {
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
    queueRef.current.push({
      type: 'voice',
      voiceData,
      temporaryId,
      replyToId: replyToIdToSend
    });
    processQueue();
  }, [dispatch, roomId, createOptimisticMessage, onCancelReply]);
  
  // ============ SEND POLL ============
  
  const sendPollToServer = useCallback(async ({ pollData, temporaryId, replyToId }) => {
    await dispatch(sendPoll({ 
      roomId, 
      pollData,
      temporaryId,
      replyToId
    })).unwrap();
    playSendSound();
  }, [dispatch, roomId]);

  const sendPollMessage = useCallback((pollData) => {
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
    queueRef.current.push({
      type: 'poll',
      pollData,
      temporaryId,
      replyToId: replyToIdToSend
    });
    processQueue();
  }, [dispatch, roomId, createOptimisticMessage, onCancelReply]);
  
  // ============ MAIN SEND HANDLER ============
  
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    isSendingRef.current = true;
    
    try {
      while (queueRef.current.length > 0) {
        const nextItem = queueRef.current[0];
        await waitForOnline();
        
        try {
          if (nextItem.type === 'images') {
            await sendImagesToServer(nextItem);
          } else if (nextItem.type === 'text') {
            await sendTextToServer(nextItem);
          } else if (nextItem.type === 'voice') {
            await sendVoiceToServer(nextItem);
          } else if (nextItem.type === 'poll') {
            await sendPollToServer(nextItem);
          }
        } catch (error) {
          console.error('Ошибка отправки сообщения из очереди:', error);
        } finally {
          queueRef.current.shift();
        }
      }
    } finally {
      isProcessingRef.current = false;
      isSendingRef.current = false;
    }
  }, [
    isSendingRef,
    waitForOnline,
    sendImagesToServer,
    sendTextToServer,
    sendVoiceToServer,
    sendPollToServer
  ]);

  const handleSend = useCallback(async (text, files, captions, clearForm) => {
    // Сохраняем текущие значения
    const currentText = text.trim();
    const currentFiles = [...files];
    const currentCaptions = { ...captions };
    
    if (currentText.length === 0 && currentFiles.length === 0) {
      return;
    }
    
    // Очищаем форму немедленно для лучшего UX
    clearForm();
    stopTyping();
    
    if (currentFiles.length > 0) {
      sendImageMessages(currentFiles, currentCaptions);
    }
    
    if (currentText.length > 0) {
      sendTextMessage(currentText);
    }
  }, [
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