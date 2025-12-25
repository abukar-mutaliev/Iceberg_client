// NavigationDebugger.js - Компонент для отладки навигации

import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';

export const NavigationDebugger = ({ navigation }) => {

    const testNavigation = () => {
        console.log('🧪 Testing navigation structure...');

        // Логируем доступные методы навигации
        console.log('Navigation methods:', Object.keys(navigation || {}));

        // Проверяем состояние навигации
        if (navigation) {
            console.log('Navigation state:', navigation.getState ? navigation.getState() : 'getState not available');
        }

        // Тестируем различные варианты навигации к StopDetails
        const testStopId = 13; // Используем ID из ваших уведомлений

        const navigationAttempts = [
            // Прямая навигация
            () => navigation.navigate('StopDetails', { stopId: testStopId }),

            // Через стек
            () => navigation.navigate('StopDetailsStack', {
                screen: 'StopDetails',
                params: { stopId: testStopId }
            }),

            // Через Main
            () => navigation.navigate('Main', {
                screen: 'MainTab',
                params: {
                    screen: 'StopDetails',
                    params: { stopId: testStopId }
                }
            }),

            // К списку остановок
            () => navigation.navigate('StopsListScreen'),

            // Через Main к списку
            () => navigation.navigate('Main', {
                screen: 'MainTab',
                params: { screen: 'StopsListScreen' }
            })
        ];

        const testMethods = [
            'Direct StopDetails',
            'StopDetails via Stack',
            'StopDetails via Main',
            'StopsListScreen direct',
            'StopsListScreen via Main'
        ];

        // Показываем варианты тестирования
        Alert.alert(
            'Тест навигации',
            'Выберите метод для тестирования',
            [
                ...testMethods.map((method, index) => ({
                    text: method,
                    onPress: () => {
                        try {
                            console.log(`🧪 Testing: ${method}`);
                            navigationAttempts[index]();
                            Alert.alert('Готово', `${method} работает!`);
                        } catch (error) {
                            console.error(`❌ ${method} failed:`, error.message);
                            Alert.alert('Ошибка', `${method}: ${error.message}`);
                        }
                    }
                })),
                { text: 'Отмена', style: 'cancel' }
            ]
        );
    };

    const inspectNavigationStructure = () => {
        if (!navigation) {
            Alert.alert('Ошибка', 'Navigation объект недоступен');
            return;
        }

        const navigationInfo = {
            available: !!navigation,
            methods: Object.keys(navigation),
            canGoBack: navigation.canGoBack ? navigation.canGoBack() : 'unknown',
            currentRoute: navigation.getCurrentRoute ? navigation.getCurrentRoute() : 'unknown'
        };

        console.log('🔍 Navigation inspection:', navigationInfo);

        Alert.alert(
            'Структура навигации',
            `Методы: ${navigationInfo.methods.join(', ')}\n\nМожет вернуться: ${navigationInfo.canGoBack}\n\nТекущий маршрут: ${JSON.stringify(navigationInfo.currentRoute, null, 2)}`,
            [{ text: 'OK' }]
        );
    };

    if (!__DEV__) return null;

    return (
        <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>🔧 Navigation Debug</Text>

            <TouchableOpacity style={styles.debugButton} onPress={testNavigation}>
                <Text style={styles.debugButtonText}>Тест навигации к остановке</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.debugButton} onPress={inspectNavigationStructure}>
                <Text style={styles.debugButtonText}>Проверить структуру навигации</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.debugButton}
                onPress={() => {
                    // Прямой тест с ID 13
                    try {
                        navigation.navigate('StopDetails', {
                            stopId: 13,
                            fromNotification: true,
                            debugTest: true
                        });
                    } catch (error) {
                        Alert.alert('Ошибка', error.message);
                    }
                }}
            >
                <Text style={styles.debugButtonText}>Быстрый тест (StopDetails, ID: 13)</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    debugContainer: {
        backgroundColor: '#fff3cd',
        padding: 16,
        margin: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffeaa7',
    },
    debugTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    debugButton: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 6,
        marginVertical: 4,
        alignItems: 'center',
    },
    debugButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

