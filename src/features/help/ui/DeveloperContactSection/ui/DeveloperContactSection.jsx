import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { normalize, normalizeFont } from '@shared/lib/normalize';
import { Color, FontFamily } from '@app/styles/GlobalStyles';
import { useAuth } from '@entities/auth/hooks/useAuth';
import { useCustomAlert } from '@shared/ui/CustomAlert/CustomAlertProvider';
import ChatApi from '@entities/chat/api/chatApi';
import CustomButton from '@shared/ui/Button/CustomButton';
import Icon from 'react-native-vector-icons/MaterialIcons';

/**
 * Компонент секции обращений к разработчику
 */
export const DeveloperContactSection = () => {
    const navigation = useNavigation();
    const { currentUser } = useAuth();
    const { showError } = useCustomAlert();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const DEVELOPER_EMAIL = 'abukar.mutaliev.js@gmail.com';

    // Поиск разработчика и открытие чата
    const handleOpenDeveloperChat = useCallback(async () => {
        if (!currentUser?.id) {
            showError('Ошибка', 'Необходимо авторизоваться');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let developer = null;

            // Ищем разработчика по email
            try {
                const searchResponse = await ChatApi.searchUsers(DEVELOPER_EMAIL, 50);
                const users = searchResponse?.data?.users || 
                             searchResponse?.data?.data?.users ||
                             searchResponse?.data || 
                             [];
                
                if (Array.isArray(users)) {
                    // Ищем пользователя с точным совпадением email
                    developer = users.find(user => {
                        const email = user.email || user.user?.email;
                        return email && email.toLowerCase() === DEVELOPER_EMAIL.toLowerCase();
                    });
                }
            } catch (err) {
                console.warn('Поиск по email не дал результатов:', err);
            }

            // Если не нашли по email, пробуем поиск по части email
            if (!developer) {
                try {
                    const emailPart = DEVELOPER_EMAIL.split('@')[0]; // "abukar.mutaliev.js"
                    const searchResponse = await ChatApi.searchUsers(emailPart, 50);
                    const users = searchResponse?.data?.users || 
                                 searchResponse?.data?.data?.users ||
                                 searchResponse?.data || 
                                 [];
                    
                    if (Array.isArray(users)) {
                        developer = users.find(user => {
                            const email = user.email || user.user?.email;
                            return email && email.toLowerCase().includes(DEVELOPER_EMAIL.toLowerCase());
                        });
                    }
                } catch (err) {
                    console.warn('Поиск по части email не дал результатов:', err);
                }
            }

            if (!developer) {
                throw new Error(`Разработчик с email ${DEVELOPER_EMAIL} не найден. Убедитесь, что пользователь существует в системе.`);
            }

            const developerUserId = developer.id || developer.userId;
            if (!developerUserId) {
                throw new Error('Не удалось определить ID разработчика');
            }

            // Проверяем существующий чат
            const roomsResponse = await ChatApi.getRooms({ type: 'DIRECT' });
            const rooms = roomsResponse?.data?.rooms || [];

            const existingChat = rooms.find(room => {
                if (room?.type !== 'DIRECT') return false;
                return room.participants?.some(p =>
                    (p?.userId ?? p?.user?.id) === developerUserId
                );
            });

            if (existingChat) {
                // Открываем существующий чат
                const developerName = developer.name || 
                                    developer.displayName || 
                                    developer.client?.name ||
                                    developer.employee?.name ||
                                    developer.admin?.name ||
                                    developer.supplier?.companyName ||
                                    developer.driver?.name ||
                                    'Разработчик';
                navigation.navigate('ChatRoom', {
                    roomId: existingChat.id,
                    roomTitle: developerName,
                    roomData: existingChat,
                    fromScreen: 'HelpCenter'
                });
                return;
            }

            // Создаем новый чат
            const developerName = developer.name || 
                                developer.displayName || 
                                developer.client?.name ||
                                developer.employee?.name ||
                                developer.admin?.name ||
                                developer.supplier?.companyName ||
                                developer.driver?.name ||
                                'Разработчик';
            const formData = new FormData();
            formData.append('type', 'DIRECT');
            formData.append('title', developerName);
            formData.append('members', JSON.stringify([developerUserId]));

            const response = await ChatApi.createRoom(formData);
            const room = response?.data?.room || response?.data?.data?.room;

            if (!room?.id) {
                throw new Error('Не удалось создать чат');
            }

            // Переходим в чат
            navigation.navigate('ChatRoom', {
                roomId: room.id,
                roomTitle: developerName,
                roomData: room,
                fromScreen: 'HelpCenter'
            });
        } catch (err) {
            console.error('Ошибка при открытии чата с разработчиком:', err);
            const errorMessage = err.message || 'Не удалось открыть чат с разработчиком. Попробуйте позже.';
            setError(errorMessage);
            showError(
                'Ошибка',
                errorMessage
            );
        } finally {
            setLoading(false);
        }
    }, [currentUser, navigation, showError]);

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Обращение к разработчику</Text>
            
            <View style={styles.infoContainer}>
                <Icon name="info-outline" size={24} color={Color.blue2} />
                <Text style={styles.infoText}>
                    Есть вопросы или предложения по приложению? Напишите разработчику приложения Iceberg напрямую в чат.
                </Text>
            </View>

            {error && !loading && (
                <View style={styles.errorContainer}>
                    <Icon name="error-outline" size={24} color={Color.error || Color.red || '#FF3B30'} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <CustomButton
                title={loading ? "Открытие чата..." : "Написать разработчику"}
                onPress={handleOpenDeveloperChat}
                outlined={false}
                color={Color.blue2}
                activeColor="#FFFFFF"
                disabled={loading}
                style={styles.chatButton}
            />
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
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Color.colorLavender || '#f5f5f5',
        borderRadius: normalize(12),
        padding: normalize(16),
        marginBottom: normalize(16),
    },
    infoText: {
        flex: 1,
        fontSize: normalizeFont(15),
        color: Color.colorGray_100,
        fontFamily: FontFamily.sFProText,
        marginLeft: normalize(12),
        lineHeight: normalizeFont(22),
    },
    errorContainer: {
        alignItems: 'center',
        padding: normalize(20),
        backgroundColor: Color.colorLavender || '#f5f5f5',
        borderRadius: normalize(12),
        marginBottom: normalize(16),
    },
    errorText: {
        fontSize: normalizeFont(15),
        color: Color.grey7D7D7D,
        fontFamily: FontFamily.sFProText,
        textAlign: 'center',
        marginTop: normalize(12),
    },
    chatButton: {
        marginTop: normalize(8),
    },
});

