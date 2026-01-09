import React, {useState} from 'react';
import {View, Text, TouchableOpacity, Image, Modal, Dimensions, StyleSheet} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import {CommonActions} from '@react-navigation/native';
import {getImageUrl} from '@shared/api/api';
import {formatLastSeen, isUserOnline} from '@shared/utils/dateUtils';
import {MenuDotsIcon} from '@shared/ui/Icon/MenuDotsIcon';
import {deleteRoom, leaveRoom} from '@entities/chat/model/slice';
import {useCustomAlert} from '@shared/ui/CustomAlert';

// Получаем ширину экрана
const {width: screenWidth} = Dimensions.get('window');

export const ChatHeader = ({route, navigation}) => {
    const [menuVisible, setMenuVisible] = useState(false);
    const dispatch = useDispatch();
    const currentUser = useSelector(state => state?.auth?.user);
    const currentUserId = currentUser?.id;
    const participantsById = useSelector(state => state?.chat?.participants?.byUserId || {});
    const {showError, showAlert} = useCustomAlert();

    const params = route?.params || {};
    const roomId = params.roomId;
    const supplierInfo = params.productInfo?.supplier || params.supplierInfo;

    const roomDataRaw = useSelector(state => state?.chat?.rooms?.byId?.[roomId]);
    const roomDataParam = roomDataRaw?.room ? roomDataRaw.room : roomDataRaw;

    const textColor = '#000000';


    const getDisplayName = (user) => {
        if (!user) {
            return 'Пользователь';
        }

        if (user.role === 'SUPPLIER') {
            const companyName =
                user.supplier?.companyName ||
                user.companyName ||
                user.profile?.companyName;
            if (companyName) {
                return companyName;
            }
        }

        // Для водителей проверяем driver.name в первую очередь
        if (user.role === 'DRIVER') {
            const driverName = user.driver?.name || user.name;
            if (driverName) {
                return driverName;
            }
        }

        const name = user.name || user.profile?.name || user.firstName || user.profile?.firstName || user.companyName || user.profile?.companyName;
        if (name) {
            return name;
        }

        if (user.role === 'SUPPLIER') {
            const contactPerson =
                user.supplier?.contactPerson ||
                user.contactPerson ||
                user.profile?.contactPerson;
            if (contactPerson) {
                return contactPerson;
            }
        }

        if (user.email) {
            const emailName = user.email.split('@')[0];
            const cleanName = emailName
                .replace(/[-_]?test[-_]?/gi, '')
                .replace(/[-_]?example[-_]?/gi, '')
                .replace(/\d+/g, '');
            const result = cleanName.charAt(0).toUpperCase() + cleanName.slice(1) || 'Пользователь';
            return result;
        }

        if (user.id) {
            const result = `Пользователь #${user.id}`;
            return result;
        }

        return 'Пользователь';
    };

    // Функция для получения всех возможных вариантов имени пользователя
    const getCurrentUserNames = (user) => {
        if (!user) return [];
        const names = [];
        if (user.role === 'CLIENT') {
            if (user.client?.name) names.push(user.client.name);
            if (user.client?.companyName) names.push(user.client.companyName);
            if (user.profile?.name) names.push(user.profile.name);
            if (user.profile?.companyName) names.push(user.profile.companyName);
        } else if (user.role === 'SUPPLIER') {
            if (user.supplier?.companyName) names.push(user.supplier.companyName);
            if (user.supplier?.contactPerson) names.push(user.supplier.contactPerson);
            if (user.profile?.companyName) names.push(user.profile.companyName);
            if (user.profile?.contactPerson) names.push(user.profile.contactPerson);
        } else if (user.role === 'DRIVER') {
            if (user.driver?.name) names.push(user.driver.name);
            if (user.profile?.name) names.push(user.profile.name);
        } else if (user.role === 'EMPLOYEE') {
            if (user.employee?.name) names.push(user.employee.name);
            if (user.profile?.name) names.push(user.profile.name);
        } else if (user.role === 'ADMIN') {
            if (user.admin?.name) names.push(user.admin.name);
            if (user.profile?.name) names.push(user.profile.name);
        }
        if (user.name) names.push(user.name);
        if (user.companyName) names.push(user.companyName);
        // Также добавляем результат getDisplayName
        const displayNameResult = getDisplayName(user);
        if (displayNameResult && !names.includes(displayNameResult)) {
            names.push(displayNameResult);
        }
        return names;
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

    if (roomData?.type === 'GROUP' || roomData?.type === 'BROADCAST') {
        chatPartnerName = roomData.title || (roomData?.type === 'BROADCAST' ? 'Канал' : 'Группа');
        chatPartnerAvatar = roomData.avatar;

        // Для клиентов в BROADCAST каналах - показываем только менеджеров и водителей склада клиента
        let participantsCount = roomData.participants ? roomData.participants.length : 0;
        
        if (roomData?.type === 'BROADCAST' && currentUser?.role === 'CLIENT') {
            const clientDistrictId = currentUser?.client?.districtId;
            const filteredParticipants = (roomData.participants || []).filter(p => {
                const user = p.user || p;
                const userRole = user?.role;
                
                // Скрываем суперадминов от клиентов
                if (userRole === 'ADMIN') {
                    const isSuperAdmin = user?.admin?.isSuperAdmin;
                    if (isSuperAdmin) return false;
                    return true; // Обычные админы показываются
                }
                
                // Сотрудники - только менеджеры из района клиента
                if (userRole === 'EMPLOYEE') {
                    const processingRole = user?.employee?.processingRole;
                    // Скрываем сборщиков, упаковщиков, контроллеров качества, курьеров
                    const hiddenRoles = ['PICKER', 'PACKER', 'QUALITY_CHECKER', 'COURIER'];
                    if (processingRole && hiddenRoles.includes(processingRole)) {
                        return false;
                    }
                    
                    // Показываем только если есть должность (например "Менеджер по продажам")
                    const position = user?.employee?.position;
                    if (!position) {
                        return false;
                    }
                    
                    // Проверяем, что сотрудник работает на складе в районе клиента
                    const employeeWarehouseDistrictId = user?.employee?.warehouse?.districtId;
                    if (employeeWarehouseDistrictId && clientDistrictId && employeeWarehouseDistrictId !== clientDistrictId) {
                        return false;
                    }
                    
                    return true;
                }
                
                // Поставщиков не показываем
                if (userRole === 'SUPPLIER') {
                    return false;
                }
                
                // Водители - только если их склад в районе клиента
                if (userRole === 'DRIVER') {
                    if (!clientDistrictId) return false;
                    const driverWarehouseDistrictId = user?.driver?.warehouse?.district?.id || 
                                                      user?.driver?.warehouse?.districtId;
                    if (driverWarehouseDistrictId === clientDistrictId) {
                        return true;
                    }
                    const driverDistricts = user?.driver?.districts || [];
                    return driverDistricts.some(d => d.id === clientDistrictId);
                }
                
                return false;
            });
            participantsCount = filteredParticipants.length;
            chatPartnerStatus = `📢 Канал • ${participantsCount} контакт${participantsCount === 1 ? '' : participantsCount < 5 ? 'а' : 'ов'}`;
        } else if (roomData?.type === 'BROADCAST') {
            chatPartnerStatus = `📢 Канал • ${participantsCount} подписчик${participantsCount === 1 ? '' : participantsCount < 5 ? 'а' : 'ов'}`;
        } else {
            chatPartnerStatus = `${participantsCount} участник${participantsCount === 1 ? '' : participantsCount < 5 ? 'а' : 'ов'}`;
        }
    }
    else if (roomData?.participants && Array.isArray(roomData.participants) && currentUserId) {
        // Нормализуем currentUserId для сравнения
        const normalizedCurrentUserId = Number(currentUserId);
        
        chatPartner = roomData.participants.find(p => {
            const participantId = p?.userId ?? p?.user?.id ?? p?.id;
            const normalizedParticipantId = Number(participantId);
            const isNotCurrentUser = normalizedParticipantId !== normalizedCurrentUserId;
            
            return isNotCurrentUser;
        });
        
        if (chatPartner) {
            const partnerId = chatPartner?.userId ?? chatPartner?.user?.id ?? chatPartner?.id;
            const cachedUser = participantsById[partnerId];

            if (cachedUser) {
                const displayName = getDisplayName(cachedUser);
                
                // Получаем все возможные варианты имени текущего пользователя для проверки
                const currentUserNames = currentUser ? getCurrentUserNames(currentUser) : [];
                const isCurrentUserName = currentUserNames.some(name => name === params.roomTitle);
                
                // Используем roomTitle только если он передан, не равен дефолтному значению И не равен имени текущего пользователя
                // Приоритет: roomTitle (если валидный) > getDisplayName
                const isDefaultTitle = params.roomTitle === 'Чат' || params.roomTitle === 'Водитель';
                const shouldUseRoomTitle = params.roomTitle && !isDefaultTitle && !isCurrentUserName;
                
                chatPartnerName = shouldUseRoomTitle ? params.roomTitle : displayName;
                
                chatPartnerAvatar = cachedUser.avatar || cachedUser.image || null;
                const userIsOnline = isUserOnline(cachedUser.lastSeenAt);
                chatPartnerStatus = formatLastSeen(cachedUser.lastSeenAt, userIsOnline);
            } else {
                const userData = chatPartner.user || chatPartner;
                
                const displayName = getDisplayName(userData);
                
                // Получаем все возможные варианты имени текущего пользователя для проверки
                const currentUserNames = currentUser ? getCurrentUserNames(currentUser) : [];
                const isCurrentUserName = currentUserNames.some(name => name === params.roomTitle);
                
                // Используем roomTitle только если он передан, не равен дефолтному значению И не равен имени текущего пользователя
                // Приоритет: roomTitle (если валидный) > getDisplayName
                const isDefaultTitle = params.roomTitle === 'Чат' || params.roomTitle === 'Водитель';
                const shouldUseRoomTitle = params.roomTitle && !isDefaultTitle && !isCurrentUserName;
                
                chatPartnerName = shouldUseRoomTitle ? params.roomTitle : displayName;
                
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

        // ProductDetail - особый случай, переходим напрямую в AppStack
        // ProductDetail находится в корневом AppStack (как и ChatRoom), поэтому навигируем напрямую
        if (productId && (fromScreen === 'ProductDetail' || !fromScreen)) {
            // Получаем корневой навигатор (AppStack)
            const rootNavigation = navigation.getParent() || navigation;
            rootNavigation.navigate('ProductDetail', {
                productId,
                fromScreen: 'ChatRoom'
            });
            return;
        }

        // Для всех остальных случаев - стандартная навигация назад
        if (navigation.canGoBack()) {
            navigation.goBack();
        }
    };

    const handleProfilePress = () => {
        if (roomData?.type === 'GROUP' || roomData?.type === 'BROADCAST') {
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

            if (supplierId) {
                try {
                    // Открываем экран поставщика в корневом AppStack (там же где ChatRoom),
                    // иначе назад может увести в ChatMain (таба), а не обратно в комнату.
                    const rootNavigation =
                        navigation?.getParent?.('AppStack') ||
                        navigation?.getParent?.() ||
                        navigation;

                    (rootNavigation || navigation).navigate('SupplierScreen', {
                        supplierId,
                        fromScreen: 'ChatRoom'
                    });
                } catch (error) {
                    console.error('Navigation error to SupplierScreen:', error);
                }
                return;
            }
        }

        if (partnerUserId) {
            // Открываем профиль в корневом AppStack (там же где ChatRoom),
            // иначе назад может увести в ChatMain (таба), а не обратно в комнату.
            const rootNavigation =
                navigation?.getParent?.('AppStack') ||
                navigation?.getParent?.() ||
                navigation;

            (rootNavigation || navigation).navigate('UserPublicProfile', {
                userId: partnerUserId,
                fromScreen: 'ChatRoom',
                roomId,
            });
        }
    };

    const getAvatarUri = () => {
        if (!chatPartnerAvatar || typeof chatPartnerAvatar !== 'string') return null;

        // Используем централизованную функцию с нормализацией URL
        return getImageUrl(chatPartnerAvatar);
    };

    const avatarUri = getAvatarUri();

    const handleDeleteChat = () => {
        setMenuVisible(false);

        showAlert({
            type: 'warning',
            title: 'Удалить чат',
            message: 'Вы уверены, что хотите удалить этот чат? Все сообщения будут удалены безвозвратно.',
            buttons: [
                {
                    text: 'Отмена',
                    style: 'cancel',
                },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    icon: 'delete',
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
                            showError('Ошибка', error.message || 'Не удалось удалить чат');
                        }
                    },
                },
            ]
        });
    };

    const handleDeleteGroup = () => {
        setMenuVisible(false);
        const isBroadcast = roomData?.type === 'BROADCAST';
        const entityName = isBroadcast ? 'канал' : 'группу';
        const entityNameCaps = isBroadcast ? 'Канал' : 'Группу';

        showAlert({
            type: 'warning',
            title: `Удалить ${entityName}`,
            message: isBroadcast 
                ? 'Вы уверены, что хотите удалить этот канал? Все сообщения и подписчики будут удалены безвозвратно.'
                : 'Вы уверены, что хотите удалить эту группу? Все сообщения и участники будут удалены безвозвратно.',
            buttons: [
                {
                    text: 'Отмена',
                    style: 'cancel',
                },
                {
                    text: `Удалить ${entityName}`,
                    style: 'destructive',
                    icon: 'delete-forever',
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
                            showError('Ошибка', error.message || `Не удалось удалить ${entityName}`);
                        }
                    },
                },
            ]
        });
    };

    const handleLeaveGroup = () => {
        setMenuVisible(false);
        const isBroadcast = roomData?.type === 'BROADCAST';
        const entityName = isBroadcast ? 'канал' : 'группу';

        showAlert({
            type: 'warning',
            title: `Покинуть ${entityName}`,
            message: isBroadcast 
                ? 'Вы уверены, что хотите покинуть этот канал? Ваши сообщения останутся в канале.'
                : 'Вы уверены, что хотите покинуть эту группу? Ваши сообщения останутся в группе.',
            buttons: [
                {
                    text: 'Отмена',
                    style: 'cancel',
                },
                {
                    text: 'Покинуть',
                    style: 'destructive',
                    icon: 'exit-to-app',
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
                            const errorMessage = error.message || `Не удалось покинуть ${entityName}`;

                            if (errorMessage.includes('владелец') || errorMessage.includes('Владелец')) {
                                showAlert({
                                    type: 'warning',
                                    title: `Нельзя покинуть ${entityName}`,
                                    message: isBroadcast
                                        ? 'Владелец канала не может покинуть канал, не назначив другого администратора. Сначала назначьте кого-то из участников администратором канала или удалите канал полностью.'
                                        : 'Владелец группы не может покинуть группу, не назначив другого администратора. Сначала назначьте кого-то из участников администратором группы или удалите группу полностью.',
                                    buttons: [
                                        {
                                            text: 'Понятно',
                                            style: 'primary'
                                        }
                                    ]
                                });
                            } else {
                                showError('Ошибка', errorMessage);
                            }
                        }
                    },
                },
            ]
        });
    };

    const handleLeaveGroupWithDeletion = () => {
        setMenuVisible(false);
        const isBroadcast = roomData?.type === 'BROADCAST';
        const entityName = isBroadcast ? 'канал' : 'группу';

        showAlert({
            type: 'error',
            title: `Покинуть ${entityName} с удалением`,
            message: isBroadcast
                ? 'Вы уверены, что хотите покинуть канал и удалить все свои сообщения? Это действие нельзя отменить.'
                : 'Вы уверены, что хотите покинуть группу и удалить все свои сообщения? Это действие нельзя отменить.',
            buttons: [
                {
                    text: 'Отмена',
                    style: 'cancel',
                },
                {
                    text: 'Покинуть и удалить',
                    style: 'destructive',
                    icon: 'delete-sweep',
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
                            const errorMessage = error.message || `Не удалось покинуть ${entityName}`;

                            // Специальная обработка для владельца группы/канала
                            if (errorMessage.includes('владелец') || errorMessage.includes('Владелец')) {
                                showAlert({
                                    type: 'warning',
                                    title: `Нельзя покинуть ${entityName}`,
                                    message: isBroadcast
                                        ? 'Владелец канала не может покинуть канал, не назначив другого администратора. Сначала назначьте кого-то из участников администратором канала или удалите канал полностью.'
                                        : 'Владелец группы не может покинуть группу, не назначив другого администратора. Сначала назначьте кого-то из участников администратором группы или удалите группу полностью.',
                                    buttons: [
                                        {
                                            text: 'Понятно',
                                            style: 'primary'
                                        }
                                    ]
                                });
                            } else {
                                showError('Ошибка', errorMessage);
                            }
                        }
                    },
                },
            ]
        });
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
                        {(roomData?.type === 'GROUP' || roomData?.type === 'BROADCAST') ? (
                            <>
                                {/* Удалить группу/канал - только для владельца */}
                                {isOwner && (
                                    <TouchableOpacity
                                        style={styles.modalItem}
                                        onPress={handleDeleteGroup}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.modalItemTextDestructive}>
                                            {roomData?.type === 'BROADCAST' ? 'Удалить канал' : 'Удалить группу'}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {/* Выход из группы/канала - для всех, но с ограничениями для владельца */}
                                <TouchableOpacity
                                    style={styles.modalItem}
                                    onPress={handleLeaveGroup}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.modalItemText}>
                                        {roomData?.type === 'BROADCAST' ? 'Покинуть канал' : 'Покинуть группу'}
                                    </Text>
                                </TouchableOpacity>

                                {/* Выход из группы/канала с удалением сообщений - только для не-владельцев */}
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

                {/* Кнопка меню - скрываем для клиентов в BROADCAST каналах */}
                {!(roomData?.type === 'BROADCAST' && currentUser?.role === 'CLIENT') && (
                    <TouchableOpacity
                        onPress={() => setMenuVisible(true)}
                        style={styles.menuButton}
                        activeOpacity={0.6}
                        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                    >
                        <MenuDotsIcon size={20} color={textColor}/>
                    </TouchableOpacity>
                )}
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    header: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 8,
        height: 64,
        width: '100%',
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