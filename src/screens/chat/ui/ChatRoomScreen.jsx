import React, {useMemo} from 'react';
import {useSelector} from 'react-redux';
import {DirectChatScreen} from './DirectChatScreen';
import {GroupChatScreen} from './GroupChatScreen';

/**
 * Роутер для чатов - определяет тип комнаты и рендерит соответствующий компонент
 */
export const ChatRoomScreen = ({route, navigation}) => {
    const {roomId, roomType: routeRoomType} = route.params;

    // Получаем данные комнаты из Redux
    const roomDataRaw = useSelector((s) => s.chat?.rooms?.byId?.[roomId]);
    const roomData = roomDataRaw?.room ? roomDataRaw.room : roomDataRaw;

    // Мемоизируем определение типа комнаты для стабильности рендеринга
    const normalizedRoomType = useMemo(() => {
        const roomType = roomData?.type || routeRoomType || 'DIRECT';
        return String(roomType).toUpperCase().trim();
    }, [roomData?.type, routeRoomType]);

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

