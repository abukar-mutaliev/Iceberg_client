/**
 * Утилиты для работы с сообщениями
 */

const parseJsonContent = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const unwrapProductData = (data) => {
  if (!data || typeof data !== 'object') return null;
  if (data.product && typeof data.product === 'object') return data.product;
  if (data.data?.product && typeof data.data.product === 'object') return data.data.product;
  if (data.item?.product && typeof data.item.product === 'object') return data.item.product;
  return data;
};

export const parseProductFromMessage = (message) => {
  if (!message) return null;

  if (message.product && typeof message.product === 'object') {
    const fromProductField = unwrapProductData({ product: message.product });
    if (fromProductField?.name || fromProductField?.productId || fromProductField?.id) {
      return fromProductField;
    }
  }

  const parsed = parseJsonContent(message.content);
  if (parsed) {
    const product = unwrapProductData(parsed);
    if (product?.name || product?.productId || product?.id) {
      return product;
    }
  }

  return null;
};

/**
 * Текст превью последнего сообщения в списке чатов.
 */
export const getChatListMessagePreview = (message) => {
  const preview = {
    messageContent: 'Сообщение',
    isStopMessage: false,
    isVoiceMessage: false,
    isWarehouseMessage: false,
    isContactMessage: false,
    isImageMessage: false,
  };

  if (!message) return preview;

  const type = String(message.type || '').toUpperCase();

  if (type === 'IMAGE') {
    preview.isImageMessage = true;
    preview.messageContent = 'Изображение';
    return preview;
  }

  if (type === 'PRODUCT') {
    preview.messageContent = parseProductFromMessage(message)?.name || 'Товар';
    return preview;
  }

  if (type === 'STOP') {
    preview.isStopMessage = true;
    preview.messageContent = 'Остановка';
    return preview;
  }

  if (type === 'WAREHOUSE') {
    preview.isWarehouseMessage = true;
    let warehouseName = 'Склад';
    try {
      if (message.warehouse?.name) {
        warehouseName = message.warehouse.name;
      } else {
        const warehouseData = parseJsonContent(message.content);
        if (warehouseData?.name) {
          warehouseName = warehouseData.name;
        }
      }
    } catch {
      // дефолтное название
    }
    preview.messageContent = warehouseName;
    return preview;
  }

  if (type === 'VOICE') {
    preview.isVoiceMessage = true;
    preview.messageContent = 'Голосовое сообщение';
    return preview;
  }

  if (type === 'CONTACT') {
    preview.isContactMessage = true;
    preview.messageContent = 'Контакт';
    return preview;
  }

  const product = parseProductFromMessage(message);
  if (product?.name) {
    preview.messageContent = product.name;
    return preview;
  }

  if (message.content && String(message.content).trim()) {
    preview.messageContent = String(message.content).trim();
  }

  return preview;
};

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
        const data = parseProductFromMessage(message) || message.product || JSON.parse(message.content);
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
