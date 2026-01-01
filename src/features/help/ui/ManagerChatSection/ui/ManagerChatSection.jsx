import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { employeeApiMethods } from '@entities/user/api/userApi';
import ChatApi from '@entities/chat/api/chatApi';
import CustomButton from '@shared/ui/Button/CustomButton';
import Icon from 'react-native-vector-icons/MaterialIcons';

/**
 * Компонент секции чата с менеджером района
 */
export const ManagerChatSection = () => {
    const navigation = useNavigation();
    const { currentUser } = useAuth();
    
    const [manager, setManager] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [chatting, setChatting] = useState(false);

    // Поиск менеджера района
    const findDistrictManager = useCallback(async () => {
        if (!currentUser?.client?.districtId) {
            setError('Район не назначен. Обратитесь в службу поддержки для назначения района.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const districtId = currentUser.client.districtId;
            const response = await employeeApiMethods.getDistrictManager(districtId);
            const managerData = response?.data?.manager;

            if (!managerData) {
                setError('Менеджер вашего района временно недоступен. Попробуйте позже или обратитесь в службу поддержки.');
                setManager(null);
                return;
            }

            setManager(managerData);
        } catch (err) {
            console.error('Ошибка при поиске менеджера:', err);
            setError('Не удалось найти менеджера района. Попробуйте позже.');
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    // Загрузка менеджера при монтировании
    useEffect(() => {
        if (currentUser?.client?.districtId) {
            findDistrictManager();
        } else {
            setError('Район не назначен. Обратитесь в службу поддержки для назначения района.');
        }
    }, [currentUser, findDistrictManager]);

    // Открытие/создание чата с менеджером
    const openChatWithManager = useCallback(async () => {
        if (!manager) {
            Alert.alert('Ошибка', 'Менеджер не найден');
            return;
        }

        setChatting(true);

        try {
            const managerUserId = manager.user?.id;
            if (!managerUserId) {
                throw new Error('ID менеджера не найден');
            }

            // 1. Проверить существующий чат
            const roomsResponse = await ChatApi.getRooms({ type: 'DIRECT' });
            const rooms = roomsResponse?.data?.rooms || [];
            
            const existingChat = rooms.find(room => {
                if (room?.type !== 'DIRECT') return false;
                return room.participants?.some(p => 
                    (p?.userId ?? p?.user?.id) === managerUserId
                );
            });

            if (existingChat) {
                // Открыть существующий чат
                const managerName = manager.name || manager.user?.email || 'Менеджер';
                navigation.navigate('ChatRoom', {
                    roomId: existingChat.id,
                    roomTitle: managerName,
                    roomData: existingChat,
                    fromScreen: 'HelpCenter'
                });
                return;
            }

            // 2. Создать новый чат
            const managerName = manager.name || manager.user?.email || 'Менеджер';
            const formData = new FormData();
            formData.append('type', 'DIRECT');
            formData.append('title', managerName);
            formData.append('members', JSON.stringify([managerUserId]));

            const response = await ChatApi.createRoom(formData);
            const room = response?.data?.room || response?.data?.data?.room;

            if (!room?.id) {
                throw new Error('Не удалось создать чат');
            }

            // 3. Перейти в чат
            navigation.navigate('ChatRoom', {
                roomId: room.id,
                roomTitle: managerName,
                roomData: room,
                fromScreen: 'HelpCenter'
            });
        } catch (err) {
            console.error('Ошибка при создании чата:', err);
            Alert.alert(
                'Ошибка',
                'Не удалось открыть чат с менеджером. Попробуйте позже.',
                [{ text: 'OK' }]
            );
        } finally {
            setChatting(false);
        }
    }, [manager, navigation]);

    // Повторная попытка поиска менеджера
    const handleRetry = useCallback(() => {
        findDistrictManager();
    }, [findDistrictManager]);

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Связь с менеджером района</Text>
            
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={Color.blue2} />
                    <Text style={styles.loadingText}>Поиск менеджера...</Text>
                </View>
            )}

            {error && !loading && (
                <View style={styles.errorContainer}>
                    <Icon name="error-outline" size={24} color={Color.error || Color.red || '#FF3B30'} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={handleRetry}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.retryButtonText}>Повторить</Text>
                    </TouchableOpacity>
                </View>
            )}

            {manager && !loading && !error && (
                <View style={styles.managerContainer}>
                    <View style={styles.managerInfo}>
                        <Icon name="person" size={24} color={Color.blue2} />
                        <View style={styles.managerDetails}>
                            <Text style={styles.managerName}>{manager.name || 'Менеджер'}</Text>
                            {manager.position && (
                                <Text style={styles.managerPosition}>{manager.position}</Text>
                            )}
                            {manager.phone && (
                                <Text style={styles.managerPhone}>{manager.phone}</Text>
                            )}
                        </View>
                    </View>
                    <CustomButton
                        title={chatting ? "Открытие чата..." : "Написать менеджеру"}
                        onPress={openChatWithManager}
                        outlined={false}
                        color={Color.blue2}
                        activeColor="#FFFFFF"
                        disabled={chatting}
                        style={styles.chatButton}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: normalize(20),
        paddingTop: normalize(16),
        paddingBottom: normalize(24),
        backgroundColor: '#fff',
    },
    sectionTitle: {
        fontSize: normalizeFont(22),
        fontWeight: '600',
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(20),
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: normalize(20),
    },
    loadingText: {
        fontSize: normalizeFont(16),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
        marginLeft: normalize(12),
    },
    errorContainer: {
        alignItems: 'center',
        padding: normalize(20),
        backgroundColor: Color.colorLavender || '#f5f5f5',
        borderRadius: normalize(12),
    },
    errorText: {
        fontSize: normalizeFont(15),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginTop: normalize(12),
        marginBottom: normalize(16),
        lineHeight: normalizeFont(22),
    },
    retryButton: {
        paddingHorizontal: normalize(20),
        paddingVertical: normalize(10),
        backgroundColor: Color.blue2,
        borderRadius: normalize(8),
    },
    retryButtonText: {
        fontSize: normalizeFont(16),
        fontWeight: '600',
        color: '#fff',
        fontFamily: FontFamily.sFProText,
    },
    managerContainer: {
        backgroundColor: Color.colorLavender || '#f5f5f5',
        borderRadius: normalize(12),
        padding: normalize(16),
    },
    managerInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: normalize(16),
    },
    managerDetails: {
        flex: 1,
        marginLeft: normalize(12),
    },
    managerName: {
        fontSize: normalizeFont(18),
        fontWeight: '600',
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
    },
    managerPosition: {
        fontSize: normalizeFont(15),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
        marginBottom: normalize(4),
    },
    managerPhone: {
        fontSize: normalizeFont(14),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
    },
    chatButton: {
        marginTop: normalize(8),
    },
});
