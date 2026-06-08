import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { employeeApiMethods } from '@entities/user/api/userApi';
import ChatApi from '@entities/chat/api/chatApi';

const navigateToManagerChat = async ({ manager, navigation, fromScreen }) => {
    const managerUserId = manager.user?.id;
    if (!managerUserId) {
        throw new Error('ID менеджера не найден');
    }

    const managerName = manager.name || manager.user?.email || 'Менеджер';
    const roomsResponse = await ChatApi.getRooms({ type: 'DIRECT' });
    const rooms = roomsResponse?.data?.rooms || [];

    const existingChat = rooms.find((room) => {
        if (room?.type !== 'DIRECT') return false;
        return room.participants?.some(
            (participant) => (participant?.userId ?? participant?.user?.id) === managerUserId
        );
    });

    if (existingChat) {
        navigation.navigate('ChatRoom', {
            roomId: existingChat.id,
            roomTitle: managerName,
            roomData: existingChat,
            fromScreen,
        });
        return;
    }

    const formData = new FormData();
    formData.append('type', 'DIRECT');
    formData.append('title', managerName);
    formData.append('members', JSON.stringify([managerUserId]));

    const response = await ChatApi.createRoom(formData);
    const room = response?.data?.room || response?.data?.data?.room;

    if (!room?.id) {
        throw new Error('Не удалось создать чат');
    }

    navigation.navigate('ChatRoom', {
        roomId: room.id,
        roomTitle: managerName,
        roomData: room,
        fromScreen,
    });
};

export const useOpenManagerChat = (fromScreen = 'HelpCenter') => {
    const navigation = useNavigation();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);

    const openManagerChat = useCallback(async () => {
        const districtId = currentUser?.client?.districtId;

        if (!districtId) {
            Alert.alert(
                'Район не назначен',
                'Обратитесь в службу поддержки для назначения района.',
            );
            return;
        }

        setLoading(true);

        try {
            const response = await employeeApiMethods.getDistrictManager(districtId);
            const manager = response?.data?.manager;

            if (!manager) {
                Alert.alert(
                    'Менеджер недоступен',
                    'Менеджер вашего района временно недоступен. Попробуйте позже.',
                );
                return;
            }

            await navigateToManagerChat({ manager, navigation, fromScreen });
        } catch (error) {
            console.error('Ошибка при открытии чата с менеджером:', error);
            Alert.alert(
                'Ошибка',
                'Не удалось открыть чат с менеджером. Попробуйте позже.',
            );
        } finally {
            setLoading(false);
        }
    }, [currentUser?.client?.districtId, navigation, fromScreen]);

    return { openManagerChat, loading };
};
