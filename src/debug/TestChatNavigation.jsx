import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

export const TestChatNavigation = () => {
    
    // Тест локального уведомления с навигацией к чату
    const testChatNotification = async () => {
        try {
            console.log('🧪 Тестируем навигацию к чату из уведомления...');
            
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '💬 Тестовое сообщение чата',
                    body: 'Нажмите для перехода к чату',
                    data: {
                        type: 'CHAT_MESSAGE',
                        messageId: 'test-123',
                        roomId: '1', // Используйте существующий roomId
                        senderId: '1',
                        senderName: 'Тестовый пользователь',
                        url: 'iceberg://chat/1'
                    },
                    sound: true,
                },
                trigger: null, // Показать немедленно
            });
            
            Alert.alert(
                'Тест отправлен',
                'Уведомление должно появиться. Нажмите на него для проверки навигации к чату.',
                [{ text: 'OK' }]
            );
            
        } catch (error) {
            console.error('❌ Ошибка тестирования навигации к чату:', error);
            Alert.alert('Ошибка', error.message);
        }
    };

    // Тест URL навигации
    const testUrlNavigation = async () => {
        try {
            console.log('🔗 Тестируем URL навигацию к чату...');
            
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '🔗 Тест URL навигации',
                    body: 'Тест перехода по iceberg://chat/1',
                    data: {
                        url: 'iceberg://chat/1'
                    },
                    sound: true,
                },
                trigger: null,
            });
            
            Alert.alert(
                'URL тест отправлен',
                'Уведомление с URL должно появиться. Нажмите на него для проверки.',
                [{ text: 'OK' }]
            );
            
        } catch (error) {
            console.error('❌ Ошибка тестирования URL навигации:', error);
            Alert.alert('Ошибка', error.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🧪 Тест навигации к чату</Text>
            
            <TouchableOpacity 
                style={styles.button} 
                onPress={testChatNotification}
            >
                <Text style={styles.buttonText}>💬 Тест CHAT_MESSAGE</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={styles.button} 
                onPress={testUrlNavigation}
            >
                <Text style={styles.buttonText}>🔗 Тест URL навигации</Text>
            </TouchableOpacity>
            
            <Text style={styles.note}>
                📝 Инструкция:{'\n'}
                1. Нажмите кнопку теста{'\n'}
                2. Появится уведомление{'\n'}
                3. Нажмите на уведомление{'\n'}
                4. Должен открыться чат
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    note: {
        fontSize: 14,
        color: '#666',
        marginTop: 20,
        lineHeight: 20,
    },
});

export default TestChatNavigation;


