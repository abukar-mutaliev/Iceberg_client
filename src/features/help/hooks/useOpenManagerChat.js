import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ChatApi from '@entities/chat/api/chatApi';

const SUPPORT_TITLE = 'Поддержка Iceberg';

const extractSupportRoom = (response) => (
    response?.data?.room
    || response?.data?.data?.room
    || response?.data
    || null
);

const fetchSupportRoom = async (includeAssistantHistory) => {
    const response = includeAssistantHistory
        ? await ChatApi.handoffAssistantToSupport()
        : await ChatApi.openSupportRoom();
    const room = extractSupportRoom(response);

    if (!room?.id) {
        throw new Error('Не удалось открыть чат поддержки');
    }

    return room;
};

export const fetchOfficialSupportRoom = async () => fetchSupportRoom(false);

const findChatRoomNavigator = (navigation) => {
    let nav = navigation;
    while (nav) {
        const routeNames = nav.getState?.()?.routeNames;
        if (Array.isArray(routeNames) && routeNames.includes('ChatRoom')) {
            return nav;
        }
        nav = nav.getParent?.();
    }
    return navigation;
};

const uniqueOrderIds = (orderIds) => [...new Set(
    (Array.isArray(orderIds) ? orderIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
)];

const postSupportOrderCards = async (roomId, orderIds) => {
    for (const orderId of uniqueOrderIds(orderIds)) {
        try {
            const form = new FormData();
            form.append('type', 'ORDER');
            form.append('orderId', String(orderId));
            form.append('temporaryId', `support-order-${roomId}-${orderId}-${Date.now()}`);
            await ChatApi.sendMessage(roomId, form);
        } catch (error) {
            console.error('Не удалось отправить карточку заказа в поддержку:', error);
        }
    }
};

export const navigateToOfficialSupport = async (navigation, fromScreen, { orderIds, includeAssistantHistory = false } = {}) => {
    const room = await fetchSupportRoom(includeAssistantHistory);
    await postSupportOrderCards(room.id, orderIds);
    const target = findChatRoomNavigator(navigation);

    target.navigate('ChatRoom', {
        roomId: room.id,
        roomTitle: room.title || SUPPORT_TITLE,
        roomData: room,
        roomType: 'GROUP',
        fromScreen,
    });

    return room;
};

export const useOpenManagerChat = (fromScreen = 'HelpCenter') => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);

    const openManagerChat = useCallback(async (orderIds, options = {}) => {
        setLoading(true);
        try {
            const includeAssistantHistory = options?.includeAssistantHistory === true;
            await navigateToOfficialSupport(navigation, fromScreen, { orderIds, includeAssistantHistory });
        } catch (error) {
            console.error('Ошибка при открытии чата поддержки:', error);
            Alert.alert(
                'Ошибка',
                'Не удалось открыть официальную поддержку. Попробуйте позже.',
            );
        } finally {
            setLoading(false);
        }
    }, [navigation, fromScreen]);

    const reportOffAppPayment = useCallback(async () => {
        setLoading(true);
        try {
            const room = await navigateToOfficialSupport(navigation, fromScreen);
            await ChatApi.reportOffAppPayment({
                roomId: room.id,
                comment: 'Клиент сообщил, что сотрудник просит оплату мимо приложения',
            });
            Alert.alert(
                'Жалоба отправлена',
                'Мы проверим переписку. Оплачивайте заказ только в приложении.',
            );
        } catch (error) {
            console.error('Ошибка жалобы на оплату мимо приложения:', error);
            Alert.alert('Ошибка', 'Не удалось отправить жалобу. Попробуйте позже.');
        } finally {
            setLoading(false);
        }
    }, [navigation, fromScreen]);

    return { openManagerChat, reportOffAppPayment, loading };
};
