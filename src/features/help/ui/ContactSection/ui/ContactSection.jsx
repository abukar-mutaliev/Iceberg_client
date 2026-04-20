import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    InteractionManager
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
 * Объединенная секция для связи с менеджером и разработчиком
 */
export const ContactSection = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { currentUser } = useAuth();
    const { showError } = useCustomAlert();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    
    // Состояние для менеджера
    const [manager, setManager] = useState(null);
    const [loadingManager, setLoadingManager] = useState(false);
    const [errorManager, setErrorManager] = useState(null);
    const [chattingManager, setChattingManager] = useState(false);
    const isProcessingManagerRef = useRef(false);

    // Состояние для разработчика
    const [loadingDeveloper, setLoadingDeveloper] = useState(false);
    const [errorDeveloper, setErrorDeveloper] = useState(null);
    const isProcessingDeveloperRef = useRef(false);

    // Поиск менеджера района
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
            console.error('Ошибка при поиске менеджера:', err);
            setErrorManager('Не удалось найти менеджера');
        } finally {
            setLoadingManager(false);
        }
    }, [currentUser]);

    // Загрузка менеджера при монтировании
    useEffect(() => {
        if (currentUser?.client?.districtId) {
            findDistrictManager();
        } else {
            setErrorManager('Район не назначен');
        }
    }, [currentUser, findDistrictManager]);

        // Открытие/создание чата с менеджером
        const openChatWithManager = useCallback(async () => {
            console.log('🔘 Кнопка "Менеджер района" нажата', {
                isProcessing: isProcessingManagerRef.current,
                chattingManager,
                hasManager: !!manager,
                managerId: manager?.user?.id
            });
            
            // Защита от множественных нажатий
            if (isProcessingManagerRef.current || chattingManager || !manager) {
                console.warn('⚠️ Кнопка заблокирована:', {
                    isProcessing: isProcessingManagerRef.current,
                    chattingManager,
                    hasManager: !!manager
                });
                if (!manager) {
                    showError('Ошибка', 'Менеджер не найден');
                }
                return;
            }

        isProcessingManagerRef.current = true;
        setChattingManager(true);

        try {
            const managerUserId = manager.user?.id ?? manager.id;
            if (!managerUserId) {
                console.error('❌ ID менеджера не найден. Структура manager:', manager);
                throw new Error('ID менеджера не найден');
            }

            // Проверить существующий чат - загружаем свежий список комнат
            // Загружаем все чаты без фильтра, чтобы не пропустить существующий чат
            // getRooms уже возвращает только комнаты текущего пользователя
            const roomsResponse = await ChatApi.getRooms({ limit: 100 }); // Увеличиваем лимит и убираем фильтр type
            
            // Парсим ответ с учетом всех возможных структур
            const root = (roomsResponse && roomsResponse.data) ? roomsResponse.data : {};
            const dataNode = root?.data ?? root ?? {};
            let roomsRaw = Array.isArray(dataNode)
                ? dataNode
                : (dataNode.rooms ?? dataNode.items ?? dataNode.data ?? []);
            if (!Array.isArray(roomsRaw)) roomsRaw = [];

            // Обрабатываем комнаты - они могут быть обернуты в объект с полем room
            const rooms = roomsRaw.map((it) => {
                if (it && it.room && typeof it.room === 'object') {
                    const room = { ...it.room };
                    // Копируем дополнительные поля из внешнего объекта
                    if (it.unreadCount !== undefined) room.unreadCount = it.unreadCount;
                    if (it.unread !== undefined) room.unread = it.unread;
                    return room;
                }
                return it;
            }).filter(r => r && (r.id || r.roomId));
            
            // Убираем избыточное логирование, оставляем только важное
            
            // Ищем чат, где есть менеджер (getRooms уже фильтрует по текущему пользователю)
            // В DIRECT чате должно быть ровно 2 участника: текущий пользователь и менеджер
            const existingChat = rooms.find((room, index) => {
                // Получаем ID и type комнаты из разных возможных мест
                const roomId = room?.id ?? room?.roomId;
                const roomType = room?.type ?? room?.roomType;
                
                if (roomType !== 'DIRECT') {
                    return false;
                }
                
                // Проверяем всех возможных вариантов структуры participants
                const participants = room.participants ?? [];
                
                // Для DIRECT чата должно быть ровно 2 участника
                if (participants.length !== 2) {
                    return false;
                }
                
                // Проверяем, есть ли менеджер среди участников
                const hasManager = participants.some(p => {
                    const participantId = p?.userId ?? p?.user?.id ?? p?.id;
                    return participantId === managerUserId;
                });
                
                // Проверяем, есть ли текущий пользователь среди участников
                const hasCurrentUser = participants.some(p => {
                    const participantId = p?.userId ?? p?.user?.id ?? p?.id;
                    return participantId === currentUser?.id;
                });
                
                return hasManager && hasCurrentUser;
            });

            if (existingChat) {
                const chatId = existingChat?.id ?? existingChat?.roomId;
                if (!chatId) {
                    console.error('❌ Найден чат, но ID не определен:', existingChat);
                    throw new Error('Не удалось определить ID существующего чата');
                }
                
                const managerName = manager.name || manager.user?.email || 'Менеджер';
                
                // Находим userId другого участника (менеджера) для DirectChatScreen
                const otherParticipant = existingChat.participants?.find(p => {
                    const participantId = p?.userId ?? p?.user?.id ?? p?.id;
                    return participantId === managerUserId;
                });
                const otherUserId = otherParticipant?.userId ?? otherParticipant?.user?.id ?? managerUserId;
                
                // Убеждаемся, что передаем правильный roomId
                console.log('✅ Открываем существующий чат с менеджером:', {
                    roomId: chatId,
                    managerName,
                    managerUserId,
                    otherUserId,
                    currentUserId: currentUser?.id,
                    participants: existingChat.participants?.map(p => ({
                        userId: p?.userId,
                        user_id: p?.user?.id
                    }))
                });
                
                const navParams = {
                    roomId: parseInt(chatId), // Убеждаемся, что roomId - число
                    roomTitle: managerName,
                    userId: otherUserId, // Обязательный параметр для DirectChatScreen
                    currentUserId: currentUser?.id, // Тоже передаем для совместимости
                    fromScreen: 'HelpCenter'
                };
                
                console.log('🚀 Вызов navigation.navigate с параметрами:', JSON.stringify(navParams, null, 2));
                
                try {
                    // Используем корневой навигатор, как в ChatListScreen
                    const rootNavigation =
                        navigation?.getParent?.('AppStack') ||
                        navigation?.getParent?.()?.getParent?.() ||
                        navigation;
                    
                    console.log('🔍 Навигатор для ChatRoom:', {
                        hasRootNav: !!rootNavigation,
                        rootNavType: rootNavigation?.constructor?.name
                    });
                    
                    // Загружаем комнату в Redux перед навигацией
                    console.log('📥 Загружаем комнату в Redux перед навигацией, roomId:', chatId);
                    await dispatch(fetchRoom(parseInt(chatId)));
                    console.log('✅ Комната загружена в Redux');
                    
                    // Используем InteractionManager для плавной навигации, как в ChatListScreen
                    requestAnimationFrame(() => {
                        InteractionManager.runAfterInteractions(() => {
                            (rootNavigation || navigation).navigate('ChatRoom', navParams);
                            console.log('✅ navigation.navigate вызван успешно');
                            // Сбрасываем флаги после небольшой задержки, чтобы дать время экрану чата загрузиться
                            setTimeout(() => {
                                setChattingManager(false);
                                isProcessingManagerRef.current = false;
                            }, 300);
                        });
                    });
                } catch (navError) {
                    console.error('❌ Ошибка при навигации:', navError);
                    setChattingManager(false);
                    isProcessingManagerRef.current = false;
                    throw navError;
                }
                
                return;
            }

            // Создать новый чат
            const managerName = manager.name || manager.user?.email || 'Менеджер';
            const formData = new FormData();
            formData.append('type', 'DIRECT');
            formData.append('title', managerName);
            formData.append('members', JSON.stringify([managerUserId]));

            const response = await ChatApi.createRoom(formData);
            const room = response?.data?.room || response?.data?.data?.room;

            if (!room?.id) {
                throw new Error('Не удалось создать чат');
            }

            // Небольшая задержка, чтобы сервер успел добавить участников
            await new Promise(resolve => setTimeout(resolve, 500));

            // Загружаем полную информацию о чате после создания
            try {
                const fullRoomResponse = await ChatApi.getRoom(room.id);
                const fullRoom = fullRoomResponse?.data?.room || fullRoomResponse?.data?.data?.room || room;
                
                const finalRoomId = fullRoom.id || room.id;
                console.log('✅ Создан новый чат с менеджером:', {
                    roomId: finalRoomId,
                    managerName,
                    managerUserId
                });
                
                // Находим userId другого участника (менеджера) для DirectChatScreen
                const otherParticipant = fullRoom.participants?.find(p => {
                    const participantId = p?.userId ?? p?.user?.id ?? p?.id;
                    return participantId === managerUserId;
                });
                const otherUserId = otherParticipant?.userId ?? otherParticipant?.user?.id ?? managerUserId;
                
                const navParams = {
                    roomId: parseInt(finalRoomId),
                    roomTitle: managerName,
                    userId: otherUserId, // Обязательный параметр для DirectChatScreen
                    currentUserId: currentUser?.id,
                    fromScreen: 'HelpCenter'
                };
                
                // Используем корневой навигатор, как в ChatListScreen
                const rootNavigation =
                    navigation?.getParent?.('AppStack') ||
                    navigation?.getParent?.()?.getParent?.() ||
                    navigation;
                
                // Загружаем комнату в Redux перед навигацией
                console.log('📥 Загружаем комнату в Redux перед навигацией, roomId:', finalRoomId);
                await dispatch(fetchRoom(parseInt(finalRoomId)));
                console.log('✅ Комната загружена в Redux');
                
                requestAnimationFrame(() => {
                    InteractionManager.runAfterInteractions(() => {
                        (rootNavigation || navigation).navigate('ChatRoom', navParams);
                        // Сбрасываем флаги после небольшой задержки
                        setTimeout(() => {
                            setChattingManager(false);
                            isProcessingManagerRef.current = false;
                        }, 300);
                    });
                });
            } catch (err) {
                console.warn('Не удалось загрузить полную информацию о чате, используем базовую:', err);
                // Используем базовую информацию о чате
                // Находим userId другого участника (менеджера) для DirectChatScreen
                const otherParticipant = room.participants?.find(p => {
                    const participantId = p?.userId ?? p?.user?.id ?? p?.id;
                    return participantId === managerUserId;
                });
                const otherUserId = otherParticipant?.userId ?? otherParticipant?.user?.id ?? managerUserId;
                
                const navParams = {
                    roomId: parseInt(room.id),
                    roomTitle: managerName,
                    userId: otherUserId, // Обязательный параметр для DirectChatScreen
                    currentUserId: currentUser?.id,
                    fromScreen: 'HelpCenter'
                };
                
                const rootNavigation =
                    navigation?.getParent?.('AppStack') ||
                    navigation?.getParent?.()?.getParent?.() ||
                    navigation;
                
                requestAnimationFrame(() => {
                    InteractionManager.runAfterInteractions(() => {
                        (rootNavigation || navigation).navigate('ChatRoom', navParams);
                        // Сбрасываем флаги после небольшой задержки
                        setTimeout(() => {
                            setChattingManager(false);
                            isProcessingManagerRef.current = false;
                        }, 300);
                    });
                });
            }
        } catch (err) {
            console.error('❌ Ошибка при создании чата с менеджером:', err);
            showError('Ошибка', 'Не удалось открыть чат с менеджером. Попробуйте позже.');
            setChattingManager(false);
            isProcessingManagerRef.current = false;
        }
        // НЕ используем finally - флаги сбрасываются после успешной навигации или при ошибке
    }, [manager, navigation, showError, currentUser]);

    // Поиск разработчика и открытие чата
    const handleOpenDeveloperChat = useCallback(async () => {
        // Защита от множественных нажатий
        if (isProcessingDeveloperRef.current || loadingDeveloper) {
            return;
        }

        if (!currentUser?.id) {
            showError('Ошибка', 'Необходимо авторизоваться');
            return;
        }

        isProcessingDeveloperRef.current = true;
        setLoadingDeveloper(true);
        setErrorDeveloper(null);

        try {
            let developer = null;

            // Ищем разработчика по email
            try {
                const searchResponse = await ChatApi.searchUsers(DEVELOPER_EMAIL, 50);
                const users = searchResponse?.data?.users || 
                             searchResponse?.data?.data?.users ||
                             searchResponse?.data || 
                             [];
                
                if (Array.isArray(users)) {
                    developer = users.find(user => {
                        const email = user.email || user.user?.email;
                        return email && email.toLowerCase() === DEVELOPER_EMAIL.toLowerCase();
                    });
                }
            } catch (err) {
                console.warn('Поиск по email не дал результатов:', err);
            }

            // Если не нашли по email, пробуем поиск по части email
            if (!developer) {
                try {
                    const emailPart = DEVELOPER_EMAIL.split('@')[0];
                    const searchResponse = await ChatApi.searchUsers(emailPart, 50);
                    const users = searchResponse?.data?.users || 
                                 searchResponse?.data?.data?.users ||
                                 searchResponse?.data || 
                                 [];
                    
                    if (Array.isArray(users)) {
                        developer = users.find(user => {
                            const email = user.email || user.user?.email;
                            return email && email.toLowerCase().includes(DEVELOPER_EMAIL.toLowerCase());
                        });
                    }
                } catch (err) {
                    console.warn('Поиск по части email не дал результатов:', err);
                }
            }

            if (!developer) {
                throw new Error(`Разработчик с email ${DEVELOPER_EMAIL} не найден. Убедитесь, что пользователь существует в системе.`);
            }

            const developerUserId = developer.id || developer.userId;
            if (!developerUserId) {
                throw new Error('Не удалось определить ID разработчика');
            }

            // Проверяем существующий чат - загружаем свежий список комнат
            // Загружаем все чаты без фильтра, чтобы не пропустить существующий чат
            // getRooms уже возвращает только комнаты текущего пользователя
            const roomsResponse = await ChatApi.getRooms({ limit: 100 }); // Увеличиваем лимит и убираем фильтр type
            
            // Парсим ответ с учетом всех возможных структур
            const root = (roomsResponse && roomsResponse.data) ? roomsResponse.data : {};
            const dataNode = root?.data ?? root ?? {};
            let roomsRaw = Array.isArray(dataNode)
                ? dataNode
                : (dataNode.rooms ?? dataNode.items ?? dataNode.data ?? []);
            if (!Array.isArray(roomsRaw)) roomsRaw = [];

            // Обрабатываем комнаты - они могут быть обернуты в объект с полем room
            const rooms = roomsRaw.map((it) => {
                if (it && it.room && typeof it.room === 'object') {
                    const room = { ...it.room };
                    // Копируем дополнительные поля из внешнего объекта
                    if (it.unreadCount !== undefined) room.unreadCount = it.unreadCount;
                    if (it.unread !== undefined) room.unread = it.unread;
                    return room;
                }
                return it;
            }).filter(r => r && (r.id || r.roomId));

            // Ищем чат, где есть разработчик (getRooms уже фильтрует по текущему пользователю)
            // В DIRECT чате должно быть ровно 2 участника: текущий пользователь и разработчик
            const existingChat = rooms.find((room) => {
                // Получаем ID и type комнаты из разных возможных мест
                const roomId = room?.id ?? room?.roomId;
                const roomType = room?.type ?? room?.roomType;
                
                if (roomType !== 'DIRECT') {
                    return false;
                }
                
                // Проверяем всех возможных вариантов структуры participants
                const participants = room.participants ?? [];
                
                // Для DIRECT чата должно быть ровно 2 участника
                if (participants.length !== 2) {
                    return false;
                }
                
                // Проверяем, есть ли разработчик среди участников
                const hasDeveloper = participants.some(p => {
                    const participantId = p?.userId ?? p?.user?.id ?? p?.id;
                    return participantId === developerUserId;
                });
                
                // Проверяем, есть ли текущий пользователь среди участников
                const hasCurrentUser = participants.some(p => {
                    const participantId = p?.userId ?? p?.user?.id ?? p?.id;
                    return participantId === currentUser?.id;
                });
                
                return hasDeveloper && hasCurrentUser;
            });

            if (existingChat) {
                const chatId = existingChat?.id ?? existingChat?.roomId;
                if (!chatId) {
                    console.error('❌ Найден чат, но ID не определен:', existingChat);
                    throw new Error('Не удалось определить ID существующего чата');
                }
                
                const developerName = developer.name || 
                                    developer.displayName || 
                                    developer.client?.name ||
                                    developer.employee?.name ||
                                    developer.admin?.name ||
                                    developer.supplier?.companyName ||
                                    developer.driver?.name ||
                                    'Разработчик';
                
                // Убеждаемся, что передаем правильный roomId
                console.log('✅ Открываем существующий чат с разработчиком:', {
                    roomId: chatId,
                    developerName,
                    developerUserId,
                    participants: existingChat.participants?.map(p => ({
                        userId: p?.userId,
                        user_id: p?.user?.id
                    }))
                });
                
                const navParams = {
                    roomId: parseInt(chatId),
                    roomTitle: developerName,
                    roomData: existingChat,
                    fromScreen: 'HelpCenter'
                };
                
                // Используем корневой навигатор, как в ChatListScreen
                const rootNavigation =
                    navigation?.getParent?.('AppStack') ||
                    navigation?.getParent?.()?.getParent?.() ||
                    navigation;
                
                // Загружаем комнату в Redux перед навигацией
                console.log('📥 Загружаем комнату в Redux перед навигацией, roomId:', chatId);
                await dispatch(fetchRoom(parseInt(chatId)));
                console.log('✅ Комната загружена в Redux');
                
                requestAnimationFrame(() => {
                    InteractionManager.runAfterInteractions(() => {
                        (rootNavigation || navigation).navigate('ChatRoom', navParams);
                        // Сбрасываем флаги после небольшой задержки
                        setTimeout(() => {
                            setLoadingDeveloper(false);
                            isProcessingDeveloperRef.current = false;
                        }, 300);
                    });
                });
                
                return;
            }

            // Создаем новый чат
            const developerName = developer.name || 
                                developer.displayName || 
                                developer.client?.name ||
                                developer.employee?.name ||
                                developer.admin?.name ||
                                developer.supplier?.companyName ||
                                developer.driver?.name ||
                                'Разработчик';
            const formData = new FormData();
            formData.append('type', 'DIRECT');
            formData.append('title', developerName);
            formData.append('members', JSON.stringify([developerUserId]));

            const response = await ChatApi.createRoom(formData);
            const room = response?.data?.room || response?.data?.data?.room;

            if (!room?.id) {
                throw new Error('Не удалось создать чат');
            }

            // Небольшая задержка, чтобы сервер успел добавить участников
            await new Promise(resolve => setTimeout(resolve, 500));

            // Загружаем полную информацию о чате после создания
            try {
                const fullRoomResponse = await ChatApi.getRoom(room.id);
                const fullRoom = fullRoomResponse?.data?.room || fullRoomResponse?.data?.data?.room || room;
                
                const finalRoomId = fullRoom.id || room.id;
                console.log('✅ Создан новый чат с разработчиком:', {
                    roomId: finalRoomId,
                    developerName,
                    developerUserId
                });
                
                // Находим userId другого участника (разработчика) для DirectChatScreen
                const otherParticipant = fullRoom.participants?.find(p => {
                    const participantId = p?.userId ?? p?.user?.id ?? p?.id;
                    return participantId === developerUserId;
                });
                const otherUserId = otherParticipant?.userId ?? otherParticipant?.user?.id ?? developerUserId;
                
                const navParams = {
                    roomId: parseInt(finalRoomId),
                    roomTitle: developerName,
                    userId: otherUserId, // Обязательный параметр для DirectChatScreen
                    currentUserId: currentUser?.id,
                    fromScreen: 'HelpCenter'
                };
                
                const rootNavigation =
                    navigation?.getParent?.('AppStack') ||
                    navigation?.getParent?.()?.getParent?.() ||
                    navigation;
                
                // Загружаем комнату в Redux перед навигацией
                console.log('📥 Загружаем комнату в Redux перед навигацией, roomId:', finalRoomId);
                await dispatch(fetchRoom(parseInt(finalRoomId)));
                console.log('✅ Комната загружена в Redux');
                
                requestAnimationFrame(() => {
                    InteractionManager.runAfterInteractions(() => {
                        (rootNavigation || navigation).navigate('ChatRoom', navParams);
                        // Сбрасываем флаги после небольшой задержки
                        setTimeout(() => {
                            setLoadingDeveloper(false);
                            isProcessingDeveloperRef.current = false;
                        }, 300);
                    });
                });
            } catch (err) {
                console.warn('Не удалось загрузить полную информацию о чате, используем базовую:', err);
                // Используем базовую информацию о чате
                // Находим userId другого участника (разработчика) для DirectChatScreen
                const otherParticipant = room.participants?.find(p => {
                    const participantId = p?.userId ?? p?.user?.id ?? p?.id;
                    return participantId === developerUserId;
                });
                const otherUserId = otherParticipant?.userId ?? otherParticipant?.user?.id ?? developerUserId;
                
                const navParams = {
                    roomId: parseInt(room.id),
                    roomTitle: developerName,
                    userId: otherUserId, // Обязательный параметр для DirectChatScreen
                    currentUserId: currentUser?.id,
                    fromScreen: 'HelpCenter'
                };
                
                const rootNavigation =
                    navigation?.getParent?.('AppStack') ||
                    navigation?.getParent?.()?.getParent?.() ||
                    navigation;
                
                // Загружаем комнату в Redux перед навигацией
                console.log('📥 Загружаем комнату в Redux перед навигацией, roomId:', room.id);
                await dispatch(fetchRoom(parseInt(room.id)));
                console.log('✅ Комната загружена в Redux');
                
                requestAnimationFrame(() => {
                    InteractionManager.runAfterInteractions(() => {
                        (rootNavigation || navigation).navigate('ChatRoom', navParams);
                        // Сбрасываем флаги после небольшой задержки
                        setTimeout(() => {
                            setLoadingDeveloper(false);
                            isProcessingDeveloperRef.current = false;
                        }, 300);
                    });
                });
            }
        } catch (err) {
            console.error('Ошибка при открытии чата с разработчиком:', err);
            const errorMessage = err.message || 'Не удалось открыть чат с разработчиком. Попробуйте позже.';
            setErrorDeveloper(errorMessage);
            showError('Ошибка', errorMessage);
            setLoadingDeveloper(false);
            isProcessingDeveloperRef.current = false;
        }
        // НЕ используем finally - флаги сбрасываются после успешной навигации или при ошибке
    }, [currentUser, navigation, showError]);

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Связь и поддержка</Text>
            
            {/* Кнопки рядом */}
            <View style={styles.buttonsContainer}>
                {/* Кнопка менеджера */}
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
                        title={chattingManager ? "Открытие..." : "Менеджер района"}
                        onPress={() => {
                            console.log('🔘 CustomButton onPress вызван для менеджера', {
                                disabled: chattingManager || loadingManager || !manager,
                                chattingManager,
                                loadingManager,
                                hasManager: !!manager,
                                managerId: manager?.user?.id
                            });
                            if (!chattingManager && !loadingManager && manager) {
                                openChatWithManager();
                            } else {
                                console.warn('⚠️ Кнопка заблокирована, onPress не выполняется');
                            }
                        }}
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

                {/* Кнопка разработчика */}
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
                        title={loadingDeveloper ? "Поиск..." : "Разработчик"}
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
        // Высота кнопки CustomButton по умолчанию 53px (нормализованная)
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

