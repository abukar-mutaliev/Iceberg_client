const messagesCache = new Map();

export const ASSISTANT_DRAFT_CACHE_KEY = 'draft';

export const getAssistantCacheKey = (roomId) =>
    roomId ? String(roomId) : ASSISTANT_DRAFT_CACHE_KEY;

export const getCachedAssistantMessages = (roomId) =>
    messagesCache.get(getAssistantCacheKey(roomId));

export const setCachedAssistantMessages = (roomId, messages) => {
    messagesCache.set(getAssistantCacheKey(roomId), messages);
};

export const migrateAssistantMessagesCache = (fromRoomId, toRoomId) => {
    const fromKey = getAssistantCacheKey(fromRoomId);
    const toKey = getAssistantCacheKey(toRoomId);
    if (fromKey === toKey) return;
    const cached = messagesCache.get(fromKey);
    if (cached) {
        messagesCache.set(toKey, cached);
        messagesCache.delete(fromKey);
    }
};

export const hasAssistantMessagesCache = (roomId) => {
    const cached = getCachedAssistantMessages(roomId);
    return Array.isArray(cached) && cached.length > 0;
};
