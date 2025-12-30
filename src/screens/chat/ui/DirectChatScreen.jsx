import React, {useCallback, useEffect, useMemo, useState, useRef} from 'react';
import {
    View, 
    FlatList, 
    StyleSheet, 
    TouchableOpacity, 
    Text, 
    Modal, 
    Platform, 
    BackHandler, 
    Vibration, 
    Animated, 
    Clipboard, 
    KeyboardAvoidingView, 
    Keyboard,
    AppState
} from 'react-native';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect, CommonActions} from '@react-navigation/native';
import {useDispatch, useSelector, useStore} from 'react-redux';
import {useTabBar} from '@widgets/navigation/context';
import {
    fetchMessages,
    markAsRead,
    sendProduct,
    fetchRoom,
    setActiveRoom,
    deleteRoom,
    deleteMessage,
    sendVoice,
    sendImages,
    cancelFailedMessage,
    updateMessageReactions,
} from '@entities/chat/model/slice';
import {makeSelectRoomMessages, selectIsRoomDeleted} from '@entities/chat/model/selectors';
import {fetchProductById} from '@entities/product/model/slice';
import {selectIsProductDeleted} from '@entities/product/model/selectors';
import {
    SwipeableMessageBubble, 
    ForwardMessageModal, 
    ReactionPicker, 
    FullEmojiPicker, 
    TypingIndicator, 
    useTypingIndicatorHeight
} from '@entities/chat';
import {Composer} from '@entities/chat/ui/Composer';
import {ChatBackground} from '@entities/chat/ui/ChatBackground';
import {useChatSocketActions} from '@entities/chat/hooks/useChatSocketActions';
import {ChatHeader} from '@entities/chat/ui/ChatHeader';
import {ChatSelectionHeader} from '@entities/chat/ui/ChatSelectionHeader';
import {useCachedMessages, useMediaPreload} from '@entities/chat/hooks/useChatCache';

import {getBaseUrl} from '@shared/api/api';
import {ImageViewerModal} from '@shared/ui/ImageViewerModal/ui/ImageViewerModal';
import {IconDelete} from '@shared/ui/Icon/ProductManagement/IconDelete';
import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';
import {useCustomAlert} from '@shared/ui/CustomAlert/CustomAlertProvider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Ionicons} from '@expo/vector-icons';
import ChatApi from '@entities/chat/api/chatApi';
import {selectRoomsList} from '@entities/chat/model/selectors';
import PushNotificationService from '@shared/services/PushNotificationService';
import {getChatKeyboardGapPx} from '@shared/lib/device/chatKeyboardGap';


export const DirectChatScreen = ({route, navigation}) => {
    const {
        roomId,
        productId: shareProductId,
        productInfo,
        autoSendProduct,
        groupRoomId,
        userId,
    } = route.params;
    
    // Проверка устройства для специальной обработки Samsung
    const isSamsung = useMemo(() => {
        const brand = String(Device.brand || '').toLowerCase();
        return brand.includes('samsung');
    }, []);
    
    // UI State
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [selectedImageUri, setSelectedImageUri] = useState(null);
    const [menuModalVisible, setMenuModalVisible] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState(new Set());
    const [retryingMessages, setRetryingMessages] = useState(new Set());
    const [pressedMessageId, setPressedMessageId] = useState(null);
    
    // Reply and Forward State
    const [replyTo, setReplyTo] = useState(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [messageToForward, setMessageToForward] = useState(null);
    
    // Reaction State
    const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
    const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
    const [reactionPickerPosition, setReactionPickerPosition] = useState(null);
    const [fullEmojiPickerVisible, setFullEmojiPickerVisible] = useState(false);
    
    // Delete Message State
    const [deleteMessageModalVisible, setDeleteMessageModalVisible] = useState(false);
    const [messagesToDelete, setMessagesToDelete] = useState([]);
    
    // Refs
    const isRoomDeletedRef = useRef(false);
    const isLoadingMoreRef = useRef(false);
    const flatListRef = useRef(null);
    const isMountedRef = useRef(true);
    const paddingTopAnim = useRef(new Animated.Value(0)).current;
    const appStateRef = useRef(AppState.currentState);
    
    // Hooks
    const dispatch = useDispatch();
    const store = useStore();
    const { showError, showWarning, showConfirm } = useCustomAlert();
    const insets = useSafeAreaInsets();
    const { hideTabBar, showTabBar } = useTabBar();
    
    // Улучшенное управление клавиатурой
    const [keyboardState, setKeyboardState] = useState({
        visible: false,
        height: 0,
        duration: 250,
    });
    
    const [animatedPaddingTop, setAnimatedPaddingTop] = useState(0);
    
    // Constants
    const headerOffset = 64;
    
    // Selectors
    const selectRoomMessages = useMemo(() => makeSelectRoomMessages(), []);
    const reduxMessages = useSelector((s) => selectRoomMessages(s, roomId));
    const loading = useSelector((s) => s.chat?.messages?.[roomId]?.loading);
    const hasMore = useSelector((s) => s.chat?.messages?.[roomId]?.hasMore ?? true);
    const cursorId = useSelector((s) => s.chat?.messages?.[roomId]?.cursorId);
    const currentUserId = useSelector((s) => s.auth?.user?.id);
    const currentUser = useSelector((s) => s.auth?.user);
    const roomDataRaw = useSelector((s) => s.chat?.rooms?.byId?.[roomId]);
    const roomData = roomDataRaw?.room ? roomDataRaw.room : roomDataRaw;
    const participantsById = useSelector((s) => s.chat?.participants?.byUserId || {});
    const isRoomDeleted = useSelector((s) => selectIsRoomDeleted(s, roomId));
    const rooms = useSelector(selectRoomsList);
    
    
    // Кэш сообщений
    const { messages: cachedMessages, isLoading: isCacheLoading } = useCachedMessages(roomId);
    
    // Объединяем кэшированные и Redux сообщения
    const messages = useMemo(() => {
        if (reduxMessages && Array.isArray(reduxMessages) && reduxMessages.length > 0) {
            return reduxMessages;
        }
        if (cachedMessages && Array.isArray(cachedMessages) && cachedMessages.length > 0) {
            return cachedMessages;
        }
        return [];
    }, [reduxMessages, cachedMessages]);
    
    // Фоновая предзагрузка медиа
    useMediaPreload(roomId, messages);
    
    // WebSocket функции
    const { emitActiveRoom, emitMarkRead, emitToggleReaction } = useChatSocketActions();
    
    // Высота индикатора печати
    const typingIndicatorHeight = useTypingIndicatorHeight(roomId);
    
    // Вычисляем offset для KeyboardAvoidingView
    const keyboardVerticalOffset = useMemo(() => {
        if (Platform.OS === 'ios') {
            return insets.top + headerOffset;
        }
        // Для Android добавляем 20px для Samsung клавиатуры
        return headerOffset + 20;
    }, [insets.top]);
    
    // Дополнительный отступ для Android
    const androidKeyboardGap = useMemo(() => {
        if (Platform.OS !== 'android' || !keyboardState.visible) {
            return 0;
        }
        // Для Samsung S25 Ultra нужен большой дополнительный gap
        const gap = getChatKeyboardGapPx({ keyboardHeight: keyboardState.height });
        if (gap > 0) {
            return gap; 
        }
        // Для обычных Android устройств добавляем 10px чтобы поле ввода не заходило за клавиатуру
        return 10;
    }, [keyboardState.visible, keyboardState.height]);
    
    // Динамический стиль для контента списка
    const listContentStyle = useMemo(() => [
        styles.listContent,
        { 
            paddingTop: animatedPaddingTop, 
            paddingBottom: 0 + headerOffset 
        }
    ], [animatedPaddingTop, headerOffset]);
    
    // Динамический стиль для контейнера чата
    const chatContentStyle = useMemo(() => [
        styles.chatContent
    ], []);
    
    // Стиль для белой панели системных кнопок
    const systemBarStyle = useMemo(() => ({
        height: insets.bottom,
        backgroundColor: '#ffffff',
        width: '100%',
    }), [insets.bottom]);
    
    // Стиль для Composer контейнера (БЕЗ белого фона)
    const composerContainerStyle = useMemo(() => {
        const baseStyle = {
            position: 'relative',
        };
        
        if (Platform.OS === 'android' && androidKeyboardGap > 0) {
            return [baseStyle, { marginBottom: androidKeyboardGap }];
        }
        
        return baseStyle;
    }, [androidKeyboardGap]);
    
    // Проверка прав
    const isSuperAdmin = useMemo(() => {
        return currentUser?.role === 'ADMIN' && 
               (currentUser?.admin?.isSuperAdmin || currentUser?.profile?.isSuperAdmin || currentUser?.isSuperAdmin);
    }, [currentUser]);

    const canDeleteMessage = useCallback((message) => {
        if (!message) return false;
        if (isSuperAdmin) return true;
        // Нормализуем ID для корректного сравнения (строка vs число)
        const messageSenderId = message.senderId ? Number(message.senderId) : null;
        const normalizedCurrentUserId = currentUserId ? Number(currentUserId) : null;
        return messageSenderId === normalizedCurrentUserId;
    }, [isSuperAdmin, currentUserId]);

    // Данные собеседника
    const chatPartner = useMemo(() => {
        if (!roomData?.participants || !currentUserId) return null;
        return roomData.participants.find(p =>
            (p?.userId ?? p?.user?.id) !== currentUserId
        );
    }, [roomData?.participants, currentUserId]);

    const partnerAvatar = useMemo(() => {
        if (!chatPartner) return null;

        const partnerId = chatPartner?.userId ?? chatPartner?.user?.id ?? chatPartner?.id;
        const cachedUser = participantsById[partnerId];

        let raw = cachedUser?.avatar;
        if (!raw) {
            raw = chatPartner?.user?.avatar ||
                chatPartner?.user?.profile?.avatar ||
                chatPartner?.user?.image ||
                chatPartner?.avatar ||
                chatPartner?.profile?.avatar ||
                chatPartner?.image;
        }

        if (raw && !raw.startsWith('http')) {
            return `${getBaseUrl()}${raw}`;
        }
        return raw;
    }, [chatPartner, participantsById]);

    const canSendMessages = true;

    // ============ EFFECTS ============
    
    // Отслеживаем размонтирование
    useEffect(() => {
        isMountedRef.current = true;
        // Немедленно скрываем таббар при монтировании
        hideTabBar();
        
        return () => {
            isMountedRef.current = false;
        };
    }, [hideTabBar]);
    
    // Скрываем таббар при входе на экран чата (в дополнение к useEffect выше)
    useFocusEffect(
        useCallback(() => {
            hideTabBar();
            
            return () => {
                // Показываем таббар только если компонент все еще смонтирован
                if (isMountedRef.current) {
                    showTabBar();
                }
            };
        }, [hideTabBar, showTabBar])
    );
    
    // Подписка на события клавиатуры
    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        
        const handleKeyboardShow = (event) => {
            if (!isMountedRef.current) return;
            
            const {height, duration} = event.endCoordinates || {};
            
            setKeyboardState({
                visible: true,
                height: height || 0,
                duration: duration || 250,
            });
        };
        
        const handleKeyboardHide = (event) => {
            if (!isMountedRef.current) return;
            
            const {duration} = event.endCoordinates || {};
            
            setKeyboardState({
                visible: false,
                height: 0,
                duration: duration || 250,
            });
        };
        
        const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
        const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);
        
        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);
    
    // Закрытие клавиатуры системным свайпом назад или кнопкой (Android)
    useEffect(() => {
        if (Platform.OS !== 'android') return;
        
        const handleBackPress = () => {
            if (keyboardState.visible) {
                Keyboard.dismiss();
                return true; // Предотвращаем выход из экрана
            }
            return false; // Разрешаем стандартное поведение
        };
        
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        
        return () => {
            backHandler.remove();
        };
    }, [keyboardState.visible]);
    
    // КРИТИЧНО: Синхронизация сообщений при возврате из фона
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            // При переходе в фон - закрываем клавиатуру и сбрасываем состояние
            if (nextAppState.match(/inactive|background/) && appStateRef.current === 'active') {
                Keyboard.dismiss();
                setKeyboardState({
                    visible: false,
                    height: 0,
                    duration: 250,
                });
            }
            
            if (
                appStateRef.current.match(/inactive|background/) &&
                nextAppState === 'active' &&
                roomId &&
                !isRoomDeletedRef.current
            ) {
                console.log('📱 DirectChat: App returned from background, syncing messages for room:', roomId);
                // Принудительно синхронизируем сообщения с сервера
                dispatch(fetchMessages({ roomId, limit: 100 }));
                
                // Сбрасываем состояние клавиатуры при возврате из фона
                // чтобы избежать смещения поля ввода
                setKeyboardState({
                    visible: false,
                    height: 0,
                    duration: 250,
                });
                Keyboard.dismiss();
            }
            appStateRef.current = nextAppState;
        });
        
        return () => {
            subscription?.remove();
        };
    }, [roomId, dispatch]);
    
    // Анимация padding для индикатора печати
    useEffect(() => {
        const targetValue = typingIndicatorHeight > 0 ? 35 : 0;
        
        const listenerId = paddingTopAnim.addListener(({ value }) => {
            setAnimatedPaddingTop(value);
        });
        
        Animated.spring(paddingTopAnim, {
            toValue: targetValue,
            useNativeDriver: false,
            tension: 65,
            friction: 8,
        }).start();
        
        return () => {
            paddingTopAnim.removeListener(listenerId);
        };
    }, [typingIndicatorHeight, paddingTopAnim]);
    
    // Синхронизация режима выбора
    useEffect(() => {
        if (selectedMessages.size === 0 && isSelectionMode) {
            setIsSelectionMode(false);
        }
    }, [selectedMessages.size, isSelectionMode]);
    
    // Навигация beforeRemove
    useEffect(() => {
        const sub = navigation.addListener('beforeRemove', (e) => {
            const actionType = e?.data?.action?.type;
            const targetRouteName = e?.data?.action?.payload?.name;
            
            if (isRoomDeletedRef.current) {
                dispatch(setActiveRoom(null));
                if (targetRouteName === 'ChatMain' || actionType === 'RESET') {
                    return;
                }
                return;
            }

            const productId = route.params?.productId || route.params?.productInfo?.id;
            const fromScreen = route.params?.fromScreen;

            dispatch(setActiveRoom(null));

            // Если возвращаемся к ProductDetail из ChatRoom, и оба в AppStack,
            // просто разрешаем обычный back - не перехватываем навигацию
            // ProductDetail и ChatRoom оба находятся в AppStack, поэтому обычный back должен работать
            if (productId && fromScreen === 'ProductDetail' && (actionType === 'POP' || actionType === 'GO_BACK' || !actionType)) {
                // Не перехватываем навигацию - разрешаем обычный back
                // React Navigation автоматически вернет к предыдущему экрану (ProductDetail) в стеке
                return;
            }
        });
        return sub;
    }, [navigation, route.params, dispatch]);
    
    // Проверка удаления комнаты
    useEffect(() => {
        if ((!roomData || isRoomDeleted) && roomId) {
            isRoomDeletedRef.current = true;
            
            dispatch(setActiveRoom(null));
            if (emitActiveRoom) {
                emitActiveRoom(null);
            }
            
            try {
                const parent = navigation.getParent();
                if (parent) {
                    parent.navigate('ChatMain');
                } else if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.navigate('ChatMain');
                }
            } catch (error) {
                try {
                    if (navigation.canGoBack()) {
                        navigation.goBack();
                    }
                } catch (backError) {
                    // Ignore
                }
            }
        }
    }, [roomData, roomId, isRoomDeleted, dispatch, navigation, emitActiveRoom]);
    
    // Установка активной комнаты
    useEffect(() => {
        if (isRoomDeletedRef.current || isRoomDeleted || !roomId) {
            return;
        }

        PushNotificationService.setActiveChatRoomId(roomId);
        PushNotificationService.setActiveChatPeerUserId(userId);
        
        dispatch(setActiveRoom(roomId));
        
        if (emitActiveRoom) {
            emitActiveRoom(roomId);
        }
        
        dispatch(fetchRoom(roomId));

        let markAsReadTimeout;
        const unsubscribe = navigation.addListener('focus', () => {
            if (!isRoomDeletedRef.current && !isRoomDeleted) {
                PushNotificationService.clearChatNotifications(roomId);
                PushNotificationService.clearChatNotificationsForPeerUser(userId);
                clearTimeout(markAsReadTimeout);
                markAsReadTimeout = setTimeout(() => {
                    dispatch(markAsRead({roomId, currentUserId}));
                }, 300);
            }
        });
        
        return () => {
            unsubscribe();
            if (markAsReadTimeout) {
                clearTimeout(markAsReadTimeout);
            }
            dispatch(setActiveRoom(null));
            PushNotificationService.setActiveChatRoomId(null);
            PushNotificationService.setActiveChatPeerUserId(null);
            if (emitActiveRoom) {
                emitActiveRoom(null);
            }
        };
    }, [dispatch, roomId, navigation, currentUserId, emitActiveRoom, isRoomDeleted, userId]);
    
    // Отметка непрочитанных сообщений
    useEffect(() => {
        if (!messages || !Array.isArray(messages) || !currentUserId) return;

        const unreadMessages = messages.filter(msg =>
            msg.senderId !== currentUserId &&
            (msg.status === 'SENT' || msg.status === 'DELIVERED')
        );

        if (unreadMessages.length > 0) {
            const timeoutId = setTimeout(() => {
                const messageIds = unreadMessages.map(msg => msg.id);
                dispatch(markAsRead({roomId, currentUserId, messageIds}));
            }, 500);

            return () => clearTimeout(timeoutId);
        }
    }, [messages, currentUserId, roomId, dispatch]);
    
    // Автоотправка товара
    useEffect(() => {
        if (autoSendProduct && productInfo) {
            const hasProductMessage = messages.some(msg =>
                msg.type === 'PRODUCT' &&
                (msg.productId === productInfo.id || msg.product?.id === productInfo.id)
            );

            if (hasProductMessage) {
                return;
            }

            const timeoutId = setTimeout(async () => {
                const hasProductMessageAfterLoad = messages.some(msg =>
                    msg.type === 'PRODUCT' &&
                    (msg.productId === productInfo.id || msg.product?.id === productInfo.id)
                );

                if (hasProductMessageAfterLoad) {
                    return;
                }

                try {
                    await dispatch(fetchProductById(productInfo.id));

                    const result = await dispatch(sendProduct({
                        roomId,
                        productId: productInfo.id
                    }));

                    if (result.error) {
                        console.error('DirectChat: Ошибка при отправке товара:', result.error);
                        return;
                    }

                    setTimeout(() => {
                        dispatch(fetchMessages({roomId, limit: 100}));
                    }, 500);
                } catch (error) {
                    console.error('DirectChat: Ошибка при автоматической отправке товара', error);
                }
            }, 2000);

            return () => clearTimeout(timeoutId);
        }
    }, [autoSendProduct, productInfo, roomId, dispatch, messages]);
    
    // Настройка навигации в зависимости от режима
    useEffect(() => {
        if (isSelectionMode) {
            const canReply = canSendMessages && selectedMessages.size === 1;
            const selectedMessagesArray = Array.from(selectedMessages);
            // canDeleteAll = true только если есть выбранные сообщения И все они могут быть удалены
            const canDeleteAll = selectedMessagesArray.length > 0 && selectedMessagesArray.every(msgId => {
                const msg = messages.find(m => m.id === msgId);
                return msg && canDeleteMessage(msg);
            });
            
            navigation.setOptions({
                headerShown: true,
                header: () => (
                    <ChatSelectionHeader
                        selectedCount={selectedMessages.size}
                        canReply={canReply}
                        canDelete={canDeleteAll}
                        onCancel={clearSelection}
                        onReply={handleReplyToSelected}
                        onCopy={handleCopySelectedMessages}
                        onForward={handleForwardSelectedMessages}
                        onDelete={deleteSelectedMessages}
                    />
                ),
                gestureEnabled: false,
            });
            
            const backHandler = () => {
                if (isSelectionMode) {
                    clearSelection();
                    return true;
                }
                return false;
            };
            
            if (Platform.OS === 'android') {
                const backHandlerSubscription = BackHandler.addEventListener('hardwareBackPress', backHandler);
                
                return () => {
                    if (backHandlerSubscription && typeof backHandlerSubscription.remove === 'function') {
                        backHandlerSubscription.remove();
                    }
                };
            }
        } else {
            navigation.setOptions({
                headerShown: true,
                header: () => <ChatHeader route={route} navigation={navigation} />,
                gestureEnabled: true,
            });
        }
    }, [navigation, route, isSelectionMode, selectedMessages.size, deleteSelectedMessages, clearSelection, handleReplyToSelected, handleCopySelectedMessages, handleForwardSelectedMessages, canSendMessages, canDeleteMessage, messages]);

    // ============ CALLBACKS ============
    
    const toggleMessageSelection = useCallback((messageId) => {
        setSelectedMessages(prev => {
            const updated = new Set(prev);
            const wasSelected = updated.has(messageId);
            
            if (wasSelected) {
                updated.delete(messageId);
            } else {
                updated.add(messageId);
                // На iOS используем Haptics для короткой тактильной обратной связи
                // На Android используем короткую вибрацию с параметром
                if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } else {
                    Vibration.vibrate(5);
                }
            }
            
            return updated;
        });
        
        setIsSelectionMode(prev => {
            if (!prev) return true;
            return prev;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedMessages(new Set());
        setIsSelectionMode(false);
        setReactionPickerVisible(false);
        setReactionPickerMessageId(null);
        setReactionPickerPosition(null);
    }, []);

    const handleForwardSelectedMessages = useCallback(() => {
        if (selectedMessages.size > 0) {
            setMessageToForward(null);
            setForwardModalVisible(true);
        }
    }, [selectedMessages]);

    const handleForwardMessage = useCallback(async (roomIds) => {
        if (!messageToForward && selectedMessages.size === 0) return;

        try {
            if (selectedMessages.size > 0) {
                const messageIds = Array.from(selectedMessages);
                for (const messageId of messageIds) {
                    await ChatApi.forwardMessage(messageId, roomIds);
                }
                clearSelection();
            } else if (messageToForward) {
                await ChatApi.forwardMessage(messageToForward.id, roomIds);
            }
            
            setForwardModalVisible(false);
            setMessageToForward(null);
            
            if (roomIds.length === 1) {
                const targetRoomId = roomIds[0];
                const targetRoom = rooms.find(r => r.id === targetRoomId);
                
                if (targetRoom) {
                    navigation.navigate('ChatRoom', {
                        roomId: targetRoomId,
                        roomData: targetRoom
                    });
                }
            }
        } catch (error) {
            console.error('Error forwarding message:', error);
            showError('Ошибка пересылки', error.message || 'Не удалось переслать сообщение');
        }
    }, [messageToForward, selectedMessages, rooms, navigation, showError, clearSelection]);

    const handleReplyToSelected = useCallback(() => {
        if (selectedMessages.size === 1) {
            const messageId = Array.from(selectedMessages)[0];
            const message = messages.find(m => m.id === messageId);
            if (message) {
                handleReply(message);
                clearSelection();
            }
        }
    }, [selectedMessages, messages, clearSelection]);

    const handleCopySelectedMessages = useCallback(() => {
        if (selectedMessages.size === 0) return;

        const messageIds = Array.from(selectedMessages);
        const selectedMessagesData = messageIds
            .map(id => messages.find(m => m.id === id))
            .filter(Boolean)
            .sort((a, b) => {
                const timeA = new Date(a.createdAt).getTime();
                const timeB = new Date(b.createdAt).getTime();
                return timeA - timeB;
            });

        const textParts = selectedMessagesData.map(message => {
            switch (message.type) {
                case 'TEXT':
                    return message.content || '';
                case 'IMAGE':
                    const caption = message.content || message.text || message.caption;
                    if (caption) return caption;
                    const imageCaption = message.attachments?.find(att => att.caption || att.description || att.text);
                    if (imageCaption) {
                        return imageCaption.caption || imageCaption.description || imageCaption.text;
                    }
                    return '[Изображение]';
                case 'VOICE':
                    return '[Голосовое сообщение]';
                case 'PRODUCT':
                    try {
                        const productData = message.product || (message.content ? JSON.parse(message.content) : null);
                        if (productData?.name) return productData.name;
                    } catch (e) {}
                    return '[Товар]';
                case 'STOP':
                    try {
                        const stopData = message.stop || (message.content ? JSON.parse(message.content) : null);
                        if (stopData?.address) return stopData.address;
                    } catch (e) {}
                    return '[Остановка]';
                case 'POLL':
                    if (message.poll?.question) return message.poll.question;
                    return '[Опрос]';
                case 'SYSTEM':
                    return message.content || '';
                default:
                    return message.content || '[Сообщение]';
            }
        }).filter(Boolean);

        if (textParts.length === 0) {
            showWarning('Копирование', 'Нечего копировать');
            return;
        }

        const textToCopy = textParts.join('\n');
        Clipboard.setString(textToCopy);
        // На iOS используем Haptics для короткой тактильной обратной связи
        // На Android используем короткую вибрацию с параметром
        if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
            Vibration.vibrate(10);
        }
        clearSelection();
    }, [selectedMessages, messages, showWarning, clearSelection]);

    const handleRetryMessage = useCallback(async (message) => {
        if (!message?.temporaryId) return;
        
        const temporaryId = message.temporaryId;
        setRetryingMessages(prev => new Set(prev).add(temporaryId));
        
        try {
            if (message.type === 'VOICE') {
                const voiceAttachment = message?.attachments?.find(att => att.type === 'VOICE');
                if (!voiceAttachment) {
                    throw new Error('Голосовое вложение не найдено');
                }
                
                const voiceData = {
                    uri: voiceAttachment.path,
                    duration: voiceAttachment.duration,
                    type: voiceAttachment.mimeType,
                    size: voiceAttachment.size,
                    waveform: voiceAttachment.waveform || []
                };
                
                await dispatch(sendVoice({ 
                    roomId, 
                    voice: voiceData, 
                    temporaryId,
                    retryCount: 0 
                })).unwrap();
            } else if (message.type === 'IMAGE') {
                const imageAttachments = message?.attachments?.filter(att => att.type === 'IMAGE') || [];
                if (imageAttachments.length === 0) {
                    throw new Error('Изображения не найдены');
                }
                
                const files = imageAttachments.map(att => ({
                    uri: att.path,
                    type: att.mimeType || 'image/jpeg',
                    size: att.size,
                    name: att.path?.split('/').pop() || `image_${Date.now()}.jpg`
                }));
                
                const captions = imageAttachments.map(att => att.caption || '');
                
                await dispatch(sendImages({ 
                    roomId, 
                    files, 
                    captions,
                    temporaryId,
                    retryCount: 0 
                })).unwrap();
            } else {
                throw new Error('Неподдерживаемый тип сообщения для повтора');
            }
            
        } catch (error) {
            console.error('Ошибка при повторной отправке:', error);
            showError('Ошибка', 'Не удалось отправить сообщение');
        } finally {
            setRetryingMessages(prev => {
                const newSet = new Set(prev);
                newSet.delete(temporaryId);
                return newSet;
            });
        }
    }, [dispatch, roomId, showError]);
    
    const handleCancelMessage = useCallback((message) => {
        if (!message?.temporaryId) return;
        
        showConfirm(
            'Отменить отправку',
            'Удалить это сообщение?',
            () => {
                dispatch(cancelFailedMessage({ 
                    temporaryId: message.temporaryId, 
                    roomId 
                }));
            }
        );
    }, [dispatch, roomId, showConfirm]);

    const handleReply = useCallback((message) => {
        setReplyTo(message);
    }, []);

    const handleCancelReply = useCallback(() => {
        setReplyTo(null);
    }, []);

    const handleReplyPress = useCallback((message) => {
        if (!message || !flatListRef.current) return;
        
        const messageIndex = messages.findIndex(m => m.id === message.id);
        if (messageIndex === -1) {
            if (__DEV__) {
                console.log('handleReplyPress: Сообщение не найдено в списке', { messageId: message.id });
            }
            return;
        }
        
        setTimeout(() => {
            try {
                flatListRef.current?.scrollToIndex({
                    index: messageIndex,
                    animated: true,
                    viewPosition: 0.5,
                });
                
                setTimeout(() => {
                    setHighlightedMessageId(message.id);
                    
                    setTimeout(() => {
                        setHighlightedMessageId(null);
                    }, 2000);
                }, 400);
                
            } catch (error) {
                if (__DEV__) {
                    console.log('handleReplyPress: scrollToIndex failed', error);
                }
            }
        }, 100);
    }, [messages]);

    const handleAvatarPress = useCallback(() => {
        if (!chatPartner) return;
        
        const userId = chatPartner?.userId ?? chatPartner?.user?.id ?? chatPartner?.id;
        if (!userId || userId === currentUserId) return;
        
        const rootNavigation =
            navigation?.getParent?.('AppStack') ||
            navigation?.getParent?.() ||
            navigation;

        (rootNavigation || navigation).navigate('UserPublicProfile', {
            userId,
            fromScreen: 'ChatRoom',
            roomId,
        });
    }, [chatPartner, currentUserId, navigation, roomId]);

    const handleContactDriver = useCallback(async (type, stopData) => {
        if (!stopData) return;
        
        const driverUserId = stopData.driverUserId || stopData.driver?.userId;
        const driverName = stopData.driverName || stopData.driver?.name || 'Водитель';
        
        if (!driverUserId) {
            showError('Ошибка', 'Информация о водителе недоступна');
            return;
        }
        
        const existingChat = rooms.find(room => {
            if (room.type !== 'DIRECT') return false;
            return room.participants?.some(p => {
                const pId = p?.userId ?? p?.user?.id ?? p?.id;
                return pId === driverUserId;
            });
        });
        
        if (existingChat) {
            navigation.navigate('ChatRoom', {
                roomId: existingChat.id,
                roomTitle: driverName,
                roomData: existingChat,
                userId: driverUserId,
                fromScreen: 'DirectChat'
            });
        } else {
            try {
                const formData = new FormData();
                formData.append('type', 'DIRECT');
                formData.append('title', driverName);
                formData.append('members', JSON.stringify([driverUserId]));
                
                const response = await ChatApi.createRoom(formData);
                const room = response?.data?.room || response?.data;
                
                if (room?.id) {
                    navigation.navigate('ChatRoom', {
                        roomId: room.id,
                        roomTitle: driverName,
                        roomData: room,
                        userId: driverUserId,
                        fromScreen: 'DirectChat'
                    });
                }
            } catch (error) {
                console.error('Error creating chat with driver:', error);
                showError('Ошибка', 'Не удалось создать чат с водителем');
            }
        }
    }, [rooms, navigation, showError]);

    const deleteSelectedMessages = useCallback(() => {
        if (selectedMessages.size === 0) return;
        
        const messageIds = Array.from(selectedMessages);
        // Фильтруем только те сообщения, которые можно удалить
        const messagesToDeleteData = messageIds
            .map(id => messages.find(m => m.id === id))
            .filter(Boolean)
            .filter(msg => canDeleteMessage(msg));
        
        if (messagesToDeleteData.length === 0) {
            showWarning('Удаление', 'Нет сообщений, которые можно удалить');
            return;
        }
        
        setMessagesToDelete(messagesToDeleteData);
        setDeleteMessageModalVisible(true);
    }, [selectedMessages, messages, canDeleteMessage, showWarning]);

    const handleDeleteMessages = useCallback(async (messageIds) => {
        if (!Array.isArray(messageIds) || messageIds.length === 0) return;

        try {
            const deletePromises = messageIds.map(async (messageId) => {
                const message = messages.find(m => m.id === messageId);
                if (!message) {
                    console.warn('DirectChat: Message not found for deletion:', messageId);
                    return;
                }
                
                const isAuthor = message.senderId === currentUserId;
                
                const MESSAGE_DELETE_WINDOW_HOURS = 48;
                const messageAge = Date.now() - new Date(message.createdAt).getTime();
                const withinWindow = messageAge <= (MESSAGE_DELETE_WINDOW_HOURS * 3600 * 1000);
                
                let forAll = false;
                if (isSuperAdmin || currentUser?.role === 'ADMIN') {
                    forAll = true;
                } else if (isAuthor && withinWindow) {
                    forAll = true;
                }

                const result = await dispatch(deleteMessage({
                    messageId,
                    forAll,
                    currentUserId
                }));
                
                if (result.type.endsWith('/rejected')) {
                    console.error('DirectChat: Delete message failed:', result.payload);
                }
                
                return result;
            });

            const results = await Promise.allSettled(deletePromises);
            
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.type?.endsWith('/fulfilled')).length;
            const failCount = results.filter(r => r.status === 'rejected' || r.value?.type?.endsWith('/rejected')).length;

            setTimeout(() => {
                dispatch(fetchMessages({roomId, limit: 100}));
            }, 100);
            
            if (failCount > 0) {
                showWarning(
                    'Частичное удаление',
                    `Удалено: ${successCount}, не удалось удалить: ${failCount}`
                );
            }
        } catch (error) {
            console.error('Ошибка при удалении сообщений:', error);
            showError('Ошибка', 'Не удалось удалить некоторые сообщения');
        }
    }, [isSuperAdmin, currentUser?.role, currentUserId, dispatch, roomId, messages, showWarning, showError]);

    const handleDeleteSelectedMessages = useCallback(async (forAll) => {
        if (messagesToDelete.length === 0) return;

        try {
            setDeleteMessageModalVisible(false);
            
            // Дополнительная проверка: если удаляем у всех, проверяем права
            if (forAll) {
                const canDeleteForAll = isSuperAdmin || 
                    messagesToDelete.every(msg => {
                        const messageSenderId = msg.senderId ? Number(msg.senderId) : null;
                        const normalizedCurrentUserId = currentUserId ? Number(currentUserId) : null;
                        return messageSenderId === normalizedCurrentUserId;
                    });
                
                if (!canDeleteForAll) {
                    showError('Ошибка', 'Недостаточно прав для удаления этих сообщений у всех');
                    return;
                }
            }
            
            const messageIds = messagesToDelete.map(m => m.id);
            const deletePromises = messageIds.map(async (messageId) => {
                const result = await dispatch(deleteMessage({
                    messageId,
                    forAll,
                    currentUserId
                }));
                
                if (result.type.endsWith('/rejected')) {
                    console.error('DirectChat: Delete message failed:', result.payload);
                }
                
                return result;
            });

            const results = await Promise.allSettled(deletePromises);
            
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.type?.endsWith('/fulfilled')).length;
            const failCount = results.filter(r => r.status === 'rejected' || r.value?.type?.endsWith('/rejected')).length;

            clearSelection();
            setMessagesToDelete([]);

            setTimeout(() => {
                dispatch(fetchMessages({roomId, limit: 100}));
            }, 100);
            
            if (failCount > 0) {
                showWarning(
                    'Частичное удаление',
                    `Удалено: ${successCount}, не удалось удалить: ${failCount}`
                );
            }
        } catch (error) {
            console.error('Ошибка при удалении сообщений:', error);
            clearSelection();
            setMessagesToDelete([]);
            showError('Ошибка', 'Не удалось удалить сообщения');
        }
    }, [messagesToDelete, dispatch, currentUserId, roomId, clearSelection, showWarning, showError, isSuperAdmin]);

    const handleAddReaction = useCallback(async (emoji) => {
        console.log('👍 handleAddReaction called with emoji:', emoji);
    }, []);

    const handleToggleReaction = useCallback(async (messageId, emoji) => {
        try {
            console.log('🔄 Toggling reaction:', { messageId, emoji });
            await emitToggleReaction(messageId, emoji);
        } catch (error) {
            console.error('❌ Error toggling reaction:', error);
            showError('Ошибка', 'Не удалось изменить реакцию');
        }
    }, [emitToggleReaction, showError]);

    const handleShowReactionPicker = useCallback((messageId, position) => {
        setReactionPickerMessageId(messageId);
        setReactionPickerPosition(position);
        setReactionPickerVisible(true);
    }, []);

    const handleCloseReactionPicker = useCallback((clearMessageId = true) => {
        setReactionPickerVisible(false);
        if (clearMessageId) {
            setReactionPickerMessageId(null);
            setReactionPickerPosition(null);
        }
    }, []);

    const handleEmojiSelect = useCallback(async (emoji) => {
        if (reactionPickerMessageId) {
            await handleToggleReaction(reactionPickerMessageId, emoji);
        }
        handleCloseReactionPicker(true);
        if (reactionPickerMessageId) {
            setSelectedMessages(prev => {
                const updated = new Set(prev);
                updated.delete(reactionPickerMessageId);
                return updated;
            });
        }
    }, [reactionPickerMessageId, handleToggleReaction, handleCloseReactionPicker]);
    
    const handleShowFullEmojiPicker = useCallback(() => {
        console.log('🎨 Opening FullEmojiPicker for message:', reactionPickerMessageId);
        setReactionPickerVisible(false);
        setFullEmojiPickerVisible(true);
    }, [reactionPickerMessageId]);
    
    const handleCloseFullEmojiPicker = useCallback(() => {
        setFullEmojiPickerVisible(false);
        setReactionPickerMessageId(null);
        setReactionPickerPosition(null);
    }, []);
    
    const handleFullEmojiSelect = useCallback(async (emoji) => {
        console.log('🎨 FullEmojiSelect:', { emoji, messageId: reactionPickerMessageId });
        if (reactionPickerMessageId) {
            await handleToggleReaction(reactionPickerMessageId, emoji);
        } else {
            console.warn('⚠️ No messageId for reaction!');
        }
        setReactionPickerVisible(false);
        setFullEmojiPickerVisible(false);
        const messageIdToRemove = reactionPickerMessageId;
        if (messageIdToRemove) {
            setSelectedMessages(prev => {
                const updated = new Set(prev);
                updated.delete(messageIdToRemove);
                return updated;
            });
        }
        setReactionPickerMessageId(null);
        setReactionPickerPosition(null);
    }, [reactionPickerMessageId, handleToggleReaction]);

    const handleMenuPress = useCallback(() => {
        setMenuModalVisible(true);
    }, []);

    const closeMenuModal = useCallback(() => {
        setMenuModalVisible(false);
    }, []);

    const handleDeleteChat = useCallback(() => {
        closeMenuModal();
        showConfirm(
            'Удалить чат',
            'Вы уверены, что хотите удалить этот чат? Все сообщения будут удалены безвозвратно.',
            async () => {
                try {
                    isRoomDeletedRef.current = true;
                    
                    dispatch(setActiveRoom(null));
                    if (emitActiveRoom) {
                        emitActiveRoom(null);
                    }
                    
                    const result = await dispatch(deleteRoom({roomId}));

                    if (result.error) {
                        throw new Error(result.error);
                    }

                    try {
                        const parent = navigation.getParent();
                        if (parent) {
                            parent.navigate('ChatMain');
                        } else if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.navigate('ChatMain');
                        }
                    } catch (error) {
                        try {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            }
                        } catch (backError) {
                            // Ignore
                        }
                    }
                } catch (error) {
                    console.error('Ошибка при удалении чата:', error);
                    showError('Ошибка', 'Не удалось удалить чат');
                    isRoomDeletedRef.current = false;
                }
            }
        );
    }, [roomId, navigation, closeMenuModal, dispatch, showConfirm, showError, emitActiveRoom]);

    const loadMoreMessages = useCallback(() => {
        if (isLoadingMoreRef.current || !hasMore || !roomId || isRoomDeleted) {
            return;
        }
        
        isLoadingMoreRef.current = true;
        dispatch(fetchMessages({
            roomId,
            limit: 50,
            cursorId,
            direction: 'backward'
        })).finally(() => {
            isLoadingMoreRef.current = false;
        });
    }, [hasMore, cursorId, roomId, isRoomDeleted, dispatch]);

    const checkAndLoadMore = useCallback((event) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const maxOffset = contentSize.height - layoutMeasurement.height;
        const distanceToTop = maxOffset - contentOffset.y;
        
        if (distanceToTop < 2000 && hasMore && !isLoadingMoreRef.current) {
            loadMoreMessages();
        }
    }, [hasMore, loadMoreMessages]);

    const handleScroll = useCallback((event) => {
        checkAndLoadMore(event);
    }, [checkAndLoadMore]);

    const handleScrollEndDrag = useCallback((event) => {
        checkAndLoadMore(event);
    }, [checkAndLoadMore]);

    const handleMomentumScrollEnd = useCallback((event) => {
        checkAndLoadMore(event);
    }, [checkAndLoadMore]);

    const onTyping = useCallback((isTyping) => {
    }, []);

    const handleImagePress = useCallback((imageUri) => {
        setSelectedImageUri(imageUri);
        setImageViewerVisible(true);
    }, []);

    const handleImageViewerClose = useCallback(() => {
        setImageViewerVisible(false);
        setSelectedImageUri(null);
    }, []);

    const handleSenderNamePress = useCallback((senderId) => {
        if (!senderId || senderId === currentUserId) return;
        
        const rootNavigation =
            navigation?.getParent?.('AppStack') ||
            navigation?.getParent?.() ||
            navigation;

        (rootNavigation || navigation).navigate('UserPublicProfile', {
            userId: senderId,
            fromScreen: 'DirectChatRoom',
            roomId,
        });
    }, [currentUserId, navigation, roomId]);

    const handleMessagePress = useCallback((messageId) => {
        if (isSelectionMode) return; // Не обрабатываем нажатия в режиме выбора
        
        setPressedMessageId(messageId);
        // Сбрасываем состояние через 150мс для визуальной обратной связи
        setTimeout(() => {
            setPressedMessageId(null);
        }, 150);
    }, [isSelectionMode]);

    const renderItem = useCallback(({item}) => (
        <SwipeableMessageBubble
            message={item}
            currentUserId={currentUserId}
            onOpenProduct={(id) => {
                // Если режим выбора активен, выделяем сообщение вместо открытия товара
                if (isSelectionMode) {
                    toggleMessageSelection(item.id);
                    return;
                }
                
                // Проверяем, не удален ли продукт
                const state = store.getState();
                if (selectIsProductDeleted(state, id)) {
                    showWarning('Товар недоступен', 'Этот товар был удален');
                    return;
                }
                
                // Открываем товар в корневом AppStack (там же где ChatRoom),
                // чтобы back возвращал обратно в комнату чата.
                const rootNavigation =
                    navigation?.getParent?.('AppStack') ||
                    navigation?.getParent?.() ||
                    navigation;
                
                (rootNavigation || navigation).navigate('ProductDetail', {
                    productId: id,
                    fromScreen: 'ChatRoom',
                    roomId,
                });
            }}
            onOpenStop={(id) => {
                // Если режим выбора активен, выделяем сообщение вместо открытия остановки
                if (isSelectionMode) {
                    toggleMessageSelection(item.id);
                    return;
                }
                navigation.navigate('StopDetails', {stopId: id});
            }}
            onImagePress={handleImagePress}
            incomingAvatarUri={partnerAvatar}
            isSelectionMode={isSelectionMode}
            isSelected={selectedMessages.has(item.id)}
            isHighlighted={highlightedMessageId === item.id}
            isPressed={pressedMessageId === item.id}
            isContextMenuActive={false}
            hasContextMenu={false}
            canDelete={canDeleteMessage(item)}
            onToggleSelection={() => {
                if (!isSelectionMode) {
                    setIsSelectionMode(true);
                }
                toggleMessageSelection(item.id);
            }}
            onPress={() => handleMessagePress(item.id)}
            onLongPress={(position) => {
                if (!isSelectionMode) {
                    setIsSelectionMode(true);
                }
                toggleMessageSelection(item.id);
                if (position) {
                    handleShowReactionPicker(item.id, position);
                }
            }}
            onRetryMessage={handleRetryMessage}
            onCancelMessage={handleCancelMessage}
            isRetrying={item.temporaryId ? retryingMessages.has(item.temporaryId) : false}
            onAvatarPress={handleAvatarPress}
            onContactDriver={handleContactDriver}
            onReply={handleReply}
            onReplyPress={handleReplyPress}
            onAddReaction={(emoji) => handleToggleReaction(item.id, emoji)}
            onShowReactionPicker={(position) => handleShowReactionPicker(item.id, position)}
            roomType={roomData?.type}
            participants={roomData?.participants}
            onSenderNamePress={handleSenderNamePress}
        />
    ), [currentUserId, partnerAvatar, isSelectionMode, selectedMessages, pressedMessageId, canDeleteMessage, toggleMessageSelection, handleRetryMessage, handleCancelMessage, retryingMessages, handleImagePress, handleAvatarPress, handleContactDriver, handleReply, handleReplyPress, navigation, highlightedMessageId, handleToggleReaction, handleShowReactionPicker, roomData?.type, roomData?.participants, handleSenderNamePress, handleMessagePress]);

    const keyExtractor = useCallback((item) => {
        if (item.temporaryId) {
            return `temp_${item.temporaryId}`;
        }
        return `msg_${item.id}`;
    }, []);

    // ============ RENDER ============
    
    return (
        <View style={styles.container}>
            <ChatBackground>
                <View style={chatContentStyle}>
                    <View style={styles.messagesContainer}>
                        {!loading && (!messages || messages.length === 0) && (
                            <View style={styles.emptyStateContainer}>
                                <Text style={styles.emptyStateText}>
                                    Начните общение
                                </Text>
                            </View>
                        )}
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            extraData={{
                                isSelectionMode,
                                selectedSize: selectedMessages.size,
                                highlightedId: highlightedMessageId,
                                reactionsHash: messages.map(m => `${m.id}:${m._reactionsUpdated || 0}`).join(',')
                            }}
                            inverted
                            keyExtractor={keyExtractor}
                            renderItem={renderItem}
                            onEndReachedThreshold={0.8}
                            onEndReached={loadMoreMessages}
                            onScroll={handleScroll}
                            onScrollEndDrag={handleScrollEndDrag}
                            onMomentumScrollEnd={handleMomentumScrollEnd}
                            scrollEventThrottle={200}
                            contentContainerStyle={listContentStyle}
                            initialNumToRender={10}
                            windowSize={5}
                            maxToRenderPerBatch={5}
                            updateCellsBatchingPeriod={100}
                            legacyImplementation={false}
                            removeClippedSubviews={false}
                            onScrollToIndexFailed={(info) => {
                                const wait = new Promise(resolve => setTimeout(resolve, 100));
                                wait.then(() => {
                                    flatListRef.current?.scrollToIndex({
                                        index: info.index,
                                        animated: true,
                                        viewPosition: 0.5,
                                    });
                                });
                            }}
                        />
                        <Modal
                            visible={menuModalVisible}
                            transparent={true}
                            animationType="fade"
                            onRequestClose={closeMenuModal}
                        >
                            <TouchableOpacity
                                style={styles.menuModalOverlay}
                                activeOpacity={1}
                                onPress={closeMenuModal}
                            >
                                <View style={styles.menuModalContainer}>
                                    <View style={styles.menuModal}>
                                        <TouchableOpacity
                                            style={styles.menuItem}
                                            onPress={handleDeleteChat}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.menuItemText, styles.destructiveText]}>
                                                Удалить чат
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Modal>
                    </View>
                    
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : (isSamsung ? 'padding' : 'height')}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardVerticalOffset : (isSamsung ? keyboardVerticalOffset : 0)}
                        style={styles.keyboardAvoidingView}
                        enabled={true}
                    >
                        <View style={composerContainerStyle}>
                            <Composer
                                roomId={roomId}
                                onTyping={onTyping}
                                shareProductId={shareProductId}
                                onMenuPress={handleMenuPress}
                                replyTo={replyTo}
                                onCancelReply={handleCancelReply}
                            />
                            <TypingIndicator roomId={roomId} />
                        </View>
                    </KeyboardAvoidingView>
                    {insets.bottom > 0 && <View style={systemBarStyle} />}
                </View>
            </ChatBackground>

            <ImageViewerModal
                visible={imageViewerVisible}
                imageUri={selectedImageUri}
                onClose={handleImageViewerClose}
            />

            <ForwardMessageModal
                visible={forwardModalVisible}
                onClose={() => setForwardModalVisible(false)}
                onForward={handleForwardMessage}
                message={messageToForward}
            />

            <ReactionPicker
                visible={reactionPickerVisible}
                onClose={handleCloseReactionPicker}
                onEmojiSelect={handleEmojiSelect}
                onShowMoreEmojis={handleShowFullEmojiPicker}
                position={reactionPickerPosition}
            />
            
            <FullEmojiPicker
                visible={fullEmojiPickerVisible}
                onClose={handleCloseFullEmojiPicker}
                onEmojiSelect={handleFullEmojiSelect}
            />

            <Modal
                visible={deleteMessageModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    setDeleteMessageModalVisible(false);
                    setMessagesToDelete([]);
                }}
            >
                <TouchableOpacity
                    style={styles.menuModalOverlay}
                    activeOpacity={1}
                    onPress={() => {
                        setDeleteMessageModalVisible(false);
                        setMessagesToDelete([]);
                    }}
                >
                    <View style={styles.menuModalContainer}>
                        <View style={styles.menuModal}>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => handleDeleteSelectedMessages(false)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.menuItemText}>
                                    Удалить у меня
                                </Text>
                            </TouchableOpacity>
                            {(() => {
                                // Проверяем, можно ли удалять у всех
                                // Админы могут удалять любые сообщения
                                // Обычные пользователи могут удалять у всех только свои сообщения
                                const canDeleteForAll = isSuperAdmin || 
                                    (messagesToDelete.length > 0 && messagesToDelete.every(msg => {
                                        const messageSenderId = msg.senderId ? Number(msg.senderId) : null;
                                        const normalizedCurrentUserId = currentUserId ? Number(currentUserId) : null;
                                        return messageSenderId === normalizedCurrentUserId;
                                    }));
                                
                                if (!canDeleteForAll) return null;
                                
                                return (
                                    <>
                                        <View style={styles.menuDivider} />
                                        <TouchableOpacity
                                            style={styles.menuItem}
                                            onPress={() => handleDeleteSelectedMessages(true)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.menuItemText, styles.destructiveText]}>
                                                Удалить у всех
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                );
                            })()}
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    chatContent: {
        flex: 1,
    },
    messagesContainer: {
        flex: 1,
    },
    keyboardAvoidingView: {
        // Не используем flex для корректной работы KeyboardAvoidingView
    },
    listContent: {
        paddingHorizontal: 8,
        paddingTop: 5,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#999',
    },
    menuModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    menuModalContainer: {
        padding: 16,
    },
    menuModal: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
    },
    menuItem: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuItemText: {
        fontSize: 16,
        color: '#333',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#E5E5EA',
    },
    destructiveText: {
        color: '#ff3b30',
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    headerButton: {
        padding: 8,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    backButton: {
        padding: 8,
    },
    selectedCountText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
        marginLeft: 12,
    },
});