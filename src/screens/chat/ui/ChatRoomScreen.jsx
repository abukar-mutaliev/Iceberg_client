import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSelector } from 'react-redux';
import ChatApi from '@entities/chat/api/chatApi';
import { isAssistantRoom } from '@features/ai-assistant';
import { buildAssistantChatTabParams } from '@features/ai-assistant/lib/assistantNavigation';
import { DirectChatScreen } from './DirectChatScreen';
import { GroupChatScreen } from './GroupChatScreen';

/**
 * Роутер для чатов - определяет тип комнаты и рендерит соответствующий компонент
 */
export const ChatRoomScreen = ({route, navigation}) => {
    const {roomId, roomType: routeRoomType, draftPeerUserId} = route.params;
    const redirectedRef = useRef(false);
    const [assistantCheckDone, setAssistantCheckDone] = useState(!roomId);

    // Получаем данные комнаты из Redux
    const roomDataRaw = useSelector((s) => (roomId ? s.chat?.rooms?.byId?.[roomId] : null));
    const roomData = roomDataRaw?.room ? roomDataRaw.room : roomDataRaw;

    // Мемоизируем определение типа комнаты для стабильности рендеринга
    const normalizedRoomType = useMemo(() => {
        // В черновом режиме (без roomId, но есть draftPeerUserId) это всегда DIRECT
        if (!roomId && draftPeerUserId) return 'DIRECT';
        const roomType = roomData?.type || routeRoomType || 'DIRECT';
        return String(roomType).toUpperCase().trim();
    }, [roomId, draftPeerUserId, roomData?.type, routeRoomType]);

    const isAssistantChat = useMemo(() => {
        if (normalizedRoomType === 'ASSISTANT') return true;
        return isAssistantRoom(roomData);
    }, [normalizedRoomType, roomData]);

    useEffect(() => {
        if (!roomId || redirectedRef.current) return undefined;

        let cancelled = false;

        const redirectToAssistant = () => {
            if (cancelled || redirectedRef.current) return;
            redirectedRef.current = true;
            navigation.replace('Main', {
                screen: 'ChatList',
                params: buildAssistantChatTabParams({
                    roomId,
                    fromScreen: route.params?.fromNotification ? 'Notification' : 'ChatRoom',
                    messageId: route.params?.messageId ?? null,
                }),
            });
        };

        const resolveAssistantRoom = async () => {
            if (isAssistantChat) {
                redirectToAssistant();
                return;
            }

            if (normalizedRoomType !== 'DIRECT' || routeRoomType || roomData?.type) {
                setAssistantCheckDone(true);
                return;
            }

            try {
                const response = await ChatApi.getRoom(roomId);
                const fetchedRoom = response?.data?.data ?? response?.data;
                if (isAssistantRoom(fetchedRoom)) {
                    redirectToAssistant();
                    return;
                }
            } catch (_) {
                /* ignore — откроем обычный чат */
            }

            if (!cancelled) setAssistantCheckDone(true);
        };

        resolveAssistantRoom();

        return () => {
            cancelled = true;
        };
    }, [
        roomId,
        isAssistantChat,
        normalizedRoomType,
        routeRoomType,
        roomData?.type,
        navigation,
        route.params?.fromNotification,
        route.params?.messageId,
    ]);

    // Мемоизируем выбор компонента - избегаем переключения между компонентами
    const isGroupChat = useMemo(() => {
        return normalizedRoomType === 'GROUP' || normalizedRoomType === 'BROADCAST';
    }, [normalizedRoomType]);

    if (roomId && (!assistantCheckDone || isAssistantChat)) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="small" />
            </View>
        );
    }

    // Всегда рендерим компонент сразу, без условной загрузки
    // Это предотвращает дергание анимации при переключении между состояниями
    if (isGroupChat) {
        return <GroupChatScreen route={route} navigation={navigation} />;
    }

    // По умолчанию рендерим DirectChatScreen (для DIRECT и если тип не определен)
    return <DirectChatScreen route={route} navigation={navigation} />;
};
