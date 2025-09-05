import React, {useState} from 'react';
import {View, Text, TouchableOpacity, Image, Modal, Alert, Dimensions, StyleSheet} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import {CommonActions} from '@react-navigation/native';
import {getBaseUrl} from '@shared/api/api';
import {formatLastSeen, isUserOnline} from '@shared/utils/dateUtils';
import {MenuDotsIcon} from '@shared/ui/Icon/MenuDotsIcon';
import {deleteRoom, leaveRoom} from '@entities/chat/model/slice';

// Получаем ширину экрана
const {width: screenWidth} = Dimensions.get('window');

export const ChatHeader = ({route, navigation}) => {
    const [menuVisible, setMenuVisible] = useState(false);
    const dispatch = useDispatch();
    const currentUserId = useSelector(state => state?.auth?.user?.id);
    const participantsById = useSelector(state => state?.chat?.participants?.byUserId || {});

    const params = route?.params || {};
    const roomId = params.roomId;
    const supplierInfo = params.productInfo?.supplier || params.supplierInfo;

    const roomDataRaw = useSelector(state => state?.chat?.rooms?.byId?.[roomId]);
    const roomDataParam = roomDataRaw?.room ? roomDataRaw.room : roomDataRaw;

    const textColor = '#000000';


    const getDisplayName = (user) => {
        if (!user) return 'Пользователь';

        if (user.role === 'SUPPLIER') {
            const companyName =
                user.supplier?.companyName ||
                user.companyName ||
                user.profile?.companyName;
            if (companyName) return companyName;
        }

        const name = user.name || user.profile?.name || user.firstName || user.profile?.firstName || user.companyName || user.profile?.companyName;
        if (name) return name;

        if (user.role === 'SUPPLIER') {
            const contactPerson =
                user.supplier?.contactPerson ||
                user.contactPerson ||
                user.profile?.contactPerson;
            if (contactPerson) return contactPerson;
        }

        if (user.email) {
            const emailName = user.email.split('@')[0];
            const cleanName = emailName
                .replace(/[-_]?test[-_]?/gi, '')
                .replace(/[-_]?example[-_]?/gi, '')
                .replace(/\d+/g, '');
            return cleanName.charAt(0).toUpperCase() + cleanName.slice(1) || 'Пользователь';
        }

        if (user.id) {
            return `Пользователь #${user.id}`;
        }

        return 'Пользователь';
    };

    const roomData = roomDataParam?.participants ? roomDataParam : (roomDataParam?.room ? roomDataParam.room : roomDataParam);

    const currentUserParticipant = roomData?.participants?.find(p =>
        (p?.userId ?? p?.user?.id) === currentUserId
    );
    const userRoleInRoom = currentUserParticipant?.role;
    const isOwner = userRoleInRoom === 'OWNER';

    let chatPartner = null;
    let chatPartnerName = params.roomTitle || 'Чат';
    let chatPartnerAvatar = null;
    let chatPartnerStatus = 'онлайн';

    if (roomData?.type === 'GROUP') {
        chatPartnerName = roomData.title || 'Группа';
        chatPartnerAvatar = roomData.avatar;

        const participantsCount = roomData.participants ? roomData.participants.length : 0;
        chatPartnerStatus = `${participantsCount} участник${participantsCount === 1 ? '' : participantsCount < 5 ? 'а' : 'ов'}`;
    }
    else if (roomData?.participants && Array.isArray(roomData.participants) && currentUserId) {
        chatPartner = roomData.participants.find(p => ((p?.userId ?? p?.user?.id)) !== currentUserId);
        if (chatPartner) {
            const partnerId = chatPartner?.userId ?? chatPartner?.user?.id ?? chatPartner?.id;
            const cachedUser = participantsById[partnerId];

            if (cachedUser) {
                chatPartnerName = getDisplayName(cachedUser);
                chatPartnerAvatar = cachedUser.avatar || cachedUser.image || null;
                const userIsOnline = isUserOnline(cachedUser.lastSeenAt);
                chatPartnerStatus = formatLastSeen(cachedUser.lastSeenAt, userIsOnline);
            } else {
                const userData = chatPartner.user || chatPartner;
                chatPartnerName = getDisplayName(userData);
                chatPartnerAvatar =
                    chatPartner.avatar ||
                    chatPartner.image ||
                    chatPartner.user?.avatar ||
                    chatPartner.user?.image ||
                    null;
                const userIsOnline = isUserOnline(userData.lastSeenAt);
                chatPartnerStatus = formatLastSeen(userData.lastSeenAt, userIsOnline);
            }
        }

        if (!chatPartner && supplierInfo) {
            const supplierUserData = supplierInfo.user || supplierInfo;
            chatPartnerName = getDisplayName(supplierUserData);
            chatPartnerAvatar = supplierInfo.user?.avatar || supplierInfo.avatar || supplierInfo.user?.image || supplierInfo.image || null;
        }
    }

    const handleBackPress = () => {
        const fromScreen = params.fromScreen;
        const productId = params.productId || params.productInfo?.id;

        if (fromScreen === 'ChatList') {
            if (navigation.canGoBack()) {
                navigation.goBack();
            }
            return;
        }

        if (productId && (fromScreen === 'ProductDetail' || !fromScreen)) {
            navigation.navigate('MainTab', {
                screen: 'ProductDetail',
                params: {productId, fromScreen: 'ChatRoom'}
            });
            return;
        }

        if (navigation.canGoBack()) {
            navigation.goBack();
        }
    };

    const handleProfilePress = () => {
        if (roomData?.type === 'GROUP') {
            navigation.navigate('GroupInfo', {
                roomId: roomId
            });
            return;
        }

        const supplierFromProduct = params.productInfo?.supplier;
        const partnerUserId = (chatPartner?.user?.id) ?? chatPartner?.userId ?? chatPartner?.id;
        const partnerUser = chatPartner?.user || chatPartner;

        const userRole = partnerUser?.role;
        if (userRole === 'SUPPLIER') {
            let supplierId = null;

            if (supplierFromProduct?.id) {
                supplierId = supplierFromProduct.id;
            }
            else if (partnerUser?.supplier?.id) {
                supplierId = partnerUser.supplier.id;
            }
            else if (partnerUserId) {
                supplierId = partnerUserId;
            }

            console.log('ChatHeader navigating to SupplierScreen with supplierId:', supplierId);

            if (supplierId) {
                try {
                    console.log('Attempting navigation to SupplierScreen...');

                    const rootNavigation = navigation.getParent();
                    const grandParentNavigation = rootNavigation?.getParent?.();
                    console.log('Root navigation available:', !!rootNavigation);
                    console.log('Grand parent navigation available:', !!grandParentNavigation);

                    if (rootNavigation) {
                        navigation.navigate('SupplierScreen', {
                            supplierId,
                            fromScreen: 'ChatRoom'
                        });
                    } else {
                        navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [
                                    {
                                        name: 'MainTab',
                                        params: {
                                            screen: 'ProfileTab',
                                            params: {
                                                screen: 'SupplierScreen',
                                                params: {
                                                    supplierId,
                                                    fromScreen: 'ChatRoom'
                                                }
                                            }
                                        }
                                    }
                                ]
                            })
                        );
                    }

                } catch (error) {
                    console.error('Navigation error:', error);
                }
                return;
            }
        }

        if (partnerUserId) {
            navigation.navigate('UserPublicProfile', {
                userId: partnerUserId,
                fromScreen: 'ChatRoom'
            });
        }
    };

    const getAvatarUri = () => {
        if (!chatPartnerAvatar || typeof chatPartnerAvatar !== 'string') return null;

        if (chatPartnerAvatar.startsWith('http')) {
            return chatPartnerAvatar;
        }

        const cleaned = String(chatPartnerAvatar)
            .replace(/^\\+/g, '')
            .replace(/^\/+/, '')
            .replace(/^uploads\/?/, '');
        return `${getBaseUrl()}/uploads/${cleaned}`;
    };

    const avatarUri = getAvatarUri();

    const handleDeleteChat = () => {
        setMenuVisible(false);

        Alert.alert(
            'Удалить чат',
            'Вы уверены, что хотите удалить этот чат? Все сообщения будут удалены безвозвратно.',
            [
                {
                    text: 'Отмена',
                    style: 'cancel',
                },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dispatch(deleteRoom({roomId})).unwrap();
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.reset({
                                    index: 0,
                                    routes: [{name: 'ChatTab', params: {screen: 'ChatList'}}],
                                });
                            }
                        } catch (error) {
                            console.error('Delete room error:', error);
                            Alert.alert('Ошибка', error.message || 'Не удалось удалить чат');
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteGroup = () => {
        setMenuVisible(false);

        Alert.alert(
            'Удалить группу',
            'Вы уверены, что хотите удалить эту группу? Все сообщения и участники будут удалены безвозвратно.',
            [
                {
                    text: 'Отмена',
                    style: 'cancel',
                },
                {
                    text: 'Удалить группу',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dispatch(deleteRoom({roomId})).unwrap();
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.reset({
                                    index: 0,
                                    routes: [{name: 'ChatTab', params: {screen: 'ChatList'}}],
                                });
                            }
                        } catch (error) {
                            console.error('Delete group error:', error);
                            Alert.alert('Ошибка', error.message || 'Не удалось удалить группу');
                        }
                    },
                },
            ]
        );
    };

    const handleLeaveGroup = () => {
        setMenuVisible(false);

        Alert.alert(
            'Покинуть группу',
            'Вы уверены, что хотите покинуть эту группу? Ваши сообщения останутся в группе.',
            [
                {
                    text: 'Отмена',
                    style: 'cancel',
                },
                {
                    text: 'Покинуть',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dispatch(leaveRoom({roomId, deleteMessages: false})).unwrap();
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.reset({
                                    index: 0,
                                    routes: [{name: 'ChatTab', params: {screen: 'ChatList'}}],
                                });
                            }
                        } catch (error) {
                            console.error('Leave room error:', error);
                            const errorMessage = error.message || 'Не удалось покинуть группу';

                            if (errorMessage.includes('владелец') || errorMessage.includes('Владелец')) {
                                Alert.alert(
                                    'Нельзя покинуть группу',
                                    'Владелец группы не может покинуть группу, не назначив другого администратора. Сначала назначьте кого-то из участников администратором группы или удалите группу полностью.',
                                    [{text: 'Понятно'}]
                                );
                            } else {
                                Alert.alert('Ошибка', errorMessage);
                            }
                        }
                    },
                },
            ]
        );
    };

    const handleLeaveGroupWithDeletion = () => {
        setMenuVisible(false);

        Alert.alert(
            'Покинуть группу с удалением',
            'Вы уверены, что хотите покинуть группу и удалить все свои сообщения? Это действие нельзя отменить.',
            [
                {
                    text: 'Отмена',
                    style: 'cancel',
                },
                {
                    text: 'Покинуть и удалить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dispatch(leaveRoom({roomId, deleteMessages: true})).unwrap();
                            // Возвращаемся к списку чатов
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.reset({
                                    index: 0,
                                    routes: [{name: 'ChatTab', params: {screen: 'ChatList'}}],
                                });
                            }
                        } catch (error) {
                            console.error('Leave room with deletion error:', error);
                            const errorMessage = error.message || 'Не удалось покинуть группу';

                            // Специальная обработка для владельца группы
                            if (errorMessage.includes('владелец') || errorMessage.includes('Владелец')) {
                                Alert.alert(
                                    'Нельзя покинуть группу',
                                    'Владелец группы не может покинуть группу, не назначив другого администратора. Сначала назначьте кого-то из участников администратором группы или удалите группу полностью.',
                                    [{text: 'Понятно'}]
                                );
                            } else {
                                Alert.alert('Ошибка', errorMessage);
                            }
                        }
                    },
                },
            ]
        );
    };

    return (
        <>
            {/* Модальное меню */}
            <Modal
                visible={menuVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setMenuVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        {roomData?.type === 'GROUP' ? (
                            <>
                                {/* Удалить группу - только для владельца */}
                                {isOwner && (
                                    <TouchableOpacity
                                        style={styles.modalItem}
                                        onPress={handleDeleteGroup}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.modalItemTextDestructive}>
                                            Удалить группу
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {/* Выход из группы - для всех, но с ограничениями для владельца */}
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={handleLeaveGroup}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.modalItemText}>
                                        Покинуть группу
                                    </Text>
                                </TouchableOpacity>

                                {/* Выход из группы с удалением сообщений - только для не-владельцев */}
                                {!isOwner && (
                                    <TouchableOpacity
                                        style={styles.modalItem}
                                        onPress={handleLeaveGroupWithDeletion}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.modalItemTextDestructive}>
                                            Покинуть с удалением
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        ) : (
                            /* Удалить чат - для обычных чатов */
                            <TouchableOpacity
                                style={styles.modalItem}
                                onPress={handleDeleteChat}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.modalItemTextDestructive}>
                                    Удалить чат
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Основной хедер во весь экран */}
            <View style={styles.header}>
                {/* Кнопка назад */}
                <TouchableOpacity
                    onPress={handleBackPress}
                    style={styles.backButton}
                    activeOpacity={0.6}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                    <Text style={styles.backButtonText}>
                        ←
                    </Text>
                </TouchableOpacity>

                {/* Аватар */}
                <TouchableOpacity
                    onPress={handleProfilePress}
                    activeOpacity={0.7}
                    style={styles.avatarContainer}
                >
                    <View style={styles.avatar}>
                        {avatarUri ? (
                            <Image
                                source={{uri: avatarUri}}
                                style={styles.avatarImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <Text style={styles.avatarPlaceholder}>
                                {roomData?.type === 'GROUP' ? '👥' : '👤'}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>

                {/* Информация о чате */}
                <TouchableOpacity
                    style={styles.chatInfoContainer}
                    activeOpacity={0.7}
                    onPress={handleProfilePress}
                >
                    <Text style={styles.chatName} numberOfLines={1}>
                        {chatPartnerName}
                    </Text>
                    <Text style={styles.chatStatus} numberOfLines={1}>
                        {chatPartnerStatus}
                    </Text>
                </TouchableOpacity>

                {/* Кнопка меню */}
                <TouchableOpacity
                    onPress={() => setMenuVisible(true)}
                    style={styles.menuButton}
                    activeOpacity={0.6}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                    <MenuDotsIcon size={20} color={textColor}/>
                </TouchableOpacity>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 8,
        height: 64,
        width: screenWidth,
        zIndex: 1000,
    },
    backButton: {
        padding: 12,
        marginRight: 4,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 44,
        minHeight: 44,
    },
    backButtonText: {
        fontSize: 26,
        color: '#000000',
        fontWeight: '400',
        textAlign: 'center',
        lineHeight: 26,
    },
    avatarContainer: {
        marginRight: 8,
    },
    avatar: {
        width: 35,
        height: 35,
        borderRadius: 20,
        backgroundColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    avatarImage: {
        width: 35,
        height: 35,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        fontSize: 18,
        color: '#666666',
    },
    chatInfoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    chatName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000000',
        marginBottom: 2,
    },
    chatStatus: {
        fontSize: 11,
        color: '#666666',
    },
    menuButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 60,
        paddingRight: 16,
    },
    modalContainer: {
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
    modalItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalItemText: {
        fontSize: 16,
        color: '#000000',
        fontWeight: '400',
    },
    modalItemTextDestructive: {
        fontSize: 16,
        color: '#D32F2F',
        fontWeight: '400',
    },
});