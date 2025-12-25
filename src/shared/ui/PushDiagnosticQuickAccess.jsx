import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import PushNotificationService from '@shared/services/PushNotificationService';
import { pushTokenApi } from '@entities/notification/api/pushTokenApi';

export const PushDiagnosticQuickAccess = () => {
    const [status, setStatus] = useState(null);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = () => {
        const serviceStatus = PushNotificationService.getStatus();
        setStatus(serviceStatus);
    };

    const sendTestNotification = async () => {
        try {
            const result = await pushTokenApi.sendTestNotification({
                title: 'Тестовое уведомление',
                message: 'Проверка работы push уведомлений'
            });
            
            Alert.alert(
                'Тест отправлен',
                `Результат: ${result.message}\nОтправлено: ${result.data?.sentCount || 0} уведомлений`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            Alert.alert(
                'Ошибка теста',
                `Не удалось отправить тестовое уведомление: ${error.message}`,
                [{ text: 'OK' }]
            );
        }
    };

    const sendDirectPushTest = async () => {
        try {
            const result = await PushNotificationService.sendTestPushNotification();
            
            Alert.alert(
                'Прямой тест отправлен',
                `Результат: ${result?.message || 'Успешно'}\nТокен использован в preview build`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            Alert.alert(
                'Ошибка прямого теста',
                `Не удалось отправить: ${error.message}`,
                [{ text: 'OK' }]
            );
        }
    };

    const getStatusColor = () => {
        if (!status) return '#gray';
        if (status.isInitialized && status.hasToken) return '#4CAF50';
        if (status.isInitialized && !status.hasToken) return '#FF9800';
        return '#F44336';
    };

    const getStatusText = () => {
        if (!status) return 'Проверка...';
        if (status.isInitialized && status.hasToken) return 'Push OK';
        if (status.isInitialized && !status.hasToken) return 'Нет токена';
        return 'Не инициализирован';
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={[styles.statusButton, { backgroundColor: getStatusColor() }]}
                onPress={() => setExpanded(!expanded)}
            >
                <Text style={styles.statusText}>{getStatusText()}</Text>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.expandedContainer}>
                    <Text style={styles.title}>Push Диагностика</Text>
                    
                    {status && (
                        <View style={styles.infoContainer}>
                            <Text style={styles.infoText}>
                                • Инициализирован: {status.isInitialized ? '✅' : '❌'}
                            </Text>
                            <Text style={styles.infoText}>
                                • Есть токен: {status.hasToken ? '✅' : '❌'}
                            </Text>
                            <Text style={styles.infoText}>
                                • Навигация готова: {status.navigationReady ? '✅' : '❌'}
                            </Text>
                            <Text style={styles.infoText}>
                                • Ожидающих навигаций: {status.pendingNavigationsCount || 0}
                            </Text>
                            {status.tokenPrefix && (
                                <Text style={styles.infoText}>
                                    • Токен: {status.tokenPrefix}
                                </Text>
                            )}
                        </View>
                    )}

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={checkStatus}
                        >
                            <Text style={styles.buttonText}>Обновить</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.testButton}
                            onPress={sendTestNotification}
                        >
                            <Text style={styles.buttonText}>Тест</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles.directTestButton}
                            onPress={sendDirectPushTest}
                        >
                            <Text style={styles.buttonText}>Прямой</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 100,
        right: 16,
        zIndex: 1000,
    },
    statusButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        minWidth: 80,
        alignItems: 'center',
    },
    statusText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    expandedContainer: {
        marginTop: 8,
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        minWidth: 200,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    infoContainer: {
        marginBottom: 12,
    },
    infoText: {
        fontSize: 11,
        marginBottom: 2,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        backgroundColor: '#2196F3',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        flex: 1,
        marginRight: 4,
    },
    testButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        flex: 1,
        marginLeft: 4,
    },
    directTestButton: {
        backgroundColor: '#FF9800',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        flex: 1,
        marginLeft: 4,
    },
    buttonText: {
        color: 'white',
        fontSize: 12,
        textAlign: 'center',
        fontWeight: 'bold',
    },
});

export default PushDiagnosticQuickAccess; 