import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, FlatList, StyleSheet, TouchableOpacity, Text, Image, Alert, Modal} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {
    fetchMessages,
    markAsRead,
    sendProduct,
    loadRoomMessagesCache,
    fetchRoom,
    setActiveRoom,
    deleteRoom,
    leaveRoom,
    deleteMessage,
} from '@entities/chat/model/slice';
import {makeSelectRoomMessages} from '@entities/chat/model/selectors';
import {fetchProductById} from '@entities/product/model/slice';
import {MessageBubble} from '@entities/chat/ui/MessageBubble';
import {Composer} from '@entities/chat/ui/Composer';
import {ChatBackground} from '@entities/chat/ui/ChatBackground';

import {getBaseUrl} from '@shared/api/api';
import {ImageViewerModal} from '@shared/ui/ImageViewerModal/ui/ImageViewerModal';
import {IconDelete} from '@shared/ui/Icon/ProductManagement/IconDelete';
import ArrowBackIcon from '@shared/ui/Icon/Common/ArrowBackIcon';


export const ChatRoomScreen = ({route, navigation}) => {
    const {
        roomId,
        productId: shareProductId,
        productInfo,
        autoSendProduct
    } = route.params;

    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [selectedImageUri, setSelectedImageUri] = useState(null);
    const [menuModalVisible, setMenuModalVisible] = useState(false);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessages, setSelectedMessages] = useState(new Set());

    const dispatch = useDispatch();
    const selectRoomMessages = useMemo(() => makeSelectRoomMessages(), []);
    const messages = useSelector((s) => selectRoomMessages(s, roomId));
    const loading = useSelector((s) => s.chat?.messages?.[roomId]?.loading);
    const currentUserId = useSelector((s) => s.auth?.user?.id);
    const roomDataRaw = useSelector((s) => s.chat?.rooms?.byId?.[roomId]);
    const roomData = roomDataRaw?.room ? roomDataRaw.room : roomDataRaw;
    const participantsById = useSelector((s) => s.chat?.participants?.byUserId || {});

    const isAdmin = useMemo(() => {
        if (roomData?.type !== 'GROUP') return false;

        if (!roomData?.participants || !currentUserId) return false;

        const currentParticipant = roomData.participants.find(p =>
            (p?.userId ?? p?.user?.id) === currentUserId
        );

        return currentParticipant?.role === 'ADMIN' || currentParticipant?.role === 'OWNER';
    }, [roomData, currentUserId]);

    const canDeleteMessage = useCallback((message) => {
        if (!message) return false;

        if (roomData?.type === 'GROUP' && isAdmin) {
            return true;
        }

        return message.senderId === currentUserId;
    }, [isAdmin, currentUserId, roomData?.type]);

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
                chatPartner?.image ||
                productInfo?.supplier?.user?.avatar ||
                productInfo?.supplier?.avatar;
        }

        if (!raw || typeof raw !== 'string') return null;
        if (raw.startsWith('http')) return raw;

        let path = raw.replace(/^\\+/g, '').replace(/^\/+/, '');
        path = path.replace(/^uploads\/?/, '');
        return `${getBaseUrl()}/uploads/${path}`;
    }, [chatPartner, productInfo, participantsById]);

    const toggleMessageSelection = useCallback((messageId) => {
        setSelectedMessages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(messageId)) {
                newSet.delete(messageId);
            } else {
                newSet.add(messageId);
            }
            return newSet;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedMessages(new Set());
        setIsSelectionMode(false);
    }, []);

    const deleteSelectedMessages = useCallback(async () => {
        if (selectedMessages.size === 0) return;

        try {
            Alert.alert(
                'Удалить сообщения',
                `Вы уверены, что хотите удалить ${selectedMessages.size} сообщений?`,
                [
                    {text: 'Отмена', style: 'cancel'},
                    {
                        text: 'Удалить',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                const messageIds = Array.from(selectedMessages);

                                const deletePromises = messageIds.map(async (messageId) => {
                                    const message = messages.find(m => m.id === messageId);
                                    let forAll = false;

                                    if (message) {
                                        if (isAdmin) {
                                            forAll = true;
                                        } else if (message.senderId === currentUserId) {
                                            forAll = false;
                                        }
                                    }

                                    const result = await dispatch(deleteMessage({
                                        messageId,
                                        forAll,
                                        currentUserId
                                    }));
                                    return result;
                                });

                                await Promise.all(deletePromises);

                                clearSelection();

                                setTimeout(() => {
                                    dispatch(fetchMessages({roomId, limit: 30}));
                                }, 100);

                            } catch (error) {
                                console.error('Ошибка при удалении сообщений:', error);
                                Alert.alert('Ошибка', 'Не удалось удалить некоторые сообщения');
                            }
                        },
                    },
                ]
            );
        } catch (error) {
            console.error('Ошибка при удалении сообщений:', error);
            Alert.alert('Ошибка', 'Не удалось удалить сообщения');
        }
    }, [selectedMessages, isAdmin, currentUserId, clearSelection, dispatch, roomId, messages]);

    useEffect(() => {
        const sub = navigation.addListener('beforeRemove', (e) => {
            const productId = route.params?.productId || route.params?.productInfo?.id;
            const fromScreen = route.params?.fromScreen;
            const actionType = e?.data?.action?.type;

            dispatch(setActiveRoom(null));

            if (productId && fromScreen === 'ProductDetail' && (actionType === 'POP' || actionType === 'GO_BACK' || !actionType)) {
                e.preventDefault();
                navigation.navigate('MainTab', {
                    screen: 'ProductDetail',
                    params: {productId, fromScreen: 'ChatRoom'}
                });
            }
        });
        return sub;
    }, [navigation, route.params]);

    useEffect(() => {
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
        return unsubscribe;
    }, [dispatch, roomId, navigation, currentUserId]);

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
                        console.error('ChatRoom: Ошибка при отправке товара:', result.error);
                        return;
                    }

                    setTimeout(() => {
                        dispatch(fetchMessages({roomId, limit: 30}));
                    }, 500);
                } catch (error) {
                    console.error('ChatRoom: Ошибка при автоматической отправке товара', error);
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
        Alert.alert(
            'Удалить чат',
            'Вы уверены, что хотите удалить этот чат? Все сообщения будут удалены безвозвратно.',
            [
                {text: 'Отмена', style: 'cancel'},
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await dispatch(deleteRoom({roomId}));

                            if (result.error) {
                                throw new Error(result.error);
                            }

                            navigation.goBack();
                        } catch (error) {
                            console.error('Ошибка при удалении чата:', error);
                            Alert.alert('Ошибка', 'Не удалось удалить чат');
                        }
                    },
                },
            ]
        );
    }, [roomId, navigation, closeMenuModal, dispatch]);

    const handleLeaveGroup = useCallback(() => {
        closeMenuModal();
        Alert.alert(
            'Покинуть группу',
            'Вы уверены, что хотите покинуть эту группу? Ваши сообщения останутся в группе.',
            [
                {text: 'Отмена', style: 'cancel'},
                {
                    text: 'Покинуть',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await dispatch(leaveRoom({roomId, deleteMessages: false}));

                            if (result.error) {
                                throw new Error(result.error);
                            }

                            navigation.goBack();
                        } catch (error) {
                            console.error('Ошибка при выходе из группы:', error);
                            Alert.alert('Ошибка', 'Не удалось покинуть группу');
                        }
                    },
                },
            ]
        );
    }, [roomId, navigation, closeMenuModal, dispatch]);

    const handleDeleteGroup = useCallback(() => {
        closeMenuModal();
        Alert.alert(
            'Удалить группу',
            'Вы уверены, что хотите удалить эту группу? Все сообщения и участники будут удалены безвозвратно.',
            [
                {text: 'Отмена', style: 'cancel'},
                {
                    text: 'Удалить группу',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await dispatch(deleteRoom({roomId}));

                            if (result.error) {
                                throw new Error(result.error);
                            }

                            navigation.goBack();
                        } catch (error) {
                            console.error('Ошибка при удалении группы:', error);
                            Alert.alert('Ошибка', 'Не удалось удалить группу');
                        }
                    },
                },
            ]
        );
    }, [roomId, navigation, closeMenuModal, dispatch]);

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
            });
        } else {
            // В обычном режиме НЕ переопределяем хедер - используем ChatHeader из навигатора
            // Просто убираем все кастомные настройки
        }
    }, [navigation, isSelectionMode, selectedMessages.size, deleteSelectedMessages, clearSelection]);

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
                            keyExtractor={(item) => String(item.id)}
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
                                        {roomData?.type === 'GROUP' ? (
                                            <>
                                                <TouchableOpacity
                                                    style={styles.menuItem}
                                                    onPress={handleLeaveGroup}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={styles.menuItemText}>Покинуть группу</Text>
                                                </TouchableOpacity>

                                                {roomData?.participants?.find(p =>
                                                    (p?.userId ?? p?.user?.id) === currentUserId
                                                )?.role === 'OWNER' && (
                                                    <TouchableOpacity
                                                        style={styles.menuItem}
                                                        onPress={handleDeleteGroup}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={[styles.menuItemText, styles.destructiveText]}>
                                                            Удалить группу
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.menuItem}
                                                onPress={handleDeleteChat}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.menuItemText, styles.destructiveText]}>
                                                    Удалить чат
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Modal>
                    </View>
                    <Composer roomId={roomId} onTyping={onTyping}/>
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
        backgroundColor: 'transparent',
    },
    chatContent: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    messagesContainer: {
        flex: 1,
        position: 'relative',
    },
    listContent: {
        paddingVertical: 8,
        paddingHorizontal: 8,
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
        transform: [{scaleY: -1}],
    },
    emptyText: {
        color: '#8696A0',
        fontSize: 16,
        textAlign: 'center',
    },

    emptyStateContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
    },
    emptyStateText: {
        color: '#8696A0',
        fontSize: 16,
        textAlign: 'center',
    },
    menuModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 60,
        paddingRight: 16,
    },
    menuModalContainer: {
        alignItems: 'flex-end',
    },
    menuModal: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingVertical: 8,
        minWidth: 200,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    menuItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    menuItemText: {
        fontSize: 16,
        color: '#000000',
        fontWeight: '400',
    },
    destructiveText: {
        color: '#FF3B30',
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    headerButton: {
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 20,
        backgroundColor: 'transparent',
        marginHorizontal: 4,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerLeft: {
        marginLeft: 5,
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 20,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default ChatRoomScreen;