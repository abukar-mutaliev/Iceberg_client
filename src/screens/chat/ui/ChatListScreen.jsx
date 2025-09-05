import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {View, FlatList, TouchableOpacity, Text, StyleSheet, RefreshControl, Image} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {fetchRooms, setActiveRoom, loadRoomsCache, fetchRoom, fetchMessages} from '@entities/chat/model/slice';
import {fetchProductById} from '@entities/product/model/slice';
import {selectRoomsList} from '@entities/chat/model/selectors';
import {selectProductsById} from '@entities/product/model/selectors';

import {getBaseUrl} from '@shared/api/api';

// Исправленный компонент для отображения галочек статуса сообщения
const StatusTicks = React.memo(({status}) => {
    // Отладочная информация для диагностики обновления статуса
    if (__DEV__) {
        console.log('🚀 ChatList StatusTicks COMPONENT RENDERED:', {
            status,
            normalizedStatus: status?.toUpperCase(),
            willShowBlueTicks: status === 'READ' || status === 'read',
            willShowGrayTicks: status === 'DELIVERED' || status === 'delivered',
            willShowOneTick: status === 'SENT' || !status
        });
    }

    // Нормализуем статус для правильной обработки
    const normalizedStatus = status?.toUpperCase?.() || status;

    // Исправленная логика - проверяем оба варианта
    if (normalizedStatus === 'READ' || normalizedStatus === 'read') {
        if (__DEV__) {
            console.log('✅ StatusTicks: RENDERING BLUE TICKS for status:', status);
        }
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick, styles.tickRead]}>✓</Text>
                <Text style={[styles.tick, styles.tickRead]}>✓</Text>
            </View>
        );
    }
    if (normalizedStatus === 'DELIVERED' || normalizedStatus === 'delivered') {
        if (__DEV__) {
            console.log('✅ StatusTicks: RENDERING GRAY TICKS for status:', status);
        }
        return (
            <View style={styles.ticksContainer}>
                <Text style={styles.tick}>✓</Text>
                <Text style={styles.tick}>✓</Text>
            </View>
        );
    }
    if (normalizedStatus === 'SENT') {
        if (__DEV__) {
            console.log('✅ StatusTicks: RENDERING ONE GRAY TICK for status:', status);
        }
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick]}>✓</Text>
            </View>
        );
    }

    // Default case - одна серая галочка
    if (__DEV__) {
        console.log('✅ StatusTicks: RENDERING DEFAULT ONE GRAY TICK for status:', status);
    }
    return (
        <View style={styles.ticksContainer}>
            <Text style={[styles.tick]}>✓</Text>
        </View>
    );
});

export const ChatListScreen = ({navigation}) => {
    const dispatch = useDispatch();
    const rooms = useSelector(selectRoomsList) || [];
    const loading = useSelector((s) => s.chat?.rooms?.loading);
    const currentUserId = useSelector((s) => s.auth?.user?.id);
    const participantsById = useSelector((s) => s.chat?.participants?.byUserId || {});
    const productsById = useSelector(selectProductsById);
    const page = useSelector((s) => s.chat?.rooms?.page);
    const hasMore = useSelector((s) => s.chat?.rooms?.hasMore);
    const connection = useSelector((s) => s.chat?.connection);

      // Отладочная информация
  if (__DEV__) {
    console.log('ChatListScreen render:', {
      currentUserId,
      roomsCount: rooms.length,
      participantsCount: Object.keys(participantsById).length,
            sampleRoom: rooms[0] ? {
                id: rooms[0].id,
                type: rooms[0].type,
                title: rooms[0].title,
                participants: rooms[0].participants?.map(p => ({
                    id: p?.userId ?? p?.user?.id,
                    name: p?.user?.name || p?.name,
                    role: p?.user?.role || p?.role
                })),
                lastMessage: rooms[0].lastMessage,
                messages: rooms[0].messages?.length || 0,
                lastMessageStatus: rooms[0].lastMessage?.status
            } : null
        });
    }

    const memoizedRooms = useMemo(() => rooms, [rooms]);
    const loadedProductsRef = useRef(new Set());

    useEffect(() => {
        console.log('📱 ChatListScreen: Component mounted, loading cache and fetching rooms...');
        console.log('📱 ChatListScreen: Current rooms count:', rooms?.length || 0);
        dispatch(loadRoomsCache());
        dispatch(fetchRooms({page: 1}));
    }, [dispatch]);

    // Убираем все автоматические обновления - websocket должен работать сам!
    // useEffect(() => {
    //   const interval = setInterval(() => {
    //     if (__DEV__) {
    //       console.log('ChatListScreen: Syncing with websocket updates');
    //     }
    //     dispatch(fetchRooms({ page: 1 }));
    //   }, 5000); // Обновляем каждые 5 секунд для websocket синхронизации

    //   return () => clearInterval(interval);
    // }, [dispatch]);

    // Дополнительное обновление при фокусе экрана для получения новых сообщений
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (__DEV__) {
                console.log('ChatListScreen: Screen focused, refreshing for new messages');
            }
            dispatch(fetchRooms({page: 1, forceRefresh: true}));
        });
        return unsubscribe;
    }, [dispatch, navigation]);

    // Убираем HTTP polling fallback - WebSocket должен работать в real-time
    // Если WebSocket не подключен, пользователь увидит индикатор в dev режиме

    // Обработчик для pull-to-refresh
    const handleRefresh = useCallback(() => {
        if (__DEV__) {
            console.log('ChatListScreen: Manual refresh triggered');
        }
        dispatch(fetchRooms({page: 1, forceRefresh: true}));
    }, [dispatch]);

    useEffect(() => {
        if (!Array.isArray(memoizedRooms) || memoizedRooms.length === 0) return;

        const maxToPrefetch = 5;
        const subset = memoizedRooms.slice(0, maxToPrefetch);

        subset.forEach((room) => {
            const hasParticipants = Array.isArray(room?.participants) && room.participants.length > 0;
            if (!hasParticipants && room?.id) {
                if (__DEV__) {
                    console.log('Fetching room participants for room:', room.id);
                }
                dispatch(fetchRoom(room.id));
            }

            // Убираем автоматическую загрузку сообщений - это вызывает бесконечный ререндер
            // Сообщения уже загружаются через селектор selectRoomsList
        });
    }, [memoizedRooms, dispatch]);

    useEffect(() => {
        if (!Array.isArray(memoizedRooms) || memoizedRooms.length === 0) return;

        const productRooms = memoizedRooms.filter(room =>
            room?.type === 'PRODUCT' &&
            room?.productId &&
            !room?.product
        );

        if (productRooms.length === 0) return;

        const roomsToLoad = productRooms.filter(room =>
            !productsById[room.productId] &&
            !loadedProductsRef.current.has(room.productId)
        );

        if (roomsToLoad.length > 0) {
            roomsToLoad.forEach((room) => {
                loadedProductsRef.current.add(room.productId);
                dispatch(fetchProductById(room.productId));
            });
        }
    }, [memoizedRooms, productsById, dispatch]);

    useEffect(() => {
        loadedProductsRef.current.clear();
    }, [memoizedRooms]);

    useFocusEffect(
        useCallback(() => {
            dispatch(setActiveRoom(null));
        }, [dispatch])
    );

    const getChatTitle = useCallback((room) => {
        // ИГНОРИРУЕМ room.title, так как он содержит неправильное имя
        // if (room?.title) return room.title;

        // Отладочная информация для диагностики
        if (__DEV__) {
            console.log('getChatTitle called for room:', {
                roomId: room.id,
                roomTitle: room.title,
                currentUserId,
                participants: room.participants?.map(p => ({
                    id: p?.userId ?? p?.user?.id,
                    name: p?.user?.name || p?.name,
                    role: p?.user?.role || p?.role,
                    isCurrentUser: (p?.userId ?? p?.user?.id) === currentUserId
                })),
                lastMessage: room.lastMessage,
                messagesCount: room.messages?.length,
                lastMessageStatus: room.messages && room.messages.length > 0 ? room.messages[room.messages.length - 1]?.status : null,
                lastMessageStructure: room.messages && room.messages.length > 0 ? {
                    id: room.messages[room.messages.length - 1]?.id,
                    content: room.messages[room.messages.length - 1]?.content,
                    type: room.messages[room.messages.length - 1]?.type,
                    createdAt: room.messages[room.messages.length - 1]?.createdAt,
                    senderId: room.messages[room.messages.length - 1]?.senderId,
                    sender_id: room.messages[room.messages.length - 1]?.sender_id,
                    userId: room.messages[room.messages.length - 1]?.userId,
                    user_id: room.messages[room.messages.length - 1]?.user_id,
                    fromUserId: room.messages[room.messages.length - 1]?.fromUserId,
                    from_user_id: room.messages[room.messages.length - 1]?.from_user_id,
                    status: room.messages[room.messages.length - 1]?.status,
                    allFields: room.messages[room.messages.length - 1] ? Object.keys(room.messages[room.messages.length - 1]) : null
                } : null
            });
        }

        // Для групповых чатов сразу возвращаем название группы
        if (room?.type === 'GROUP' && room?.title) {
            return room.title;
        }

        // Для чатов с товарами показываем название товара
        if (room?.product?.name) {
            return `Товар: ${room.product.name}`;
        }

        // Проверяем участников чата
        if (room?.participants && Array.isArray(room.participants) && currentUserId) {
            // Ищем участника, который НЕ является текущим пользователем
            const partner = room.participants.find(p => {
                const participantId = p?.userId ?? p?.user?.id;
                return participantId !== currentUserId;
            });

            if (partner) {
                const partnerUser = partner.user || partner;

                // Отладочная информация для диагностики
                if (__DEV__) {
                    console.log('getChatTitle - partner found:', {
                        roomId: room.id,
                        partner,
                        partnerUser,
                        currentUserId,
                        participants: room.participants.map(p => ({
                            id: p?.userId ?? p?.user?.id,
                            name: p?.user?.name || p?.name,
                            role: p?.user?.role || p?.role
                        }))
                    });
                }

                // Для поставщиков показываем название компании
                if (partnerUser?.role === 'SUPPLIER') {
                    const companyName =
                        partnerUser.supplier?.companyName ||
                        partnerUser.companyName ||
                        partnerUser.profile?.companyName;
                    if (companyName) return companyName;

                    const contactPerson =
                        partnerUser.supplier?.contactPerson ||
                        partnerUser.contactPerson ||
                        partnerUser.profile?.contactPerson;
                    if (contactPerson) return contactPerson;
                }

                // Обычное имя пользователя
                const name = partnerUser.name || partnerUser.profile?.name || partnerUser.firstName || partnerUser.profile?.firstName;
                if (name) return name;

                // Fallback на email
                if (partnerUser.email) {
                    const emailName = partnerUser.email.split('@')[0];
                    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
                }

                // Если ничего не найдено, показываем ID пользователя
                return `Пользователь #${partnerUser.id || partner.id}`;
            } else {
                if (__DEV__) {
                    console.log('getChatTitle - no partner found for room:', room.id);
                }
            }
        }

        // Fallback для групповых чатов или если не удалось определить участников
        if (room?.type === 'GROUP') {
            return room.title || 'Группа';
        }

        return room?.id ? `Комната ${room.id}` : 'Чат';
    }, [currentUserId]);

    const toAbsoluteUri = useCallback((raw) => {
        if (!raw || typeof raw !== 'string') return null;
        if (raw.startsWith('http')) return raw;
        let path = raw.replace(/^\\+/g, '').replace(/^\/+/, '');
        // убираем ведущий uploads/ если есть
        path = path.replace(/^uploads\/?/, '');
        return `${getBaseUrl()}/uploads/${path}`;
    }, []);

    const getRoomAvatar = useCallback((room) => {
        if (!room?.id) return null;

        if (room.type === 'GROUP') {
            if (room.avatar) {
                return toAbsoluteUri(room.avatar);
            }
            return null;
        }

        if (room?.product) {
            if (room.product.images && Array.isArray(room.product.images) && room.product.images.length > 0) {
                return toAbsoluteUri(room.product.images[0]);
            }

            if (room.product.image) {
                return toAbsoluteUri(room.product.image);
            }
        }

        if (room?.type === 'PRODUCT' && room?.productId && !room?.product) {
            const productFromStore = productsById[room.productId];

            if (productFromStore) {
                if (productFromStore.images && Array.isArray(productFromStore.images) && productFromStore.images.length > 0) {
                    return toAbsoluteUri(productFromStore.images[0]);
                }

                if (productFromStore.image) {
                    return toAbsoluteUri(productFromStore.image);
                }
            }
        }

        const participants = Array.isArray(room?.participants) ? room.participants : [];
        // Ищем участника, который НЕ является текущим пользователем
        const other = currentUserId
            ? participants.find(p => {
            const participantId = p?.userId ?? p?.user?.id;
            return participantId !== currentUserId;
        }) || participants[0]
            : participants[0];

        if (!other) return null;

        const otherUserId = other?.userId ?? other?.user?.id ?? other?.id;

        // Сначала пробуем получить аватар из кэша участников
        const cachedUser = participantsById[otherUserId];
        const avatarRaw = cachedUser?.avatar
            || other?.user?.avatar
            || other?.avatar
            || room?.avatar
            || room?.product?.supplier?.user?.avatar
            || room?.product?.supplier?.avatar
            || null;

        return toAbsoluteUri(avatarRaw);
    }, [currentUserId, participantsById, productsById, toAbsoluteUri]);

    const onRefresh = useCallback(() => {
        dispatch(fetchRooms({page: 1}));
    }, [dispatch]);

    const handleLoadMore = useCallback(() => {
        if (loading || !hasMore) return;

        if (__DEV__) {
            console.log('ChatListScreen: Loading more rooms, page:', page + 1);
        }

        dispatch(fetchRooms({page: page + 1}));
    }, [dispatch, loading, hasMore, page]);

    const openRoom = (room) => {
        const rid = room?.id ?? room?.roomId;
        if (!rid) return;
        dispatch(setActiveRoom(rid));
        const productInfo = room?.product ? {id: room.product?.id, supplier: room.product?.supplier} : undefined;
        navigation.navigate('ChatRoom', {
            roomId: rid,
            roomTitle: room?.title,
            productId: room?.productId || room?.product?.id,
            productInfo,
            currentUserId,
            fromScreen: 'ChatList'
        });
    };

    const renderItem = useCallback(({item}) => {
        const title = getChatTitle(item);
        const avatarUri = getRoomAvatar(item);

        // Простая логика для последнего сообщения
        // Приоритет: item.lastMessage (содержит senderId) > lastMessageFromMessages
        const lastMessage = item.lastMessage;

        if (__DEV__) {
            console.log('🎯 ChatList renderItem - lastMessage determination for room:', item.id, {
                hasItemLastMessage: !!item.lastMessage,
                itemStructure: {
                    id: item.id,
                    title: item.title,
                    type: item.type,
                    hasLastMessage: !!item.lastMessage,
                    lastMessage: item.lastMessage,
                    hasMessages: !!item.messages,
                    messagesLength: item.messages?.length
                },
                finalLastMessage: lastMessage ? {
                    id: lastMessage.id,
                    content: lastMessage.content?.substring(0, 30),
                    senderId: lastMessage.senderId,
                    status: lastMessage.status,
                    createdAt: lastMessage.createdAt
                } : null
            });
        }

        // Определяем, является ли последнее сообщение нашим
        let isOwnMessage = false;
        let senderPrefix = ''; // Объявляем здесь чтобы использовать позже

        if (lastMessage && currentUserId) {
            // Проверяем разные возможные поля для ID отправителя
            const senderId = lastMessage.senderId ||
                lastMessage.sender_id ||
                lastMessage.userId ||
                lastMessage.user_id ||
                lastMessage.fromUserId ||
                lastMessage.from_user_id ||
                lastMessage.sender?.id;

            isOwnMessage = senderId === currentUserId;

            if (__DEV__) {
                console.log('👤 ChatList: isOwnMessage determination:', {
                    senderId,
                    currentUserId,
                    isOwnMessage,
                    roomId: item.id,
                    lastMessageId: lastMessage?.id,
                    messageStatus,
                    shouldShowTicks: isOwnMessage
                });
            }

            // Для групповых чатов показываем имя отправителя в превью
            if (item.type === 'GROUP' && lastMessage.sender) {
                const senderName = lastMessage.sender.name ||
                    lastMessage.sender.client?.name ||
                    lastMessage.sender.admin?.name ||
                    lastMessage.sender.employee?.name ||
                    lastMessage.sender.supplier?.contactPerson ||
                    lastMessage.sender.email?.split('@')[0];

                if (senderName) {
                    if (isOwnMessage) {
                        senderPrefix = 'Вы: ';
                    } else {
                        senderPrefix = `${senderName}: `;
                    }
                }
            }

            if (__DEV__) {
                console.log('isOwnMessage determination:', {
                    roomId: item.id,
                    roomType: item.type,
                    currentUserId,
                    senderId,
                    isOwnMessage,
                    senderPrefix,
                    lastMessageKeys: lastMessage ? Object.keys(lastMessage) : null
                });
            }
        }

        // Определяем статус сообщения для галочек
        let messageStatus = 'SENT'; // По умолчанию

        if (lastMessage) {
            // Логика определения статуса по приоритету:
            // READ (синие галочки) -> DELIVERED (серые галочки) -> SENT (одна серая галочка)
            if (lastMessage.readAt ||
                lastMessage.status?.toLowerCase() === 'read' ||
                lastMessage.status?.toUpperCase() === 'READ') {
                messageStatus = 'READ';
            } else if (lastMessage.deliveredAt ||
                lastMessage.status?.toLowerCase() === 'delivered' ||
                lastMessage.status?.toUpperCase() === 'DELIVERED') {
                messageStatus = 'DELIVERED';
            } else if (lastMessage.status) {
                // Используем статус из сообщения, нормализуя к верхнему регистру
                messageStatus = lastMessage.status.toUpperCase();
            }
        }

        if (__DEV__) {
            console.log('ChatList: Final messageStatus for room:', item.id, ':', messageStatus, {
                lastMessageStatus: lastMessage?.status,
                lastMessageReadAt: lastMessage?.readAt,
                lastMessageDeliveredAt: lastMessage?.deliveredAt,
                isOwnMessage
            });
        }

        // Отладочная информация о статусе
        if (__DEV__) {
            console.log('Message status calculation:', {
                roomId: item.id,
                messageId: lastMessage?.id,
                calculatedStatus: messageStatus,
                originalStatus: lastMessage?.status,
                deliveredAt: lastMessage?.deliveredAt,
                readAt: lastMessage?.readAt,
                isOwnMessage,
                participantsCount: item.participants?.length,
                // Добавляем информацию для отслеживания динамического обновления
                willShowTicks: lastMessage && isOwnMessage,
                ticksStatus: messageStatus,
                messageContent: lastMessage?.content?.substring(0, 30)
            });
        }

        // Упрощенная логика для последнего сообщения
        let preview = '';
        let time = '';

        if (lastMessage) {
            let messageContent = '';

            if (lastMessage.type === 'IMAGE') {
                messageContent = 'Фото';
            } else if (lastMessage.type === 'PRODUCT') {
                messageContent = 'Товар';
            } else if (lastMessage.content && lastMessage.content.trim()) {
                messageContent = lastMessage.content.trim();
            } else {
                messageContent = 'Сообщение';
            }

            // Используем senderPrefix который мы определили ранее
            preview = senderPrefix + messageContent;

            if (lastMessage.createdAt) {
                const messageDate = new Date(lastMessage.createdAt);
                const now = new Date();
                const diffInHours = (now - messageDate) / (1000 * 60 * 60);

                if (diffInHours < 24) {
                    time = messageDate.toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } else if (diffInHours < 48) {
                    time = 'Вчера';
                } else {
                    time = messageDate.toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit'
                    });
                }

                // Отладочная информация о времени
                if (__DEV__) {
                    console.log('Time calculation:', {
                        messageDate: lastMessage.createdAt,
                        parsedDate: messageDate,
                        diffInHours,
                        calculatedTime: time,
                        // Добавляем сравнение с текущим временем
                        currentTime: now.toLocaleTimeString('ru-RU'),
                        timeDifference: `${Math.round(diffInHours * 60)} минут`
                    });
                }
            }
        }

        // Отладочная информация
        if (__DEV__) {
            console.log('ChatList renderItem:', {
                roomId: item.id,
                type: item.type,
                title,
                currentUserId,
                lastMessage: item.lastMessage,
                messagesCount: item.messages?.length,
                preview,
                time,
                isOwnMessage,
                messageStatus
            });
        }

        return (
            <TouchableOpacity style={styles.item} onPress={() => openRoom(item)}>
                <View style={styles.avatarBox}>
                    {avatarUri ? (
                        <Image source={{uri: avatarUri}} style={styles.avatarImg} resizeMode="cover"/>
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            {item.type === 'GROUP' ? (
                                <Text style={styles.groupPlaceholderText}>👥</Text>
                            ) : item?.product ? (
                                <Text style={styles.productPlaceholderText}>📦</Text>
                            ) : (
                                <Text style={styles.userPlaceholderText}>👤</Text>
                            )}
                        </View>
                    )}
                </View>
                <View style={styles.textContainer}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.title} numberOfLines={1}>{title}</Text>
                        <View style={styles.messageInfo}>
                            <Text style={styles.time}>{time}</Text>
                        </View>
                    </View>
                    <View style={styles.previewContainer}>
                        {/* Показываем галочки слева от сообщения для своих сообщений */}
                        {lastMessage && isOwnMessage && (
                            <View style={styles.statusContainerLeft}>
                                {__DEV__ && console.log('🎯 ChatList: CONDITION PASSED, RENDERING StatusTicks:', {
                                    lastMessage: !!lastMessage,
                                    isOwnMessage,
                                    messageStatus,
                                    lastMessageId: lastMessage?.id,
                                    roomId: item.id
                                })}
                                <StatusTicks status={messageStatus}/>
                            </View>
                        )}
                        <Text style={[
                            styles.preview,
                            lastMessage && isOwnMessage && styles.previewWithStatus
                        ]} numberOfLines={1}>{preview}</Text>
                    </View>
                </View>
                {!!item.unread && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.unread}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [getChatTitle, getRoomAvatar, openRoom, currentUserId]);

    const keyExtractor = useCallback((item) => String(item.id), []);

    const getItemLayout = useCallback((data, index) => ({
        length: 72,
        offset: 72 * index,
        index,
    }), []);

    const SeparatorComponent = useCallback(() => <View style={styles.separator}/>, []);

    const EmptyComponent = useCallback(() => (
        !loading ? (
            <View style={{paddingVertical: 40, alignItems: 'center'}}>
                <Text style={{color: '#8696A0'}}>Чатов пока нет</Text>
            </View>
        ) : null
    ), [loading]);

    // Отслеживаем изменения в Redux store для динамического обновления галочек
    useEffect(() => {
        if (__DEV__) {
            console.log('ChatListScreen: Redux store updated, re-rendering for dynamic status updates', {
                roomsCount: rooms.length,
                hasRooms: rooms.length > 0,
                sampleRoomLastMessage: rooms[0]?.lastMessage ? {
                    id: rooms[0].lastMessage.id,
                    status: rooms[0].lastMessage.status,
                    content: rooms[0].lastMessage.content?.substring(0, 20),
                    createdAt: rooms[0].lastMessage.createdAt
                } : null
            });
        }
    }, [rooms]); // Убираем неопределенные переменные participants и messages

    // Убираем дополнительное обновление - websocket должен работать сам!
    // useEffect(() => {
    //   // Слушаем изменения в сообщениях для мгновенного обновления
    //   const checkForNewMessages = () => {
    //     if (__DEV__) {
    //       console.log('ChatListScreen: Checking for new messages via websocket');
    //     }
    //     // Обновляем список чатов для получения новых сообщений
    //     dispatch(fetchRooms({ page: 1 }));
    //   };

    //   // Проверяем новые сообщения каждые 3 секунды для websocket
    //   const messageInterval = setInterval(checkForNewMessages, 3000);

    //   return () => clearInterval(messageInterval);
    // }, [dispatch]);

    return (
        <View style={styles.container}>
            {/* Индикатор соединения только в dev режиме и только если отключен */}
            {__DEV__ && !connection?.isConnected && (
                <View style={styles.connectionIndicator}>
                    <Text style={styles.connectionWarning}>
                        ⚠️ WebSocket отключен - сообщения могут не обновляться в реальном времени
                    </Text>
                    {connection?.lastDisconnected && (
                        <Text style={styles.connectionDetails}>
                            Отключен: {new Date(connection.lastDisconnected).toLocaleTimeString()}
                        </Text>
                    )}
                </View>
            )}

            <FlatList
                data={memoizedRooms}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.1}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={handleRefresh}
                        colors={['#007AFF']}
                        tintColor="#007AFF"
                    />
                }
                contentContainerStyle={styles.listContainer}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews
                getItemLayout={getItemLayout}
                ItemSeparatorComponent={SeparatorComponent}
                ListEmptyComponent={EmptyComponent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    listContainer: {
        paddingVertical: 0,
    },
    separator: {
        height: 1,
        backgroundColor: '#E5E5E5',
        marginLeft: 68,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        minHeight: 72,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#DDD',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    avatarBox: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#DDD',
        marginRight: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        flex: 1,
        backgroundColor: '#DDD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupPlaceholderText: {
        fontSize: 20,
        color: '#666',
    },
    productPlaceholderText: {
        fontSize: 18,
        color: '#666',
    },
    userPlaceholderText: {
        fontSize: 18,
        color: '#666',
    },
    textContainer: {
        flex: 1,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000000',
        maxWidth: '75%',
        lineHeight: 22,
    },
    preview: {
        fontSize: 14,
        color: '#8696A0',
        lineHeight: 20,
        maxWidth: '80%',
    },
    time: {
        fontSize: 12,
        color: '#8696A0',
        lineHeight: 16,
    },
    badge: {
        backgroundColor: '#25D366',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 8,
        minWidth: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    messageInfo: {
        marginTop: 2,
    },
    previewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        justifyContent: 'flex-start',
    },
    statusContainerLeft: {
        marginRight: 6,
        alignSelf: 'center',
    },
    previewWithStatus: {
        flex: 1,
        marginLeft: 0,
    },
    statusContainer: {
        marginLeft: 'auto',
    },
    statusInline: {
        marginLeft: 2,
    },
    statusEnd: {
        marginLeft: 'auto',
    },
    ticksContainer: {
        flexDirection: 'row',
        position: 'relative',
        width: 18,
        height: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tick: {
        fontSize: 10,
        color: '#8696A0',
        fontWeight: '700',
        lineHeight: 14,
        marginRight: -3,
    },
    tickRead: {
        color: '#4FC3F7',
    },
    connectionIndicator: {
        backgroundColor: '#FFF3CD',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#FFEAA7',
        borderLeftWidth: 4,
        borderLeftColor: '#FF7675',
    },
    connectionWarning: {
        fontSize: 13,
        fontWeight: '500',
        color: '#856404',
        lineHeight: 18,
    },
    connectionDetails: {
        fontSize: 11,
        color: '#856404',
        marginTop: 4,
        opacity: 0.8,
    },
});

export default ChatListScreen;

