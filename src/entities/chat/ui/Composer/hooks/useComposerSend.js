import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  sendText, 
  sendImages, 
  sendVoice, 
  sendPoll, 
  sendContact,
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
  
  const sendImageMessages = useCallback(async (files, caption) => {
    // Используем текст из поля ввода как подпись для всех изображений
    const commonCaption = typeof caption === 'string' ? caption : '';
    
    const { temporaryId, replyToIdToSend, replyToData, ...optimisticMessage } = 
      createOptimisticMessage('IMAGE', {
        content: commonCaption, // Используем подпись из поля ввода в content
        attachments: files.map((f) => ({
          type: 'IMAGE',
          path: f.uri,
          mimeType: f.type || 'image/jpeg',
          size: f.size,
          caption: commonCaption // Все изображения получают одну подпись
        })),
      });
    
    // Отменяем ответ СРАЗУ для лучшего UX
    onCancelReply?.();
    
    // Добавляем оптимистичное сообщение
    dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));
    
    // Отправляем одну и ту же подпись для всех изображений
    const orderedCaptions = files.map(() => commonCaption);
    
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

  // ============ SEND CONTACT ============
  
  const sendContactMessage = useCallback(async (contactUser) => {
    // Защита от двойной отправки
    if (isSendingRef.current) {
      console.warn('sendContactMessage: уже идет отправка, игнорируем');
      return;
    }
    
    const contactUserId = contactUser?.id;
    if (!contactUserId) {
      console.warn('sendContactMessage: contactUserId отсутствует');
      return;
    }
    
    isSendingRef.current = true;

    // Получаем имя контакта
    const contactName = contactUser.client?.name ||
                       contactUser.admin?.name ||
                       contactUser.employee?.name ||
                       contactUser.supplier?.contactPerson ||
                       contactUser.driver?.name ||
                       contactUser.email?.split('@')[0] ||
                       'Пользователь';

    const { temporaryId, replyToIdToSend, replyToData, ...optimisticMessage } = 
      createOptimisticMessage('CONTACT', {
        content: JSON.stringify({
          userId: contactUserId,
          name: contactName,
          role: contactUser.role,
          phone: contactUser.phone || contactUser.client?.phone || contactUser.admin?.phone || contactUser.employee?.phone || contactUser.driver?.phone || null,
          email: contactUser.email || null,
          avatar: contactUser.avatar || null,
        }),
        contactUserId,
        contact: {
          userId: contactUserId,
          name: contactName,
          role: contactUser.role,
          phone: contactUser.phone || contactUser.client?.phone || contactUser.admin?.phone || contactUser.employee?.phone || contactUser.driver?.phone || null,
          email: contactUser.email || null,
          avatar: contactUser.avatar || null,
        },
      });
    
    // Отменяем ответ СРАЗУ для лучшего UX
    onCancelReply?.();
    
    // Добавляем оптимистичное сообщение
    dispatch(addOptimisticMessage({ roomId, message: optimisticMessage }));
    
    try {
      // Отправляем на сервер
      const sendPromise = dispatch(sendContact({ 
        roomId, 
        contactUserId,
        temporaryId,
        replyToId: replyToIdToSend
      })).unwrap();
      
      // Освобождаем блокировку сразу после старта отправки,
      // чтобы не блокировать последующие сообщения при медленной сети.
      isSendingRef.current = false;
      
      await sendPromise;
      playSendSound();
    } catch (error) {
      console.error('Ошибка отправки контакта:', error);
      // В случае ошибки можно показать уведомление или обработать ошибку
    } finally {
      isSendingRef.current = false;
    }
  }, [dispatch, roomId, createOptimisticMessage, onCancelReply, isSendingRef]);
  
  // ============ MAIN SEND HANDLER ============
  
  const handleSend = useCallback(async (text, files, captions, clearForm) => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    
    // Сохраняем текущие значения
    const currentText = text.trim();
    const currentFiles = [...files];
    
    // Очищаем форму немедленно для лучшего UX
    clearForm();
    stopTyping();
    
    try {
      let sendPromise = null;
      // Отправляем изображения (текст используется как подпись)
      if (currentFiles.length > 0) {
        sendPromise = sendImageMessages(currentFiles, currentText);
      } else if (currentText.length > 0) {
        // Отправляем текст только если нет изображений
        sendPromise = sendTextMessage(currentText);
      }
      
      // Освобождаем блокировку сразу после старта отправки,
      // чтобы не блокировать последующие сообщения при медленной сети.
      isSendingRef.current = false;
      
      if (sendPromise) {
        await sendPromise;
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
    sendContactMessage,
  };
};