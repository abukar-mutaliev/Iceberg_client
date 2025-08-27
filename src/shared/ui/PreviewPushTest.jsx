import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Constants from 'expo-constants';
import PushNotificationService from '@shared/services/PushNotificationService';
import { useSelector } from 'react-redux';
import { selectUser } from '@entities/auth';

export const PreviewPushTest = () => {
    const [testResults, setTestResults] = useState({});
    const [loading, setLoading] = useState(false);
    const [pushToken, setPushToken] = useState(null);
    const [permissions, setPermissions] = useState(null);
    
    const user = useSelector(selectUser);

    useEffect(() => {
        checkPermissions();
        getPushToken();
    }, []);

    const checkPermissions = async () => {
        try {
            const permissionStatus = await Notifications.getPermissionsAsync();
            setPermissions(permissionStatus);
        } catch (error) {
            console.error('Ошибка проверки разрешений:', error);
        }
    };

    const getPushToken = async () => {
        try {
            const projectId = PushNotificationService.getProjectId();
            console.log('🔑 ProjectId для получения токена:', projectId);
            
            const tokenResult = await Notifications.getExpoPushTokenAsync({ 
                projectId: projectId 
            });
            setPushToken(tokenResult.data);
            console.log('🎫 Получен push токен:', tokenResult.data?.substring(0, 50) + '...');
        } catch (error) {
            console.error('Ошибка получения push токена:', error);
        }
    };

    const requestPermissions = async () => {
        try {
            setLoading(true);
            const { status } = await Notifications.requestPermissionsAsync();
            setPermissions({ status, canAskAgain: true });
            Alert.alert('Разрешения', `Статус: ${status}`);
        } catch (error) {
            Alert.alert('Ошибка', error.message);
        } finally {
            setLoading(false);
        }
    };

    const testLocalNotification = async () => {
        try {
            setLoading(true);
            
            const result = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '🧪 Локальный тест',
                    body: `Тест в ${new Date().toLocaleTimeString()}`,
                    data: { type: 'LOCAL_TEST' },
                    sound: 'default',
                    priority: 'high'
                },
                trigger: null
            });
            
            setTestResults(prev => ({
                ...prev,
                local: { success: true, id: result }
            }));
            
            Alert.alert('Успех', 'Локальное уведомление отправлено!');
        } catch (error) {
            setTestResults(prev => ({
                ...prev,
                local: { success: false, error: error.message }
            }));
            Alert.alert('Ошибка', error.message);
        } finally {
            setLoading(false);
        }
    };

    const testServerNotification = async () => {
        try {
            setLoading(true);
            
            const response = await fetch('http://212.67.11.134:5000/api/push-tokens/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token || ''}`
                },
                body: JSON.stringify({
                    title: '🌐 Серверный тест',
                    message: `Тест с сервера в ${new Date().toLocaleTimeString()}`,
                    data: { type: 'SERVER_TEST' }
                })
            });
            
            const result = await response.json();
            
            setTestResults(prev => ({
                ...prev,
                server: { success: response.ok, result }
            }));
            
            if (response.ok) {
                Alert.alert('Успех', `Серверное уведомление отправлено! Результат: ${JSON.stringify(result)}`);
            } else {
                Alert.alert('Ошибка', `Ошибка сервера: ${result.message || 'Неизвестная ошибка'}`);
            }
        } catch (error) {
            setTestResults(prev => ({
                ...prev,
                server: { success: false, error: error.message }
            }));
            Alert.alert('Ошибка', error.message);
        } finally {
            setLoading(false);
        }
    };

    const saveTokenToServer = async () => {
        if (!pushToken) {
            Alert.alert('Ошибка', 'Нет push токена для сохранения');
            return;
        }

        try {
            setLoading(true);
            
            const response = await fetch('http://212.67.11.134:5000/api/push-tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token || ''}`
                },
                body: JSON.stringify({
                    token: pushToken,
                    deviceId: Device.deviceName || 'unknown',
                    platform: Device.osName
                })
            });
            
            const result = await response.json();
            
            setTestResults(prev => ({
                ...prev,
                saveToken: { success: response.ok, result }
            }));
            
            if (response.ok) {
                Alert.alert('Успех', 'Токен сохранен на сервере!');
            } else {
                Alert.alert('Ошибка', `Ошибка сохранения: ${result.message || 'Неизвестная ошибка'}`);
            }
        } catch (error) {
            setTestResults(prev => ({
                ...prev,
                saveToken: { success: false, error: error.message }
            }));
            Alert.alert('Ошибка', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderTestResult = (testName, result) => {
        if (!result) return null;
        
        return (
            <View style={styles.resultItem}>
                <Text style={styles.resultLabel}>{testName}:</Text>
                <Text style={[styles.resultValue, { color: result.success ? '#34C759' : '#FF3B30' }]}>
                    {result.success ? '✅ Успешно' : `❌ Ошибка: ${result.error}`}
                </Text>
            </View>
        );
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>🔔 Preview Push Test</Text>
            
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📱 Информация о сборке:</Text>
                <Text style={styles.infoText}>Build Type: {process.env.EXPO_PUBLIC_BUILD_TYPE || 'unknown'}</Text>
                <Text style={styles.infoText}>Device: {Device.deviceName || 'unknown'}</Text>
                <Text style={styles.infoText}>Platform: {Device.osName}</Text>
                <Text style={styles.infoText}>User: {user?.email || 'Не авторизован'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔐 Разрешения:</Text>
                <Text style={styles.infoText}>
                    Статус: {permissions?.status || 'Неизвестно'}
                </Text>
                <TouchableOpacity 
                    style={styles.button} 
                    onPress={requestPermissions}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Запрос...' : 'Запросить разрешения'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎫 Push Token:</Text>
                <Text style={styles.infoText}>
                    {pushToken ? pushToken.substring(0, 50) + '...' : 'Не получен'}
                </Text>
                <TouchableOpacity 
                    style={styles.button} 
                    onPress={saveTokenToServer}
                    disabled={loading || !pushToken}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Сохранение...' : 'Сохранить на сервер'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🧪 Тесты:</Text>
                
                <TouchableOpacity 
                    style={styles.testButton} 
                    onPress={testLocalNotification}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Тест...' : '📱 Локальный тест'}
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={styles.testButton} 
                    onPress={testServerNotification}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Тест...' : '🌐 Серверный тест'}
                    </Text>
                </TouchableOpacity>
            </View>

            {Object.keys(testResults).length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📊 Результаты тестов:</Text>
                    {Object.entries(testResults).map(([testName, result]) => 
                        <View key={testName}>{renderTestResult(testName, result)}</View>
                    )}
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5'
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20
    },
    section: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12
    },
    infoText: {
        fontSize: 14,
        marginBottom: 8,
        fontFamily: 'monospace'
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        marginTop: 8
    },
    testButton: {
        backgroundColor: '#34C759',
        padding: 12,
        borderRadius: 8,
        marginTop: 8
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold'
    },
    resultItem: {
        marginBottom: 8,
        padding: 8,
        backgroundColor: '#f8f8f8',
        borderRadius: 4
    },
    resultLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4
    },
    resultValue: {
        fontSize: 12,
        fontFamily: 'monospace'
    }
});

export default PreviewPushTest; 