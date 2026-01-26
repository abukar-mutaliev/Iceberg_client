import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    Platform,
    KeyboardAvoidingView,
    Dimensions,
    PanResponder,
    Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Color, FontFamily, FontSize, Border } from '@app/styles/GlobalStyles';
import { fetchRooms, sendWarehouse, createRoom } from '@entities/chat/model/slice';
import { selectRoomsList } from '@entities/chat/model/selectors';
import { getImageUrl } from '@shared/api/api';
import { useToast } from '@shared/ui/Toast';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';
import ChatApi from '@entities/chat/api/chatApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ShareWarehouseModal = ({ visible, onClose, warehouseId, warehouse }) => {
    const dispatch = useDispatch();
    const rooms = useSelector(selectRoomsList) || [];
    const currentUserId = useSelector((s) => s.auth?.user?.id);
    const currentUserRole = useSelector((s) => s.auth?.user?.role);
    const { showSuccess } = useToast();
    const { showAlert, showError: showErrorAlert } = useCustomAlert();
    const insets = useSafeAreaInsets();
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const translateY = useRef(new Animated.Value(0)).current;
    const currentTranslateY = useRef(0);
    const screenHeight = Dimensions.get('window').height;
    const collapsedHeight = Math.round(screenHeight * 0.5);
    const expandedHeight = Math.round(Math.min(screenHeight - insets.top, screenHeight * 0.92));
    const collapsedTranslateY = Math.max(0, expandedHeight - collapsedHeight);
    const closeTranslateY = screenHeight;

    const animateTo = useCallback((toValue, onEnd) => {
        Animated.timing(translateY, {
            toValue,
            duration: 220,
            useNativeDriver: true
        }).start(() => {
            currentTranslateY.current = toValue;
            if (onEnd) onEnd();
        });
    }, [translateY]);

    useEffect(() => {
        if (visible) {
            translateY.setValue(closeTranslateY);
            currentTranslateY.current = closeTranslateY;
            animateTo(collapsedTranslateY);
            dispatch(fetchRooms({ page: 1, limit: 100 }));
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [visible, dispatch, animateTo, collapsedTranslateY, closeTranslateY, translateY]);

    // Отслеживание состояния клавиатуры
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (event) => {
                setIsKeyboardVisible(true);
                setKeyboardHeight(event?.endCoordinates?.height || 0);
                animateTo(0);
            }
        );
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setIsKeyboardVisible(false);
                setKeyboardHeight(0);
                animateTo(collapsedTranslateY);
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, [animateTo, collapsedTranslateY]);

    const modalHeightRef = useRef(expandedHeight);

    useEffect(() => {
        modalHeightRef.current = modalHeight;
    }, [modalHeight]);

    const isDragArea = useCallback((y0) => {
        const modalTop = screenHeight - modalHeightRef.current + currentTranslateY.current;
        return y0 <= modalTop + 140;
    }, [screenHeight]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (_, gestureState) => {
                if (isKeyboardVisible) return false;
                return isDragArea(gestureState.y0);
            },
            onMoveShouldSetPanResponder: (_, gestureState) => {
                if (isKeyboardVisible) return false;
                return isDragArea(gestureState.y0) &&
                    Math.abs(gestureState.dy) > 6 &&
                    Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
            },
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                if (isKeyboardVisible) return false;
                return isDragArea(gestureState.y0) &&
                    Math.abs(gestureState.dy) > 6 &&
                    Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
            },
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: () => {
                translateY.stopAnimation((value) => {
                    currentTranslateY.current = value;
                });
            },
            onPanResponderMove: (_, gestureState) => {
                const nextTranslateY = Math.min(
                    Math.max(currentTranslateY.current + gestureState.dy, 0),
                    closeTranslateY
                );
                translateY.setValue(nextTranslateY);
            },
            onPanResponderRelease: (_, gestureState) => {
                const nextValue = currentTranslateY.current + gestureState.dy;
                const shouldClose = nextValue > collapsedTranslateY + 60 || gestureState.vy > 1.2;
                const shouldExpand = nextValue < collapsedTranslateY / 2 || gestureState.vy < -0.8;

                if (shouldClose) {
                    animateTo(closeTranslateY, onClose);
                    return;
                }

                if (shouldExpand) {
                    animateTo(0);
                    return;
                }

                const snapTo = nextValue > collapsedTranslateY / 2 ? collapsedTranslateY : 0;
                animateTo(snapTo);
            }
        })
    ).current;

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
                return getImageUrl(avatar);
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
                    return getImageUrl(avatar);
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
            return getImageUrl(avatar);
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
                    return true;
                }
                
                // Проверяем, является ли пользователь администратором группы
                if (room?.participants && Array.isArray(room.participants) && room.participants.length > 0) {
                    const currentParticipant = room.participants.find(p => {
                        const participantId = p?.userId ?? p?.user?.id;
                        return participantId === currentUserId;
                    });
                    
                    // Показываем только если пользователь является админом или владельцем группы
                    if (currentParticipant?.role === 'ADMIN' || currentParticipant?.role === 'OWNER') {
                        return true;
                    }
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

        // Для каналов (BROADCAST): разрешаем админам, водителям и сотрудникам отправлять склады
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
            await dispatch(sendWarehouse({ roomId, warehouseId })).unwrap();
            showSuccess('Склад отправлен в чат', {
                duration: 2000,
                position: 'top'
            });
            onClose();
        } catch (error) {
            console.error('Error sharing warehouse:', error);
            
            // Обрабатываем ошибку через Toast (не показываем алерт для закрытых групп)
            const errorMessage = typeof error === 'string' ? error : 
                                error?.message || 
                                'Не удалось отправить склад';
            
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
    }, [dispatch, warehouseId, onClose, sending, showSuccess, showErrorAlert]);

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
                // Отправляем склад в созданный чат
                await dispatch(sendWarehouse({ roomId: room.id, warehouseId })).unwrap();
                showSuccess('Склад отправлен пользователю', {
                    duration: 2000,
                    position: 'top'
                });
                onClose();
            }
        } catch (error) {
            console.error('Error creating chat and sharing warehouse:', error);
            
            const errorMessage = typeof error === 'string' ? error : 
                                error?.message || 
                                'Не удалось создать чат или отправить склад';
            
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
    }, [dispatch, warehouseId, onClose, sending, showSuccess, showErrorAlert]);

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

    const availableHeight = Math.max(
        0,
        screenHeight - keyboardHeight - insets.top
    );
    const modalHeight = isKeyboardVisible
        ? Math.min(expandedHeight, availableHeight)
        : expandedHeight;

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={[
                    styles.modalOverlay,
                    isKeyboardVisible && styles.modalOverlayFullScreen
                ]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <TouchableOpacity
                    style={styles.backdropTouchable}
                    activeOpacity={1}
                    onPress={onClose}
                    disabled={sending}
                />
                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            height: modalHeight,
                            transform: [{ translateY }]
                        }
                    ]}
                    {...panResponder.panHandlers}
                >
                    <View style={styles.dragHandleContainer}>
                        <View style={styles.dragHandle} />
                    </View>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Поделиться складом</Text>
                        <TouchableOpacity onPress={onClose} disabled={sending}>
                            <Text style={styles.closeButton}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {warehouse && (
                        <View style={styles.warehousePreview}>
                            <Text style={styles.warehouseName} numberOfLines={1}>
                                🏢 {warehouse.name || 'Склад'}
                            </Text>
                            {warehouse.address && (
                                <Text style={styles.warehouseAddress} numberOfLines={1}>
                                    📍 {warehouse.address}
                                </Text>
                            )}
                            {warehouse.district && (
                                <Text style={styles.warehouseDistrict} numberOfLines={1}>
                                    {warehouse.district.name}
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

                    <View style={styles.listContainer}>
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
                                style={styles.flatList}
                                keyboardShouldPersistTaps="handled"
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
                                style={styles.flatList}
                                keyboardShouldPersistTaps="handled"
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>Нет доступных чатов</Text>
                                        <Text style={styles.emptyHint}>Начните вводить имя для поиска пользователей</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    backdropTouchable: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalOverlayFullScreen: {
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Color.colorLightMode,
        borderTopLeftRadius: Border.br_xl,
        borderTopRightRadius: Border.br_xl,
        paddingBottom: 20,
        flexDirection: 'column',
    },
    dragHandleContainer: {
        paddingTop: 8,
        paddingBottom: 6,
        alignItems: 'center',
    },
    dragHandle: {
        width: 44,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#D8D8D8',
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
    warehousePreview: {
        padding: 16,
        backgroundColor: '#F9F9F9',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    warehouseName: {
        fontSize: FontSize.size_md,
        fontFamily: FontFamily.sFProText,
        fontWeight: '600',
        color: Color.purpleSoft,
        marginBottom: 4,
    },
    warehouseAddress: {
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        color: Color.colorCornflowerblue,
        marginBottom: 2,
    },
    warehouseDistrict: {
        fontSize: FontSize.size_sm,
        fontFamily: FontFamily.sFProText,
        color: Color.colorCornflowerblue,
    },
    listContainer: {
        flex: 1,
        minHeight: 200,
    },
    roomsList: {
        padding: 8,
    },
    flatList: {
        flex: 1,
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
