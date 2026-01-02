import { useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Platform, Vibration, Clipboard } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  sendProduct,
  sendVoice,
  sendImages,
  sendText,
  sendPoll,
  deleteMessage,
  deleteRoom,
  cancelFailedMessage,
  fetchMessages,
} from '@entities/chat/model/slice';
import ChatApi from '@entities/chat/api/chatApi';
import { useChatSocketActions } from '@entities/chat/hooks/useChatSocketActions';

/**
 * Хук для всех действий в чате
 * Все функции мемоизированы для стабильных ссылок
 */
export const useChatActions = ({
  roomId,
  currentUserId,
  messages,
  isSuperAdmin,
  showError,
  showWarning,
  showConfirm,
  navigation,
}) => {
  const dispatch = useDispatch();
  const { emitToggleReaction } = useChatSocketActions();
  const retryingMessagesRef = useRef(new Set());
  
  // ============ PERMISSIONS ============
  
  const canDeleteMessage = useCallback((message) => {
    if (!message || isSuperAdmin) return isSuperAdmin;
    return Number(message.senderId) === Number(currentUserId);
  }, [isSuperAdmin, currentUserId]);
  
  // ============ MESSAGE ACTIONS ============
  
  const handleRetryMessage = useCallback(async (message, setRetryingMessages) => {
    if (!message?.temporaryId) return;
    
    const temporaryId = message.temporaryId;
    setRetryingMessages(prev => new Set(prev).add(temporaryId));
    
    try {
      if (message.type === 'VOICE') {
        const voiceAttachment = message?.attachments?.find(att => att.type === 'VOICE');
        if (!voiceAttachment) throw new Error('Голосовое вложение не найдено');
        
        const voiceData = {
          uri: voiceAttachment.path,
          duration: voiceAttachment.duration,
          type: voiceAttachment.mimeType,
          size: voiceAttachment.size,
          waveform: voiceAttachment.waveform || []
        };
        
        await dispatch(sendVoice({ 
          roomId, 
          voice: voiceData, 
          temporaryId,
          retryCount: 0 
        })).unwrap();
      } else if (message.type === 'IMAGE') {
        const imageAttachments = message?.attachments?.filter(att => att.type === 'IMAGE') || [];
        if (imageAttachments.length === 0) throw new Error('Изображения не найдены');
        
        const files = imageAttachments.map(att => ({
          uri: att.path,
          type: att.mimeType || 'image/jpeg',
          size: att.size,
          name: att.path?.split('/').pop() || `image_${Date.now()}.jpg`
        }));
        
        const captions = imageAttachments.map(att => att.caption || '');
        
        await dispatch(sendImages({ 
          roomId, 
          files, 
          captions,
          temporaryId,
          retryCount: 0 
        })).unwrap();
      } else if (message.type === 'TEXT') {
        if (!message.content) throw new Error('Содержимое сообщения не найдено');
        
        await dispatch(sendText({ 
          roomId, 
          content: message.content,
          temporaryId,
          replyToId: message.replyToId || null,
          retryCount: 0 
        })).unwrap();
      } else if (message.type === 'POLL') {
        if (!message.poll && !message.content) throw new Error('Данные опроса не найдены');
        
        const pollData = message.poll || {
          question: message.content,
          options: message.pollOptions || [],
          allowMultiple: message.allowMultiple || false
        };
        
        await dispatch(sendPoll({ 
          roomId, 
          pollData,
          temporaryId,
          replyToId: message.replyToId || null,
          retryCount: 0 
        })).unwrap();
      } else {
        throw new Error('Неподдерживаемый тип сообщения для повтора');
      }
    } catch (error) {
      console.error('Ошибка при повторной отправке:', error);
      showError('Ошибка', 'Не удалось отправить сообщение');
    } finally {
      setRetryingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(temporaryId);
        return newSet;
      });
    }
  }, [dispatch, roomId, showError]);
  
  const handleCancelMessage = useCallback((message) => {
    if (!message?.temporaryId) return;
    
    showConfirm(
      'Отменить отправку',
      'Удалить это сообщение?',
      () => {
        dispatch(cancelFailedMessage({ 
          temporaryId: message.temporaryId, 
          roomId 
        }));
      }
    );
  }, [dispatch, roomId, showConfirm]);
  
  const handleDeleteMessages = useCallback(async (messagesToDelete, forAll) => {
    if (messagesToDelete.length === 0) return;

    try {
      if (forAll) {
        const canDeleteForAll = isSuperAdmin || 
          messagesToDelete.every(msg => Number(msg.senderId) === Number(currentUserId));
        
        if (!canDeleteForAll) {
          showError('Ошибка', 'Недостаточно прав для удаления этих сообщений у всех');
          return;
        }
      }
      
      const results = await Promise.allSettled(
        messagesToDelete.map(msg => 
          dispatch(deleteMessage({ messageId: msg.id, forAll, currentUserId }))
        )
      );
      
      const successCount = results.filter(r => 
        r.status === 'fulfilled' && r.value?.type?.endsWith('/fulfilled')
      ).length;
      const failCount = results.length - successCount;

      setTimeout(() => dispatch(fetchMessages({roomId, limit: 100})), 100);
      
      if (failCount > 0) {
        showWarning('Частичное удаление', `Удалено: ${successCount}, не удалось: ${failCount}`);
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка при удалении:', error);
      showError('Ошибка', 'Не удалось удалить сообщения');
      return false;
    }
  }, [dispatch, currentUserId, roomId, showWarning, showError, isSuperAdmin]);
  
  const handleCopyMessages = useCallback((messageIds) => {
    if (messageIds.length === 0) return;

    const selectedArray = messageIds
      .map(id => messages.find(m => m.id === id))
      .filter(Boolean)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const textParts = selectedArray.map(msg => {
      switch (msg.type) {
        case 'TEXT': return msg.content || '';
        case 'IMAGE': 
          return msg.content || msg.text || msg.caption || 
                 msg.attachments?.find(a => a.caption)?.caption || '[Изображение]';
        case 'VOICE': return '[Голосовое сообщение]';
        case 'PRODUCT':
          try {
            const data = msg.product || JSON.parse(msg.content);
            return data?.name || '[Товар]';
          } catch { return '[Товар]'; }
        case 'STOP':
          try {
            const data = msg.stop || JSON.parse(msg.content);
            return data?.address || '[Остановка]';
          } catch { return '[Остановка]'; }
        case 'POLL': return msg.poll?.question || '[Опрос]';
        case 'SYSTEM': return msg.content || '';
        default: return msg.content || '[Сообщение]';
      }
    }).filter(Boolean);

    if (textParts.length === 0) {
      showWarning('Копирование', 'Нечего копировать');
      return;
    }

    Clipboard.setString(textParts.join('\n'));
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Vibration.vibrate(10);
    }
  }, [messages, showWarning]);
  
  const handleForwardMessage = useCallback(async (messageIds, targetRoomIds) => {
    if (messageIds.length === 0) return;

    try {
      for (const messageId of messageIds) {
        await ChatApi.forwardMessage(messageId, targetRoomIds);
      }
      
      return true;
    } catch (error) {
      console.error('Error forwarding message:', error);
      showError('Ошибка пересылки', error.message || 'Не удалось переслать сообщение');
      return false;
    }
  }, [showError]);
  
  // ============ REACTIONS ============
  
  const handleToggleReaction = useCallback(async (messageId, emoji) => {
    try {
      await emitToggleReaction(messageId, emoji);
    } catch (error) {
      console.error('Error toggling reaction:', error);
      showError('Ошибка', 'Не удалось изменить реакцию');
    }
  }, [emitToggleReaction, showError]);
  
  // ============ ROOM ACTIONS ============
  
  const handleDeleteChat = useCallback(async () => {
    try {
      const result = await dispatch(deleteRoom({roomId}));
      if (result.error) throw new Error(result.error);
      return true;
    } catch (error) {
      console.error('Ошибка при удалении чата:', error);
      showError('Ошибка', 'Не удалось удалить чат');
      return false;
    }
  }, [roomId, dispatch, showError]);
  
  return {
    // Permissions
    canDeleteMessage,
    
    // Message actions
    handleRetryMessage,
    handleCancelMessage,
    handleDeleteMessages,
    handleCopyMessages,
    handleForwardMessage,
    
    // Reactions
    handleToggleReaction,
    
    // Room actions
    handleDeleteChat,
  };
};