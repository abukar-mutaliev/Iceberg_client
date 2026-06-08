import React, {useMemo} from 'react';
import {useSelector} from 'react-redux';
import {DirectChatScreen} from './DirectChatScreen';
import {GroupChatScreen} from './GroupChatScreen';

/**
 * Роутер для чатов - определяет тип комнаты и рендерит соответствующий компонент
 */
export const ChatRoomScreen = ({route, navigation}) => {
    const {roomId, roomType: routeRoomType, draftPeerUserId} = route.params;

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

    // Мемоизируем выбор компонента - избегаем переключения между компонентами
    const isGroupChat = useMemo(() => {
        return normalizedRoomType === 'GROUP' || normalizedRoomType === 'BROADCAST';
    }, [normalizedRoomType]);

    // Всегда рендерим компонент сразу, без условной загрузки
    // Это предотвращает дергание анимации при переключении между состояниями
    if (isGroupChat) {
        return <GroupChatScreen route={route} navigation={navigation} />;
    }

    // По умолчанию рендерим DirectChatScreen (для DIRECT и если тип не определен)
    return <DirectChatScreen route={route} navigation={navigation} />;
};

