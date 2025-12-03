import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Image} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Компонент для отображения превью сообщения, на которое отвечаем
 * @param {Object} replyTo - Объект сообщения, на которое отвечаем
 * @param {Function} onCancel - Функция для отмены ответа
 * @param {Function} onPress - Функция для прокрутки к оригинальному сообщению
 * @param {boolean} isInMessage - Флаг отображения внутри сообщения (не в Composer)
 * @param {number} currentUserId - ID текущего пользователя для определения своих сообщений
 */
export const ReplyPreview = ({replyTo, onCancel, onPress, isInMessage = false, currentUserId}) => {
  if (!replyTo) return null;

  const getSenderName = () => {
    // Если это свое сообщение, показываем "Вы"
    if (currentUserId && replyTo.senderId === currentUserId) {
      return 'Вы';
    }
    
    if (!replyTo.sender) return 'Пользователь';
    
    const sender = replyTo.sender;
    return sender.client?.name ||
           sender.admin?.name ||
           sender.employee?.name ||
           sender.supplier?.contactPerson ||
           sender.email?.split('@')[0] ||
           'Пользователь';
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
      case 'POLL':
        return '📊 Опрос';
      default:
        return replyTo.content || '';
    }
  };

  const hasImage = replyTo.attachments && replyTo.attachments.length > 0 && 
                   replyTo.attachments[0].type === 'IMAGE';
  const imageUrl = hasImage ? replyTo.attachments[0].path : null;

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

