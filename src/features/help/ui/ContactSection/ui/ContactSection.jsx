import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Platform,
    InteractionManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { FontFamily } from '@app/styles/GlobalStyles';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';
import { employeeApiMethods } from '@entities/user/api/userApi';
import ChatApi from '@entities/chat/api/chatApi';
import { fetchRoom } from '@entities/chat/model/slice';
import CustomButton from '@shared/ui/Button/CustomButton';
import Icon from 'react-native-vector-icons/MaterialIcons';

const DEVELOPER_EMAIL = 'abukar.mutaliev.js@gmail.com';

/**
 * Объединённая секция для связи с менеджером района и разработчиком.
 *
 * Открытие чата НЕ создаёт комнату на сервере, пока пользователь не напишет
 * первое сообщение. Если чата нет — навигируем в черновой DIRECT-чат (
 * `roomId: null` + `draftPeerUserId` + `draftPeer`), DirectChatScreen
 * создаст комнату через ensureRoomId при отправке (тот же паттерн, что в
 * ChatSearchScreen). Это защищает собеседника от спама пустыми чатами.
 */
export const ContactSection = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { currentUser } = useAuth();
    const { showError } = useCustomAlert();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

    // Менеджер
    const [manager, setManager] = useState(null);
    const [loadingManager, setLoadingManager] = useState(false);
    const [errorManager, setErrorManager] = useState(null);
    const [chattingManager, setChattingManager] = useState(false);
    const isProcessingManagerRef = useRef(false);

    // Разработчик
    const [loadingDeveloper, setLoadingDeveloper] = useState(false);
    const [errorDeveloper, setErrorDeveloper] = useState(null);
    const isProcessingDeveloperRef = useRef(false);

    // --- Хелперы -----------------------------------------------------------

    const getRootNavigation = useCallback(() => (
        navigation?.getParent?.('AppStack') ||
        navigation?.getParent?.()?.getParent?.() ||
        navigation
    ), [navigation]);

    /** Ищет существующий DIRECT-чат с указанным пользователем. */
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
                    const room = { ...it.room };
                    if (it.unreadCount !== undefined) room.unreadCount = it.unreadCount;
                    if (it.unread !== undefined) room.unread = it.unread;
                    return room;
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

    /** Навигация в уже существующий чат. */
    const navigateToExistingChat = useCallback(async ({ existingChat, peerUserId, peerName }) => {
        const chatId = existingChat?.id ?? existingChat?.roomId;
        if (!chatId) {
            throw new Error('Не удалось определить ID существующего чата');
        }

        const otherParticipant = existingChat.participants?.find((p) => {
            const id = p?.userId ?? p?.user?.id ?? p?.id;
            return id === peerUserId;
        });
        const otherUserId = otherParticipant?.userId ?? otherParticipant?.user?.id ?? peerUserId;

        const rootNavigation = getRootNavigation();

        await dispatch(fetchRoom(parseInt(chatId, 10)));

        const navParams = {
            roomId: parseInt(chatId, 10),
            roomTitle: peerName,
            userId: otherUserId,
            currentUserId: currentUser?.id,
            roomData: existingChat,
            fromScreen: 'HelpCenter',
        };

        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                InteractionManager.runAfterInteractions(() => {
                    (rootNavigation || navigation).navigate('ChatRoom', navParams);
                    resolve();
                });
            });
        });
    }, [navigation, getRootNavigation, dispatch, currentUser?.id]);

    /** Навигация в черновой чат (комната будет создана при отправке первого сообщения). */
    const navigateToDraftChat = useCallback(({ peerUserId, peerName, peerRole, peerAvatar, peerMeta }) => {
        const rootNavigation = getRootNavigation();
        const navParams = {
            roomId: null,
            roomTitle: peerName,
            roomType: 'DIRECT',
            fromScreen: 'HelpCenter',
            currentUserId: currentUser?.id,
            draftPeerUserId: peerUserId,
            draftPeer: {
                id: peerUserId,
                name: peerName,
                role: peerRole,
                avatar: peerAvatar || null,
                lastSeenAt: peerMeta?.lastSeenAt,
                isOnline: peerMeta?.isOnline,
            },
        };

        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                InteractionManager.runAfterInteractions(() => {
                    (rootNavigation || navigation).navigate('ChatRoom', navParams);
                    resolve();
                });
            });
        });
    }, [navigation, getRootNavigation, currentUser?.id]);

    // --- Менеджер ----------------------------------------------------------

    const findDistrictManager = useCallback(async () => {
        if (!currentUser?.client?.districtId) {
            setErrorManager('Район не назначен');
            return;
        }

        setLoadingManager(true);
        setErrorManager(null);

        try {
            const districtId = currentUser.client.districtId;
            const response = await employeeApiMethods.getDistrictManager(districtId);
            const managerData = response?.data?.manager;

            if (!managerData) {
                setErrorManager('Менеджер временно недоступен');
                setManager(null);
                return;
            }

            setManager(managerData);
        } catch (err) {
            if (__DEV__) console.warn('Ошибка при поиске менеджера:', err);
            setErrorManager('Не удалось найти менеджера');
        } finally {
            setLoadingManager(false);
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser?.client?.districtId) {
            findDistrictManager();
        } else {
            setErrorManager('Район не назначен');
        }
    }, [currentUser, findDistrictManager]);

    const openChatWithManager = useCallback(async () => {
        if (isProcessingManagerRef.current || chattingManager) return;
        if (!manager) {
            showError('Ошибка', 'Менеджер не найден');
            return;
        }

        isProcessingManagerRef.current = true;
        setChattingManager(true);

        const finalize = () => {
            setTimeout(() => {
                setChattingManager(false);
                isProcessingManagerRef.current = false;
            }, 300);
        };

        try {
            const managerUserId = manager.user?.id ?? manager.id;
            if (!managerUserId) throw new Error('ID менеджера не найден');

            const managerName = manager.name || manager.user?.email || 'Менеджер';
            const managerRole = manager.user?.role || manager.role || 'EMPLOYEE';
            const managerAvatar = manager.avatar || manager.user?.avatar || null;

            const existingChat = await findExistingDirectChat(managerUserId);

            if (existingChat) {
                await navigateToExistingChat({
                    existingChat,
                    peerUserId: managerUserId,
                    peerName: managerName,
                });
            } else {
                // Комнату НЕ создаём, пока пользователь не напишет первое сообщение.
                await navigateToDraftChat({
                    peerUserId: managerUserId,
                    peerName: managerName,
                    peerRole: managerRole,
                    peerAvatar: managerAvatar,
                    peerMeta: {
                        lastSeenAt: manager.user?.lastSeenAt,
                        isOnline: manager.user?.isOnline,
                    },
                });
            }

            finalize();
        } catch (err) {
            if (__DEV__) console.warn('Ошибка при открытии чата с менеджером:', err);
            showError('Ошибка', 'Не удалось открыть чат с менеджером. Попробуйте позже.');
            setChattingManager(false);
            isProcessingManagerRef.current = false;
        }
    }, [
        manager,
        chattingManager,
        findExistingDirectChat,
        navigateToExistingChat,
        navigateToDraftChat,
        showError,
    ]);

    // --- Разработчик -------------------------------------------------------

    const findDeveloperUser = useCallback(async () => {
        // Сначала ищем по полному email
        try {
            const searchResponse = await ChatApi.searchUsers(DEVELOPER_EMAIL, 50);
            const users = searchResponse?.data?.users
                || searchResponse?.data?.data?.users
                || searchResponse?.data
                || [];
            if (Array.isArray(users)) {
                const found = users.find((user) => {
                    const email = user.email || user.user?.email;
                    return email && email.toLowerCase() === DEVELOPER_EMAIL.toLowerCase();
                });
                if (found) return found;
            }
        } catch (err) {
            if (__DEV__) console.warn('Поиск по email не дал результатов:', err);
        }

        // Фолбэк — поиск по локальной части email
        try {
            const emailPart = DEVELOPER_EMAIL.split('@')[0];
            const searchResponse = await ChatApi.searchUsers(emailPart, 50);
            const users = searchResponse?.data?.users
                || searchResponse?.data?.data?.users
                || searchResponse?.data
                || [];
            if (Array.isArray(users)) {
                return users.find((user) => {
                    const email = user.email || user.user?.email;
                    return email && email.toLowerCase().includes(DEVELOPER_EMAIL.toLowerCase());
                }) || null;
            }
        } catch (err) {
            if (__DEV__) console.warn('Поиск по части email не дал результатов:', err);
        }

        return null;
    }, []);

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

    const handleOpenDeveloperChat = useCallback(async () => {
        if (isProcessingDeveloperRef.current || loadingDeveloper) return;

        if (!currentUser?.id) {
            showError('Ошибка', 'Необходимо авторизоваться');
            return;
        }

        isProcessingDeveloperRef.current = true;
        setLoadingDeveloper(true);
        setErrorDeveloper(null);

        const finalize = () => {
            setTimeout(() => {
                setLoadingDeveloper(false);
                isProcessingDeveloperRef.current = false;
            }, 300);
        };

        try {
            const developer = await findDeveloperUser();
            if (!developer) {
                throw new Error(
                    `Разработчик с email ${DEVELOPER_EMAIL} не найден. Убедитесь, что пользователь существует в системе.`
                );
            }

            const developerUserId = developer.id || developer.userId;
            if (!developerUserId) throw new Error('Не удалось определить ID разработчика');

            const developerName = resolveDeveloperName(developer);
            const developerRole = developer.role || developer.user?.role || 'ADMIN';
            const developerAvatar = developer.avatar || developer.user?.avatar || null;

            const existingChat = await findExistingDirectChat(developerUserId);

            if (existingChat) {
                await navigateToExistingChat({
                    existingChat,
                    peerUserId: developerUserId,
                    peerName: developerName,
                });
            } else {
                // Комнату НЕ создаём, пока пользователь не напишет первое сообщение.
                await navigateToDraftChat({
                    peerUserId: developerUserId,
                    peerName: developerName,
                    peerRole: developerRole,
                    peerAvatar: developerAvatar,
                    peerMeta: {
                        lastSeenAt: developer.lastSeenAt || developer.user?.lastSeenAt,
                        isOnline: developer.isOnline || developer.user?.isOnline,
                    },
                });
            }

            finalize();
        } catch (err) {
            if (__DEV__) console.warn('Ошибка при открытии чата с разработчиком:', err);
            const errorMessage = err.message || 'Не удалось открыть чат с разработчиком. Попробуйте позже.';
            setErrorDeveloper(errorMessage);
            showError('Ошибка', errorMessage);
            setLoadingDeveloper(false);
            isProcessingDeveloperRef.current = false;
        }
    }, [
        currentUser?.id,
        loadingDeveloper,
        findDeveloperUser,
        findExistingDirectChat,
        navigateToExistingChat,
        navigateToDraftChat,
        showError,
    ]);

    // --- Render ------------------------------------------------------------

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Связь и поддержка</Text>

            <View style={styles.buttonsContainer}>
                {/* Менеджер */}
                <View style={styles.buttonWrapper}>
                    {loadingManager && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    )}
                    {errorManager && !loadingManager && (
                        <View style={styles.errorBadge}>
                            <Icon name="error-outline" size={16} color={colors.error} />
                        </View>
                    )}
                    <CustomButton
                        title={chattingManager ? 'Открытие...' : 'Менеджер района'}
                        onPress={openChatWithManager}
                        outlined={false}
                        color={colors.primary}
                        activeColor={colors.menuItemActiveText}
                        disabled={chattingManager || loadingManager || !manager}
                        style={styles.button}
                    />
                    {manager && !loadingManager && !errorManager && (
                        <Text style={styles.buttonSubtext}>
                            {manager.name || 'Менеджер'}
                        </Text>
                    )}
                </View>

                {/* Разработчик */}
                <View style={styles.buttonWrapper}>
                    {loadingDeveloper && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    )}
                    {errorDeveloper && !loadingDeveloper && (
                        <View style={styles.errorBadge}>
                            <Icon name="error-outline" size={16} color={colors.error} />
                        </View>
                    )}
                    <CustomButton
                        title={loadingDeveloper ? 'Поиск...' : 'Разработчик'}
                        onPress={handleOpenDeveloperChat}
                        outlined={false}
                        color={colors.primary}
                        activeColor={colors.menuItemActiveText}
                        disabled={loadingDeveloper}
                        style={styles.button}
                    />
                    <Text style={styles.buttonSubtext}>
                        Вопросы по приложению
                    </Text>
                </View>
            </View>
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        paddingHorizontal: normalize(20),
        paddingTop: normalize(16),
        paddingBottom: normalize(24),
        backgroundColor: colors.background,
    },
    sectionTitle: {
        fontSize: normalizeFont(22),
        fontWeight: '600',
        color: colors.textPrimary,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(20),
    },
    buttonsContainer: {
        flexDirection: 'row',
        gap: normalize(12),
    },
    buttonWrapper: {
        flex: 1,
        position: 'relative',
    },
    button: {
        width: '100%',
    },
    buttonSubtext: {
        fontSize: normalizeFont(12),
        color: colors.textSecondary,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginTop: normalize(6),
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: normalize(53),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isDark
            ? 'rgba(14, 15, 20, 0.7)'
            : 'rgba(255, 255, 255, 0.7)',
        borderRadius: normalize(12),
        zIndex: 1,
    },
    errorBadge: {
        position: 'absolute',
        top: normalize(-8),
        right: normalize(-8),
        backgroundColor: colors.surface,
        borderRadius: normalize(12),
        padding: normalize(4),
        zIndex: 2,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.5 : 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
});
