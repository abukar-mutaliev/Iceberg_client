import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import ChatApi from '@entities/chat/api/chatApi';
import { markAsRead, setActiveRoom } from '@entities/chat/model/slice';
import { selectRoomsList } from '@entities/chat/model/selectors';
import PushNotificationService from '@shared/services/PushNotificationService';
import { ASSISTANT_CHAT_TITLE } from '../constants';
import { isAssistantRoom } from '../lib/isAssistantRoom';
import {
    ASSISTANT_DRAFT_CACHE_KEY,
    getAssistantCacheKey,
    getCachedAssistantMessages,
    hasAssistantMessagesCache,
    migrateAssistantMessagesCache,
    setCachedAssistantMessages,
} from '../lib/assistantMessagesCache';

const genId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const WELCOME_MESSAGE = {
    id: 'welcome',
    role: 'assistant',
    content:
        'Ассаламу 1алейкум! Я помощник Iceberg. Спросите про остановки фургонов, товары, склады и т.д.',
};

const parseProductContent = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const mapServerMessage = (msg, currentUserId) => {
    const role = Number(msg.senderId) === Number(currentUserId) ? 'user' : 'assistant';
    if (msg.type === 'PRODUCT') {
        return {
            id: String(msg.id),
            role,
            type: 'product',
            product: parseProductContent(msg.content) || msg.product || null,
        };
    }
    return {
        id: String(msg.id),
        role,
        content: msg.content || '',
    };
};

const buildInitialMessages = (roomId) => {
    const cached = getCachedAssistantMessages(roomId);
    if (cached?.length) return cached;
    return roomId ? [] : [WELCOME_MESSAGE];
};

/**
 * Хук состояния диалога с ИИ-помощником.
 * Отправляет вопрос на сервер (БД → FAQ → GigaChat → оператор) и хранит локальную историю.
 * @param {number|string|null} roomId — id ASSISTANT-комнаты (из списка чатов)
 */
export const useAiAssistant = (roomId = null) => {
    const dispatch = useDispatch();
    const currentUserId = useSelector((s) => s.auth?.user?.id);
    const rooms = useSelector(selectRoomsList);

    const resolvedRoomId = roomId ?? rooms.find(isAssistantRoom)?.id ?? null;
    const cacheKeyRef = useRef(getAssistantCacheKey(resolvedRoomId));
    const fetchedRoomIdsRef = useRef(new Set());

    const [messages, setMessagesState] = useState(() => buildInitialMessages(resolvedRoomId));
    const [sending, setSending] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(
        () => Boolean(resolvedRoomId) && !hasAssistantMessagesCache(resolvedRoomId)
    );
    const [escalationSuggested, setEscalationSuggested] = useState(false);
    const roomIdRef = useRef(resolvedRoomId || null);

    const setMessages = useCallback((updater) => {
        setMessagesState((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            setCachedAssistantMessages(cacheKeyRef.current, next);
            return next;
        });
    }, []);

    useEffect(() => {
        cacheKeyRef.current = getAssistantCacheKey(resolvedRoomId);
        roomIdRef.current = resolvedRoomId || roomIdRef.current;
    }, [resolvedRoomId]);

    useEffect(() => {
        if (!resolvedRoomId || !currentUserId) {
            setLoadingHistory(false);
            return undefined;
        }

        const cacheKey = getAssistantCacheKey(resolvedRoomId);
        cacheKeyRef.current = cacheKey;

        if (hasAssistantMessagesCache(resolvedRoomId)) {
            setMessages(getCachedAssistantMessages(resolvedRoomId));
            setLoadingHistory(false);
            return undefined;
        }

        if (fetchedRoomIdsRef.current.has(cacheKey)) {
            setLoadingHistory(false);
            return undefined;
        }

        let cancelled = false;
        fetchedRoomIdsRef.current.add(cacheKey);
        setLoadingHistory(true);

        (async () => {
            try {
                const response = await ChatApi.getMessages(resolvedRoomId, { limit: 100 });
                const payload = response?.data?.data ?? response?.data ?? [];
                const raw = Array.isArray(payload)
                    ? payload
                    : (payload.items ?? payload.messages ?? []);

                if (cancelled || !Array.isArray(raw) || raw.length === 0) return;

                const sorted = [...raw].sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
                setMessages(sorted.map((msg) => mapServerMessage(msg, currentUserId)));
            } catch (error) {
                console.error('Ошибка загрузки истории ИИ-помощника:', error);
                fetchedRoomIdsRef.current.delete(cacheKey);
            } finally {
                if (!cancelled) setLoadingHistory(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [resolvedRoomId, currentUserId, setMessages]);

    useFocusEffect(
        useCallback(() => {
            if (!resolvedRoomId || !currentUserId) return undefined;

            dispatch(setActiveRoom(resolvedRoomId));
            PushNotificationService.setActiveChatRoomId(resolvedRoomId);
            PushNotificationService.clearChatNotifications(resolvedRoomId);

            const markAsReadTimeout = setTimeout(() => {
                dispatch(markAsRead({ roomId: resolvedRoomId, currentUserId }));
            }, 300);

            return () => {
                clearTimeout(markAsReadTimeout);
                dispatch(setActiveRoom(null));
                PushNotificationService.setActiveChatRoomId(null);
            };
        }, [resolvedRoomId, currentUserId, dispatch])
    );

    const sendQuestion = useCallback(async (text, attachment = null) => {
        const content = (text || '').trim();
        if (!content || sending) return;

        const product = attachment?.product || null;
        const productId = attachment?.productId || product?.id || product?.productId || null;

        const temporaryId = genId();
        const userMsg = { id: temporaryId, role: 'user', content };
        const placeholderId = `bot_${temporaryId}`;
        const productMsgId = `prod_${temporaryId}`;

        setEscalationSuggested(false);
        setMessages((prev) => [
            ...prev,
            ...(product ? [{ id: productMsgId, role: 'user', type: 'product', product }] : []),
            userMsg,
            { id: placeholderId, role: 'assistant', content: '', pending: true },
        ]);
        setSending(true);

        try {
            const response = await ChatApi.askAssistant(content, temporaryId, productId);
            const data = response?.data?.data || response?.data;
            const answer = data?.botMessage?.content || 'Не удалось получить ответ.';
            const newRoomId = data?.roomId || roomIdRef.current;

            if (newRoomId && cacheKeyRef.current === ASSISTANT_DRAFT_CACHE_KEY) {
                migrateAssistantMessagesCache(null, newRoomId);
                cacheKeyRef.current = getAssistantCacheKey(newRoomId);
                fetchedRoomIdsRef.current.add(cacheKeyRef.current);
            }

            roomIdRef.current = newRoomId || roomIdRef.current;
            setEscalationSuggested(Boolean(data?.escalationSuggested));

            const serverProductId = data?.productMessage?.id;
            setMessages((prev) =>
                prev.map((m) => {
                    if (m.id === placeholderId) {
                        return { id: data?.botMessage?.id || placeholderId, role: 'assistant', content: answer };
                    }
                    if (m.id === productMsgId && serverProductId) {
                        return { ...m, id: String(serverProductId) };
                    }
                    return m;
                })
            );

            if (newRoomId && currentUserId) {
                dispatch(markAsRead({ roomId: newRoomId, currentUserId }));
            }
        } catch (error) {
            console.error('Ошибка ИИ-помощника:', error);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === placeholderId
                        ? {
                              id: placeholderId,
                              role: 'assistant',
                              content: 'Не удалось получить ответ. Попробуйте позже.',
                              error: true,
                          }
                        : m
                )
            );
            setEscalationSuggested(true);
        } finally {
            setSending(false);
        }
    }, [sending, setMessages, currentUserId, dispatch]);

    return {
        messages,
        sending,
        loadingHistory,
        escalationSuggested,
        sendQuestion,
        roomId: resolvedRoomId,
        title: ASSISTANT_CHAT_TITLE,
    };
};
