import React, {useCallback, useEffect, useMemo, useState, useRef} from 'react';
import {View, FlatList, StyleSheet, TouchableOpacity, Text, Modal, Platform, BackHandler} from 'react-native';
import {useFocusEffect, CommonActions} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {
    fetchMessages,
    markAsRead,
    sendProduct,
    fetchRoom,
    setActiveRoom,
    deleteRoom,
    leaveRoom,
    deleteMessage,
    sendVoice,
    cancelFailedMessage,
    updateMessageReactions,
} from '@entities/chat/model/slice';
import {makeSelectRoomMessages} from '@entities/chat/model/selectors';
import {fetchProductById} from '@entities/product/model/slice';
import {SwipeableMessageBubble, ForwardMessageModal, ReactionPicker, FullEmojiPicker} from '@entities/chat';
import {Composer} from '@entities/chat/ui/Composer';
import {ChatBackground} from '@entities/chat/ui/ChatBackground';
import {useChatSocketActions} from '@entities/chat/hooks/useChatSocketActions';
import {ChatHeader} from '@entities/chat/ui/ChatHeader';
import {useCachedMessages, useMediaPreload} from '@entities/chat/hooks/useChatCache';

import {getBaseUrl} from '@shared/api/api';
import {ImageViewerModal} from '@shared/ui/ImageViewerModal/ui/ImageViewerModal';
import {IconDelete} from '@shared/ui/Icon/ProductManagement/IconDelete';
import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';
import {useCustomAlert} from '@shared/ui/CustomAlert/CustomAlertProvider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ChatApi from '@entities/chat/api/chatApi';
import {selectRoomsList} from '@entities/chat/model/selectors';


export const GroupChatScreen = ({route, navigation}) => {
    const {
        roomId,
        productId: shareProductId,
        productInfo,
        autoSendProduct,
        groupRoomId,
        userId
    } = route.params;

    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [selectedImageUri, setSelectedImageUri] = useState(null);
    const [menuModalVisible, setMenuModalVisible] = useState(false);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState(new Set());
    const [retryingMessages, setRetryingMessages] = useState(new Set());
    const [replyTo, setReplyTo] = useState(null); // Сообщение, на которое отвечаем
    const [highlightedMessageId, setHighlightedMessageId] = useState(null); // ID сообщения для временного выделения
    const [forwardModalVisible, setForwardModalVisible] = useState(false); // Видимость модала пересылки
    const [messageToForward, setMessageToForward] = useState(null); // Сообщение для пересылки
    const [reactionPickerVisible, setReactionPickerVisible] = useState(false); // Видимость picker'а реакций
    const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null); // ID сообщения для реакции
    const [reactionPickerPosition, setReactionPickerPosition] = useState(null); // Позиция picker'а
    const [fullEmojiPickerVisible, setFullEmojiPickerVisible] = useState(false); // Видимость полного списка эмодзи
    const [isRoomDataLoaded, setIsRoomDataLoaded] = useState(false);

    // Используем ref для синхронного флага удаления
    const isRoomDeletedRef = useRef(false);

    const dispatch = useDispatch();
    const { showError, showWarning, showConfirm } = useCustomAlert();
    const selectRoomMessages = useMemo(() => makeSelectRoomMessages(), []);
    const reduxMessages = useSelector((s) => selectRoomMessages(s, roomId));
    const loading = useSelector((s) => s.chat?.messages?.[roomId]?.loading);
    const hasMore = useSelector((s) => s.chat?.messages?.[roomId]?.hasMore ?? true);
    const cursorId = useSelector((s) => s.chat?.messages?.[roomId]?.cursorId);
    const currentUserId = useSelector((s) => s.auth?.user?.id);
    const currentUser = useSelector((s) => s.auth?.user);
    
    const isLoadingMoreRef = useRef(false);
    const flatListRef = useRef(null);
    const roomDataRaw = useSelector((s) => s.chat?.rooms?.byId?.[roomId]);
    const roomData = roomDataRaw?.room ? roomDataRaw.room : roomDataRaw;
    const roomsLoading = useSelector((s) => s.chat?.rooms?.loading);
    const deletedRoomIds = useSelector((s) => s.chat?.deletedRoomIds || []);
    const isRoomDeleted = useMemo(() => {
        if (!roomId) return false;
        return deletedRoomIds.includes(roomId);
    }, [roomId, deletedRoomIds]);
    
    // Получаем функции WebSocket
    const { emitActiveRoom, emitMarkRead, emitToggleReaction } = useChatSocketActions();
    
    // Используем кэш для мгновенной загрузки сообщений (только если комната не удалена)
    const { messages: cachedMessages, isLoading: isCacheLoading } = useCachedMessages(isRoomDeleted ? null : roomId);
    
    // Объединяем кэшированные и Redux сообщения (Redux имеет приоритет для свежих данных)
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

    useEffect(() => {
        if (roomData && roomId && roomData.id === roomId) {
            const roomType = String(roomData.type || '').toUpperCase().trim();
            
            // Для GROUP проверяем, что isLocked определён
            if (roomType === 'GROUP') {
                // Данные загружены, если isLocked есть в объекте (может быть true, false, но не undefined)
                if ('isLocked' in roomData && roomData.isLocked !== undefined && roomData.isLocked !== null) {
                    setIsRoomDataLoaded(true);
                }
            } else {
                // Для остальных типов данные считаем загруженными сразу
                setIsRoomDataLoaded(true);
            }
        }
    }, [roomData, roomId]);

    const isAdmin = useMemo(() => {
        if (!roomData?.participants || !currentUserId) return false;

        const currentParticipant = roomData.participants.find(p =>
            (p?.userId ?? p?.user?.id) === currentUserId
        );

        return currentParticipant?.role === 'ADMIN' || currentParticipant?.role === 'OWNER';
    }, [roomData, currentUserId]);

    const isOwner = useMemo(() => {
        if (!roomData?.participants || !currentUserId) return false;

        const currentParticipant = roomData.participants.find(p =>
            (p?.userId ?? p?.user?.id) === currentUserId
        );

        return currentParticipant?.role === 'OWNER';
    }, [roomData, currentUserId]);

    // Проверяем, является ли пользователь суперадмином
    const isSuperAdmin = useMemo(() => {
        return currentUser?.role === 'ADMIN' && 
               (currentUser?.admin?.isSuperAdmin || currentUser?.profile?.isSuperAdmin || currentUser?.isSuperAdmin);
    }, [currentUser]);

    // Проверяем право на удаление комнаты
    // BROADCAST - только суперадмин, GROUP - только владелец или суперадмин
    const canDeleteRoom = useMemo(() => {
        if (roomData?.type === 'BROADCAST') {
            return isSuperAdmin;
        }
        return isOwner || isSuperAdmin;
    }, [roomData?.type, isOwner, isSuperAdmin]);

    // Проверяем право на выход из комнаты
    // BROADCAST - только суперадмин может покинуть канал, GROUP - все участники могут покинуть
    const canLeaveRoom = useMemo(() => {
        if (roomData?.type === 'BROADCAST') {
            return isSuperAdmin;
        }
        // В группах все участники могут покинуть группу
        return true;
    }, [roomData?.type, isSuperAdmin]);

    // Проверяем, может ли пользователь отправлять сообщения
    const canSendMessages = useMemo(() => {
        // Если данные комнаты еще не загружены, не разрешаем отправку
        if (!roomData || !currentUserId) {
            return false;
        }
        
        // Для BROADCAST комнат: только суперадмин или админ комнаты могут отправлять
        if (roomData.type === 'BROADCAST') {
            // Дополнительная проверка: убеждаемся, что это действительно BROADCAST
            const isBroadcastType = String(roomData.type).toUpperCase() === 'BROADCAST';
            if (!isBroadcastType) {
                // Если тип не BROADCAST, возвращаем true (для других типов)
                return true;
            }
            
            // Для BROADCAST: только суперадмин или админ могут отправлять
            const canSend = isSuperAdmin || isAdmin;
            
            if (__DEV__) {
                console.log('BROADCAST room canSendMessages check:', {
                    roomId: roomData.id,
                    roomType: roomData.type,
                    currentUserId,
                    isSuperAdmin,
                    isAdmin,
                    canSend,
                    participantRole: roomData.participants?.find(p => 
                        (p?.userId ?? p?.user?.id) === currentUserId
                    )?.role
                });
            }
            
            return canSend;
        }
        
        // Для групп: проверяем статус isLocked
        if (roomData.type === 'GROUP') {
            // Если isLocked еще не определен, не разрешаем отправку
            // (данные еще загружаются)
            if (!('isLocked' in roomData) || roomData.isLocked === undefined || roomData.isLocked === null) {
                return false;
            }
            
            // Для закрытых групп (isLocked === true): только админы и владельцы могут отправлять
            if (roomData.isLocked === true) {
                return isAdmin;
            }
            
            // Для открытых групп (isLocked === false): все могут отправлять
            return true;
        }
        
        // Для остальных типов: все могут отправлять
        return true;
    }, [roomData, currentUserId, isSuperAdmin, isAdmin]);

    const canDeleteMessage = useCallback((message) => {
        if (!message) return false;
        
        const result = 
            isSuperAdmin || 
            currentUser?.role === 'ADMIN' || 
            isAdmin || 
            message.senderId === currentUserId;
        
        return result;
    }, [isAdmin, isSuperAdmin, currentUser?.role, currentUserId]);

    const toggleMessageSelection = useCallback((messageId) => {
        setSelectedMessages(prev => {
            const updated = new Set(prev);
            const wasSelected = updated.has(messageId);
            
            if (wasSelected) {
                updated.delete(messageId);
            } else {
                updated.add(messageId);
            }
            
            return updated;
        });
        
        // Активируем режим выбора при первом выборе
        setIsSelectionMode(prev => {
            if (!prev) return true;
            return prev;
        });
    }, []);
    
    // Синхронизируем режим выбора с количеством выбранных сообщений
    useEffect(() => {
        if (selectedMessages.size === 0 && isSelectionMode) {
            setIsSelectionMode(false);
        }
    }, [selectedMessages.size, isSelectionMode]);

    const clearSelection = useCallback(() => {
        setSelectedMessages(new Set());
        setIsSelectionMode(false);
        setReactionPickerVisible(false);
        setReactionPickerMessageId(null);
        setReactionPickerPosition(null);
    }, []);

    const handleForwardSelectedMessages = useCallback(() => {
        if (selectedMessages.size > 0) {
            setMessageToForward(null); // Очищаем, чтобы использовать selectedMessages
            setForwardModalVisible(true);
        }
    }, [selectedMessages]);

    const handleReplyToSelected = useCallback(() => {
        if (selectedMessages.size === 1) {
            const messageId = Array.from(selectedMessages)[0];
            const message = messages.find(m => m.id === messageId);
            if (message) {
                handleReply(message);
                clearSelection();
            }
        }
    }, [selectedMessages, messages, handleReply, clearSelection]);

    const handleForwardMessage = useCallback(async (roomIds) => {
        if (!messageToForward && selectedMessages.size === 0) return;

        try {
            // Если есть выбранные сообщения, пересылаем их все
            if (selectedMessages.size > 0) {
                const messageIds = Array.from(selectedMessages);
                // Пересылаем каждое сообщение последовательно
                for (const messageId of messageIds) {
                    await ChatApi.forwardMessage(messageId, roomIds);
                }
                // Очищаем выбор после пересылки
                clearSelection();
            } else if (messageToForward) {
                // Пересылаем одно сообщение из контекстного меню
                await ChatApi.forwardMessage(messageToForward.id, roomIds);
            }
            
            // Закрываем модал
            setForwardModalVisible(false);
            setMessageToForward(null);
            
            // Если переслали только в один чат - переходим в него
            if (roomIds.length === 1) {
                const targetRoomId = roomIds[0];
                const targetRoom = rooms.find(r => r.id === targetRoomId);
                
                if (targetRoom) {
                    // Переходим в целевой чат
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

    const deleteSelectedMessages = useCallback(async () => {
        if (selectedMessages.size === 0) return;

        try {
            showConfirm(
                'Удалить сообщения',
                `Вы уверены, что хотите удалить ${selectedMessages.size} сообщений?`,
                async () => {
                    try {
                        const messageIds = Array.from(selectedMessages);

                        const deletePromises = messageIds.map(async (messageId) => {
                            const message = messages.find(m => m.id === messageId);
                            if (!message) {
                                return;
                            }
                            
                            const isAuthor = message.senderId === currentUserId;
                            
                            // Проверяем временное окно для удаления (48 часов по умолчанию)
                            const MESSAGE_DELETE_WINDOW_HOURS = 48;
                            const messageAge = Date.now() - new Date(message.createdAt).getTime();
                            const withinWindow = messageAge <= (MESSAGE_DELETE_WINDOW_HOURS * 3600 * 1000);
                            
                            // В группах админы, суперадмины и системные админы удаляют для всех любые сообщения
                            let forAll = false;
                            if (isSuperAdmin || currentUser?.role === 'ADMIN' || isAdmin) {
                                forAll = true; // Админы могут удалять всегда
                            } else if (isAuthor && withinWindow) {
                                // Обычные пользователи удаляют свои сообщения для всех только в пределах окна
                                forAll = true;
                            }

                            const result = await dispatch(deleteMessage({
                                messageId,
                                forAll,
                                currentUserId
                            }));
                            
                            return result;
                        });

                        const results = await Promise.allSettled(deletePromises);
                        
                        const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.type?.endsWith('/fulfilled')).length;
                        const failCount = results.filter(r => r.status === 'rejected' || r.value?.type?.endsWith('/rejected')).length;

                        // Очищаем выбор и выходим из режима выбора
                        clearSelection();

                        // Обновляем список сообщений
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
                        clearSelection();
                        showError('Ошибка', 'Не удалось удалить некоторые сообщения');
                    }
                }
            );
        } catch (error) {
            showError('Ошибка', 'Не удалось удалить сообщения');
        }
    }, [selectedMessages, isAdmin, isSuperAdmin, currentUser?.role, currentUserId, clearSelection, dispatch, roomId, messages, showConfirm, showWarning, showError]);

    // Обработчик повторной отправки голосового сообщения
    const handleRetryMessage = useCallback(async (message) => {
        if (!message?.temporaryId) return;
        
        const temporaryId = message.temporaryId;
        setRetryingMessages(prev => new Set(prev).add(temporaryId));
        
        try {
            // Извлекаем голосовые данные из attachments
            const voiceAttachment = message?.attachments?.find(att => att.type === 'VOICE');
            if (!voiceAttachment) {
                throw new Error('Голосовое вложение не найдено');
            }
            
            // Формируем данные для повторной отправки
            const voiceData = {
                uri: voiceAttachment.path,
                duration: voiceAttachment.duration,
                type: voiceAttachment.mimeType,
                size: voiceAttachment.size,
            };
            
            // Отправляем с текущим temporaryId и retryCount = 0 (начинаем заново)
            await dispatch(sendVoice({ 
                roomId, 
                voice: voiceData, 
                temporaryId,
                retryCount: 0 
            })).unwrap();
            
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
    
    // Обработчик отмены неудачного сообщения
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

    // Обработчик для выбора сообщения для ответа
    const handleReply = useCallback((message) => {
        // В закрытых группах и каналах проверяем права на отправку
        if (!canSendMessages) {
            // Просто блокируем действие без показа сообщения
            return;
        }
        setReplyTo(message);
    }, [canSendMessages]);

    // Обработчик отмены ответа
    const handleCancelReply = useCallback(() => {
        setReplyTo(null);
    }, []);

    // Обработчик для прокрутки к сообщению, на которое был ответ
    const handleReplyPress = useCallback((message) => {
        if (!message || !flatListRef.current) return;
        
        // Находим индекс сообщения в списке
        const messageIndex = messages.findIndex(m => m.id === message.id);
        if (messageIndex === -1) {
            if (__DEV__) {
                console.log('handleReplyPress: Сообщение не найдено в списке', { messageId: message.id });
            }
            return;
        }
        
        // Прокручиваем к сообщению используя scrollToIndex
        setTimeout(() => {
            try {
                flatListRef.current?.scrollToIndex({
                    index: messageIndex,
                    animated: true,
                    viewPosition: 0.5, // Центрируем сообщение
                });
                
                // Выделяем сообщение после небольшой задержки (чтобы прокрутка успела завершиться)
                setTimeout(() => {
                    setHighlightedMessageId(message.id);
                    
                    // Убираем выделение через 2 секунды
                    setTimeout(() => {
                        setHighlightedMessageId(null);
                    }, 2000);
                }, 400); // Задержка для завершения анимации прокрутки
                
            } catch (error) {
                if (__DEV__) {
                    console.log('handleReplyPress: scrollToIndex failed', error);
                }
            }
        }, 100);
    }, [messages]);

    // Обработчик нажатия на аватар отправителя сообщения
    const handleAvatarPress = useCallback((message) => {
        if (!message) return;
        
        const senderId = message.senderId || message.sender?.id;
        if (!senderId || senderId === currentUserId) return;

        navigation.navigate('UserPublicProfile', {
            userId: senderId,
            fromScreen: 'GroupChat',
            roomId: roomId
        });
    }, [currentUserId, navigation, roomId]);

    // Список комнат для проверки существующего чата с водителем
    const rooms = useSelector(selectRoomsList);

    // Обработчик связи с водителем из карточки остановки
    const handleContactDriver = useCallback(async (type, stopData) => {
        if (!stopData) return;
        
        const driverUserId = stopData.driverUserId || stopData.driver?.userId;
        const driverName = stopData.driverName || stopData.driver?.name || 'Водитель';
        
        if (!driverUserId) {
            showError('Ошибка', 'Информация о водителе недоступна');
            return;
        }
        
        // Проверяем, есть ли существующий чат с водителем
        const existingChat = rooms.find(room => {
            if (room.type !== 'DIRECT') return false;
            return room.participants?.some(p => {
                const pId = p?.userId ?? p?.user?.id ?? p?.id;
                return pId === driverUserId;
            });
        });
        
        if (existingChat) {
            // Переходим в существующий чат
            navigation.navigate('ChatRoom', {
                roomId: existingChat.id,
                roomTitle: driverName,
                roomData: existingChat,
                userId: driverUserId,
                fromScreen: 'GroupChat'
            });
        } else {
            // Создаём новый чат
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
                        fromScreen: 'GroupChat'
                    });
                }
            } catch (error) {
                console.error('Error creating chat with driver:', error);
                showError('Ошибка', 'Не удалось создать чат с водителем');
            }
        }
    }, [rooms, navigation, showError]);

    // Обработчик добавления/удаления реакции
    const handleToggleReaction = useCallback(async (messageId, emoji) => {
        try {
            console.log('🔄 Toggling reaction:', { messageId, emoji });
            
            // Оптимистичное обновление - обновляем UI сразу
            const message = reduxMessages?.find(m => m.id === messageId);
            if (message) {
                const reactions = message.reactions || [];
                // Ищем любую реакцию этого пользователя (не только конкретную эмодзи)
                const existingUserReactionIndex = reactions.findIndex(
                    r => r.userId === currentUserId
                );
                
                let newReactions;
                if (existingUserReactionIndex >= 0) {
                    const existingReaction = reactions[existingUserReactionIndex];
                    // Если это та же самая реакция - удаляем её
                    if (existingReaction.emoji === emoji) {
                        newReactions = reactions.filter((_, index) => index !== existingUserReactionIndex);
                    } else {
                        // Если другая реакция - заменяем на новую (удаляем старую, добавляем новую)
                        newReactions = reactions.filter((_, index) => index !== existingUserReactionIndex);
                        newReactions.push({
                            id: Date.now(), // временный ID
                            emoji,
                            userId: currentUserId,
                            createdAt: new Date().toISOString(),
                            user: { id: currentUserId }
                        });
                    }
                } else {
                    // Если реакции нет - добавляем новую
                    newReactions = [...reactions, {
                        id: Date.now(), // временный ID
                        emoji,
                        userId: currentUserId,
                        createdAt: new Date().toISOString(),
                        user: { id: currentUserId }
                    }];
                }
                
                // Обновляем Redux state оптимистично
                dispatch(updateMessageReactions({
                    messageId,
                    reactions: newReactions
                }));
            }
            
            // Отправляем на сервер
            await emitToggleReaction(messageId, emoji);
        } catch (error) {
            console.error('❌ Error toggling reaction:', error);
            showError('Ошибка', 'Не удалось изменить реакцию');
        }
    }, [emitToggleReaction, showError, currentUserId, reduxMessages, dispatch]);

    // Показать picker реакций
    const handleShowReactionPicker = useCallback((messageId, position) => {
        setReactionPickerMessageId(messageId);
        setReactionPickerPosition(position);
        setReactionPickerVisible(true);
    }, []);

    // Скрыть picker реакций
    // Скрыть picker реакций (без очистки messageId)
    const handleCloseReactionPicker = useCallback((clearMessageId = true) => {
        setReactionPickerVisible(false);
        if (clearMessageId) {
            setReactionPickerMessageId(null);
            setReactionPickerPosition(null);
        }
    }, []);

    // Обработчик выбора эмодзи из picker'а
    const handleEmojiSelect = useCallback(async (emoji) => {
        if (reactionPickerMessageId) {
            await handleToggleReaction(reactionPickerMessageId, emoji);
        }
        handleCloseReactionPicker(true); // Очищаем messageId после успешной реакции
        // Сбрасываем выделение сообщения при выборе реакции
        if (isSelectionMode) {
            clearSelection();
        }
    }, [reactionPickerMessageId, handleToggleReaction, handleCloseReactionPicker, isSelectionMode, clearSelection]);
    
    // Обработчик открытия полного списка эмодзи
    const handleShowFullEmojiPicker = useCallback(() => {
        console.log('🎨 Opening FullEmojiPicker for message:', reactionPickerMessageId);
        // Закрываем ReactionPicker, но НЕ очищаем messageId
        setReactionPickerVisible(false);
        setFullEmojiPickerVisible(true);
    }, [reactionPickerMessageId]);
    
    // Обработчик закрытия полного списка эмодзи
    const handleCloseFullEmojiPicker = useCallback(() => {
        setFullEmojiPickerVisible(false);
        // Очищаем messageId при закрытии полного picker'а
        setReactionPickerMessageId(null);
        setReactionPickerPosition(null);
    }, []);
    
    // Обработчик выбора эмодзи из полного списка
    const handleFullEmojiSelect = useCallback(async (emoji) => {
        console.log('🎨 FullEmojiSelect:', { emoji, messageId: reactionPickerMessageId });
        if (reactionPickerMessageId) {
            await handleToggleReaction(reactionPickerMessageId, emoji);
        } else {
            console.warn('⚠️ No messageId for reaction!');
        }
        // Закрываем оба окна
        setReactionPickerVisible(false);
        setFullEmojiPickerVisible(false);
        // Очищаем messageId
        setReactionPickerMessageId(null);
        setReactionPickerPosition(null);
        // Сбрасываем выделение сообщения при выборе реакции
        if (isSelectionMode) {
            clearSelection();
        }
    }, [reactionPickerMessageId, handleToggleReaction, isSelectionMode, clearSelection]);
    

    useEffect(() => {
        const sub = navigation.addListener('beforeRemove', (e) => {
            const actionType = e?.data?.action?.type;
            const targetRouteName = e?.data?.action?.payload?.name;
            
            console.log('🔍 beforeRemove triggered:', {
                actionType,
                targetRouteName,
                isRoomDeleted: isRoomDeletedRef.current,
                fromScreen: route.params?.fromScreen
            });
            
            // Если комната была удалена, разрешаем стандартную навигацию без перехвата
            if (isRoomDeletedRef.current) {
                dispatch(setActiveRoom(null));
                // Если мы навигируем к ChatMain, разрешаем навигацию без перехвата
                if (targetRouteName === 'ChatMain' || actionType === 'RESET') {
                    return; // Разрешаем навигацию, не перехватываем
                }
                // Для других случаев разрешаем стандартную навигацию
                return;
            }

            const productId = route.params?.productId || route.params?.productInfo?.id;
            const fromScreen = route.params?.fromScreen;

            dispatch(setActiveRoom(null));

            // Перехватываем только для ProductDetail, остальные случаи используют стандартную навигацию
            if (productId && fromScreen === 'ProductDetail' && (actionType === 'POP' || actionType === 'GO_BACK' || !actionType)) {
                e.preventDefault();
                navigation.navigate('MainTab', {
                    screen: 'ProductDetail',
                    params: {productId, fromScreen: 'ChatRoom'}
                });
            }
            // Для UserPublicProfile и GroupInfo используем стандартную навигацию (goBack)
        });
        return sub;
    }, [navigation, route.params, dispatch]);

    // Проверяем существование комнаты и автоматически выходим если она удалена
    useEffect(() => {
        // Не выполняем проверку если данные еще загружаются (предотвращает дергание при открытии)
        if (roomsLoading) {
            return;
        }
        
        // Проверяем удаление только если комната явно удалена или данные не найдены после загрузки
        const shouldNavigateBack = isRoomDeleted || (!roomData && roomId && !roomsLoading);
        
        if (shouldNavigateBack) {
            // Комната была удалена (через WebSocket или другим способом)
            // Устанавливаем флаг удаления СИНХРОННО через ref
            isRoomDeletedRef.current = true;
            
            // Деактивируем комнату
            dispatch(setActiveRoom(null));
            if (emitActiveRoom) {
                emitActiveRoom(null);
            }
            
            // Небольшая задержка перед навигацией, чтобы анимация открытия не прерывалась
            const timeoutId = setTimeout(() => {
                // Возвращаемся к списку чатов
                try {
                    // Пробуем найти родительский навигатор и перейти к ChatMain
                    const parent = navigation.getParent();
                    if (parent) {
                        parent.navigate('ChatMain');
                    } else if (navigation.canGoBack()) {
                        navigation.goBack();
                    } else {
                        // Последняя попытка - navigate к ChatMain
                        navigation.navigate('ChatMain');
                    }
                } catch (error) {
                    // Если все не удалось, просто goBack
                    try {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        }
                    } catch (backError) {
                        // Игнорируем ошибки навигации
                    }
                }
            }, 100);
            
            return () => clearTimeout(timeoutId);
        }
    }, [roomData, roomId, isRoomDeleted, roomsLoading, dispatch, navigation, emitActiveRoom]);

    useEffect(() => {
        // Не устанавливаем activeRoom если комната была удалена
        if (isRoomDeletedRef.current || isRoomDeleted) {
            return;
        }
        
        // Устанавливаем активную комнату в Redux
        dispatch(setActiveRoom(roomId));
        
        // Отмечаем комнату как активную при входе
        if (emitActiveRoom) {
            emitActiveRoom(roomId);
        }
        
        // Загружаем данные комнаты (сообщения загружаются через useCachedMessages)
        // Только если комната не удалена
        if (!isRoomDeleted) {
            dispatch(fetchRoom(roomId));
        }

        let markAsReadTimeout;
        const unsubscribe = navigation.addListener('focus', () => {
            // Не загружаем данные если комната удалена
            if (isRoomDeletedRef.current || isRoomDeleted) {
                return;
            }
            clearTimeout(markAsReadTimeout);
            markAsReadTimeout = setTimeout(() => {
                dispatch(markAsRead({roomId, currentUserId}));
            }, 300);
        });
        
        // Очищаем активную комнату при размонтировании
        return () => {
            unsubscribe();
            dispatch(setActiveRoom(null));
            if (emitActiveRoom) {
                emitActiveRoom(null);
            }
        };
    }, [dispatch, roomId, navigation, currentUserId, emitActiveRoom, isRoomDeleted]);


    const canShowComposer = useMemo(() => {
        if (!roomData || !currentUserId || !roomId || roomData.id !== roomId) {
            return false;
        }
        
        const roomType = String(roomData.type || '').toUpperCase().trim();
        
        // Для BROADCAST: только суперадмин или админ
        if (roomType === 'BROADCAST') {
            return isSuperAdmin || isAdmin;
        }
        
        // Для GROUP: ждём загрузки данных, кроме админов
        if (roomType === 'GROUP') {
            // Админы видят поле сразу
            if (isAdmin) {
                return true;
            }
            
            // Для не-админов: ждём пока загрузятся данные о isLocked
            if (!isRoomDataLoaded) {
                return false;
            }
            
            // После загрузки: показываем только если группа не закрыта
            return roomData.isLocked !== true;
        }
        
        // Для DIRECT и остальных типов: показываем сразу
        return true;
    }, [roomData, currentUserId, roomId, isSuperAdmin, isAdmin, isRoomDataLoaded]);
    
    // Проверка, является ли группа закрытой и нужно ли показывать блокировку
    const isGroupLocked = useMemo(() => {
        if (!roomData) return false;
        const roomType = String(roomData.type || '').toUpperCase().trim();
        if (roomType !== 'GROUP') return false;
        
        // Если isLocked явно равен true - группа закрыта
        if (roomData.isLocked === true) {
            return true;
        }
        
        return false;
    }, [roomData]);
    
    // Мемоизируем результат проверки прав на отправку сообщений
    const canSendMessagesInGroup = useMemo(() => {
        if (!roomData) return true; // Оптимистично предполагаем, что можно отправлять
        
        const roomType = String(roomData.type || '').toUpperCase().trim();
        
        // Для BROADCAST: только суперадмин или админ
        if (roomType === 'BROADCAST') {
            return isSuperAdmin || isAdmin;
        }
        
        // Для GROUP: если группа закрыта - только админ
        if (roomType === 'GROUP' && isGroupLocked) {
            return isAdmin;
        }
        
        // Для остальных случаев - все могут отправлять
        return true;
    }, [roomData, isSuperAdmin, isAdmin, isGroupLocked]);
    
    
    // Мемоизируем компонент Composer, чтобы избежать перерендеров
    const composerElement = useMemo(() => {
        if (!canShowComposer) return null;
        
        return (
            <Composer
                roomId={roomId}
                onTyping={onTyping}
                shareProductId={shareProductId}
                onMenuPress={handleMenuPress}
                replyTo={replyTo}
                onCancelReply={handleCancelReply}
                disabled={false}
            />
        );
    }, [canShowComposer, roomId, shareProductId, handleMenuPress, replyTo, handleCancelReply, onTyping]);

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
                        return;
                    }

                    setTimeout(() => {
                        dispatch(fetchMessages({roomId, limit: 100}));
                    }, 500);
                } catch (error) {
                    // Ошибка при автоматической отправке товара
                }
            }, 2000);

            return () => clearTimeout(timeoutId);
        }
    }, [autoSendProduct, productInfo, roomId, dispatch, messages]);

    const handleMenuPress = useCallback(() => {
        setMenuModalVisible(true);
    }, []);

    const closeMenuModal = useCallback(() => {
        setMenuModalVisible(false);
    }, []);

    const handleLeaveGroup = useCallback(() => {
        closeMenuModal();
        showConfirm(
            'Покинуть группу',
            'Вы уверены, что хотите покинуть эту группу? Ваши сообщения останутся в группе.',
            async () => {
                try {
                    // Устанавливаем флаг удаления СИНХРОННО через ref
                    isRoomDeletedRef.current = true;
                    
                    const result = await dispatch(leaveRoom({roomId, deleteMessages: false}));

                    if (result.error) {
                        throw new Error(result.error);
                    }

                    // Возвращаемся к списку чатов
                    try {
                        // Пробуем найти родительский навигатор и перейти к ChatMain
                        const parent = navigation.getParent();
                        if (parent) {
                            parent.navigate('ChatMain');
                        } else if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            // Последняя попытка - navigate к ChatMain
                            navigation.navigate('ChatMain');
                        }
                    } catch (error) {
                        // Если все не удалось, просто goBack
                        try {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            }
                        } catch (backError) {
                            // Игнорируем ошибки навигации
                        }
                    }
                } catch (error) {
                    showError('Ошибка', 'Не удалось покинуть группу');
                    // Сбрасываем флаг при ошибке
                    isRoomDeletedRef.current = false;
                }
            }
        );
    }, [roomId, navigation, closeMenuModal, dispatch, showConfirm, showError]);

    const handleDeleteGroup = useCallback(() => {
        closeMenuModal();
        const isBroadcast = roomData?.type === 'BROADCAST';
        const title = isBroadcast ? 'Удалить канал' : 'Удалить группу';
        const message = isBroadcast 
            ? 'Вы уверены, что хотите удалить этот канал? Все сообщения и подписчики будут удалены безвозвратно.'
            : 'Вы уверены, что хотите удалить эту группу? Все сообщения и участники будут удалены безвозвратно.';
        
        showConfirm(
            title,
            message,
            async () => {
                try {
                    // Устанавливаем флаг удаления СИНХРОННО через ref
                    isRoomDeletedRef.current = true;
                    
                    // Деактивируем комнату перед удалением
                    dispatch(setActiveRoom(null));
                    if (emitActiveRoom) {
                        emitActiveRoom(null);
                    }
                    
                    const result = await dispatch(deleteRoom({roomId}));

                    if (result.error) {
                        throw new Error(result.error);
                    }

                    // Даем немного времени для обработки удаления в Redux
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Возвращаемся к списку чатов
                    try {
                        // Пробуем найти родительский навигатор и перейти к ChatMain
                        const parent = navigation.getParent();
                        if (parent) {
                            parent.navigate('ChatMain');
                        } else if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            // Последняя попытка - navigate к ChatMain
                            navigation.navigate('ChatMain');
                        }
                    } catch (error) {
                        // Если все не удалось, просто goBack
                        try {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            }
                        } catch (backError) {
                            // Игнорируем ошибки навигации
                        }
                    }
                } catch (error) {
                    showError('Ошибка', isBroadcast ? 'Не удалось удалить канал' : 'Не удалось удалить группу');
                    // Сбрасываем флаг при ошибке
                    isRoomDeletedRef.current = false;
                }
            }
        );
    }, [roomId, roomData?.type, navigation, closeMenuModal, dispatch, showConfirm, showError]);

    useEffect(() => {
        if (isSelectionMode) {
            // Режим выбора сообщений
            const canReply = canSendMessages && selectedMessages.size === 1;
            const selectedMessagesArray = Array.from(selectedMessages);
            const canDeleteAll = selectedMessagesArray.every(msgId => {
                const msg = messages.find(m => m.id === msgId);
                return msg && canDeleteMessage(msg);
            });
            
            navigation.setOptions({
                headerShown: true,
                headerRight: () => (
                    <View style={styles.headerButtons}>
                        {canReply && (
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={handleReplyToSelected}
                                disabled={selectedMessages.size !== 1}
                            >
                                <Icon name="reply" size={24} color={selectedMessages.size === 1 ? "#007AFF" : "#999"}/>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={handleForwardSelectedMessages}
                            disabled={selectedMessages.size === 0}
                        >
                            <Icon name="share" size={24} color={selectedMessages.size > 0 ? "#007AFF" : "#999"}/>
                        </TouchableOpacity>
                        {canDeleteAll && (
                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={deleteSelectedMessages}
                                disabled={selectedMessages.size === 0}
                            >
                                <IconDelete width={24} height={24} color={selectedMessages.size > 0 ? "black" : "#999"}/>
                            </TouchableOpacity>
                        )}
                    </View>
                ),
                headerLeft: () => (
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={clearSelection}
                        >
                            <ArrowBackIcon width={24} height={24} color="#333"/>
                        </TouchableOpacity>
                    </View>
                ),
                headerTitle: 'Выбрано сообщений: ' + selectedMessages.size,
                headerTitleStyle: {
                    fontSize: 14,
                },
                headerBackTitle: null,
                headerBackVisible: false,
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
                const BackHandler = require('react-native').BackHandler;
                BackHandler.addEventListener('hardwareBackPress', backHandler);
                
                return () => {
                    BackHandler.removeEventListener('hardwareBackPress', backHandler);
                };
            }
        } else {
            // В обычном режиме восстанавливаем ChatHeader
            navigation.setOptions({
                headerLeft: () => <ChatHeader route={route} navigation={navigation}/>,
                headerTitle: '',
                headerRight: null,
                headerBackVisible: true,
                gestureEnabled: true,
            });
        }
    }, [navigation, route, isSelectionMode, selectedMessages.size, deleteSelectedMessages, clearSelection, handleReplyToSelected, handleForwardSelectedMessages, canSendMessages, canDeleteMessage, messages]);

    const loadMoreMessages = useCallback(() => {
        // Загружаем старые сообщения при скролле вверх (inverted list)
        if (isLoadingMoreRef.current || !hasMore || !roomId || isRoomDeletedRef.current) {
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
    }, [hasMore, cursorId, roomId, dispatch]);

    // Проверка позиции и подгрузка
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

    const renderItem = useCallback(({item}) => (
        <SwipeableMessageBubble
            message={item}
            currentUserId={currentUserId}
            onOpenProduct={(id) => navigation.navigate('ProductDetail', {productId: id})}
            onOpenStop={(id) => navigation.navigate('StopDetails', {stopId: id})}
            onImagePress={handleImagePress}
            isSelectionMode={isSelectionMode}
            isSelected={selectedMessages.has(item.id)}
            isHighlighted={highlightedMessageId === item.id}
            isContextMenuActive={false}
            hasContextMenu={false}
            canDelete={canDeleteMessage(item)}
            onToggleSelection={() => {
                // Если не в режиме выбора, входим в него и выбираем сообщение
                if (!isSelectionMode) {
                    setIsSelectionMode(true);
                }
                toggleMessageSelection(item.id);
            }}
            onLongPress={(position) => {
                // При долгом нажатии сразу входим в режим выбора и выбираем сообщение
                if (!isSelectionMode) {
                    setIsSelectionMode(true);
                }
                toggleMessageSelection(item.id);
                // Также открываем ReactionPicker для быстрого добавления реакции
                if (position) {
                    handleShowReactionPicker(item.id, position);
                }
            }}
            onRetryMessage={handleRetryMessage}
            onCancelMessage={handleCancelMessage}
            isRetrying={item.temporaryId ? retryingMessages.has(item.temporaryId) : false}
            onAvatarPress={() => handleAvatarPress(item)}
            onContactDriver={handleContactDriver}
            onReply={handleReply}
            onReplyPress={handleReplyPress}
            onAddReaction={(emoji) => handleToggleReaction(item.id, emoji)}
            onShowReactionPicker={(position) => handleShowReactionPicker(item.id, position)}
        />
    ), [currentUserId, isSelectionMode, selectedMessages, canDeleteMessage, canSendMessages, toggleMessageSelection, handleRetryMessage, handleCancelMessage, retryingMessages, handleImagePress, handleAvatarPress, handleContactDriver, handleReply, handleReplyPress, navigation, highlightedMessageId, handleToggleReaction, handleShowReactionPicker]);


    const keyExtractor = useCallback((item) => {
        if (item.temporaryId) {
            return `temp_${item.temporaryId}`;
        }
        return `msg_${item.id}`;
    }, []);

    // Если комната удалена, показываем пустой контейнер вместо null
    // Это предотвращает размонтирование во время анимации
    if (isRoomDeletedRef.current || isRoomDeleted) {
        return <View style={styles.container} />;
    }

    return (
        <View style={styles.container}>
            <ChatBackground>
                <View style={styles.chatContent}>
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
                                // Добавляем timestamp реакций для принудительного обновления
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
                            contentContainerStyle={styles.listContent}
                            initialNumToRender={10}
                            windowSize={5}
                            maxToRenderPerBatch={5}
                            updateCellsBatchingPeriod={100}
                            legacyImplementation={false}
                            removeClippedSubviews={false}
                            onScrollToIndexFailed={(info) => {
                                // Прокручиваем к ближайшему доступному индексу
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
                                        {canLeaveRoom && (
                                            <TouchableOpacity
                                                style={styles.menuItem}
                                                onPress={handleLeaveGroup}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.menuItemText}>
                                                    {roomData?.type === 'BROADCAST' ? 'Покинуть канал' : 'Покинуть группу'}
                                                </Text>
                                            </TouchableOpacity>
                                        )}

                                        {canDeleteRoom && (
                                            <TouchableOpacity
                                                style={styles.menuItem}
                                                onPress={handleDeleteGroup}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.menuItemText, styles.destructiveText]}>
                                                    {roomData?.type === 'BROADCAST' ? 'Удалить канал' : 'Удалить группу'}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Modal>
                    </View>
                    {(() => {
                        // Если комнаты нет - ничего не показываем
                        if (!roomData || !currentUserId) {
                            return null;
                        }
                        
                        // Показываем Composer только если пользователь может отправлять сообщения
                        // canShowComposer уже включает проверку прав, поэтому просто проверяем его
                        if (!canShowComposer) {
                            return null;
                        }
                        
                        // Используем мемоизированный компонент Composer
                        return composerElement;
                    })()}
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
    listContent: {
        paddingHorizontal: 8,
        paddingTop: 20,
        paddingBottom: 25,
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

