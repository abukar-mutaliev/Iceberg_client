/**
 * Проверяет, достаточно ли данных в lastMessage для превью и рендера (STOP, IMAGE и т.д.).
 * API /rooms часто отдаёт урезанный снимок — без attachments, stop, product.
 */
export function needsLastMessageHydration(message) {
  if (!message?.id) return true;

  const type = String(message.type || '').toUpperCase();

  if (type === 'STOP') {
    if (message.stop && typeof message.stop === 'object') {
      const stopId = message.stop.id ?? message.stop.stopId;
      if (stopId != null) return false;
    }
    if (typeof message.content === 'string' && message.content.trim()) {
      try {
        const parsed = JSON.parse(message.content);
        if (parsed && (parsed.stopId != null || parsed.id != null || parsed.address)) {
          return false;
        }
      } catch {
        return true;
      }
    }
    return true;
  }

  if (type === 'IMAGE' || type === 'VOICE') {
    return !Array.isArray(message.attachments) || message.attachments.length === 0;
  }

  if (type === 'PRODUCT') {
    if (message.product?.id || message.productId) return false;
    const content = message.content;
    if (typeof content === 'string' && content.trim()) {
      // Сервер уже отдал человекочитаемое превью (не сырой JSON)
      if (!content.trim().startsWith('{')) return false;
      try {
        const parsed = JSON.parse(content);
        if (parsed?.name || parsed?.productId || parsed?.id) return false;
      } catch {
        return true;
      }
    }
    return true;
  }

  if (type === 'WAREHOUSE') {
    if (message.warehouse && typeof message.warehouse === 'object' && message.warehouse.name) {
      return false;
    }
    if (typeof message.content === 'string' && message.content.trim()) {
      try {
        const parsed = JSON.parse(message.content);
        if (parsed?.name) return false;
      } catch {
        return true;
      }
    }
    return true;
  }

  if (type === 'POLL') {
    return !message.poll?.id;
  }

  if (Array.isArray(message.attachments) && message.attachments.length > 0) {
    return message.attachments.some((attachment) => !attachment?.path);
  }

  return false;
}

/** Объединяет store-сообщение и server lastMessage, сохраняя «богатые» поля. */
export function mergeChatMessagePayload(existing, incoming) {
  if (!existing) return incoming || null;
  if (!incoming) return existing;

  const storeNeedsHydration = needsLastMessageHydration(existing);
  const incomingNeedsHydration = needsLastMessageHydration(incoming);

  let base = existing;
  let overlay = incoming;

  if (storeNeedsHydration && !incomingNeedsHydration) {
    base = incoming;
    overlay = existing;
  } else if (!storeNeedsHydration && incomingNeedsHydration) {
    base = existing;
    overlay = incoming;
  }

  return {
    ...base,
    ...overlay,
    attachments: overlay.attachments?.length ? overlay.attachments : base.attachments,
    stop: overlay.stop || base.stop,
    product: overlay.product || base.product,
    warehouse: overlay.warehouse || base.warehouse,
    poll: overlay.poll || base.poll,
    content:
      (overlay.content?.length || 0) >= (base.content?.length || 0)
        ? overlay.content
        : (base.content || overlay.content),
    sender: overlay.sender || base.sender,
    senderId: overlay.senderId ?? base.senderId,
    status: overlay.status || base.status,
    deliveredAt: overlay.deliveredAt || base.deliveredAt,
    readAt: overlay.readAt || base.readAt,
  };
}

export function prioritizeRoomsForLastMessageHydration(rooms) {
  const score = (room) => {
    const type = String(room?.type || '').toUpperCase();
    if (type === 'BROADCAST') return 3;
    if (type === 'GROUP') return 2;
    return 1;
  };

  return [...rooms].sort((a, b) => score(b) - score(a));
}
