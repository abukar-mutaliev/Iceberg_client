import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PushNotificationService from '@shared/services/PushNotificationService';
import { useAuth } from '@entities/auth/hooks/useAuth';

export const PushNotificationTestScreen = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [testResults, setTestResults] = useState([]);

    const runTest = async (testName, testFunction) => {
        setIsLoading(true);
        try {
            console.log(`🧪 Running test: ${testName}`);
            const result = await testFunction();
            setTestResults(prev => [...prev, {
                name: testName,
                success: result,
                timestamp: new Date().toISOString()
            }]);
            console.log(`✅ Test ${testName} completed:`, result);
        } catch (error) {
            console.error(`❌ Test ${testName} failed:`, error);
            setTestResults(prev => [...prev, {
                name: testName,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const testForceInitialization = async () => {
        if (!user) {
            Alert.alert('Ошибка', 'Пользователь не авторизован');
            return false;
        }

        console.log('🔔 Force initializing push notifications for user:', {
            userId: user.id,
            role: user.role,
            email: user.email
        });

        const success = await PushNotificationService.initializeForUser(user);
        console.log('🔔 Force initialization result:', success);
        return success;
    };

    const testPushToken = async () => {
        const status = PushNotificationService.getStatus();
        console.log('📊 Push notification status:', status);
        return status.isInitialized && status.hasToken;
    };

    const testSendNotification = async () => {
        return await PushNotificationService.sendTestPushNotification();
    };

    const testLocalNotification = async () => {
        await PushNotificationService.showLocalNotification({
            title: '🧪 Локальное уведомление',
            body: 'Это тестовое локальное уведомление',
            data: { type: 'TEST_LOCAL' }
        });
        return true;
    };

    const clearResults = () => {
        setTestResults([]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView}>
                <Text style={styles.title}>🧪 Тестирование Push-уведомлений</Text>
                
                <View style={styles.userInfo}>
                    <Text style={styles.userInfoText}>
                        Пользователь: {user?.email || 'Не авторизован'}
                    </Text>
                    <Text style={styles.userInfoText}>
                        Роль: {user?.role || 'Неизвестно'}
                    </Text>
                </View>
                
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.forceButton, isLoading && styles.buttonDisabled]}
                        onPress={() => runTest('Принудительная инициализация', testForceInitialization)}
                        disabled={isLoading}
                    >
                        <Text style={styles.buttonText}>🔧 Принудительная инициализация</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={() => runTest('Проверка токена', testPushToken)}
                        disabled={isLoading}
                    >
                        <Text style={styles.buttonText}>🔍 Проверить токен</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={() => runTest('Отправить push-уведомление', testSendNotification)}
                        disabled={isLoading}
                    >
                        <Text style={styles.buttonText}>📤 Отправить push</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={() => runTest('Локальное уведомление', testLocalNotification)}
                        disabled={isLoading}
                    >
                        <Text style={styles.buttonText}>📱 Локальное уведомление</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.clearButton]}
                        onPress={clearResults}
                    >
                        <Text style={styles.buttonText}>🗑️ Очистить результаты</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.resultsContainer}>
                    <Text style={styles.resultsTitle}>Результаты тестов:</Text>
                    {testResults.map((result, index) => (
                        <View key={index} style={[
                            styles.resultItem,
                            result.success ? styles.successResult : styles.errorResult
                        ]}>
                            <Text style={styles.resultName}>{result.name}</Text>
                            <Text style={styles.resultStatus}>
                                {result.success ? '✅ Успех' : '❌ Ошибка'}
                            </Text>
                            {result.error && (
                                <Text style={styles.resultError}>{result.error}</Text>
                            )}
                            <Text style={styles.resultTime}>
                                {new Date(result.timestamp).toLocaleTimeString()}
                            </Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollView: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
        color: '#333',
    },
    userInfo: {
        backgroundColor: '#e0e0e0',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        alignItems: 'center',
    },
    userInfoText: {
        fontSize: 16,
        color: '#555',
        marginBottom: 5,
    },
    buttonContainer: {
        marginBottom: 30,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    forceButton: {
        backgroundColor: '#4CAF50', // A different color for the force initialization button
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    clearButton: {
        backgroundColor: '#FF3B30',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    resultsContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginTop: 20,
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    resultItem: {
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 4,
    },
    successResult: {
        backgroundColor: '#d4edda',
        borderLeftColor: '#28a745',
    },
    errorResult: {
        backgroundColor: '#f8d7da',
        borderLeftColor: '#dc3545',
    },
    resultName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    resultStatus: {
        fontSize: 14,
        marginTop: 5,
        fontWeight: '500',
    },
    resultError: {
        fontSize: 12,
        color: '#dc3545',
        marginTop: 5,
        fontStyle: 'italic',
    },
    resultTime: {
        fontSize: 12,
        color: '#666',
        marginTop: 5,
    },
}); 