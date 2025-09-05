import React, { useEffect, useState, useMemo } from 'react';
import { SafeAreaView, View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Modal, Dimensions, StatusBar, Linking, Alert } from 'react-native';
import { userApi } from '@entities/user';
import { getBaseUrl } from '@shared/api/api';
import { useAuth } from '@entities/auth/hooks/useAuth';
import ChatApi from '@entities/chat/api/chatApi';
import { useSelector } from 'react-redux';
import { selectRoomsList } from '@entities/chat/model/selectors';
import CallIcon from '@shared/ui/Chat/CallIcon';
import ChatIcon from '@shared/ui/Chat/ChatIcon';

export const UserPublicProfileScreen = ({ route, navigation }) => {
    const userId = route?.params?.userId;
    const fromScreen = route?.params?.fromScreen;
    const roomId = route?.params?.roomId;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    
    // Получаем текущего пользователя для проверки прав доступа
    const { currentUser } = useAuth();
    
    // Получаем список чатов для проверки существования
    const rooms = useSelector(selectRoomsList) || [];

    useEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            if (!userId) {
                setError('Пользователь не указан');
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const res = await userApi.getUserById(userId);
                const data = res?.data?.user || res?.data || res;
                if (isMounted) setUser(data || null);
            } catch (e) {
                if (isMounted) setError('Не удалось загрузить пользователя');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        load();
        return () => { isMounted = false; };
    }, [userId]);

    // Проверяем права доступа к конфиденциальной информации
    const canViewSensitiveInfo = useMemo(() => {
        if (!currentUser) return false;
        
        // Админы и сотрудники могут видеть всю информацию
        if (currentUser.role === 'ADMIN' || currentUser.role === 'EMPLOYEE') {
            return true;
        }
        
        // Поставщики могут видеть информацию о клиентах
        if (currentUser.role === 'SUPPLIER' && user?.role === 'CLIENT') {
            return true;
        }
        
        // Водители могут видеть информацию о клиентах
        if (currentUser.role === 'DRIVER' && user?.role === 'CLIENT') {
            return true;
        }
        
        // Пользователи не могут видеть конфиденциальную информацию друг друга
        return false;
    }, [currentUser, user]);

    // Проверяем существование чата с пользователем
    const existingChat = useMemo(() => {
        if (!currentUser?.id || !user?.id) return null;
        
        return rooms.find(room => {
            // Ищем прямой чат (DIRECT) с этим пользователем
            if (room.type !== 'DIRECT') return false;
            
            // Проверяем, есть ли в участниках нужный пользователь
            return room.participants?.some(participant => {
                const participantId = participant?.userId ?? participant?.user?.id ?? participant?.id;
                return participantId === user.id;
            });
        });
    }, [rooms, currentUser?.id, user?.id]);

    const getDisplayName = (userData) => {
        if (!userData) return 'Пользователь';

        if (userData.role === 'CLIENT') {
            const clientData = userData.client || userData.profile;
            if (clientData) {
                return clientData.name || clientData.companyName || 'Клиент';
            }
        }
        if (userData.role === 'SUPPLIER') {
            const supplierData = userData.supplier || userData.profile;
            if (supplierData) {
                return supplierData.companyName || supplierData.contactPerson || 'Поставщик';
            }
        }
        if (userData.role === 'EMPLOYEE') {
            const employeeData = userData.employee || userData.profile;
            if (employeeData) {
                return employeeData.name || 'Сотрудник';
            }
        }
        if (userData.role === 'ADMIN') {
            const adminData = userData.admin || userData.profile;
            if (adminData) {
                return adminData.name || 'Администратор';
            }
        }

        if (userData.email) {
            const emailName = userData.email.split('@')[0];
            return emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }

        return 'Пользователь';
    };

    const avatarUri = useMemo(() => {
        const raw = user?.avatar || user?.image;
        if (!raw) return null;
        if (raw.startsWith('http')) return raw;
        return `${getBaseUrl()}/uploads/${raw.replace(/^\\+/g, '').replace(/^\/+/, '').replace(/^uploads\/?/, '')}`;
    }, [user]);

    const displayName = useMemo(() => getDisplayName(user), [user]);

    const handleGoBack = () => {
        if (fromScreen === 'ChatRoom') {
            navigation.goBack();
        } else if (fromScreen === 'GroupInfo' && roomId) {
            navigation.navigate('GroupInfo', { roomId });
        } else {
            navigation.goBack();
        }
    };

    const getRoleText = (role) => {
        switch (role) {
            case 'CLIENT': return 'Клиент';
            case 'SUPPLIER': return 'Поставщик';
            case 'EMPLOYEE': return 'Сотрудник';
            case 'ADMIN': return 'Администратор';
            default: return 'Пользователь';
        }
    };

    const getPhoneNumber = (userData) => {
        if (!userData) return null;
        return userData.client?.phone ||
            userData.supplier?.phone ||
            userData.employee?.phone ||
            userData.admin?.phone ||
            userData.profile?.phone ||
            null;
    };

    // Функция для совершения звонка
    const handleCall = async (phoneNumber) => {
        if (!phoneNumber) {
            Alert.alert('Ошибка', 'Номер телефона недоступен');
            return;
        }

        try {
            // Форматируем номер телефона для звонка
            const formattedNumber = phoneNumber.replace(/\s+/g, '').replace(/[()-]/g, '');
            const phoneUrl = `tel:${formattedNumber}`;
            
            const supported = await Linking.canOpenURL(phoneUrl);
            if (supported) {
                await Linking.openURL(phoneUrl);
            } else {
                Alert.alert('Ошибка', 'Не удалось открыть приложение для звонков');
            }
        } catch (error) {
            console.error('Error opening phone app:', error);
            Alert.alert('Ошибка', 'Не удалось совершить звонок');
        }
    };

    // Функция для перехода в чат с пользователем
    const handleStartChat = async () => {
        if (!currentUser?.id || !user?.id) {
            Alert.alert('Ошибка', 'Не удалось определить пользователей для чата');
            return;
        }

        // Если чат уже существует, переходим в него
        if (existingChat) {
            console.log('ChatRoom: Переходим в существующий чат:', existingChat.id);
            navigation.navigate('ChatRoom', {
                roomId: existingChat.id,
                roomTitle: displayName,
                roomData: existingChat,
                fromScreen: fromScreen === 'GroupInfo' ? 'GroupInfo' : 'UserPublicProfile',
                currentUserId: currentUser.id,
                groupRoomId: fromScreen === 'GroupInfo' ? roomId : undefined
            });
            return;
        }

        // Если чата нет, создаем новый
        try {
            console.log('ChatRoom: Создаем новый чат с пользователем:', user.id);
            
            // Создаем FormData для создания чата
            const formData = new FormData();
            formData.append('type', 'DIRECT');
            formData.append('title', displayName);
            formData.append('members', JSON.stringify([user.id]));
            
            const response = await ChatApi.createRoom(formData);
            const room = response?.data?.room;
            
            if (room) {
                // Переходим в созданный чат
                navigation.navigate('ChatRoom', {
                    roomId: room.id,
                    roomTitle: displayName,
                    roomData: {
                        ...room,
                        participants: [
                            {
                                userId: user.id,
                                user: {
                                    ...user,
                                    name: displayName,
                                    companyName: user.role === 'SUPPLIER' ? displayName : null,
                                    lastSeenAt: user.lastSeenAt,
                                    isOnline: user.isOnline
                                }
                            }
                        ]
                    },
                    fromScreen: fromScreen === 'GroupInfo' ? 'GroupInfo' : 'UserPublicProfile',
                    currentUserId: currentUser.id,
                    groupRoomId: fromScreen === 'GroupInfo' ? roomId : undefined
                });
            } else {
                throw new Error('Не удалось создать чат');
            }
        } catch (error) {
            console.error('Error creating chat:', error);
            Alert.alert('Ошибка', 'Не удалось создать чат');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <StatusBar backgroundColor="#075E54" barStyle="light-content" />
                <ActivityIndicator size="large" color="#25D366" />
                <Text style={styles.loadingText}>Загрузка профиля...</Text>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar backgroundColor="#075E54" barStyle="light-content" />
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleGoBack}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Контакт</Text>
                </View>
                <View style={styles.center}>
                    <Text style={styles.error}>{error}</Text>
                    <TouchableOpacity onPress={handleGoBack} style={styles.retryButton}>
                        <Text style={styles.retryText}>Назад</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#075E54" barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleGoBack}
                    activeOpacity={0.7}
                >
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{displayName}</Text>
                <View style={styles.headerActions}>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.avatarSection}>
                    <TouchableOpacity
                        style={styles.avatarContainer}
                        onPress={() => avatarUri && setShowAvatarModal(true)}
                        activeOpacity={avatarUri ? 0.8 : 1}
                        disabled={!avatarUri}
                    >
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarPlaceholderText}>👤</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Phone Section - показываем только если есть права доступа */}
                {getPhoneNumber(user) && canViewSensitiveInfo && (
                    <View style={styles.infoSection}>
                        <View style={styles.infoRow}>
                            <Text style={styles.sectionLabel}>Телефон</Text>
                        </View>
                        <View style={styles.phoneContainer}>
                            <Text style={styles.phoneText}>{getPhoneNumber(user)}</Text>
                            <View style={styles.phoneActions}>
                                <TouchableOpacity 
                                    style={styles.phoneAction} 
                                    activeOpacity={0.7}
                                    onPress={() => handleCall(getPhoneNumber(user))}
                                >
                                    <CallIcon width={22} height={22} color="#FFFFFF" />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.phoneAction} 
                                    activeOpacity={0.7}
                                    onPress={handleStartChat}
                                >
                                    <ChatIcon width={24} height={24} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

                {/* Email Section */}
                {user?.email && (
                    <View style={styles.infoSection}>
                        <View style={styles.infoRow}>
                            <Text style={styles.sectionLabel}>Email</Text>
                        </View>
                        <Text style={styles.infoText}>{user.email}</Text>
                    </View>
                )}

                {/* Company Info for Clients - показываем только если есть права доступа */}
                {(user?.client || (user?.role === 'CLIENT' && user?.profile)) && canViewSensitiveInfo && (
                    <>
                        {(user.client?.companyName || user.profile?.companyName) && (
                            <View style={styles.infoSection}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.sectionLabel}>Компания</Text>
                                </View>
                                <Text style={styles.infoText}>{user.client?.companyName || user.profile?.companyName}</Text>
                            </View>
                        )}

                        {(user.client?.address || user.profile?.address) && (
                            <View style={styles.infoSection}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.sectionLabel}>Адрес</Text>
                                </View>
                                <Text style={styles.infoText}>{user.client?.address || user.profile?.address}</Text>
                            </View>
                        )}
                    </>
                )}

                {/* Company Info for Suppliers - показываем только если есть права доступа */}
                {(user?.supplier || (user?.role === 'SUPPLIER' && user?.profile)) && canViewSensitiveInfo && (
                    <>
                        {(user.supplier?.companyName || user.profile?.companyName) && (
                            <View style={styles.infoSection}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.sectionLabel}>Компания</Text>
                                </View>
                                <Text style={styles.infoText}>{user.supplier?.companyName || user.profile?.companyName}</Text>
                            </View>
                        )}

                        {(user.supplier?.contactPerson || user.profile?.contactPerson) && (
                            <View style={styles.infoSection}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.sectionLabel}>Контактное лицо</Text>
                                </View>
                                <Text style={styles.infoText}>{user.supplier?.contactPerson || user.profile?.contactPerson}</Text>
                            </View>
                        )}
                    </>
                )}

                {/* Employee Info - показываем только если есть права доступа */}
                {(user?.employee || (user?.role === 'EMPLOYEE' && user?.profile)) && canViewSensitiveInfo && (
                    <>
                        {(user.employee?.position || user.profile?.position) && (
                            <View style={styles.infoSection}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.sectionLabel}>Должность</Text>
                                </View>
                                <Text style={styles.infoText}>{user.employee?.position || user.profile?.position}</Text>
                            </View>
                        )}

                        {(user.employee?.address || user.profile?.address) && (
                            <View style={styles.infoSection}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.sectionLabel}>Адрес</Text>
                                </View>
                                <Text style={styles.infoText}>{user.employee?.address || user.profile?.address}</Text>
                            </View>
                        )}
                    </>
                )}

                {/* Кнопка для начала чата - показываем всем авторизованным пользователям */}
                {currentUser && currentUser.id !== user?.id && (
                    <View style={styles.actionsSection}>
                        <TouchableOpacity 
                            style={styles.actionItem} 
                            onPress={handleStartChat}
                            activeOpacity={0.7}
                        >
                            <ChatIcon width={24} height={24} color="#25D366" />
                            <Text style={styles.actionText}>
                                {existingChat ? 'Открыть чат' : 'Написать сообщение'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>

            {/* Avatar Modal */}
            <Modal
                visible={showAvatarModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowAvatarModal(false)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            style={styles.modalBackButton}
                            onPress={() => setShowAvatarModal(false)}
                        >
                            <Text style={styles.modalBackIcon}>←</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{displayName}</Text>
                    </View>

                    <View style={styles.modalContent}>
                        <Image
                            source={{ uri: avatarUri }}
                            style={styles.fullSizeAvatar}
                            resizeMode="contain"
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#128C7E',
        fontWeight: '400',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },

    // WhatsApp Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#075E54',
        paddingTop: 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    backButton: {
        marginRight: 16,
        padding: 8,
    },
    backIcon: {
        fontSize: 24,
        color: '#FFFFFF',
        fontWeight: '400',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '500',
        color: '#FFFFFF',
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
    },
    headerAction: {
        padding: 8,
    },
    headerActionIcon: {
        fontSize: 20,
        color: '#FFFFFF',
        fontWeight: '600',
    },

    content: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    // Avatar Section
    avatarSection: {
        backgroundColor: '#075E54',
        alignItems: 'center',
        paddingVertical: 32,
        paddingBottom: 24,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    avatarPlaceholder: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    avatarPlaceholderText: {
        fontSize: 80,
        opacity: 0.7,
    },

    // Name Section
    nameSection: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8E8',
    },
    nameRow: {
        marginBottom: 8,
    },
    sectionLabel: {
        fontSize: 14,
        color: '#25D366',
        fontWeight: '400',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    nameText: {
        fontSize: 28,
        fontWeight: '400',
        color: '#000000',
        marginBottom: 4,
    },
    roleText: {
        fontSize: 16,
        color: '#666666',
        fontWeight: '400',
    },

    // Info Sections
    infoSection: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8E8',
    },
    infoRow: {
        marginBottom: 8,
    },
    infoText: {
        fontSize: 18,
        color: '#000000',
        fontWeight: '400',
        lineHeight: 24,
    },

    // Phone Section
    phoneContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    phoneText: {
        fontSize: 18,
        color: '#000000',
        fontWeight: '400',
        flex: 1,
    },
    phoneActions: {
        flexDirection: 'row',
        marginLeft: 16,
    },
    phoneAction: {
        padding: 12,
        marginLeft: 8,
        backgroundColor: '#25D366',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    phoneActionIcon: {
        width: 24,
        height: 24,
    },

    // Actions Section
    actionsSection: {
        marginTop: 24,
        backgroundColor: '#FFFFFF',
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8E8',
    },
    actionIcon: {
        width: 24,
        height: 24,
        marginRight: 24,
    },
    actionText: {
        fontSize: 16,
        color: '#000000',
        fontWeight: '400',
        flex: 1,
    },

    bottomSpacing: {
        height: 40,
    },

    // Error States
    error: {
        color: '#E53E3E',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '400',
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#25D366',
        borderRadius: 25,
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
    },

    // Modal Styles
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    modalBackButton: {
        marginRight: 16,
        padding: 8,
    },
    modalBackIcon: {
        fontSize: 24,
        color: '#FFFFFF',
        fontWeight: '400',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '500',
        color: '#FFFFFF',
        flex: 1,
    },
    modalContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    fullSizeAvatar: {
        bottom: 160,
        width: screenWidth - 32,
        height: screenWidth - 32,
        borderRadius: 20,
    },
});

export default UserPublicProfileScreen;