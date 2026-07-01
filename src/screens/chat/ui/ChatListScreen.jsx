import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, FlatList, TouchableOpacity, Text, StyleSheet, RefreshControl, Image, InteractionManager, Platform} from 'react-native';
import {useFocusEffect, CommonActions} from '@react-navigation/native';
import { useTabBar } from '@widgets/navigation/context';
import {useDispatch, useSelector, useStore} from 'react-redux';
import {fetchRooms, setActiveRoom, loadRoomsCache, fetchRoom, fetchMessages, tickTime, toggleGlobalPin} from '@entities/chat/model/slice';
import { isGroupAdminRoleSystemMessage } from '@entities/chat/lib/isGroupAdminRoleSystemMessage';
import { resolveStopDistrictId } from '@entities/chat/lib/resolveStopDistrictId';
import {fetchProductById} from '@entities/product/model/slice';
import {selectRoomsList, selectIsRoomDeleted} from '@entities/chat/model/selectors';
import {selectProductsById, selectDeletedProductIds} from '@entities/product/model/selectors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {MESSAGES_LOAD_LIMIT} from '../utils/chatConstants';
import {getImageUrl} from '@shared/api/api';
import {IconDelivery} from '@shared/ui/Icon/Profile/IconDelivery';
import IconWarehouse from '@shared/ui/Icon/Warehouse/IconWarehouse';
import {Ionicons} from '@expo/vector-icons';
import { useTheme } from '@app/providers/themeProvider/ThemeProvider';
import { useCustomAlert } from '@shared/ui/CustomAlert';
import { ASSISTANT_CHAT_TITLE, AssistantAvatar, isAssistantRoom } from '@features/ai-assistant';

const ROOMS_PAGE_LIMIT = 100;

// Компонент для отображения иконки голосового сообщения
const VoiceMessageIcon = React.memo(({ styles, iconColor }) => (
    <View style={styles.voiceIconContainer}>
        <Ionicons name="mic" size={16} color={iconColor} />
    </View>
));

// Отображение статуса в списке должно совпадать с пузырьком сообщения.
const StatusTicks = React.memo(({status, styles}) => {
    const normalizedStatus = status?.toUpperCase?.() || status;

    if (normalizedStatus === 'READ') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={[styles.tick, styles.tickRead]}>✓</Text>
                <Text style={[styles.tick, styles.tickRead]}>✓</Text>
            </View>
        );
    }
    if (normalizedStatus === 'DELIVERED' || normalizedStatus === 'SENT') {
        return (
            <View style={styles.ticksContainer}>
                <Text style={styles.tick}>✓</Text>
                <Text style={styles.tick}>✓</Text>
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

const parseStopDataFromMessage = (message) => {
    if (!message) return null;
    if (message.stop) return message.stop;
    if (message.content && typeof message.content === 'string') {
        try {
            return JSON.parse(message.content);
        } catch (e) {
            return null;
        }
    }
    return null;
};

const isStopMessageExpired = (message, nowMs = Date.now()) => {
    if (!message) return false;
    const stopData = parseStopDataFromMessage(message);
    if (!stopData) return false;
    const stopStatus = String(stopData?.status || '').toUpperCase();
    const isDeletedStop = Boolean(
        stopData?.isDeleted ||
        stopData?.deletedAt ||
        stopData?.cancelledAt ||
        stopStatus === 'CANCELLED' ||
        stopStatus === 'CANCELED' ||
        stopStatus === 'DELETED'
    );
    if (isDeletedStop) return true;
    const endTime = stopData?.endTime || stopData?.startTime || null;
    if (!endTime) return false;
    const endMs = new Date(endTime).getTime();
    if (!Number.isFinite(endMs)) return false;
    return endMs < nowMs;
};

const isStopInUserDistrict = (message, districtIds) => {
    if (!message) return true;
    if (!districtIds || !districtIds.length) return true;

    const stopData = parseStopDataFromMessage(message);
    if (!stopData) return true;

    const stopDistrictRaw = resolveStopDistrictId(stopData);
    if (stopDistrictRaw === null || stopDistrictRaw === '') return true;

    const normalizedStopId = typeof stopDistrictRaw === 'string'
        ? parseInt(stopDistrictRaw, 10) : stopDistrictRaw;

    return districtIds.some(id => {
        const normalizedId = typeof id === 'string' ? parseInt(id, 10) : id;
        return normalizedId === normalizedStopId;
    });
};

const isBroadcastRoom = (room) => String(room?.type || '').toUpperCase() === 'BROADCAST';

const getGlobalPinTimestamp = (room) => {
    const rawValue =
        room?.globalPinnedAt ??
        room?.pinnedForAllAt ??
        room?.pinForAllAt ??
        room?.pinnedAt ??
        room?.pinMeta?.globalPinnedAt ??
        room?.pinMeta?.pinnedForAllAt ??
        null;
    if (!rawValue) return 0;
    const parsed = new Date(rawValue).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
};

const isGloballyPinnedChannel = (room) => {
    if (!isBroadcastRoom(room)) return false;
    return Boolean(
        room?.isPinnedForAll ||
        room?.pinnedForAll ||
        room?.isGlobalPinned ||
        room?.globalPinned ||
        room?.pinMeta?.isPinnedForAll ||
        room?.pinMeta?.pinnedForAll ||
        room?.pinMeta?.isGlobalPinned ||
        room?.pinMeta?.globalPinned
    );
};

export const ChatListScreen = ({navigation}) => {
    const dispatch = useDispatch();
    const store = useStore();
    const { showTabBar } = useTabBar();
    const { showAlert } = useCustomAlert();
    const insets = useSafeAreaInsets();
    const tabBarHeight = 80 + insets.bottom;
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
    const mutedIconColor = isDark ? colors.textSecondary : '#8696A0';
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [timeTick, setTimeTick] = useState(Date.now());
    // Debounce индикатора отключения: не мигаем при коротких reconnect'ах,
    // показываем предупреждение только если соединения нет дольше нескольких секунд.
    const [showDisconnectedWarning, setShowDisconnectedWarning] = useState(false);
    const rooms = useSelector(selectRoomsList) || [];
    const loading = useSelector((s) => s.chat?.rooms?.loading);
    const currentUser = useSelector((s) => s.auth?.user);
    const currentUserId = currentUser?.id;
    const isCurrentUserSuperAdmin = currentUser?.role === 'ADMIN' && currentUser?.admin?.isSuperAdmin === true;
    const participantsById = useSelector((s) => s.chat?.participants?.byUserId || {});
    const productsById = useSelector(selectProductsById);
    const deletedProductIds = useSelector(selectDeletedProductIds);
    const page = useSelector((s) => s.chat?.rooms?.page);
    const hasMore = useSelector((s) => s.chat?.rooms?.hasMore);
    const connection = useSelector((s) => s.chat?.connection);
    const deletedRoomIds = useSelector((s) => s.chat?.deletedRoomIds || []);

    const userDistrictIds = useMemo(() => {
        if (!currentUser) return [];
        const role = currentUser.role;
        if (role === 'CLIENT') {
            const clientDistrictId =
                currentUser.client?.districtId ??
                currentUser.client?.district?.id ??
                null;
            if (clientDistrictId != null && clientDistrictId !== '') {
                return [clientDistrictId];
            }
            return [];
        }
        if ((role === 'EMPLOYEE' || role === 'DRIVER') && currentUser[role.toLowerCase()]?.districts) {
            return currentUser[role.toLowerCase()].districts
                .map(d => d?.id || d)
                .filter(id => id != null);
        }
        return [];
    }, [currentUser]);

    const loadedProductsRef = useRef(new Set());
    const prefetchedGroupBroadcastMessagesRef = useRef(new Set());
    const prefetchedUserIdRef = useRef(null);
    const isNavigatingRef = useRef(false);
    const previousRoomsRef = useRef(rooms);
    
    // Мемоизируем список комнат, но не обновляем его при навигации
    const memoizedRooms = useMemo(() => {
        // Если идет навигация, возвращаем предыдущее значение
        if (isNavigatingRef.current && previousRoomsRef.current) {
            return previousRoomsRef.current;
        }

        // Фильтруем комнаты: скрываем DIRECT чаты с поставщиками и PRODUCT чаты
        const filteredRooms = rooms.filter(room => {
            // Скрываем PRODUCT чаты (чаты с поставщиками по товарам)
            if (room?.type === 'PRODUCT') return false;

            // Для DIRECT чатов проверяем, не является ли собеседник поставщиком
            if (room?.type === 'DIRECT' && Array.isArray(room?.participants)) {
                const hasSupplierParticipant = room.participants.some(p => {
                    const user = p?.user || p;
                    return user?.role === 'SUPPLIER';
                });
                if (hasSupplierParticipant) return false;
            }

            return true;
        });

        const sortedRooms = filteredRooms
            .map((room, index) => ({ room, index }))
            .sort((a, b) => {
                const aPinned = isGloballyPinnedChannel(a.room);
                const bPinned = isGloballyPinnedChannel(b.room);
                if (aPinned !== bPinned) {
                    return aPinned ? -1 : 1;
                }

                if (aPinned && bPinned) {
                    const aPinnedAt = getGlobalPinTimestamp(a.room);
                    const bPinnedAt = getGlobalPinTimestamp(b.room);
                    if (aPinnedAt !== bPinnedAt) {
                        return bPinnedAt - aPinnedAt;
                    }
                }

                // Для остальных элементов сохраняем исходный порядок селектора.
                return a.index - b.index;
            })
            .map((entry) => entry.room);

        // Обновляем предыдущее значение только если не идет навигация
        previousRoomsRef.current = sortedRooms;
        return sortedRooms;
    }, [rooms]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            await dispatch(loadRoomsCache());
            if (!cancelled) {
                dispatch(fetchRooms({ page: 1, limit: ROOMS_PAGE_LIMIT }));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [dispatch]);

    // Догружаем следующие страницы сразу — иначе BROADCAST-каналы (ассортимент и т.п.)
    // выпадают из списка, когда fetchRooms(page: 1) перезаписывает store.
    useEffect(() => {
        if (loading || !hasMore) return;
        dispatch(fetchRooms({ page: (page || 1) + 1, limit: ROOMS_PAGE_LIMIT }));
    }, [dispatch, loading, hasMore, page]);

    useEffect(() => {
        if (prefetchedUserIdRef.current === currentUserId) return;
        prefetchedGroupBroadcastMessagesRef.current.clear();
        prefetchedUserIdRef.current = currentUserId ?? null;
    }, [currentUserId]);

    // GROUP/BROADCAST + район: без сообщений в bucket selectRoomsList не может вычесть
    // непрочитанные STOP из чужих районов из raw unreadByRoomId — подгружаем последние сообщения.
    useEffect(() => {
        if (!userDistrictIds.length) return;
        if (!Array.isArray(memoizedRooms) || memoizedRooms.length === 0) return;

        const st = store.getState();
        const messages = st.chat?.messages;
        const unreadMap = st.chat?.unreadByRoomId || {};

        let queued = 0;
        const maxPrefetch = 5;

        for (const room of memoizedRooms) {
            if (queued >= maxPrefetch) break;
            const rid = room?.id;
            if (!rid) continue;
            const type = String(room.type || '').toUpperCase();
            if (type !== 'GROUP' && type !== 'BROADCAST') continue;
            if (prefetchedGroupBroadcastMessagesRef.current.has(rid)) continue;

            const bucketLen = messages?.[rid]?.ids?.length ?? 0;
            if (bucketLen > 0) continue;

            const u = unreadMap[rid] ?? 0;
            if (u <= 0) continue;

            prefetchedGroupBroadcastMessagesRef.current.add(rid);
            queued += 1;
            dispatch(fetchMessages({ roomId: rid, limit: MESSAGES_LOAD_LIMIT }));
        }
    }, [memoizedRooms, userDistrictIds, dispatch, store]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeTick(Date.now());
            dispatch(tickTime());
        }, 60 * 1000);

        return () => clearInterval(interval);
    }, [dispatch]);

    // Debounce индикатора соединения: при обрыве ждём 4с прежде чем показать
    // предупреждение. Если сокет успевает переподключиться (частый случай в dev),
    // индикатор не мелькает. При восстановлении соединения прячем сразу.
    useEffect(() => {
        if (!__DEV__) return;

        if (connection?.isConnected) {
            setShowDisconnectedWarning(false);
            return;
        }

        const timer = setTimeout(() => setShowDisconnectedWarning(true), 4000);
        return () => clearTimeout(timer);
    }, [connection?.isConnected]);

    // Убрано автоматическое обновление при фокусе - WebSocket обновляет данные в реальном времени
    // Пользователь может использовать pull-to-refresh для ручного обновления

    // Убираем HTTP polling fallback - WebSocket должен работать в real-time
    // Если WebSocket не подключен, пользователь увидит индикатор в dev режиме

    // Обработчик для pull-to-refresh
    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        dispatch(fetchRooms({ page: 1, limit: ROOMS_PAGE_LIMIT, forceRefresh: true }))
            .finally(() => setIsRefreshing(false));
    }, [dispatch]);

    useEffect(() => {
        if (!Array.isArray(memoizedRooms) || memoizedRooms.length === 0) return;

        const maxToPrefetch = 5;
        const subset = memoizedRooms.slice(0, maxToPrefetch);

        // КРИТИЧНО: Обрабатываем ошибку 404 при предзагрузке
        // Если комната удалена другим участником, она будет удалена из списка через fetchRoom.rejected
        const prefetchPromises = subset.map(async (room) => {
            if (!room?.id) return;
            
            // Проверяем, не удалена ли комната перед загрузкой
            if (deletedRoomIds.includes(room.id)) {
                return;
            }
            
            const hasParticipants = Array.isArray(room?.participants) && room.participants.length > 0;
            if (!hasParticipants) {
                try {
                    const result = await dispatch(fetchRoom(room.id));
                    // Если результат отклонен с isNotFound, комната уже удалена через fetchRoom.rejected
                    if (result.type.endsWith('/rejected')) {
                        const payload = result.payload;
                        if (payload?.isNotFound && payload?.roomId) {
                            if (__DEV__) {
                                console.log('⚠️ ChatListScreen: Room not found during prefetch, already removed from list', { roomId: room.id });
                            }
                        }
                    }
                } catch (error) {
                    // Игнорируем ошибки - они обрабатываются в fetchRoom.rejected
                }
            }
        });

        // Запускаем все запросы параллельно, но не ждем их завершения
        Promise.allSettled(prefetchPromises).catch(() => {
            // Игнорируем ошибки - они уже обработаны в fetchRoom.rejected
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

        const roomsToLoad = productRooms.filter(room => {
            const productId = room.productId;
            // Skip if product is already loaded
            if (productsById[productId]) return false;
            // Skip if we already tried to load it
            if (loadedProductsRef.current.has(productId)) return false;
            // Skip if product is known to be deleted/unavailable
            if (deletedProductIds.includes(productId)) return false;
            return true;
        });

        if (roomsToLoad.length > 0) {
            roomsToLoad.forEach((room) => {
                loadedProductsRef.current.add(room.productId);
                dispatch(fetchProductById(room.productId));
            });
        }
    }, [memoizedRooms, productsById, deletedProductIds, dispatch]);

    useEffect(() => {
        loadedProductsRef.current.clear();
    }, [memoizedRooms]);

    useFocusEffect(
        useCallback(() => {
            dispatch(setActiveRoom(null));
            showTabBar();
            // Сбрасываем флаг навигации при возврате на экран
            isNavigatingRef.current = false;
        }, [dispatch, showTabBar])
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
            // Check if product is deleted/unavailable
            if (room?.productId && deletedProductIds.includes(room.productId)) {
                return 'Товар удален';
            }
            
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

        // Персональная комната ИИ-помощника
        if (isAssistantRoom(room)) {
            return room?.title || ASSISTANT_CHAT_TITLE;
        }

        return room?.id ? `Комната ${room.id}` : 'Чат';
    }, [currentUserId, currentUser, productsById, deletedProductIds]);

    const toAbsoluteUri = useCallback((raw) => {
        if (!raw || typeof raw !== 'string') return null;
        return getImageUrl(raw);
    }, []);

    const getRoomAvatar = useCallback((room) => {
        if (!room?.id) return null;

        if (room.type === 'GROUP' || room.type === 'BROADCAST') {
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
        setIsRefreshing(true);
        dispatch(fetchRooms({ page: 1, limit: ROOMS_PAGE_LIMIT }))
            .finally(() => setIsRefreshing(false));
    }, [dispatch]);

    const handleLoadMore = useCallback(() => {
        if (loading || !hasMore) return;

        dispatch(fetchRooms({ page: page + 1, limit: ROOMS_PAGE_LIMIT }));
    }, [dispatch, loading, hasMore, page]);

    const openRoom = (room) => {
        const rid = room?.id ?? room?.roomId;
        if (!rid) {
            return;
        }
        
        // КРИТИЧНО: Проверяем, не удалена ли комната перед открытием
        // Это предотвращает попытку открыть чат, удаленный другим участником
        if (deletedRoomIds.includes(rid)) {
            if (__DEV__) {
                console.log('⚠️ ChatListScreen: Попытка открыть удаленную комнату, пропускаем', { roomId: rid });
            }
            return;
        }

        // ASSISTANT-комната открывается на экране ИИ-помощника в стеке чатов
        if (isAssistantRoom(room)) {
            isNavigatingRef.current = true;
            requestAnimationFrame(() => {
                InteractionManager.runAfterInteractions(() => {
                    navigation.navigate('AssistantChat', { roomId: rid, fromScreen: 'ChatList' });
                    setTimeout(() => {
                        isNavigatingRef.current = false;
                    }, 300);
                });
            });
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

    const handleRoomLongPress = useCallback((room) => {
        if (!isCurrentUserSuperAdmin) return;
        if (!room?.id || String(room?.type || '').toUpperCase() !== 'BROADCAST') return;

        const isPinned = isGloballyPinnedChannel(room);
        const actionTitle = isPinned ? 'Открепить канал' : 'Закрепить канал';
        const actionMessage = isPinned
            ? 'Канал перестанет быть приоритетным в списке чатов у всех пользователей.'
            : 'Канал будет отображаться первым в списке чатов у всех пользователей.';

        showAlert({
            type: 'confirm',
            title: actionTitle,
            message: actionMessage,
            buttons: [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: actionTitle,
                    style: 'primary',
                    onPress: () => {
                        dispatch(toggleGlobalPin({ roomId: room.id, isPinned: !isPinned }));
                    }
                }
            ]
        });
    }, [dispatch, isCurrentUserSuperAdmin, showAlert]);

    const renderItem = useCallback(({item}) => {
        const title = getChatTitle(item);
        const isPinnedChannel = isGloballyPinnedChannel(item);
        const avatarUri = getRoomAvatar(item);
        // Последнее сообщение для строки: селектор может отдать только serverLastMessage
        const lastMessageRaw = item.lastMessage ?? item.serverLastMessage;
        // STOP из чужих районов / просроченные — не в превью и без бейджа.
        // Правила применяются ТОЛЬКО к каналам (BROADCAST). В обычных групповых
        // чатах (GROUP) остановка всегда отображается в превью и считается в unread.
        const isFilteredByDistrict = item.type === 'BROADCAST' &&
            lastMessageRaw?.type === 'STOP' &&
            userDistrictIds.length > 0 &&
            !isStopInUserDistrict(lastMessageRaw, userDistrictIds);
        const isExpiredStop = item.type === 'BROADCAST' &&
            lastMessageRaw?.type === 'STOP' &&
            isStopMessageExpired(lastMessageRaw, timeTick);
        const lastMsgTypeUpper = String(lastMessageRaw?.type || '').toUpperCase();
        const isLastMessageSystem = lastMsgTypeUpper === 'SYSTEM';
        // Канал «Маршруты» (BROADCAST): любые SYSTEM в превью не показываем
        const isRoutesBroadcastChannel =
            item.type === 'BROADCAST' && /маршрут/i.test(String(item.title || ''));
        const hideSystemPreviewOnRoutes =
            isRoutesBroadcastChannel && isLastMessageSystem;
        // Все каналы: не показываем превью о назначении/отзыве администратора (как в ленте чата)
        const hideBroadcastAdminRoleSystemPreview =
            item.type === 'BROADCAST' &&
            isLastMessageSystem &&
            isGroupAdminRoleSystemMessage(lastMessageRaw);
        const hideSystemRelatedPreview =
            hideSystemPreviewOnRoutes || hideBroadcastAdminRoleSystemPreview;
        const lastMessage = (isFilteredByDistrict || isExpiredStop || hideSystemRelatedPreview)
            ? null
            : lastMessageRaw;

        const hideUnreadForForeignOrExpiredStop =
            isFilteredByDistrict || isExpiredStop || hideSystemRelatedPreview;
        const displayUnread = hideUnreadForForeignOrExpiredStop ? 0 : (Number(item.unread) || 0);

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
            const normalizedLastMessageStatus = lastMessage.status?.toUpperCase?.();

            // Логика определения статуса по приоритету:
            // READ (синие галочки) -> DELIVERED (серые галочки) -> SENT (одна серая галочка)
            if (lastMessage.readAt ||
                normalizedLastMessageStatus === 'READ') {
                messageStatus = 'READ';
            } else if (lastMessage.deliveredAt ||
                normalizedLastMessageStatus === 'DELIVERED') {
                messageStatus = 'DELIVERED';
            } else if (normalizedLastMessageStatus) {
                // Используем статус из сообщения, нормализуя к верхнему регистру
                messageStatus = normalizedLastMessageStatus;
            }
        }

        // Упрощенная логика для последнего сообщения
        let preview = '';
        let isStopMessage = false;
        let isVoiceMessage = false;
        let isWarehouseMessage = false;
        let isContactMessage = false;
        let time = '';

        if (lastMessage) {
            let messageContent = '';

            if (lastMessage.type === 'IMAGE') {
                messageContent = 'Фото';
            } else if (lastMessage.type === 'PRODUCT') {
                messageContent = 'Товар';
            } else if (lastMessage.type === 'STOP') {
                // Просрочку применяем только к каналам (BROADCAST). В обычных
                // групповых чатах STOP — обычное сообщение и всегда показывается.
                if (item.type === 'BROADCAST' && isStopMessageExpired(lastMessage, timeTick)) {
                    messageContent = 'Сообщение';
                } else {
                    isStopMessage = true;
                    messageContent = 'Остановка';
                }
            } else if (lastMessage.type === 'WAREHOUSE') {
                isWarehouseMessage = true;
                // Пытаемся получить название склада из данных
                let warehouseName = 'Склад';
                try {
                    if (lastMessage.warehouse?.name) {
                        warehouseName = lastMessage.warehouse.name;
                    } else if (lastMessage.content) {
                        const warehouseData = JSON.parse(lastMessage.content);
                        if (warehouseData?.name) {
                            warehouseName = warehouseData.name;
                        }
                    }
                } catch (e) {
                    // Если не удалось распарсить, используем дефолтное название
                }
                messageContent = warehouseName;
            } else if (lastMessage.type === 'VOICE') {
                isVoiceMessage = true;
                messageContent = 'Голосовое сообщение';
            } else if (lastMessage.type === 'CONTACT') {
                isContactMessage = true;
                // Для контактов показываем "Контакт" вместо JSON
                messageContent = 'Контакт';
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
            <TouchableOpacity
                style={styles.item}
                onPress={() => openRoom(item)}
                onLongPress={() => handleRoomLongPress(item)}
                delayLongPress={300}
            >
                <View style={[styles.avatarBox, isAssistantRoom(item) && styles.avatarBoxAssistant]}>
                    {isAssistantRoom(item) ? (
                        <AssistantAvatar size="list" />
                    ) : avatarUri ? (
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
                        <View style={styles.titleContainer}>
                            {isPinnedChannel && (
                                <Ionicons
                                    name="pin"
                                    size={12}
                                    color={isDark ? colors.warning : '#FF9500'}
                                    style={styles.pinnedIcon}
                                />
                            )}
                            <Text style={styles.title} numberOfLines={1}>{title}</Text>
                        </View>
                        <View style={styles.messageInfo}>
                            <Text style={styles.time}>{time}</Text>
                        </View>
                    </View>
                    <View style={styles.previewContainer}>
                        {/* Показываем галочки слева от сообщения для своих сообщений (но не для системных) */}
                        {lastMessage && isOwnMessage && lastMessage.type !== 'SYSTEM' && (
                            <View style={styles.statusContainerLeft}>
                                <StatusTicks status={messageStatus} styles={styles}/>
                            </View>
                        )}
                        {isStopMessage ? (
                            <View style={styles.stopPreviewContainer}>
                                <IconDelivery width={14} height={14} color={mutedIconColor} style={styles.stopIcon} />
                                <Text style={[
                                    styles.preview,
                                    lastMessage && isOwnMessage && styles.previewWithStatus
                                ]} numberOfLines={1}>{preview}</Text>
                            </View>
                        ) : isWarehouseMessage ? (
                            <View style={styles.warehousePreviewContainer}>
                                <IconWarehouse width={14} height={14} color={mutedIconColor} style={styles.warehouseIcon} />
                                <Text style={[
                                    styles.preview,
                                    lastMessage && isOwnMessage && styles.previewWithStatus
                                ]} numberOfLines={1}>{preview}</Text>
                            </View>
                        ) : isVoiceMessage ? (
                            <View style={styles.voiceMessageContainer}>
                                <VoiceMessageIcon styles={styles} iconColor={mutedIconColor} />
                                <Text style={[
                                    styles.preview,
                                    lastMessage && isOwnMessage && styles.previewWithStatus
                                ]} numberOfLines={1}>{preview}</Text>
                            </View>
                        ) : isContactMessage ? (
                            <View style={styles.contactMessageContainer}>
                                <Ionicons name="person" size={16} color={mutedIconColor} style={styles.contactIcon} />
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
                {!!displayUnread && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{displayUnread}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [getChatTitle, getRoomAvatar, openRoom, handleRoomLongPress, currentUserId, userDistrictIds, timeTick, styles, mutedIconColor, isDark, colors.warning]);

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

    const SeparatorComponent = useCallback(() => <View style={styles.separator}/>, [styles]);

    const EmptyComponent = useCallback(() => (
        !loading ? (
            <View style={{paddingVertical: 40, alignItems: 'center'}}>
                <Text style={{color: isDark ? colors.textSecondary : '#8696A0'}}>Чатов пока нет</Text>
            </View>
        ) : null
    ), [loading, isDark, colors.textSecondary]);

    const showTopLoader = loading && !isRefreshing;

    return (
        <View style={styles.container}>
            {/* Индикатор соединения только в dev режиме и только если отключение затянулось */}
            {__DEV__ && showDisconnectedWarning && !connection?.isConnected && (
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
                ListHeaderComponent={
                    showTopLoader ? (
                        <View style={styles.topLoader}>
                            <View style={styles.topLoaderBar} />
                        </View>
                    ) : null
                }
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[isDark ? colors.primary : '#007AFF']}
                        tintColor={isDark ? colors.primary : '#007AFF'}
                        progressBackgroundColor={isDark ? colors.surface : undefined}
                    />
                }
                contentContainerStyle={[styles.listContainer, { paddingBottom: tabBarHeight }]}
                scrollIndicatorInsets={{ bottom: tabBarHeight }}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={Platform.OS === 'android'}
                getItemLayout={getItemLayout}
                ItemSeparatorComponent={SeparatorComponent}
                ListEmptyComponent={EmptyComponent}
            />
        </View>
    );
};

const createStyles = (colors, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: isDark ? colors.background : '#FFFFFF',
    },
    listContainer: {
        paddingVertical: 0,
    },
    separator: {
        height: 1,
        backgroundColor: isDark ? colors.divider : '#E5E5E5',
        marginLeft: 68,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: isDark ? colors.background : '#FFFFFF',
        minHeight: 72,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: isDark ? colors.surfaceElevated : '#DDD',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    avatarBox: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: isDark ? colors.surfaceElevated : '#DDD',
        marginRight: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: isDark ? 0.3 : 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    avatarBoxAssistant: {
        backgroundColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        flex: 1,
        backgroundColor: isDark ? colors.surfaceElevated : '#DDD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupPlaceholderText: {
        fontSize: 20,
        color: isDark ? colors.textSecondary : '#666',
    },
    productPlaceholderText: {
        fontSize: 18,
        color: isDark ? colors.textSecondary : '#666',
    },
    userPlaceholderText: {
        fontSize: 18,
        color: isDark ? colors.textSecondary : '#666',
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
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
        marginRight: 8,
    },
    pinnedIcon: {
        marginRight: 4,
        marginTop: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
        color: isDark ? colors.textPrimary : '#000000',
        maxWidth: '75%',
        lineHeight: 22,
    },
    preview: {
        fontSize: 14,
        color: isDark ? colors.textSecondary : '#8696A0',
        lineHeight: 20,
        maxWidth: '80%',
    },
    time: {
        fontSize: 12,
        color: isDark ? colors.textTertiary : '#8696A0',
        lineHeight: 16,
    },
    badge: {
        backgroundColor: isDark ? '#1F8A4F' : '#25D366',
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
    warehousePreviewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    warehouseIcon: {
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
        color: isDark ? colors.textTertiary : '#8696A0',
        fontWeight: '700',
        lineHeight: 14,
        marginRight: -3,
    },
    tickRead: {
        color: isDark ? '#6BB6FF' : '#4FC3F7',
    },
    connectionIndicator: {
        backgroundColor: isDark ? 'rgba(255, 193, 7, 0.14)' : '#FFF3CD',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? 'rgba(255, 193, 7, 0.35)' : '#FFEAA7',
        borderLeftWidth: 4,
        borderLeftColor: isDark ? '#FF7675' : '#FF7675',
    },
    connectionWarning: {
        fontSize: 13,
        fontWeight: '500',
        color: isDark ? '#FFD24A' : '#856404',
        lineHeight: 18,
    },
    connectionDetails: {
        fontSize: 11,
        color: isDark ? '#FFD24A' : '#856404',
        marginTop: 4,
        opacity: 0.8,
    },
    topLoader: {
        height: 4,
        backgroundColor: isDark ? colors.surface : '#EAF2FF',
        justifyContent: 'center',
    },
    topLoaderBar: {
        height: 2,
        backgroundColor: isDark ? colors.primary : '#007AFF',
        marginHorizontal: 16,
        borderRadius: 1,
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
    contactMessageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    contactIcon: {
        marginRight: 6,
    },
});

export default ChatListScreen;

