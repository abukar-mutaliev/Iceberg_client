import { useCallback, useRef } from 'react';
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
import { waitForConnection } from '@shared/api/retryHelper';

/**
 * Хук для отправки сообщений
 * Содержит всю логику создания и отправки разных типов сообщений.
 *
 * Поддерживает два режима:
 * 1. Обычный — комната уже существует, roomId передан напрямую.
 * 2. Черновой (draft) — roomId отсутствует, но передан ensureRoomId:
 *    асинхронный резолвер, который создаёт DIRECT-комнату на сервере
 *    только при первой отправке. Используется в ChatSearchScreen → новый чат.
 */
export const useComposerSend = ({
  roomId,
  ensureRoomId,
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

  // Возвращает актуальный roomId. Если передан ensureRoomId — даём ему шанс
  // создать/дождаться комнату (например, при первой отправке в черновом чате).
  const resolveRoomId = useCallback(async () => {
    if (typeof ensureRoomId === 'function') {
      const resolved = await ensureRoomId();
      if (resolved) return resolved;
    }
    return roomId;
  }, [ensureRoomId, roomId]);
  
  // ============ HELPERS ============
  
  const createOptimisticMessage = useCallback((type, data, targetRoomId) => {
    const temporaryId = `temp_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const replyToIdToSend = replyTo?.id || null;
    const replyToData = replyTo || null;
    
    const baseMessage = {
      id: temporaryId,
      temporaryId,
      roomId: targetRoomId,
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
  }, [currentUserId, currentUser, replyTo]);
  
  // ============ SEND TEXT ============
  
  const sendTextToServer = useCallback(async ({ roomId: itemRoomId, text, temporaryId, replyToId }) => {
    await dispatch(sendText({ 
      roomId: itemRoomId, 
      content: text, 
      temporaryId, 
      replyToId 
    })).unwrap();
    playSendSound();
  }, [dispatch]);

  const sendTextMessage = useCallback(async (text) => {
    let targetRoomId;
    try {
      targetRoomId = await resolveRoomId();
    } catch (error) {
      console.error('Ошибка создания черновой комнаты:', error);
      return;
    }
    if (!targetRoomId) return;

    const { temporaryId, replyToIdToSend, replyToData, ...optimisticMessage } = 
      createOptimisticMessage('TEXT', {
        content: text,
      }, targetRoomId);
    
    onCancelReply?.();
    
    dispatch(addOptimisticMessage({ roomId: targetRoomId, message: optimisticMessage }));
    queueRef.current.push({
      type: 'text',
      roomId: targetRoomId,
      text,
      temporaryId,
      replyToId: replyToIdToSend
    });
    processQueue();
  }, [dispatch, resolveRoomId, createOptimisticMessage, onCancelReply]);
  
  // ============ SEND IMAGES ============
  
  const sendImagesToServer = useCallback(async ({ roomId: itemRoomId, files, captions, temporaryId, replyToId }) => {
    const orderedCaptions = files.map(() => captions);
    await dispatch(sendImages({ 
      roomId: itemRoomId, 
      files, 
      captions: orderedCaptions,
      temporaryId,
      replyToId
    })).unwrap();
    playSendSound();
  }, [dispatch]);

  const sendImageMessages = useCallback(async (files, caption) => {
    let targetRoomId;
    try {
      targetRoomId = await resolveRoomId();
    } catch (error) {
      console.error('Ошибка создания черновой комнаты:', error);
      return;
    }
    if (!targetRoomId) return;

    const commonCaption = typeof caption === 'string' ? caption : '';
    
    const { temporaryId, replyToIdToSend, replyToData, ...optimisticMessage } = 
      createOptimisticMessage('IMAGE', {
        content: commonCaption,
        attachments: files.map((f) => ({
          type: 'IMAGE',
          path: f.uri,
          mimeType: f.type || 'image/jpeg',
          size: f.size,
          caption: commonCaption
        })),
      }, targetRoomId);
    
    onCancelReply?.();
    
    dispatch(addOptimisticMessage({ roomId: targetRoomId, message: optimisticMessage }));
    queueRef.current.push({
      type: 'images',
      roomId: targetRoomId,
      files,
      captions: commonCaption,
      temporaryId,
      replyToId: replyToIdToSend
    });
    processQueue();
  }, [dispatch, resolveRoomId, createOptimisticMessage, onCancelReply]);
  
  // ============ SEND VOICE ============
  
  const sendVoiceToServer = useCallback(async ({ roomId: itemRoomId, voiceData, temporaryId, replyToId }) => {
    await dispatch(sendVoice({ 
      roomId: itemRoomId, 
      voice: voiceData,
      temporaryId,
      replyToId
    })).unwrap();
    playSendSound();
  }, [dispatch]);

  const sendVoiceMessage = useCallback(async (voiceData) => {
    let targetRoomId;
    try {
      targetRoomId = await resolveRoomId();
    } catch (error) {
      console.error('Ошибка создания черновой комнаты:', error);
      return;
    }
    if (!targetRoomId) return;

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
      }, targetRoomId);
    
    onCancelReply?.();
    
    dispatch(addOptimisticMessage({ roomId: targetRoomId, message: optimisticMessage }));
    queueRef.current.push({
      type: 'voice',
      roomId: targetRoomId,
      voiceData,
      temporaryId,
      replyToId: replyToIdToSend
    });
    processQueue();
  }, [dispatch, resolveRoomId, createOptimisticMessage, onCancelReply]);
  
  // ============ SEND POLL ============
  
  const sendPollToServer = useCallback(async ({ roomId: itemRoomId, pollData, temporaryId, replyToId }) => {
    await dispatch(sendPoll({ 
      roomId: itemRoomId, 
      pollData,
      temporaryId,
      replyToId
    })).unwrap();
    playSendSound();
  }, [dispatch]);

  const sendPollMessage = useCallback(async (pollData) => {
    let targetRoomId;
    try {
      targetRoomId = await resolveRoomId();
    } catch (error) {
      console.error('Ошибка создания черновой комнаты:', error);
      return;
    }
    if (!targetRoomId) return;

    const { temporaryId, replyToIdToSend, replyToData, ...optimisticMessage } = 
      createOptimisticMessage('POLL', {
        content: pollData.question,
        poll: {
          id: undefined,
          question: pollData.question,
          allowMultiple: pollData.allowMultiple,
          options: pollData.options.map((text, index) => ({
            id: `temp_option_${index}`,
            text,
            order: index,
            votes: [],
          })),
        },
      }, targetRoomId);
    
    onCancelReply?.();
    
    dispatch(addOptimisticMessage({ roomId: targetRoomId, message: optimisticMessage }));
    queueRef.current.push({
      type: 'poll',
      roomId: targetRoomId,
      pollData,
      temporaryId,
      replyToId: replyToIdToSend
    });
    processQueue();
  }, [dispatch, resolveRoomId, createOptimisticMessage, onCancelReply]);

  // ============ SEND CONTACT ============
  
  const sendContactToServer = useCallback(async ({ roomId: itemRoomId, contactUserId, temporaryId, replyToId }) => {
    await dispatch(sendContact({ 
      roomId: itemRoomId, 
      contactUserId,
      temporaryId,
      replyToId
    })).unwrap();
    playSendSound();
  }, [dispatch]);

  const sendContactMessage = useCallback(async (contactUser) => {
    const contactUserId = contactUser?.id;
    if (!contactUserId) {
      console.warn('sendContactMessage: contactUserId отсутствует');
      return;
    }

    let targetRoomId;
    try {
      targetRoomId = await resolveRoomId();
    } catch (error) {
      console.error('Ошибка создания черновой комнаты:', error);
      return;
    }
    if (!targetRoomId) return;

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
      }, targetRoomId);
    
    onCancelReply?.();
    
    dispatch(addOptimisticMessage({ roomId: targetRoomId, message: optimisticMessage }));
    queueRef.current.push({
      type: 'contact',
      roomId: targetRoomId,
      contactUserId,
      temporaryId,
      replyToId: replyToIdToSend
    });
    processQueue();
  }, [dispatch, resolveRoomId, createOptimisticMessage, onCancelReply]);
  
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
          } else if (nextItem.type === 'contact') {
            await sendContactToServer(nextItem);
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
    sendPollToServer,
    sendContactToServer
  ]);

  // Синхронный замок против двойного тапа по «Отправить»: даже если RN не
  // успел дезактивировать кнопку через canSend, второй вызов мгновенно вернётся.
  const handleSendInFlightRef = useRef(false);

  const handleSend = useCallback(async (text, files, captions, clearForm) => {
    if (handleSendInFlightRef.current) {
      if (__DEV__) {
        console.log('🚫 handleSend: проигнорирован двойной тап');
      }
      return;
    }

    const currentText = text.trim();
    const currentFiles = [...files];
    
    if (currentText.length === 0 && currentFiles.length === 0) {
      return;
    }

    handleSendInFlightRef.current = true;
    // Снимаем замок после короткого окна — этого достаточно, чтобы пережить
    // повторный onPress в рамках одного жеста, но не блокировать нормальную
    // последовательную отправку нескольких сообщений.
    setTimeout(() => {
      handleSendInFlightRef.current = false;
    }, 600);
    
    clearForm();
    stopTyping();
    
    if (currentFiles.length > 0) {
      sendImageMessages(currentFiles, currentText);
      return;
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
    sendContactMessage,
  };
};
