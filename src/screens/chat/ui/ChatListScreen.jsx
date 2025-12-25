import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {View, FlatList, TouchableOpacity, Text, StyleSheet, RefreshControl, Image, InteractionManager} from 'react-native';
import {useFocusEffect, CommonActions} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {fetchRooms, setActiveRoom, loadRoomsCache, fetchRoom, fetchMessages} from '@entities/chat/model/slice';
import {fetchProductById} from '@entities/product/model/slice';
import {selectRoomsList, selectIsRoomDeleted} from '@entities/chat/model/selectors';
import {selectProductsById} from '@entities/product/model/selectors';

import {getBaseUrl} from '@shared/api/api';
import {IconDelivery} from '@shared/ui/Icon/Profile/IconDelivery';
import {Ionicons} from '@expo/vector-icons';

// Компонент для отображения иконки голосового сообщения
const VoiceMessageIcon = React.memo(() => (
    <View style={styles.voiceIconContainer}>
        <Ionicons name="mic" size={16} color="#8696A0" />
    </View>
));

// Исправленный компонент для отображения галочек статуса сообщения
const StatusTicks = React.memo(({status}) => {
    // Нормализуем статус для правильной обработки
    const normalizedStatus = status?.toUpperCase?.() || status;

    // Исправленная логика - проверяем оба варианта
    if (normalizedStatus === 'READ' || normalizedStatus === 'read') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick, styles.tickRead]}>✓</Text>
                <Text style={[styles.tick, styles.tickRead]}>✓</Text>
            </View>
        );
    }
    if (normalizedStatus === 'DELIVERED' || normalizedStatus === 'delivered') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={styles.tick}>✓</Text>
                <Text style={styles.tick}>✓</Text>
            </View>
        );
    }
    if (normalizedStatus === 'SENT') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick]}>✓</Text>
            </View>
        );
    }

    // Default case - одна серая галочка
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
    const currentUser = useSelector((s) => s.auth?.user);
    const currentUserId = currentUser?.id;
    const participantsById = useSelector((s) => s.chat?.participants?.byUserId || {});
    const productsById = useSelector(selectProductsById);
    const page = useSelector((s) => s.chat?.rooms?.page);
    const hasMore = useSelector((s) => s.chat?.rooms?.hasMore);
    const connection = useSelector((s) => s.chat?.connection);
    const deletedRoomIds = useSelector((s) => s.chat?.deletedRoomIds || []);

    const loadedProductsRef = useRef(new Set());
    const isNavigatingRef = useRef(false);
    const previousRoomsRef = useRef(rooms);
    
    // Мемоизируем список комнат, но не обновляем его при навигации
    const memoizedRooms = useMemo(() => {
        // Если идет навигация, возвращаем предыдущее значение
        if (isNavigatingRef.current && previousRoomsRef.current) {
            return previousRoomsRef.current;
        }
        // Обновляем предыдущее значение только если не идет навигация
        previousRoomsRef.current = rooms;
        return rooms;
    }, [rooms]);

    useEffect(() => {
        dispatch(loadRoomsCache());
        dispatch(fetchRooms({page: 1}));
    }, [dispatch]);

    // Убрано автоматическое обновление при фокусе - WebSocket обновляет данные в реальном времени
    // Пользователь может использовать pull-to-refresh для ручного обновления

    // Убираем HTTP polling fallback - WebSocket должен работать в real-time
    // Если WebSocket не подключен, пользователь увидит индикатор в dev режиме

    // Обработчик для pull-to-refresh
    const handleRefresh = useCallback(() => {
        dispatch(fetchRooms({page: 1, forceRefresh: true}));
    }, [dispatch]);

    useEffect(() => {
        if (!Array.isArray(memoizedRooms) || memoizedRooms.length === 0) return;

        const maxToPrefetch = 5;
        const subset = memoizedRooms.slice(0, maxToPrefetch);

        subset.forEach((room) => {
            if (!room?.id) return;
            
            // Проверяем, не удалена ли комната перед загрузкой
            if (deletedRoomIds.includes(room.id)) {
                return;
            }
            
            const hasParticipants = Array.isArray(room?.participants) && room.participants.length > 0;
            if (!hasParticipants) {
                dispatch(fetchRoom(room.id));
            }

            // Убираем автоматическую загрузку сообщений - это вызывает бесконечный ререндер
            // Сообщения уже загружаются через селектор selectRoomsList
        });
    }, [memoizedRooms, dispatch, deletedRoomIds]);

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
            // Сбрасываем флаг навигации при возврате на экран
            isNavigatingRef.current = false;
        }, [dispatch])
    );

    // Перехватываем попытки возврата на WelcomeScreen и перенаправляем на Main
    // ВАЖНО: ChatListScreen находится в табе, поэтому прямой возврат на WelcomeScreen маловероятен
    // Но на всякий случай перехватываем явные попытки
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            try {
                const actionType = e?.data?.action?.type;
                const targetRouteName = e?.data?.action?.payload?.name;
                
                // Перехватываем ТОЛЬКО если явно пытаемся вернуться на WelcomeScreen или Splash
                // И это не обычный POP/GO_BACK внутри стека
                const isReturningToWelcome = targetRouteName === 'Welcome' || targetRouteName === 'Splash';
                
                if (!isReturningToWelcome) {
                    // Для всех остальных случаев разрешаем стандартную навигацию
                    return;
                }
                
                console.log('ChatListScreen: Intercepting navigation to WelcomeScreen');
                
                // Предотвращаем возврат на WelcomeScreen
                e.preventDefault();
                
                // Перенаправляем на главный экран вместо WelcomeScreen
                // Используем requestAnimationFrame для безопасной асинхронной навигации
                requestAnimationFrame(() => {
                    try {
                        // Пытаемся найти корневой навигатор через иерархию
                        let rootNavigation = navigation;
                        let parent = navigation.getParent();
                        let depth = 0;
                        const maxDepth = 5; // Защита от бесконечного цикла
                        
                        while (parent && depth < maxDepth) {
                            rootNavigation = parent;
                            parent = parent.getParent();
                            depth++;
                        }
                        
                        // Проверяем, что навигатор существует и имеет метод navigate
                        if (rootNavigation && typeof rootNavigation.navigate === 'function') {
                            // Используем navigate для безопасной навигации
                            rootNavigation.navigate('Main');
                            console.log('ChatListScreen: Successfully redirected to Main');
                        } else {
                            console.warn('ChatListScreen: Root navigation not found or invalid');
                        }
                    } catch (error) {
                        console.error('ChatListScreen: Failed to redirect to Main:', error);
                        // Если не удалось навигировать, просто предотвращаем возврат
                        // Пользователь останется на ChatListScreen
                    }
                });
            } catch (error) {
                console.error('ChatListScreen: Error in beforeRemove listener:', error);
                // В случае любой ошибки разрешаем стандартную навигацию, чтобы не блокировать приложение
                // НЕ вызываем e.preventDefault() при ошибке
            }
        });

        return unsubscribe;
    }, [navigation]);

    const getChatTitle = useCallback((room) => {
        // Для групповых чатов и каналов BROADCAST сразу возвращаем название
        if ((room?.type === 'GROUP' || room?.type === 'BROADCAST') && room?.title) {
            return room.title;
        }

        // Для чатов с товарами показываем название товара в первую очередь
        if (room?.type === 'PRODUCT') {
            // Приоритет 1: Название товара из объекта product
            if (room?.product?.name) {
                return room.product.name;
            }
            
            // Приоритет 2: Название товара из кэша productsById
            if (room?.productId && productsById[room.productId]?.name) {
                return productsById[room.productId].name;
            }
            
            // Приоритет 3: Название товара из room.title
            if (room?.title) {
                return room.title;
            }
            
            // Fallback: Если товар не найден, показываем имя поставщика
            if (room?.participants && Array.isArray(room.participants)) {
                const supplierParticipant = room.participants.find(p => {
                    const user = p?.user || p;
                    return user?.role === 'SUPPLIER';
                });

                if (supplierParticipant) {
                    const supplierUser = supplierParticipant.user || supplierParticipant;
                    
                    // Сначала проверяем name, который сервер уже установил правильно
                    if (supplierUser.name && supplierUser.name !== supplierUser.email) {
                        return supplierUser.name;
                    }
                    
                    // Проверяем название компании поставщика
                    const companyName =
                        supplierUser.supplier?.companyName ||
                        supplierUser.companyName ||
                        supplierUser.profile?.companyName ||
                        null;
                    if (companyName) return companyName;

                    // Если компании нет, показываем контактное лицо
                    const contactPerson =
                        supplierUser.supplier?.contactPerson ||
                        supplierUser.contactPerson ||
                        supplierUser.profile?.contactPerson ||
                        null;
                    if (contactPerson) return contactPerson;
                }
            }
            
            // Последний fallback - показываем что это товар
            return `Товар #${room.productId || room.id}`;
        }

        // Проверяем участников чата (только для DIRECT чатов)
        if (room?.type === 'DIRECT' && room?.participants && Array.isArray(room.participants) && currentUserId) {
            // Ищем участника, который НЕ является текущим пользователем
            const partner = room.participants.find(p => {
                const participantId = p?.userId ?? p?.user?.id;
                return participantId !== currentUserId;
            });

            if (partner) {
                const partnerUser = partner.user || partner;

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

                // Для водителей проверяем driver.name в первую очередь
                if (partnerUser?.role === 'DRIVER') {
                    const driverName = partnerUser.driver?.name || partnerUser.name;
                    if (driverName) return driverName;
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
                // Если партнер не найден (например, второй участник покинул чат),
                // используем room.title как fallback, если он есть и не равен имени текущего пользователя
                const currentUserName = currentUser?.client?.name || 
                                      currentUser?.name || 
                                      currentUser?.email?.split('@')[0] || 
                                      '';
                
                if (room?.title && room.title !== currentUserName && room.title !== 'Чат' && room.title !== 'Водитель') {
                    return room.title;
                }
            }
        }

        // Fallback для групповых чатов и каналов
        if (room?.type === 'GROUP' || room?.type === 'BROADCAST') {
            return room.title || (room?.type === 'BROADCAST' ? 'Канал' : 'Группа');
        }

        return room?.id ? `Комната ${room.id}` : 'Чат';
    }, [currentUserId, currentUser, productsById]);

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

        dispatch(fetchRooms({page: page + 1}));
    }, [dispatch, loading, hasMore, page]);

    const openRoom = (room) => {
        const rid = room?.id ?? room?.roomId;
        if (!rid) {
            return;
        }
        
        // Устанавливаем флаг навигации для предотвращения обновления списка
        isNavigatingRef.current = true;
        
        // Убираем setActiveRoom отсюда - экран чата сам установит активную комнату в useEffect
        // Это предотвращает ререндер списка перед навигацией
        
        const productInfo = room?.product ? {id: room.product?.id, supplier: room.product?.supplier} : undefined;
        // ✅ ChatRoom теперь в корневом Stack (AppStack), чтобы таббар не мог появляться в комнате
        const rootNavigation =
            navigation?.getParent?.('AppStack') ||
            navigation?.getParent?.()?.getParent?.() ||
            null;

        // Используем комбинацию requestAnimationFrame и InteractionManager
        // для максимально плавной навигации без визуальных артефактов
        requestAnimationFrame(() => {
            InteractionManager.runAfterInteractions(() => {
                (rootNavigation || navigation).navigate('ChatRoom', {
                    roomId: rid,
                    roomTitle: room?.title,
                    productId: room?.productId || room?.product?.id,
                    productInfo,
                    currentUserId,
                    fromScreen: 'ChatList'
                });
                
                // Сбрасываем флаг навигации после небольшой задержки
                // чтобы дать время экрану чата загрузиться
                setTimeout(() => {
                    isNavigatingRef.current = false;
                }, 300);
            });
        });
    };

    const renderItem = useCallback(({item}) => {
        const title = getChatTitle(item);
        const avatarUri = getRoomAvatar(item);

        // Простая логика для последнего сообщения
        // Приоритет: item.lastMessage (содержит senderId) > lastMessageFromMessages
        const lastMessage = item.lastMessage;

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

            // Для групповых чатов показываем имя отправителя в превью
            // НО не для системных сообщений, так как имя уже содержится в тексте
            if (item.type === 'GROUP' && lastMessage.sender && lastMessage.type !== 'SYSTEM') {
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

        // Упрощенная логика для последнего сообщения
        let preview = '';
        let isStopMessage = false;
        let isVoiceMessage = false;
        let time = '';

        if (lastMessage) {
            let messageContent = '';

            if (lastMessage.type === 'IMAGE') {
                messageContent = 'Фото';
            } else if (lastMessage.type === 'PRODUCT') {
                messageContent = 'Товар';
            } else if (lastMessage.type === 'STOP') {
                isStopMessage = true;
                messageContent = 'Остановка';
            } else if (lastMessage.type === 'VOICE') {
                isVoiceMessage = true;
                messageContent = 'Голосовое сообщение';
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
            }
        }

        return (
            <TouchableOpacity style={styles.item} onPress={() => openRoom(item)}>
                <View style={styles.avatarBox}>
                    {avatarUri ? (
                        <Image source={{uri: avatarUri}} style={styles.avatarImg} resizeMode="cover"/>
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            {item.type === 'BROADCAST' ? (
                                <Text style={styles.groupPlaceholderText}>📢</Text>
                            ) : item.type === 'GROUP' ? (
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
                        {/* Показываем галочки слева от сообщения для своих сообщений (но не для системных) */}
                        {lastMessage && isOwnMessage && lastMessage.type !== 'SYSTEM' && (
                            <View style={styles.statusContainerLeft}>
                                <StatusTicks status={messageStatus}/>
                            </View>
                        )}
                        {isStopMessage ? (
                            <View style={styles.stopPreviewContainer}>
                                <IconDelivery width={14} height={14} color="#8696A0" style={styles.stopIcon} />
                                <Text style={[
                                    styles.preview,
                                    lastMessage && isOwnMessage && styles.previewWithStatus
                                ]} numberOfLines={1}>{preview}</Text>
                            </View>
                        ) : isVoiceMessage ? (
                            <View style={styles.voiceMessageContainer}>
                                <VoiceMessageIcon />
                                <Text style={[
                                    styles.preview,
                                    lastMessage && isOwnMessage && styles.previewWithStatus
                                ]} numberOfLines={1}>{preview}</Text>
                            </View>
                        ) : (
                            <Text style={[
                                styles.preview,
                                lastMessage && isOwnMessage && styles.previewWithStatus
                            ]} numberOfLines={1}>{preview}</Text>
                        )}
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

    const keyExtractor = useCallback((item) => {
        // Безопасное извлечение ключа с обработкой undefined/null
        const id = item?.id ?? item?.roomId ?? 'unknown';
        return String(id);
    }, []);

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
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.1}
                refreshControl={
                    <RefreshControl
                        refreshing={loading && !isNavigatingRef.current}
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
    stopPreviewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    stopIcon: {
        marginRight: 6,
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
    voiceMessageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    voiceIconContainer: {
        marginRight: 6,
        alignItems: 'center',
        justifyContent: 'center',
        width: 16,
        height: 16,
    },
});

export default ChatListScreen;

