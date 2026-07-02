import { useState, useCallback } from 'react';
import { Alert, InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useAuth } from '@entities/auth/hooks/useAuth';
import ChatApi from '@entities/chat/api/chatApi';
import { fetchRoom } from '@entities/chat/model/slice';

const DEVELOPER_EMAIL = 'abukar.mutaliev.js@gmail.com';

/** Ищет пользователя-разработчика по email (с фолбэком по локальной части). */
const findDeveloperUser = async () => {
    const extractUsers = (searchResponse) => (
        searchResponse?.data?.users
        || searchResponse?.data?.data?.users
        || searchResponse?.data
        || []
    );

    try {
        const users = extractUsers(await ChatApi.searchUsers(DEVELOPER_EMAIL, 50));
        if (Array.isArray(users)) {
            const found = users.find((user) => {
                const email = user.email || user.user?.email;
                return email && email.toLowerCase() === DEVELOPER_EMAIL.toLowerCase();
            });
            if (found) return found;
        }
    } catch (err) {
        if (__DEV__) console.warn('Поиск разработчика по email не дал результатов:', err);
    }

    try {
        const emailPart = DEVELOPER_EMAIL.split('@')[0];
        const users = extractUsers(await ChatApi.searchUsers(emailPart, 50));
        if (Array.isArray(users)) {
            return users.find((user) => {
                const email = user.email || user.user?.email;
                return email && email.toLowerCase().includes(DEVELOPER_EMAIL.toLowerCase());
            }) || null;
        }
    } catch (err) {
        if (__DEV__) console.warn('Поиск разработчика по части email не дал результатов:', err);
    }

    return null;
};

const resolveDeveloperName = (developer) => (
    developer.name
    || developer.displayName
    || developer.client?.name
    || developer.employee?.name
    || developer.admin?.name
    || developer.supplier?.companyName
    || developer.driver?.name
    || 'Разработчик'
);

/**
 * Открывает DIRECT-чат с разработчиком приложения.
 * Комната НЕ создаётся, пока пользователь не отправит первое сообщение
 * (навигация в черновой чат с draftPeer) — тот же паттерн, что в ContactSection.
 * @param {string} fromScreen — экран-источник для навигации назад
 */
export const useOpenDeveloperChat = (fromScreen = 'Assistant') => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);

    const getRootNavigation = useCallback(() => (
        navigation?.getParent?.('AppStack')
        || navigation?.getParent?.()?.getParent?.()
        || navigation
    ), [navigation]);

    const findExistingDirectChat = useCallback(async (peerUserId) => {
        const roomsResponse = await ChatApi.getRooms({ limit: 100 });
        const root = (roomsResponse && roomsResponse.data) ? roomsResponse.data : {};
        const dataNode = root?.data ?? root ?? {};
        let roomsRaw = Array.isArray(dataNode)
            ? dataNode
            : (dataNode.rooms ?? dataNode.items ?? dataNode.data ?? []);
        if (!Array.isArray(roomsRaw)) roomsRaw = [];

        const rooms = roomsRaw
            .map((it) => {
                if (it && it.room && typeof it.room === 'object') {
                    return { ...it.room };
                }
                return it;
            })
            .filter((r) => r && (r.id || r.roomId));

        const currentUserId = currentUser?.id;

        return rooms.find((room) => {
            const roomType = room?.type ?? room?.roomType;
            if (roomType !== 'DIRECT') return false;

            const participants = Array.isArray(room.participants) ? room.participants : [];
            if (participants.length !== 2) return false;

            const hasPeer = participants.some((p) => {
                const id = p?.userId ?? p?.user?.id ?? p?.id;
                return id === peerUserId;
            });
            const hasCurrentUser = participants.some((p) => {
                const id = p?.userId ?? p?.user?.id ?? p?.id;
                return id === currentUserId;
            });

            return hasPeer && hasCurrentUser;
        });
    }, [currentUser?.id]);

    const openDeveloperChat = useCallback(async () => {
        if (loading) return;
        if (!currentUser?.id) {
            Alert.alert('Ошибка', 'Необходимо авторизоваться');
            return;
        }

        setLoading(true);
        try {
            const developer = await findDeveloperUser();
            if (!developer) {
                throw new Error('Разработчик временно недоступен. Попробуйте позже.');
            }

            const developerUserId = developer.id || developer.userId;
            if (!developerUserId) throw new Error('Не удалось определить ID разработчика');

            const developerName = resolveDeveloperName(developer);
            const developerRole = developer.role || developer.user?.role || 'ADMIN';
            const developerAvatar = developer.avatar || developer.user?.avatar || null;

            const existingChat = await findExistingDirectChat(developerUserId);
            const rootNavigation = getRootNavigation();

            const navParams = existingChat
                ? {
                    roomId: parseInt(existingChat.id ?? existingChat.roomId, 10),
                    roomTitle: developerName,
                    roomData: existingChat,
                    currentUserId: currentUser?.id,
                    fromScreen,
                }
                : {
                    roomId: null,
                    roomTitle: developerName,
                    roomType: 'DIRECT',
                    fromScreen,
                    currentUserId: currentUser?.id,
                    draftPeerUserId: developerUserId,
                    draftPeer: {
                        id: developerUserId,
                        name: developerName,
                        role: developerRole,
                        avatar: developerAvatar,
                        lastSeenAt: developer.lastSeenAt || developer.user?.lastSeenAt,
                        isOnline: developer.isOnline || developer.user?.isOnline,
                    },
                };

            if (existingChat) {
                await dispatch(fetchRoom(navParams.roomId));
            }

            requestAnimationFrame(() => {
                InteractionManager.runAfterInteractions(() => {
                    (rootNavigation || navigation).navigate('ChatRoom', navParams);
                });
            });
        } catch (err) {
            if (__DEV__) console.warn('Ошибка при открытии чата с разработчиком:', err);
            Alert.alert('Ошибка', err.message || 'Не удалось открыть чат с разработчиком. Попробуйте позже.');
        } finally {
            setLoading(false);
        }
    }, [
        loading,
        currentUser?.id,
        findExistingDirectChat,
        getRootNavigation,
        navigation,
        dispatch,
        fromScreen,
    ]);

    return { openDeveloperChat, loading };
};
