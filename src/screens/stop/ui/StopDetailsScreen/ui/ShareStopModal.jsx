import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    Image,
    ActivityIndicator,
    TextInput,
    Keyboard,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { fetchRooms, sendStop, createRoom } from '@entities/chat/model/slice';
import { selectRoomsList } from '@entities/chat/model/selectors';
import { getBaseUrl } from '@shared/api/api';
import { useToast } from '@shared/ui/Toast';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';
import ChatApi from '@entities/chat/api/chatApi';

export const ShareStopModal = ({ visible, onClose, stopId, stop }) => {
    const dispatch = useDispatch();
    const rooms = useSelector(selectRoomsList) || [];
    const currentUserId = useSelector((s) => s.auth?.user?.id);
    const currentUserRole = useSelector((s) => s.auth?.user?.role);
    const { showSuccess } = useToast();
    const { showAlert, showError: showErrorAlert } = useCustomAlert();
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (visible) {
            dispatch(fetchRooms({ page: 1, limit: 100 }));
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [visible, dispatch]);

    // Поиск пользователей
    useEffect(() => {
        const searchUsers = async () => {
            if (!searchQuery || searchQuery.trim().length < 2) {
                setSearchResults([]);
                setSearching(false);
                return;
            }

            setSearching(true);
            try {
                const response = await ChatApi.searchUsers(searchQuery, 50);
                const users = response?.data?.users || response?.data?.data?.users || [];
                
                // Фильтруем текущего пользователя
                const filteredUsers = users.filter(u => u.id !== currentUserId);
                setSearchResults(filteredUsers);
            } catch (error) {
                console.error('Error searching users:', error);
                setSearchResults([]);
                
                // Показываем ошибку через CustomAlert, если это не просто сетевая ошибка
                if (error?.response?.status && error.response.status !== 500) {
                    showErrorAlert(
                        'Ошибка поиска',
                        error?.response?.data?.message || 'Не удалось выполнить поиск пользователей',
                        [
                            {
                                text: 'OK',
                                style: 'primary'
                            }
                        ]
                    );
                }
            } finally {
                setSearching(false);
            }
        };

        const timer = setTimeout(searchUsers, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, currentUserId, showErrorAlert]);

    const getChatTitle = useCallback((room) => {
        if ((room?.type === 'GROUP' || room?.type === 'BROADCAST') && room?.title) {
            return room.title;
        }

        if (room?.type === 'DIRECT' && room?.participants && Array.isArray(room.participants) && currentUserId) {
            const partner = room.participants.find(p => {
                const participantId = p?.userId ?? p?.user?.id;
                return participantId !== currentUserId;
            });

            if (partner) {
                const partnerUser = partner.user || partner;

                if (partnerUser?.role === 'SUPPLIER') {
                    const companyName =
                        partnerUser.supplier?.companyName ||
                        partnerUser.companyName ||
                        partnerUser.profile?.companyName;
                    if (companyName) return companyName;
                }

                const name = partnerUser.name || partnerUser.profile?.name || partnerUser.firstName;
                if (name) return name;

                if (partnerUser.email) {
                    const emailName = partnerUser.email.split('@')[0];
                    return emailName.charAt(0).toUpperCase() + emailName.slice(1);
                }

                return `Пользователь #${partnerUser.id || partner.id}`;
            }
        }

        if (room?.type === 'GROUP' || room?.type === 'BROADCAST') {
            return room.title || (room?.type === 'BROADCAST' ? 'Канал' : 'Группа');
        }

        return room?.id ? `Комната ${room.id}` : 'Чат';
    }, [currentUserId]);

    // Получение аватара чата
    const getChatAvatar = useCallback((room) => {
        // Для групп и каналов
        if (room?.type === 'GROUP' || room?.type === 'BROADCAST') {
            if (room?.avatar) {
                const avatar = room.avatar;
                if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
                    return avatar;
                }
                return `${getBaseUrl()}${avatar}`;
            }
            return null;
        }

        // Для личных чатов - аватар собеседника
        if (room?.type === 'DIRECT' && room?.participants && Array.isArray(room.participants) && currentUserId) {
            const partner = room.participants.find(p => {
                const participantId = p?.userId ?? p?.user?.id;
                return participantId !== currentUserId;
            });

            if (partner) {
                const partnerUser = partner.user || partner;
                const avatar = partnerUser?.avatar || 
                              partnerUser?.profile?.avatar || 
                              partnerUser?.image;
                
                if (avatar) {
                    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
                        return avatar;
                    }
                    return `${getBaseUrl()}${avatar}`;
                }
            }
        }

        return null;
    }, [currentUserId]);

    // Получение имени пользователя
    const getUserDisplayName = useCallback((user) => {
        if (user?.role === 'SUPPLIER') {
            return user.supplier?.companyName || user.companyName || user.name || user.email;
        }
        return user.name || user.profile?.name || user.email;
    }, []);

    // Получение аватара пользователя
    const getUserAvatar = useCallback((user) => {
        const avatar = user?.avatar || user?.profile?.avatar || user?.image;
        if (avatar) {
            if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
                return avatar;
            }
            return `${getBaseUrl()}${avatar}`;
        }
        return null;
    }, []);

    // Фильтрация комнат: исключаем каналы и закрытые группы (если пользователь не админ)
    const filteredRooms = useMemo(() => {
        if (!rooms || !Array.isArray(rooms)) {
            return [];
        }
        
        return rooms.filter(room => {
            if (!room || !room.id) {
                return false;
            }
            
            // Для каналов (BROADCAST): показываем только админам, водителям и сотрудникам
            if (room?.type === 'BROADCAST') {
                const allowedRoles = ['ADMIN', 'DRIVER', 'EMPLOYEE'];
                if (currentUserRole && allowedRoles.includes(currentUserRole)) {
                    return true;
                }
                return false;
            }
            
            // Проверяем, является ли группа закрытой (isLocked может быть true, 1, или строкой "true")
            const isLocked = room?.isLocked === true || room?.isLocked === 1 || room?.isLocked === 'true' || String(room?.isLocked).toLowerCase() === 'true';
            
            if (isLocked) {
                // Админы и системные админы могут видеть все закрытые группы
                if (currentUserRole === 'ADMIN' || currentUserRole === 'SYSADMIN') {
                    if (__DEV__) {
                        console.log('ShareStopModal: Showing locked room for admin', {
                            roomId: room.id,
                            roomTitle: room.title,
                            currentUserRole
                        });
                    }
                    return true;
                }
                
                // Проверяем, является ли пользователь администратором группы
                if (room?.participants && Array.isArray(room.participants) && room.participants.length > 0) {
                    const currentParticipant = room.participants.find(p => {
                        const participantId = p?.userId ?? p?.user?.id;
                        return participantId === currentUserId;
                    });
                    
                    // Логирование для отладки
                    if (__DEV__) {
                        console.log('ShareStopModal: Checking locked room', {
                            roomId: room.id,
                            roomTitle: room.title,
                            isLocked,
                            currentUserId,
                            currentUserRole,
                            hasParticipant: !!currentParticipant,
                            participantRole: currentParticipant?.role,
                            participants: room.participants.map(p => ({
                                id: p?.userId ?? p?.user?.id,
                                role: p?.role
                            }))
                        });
                    }
                    
                    // Показываем только если пользователь является админом или владельцем группы
                    if (currentParticipant?.role === 'ADMIN' || currentParticipant?.role === 'OWNER') {
                        if (__DEV__) {
                            console.log('ShareStopModal: Showing locked room for admin/owner', {
                                roomId: room.id,
                                roomTitle: room.title,
                                participantRole: currentParticipant?.role
                            });
                        }
                        return true;
                    }
                }
                
                // В остальных случаях скрываем закрытую группу
                if (__DEV__) {
                    console.log('ShareStopModal: Hiding locked room', {
                        roomId: room.id,
                        roomTitle: room.title,
                        hasParticipants: !!(room?.participants && Array.isArray(room.participants)),
                        participantsCount: room?.participants?.length || 0
                    });
                }
                return false;
            }
            
            return true;
        });
    }, [rooms, currentUserId, currentUserRole]);

    // Проверка, может ли пользователь отправлять сообщения в комнату
    const canSendToRoom = useCallback((room) => {
        // Личные чаты всегда доступны
        if (room?.type === 'DIRECT') {
            return true;
        }

        // Для каналов (BROADCAST): разрешаем админам, водителям и сотрудникам отправлять остановки
        if (room?.type === 'BROADCAST') {
            const allowedRoles = ['ADMIN', 'DRIVER', 'EMPLOYEE'];
            if (currentUserRole && allowedRoles.includes(currentUserRole)) {
                return true;
            }
            // Также проверяем, является ли пользователь администратором комнаты
            if (room?.participants && Array.isArray(room.participants)) {
                const currentParticipant = room.participants.find(p => {
                    const participantId = p?.userId ?? p?.user?.id;
                    return participantId === currentUserId;
                });
                if (currentParticipant?.role === 'ADMIN' || currentParticipant?.role === 'OWNER') {
                    return true;
                }
            }
            return false;
        }

        // Если комната не заблокирована, доступна всем
        if (!room?.isLocked) {
            return true;
        }

        // Если комната заблокирована, проверяем права
        // Админы и системные админы могут отправлять везде
        if (currentUserRole === 'ADMIN' || currentUserRole === 'SYSADMIN') {
            return true;
        }

        // Проверяем, является ли пользователь администратором комнаты
        if (room?.participants && Array.isArray(room.participants)) {
            const currentParticipant = room.participants.find(p => {
                const participantId = p?.userId ?? p?.user?.id;
                return participantId === currentUserId;
            });
            
            // Проверяем роль участника (ADMIN или OWNER)
            if (currentParticipant?.role === 'ADMIN' || currentParticipant?.role === 'OWNER') {
                return true;
            }
        }

        // В остальных случаях - нельзя отправлять
        return false;
    }, [currentUserId, currentUserRole]);

    const handleShareToRoom = useCallback(async (roomId) => {
        if (sending) return;

        try {
            setSending(true);
            await dispatch(sendStop({ roomId, stopId })).unwrap();
            showSuccess('Остановка отправлена в чат', {
                duration: 2000,
                position: 'top'
            });
            onClose();
        } catch (error) {
            console.error('Error sharing stop:', error);
            
            // Обрабатываем ошибку через Toast (не показываем алерт для закрытых групп)
            const errorMessage = typeof error === 'string' ? error : 
                                error?.message || 
                                'Не удалось отправить остановку';
            
            // Только для неожиданных ошибок показываем алерт
            if (!errorMessage.includes('закрыта') && !errorMessage.includes('Только администраторы')) {
                showErrorAlert(
                    'Ошибка отправки',
                    errorMessage,
                    [
                        {
                            text: 'OK',
                            style: 'primary',
                            onPress: () => {
                                onClose();
                            }
                        }
                    ]
                );
            } else {
                // Закрываем модальное окно даже если не показываем алерт
                onClose();
            }
        } finally {
            setSending(false);
        }
    }, [dispatch, stopId, onClose, sending, showSuccess, showErrorAlert]);

    // Обработка выбора пользователя из поиска
    const handleUserPress = useCallback(async (user) => {
        if (sending) return;

        try {
            setSending(true);
            Keyboard.dismiss();

            // Создаем FormData для создания прямого чата
            const formData = new FormData();
            formData.append('type', 'DIRECT');
            formData.append('title', user.name || user.email);
            formData.append('members', JSON.stringify([user.id]));

            const result = await dispatch(createRoom(formData)).unwrap();
            const room = result;

            if (room && room.id) {
                // Отправляем остановку в созданный чат
                await dispatch(sendStop({ roomId: room.id, stopId })).unwrap();
                showSuccess('Остановка отправлена пользователю', {
                    duration: 2000,
                    position: 'top'
                });
                onClose();
            }
        } catch (error) {
            console.error('Error creating chat and sharing stop:', error);
            
            const errorMessage = typeof error === 'string' ? error : 
                                error?.message || 
                                'Не удалось создать чат или отправить остановку';
            
            showErrorAlert(
                'Ошибка',
                errorMessage,
                [
                    {
                        text: 'OK',
                        style: 'primary',
                        onPress: () => {
                            onClose();
                        }
                    }
                ]
            );
        } finally {
            setSending(false);
        }
    }, [dispatch, stopId, onClose, sending, showSuccess, showErrorAlert]);

    const renderRoom = useCallback(({ item }) => {
        const title = getChatTitle(item);
        const avatar = getChatAvatar(item);
        const isAccessible = canSendToRoom(item);
        const isLocked = item?.isLocked && !isAccessible;

        return (
            <TouchableOpacity
                style={[
                    styles.roomItem,
                    !isAccessible && styles.roomItemDisabled
                ]}
                onPress={() => handleShareToRoom(item.id)}
                disabled={sending || !isAccessible}
                activeOpacity={isAccessible ? 0.7 : 1}
            >
                <View style={styles.avatarContainer}>
                    {avatar ? (
                        <Image 
                            source={{ uri: avatar }} 
                            style={[
                                styles.avatar,
                                !isAccessible && styles.avatarDisabled
                            ]}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[
                            styles.avatar, 
                            styles.placeholderAvatar,
                            !isAccessible && styles.avatarDisabled
                        ]}>
                            {item.type === 'BROADCAST' ? (
                                <Icon name="campaign" size={20} color={isAccessible ? "#8696A0" : "#D0D0D0"} />
                            ) : item.type === 'GROUP' ? (
                                <Icon name="group" size={20} color={isAccessible ? "#8696A0" : "#D0D0D0"} />
                            ) : (
                                <Icon name="person" size={20} color={isAccessible ? "#8696A0" : "#D0D0D0"} />
                            )}
                        </View>
                    )}
                </View>
                <View style={styles.roomInfo}>
                    <View style={styles.roomTitleContainer}>
                        <Text style={[
                            styles.roomTitle,
                            !isAccessible && styles.textDisabled
                        ]} numberOfLines={1}>
                            {title}
                        </Text>
                        {isLocked && (
                            <Icon name="lock" size={16} color="#D0D0D0" style={styles.lockIcon} />
                        )}
                    </View>
                    <Text style={[
                        styles.roomType,
                        !isAccessible && styles.textDisabled
                    ]} numberOfLines={1}>
                        {item.type === 'BROADCAST' ? 'Канал' : item.type === 'GROUP' ? 'Группа' : 'Личный чат'}
                        {isLocked && ' • Закрыта'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    }, [getChatTitle, getChatAvatar, handleShareToRoom, sending, canSendToRoom]);

    const renderUser = useCallback(({ item }) => {
        const name = getUserDisplayName(item);
        const avatar = getUserAvatar(item);

        return (
            <TouchableOpacity
                style={styles.roomItem}
                onPress={() => handleUserPress(item)}
                disabled={sending}
            >
                <View style={styles.avatarContainer}>
                    {avatar ? (
                        <Image 
                            source={{ uri: avatar }} 
                            style={styles.avatar}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.avatar, styles.placeholderAvatar]}>
                            <Icon name="person" size={20} color="#8696A0" />
                        </View>
                    )}
                </View>
                <View style={styles.roomInfo}>
                    <Text style={styles.roomTitle} numberOfLines={1}>{name}</Text>
                    <Text style={styles.roomType} numberOfLines={1}>
                        {item.role === 'SUPPLIER' ? 'Поставщик' : 
                         item.role === 'DRIVER' ? 'Водитель' :
                         item.role === 'EMPLOYEE' ? 'Сотрудник' : 'Пользователь'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    }, [getUserDisplayName, getUserAvatar, handleUserPress, sending]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Поделиться остановкой</Text>
                        <TouchableOpacity onPress={onClose} disabled={sending}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {stop && (
                        <View style={styles.stopPreview}>
                            <Text style={styles.stopAddress} numberOfLines={1}>
                                📍 {stop.address || 'Адрес не указан'}
                            </Text>
                            {stop.district && (
                                <Text style={styles.stopDistrict} numberOfLines={1}>
                                    {stop.district.name}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Поле поиска */}
                    <View style={styles.searchContainer}>
                        <Icon name="search" size={20} color="#8696A0" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Поиск пользователей..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            editable={!sending}
                            placeholderTextColor="#8696A0"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity 
                                onPress={() => setSearchQuery('')}
                                style={styles.clearButton}
                            >
                                <Icon name="close" size={20} color="#8696A0" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {sending ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Color.purpleSoft} />
                            <Text style={styles.loadingText}>Отправка...</Text>
                        </View>
                    ) : searching ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Color.purpleSoft} />
                            <Text style={styles.loadingText}>Поиск...</Text>
                        </View>
                    ) : searchQuery.length >= 2 ? (
                        <FlatList
                            data={searchResults}
                            renderItem={renderUser}
                            keyExtractor={(item) => String(item?.id ?? 'unknown')}
                            contentContainerStyle={styles.roomsList}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>Пользователи не найдены</Text>
                                </View>
                            }
                        />
                    ) : (
                        <FlatList
                            data={filteredRooms}
                            renderItem={renderRoom}
                            keyExtractor={(item) => String(item?.id ?? item?.roomId ?? 'unknown')}
                            contentContainerStyle={styles.roomsList}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>Нет доступных чатов</Text>
                                    <Text style={styles.emptyHint}>Начните вводить имя для поиска пользователей</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Color.colorLightMode,
        borderTopLeftRadius: Border.br_xl,
        borderTopRightRadius: Border.br_xl,
        maxHeight: '80%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    modalTitle: {
        fontSize: FontSize.size_lg,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.dark,
    },
    closeButton: {
        fontSize: 24,
        color: Color.colorSilver_100,
        fontWeight: '300',
    },
    stopPreview: {
        padding: 16,
        backgroundColor: '#F9F9F9',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    stopAddress: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.purpleSoft,
        marginBottom: 4,
    },
    stopDistrict: {
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        color: Color.colorCornflowerblue,
    },
    roomsList: {
        padding: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F9F9F9',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.dark,
        padding: 8,
    },
    clearButton: {
        padding: 4,
    },
    roomItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    roomItemDisabled: {
        opacity: 0.5,
        backgroundColor: '#FAFAFA',
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarDisabled: {
        opacity: 0.5,
    },
    placeholderAvatar: {
        backgroundColor: '#E8E8E8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    roomInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    roomTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    roomTitle: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.dark,
        flex: 1,
    },
    lockIcon: {
        marginLeft: 4,
    },
    roomType: {
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        color: Color.colorSilver_100,
    },
    textDisabled: {
        color: '#B0B0B0',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.colorSilver_100,
        textAlign: 'center',
    },
    emptyHint: {
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        color: Color.colorSilver_100,
        marginTop: 8,
        textAlign: 'center',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        color: Color.colorCornflowerblue,
    },
});

