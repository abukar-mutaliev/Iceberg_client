import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, FlatList, StyleSheet, TouchableOpacity, Text, Modal, Platform, BackHandler} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {
    fetchMessages,
    markAsRead,
    sendProduct,
    loadRoomMessagesCache,
    fetchRoom,
    setActiveRoom,
    deleteRoom,
    deleteMessage,
    sendVoice,
    cancelFailedMessage,
} from '@entities/chat/model/slice';
import {makeSelectRoomMessages} from '@entities/chat/model/selectors';
import {fetchProductById} from '@entities/product/model/slice';
import {MessageBubble} from '@entities/chat/ui/MessageBubble';
import {Composer} from '@entities/chat/ui/Composer';
import {ChatBackground} from '@entities/chat/ui/ChatBackground';
import {useChatSocketActions} from '@entities/chat/hooks/useChatSocketActions';
import {ChatHeader} from '@entities/chat/ui/ChatHeader';

import {getBaseUrl} from '@shared/api/api';
import {ImageViewerModal} from '@shared/ui/ImageViewerModal/ui/ImageViewerModal';
import {IconDelete} from '@shared/ui/Icon/ProductManagement/IconDelete';
import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';
import {useCustomAlert} from '@shared/ui/CustomAlert/CustomAlertProvider';


export const DirectChatScreen = ({route, navigation}) => {
    const {
        roomId,
        productId: shareProductId,
        productInfo,
        autoSendProduct,
        groupRoomId,
        userId,
    } = route.params;

    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [selectedImageUri, setSelectedImageUri] = useState(null);
    const [menuModalVisible, setMenuModalVisible] = useState(false);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState(new Set());
    const [retryingMessages, setRetryingMessages] = useState(new Set());

    const dispatch = useDispatch();
    const { showError, showWarning, showConfirm } = useCustomAlert();
    const selectRoomMessages = useMemo(() => makeSelectRoomMessages(), []);
    const messages = useSelector((s) => selectRoomMessages(s, roomId));
    const loading = useSelector((s) => s.chat?.messages?.[roomId]?.loading);
    const currentUserId = useSelector((s) => s.auth?.user?.id);
    const roomDataRaw = useSelector((s) => s.chat?.rooms?.byId?.[roomId]);
    const roomData = roomDataRaw?.room ? roomDataRaw.room : roomDataRaw;
    const participantsById = useSelector((s) => s.chat?.participants?.byUserId || {});
    
    // Получаем функции WebSocket
    const { emitActiveRoom, emitMarkRead } = useChatSocketActions();

    const canDeleteMessage = useCallback((message) => {
        if (!message) return false;
        return message.senderId === currentUserId;
    }, [currentUserId]);

    const chatPartner = useMemo(() => {
        if (!roomData?.participants || !currentUserId) return null;

        const partner = roomData.participants.find(p =>
            (p?.userId ?? p?.user?.id) !== currentUserId
        );

        return partner;

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

    const toggleMessageSelection = useCallback((messageId) => {
        setSelectedMessages(prev => {
            const updated = new Set(prev);
            if (updated.has(messageId)) {
                updated.delete(messageId);
            } else {
                updated.add(messageId);
            }
            return updated;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedMessages(new Set());
        setIsSelectionMode(false);
    }, []);

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

    // Обработчик нажатия на аватар собеседника
    const handleAvatarPress = useCallback(() => {
        if (!chatPartner) return;
        
        const userId = chatPartner?.userId ?? chatPartner?.user?.id ?? chatPartner?.id;
        if (!userId || userId === currentUserId) return;

        navigation.navigate('UserPublicProfile', {
            userId: userId,
            fromScreen: 'DirectChat',
            roomId: roomId
        });
    }, [chatPartner, currentUserId, navigation, roomId]);

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
                                console.warn('DirectChat: Message not found for deletion:', messageId);
                                return;
                            }
                            
                            const isAuthor = message.senderId === currentUserId;
                            const forAll = isAuthor; // В личных чатах автор удаляет для всех

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

                        // Очищаем выбор и выходим из режима выбора
                        clearSelection();

                        // Обновляем список сообщений
                        setTimeout(() => {
                            dispatch(fetchMessages({roomId, limit: 30}));
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
                        showError('Ошибка', 'Не удалось удалить некоторые сообщения');
                    }
                }
            );
        } catch (error) {
            console.error('Ошибка при удалении сообщений:', error);
            showError('Ошибка', 'Не удалось удалить сообщения');
        }
    }, [selectedMessages, currentUserId, clearSelection, dispatch, roomId, messages, showConfirm, showWarning, showError]);

    useEffect(() => {
        const sub = navigation.addListener('beforeRemove', (e) => {
            const productId = route.params?.productId || route.params?.productInfo?.id;
            const fromScreen = route.params?.fromScreen;
            const actionType = e?.data?.action?.type;

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

    // BackHandler не нужен для случаев с UserPublicProfile, так как beforeRemove уже обрабатывает навигацию
    // Это предотвращает циклические переходы при свайпах назад

    useEffect(() => {
        // Устанавливаем активную комнату в Redux
        dispatch(setActiveRoom(roomId));
        
        // Отмечаем комнату как активную при входе
        if (emitActiveRoom) {
            emitActiveRoom(roomId);
        }
        
        dispatch(loadRoomMessagesCache({roomId}));
        dispatch(fetchMessages({roomId, limit: 30}));
        dispatch(fetchRoom(roomId));

        let markAsReadTimeout;
        const unsubscribe = navigation.addListener('focus', () => {
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
    }, [dispatch, roomId, navigation, currentUserId, emitActiveRoom]);

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
                        console.error('DirectChat: Ошибка при отправке товара:', result.error);
                        return;
                    }

                    setTimeout(() => {
                        dispatch(fetchMessages({roomId, limit: 30}));
                    }, 500);
                } catch (error) {
                    console.error('DirectChat: Ошибка при автоматической отправке товара', error);
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

    const handleDeleteChat = useCallback(() => {
        closeMenuModal();
        showConfirm(
            'Удалить чат',
            'Вы уверены, что хотите удалить этот чат? Все сообщения будут удалены безвозвратно.',
            async () => {
                try {
                    const result = await dispatch(deleteRoom({roomId}));

                    if (result.error) {
                        throw new Error(result.error);
                    }

                    navigation.goBack();
                } catch (error) {
                    console.error('Ошибка при удалении чата:', error);
                    showError('Ошибка', 'Не удалось удалить чат');
                }
            }
        );
    }, [roomId, navigation, closeMenuModal, dispatch, showConfirm, showError]);

    useEffect(() => {
        if (isSelectionMode) {
            navigation.setOptions({
                headerShown: true,
                headerRight: () => (
                    <View style={styles.headerButtons}>
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={deleteSelectedMessages}
                            disabled={selectedMessages.size === 0}
                        >
                            <IconDelete width={24} height={24} color="black"/>
                        </TouchableOpacity>
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
    }, [navigation, route, isSelectionMode, selectedMessages.size, deleteSelectedMessages, clearSelection]);

    const onEndReached = useCallback(() => {
    }, []);

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

    const renderItem = ({item}) => (
        <MessageBubble
            message={item}
            currentUserId={currentUserId}
            onOpenProduct={(id) => navigation.navigate('ProductDetail', {productId: id})}
            onImagePress={handleImagePress}
            incomingAvatarUri={partnerAvatar}
            isSelectionMode={isSelectionMode}
            isSelected={selectedMessages.has(item.id)}
            canDelete={canDeleteMessage(item)}
            onToggleSelection={() => toggleMessageSelection(item.id)}
            onLongPress={() => {
                if (!isSelectionMode && canDeleteMessage(item)) {
                    setIsSelectionMode(true);
                    setSelectedMessages(new Set([item.id]));
                }
            }}
            onRetryMessage={handleRetryMessage}
            onCancelMessage={handleCancelMessage}
            isRetrying={item.temporaryId ? retryingMessages.has(item.temporaryId) : false}
            onAvatarPress={handleAvatarPress}
        />
    );

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
                            data={messages}
                            extraData={[partnerAvatar, currentUserId, messages.length, selectedMessages.size]}
                            inverted
                            keyExtractor={(item) => {
                                if (item.temporaryId) {
                                    return `temp_${item.temporaryId}`;
                                }
                                return `msg_${item.id}`;
                            }}
                            renderItem={renderItem}
                            onEndReachedThreshold={0.2}
                            onEndReached={onEndReached}
                            contentContainerStyle={styles.listContent}
                            initialNumToRender={20}
                            windowSize={10}
                            maxToRenderPerBatch={10}
                            removeClippedSubviews
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
                    <Composer
                        roomId={roomId}
                        onTyping={onTyping}
                        shareProductId={shareProductId}
                        onMenuPress={handleMenuPress}
                    />
                </View>
            </ChatBackground>

            <ImageViewerModal
                visible={imageViewerVisible}
                imageUri={selectedImageUri}
                onClose={handleImageViewerClose}
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
        paddingHorizontal: 16,
        paddingVertical: 8,
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
});

