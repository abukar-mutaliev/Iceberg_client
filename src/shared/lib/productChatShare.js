/**
 * Правила отправки карточки товара в чат (сервер отклоняет неодобренные товары).
 * @param {object|null|undefined} product
 * @returns {string|null} Текст причины на русском или null, если отправка разрешена
 */
export function getProductChatShareBlockReason(product) {
    if (!product || product.id == null) {
        return 'Товар недоступен';
    }

    const status =
        product.moderationStatus != null
            ? String(product.moderationStatus).toUpperCase().trim()
            : '';

    if (status === 'PENDING') {
        return 'Товар на модерации. После одобрения его можно будет отправить в чат.';
    }
    if (status === 'REJECTED') {
        return 'Товар отклонён модерацией и не может быть отправлен в чат.';
    }
    if (product.isActive === false) {
        return 'Товар сейчас недоступен и не может быть отправлен в чат.';
    }
    if (status && status !== 'APPROVED') {
        return 'Этот товар нельзя отправить в чат.';
    }

    return null;
}

export function canShareProductInChat(product) {
    return getProductChatShareBlockReason(product) == null;
}
