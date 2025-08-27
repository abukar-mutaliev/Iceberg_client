import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import PushNotificationService from "@shared/services/PushNotificationService";
import { useNotifications } from '@entities/notification';

export const PushDiagnostic = ({ navigation }) => {
    const [tokenStatus, setTokenStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const user = useSelector(state => state.auth?.user);
    const notifications = useNotifications(navigation);

    const checkStatus = useCallback(async () => {
        setLoading(true);
        try {
            const status = await notifications.checkTokenStatus();
            setTokenStatus(status);
            console.log('📊 Token status result:', status);
        } catch (error) {
            console.error('❌ Error checking status:', error);
            Alert.alert('Ошибка', 'Не удалось проверить статус');
        } finally {
            setLoading(false);
        }
    }, [notifications]);

    const refreshToken = useCallback(async () => {
        setLoading(true);
        try {
            const success = await notifications.forceTokenRefresh();
            if (success) {
                Alert.alert('Успех', 'Токен обновлен');
                await checkStatus(); // Обновляем статус
            } else {
                Alert.alert('Ошибка', 'Не удалось обновить токен');
            }
        } catch (error) {
            console.error('❌ Error refreshing token:', error);
            Alert.alert('Ошибка', 'Ошибка при обновлении токена');
        } finally {
            setLoading(false);
        }
    }, [notifications, checkStatus]);

    const testServer = useCallback(async () => {
        setLoading(true);
        try {
            const result = await notifications.testServerPushNotification();
            Alert.alert('Результат', `Отправлено ${result?.data?.sentCount || 0} уведомлений`);
        } catch (error) {
            console.error('❌ Server test failed:', error);
            Alert.alert('Ошибка', 'Не удалось отправить серверное уведомление');
        } finally {
            setLoading(false);
        }
    }, [notifications]);

    if (user?.role !== 'CLIENT') {
        return null;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🔧 Push Diagnostic</Text>

            <View style={styles.statusContainer}>
                <Text style={styles.statusTitle}>Статус:</Text>
                {tokenStatus ? (
                    <>
                        <Text style={styles.statusText}>
                            Токен: {tokenStatus.hasDeviceToken ? '✅ Есть' : '❌ Нет'}
                        </Text>
                        <Text style={styles.statusText}>
                            Сервис: {tokenStatus.isInitialized ? '✅ Инициализирован' : '❌ Не инициализирован'}
                        </Text>
                        <Text style={styles.statusText}>
                            Роль: {tokenStatus.userRole || 'Не определена'}
                        </Text>
                        {tokenStatus.deviceToken && (
                            <Text style={styles.tokenText}>
                                Токен: {tokenStatus.deviceToken.substring(0, 30)}...
                            </Text>
                        )}
                    </>
                ) : (
                    <Text style={styles.statusText}>Нажмите "Проверить" для диагностики</Text>
                )}
            </View>

            <View style={styles.buttonsContainer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={checkStatus}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? '⏳' : '🔍'} Проверить статус
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={refreshToken}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? '⏳' : '🔄'} Обновить токен
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={testServer}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? '⏳' : '🧪'} Тест сервера
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.button}
                    onPress={notifications.testStopNotification}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>🚛 Тест остановки</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f0f8ff',
        margin: 16,
        padding: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#007AFF',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
        color: '#007AFF',
    },
    statusContainer: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 6,
        marginBottom: 16,
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    statusText: {
        fontSize: 14,
        marginBottom: 4,
        color: '#555',
        fontFamily: 'monospace',
    },
    tokenText: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'monospace',
        marginTop: 8,
        backgroundColor: '#f5f5f5',
        padding: 8,
        borderRadius: 4,
    },
    buttonsContainer: {
        gap: 8,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});