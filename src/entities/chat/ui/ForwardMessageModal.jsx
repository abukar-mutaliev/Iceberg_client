import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    Image,
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ChatApi from '@entities/chat/api/chatApi';
import { getBaseUrl } from '@shared/api/api';
import { selectRoomsList } from '@entities/chat/model/selectors';

export const ForwardMessageModal = ({ visible, onClose, onForward, message }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState(new Set()); // Изменено с selectedRooms на selectedItems
    const [isForwarding, setIsForwarding] = useState(false);
    const [searchedUsers, setSearchedUsers] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const rooms = useSelector(selectRoomsList);
    const currentUserId = useSelector((state) => state.auth?.user?.id);
    const currentUserRole = useSelector((state) => state.auth?.user?.role);
    const currentUser = useSelector((state) => state.auth?.user);
    const participantsById = useSelector((s) => s.chat?.participants?.byUserId || {});

    // Функция для преобразования пути в абсолютный URL
    const toAbsoluteUri = (raw) => {
        if (!raw || typeof raw !== 'string' || raw.trim() === '') return null;
        if (raw.startsWith('http')) return raw;
        let path = raw.replace(/^\\+/g, '').replace(/^\/+/, '');
        path = path.replace(/^uploads\/?/, '');
        return `${getBaseUrl()}/uploads/${path}`;
    };

    // Функция для получения аватара комнаты (аналогично ChatListScreen)
    const getRoomAvatar = (room) => {
        if (!room?.id) return null;

        // Для групп и каналов
        if (room.type === 'GROUP' || room.type === 'BROADCAST') {
            if (room.avatar) {
                return toAbsoluteUri(room.avatar);
            }
            return null;
        }

        // Для товарных чатов
        if (room?.product) {
            if (room.product.images && Array.isArray(room.product.images) && room.product.images.length > 0) {
                return toAbsoluteUri(room.product.images[0]);
            }
            if (room.product.image) {
                return toAbsoluteUri(room.product.image);
            }
        }

        // Для личных чатов (DIRECT) - берем аватар собеседника
        const participants = Array.isArray(room?.participants) ? room.participants : [];
        const other = currentUserId
            ? participants.find(p => {
                const participantId = p?.userId ?? p?.user?.id;
                return participantId !== currentUserId;
            }) || participants[0]
            : participants[0];

        if (!other) return null;

        const otherUserId = other?.userId ?? other?.user?.id ?? other?.id;

        // Получаем аватар из кэша участников или из объекта участника
        const cachedUser = participantsById[otherUserId];
        const avatarRaw = cachedUser?.avatar
            || other?.user?.avatar
            || other?.avatar
            || room?.avatar
            || null;

        return toAbsoluteUri(avatarRaw);
    };


    // Поиск пользователей при вводе
    useEffect(() => {
        const searchUsers = async () => {
            if (!searchQuery.trim() || searchQuery.length < 2) {
                setSearchedUsers([]);
                return;
            }

            setIsSearching(true);
            try {
                const response = await ChatApi.searchUsers(searchQuery, 20);
                
                // Пробуем разные варианты структуры ответа
                let users = [];
                if (response?.data?.data?.users) {
                    users = response.data.data.users;
                } else if (Array.isArray(response?.data?.data)) {
                    users = response.data.data;
                } else if (Array.isArray(response?.data)) {
                    users = response.data;
                } else if (response?.users) {
                    users = response.users;
                }

                // Убеждаемся, что users - это массив
                if (!Array.isArray(users)) {
                    console.warn('searchUsers response is not an array:', response);
                    users = [];
                }
                
                // Фильтруем себя из результатов
                const filteredUsers = users.filter(u => u?.id && u.id !== currentUserId);
                setSearchedUsers(filteredUsers);
            } catch (error) {
                console.error('Error searching users:', error);
                setSearchedUsers([]);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, currentUserId]);

    // Проверяем, является ли пользователь суперадмином
    const isSuperAdmin = useMemo(() => {
        return currentUser?.role === 'ADMIN' && 
               (currentUser?.admin?.isSuperAdmin || currentUser?.profile?.isSuperAdmin || currentUser?.isSuperAdmin);
    }, [currentUser]);

    // Функция для проверки, является ли пользователь админом комнаты
    const isRoomAdmin = useCallback((room) => {
        if (!room?.participants || !currentUserId) return false;
        const currentParticipant = room.participants.find(p =>
            (p?.userId ?? p?.user?.id) === currentUserId
        );
        return currentParticipant?.role === 'ADMIN' || currentParticipant?.role === 'OWNER';
    }, [currentUserId]);

    // Фильтрация комнат и группировка результатов
    const { filteredRooms, filteredChannels } = useMemo(() => {
        const query = searchQuery.toLowerCase();
        
        const allFilteredRooms = searchQuery.trim() 
            ? rooms.filter(room => {
                if (!room) return false;

                // Не показываем каналы в обычном списке комнат (они будут в отдельной секции)
                if (room.type === 'BROADCAST') return false;

                // Для закрытых групп: не показываем, если пользователь не админ
                if (room.type === 'GROUP' && room.isLocked === true) {
                    // Если группа закрыта, проверяем права
                    if (!isSuperAdmin && !isRoomAdmin(room)) {
                        return false; // Скрываем закрытую группу для не-админов
                    }
                }

                // Поиск по названию комнаты
                if (room.name?.toLowerCase().includes(query)) return true;

                // Поиск по участникам (для личных чатов)
                if (room.participants) {
                    return room.participants.some(p => {
                        const user = p.user;
                        if (!user) return false;

                        const name = user.client?.name ||
                            user.admin?.name ||
                            user.employee?.name ||
                            user.supplier?.contactPerson ||
                            user.email?.split('@')[0] ||
                            '';

                        return name.toLowerCase().includes(query);
                    });
                }

                return false;
            })
            : rooms.filter(room => {
                if (!room || room.type === 'BROADCAST') return false;
                
                // Для закрытых групп: не показываем, если пользователь не админ
                if (room.type === 'GROUP' && room.isLocked === true) {
                    // Если группа закрыта, проверяем права
                    if (!isSuperAdmin && !isRoomAdmin(room)) {
                        return false; // Скрываем закрытую группу для не-админов
                    }
                }
                
                return true;
            });

        // Каналы - показываем только те, где пользователь админ или суперадмин
        const channels = rooms.filter(room => {
            if (!room || room.type !== 'BROADCAST') return false;

            // Если суперадмин - показываем все каналы
            if (isSuperAdmin) return true;

            // Проверяем, является ли пользователь админом канала
            if (room.participants) {
                const currentParticipant = room.participants.find(p => 
                    (p?.userId ?? p?.user?.id) === currentUserId
                );
                return currentParticipant?.role === 'ADMIN' || currentParticipant?.role === 'OWNER';
            }

            return false;
        }).filter(room => {
            if (!searchQuery.trim()) return true;
            return room?.name?.toLowerCase().includes(query);
        });

        return {
            filteredRooms: allFilteredRooms,
            filteredChannels: channels,
        };
    }, [rooms, searchQuery, currentUserId, currentUserRole, isSuperAdmin, isRoomAdmin]);

    const toggleItemSelection = (item) => {
        // item может быть: { type: 'room', id: roomId } или { type: 'user', id: userId, data: userData }
        const itemKey = `${item.type}_${item.id}`;
        const newSelected = new Set(selectedItems);
        
        if (newSelected.has(itemKey)) {
            newSelected.delete(itemKey);
        } else {
            newSelected.add(itemKey);
        }
        setSelectedItems(newSelected);
    };

    const isItemSelected = (item) => {
        const itemKey = `${item.type}_${item.id}`;
        return selectedItems.has(itemKey);
    };

    const handleForward = async () => {
        if (selectedItems.size === 0 || !onForward) return;

        setIsForwarding(true);
        try {
            // Разделяем выбранные элементы на комнаты и пользователей
            const roomIds = [];
            const userIds = [];

            selectedItems.forEach(itemKey => {
                const [type, id] = itemKey.split('_');
                if (type === 'room') {
                    roomIds.push(parseInt(id, 10));
                } else if (type === 'user') {
                    userIds.push(parseInt(id, 10));
                }
            });

            // Для пользователей создаем или находим личные чаты
            for (const userId of userIds) {
                try {
                    // Проверяем, есть ли уже личный чат с этим пользователем
                    const existingRoom = rooms.find(room => {
                        if (room?.type !== 'DIRECT') return false;
                        
                        return room.participants?.some(p => 
                            (p?.userId ?? p?.user?.id) === userId
                        );
                    });

                    if (existingRoom) {
                        const roomId = existingRoom.id;
                        if (!roomIds.includes(roomId)) {
                            roomIds.push(roomId);
                        }
                    } else {
                        // Создаем новый личный чат
                        const formData = new FormData();
                        formData.append('type', 'DIRECT');
                        formData.append('members', JSON.stringify([userId]));
                        
                        const response = await ChatApi.createRoom(formData);
                        const newRoom = response?.data?.data?.room || response?.data?.room;
                        if (newRoom?.id) {
                            roomIds.push(newRoom.id);
                        }
                    }
                } catch (error) {
                    console.error('Error creating direct chat:', error);
                }
            }

            // Пересылаем сообщение во все комнаты
            if (roomIds.length > 0) {
                await onForward(roomIds);
            }

            setSelectedItems(new Set());
            setSearchQuery('');
            setSearchedUsers([]);
            onClose();
        } catch (error) {
            console.error('Error forwarding message:', error);
        } finally {
            setIsForwarding(false);
        }
    };

    const getRoomName = (room) => {
        if (!room) return 'Неизвестный чат';

        // Для групп и каналов используется title
        if (room.title) return room.title;
        if (room.name) return room.name;

        // Для личных чатов - имя собеседника
        if (room.type === 'DIRECT' && room.participants) {
            const partner = room.participants.find(p => (p?.userId ?? p?.user?.id) !== currentUserId);
            if (partner?.user) {
                return partner.user.client?.name ||
                    partner.user.admin?.name ||
                    partner.user.employee?.name ||
                    partner.user.supplier?.contactPerson ||
                    partner.user.email?.split('@')[0] ||
                    'Собеседник';
            }
        }

        return 'Чат';
    };

    const getRoomIcon = (room) => {
        if (room?.type === 'GROUP') return 'account-group';
        if (room?.type === 'BROADCAST') return 'bullhorn';
        return 'account';
    };

    const renderAvatar = (avatarUrl, fallbackIcon, size = 40) => {
        if (avatarUrl) {
            return (
                <Image
                    source={{ uri: avatarUrl }}
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: '#E8E8E8',
                    }}
                />
            );
        }
        
        return (
            <View style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: '#E8E8E8',
                justifyContent: 'center',
                alignItems: 'center',
            }}>
                <Icon name={fallbackIcon} size={size * 0.6} color="#666" />
            </View>
        );
    };

    const renderRoomItem = ({ item: room }) => {
        const roomId = room?.id;
        if (!roomId) return null;
        
        const itemData = { type: 'room', id: roomId };
        const isSelected = isItemSelected(itemData);
        const avatarUri = getRoomAvatar(room);

        return (
            <TouchableOpacity
                style={[styles.roomItem, isSelected && styles.roomItemSelected]}
                onPress={() => toggleItemSelection(itemData)}
            >
                {renderAvatar(avatarUri, getRoomIcon(room))}
                <View style={styles.roomInfo}>
                    <Text style={[styles.roomName, isSelected && styles.roomNameSelected]}>
                        {getRoomName(room)}
                    </Text>
                </View>
                {isSelected && (
                    <Icon name="check-circle" size={24} color="#007AFF" />
                )}
            </TouchableOpacity>
        );
    };

    const renderUserItem = ({ item }) => {
        const itemData = { type: 'user', id: item.id };
        const isSelected = isItemSelected(itemData);

        const userName = item.client?.name ||
            item.admin?.name ||
            item.employee?.name ||
            item.supplier?.contactPerson ||
            item.email?.split('@')[0] ||
            'Пользователь';

        const userRole = item.role === 'ADMIN' ? 'Администратор' :
            item.role === 'DRIVER' ? 'Водитель' :
            item.role === 'CLIENT' ? 'Клиент' :
            item.role === 'SUPPLIER' ? 'Поставщик' : '';

        // Получаем аватар пользователя (аналогично ChatListScreen)
        const cachedUser = participantsById[item.id];
        const avatarRaw = cachedUser?.avatar
            || item.avatar
            || item.profile?.avatar
            || null;
        
        const avatarUri = avatarRaw ? toAbsoluteUri(avatarRaw) : null;

        return (
            <TouchableOpacity
                style={[styles.roomItem, isSelected && styles.roomItemSelected]}
                onPress={() => toggleItemSelection(itemData)}
            >
                {renderAvatar(avatarUri, 'account')}
                <View style={styles.roomInfo}>
                    <Text style={[styles.roomName, isSelected && styles.roomNameSelected]}>
                        {userName}
                    </Text>
                    {userRole && (
                        <Text style={styles.userRole}>{userRole}</Text>
                    )}
                </View>
                {isSelected && (
                    <Icon name="check-circle" size={24} color="#007AFF" />
                )}
            </TouchableOpacity>
        );
    };

    const getMessagePreview = () => {
        if (!message) return '';

        switch (message.type) {
            case 'TEXT':
                return message.content?.substring(0, 50) || 'Текстовое сообщение';
            case 'IMAGE':
                return '📷 Изображение';
            case 'VOICE':
                return '🎤 Голосовое сообщение';
            case 'PRODUCT':
                return '🛍️ Товар';
            case 'STOP':
                return '📍 Остановка';
            case 'POLL':
                return '📊 Опрос';
            default:
                return 'Сообщение';
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Заголовок */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Icon name="close" size={24} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Переслать сообщение</Text>
                        <View style={styles.placeholder} />
                    </View>

                    {/* Превью сообщения */}
                    {message && (
                        <View style={styles.messagePreview}>
                            <Icon name="share" size={20} color="#666" />
                            <Text style={styles.messagePreviewText} numberOfLines={2}>
                                {getMessagePreview()}
                            </Text>
                        </View>
                    )}

                    {/* Поиск */}
                    <View style={styles.searchContainer}>
                        <Icon name="magnify" size={20} color="#999" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Поиск чатов..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#999"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Icon name="close-circle" size={20} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Список результатов */}
                    <FlatList
                        data={(() => {
                            const data = [
                                ...(searchedUsers.length > 0 ? [{ type: 'section', title: 'Пользователи' }] : []),
                                ...searchedUsers.map(user => ({ type: 'user', data: user })),
                                ...(filteredChannels.length > 0 ? [{ type: 'section', title: 'Каналы' }] : []),
                                ...filteredChannels.map(room => ({ type: 'channel', data: room })),
                                ...(filteredRooms.length > 0 ? [{ type: 'section', title: 'Чаты и группы' }] : []),
                                ...filteredRooms.map(room => ({ type: 'room', data: room })),
                            ];
                            
                            return data;
                        })()}
                        renderItem={({ item }) => {
                            if (item.type === 'section') {
                                return (
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionTitle}>{item.title}</Text>
                                    </View>
                                );
                            } else if (item.type === 'user') {
                                return renderUserItem({ item: item.data });
                            } else {
                                return renderRoomItem({ item: item.data });
                            }
                        }}
                        keyExtractor={(item, index) => {
                            if (item.type === 'section') return `section_${item.title}_${index}`;
                            if (item.type === 'user') return `user_${item.data.id}`;
                            return `room_${item.data?.id}`;
                        }}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            isSearching ? (
                                <View style={styles.emptyContainer}>
                                    <ActivityIndicator size="large" color="#007AFF" />
                                    <Text style={styles.emptyText}>Поиск...</Text>
                                </View>
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Icon name="chat-outline" size={48} color="#CCC" />
                                    <Text style={styles.emptyText}>
                                        {searchQuery ? 'Ничего не найдено' : 'Нет доступных чатов'}
                                    </Text>
                                </View>
                            )
                        }
                    />

                    {/* Кнопка отправки */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[
                                styles.forwardButton,
                                (selectedItems.size === 0 || isForwarding) && styles.forwardButtonDisabled
                            ]}
                            onPress={handleForward}
                            disabled={selectedItems.size === 0 || isForwarding}
                        >
                            {isForwarding ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Icon name="send" size={20} color="#FFF" />
                                    <Text style={styles.forwardButtonText}>
                                        Переслать {selectedItems.size > 0 ? `(${selectedItems.size})` : ''}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
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
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        minHeight: '50%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    closeButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    placeholder: {
        width: 32,
    },
    messagePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F5F5F5',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    messagePreviewText: {
        flex: 1,
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        backgroundColor: '#F9F9F9',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        marginLeft: 8,
        color: '#000',
    },
    listContent: {
        paddingVertical: 8,
    },
    roomItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
    },
    roomItemSelected: {
        backgroundColor: '#F0F8FF',
    },
    roomIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    roomInfo: {
        flex: 1,
        marginLeft: 12,
    },
    roomName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
    },
    roomNameSelected: {
        color: '#007AFF',
        fontWeight: '600',
    },
    userRole: {
        fontSize: 13,
        color: '#999',
        marginTop: 2,
    },
    sectionHeader: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        textTransform: 'uppercase',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 12,
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    forwardButton: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    forwardButtonDisabled: {
        backgroundColor: '#CCC',
    },
    forwardButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});

