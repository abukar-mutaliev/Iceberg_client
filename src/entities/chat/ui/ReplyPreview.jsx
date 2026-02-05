import React, { useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {View, Text, TouchableOpacity, StyleSheet, Image} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getImageUrl } from '@shared/api/api';

/**
 * Компонент для отображения превью сообщения, на которое отвечаем
 * @param {Object} replyTo - Объект сообщения, на которое отвечаем
 * @param {Function} onCancel - Функция для отмены ответа
 * @param {Function} onPress - Функция для прокрутки к оригинальному сообщению
 * @param {boolean} isInMessage - Флаг отображения внутри сообщения (не в Composer)
 * @param {number} currentUserId - ID текущего пользователя для определения своих сообщений
 * @param {Object} participantsById - Дополнительные данные о участниках чата (для DirectChat)
 * @param {Array} participants - Массив участников комнаты (для GroupChat)
 */
export const ReplyPreview = ({
  replyTo,
  onCancel,
  onPress,
  isInMessage = false,
  currentUserId,
  participantsById,
  participants
}) => {
  if (!replyTo) return null;

  const participantsByIdFromStore = useSelector((s) => s.chat?.participants?.byUserId || {});
  const resolvedParticipantsById = participantsById || participantsByIdFromStore;
  const resolvedParticipants = participants || [];
  const activeRoomId = useSelector((s) => s.chat?.activeRoomId || null);
  const roomDataRaw = useSelector((s) => (activeRoomId ? s.chat?.rooms?.byId?.[activeRoomId] : null));
  const roomData = roomDataRaw?.room || roomDataRaw;
  const roomParticipants = roomData?.participants || [];

  useEffect(() => {
    if (__DEV__) {
      console.log('[ReplyPreview] replyTo.sender', {
        replyToId: replyTo?.id,
        senderId: replyTo?.senderId,
        sender: replyTo?.sender,
      });
    }
  }, [replyTo?.id, replyTo?.senderId, replyTo?.sender, activeRoomId]);

  const getNameFromUser = (user) => {
    if (!user) return null;
    const name = user.client?.name ||
                 user.admin?.name ||
                 user.employee?.name ||
                 user.supplier?.contactPerson ||
                 user.driver?.name ||
                 user.name ||
                 user.profile?.name ||
                 user.firstName ||
                 user.profile?.firstName;
    if (name) return name;
    if (user.email) return user.email.split('@')[0];
    return null;
  };

  const getSenderName = () => {
    const normalizedCurrentUserId = currentUserId != null ? Number(currentUserId) : null;
    const normalizedSenderId = replyTo?.senderId != null ? Number(replyTo.senderId) : null;
    
    // Если это свое сообщение, показываем "Вы"
    if (normalizedCurrentUserId != null && normalizedSenderId != null && normalizedSenderId === normalizedCurrentUserId) {
      return 'Вы';
    }

    // Проверяем данные из replyTo.sender
    if (replyTo.sender) {
      const senderName = getNameFromUser(replyTo.sender);
      if (senderName) return senderName;
    }

    // Для DIRECT: используем title комнаты как имя собеседника
    if (roomData?.type === 'DIRECT' && roomData?.title && normalizedSenderId !== normalizedCurrentUserId) {
      const trimmedTitle = String(roomData.title).trim();
      if (trimmedTitle && trimmedTitle !== 'Чат' && trimmedTitle !== 'Водитель') {
        return trimmedTitle;
      }
    }

    // Ищем дополнительные данные в participantsById (для DirectChat)
    if (resolvedParticipantsById && normalizedSenderId != null) {
      const participantData = resolvedParticipantsById[normalizedSenderId] || resolvedParticipantsById[String(replyTo.senderId)];
      if (participantData) {
        const participant = participantData.user || participantData;
        const participantName = getNameFromUser(participant);
        if (participantName) return participantName;
      }
    }

    // Ищем дополнительные данные в массиве participants (для GroupChat)
    if (resolvedParticipants && Array.isArray(resolvedParticipants) && normalizedSenderId != null) {
      const participant = resolvedParticipants.find(p =>
        Number(p?.userId ?? p?.user?.id ?? p?.id) === normalizedSenderId
      );

      if (participant) {
        const user = participant.user || participant;
        const userName = getNameFromUser(user);
        if (userName) return userName;
      }
    }

    // Фолбэк: участники комнаты из Redux
    if (roomParticipants && Array.isArray(roomParticipants) && normalizedSenderId != null) {
      const participant = roomParticipants.find(p =>
        Number(p?.userId ?? p?.user?.id ?? p?.id) === normalizedSenderId
      );
      if (participant) {
        const user = participant.user || participant;
        const userName = getNameFromUser(user);
        if (userName) return userName;
      }
    }

    // Fallback: пытаемся извлечь из senderId или показываем "Пользователь"
    return 'Пользователь';
  };

  const getMessagePreview = () => {
    if (replyTo.isDeletedForAll) {
      return 'Сообщение удалено';
    }

    switch (replyTo.type) {
      case 'TEXT':
        return replyTo.content || '';
      case 'IMAGE':
        return '📷 Изображение';
      case 'VOICE':
        return '🎤 Голосовое сообщение';
      case 'PRODUCT':
        try {
          const productData = JSON.parse(replyTo.content || '{}');
          return `🛍️ ${productData.name || 'Товар'}`;
        } catch {
          return '🛍️ Товар';
        }
      case 'STOP':
        return '📍 Остановка';
      case 'CONTACT': {
        try {
          const contactData = JSON.parse(replyTo.content || '{}');
          const contactName = contactData?.name ||
            contactData?.user?.name ||
            contactData?.userName;
          return `👤 ${contactName || 'Контакт'}`;
        } catch {
          return '👤 Контакт';
        }
      }
      case 'WAREHOUSE': {
        try {
          const warehouseData = replyTo.warehouse || JSON.parse(replyTo.content || '{}');
          const warehouseName = warehouseData?.name || warehouseData?.title;
          return `🏭 ${warehouseName || 'Склад'}`;
        } catch {
          return '🏭 Склад';
        }
      }
      case 'POLL':
        return '📊 Опрос';
      default:
        return replyTo.content || '';
    }
  };

  // Проверяем наличие изображения в attachments (для IMAGE сообщений)
  const hasImageAttachment = replyTo.attachments && replyTo.attachments.length > 0 && 
                              replyTo.attachments[0].type === 'IMAGE';
  
  // Проверяем наличие изображения остановки (для STOP сообщений)
  const hasStopPhoto = replyTo.type === 'STOP' && (
    replyTo.stop?.photo || 
    (replyTo.content && (() => {
      try {
        const stopData = JSON.parse(replyTo.content);
        return stopData?.photo;
      } catch {
        return null;
      }
    })())
  );
  
  const hasImage = hasImageAttachment || hasStopPhoto;
  
  // Нормализуем URL изображения через getImageUrl (включая замену старых IP-адресов)
  const imageUrl = useMemo(() => {
    if (hasImageAttachment && replyTo.attachments[0].path) {
      return getImageUrl(replyTo.attachments[0].path);
    }
    if (hasStopPhoto) {
      const stopPhoto = replyTo.stop?.photo || 
                       (replyTo.content && (() => {
                         try {
                           const stopData = JSON.parse(replyTo.content);
                           return stopData?.photo;
                         } catch {
                           return null;
                         }
                       })());
      return stopPhoto ? getImageUrl(stopPhoto) : null;
    }
    return null;
  }, [hasImageAttachment, hasStopPhoto, replyTo.attachments, replyTo.stop, replyTo.content]);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isInMessage && styles.containerInMessage,
        !isInMessage && styles.containerInComposer,
        replyTo.isDeletedForAll && styles.deletedContainer
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.leftBorder} />
      
      <View style={styles.content}>
        <Text style={styles.senderName} numberOfLines={1}>
          {getSenderName()}
        </Text>
        <View style={styles.messageRow}>
          <Text
            style={[
              styles.messagePreview,
              replyTo.isDeletedForAll && styles.deletedText
            ]}
            numberOfLines={2}
          >
            {getMessagePreview()}
          </Text>
          
          {imageUrl && !replyTo.isDeletedForAll && (
            <Image
              source={{uri: imageUrl}}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          )}
        </View>
      </View>

      {!isInMessage && onCancel && (
        <TouchableOpacity
          onPress={onCancel}
          style={styles.cancelButton}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
          <Icon name="close" size={20} color="#666" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'transparent', // Прозрачный фон, т.к. контейнер в Composer задает фон
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 180,
    borderRadius: 0, // Без скругления, т.к. контейнер в Composer задает скругление
    marginBottom: 0, // Без отступа снизу
  },
  containerInMessage: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  deletedContainer: {
    opacity: 0.6,
  },
  leftBorder: {
    width: 3,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messagePreview: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  deletedText: {
    fontStyle: 'italic',
    color: '#999',
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginLeft: 8,
  },
  cancelButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

