/**
 * Утилиты для работы с сообщениями
 */

/**
 * Форматирует текст сообщения для копирования
 */
export const formatMessageForCopy = (message) => {
  switch (message.type) {
    case 'TEXT': 
      return message.content || '';
    case 'IMAGE': 
      return message.content || message.text || message.caption || 
             message.attachments?.find(a => a.caption)?.caption || '[Изображение]';
    case 'VOICE': 
      return '[Голосовое сообщение]';
    case 'PRODUCT':
      try {
        const data = message.product || JSON.parse(message.content);
        return data?.name || '[Товар]';
      } catch { 
        return '[Товар]'; 
      }
    case 'STOP':
      try {
        const data = message.stop || JSON.parse(message.content);
        return data?.address || '[Остановка]';
      } catch { 
        return '[Остановка]'; 
      }
    case 'POLL': 
      return message.poll?.question || '[Опрос]';
    case 'SYSTEM': 
      return message.content || '';
    default: 
      return message.content || '[Сообщение]';
  }
};
