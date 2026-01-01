import React, {useCallback, useEffect, useLayoutEffect, useMemo, useState, useRef} from 'react';
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
    AppState,
    TouchableWithoutFeedback
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
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
import {ImageViewerModal} from '@shared/ui/ImageViewerModal/ui/ImageViewerModal';
import {useCustomAlert} from '@shared/ui/CustomAlert/CustomAlertProvider';
import {getBaseUrl} from '@shared/api/api';
import ChatApi from '@entities/chat/api/chatApi';
import {selectRoomsList} from '@entities/chat/model/selectors';
import PushNotificationService from '@shared/services/PushNotificationService';

// Константы
const HEADER_OFFSET = 64;
const MESSAGES_LOAD_LIMIT = 50;
const LOAD_MORE_THRESHOLD = 2000;


export const DirectChatScreen = ({route, navigation}) => {
    const {
        roomId,
        productId: shareProductId,
        productInfo,
        autoSendProduct,
        userId,
    } = route.params || {};
    
    // ============ HOOKS ============
    const dispatch = useDispatch();
    const store = useStore();
    const { showError, showWarning, showConfirm } = useCustomAlert();
    const insets = useSafeAreaInsets();
    const { hideTabBar, showTabBar } = useTabBar();
    const { emitActiveRoom, emitMarkRead, emitToggleReaction } = useChatSocketActions();
    
    // ============ REFS ============
    const isRoomDeletedRef = useRef(false);
    const isLoadingMoreRef = useRef(false);
    const flatListRef = useRef(null);
    const isMountedRef = useRef(true);
    const paddingTopAnim = useRef(new Animated.Value(0)).current;
    const appStateRef = useRef(AppState.currentState);
    
    // ============ STATE ============
    // UI State
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [selectedImageUri, setSelectedImageUri] = useState(null);
    const [menuModalVisible, setMenuModalVisible] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState(new Set());
    const [retryingMessages, setRetryingMessages] = useState(new Set());
    const [pressedMessageId, setPressedMessageId] = useState(null);
    
    // Reply and Forward
    const [replyTo, setReplyTo] = useState(null);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [messageToForward, setMessageToForward] = useState(null);
    
    // Reactions
    const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
    const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
    const [reactionPickerPosition, setReactionPickerPosition] = useState(null);
    const [fullEmojiPickerVisible, setFullEmojiPickerVisible] = useState(false);
    
    // Delete
    const [deleteMessageModalVisible, setDeleteMessageModalVisible] = useState(false);
    const [messagesToDelete, setMessagesToDelete] = useState([]);
    
    // Keyboard state
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [animatedPaddingTop, setAnimatedPaddingTop] = useState(0);
    
    // ============ SELECTORS ============
    const selectRoomMessages = useMemo(() => makeSelectRoomMessages(), []);
    const reduxMessages = useSelector((s) => selectRoomMessages(s, roomId));
    const loading = useSelector((s) => s.chat?.messages?.[roomId]?.loading);
    const hasMore = useSelector((s) => s.chat?.messages?.[roomId]?.hasMore ?? true);
    const cursorId = useSelector((s) => s.chat?.messages?.[roomId]?.cursorId);
    const currentUserId = useSelector((s) => s.auth?.user?.id);
    const currentUser = useSelector((s) => s.auth?.user);
    const roomDataRaw = useSelector((s) => s.chat?.rooms?.byId?.[roomId]);
    const roomData = useMemo(() => roomDataRaw?.room || roomDataRaw, [roomDataRaw]);
    const participantsById = useSelector((s) => s.chat?.participants?.byUserId || {});
    const isRoomDeleted = useSelector((s) => selectIsRoomDeleted(s, roomId));
    const rooms = useSelector(selectRoomsList);
    
    // Кэш сообщений
    const { messages: cachedMessages } = useCachedMessages(roomId);
    
    // Объединяем кэшированные и Redux сообщения с дедупликацией
    const messages = useMemo(() => {
        const sourceMessages = reduxMessages?.length > 0 ? reduxMessages : (cachedMessages || []);
        if (!sourceMessages?.length) return [];
        
        // Дедупликация по ID для предотвращения дубликатов
        const seenIds = new Set();
        const uniqueMessages = sourceMessages.filter(msg => {
            const msgId = msg?.id || msg?.temporaryId;
            if (!msgId || seenIds.has(msgId)) return false;
            seenIds.add(msgId);
            return true;
        });
        
        return uniqueMessages;
    }, [reduxMessages, cachedMessages]);
    
    // Предзагрузка медиа
    useMediaPreload(roomId, messages);
    
    // Высота индикатора печати
    const typingIndicatorHeight = useTypingIndicatorHeight(roomId);
    
    // ============ COMPUTED VALUES ============
    
    // Права доступа
    const isSuperAdmin = useMemo(() => {
        return currentUser?.role === 'ADMIN' && 
               (currentUser?.admin?.isSuperAdmin || currentUser?.profile?.isSuperAdmin || currentUser?.isSuperAdmin);
    }, [currentUser]);

    const canDeleteMessage = useCallback((message) => {
        if (!message || isSuperAdmin) return isSuperAdmin;
        return Number(message.senderId) === Number(currentUserId);
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

    // ============ STYLES ============
    
    const keyboardVerticalOffset = useMemo(() => {
        return Platform.OS === 'ios' ? insets.top + HEADER_OFFSET : 0;
    }, [insets.top]);
    
    const listContentStyle = useMemo(() => [
        styles.listContent,
        { 
            paddingTop: animatedPaddingTop, 
            paddingBottom: HEADER_OFFSET 
        }
    ], [animatedPaddingTop]);
    
    const systemBarStyle = useMemo(() => ({
        height: insets.bottom,
        backgroundColor: '#ffffff',
        width: '100%',
    }), [insets.bottom]);
    
    // Best practice: простой отступ при открытой клавиатуре
    const composerContainerStyle = useMemo(() => {
        if (keyboardVisible) {
            return [styles.composerContainer, { marginBottom: 85 }];
        }
        return styles.composerContainer;
    }, [keyboardVisible]);

    // ============ EFFECTS ============
    
    // Монтирование/размонтирование
    useEffect(() => {
        isMountedRef.current = true;
        hideTabBar();
        
        return () => {
            isMountedRef.current = false;
        };
    }, [hideTabBar]);
    
    // TabBar visibility
    useFocusEffect(
        useCallback(() => {
            hideTabBar();
            return () => {
                if (isMountedRef.current) showTabBar();
            };
        }, [hideTabBar, showTabBar])
    );
    
    // Упрощенная логика клавиатуры
    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        
        const handleShow = () => {
            if (!isMountedRef.current) return;
            setKeyboardVisible(true);
        };
        
        const handleHide = () => {
            if (!isMountedRef.current) return;
            setKeyboardVisible(false);
        };
        
        const showSub = Keyboard.addListener(showEvent, handleShow);
        const hideSub = Keyboard.addListener(hideEvent, handleHide);
        
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);
    
    // Android back button для закрытия клавиатуры
    useEffect(() => {
        if (Platform.OS !== 'android') return;
        
        const handleBackPress = () => {
            if (keyboardVisible) {
                Keyboard.dismiss();
                return true;
            }
            return false;
        };
        
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => backHandler.remove();
    }, [keyboardVisible]);
    
    // AppState - синхронизация при возврате из фона
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState.match(/inactive|background/)) {
                Keyboard.dismiss();
                setKeyboardVisible(false);
            }
            
            if (appStateRef.current.match(/inactive|background/) && 
                nextAppState === 'active' && 
                roomId && 
                !isRoomDeletedRef.current) {
                dispatch(fetchMessages({ roomId, limit: 100 }));
                Keyboard.dismiss();
            }
            
            appStateRef.current = nextAppState;
        });
        
        return () => subscription?.remove();
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
    
    // Проверка удаления комнаты
    useEffect(() => {
        if ((!roomData || isRoomDeleted) && roomId) {
            isRoomDeletedRef.current = true;
            dispatch(setActiveRoom(null));
            emitActiveRoom?.(null);
            
            const navigateAway = () => {
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
                    navigation.canGoBack() && navigation.goBack();
                }
            };
            
            navigateAway();
        }
    }, [roomData, roomId, isRoomDeleted, dispatch, navigation, emitActiveRoom]);
    
    // Активная комната и уведомления
    useEffect(() => {
        if (isRoomDeletedRef.current || isRoomDeleted || !roomId) return;

        PushNotificationService.setActiveChatRoomId(roomId);
        PushNotificationService.setActiveChatPeerUserId(userId);
        
        dispatch(setActiveRoom(roomId));
        emitActiveRoom?.(roomId);
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
            clearTimeout(markAsReadTimeout);
            dispatch(setActiveRoom(null));
            PushNotificationService.setActiveChatRoomId(null);
            PushNotificationService.setActiveChatPeerUserId(null);
            emitActiveRoom?.(null);
        };
    }, [dispatch, roomId, navigation, currentUserId, emitActiveRoom, isRoomDeleted, userId]);
    
    // Отметка непрочитанных
    useEffect(() => {
        if (!messages?.length || !currentUserId) return;

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
    
    // Настройка навигации - используем useLayoutEffect для применения до рендера
    useLayoutEffect(() => {
        if (isSelectionMode) {
            const canReply = canSendMessages && selectedMessages.size === 1;
            const selectedArray = Array.from(selectedMessages);
            const canDeleteAll = selectedArray.length > 0 && 
                selectedArray.every(msgId => {
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
                keyboardHandlingEnabled: false,
            });
            
            if (Platform.OS === 'android') {
                const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
                    if (isSelectionMode) {
                        clearSelection();
                        return true;
                    }
                    return false;
                });
                
                return () => backHandler.remove();
            }
        } else {
            navigation.setOptions({
                headerShown: true,
                header: () => <ChatHeader route={route} navigation={navigation} />,
                gestureEnabled: true,
                headerTransparent: false,
                headerStatusBarHeight: 0,
                keyboardHandlingEnabled: false,
                headerStyle: {
                    backgroundColor: '#FFFFFF',
                    height: 64,
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 0,
                },
            });
        }
    }, [navigation, route, isSelectionMode, selectedMessages, messages, canSendMessages, canDeleteMessage]);

    // ============ CALLBACKS ============
    
    const clearSelection = useCallback(() => {
        setSelectedMessages(new Set());
        setIsSelectionMode(false);
        setReactionPickerVisible(false);
        setReactionPickerMessageId(null);
        setReactionPickerPosition(null);
    }, []);

    const toggleMessageSelection = useCallback((messageId) => {
        setSelectedMessages(prev => {
            const updated = new Set(prev);
            const wasSelected = updated.has(messageId);
            
            if (wasSelected) {
                updated.delete(messageId);
            } else {
                updated.add(messageId);
                if (Platform.OS === 'ios') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } else {
                    Vibration.vibrate(5);
                }
            }
            
            return updated;
        });
        
        if (!isSelectionMode) setIsSelectionMode(true);
    }, [isSelectionMode]);

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

        const selectedArray = Array.from(selectedMessages)
            .map(id => messages.find(m => m.id === id))
            .filter(Boolean)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        const textParts = selectedArray.map(msg => {
            switch (msg.type) {
                case 'TEXT': return msg.content || '';
                case 'IMAGE': 
                    return msg.content || msg.text || msg.caption || 
                           msg.attachments?.find(a => a.caption)?.caption || '[Изображение]';
                case 'VOICE': return '[Голосовое сообщение]';
                case 'PRODUCT':
                    try {
                        const data = msg.product || JSON.parse(msg.content);
                        return data?.name || '[Товар]';
                    } catch { return '[Товар]'; }
                case 'STOP':
                    try {
                        const data = msg.stop || JSON.parse(msg.content);
                        return data?.address || '[Остановка]';
                    } catch { return '[Остановка]'; }
                case 'POLL': return msg.poll?.question || '[Опрос]';
                case 'SYSTEM': return msg.content || '';
                default: return msg.content || '[Сообщение]';
            }
        }).filter(Boolean);

        if (textParts.length === 0) {
            showWarning('Копирование', 'Нечего копировать');
            return;
        }

        Clipboard.setString(textParts.join('\n'));
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
        if (messageIndex === -1) return;
        
        setTimeout(() => {
            try {
                flatListRef.current?.scrollToIndex({
                    index: messageIndex,
                    animated: true,
                    viewPosition: 0.5,
                });
                
                setTimeout(() => {
                    setHighlightedMessageId(message.id);
                    setTimeout(() => setHighlightedMessageId(null), 2000);
                }, 400);
            } catch (error) {
                console.log('scrollToIndex failed:', error);
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

    const handleDeleteSelectedMessages = useCallback(async (forAll) => {
        if (messagesToDelete.length === 0) return;

        try {
            setDeleteMessageModalVisible(false);
            
            if (forAll) {
                const canDeleteForAll = isSuperAdmin || 
                    messagesToDelete.every(msg => Number(msg.senderId) === Number(currentUserId));
                
                if (!canDeleteForAll) {
                    showError('Ошибка', 'Недостаточно прав для удаления этих сообщений у всех');
                    return;
                }
            }
            
            const results = await Promise.allSettled(
                messagesToDelete.map(msg => 
                    dispatch(deleteMessage({ messageId: msg.id, forAll, currentUserId }))
                )
            );
            
            const successCount = results.filter(r => 
                r.status === 'fulfilled' && r.value?.type?.endsWith('/fulfilled')
            ).length;
            const failCount = results.length - successCount;

            clearSelection();
            setMessagesToDelete([]);

            setTimeout(() => dispatch(fetchMessages({roomId, limit: 100})), 100);
            
            if (failCount > 0) {
                showWarning('Частичное удаление', `Удалено: ${successCount}, не удалось: ${failCount}`);
            }
        } catch (error) {
            console.error('Ошибка при удалении:', error);
            clearSelection();
            setMessagesToDelete([]);
            showError('Ошибка', 'Не удалось удалить сообщения');
        }
    }, [messagesToDelete, dispatch, currentUserId, roomId, clearSelection, showWarning, showError, isSuperAdmin]);

    const handleToggleReaction = useCallback(async (messageId, emoji) => {
        try {
            await emitToggleReaction(messageId, emoji);
        } catch (error) {
            console.error('Error toggling reaction:', error);
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
        setReactionPickerVisible(false);
        setFullEmojiPickerVisible(true);
    }, []);
    
    const handleCloseFullEmojiPicker = useCallback(() => {
        setFullEmojiPickerVisible(false);
        setReactionPickerMessageId(null);
        setReactionPickerPosition(null);
    }, []);
    
    const handleFullEmojiSelect = useCallback(async (emoji) => {
        if (reactionPickerMessageId) {
            await handleToggleReaction(reactionPickerMessageId, emoji);
            setSelectedMessages(prev => {
                const updated = new Set(prev);
                updated.delete(reactionPickerMessageId);
                return updated;
            });
        }
        setReactionPickerVisible(false);
        setFullEmojiPickerVisible(false);
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
                    emitActiveRoom?.(null);
                    
                    const result = await dispatch(deleteRoom({roomId}));
                    if (result.error) throw new Error(result.error);

                    const parent = navigation.getParent();
                    if (parent) {
                        parent.navigate('ChatMain');
                    } else if (navigation.canGoBack()) {
                        navigation.goBack();
                    } else {
                        navigation.navigate('ChatMain');
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
        if (isLoadingMoreRef.current || !hasMore || !roomId || isRoomDeleted) return;
        
        isLoadingMoreRef.current = true;
        dispatch(fetchMessages({ roomId, limit: MESSAGES_LOAD_LIMIT, cursorId, direction: 'backward' }))
            .finally(() => { isLoadingMoreRef.current = false; });
    }, [hasMore, cursorId, roomId, isRoomDeleted, dispatch]);

    const checkAndLoadMore = useCallback((event) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const maxOffset = contentSize.height - layoutMeasurement.height;
        const distanceToTop = maxOffset - contentOffset.y;
        
        if (distanceToTop < LOAD_MORE_THRESHOLD && hasMore && !isLoadingMoreRef.current) {
            loadMoreMessages();
        }
    }, [hasMore, loadMoreMessages]);

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
        if (isSelectionMode) return;
        setPressedMessageId(messageId);
        setTimeout(() => setPressedMessageId(null), 150);
    }, [isSelectionMode]);

    const renderItem = useCallback(({item}) => (
        <SwipeableMessageBubble
            message={item}
            currentUserId={currentUserId}
            onOpenProduct={(id) => {
                if (isSelectionMode) {
                    toggleMessageSelection(item.id);
                    return;
                }
                
                if (selectIsProductDeleted(store.getState(), id)) {
                    showWarning('Товар недоступен', 'Этот товар был удален');
                    return;
                }
                
                const rootNav = navigation?.getParent?.('AppStack') || navigation?.getParent?.() || navigation;
                rootNav.navigate('ProductDetail', { productId: id, fromScreen: 'ChatRoom', roomId });
            }}
            onOpenStop={(id) => {
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
                if (!isSelectionMode) setIsSelectionMode(true);
                toggleMessageSelection(item.id);
            }}
            onPress={() => handleMessagePress(item.id)}
            onLongPress={(position) => {
                if (!isSelectionMode) setIsSelectionMode(true);
                toggleMessageSelection(item.id);
                if (position) handleShowReactionPicker(item.id, position);
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
    ), [
        currentUserId, isSelectionMode, selectedMessages, pressedMessageId, canDeleteMessage,
        toggleMessageSelection, handleRetryMessage, handleCancelMessage, retryingMessages,
        handleImagePress, handleReply, handleReplyPress, navigation, highlightedMessageId,
        handleToggleReaction, handleShowReactionPicker, roomData?.type, roomData?.participants,
        handleSenderNamePress, handleMessagePress, store, showWarning, roomId, partnerAvatar,
        handleAvatarPress, handleContactDriver
    ]);

    const keyExtractor = useCallback((item) => 
        item.temporaryId ? `temp_${item.temporaryId}` : `msg_${item.id}`,
    []);

    // ============ RENDER ============
    
    return (
        <View style={styles.container}>
            <ChatBackground>
                <View style={styles.chatContent}>
                    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                        <View style={styles.messagesContainer}>
                            {!loading && (!messages || messages.length === 0) && (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyStateText}>Начните общение</Text>
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
                            onScroll={checkAndLoadMore}
                            onScrollBeginDrag={() => Keyboard.dismiss()}
                            onScrollEndDrag={checkAndLoadMore}
                            onMomentumScrollEnd={checkAndLoadMore}
                            scrollEventThrottle={200}
                            contentContainerStyle={listContentStyle}
                            initialNumToRender={10}
                            windowSize={5}
                            maxToRenderPerBatch={5}
                            updateCellsBatchingPeriod={100}
                            legacyImplementation={false}
                            removeClippedSubviews={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            onScrollToIndexFailed={(info) => {
                                setTimeout(() => {
                                    flatListRef.current?.scrollToIndex({
                                        index: info.index,
                                        animated: true,
                                        viewPosition: 0.5,
                                    });
                                }, 100);
                            }}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                    
                    {/* Menu Modal */}
                    <Modal
                            visible={menuModalVisible}
                            transparent
                            animationType="fade"
                            onRequestClose={closeMenuModal}
                        >
                            <TouchableOpacity
                                style={styles.modalOverlay}
                                activeOpacity={1}
                                onPress={closeMenuModal}
                            >
                                <View style={styles.modalContainer}>
                                    <View style={styles.modal}>
                                        <TouchableOpacity
                                            style={styles.menuItem}
                                            onPress={handleDeleteChat}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.menuText, styles.destructive]}>
                                                Удалить чат
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                    </Modal>
                    
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                        keyboardVerticalOffset={keyboardVerticalOffset}
                        style={styles.keyboardAvoid}
                        enabled={true}
                    >
                        <View style={composerContainerStyle}>
                            <Composer
                                roomId={roomId}
                                onTyping={() => {}}
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

            {/* Delete Modal */}
            <Modal
                visible={deleteMessageModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setDeleteMessageModalVisible(false);
                    setMessagesToDelete([]);
                }}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => {
                        setDeleteMessageModalVisible(false);
                        setMessagesToDelete([]);
                    }}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modal}>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => handleDeleteSelectedMessages(false)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.menuText}>Удалить у меня</Text>
                            </TouchableOpacity>
                            {(() => {
                                const canDeleteForAll = isSuperAdmin || 
                                    (messagesToDelete.length > 0 && messagesToDelete.every(msg => 
                                        Number(msg.senderId) === Number(currentUserId)
                                    ));
                                
                                if (!canDeleteForAll) return null;
                                
                                return (
                                    <>
                                        <View style={styles.menuDivider} />
                                        <TouchableOpacity
                                            style={styles.menuItem}
                                            onPress={() => handleDeleteSelectedMessages(true)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.menuText, styles.destructive]}>
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
    keyboardAvoid: {},
    composerContainer: {
        position: 'relative',
    },
    listContent: {
        paddingHorizontal: 8,
        paddingTop: 5,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#999',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        padding: 16,
    },
    modal: {
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
    menuText: {
        fontSize: 16,
        color: '#333',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#E5E5EA',
    },
    destructive: {
        color: '#ff3b30',
    },
});