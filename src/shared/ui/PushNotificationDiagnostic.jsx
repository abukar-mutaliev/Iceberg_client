import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Switch, Clipboard } from 'react-native';
import * as Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PushNotificationService } from '@shared/services/PushNotificationService';
import pushNotificationService from '@shared/services/PushNotificationService'; // ИСПРАВЛЕНО: Импортируем синглтон
import { pushTokenApi } from '@entities/notification/api/pushTokenApi';
import { useSelector } from 'react-redux';
import { selectUser, selectTokens } from '@entities/auth';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export const PushNotificationDiagnostic = () => {
    const [diagnosticData, setDiagnosticData] = useState({});
    const [loading, setLoading] = useState(false);
    const [localNotificationsEnabled, setLocalNotificationsEnabled] = useState(true);
    const [serverTokens, setServerTokens] = useState([]);
    const [testResults, setTestResults] = useState({});
    const [logs, setLogs] = useState([]);
    
    const user = useSelector(selectUser);
    const tokens = useSelector(selectTokens); 

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message, type };
        setLogs(prev => [...prev, logEntry]);
        console.log(`[${type.toUpperCase()}] ${message}`);
    };

    // НОВАЯ ФУНКЦИЯ: Получение всех логов в виде текста для копирования
    const getLogsAsText = () => {
        return logs.map(log => 
            `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
        ).join('\n');
    };

    // НОВАЯ ФУНКЦИЯ: Копирование логов в буфер обмена
    const copyLogsToClipboard = async () => {
        try {
            const logsText = getLogsAsText();
            if (logsText.trim()) {
                await Clipboard.setString(logsText);
                addLog('Логи скопированы в буфер обмена', 'success');
                Alert.alert('Успех', 'Логи скопированы в буфер обмена!');
            } else {
                addLog('Нет логов для копирования', 'warning');
                Alert.alert('Предупреждение', 'Нет логов для копирования');
            }
        } catch (error) {
            addLog(`Ошибка копирования логов: ${error.message}`, 'error');
            Alert.alert('Ошибка', `Не удалось скопировать логи: ${error.message}`);
        }
    };

    // НОВАЯ ФУНКЦИЯ: Сохранение логов в файл
    const saveLogsToFile = async () => {
        try {
            const logContent = logs.map(log => 
                `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
            ).join('\n');
            
            const fileName = `push-diagnostic-logs-${Date.now()}.txt`;
            const fileUri = `${FileSystem.documentDirectory}${fileName}`;
            
            await FileSystem.writeAsStringAsync(fileUri, logContent);
            
            Alert.alert(
                'Логи сохранены',
                `Файл сохранен: ${fileName}\nПуть: ${fileUri}`,
                [{ text: 'OK' }]
            );
            
            addLog(`Логи сохранены в файл: ${fileName}`, 'success');
        } catch (error) {
            addLog(`Ошибка сохранения логов: ${error.message}`, 'error');
            Alert.alert('Ошибка', `Не удалось сохранить логи: ${error.message}`);
        }
    };

    // НОВАЯ ФУНКЦИЯ: Очистка логов
    const clearLogs = () => {
        setLogs([]);
        addLog('Логи очищены', 'info');
    };

    // НОВАЯ ФУНКЦИЯ: Определение цвета логов
    const getLogColor = (type) => {
        switch (type) {
            case 'success':
                return '#d4edda';
            case 'error':
                return '#f8d7da';
            case 'warning':
                return '#fff3cd';
            case 'info':
            default:
                return '#d1ecf1';
        }
    };

    const runDiagnostic = async () => {
        setLoading(true);
        addLog('Запуск диагностики push-уведомлений', 'info');
        const data = {};

        try {
            // Device info
            data.device = {
                isDevice: Device.isDevice,
                deviceType: Device.deviceType,
                platform: Device.osName,
                osVersion: Device.osVersion,
                model: Device.modelName,
                brand: Device.brand,
                manufacturer: Device.manufacturer
            };
            addLog(`Устройство: ${Device.modelName} (${Device.osName} ${Device.osVersion})`, 'info');

            // Constants info
            data.constants = {
                expoVersion: Constants.expoVersion || 'Not available',
                appOwnership: Constants.appOwnership || 'Not available',
                isDetached: Constants.isDetached || false,
                executionEnvironment: Constants.executionEnvironment || 'Not available',
                projectId: Constants.expoConfig?.extra?.eas?.projectId || 
                           Constants.manifest2?.extra?.eas?.projectId ||
                           Constants.manifest?.extra?.eas?.projectId ||
                           'Not found',
                easProjectId: Constants.expoConfig?.extra?.eas?.projectId,
                manifest2ProjectId: Constants.manifest2?.extra?.eas?.projectId,
                manifestProjectId: Constants.manifest?.extra?.eas?.projectId
            };
            addLog(`Expo версия: ${Constants.expoVersion || 'Not available'}`, 'info');
            addLog(`Environment: ${Constants.executionEnvironment || 'Not available'}`, 'info');
            addLog(`App Ownership: ${Constants.appOwnership || 'Not available'}`, 'info');
            addLog(`Is Detached: ${Constants.isDetached || false}`, 'info');

            // Permissions
            try {
                const permissions = await Notifications.getPermissionsAsync();
                data.permissions = permissions;
                
                // Проверяем статус разрешений
                data.permissionStatus = {
                    granted: permissions.status === 'granted',
                    canAskAgain: permissions.canAskAgain,
                    status: permissions.status
                };
                addLog(`Разрешения: ${permissions.status}`, permissions.status === 'granted' ? 'success' : 'warning');
            } catch (error) {
                data.permissions = { error: error.message };
                addLog(`Ошибка получения разрешений: ${error.message}`, 'error');
            }

            // Push token
            try {
                const pushService = pushNotificationService;
                await pushService.initialize();
                const projectId = pushService.getProjectId();
                data.projectIdUsed = projectId;
                addLog(`ProjectId: ${projectId}`, 'info');
                
                // ИСПРАВЛЕНО: Получаем статус сервиса
                const serviceStatus = pushService.getServiceStatus();
                data.serviceStatus = serviceStatus;
                addLog(`Статус сервиса: ${serviceStatus.isInitialized ? 'инициализирован' : 'не инициализирован'}`, serviceStatus.isInitialized ? 'success' : 'warning');
                
                // ИСПРАВЛЕНО: Получаем текущий токен из сервиса
                const currentToken = pushService.getCurrentToken();
                if (currentToken) {
                    data.expoPushToken = {
                        success: true,
                        tokenLength: currentToken.length || 0,
                        tokenPrefix: currentToken.substring(0, 30) + '...',
                        fullToken: currentToken
                    };
                    addLog(`Push токен получен: ${currentToken.substring(0, 30)}...`, 'success');
                } else {
                    // Пытаемся получить токен напрямую
                    const expoPushToken = await Notifications.getExpoPushTokenAsync({ 
                        projectId: projectId 
                    });
                    data.expoPushToken = {
                        success: true,
                        tokenLength: expoPushToken.data?.length || 0,
                        tokenPrefix: expoPushToken.data?.substring(0, 30) + '...',
                        fullToken: expoPushToken.data
                    };
                    addLog(`Push токен получен напрямую: ${expoPushToken.data?.substring(0, 30)}...`, 'success');
                }
            } catch (error) {
                data.expoPushToken = { 
                    success: false, 
                    error: error.message 
                };
                addLog(`Ошибка получения push токена: ${error.message}`, 'error');
            }

            // Device push token (fallback)
            try {
                const deviceToken = await Notifications.getDevicePushTokenAsync();
                data.devicePushToken = {
                    success: true,
                    tokenType: typeof deviceToken.data,
                    tokenLength: deviceToken.data?.length || 0,
                    tokenData: deviceToken.data
                };
            } catch (error) {
                data.devicePushToken = { 
                    success: false, 
                    error: error.message 
                };
            }

            // Local storage check
            try {
                const localToken = await AsyncStorage.getItem('expoPushToken');
                data.localStorage = {
                    hasToken: !!localToken,
                    tokenLength: localToken?.length || 0,
                    tokenPrefix: localToken?.substring(0, 30) + '...'
                };
            } catch (error) {
                data.localStorage = { error: error.message };
            }

            // User info
            data.user = {
                id: user?.id,
                role: user?.role,
                email: user?.email,
                isAuthenticated: !!user,
                hasToken: !!user?.token,
                hasAccessToken: !!user?.accessToken,
                hasAuthToken: !!user?.authToken,
                tokenLength: user?.token?.length || 0,
                accessTokenLength: user?.accessToken?.length || 0,
                authTokenLength: user?.authToken?.length || 0,
                hasTokensObject: !!tokens,
                hasAccessTokenInTokens: !!tokens?.accessToken,
                accessTokenInTokensLength: tokens?.accessToken?.length || 0
            };

            // Notification channels (Android)
            if (Device.osName === 'Android') {
                try {
                    const channels = await Notifications.getNotificationChannelsAsync();
                    data.notificationChannels = {
                        count: channels.length,
                        channels: channels.map(ch => ({ id: ch.id, name: ch.name }))
                    };
                } catch (error) {
                    data.notificationChannels = { error: error.message };
                }
            }

        } catch (error) {
            data.generalError = error.message;
        }

        setDiagnosticData(data);
        setLoading(false);
    };

    const checkServerTokens = async () => {
        try {
            const response = await pushTokenApi.getUserPushTokens();
            if (response.status === 'success') {
                setServerTokens(response.data || []);
                return response;
            } else {
                console.error('Ошибка получения токенов с сервера:', response.message);
                return { data: [] };
            }
        } catch (error) {
            console.error('Ошибка получения токенов с сервера:', error);
            return { data: [] };
        }
    };

    // НОВАЯ ФУНКЦИЯ: Тест локального уведомления без цикла
    const testLocalNotification = async () => {
        addLog('🧪 Тест локального уведомления', 'info');
        
        try {
            const pushService = pushNotificationService;
            await pushService.initialize();
            
            // ИСПРАВЛЕНО: Создаем уведомление с уникальным типом чтобы избежать цикла
            const notificationId = await pushService.showLocalNotification({
                title: '🧪 Локальное уведомление',
                body: 'Это тестовое локальное уведомление',
                data: {
                    type: 'LOCAL_TEST',
                    test: true,
                    timestamp: Date.now()
                }
            });
            
            addLog(`✅ Локальное уведомление создано с ID: ${notificationId}`, 'success');
        } catch (error) {
            addLog(`❌ Ошибка создания локального уведомления: ${error.message}`, 'error');
        }
    };

    // НОВАЯ ФУНКЦИЯ: Тест серверного уведомления без цикла
    const testServerNotification = async () => {
        addLog('📡 Тест серверного уведомления', 'info');
        
        try {
            const pushService = pushNotificationService;
            await pushService.initialize();
            const currentToken = pushService.getCurrentToken();
            
            if (!currentToken) {
                addLog('❌ Нет токена для отправки уведомления', 'error');
                return;
            }
            
            addLog(`🎫 Используем токен: ${currentToken.substring(0, 30)}...`, 'info');
            
            const response = await fetch(`http://212.67.11.134:5000/api/push-tokens/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens?.accessToken || user?.token || user?.accessToken || user?.authToken}`
                },
                body: JSON.stringify({
                    token: currentToken,
                    title: '🌐 Серверный тест',
                    body: 'This is a test notification',
                    data: {
                        type: 'SERVER_TEST',
                        test: true,
                        timestamp: Date.now()
                    }
                })
            });
            
            const result = await response.json();
            addLog(`📋 Ответ сервера: ${JSON.stringify(result)}`, 'info');
            
            if (result.success) {
                addLog('✅ Серверное уведомление отправлено успешно', 'success');
            } else {
                addLog(`❌ Ошибка отправки: ${result.message}`, 'error');
            }
        } catch (error) {
            addLog(`❌ Ошибка серверного теста: ${error.message}`, 'error');
        }
    };

    const reinitializeService = async () => {
        try {
            setLoading(true);
            addLog('Переинициализация сервиса push-уведомлений', 'info');
            
            const pushService = pushNotificationService;
            const status = await pushService.forceInitialize();
            
            addLog(`Сервис переинициализирован: ${JSON.stringify(status)}`, 'success');
            Alert.alert('Успех', 'Сервис переинициализирован!');
        } catch (error) {
            addLog(`Ошибка переинициализации: ${error.message}`, 'error');
            Alert.alert('Ошибка', error.message);
        } finally {
            setLoading(false);
        }
    };

    const requestPermissions = async () => {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            Alert.alert(
                'Разрешения',
                `Статус разрешений: ${status}`,
                [{ text: 'OK' }]
            );
            runDiagnostic(); // Обновляем диагностику
        } catch (error) {
            Alert.alert('Ошибка', `Не удалось запросить разрешения: ${error.message}`);
        }
    };

    const clearAllNotifications = async () => {
        try {
            await Notifications.dismissAllNotificationsAsync();
            Alert.alert('Успех', 'Все уведомления очищены');
        } catch (error) {
            Alert.alert('Ошибка', `Не удалось очистить уведомления: ${error.message}`);
        }
    };



    // НОВАЯ ФУНКЦИЯ: Тест отправки уведомления через сервер
    const testServerPushNotification = async () => {
        addLog('📡 Тест отправки push-уведомления через сервер', 'info');
        
        try {
            const pushService = pushNotificationService;
            await pushService.initialize();
            const currentToken = pushService.getCurrentToken();
            
            if (!currentToken) {
                addLog('❌ Нет токена для отправки уведомления', 'error');
                return;
            }
            
            addLog(`🎫 Используем токен: ${currentToken.substring(0, 30)}...`, 'info');
            addLog('📤 Отправляем тестовое уведомление на сервер...', 'info');
            
            const response = await fetch(`http://212.67.11.134:5000/api/push-tokens/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens?.accessToken || user?.token || user?.accessToken || user?.authToken}`
                },
                body: JSON.stringify({
                    token: currentToken,
                    title: '🧪 Тест с диагностики',
                    body: `Тестовое уведомление отправлено в ${new Date().toLocaleTimeString()}`,
                    data: {
                        type: 'DIAGNOSTIC_TEST',
                        source: 'diagnostic_screen',
                        timestamp: Date.now()
                    }
                })
            });
            
            const result = await response.json();
            addLog(`📋 Ответ сервера: ${JSON.stringify(result)}`, 'info');
            
            if (result.success) {
                addLog('✅ Серверное уведомление отправлено успешно', 'success');
            } else {
                addLog(`❌ Ошибка отправки: ${result.message}`, 'error');
            }
        } catch (error) {
            addLog(`❌ Ошибка отправки push-уведомления: ${error.message}`, 'error');
        }
    };

    // НОВАЯ ФУНКЦИЯ: Тест обработки уведомлений
    const testNotificationHandling = async () => {
        addLog('🔔 Тест обработки push-уведомлений', 'info');
        
        try {
            const pushService = pushNotificationService;
            await pushService.initialize();
            
            // Проверяем статус обработчиков
            const status = pushService.getServiceStatus();
            addLog(`📊 Статус обработчиков: ${JSON.stringify(status)}`, 'info');
            
            // Создаем тестовое уведомление с данными для навигации
            await pushService.showLocalNotification({
                title: '🧪 Тест обработки',
                body: 'Нажмите для проверки обработки данных',
                data: {
                    type: 'stop',
                    stopId: '999',
                    url: 'iceberg://stop/999',
                    timestamp: Date.now(),
                    test: true
                }
            });
            
            addLog('✅ Тестовое уведомление создано с данными для навигации', 'success');
            
            Alert.alert(
                'Тест обработки',
                '1. Уведомление должно появиться\n' +
                '2. Нажмите на него\n' +
                '3. Проверьте, что данные обрабатываются\n' +
                '4. Посмотрите логи ниже',
                [{ text: 'OK' }]
            );
            
        } catch (error) {
            addLog(`❌ Ошибка тестирования обработки: ${error.message}`, 'error');
        }
    };

    // НОВАЯ ФУНКЦИЯ: Проверка настроек уведомлений
    const checkNotificationSettings = async () => {
        addLog('⚙️ Проверка настроек уведомлений', 'info');
        
        try {
            // Проверяем разрешения
            const permissions = await Notifications.getPermissionsAsync();
            addLog(`🔐 Разрешения: ${permissions.status}`, permissions.status === 'granted' ? 'success' : 'warning');
            
            // Проверяем каналы уведомлений (Android)
            if (Device.osName === 'Android') {
                const channels = await Notifications.getNotificationChannelsAsync();
                addLog(`📢 Каналы уведомлений: ${channels.length}`, 'info');
                channels.forEach(channel => {
                    addLog(`   - ${channel.name} (${channel.id})`, 'info');
                });
            }
            
            // Проверяем настройки звука
            const soundEnabled = await Notifications.getPermissionsAsync();
            addLog(`🔊 Звук уведомлений: ${soundEnabled.status === 'granted' ? 'включен' : 'выключен'}`, 'info');
            
            Alert.alert(
                'Настройки уведомлений',
                `Разрешения: ${permissions.status}\n` +
                `Каналы: ${Device.osName === 'Android' ? 'проверьте логи' : 'не применимо'}\n` +
                `Звук: ${soundEnabled.status === 'granted' ? 'включен' : 'выключен'}`,
                [{ text: 'OK' }]
            );
            
        } catch (error) {
            addLog(`❌ Ошибка проверки настроек: ${error.message}`, 'error');
        }
    };

    // НОВАЯ ФУНКЦИЯ: Тест получения уведомлений в реальном времени
    const testRealTimeNotifications = async () => {
        addLog('🔔 Тестирование получения push-уведомлений в реальном времени', 'info');
        
        try {
            const pushService = pushNotificationService;
            await pushService.initialize();
            
            const status = pushService.getServiceStatus();
            addLog(`📊 Статус сервиса: ${JSON.stringify(status)}`, 'info');
            
            // Показываем локальное уведомление для проверки
            await pushService.showLocalNotification({
                title: '🔔 Тест получения уведомлений',
                body: 'Это тестовое уведомление для проверки обработчиков',
                data: {
                    type: 'test',
                    stopId: 'test-123',
                    timestamp: Date.now()
                }
            });
            
            addLog('✅ Локальное уведомление отправлено для проверки обработчиков', 'success');
            
            Alert.alert(
                'Тест получения уведомлений',
                '1. Локальное уведомление должно появиться\n' +
                '2. Нажмите на него для проверки обработки\n' +
                '3. Проверьте логи в консоли\n' +
                '4. Затем создайте остановку на сервере для тестирования push-уведомлений',
                [
                    { text: 'OK' },
                    { 
                        text: 'Создать остановку', 
                        onPress: () => {
                            addLog('💡 Пользователь хочет создать тестовую остановку', 'info');
                        }
                    }
                ]
            );
            
        } catch (error) {
            addLog(`❌ Ошибка тестирования уведомлений: ${error.message}`, 'error');
        }
    };

    // НОВАЯ ФУНКЦИЯ: Исправление навигации
    const fixNavigation = async () => {
        addLog('🔧 Исправление навигации для push-уведомлений', 'info');
        
        try {
            const pushService = pushNotificationService; // ИСПРАВЛЕНО: Используем синглтон
            await pushService.initialize();
            
            // Устанавливаем навигацию как готовую
            pushService.setNavigationReady();
            
            // Проверяем статус после исправления
            const status = pushService.getServiceStatus();
            addLog(`📊 Статус после исправления: ${JSON.stringify(status)}`, 'info');
            
            if (status.navigationReady) {
                addLog('✅ Навигация исправлена и готова к работе', 'success');
                Alert.alert('Успех', 'Навигация исправлена! Теперь push-уведомления должны работать корректно.');
            } else {
                addLog('⚠️ Навигация все еще не готова', 'warning');
                Alert.alert('Предупреждение', 'Навигация все еще не готова. Возможно, нужно перезапустить приложение.');
            }
            
        } catch (error) {
            addLog(`❌ Ошибка исправления навигации: ${error.message}`, 'error');
        }
    };

    // НОВАЯ ФУНКЦИЯ: Тест получения push-уведомления с сервера
    const testReceivePushNotification = async () => {
        addLog('📨 Тест получения push-уведомления с сервера', 'info');
        
        try {
            // Получаем push токен
            const pushService = pushNotificationService;
            await pushService.initialize();
            const currentToken = pushService.getCurrentToken();
            
            if (!currentToken) {
                addLog('❌ Нет push-токена для тестирования', 'error');
                Alert.alert('Ошибка', 'Нет push-токена. Сначала получите токен.');
                return;
            }
            
            addLog(`🎫 Используем push-токен: ${currentToken.substring(0, 30)}...`, 'info');
            
            // Получаем токен авторизации
            const authToken = tokens?.accessToken || user?.token || user?.accessToken || user?.authToken;
            if (!authToken) {
                addLog('❌ Нет токена авторизации', 'error');
                Alert.alert('Ошибка', 'Нет токена авторизации. Войдите в систему заново.');
                return;
            }
            
            addLog('📤 Отправляем push-уведомление на сервер для получения...', 'info');
            
            const response = await fetch('http://212.67.11.134:5000/api/push-tokens/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    token: currentToken, // ИСПРАВЛЕНО: Добавляем токен
                    title: '📨 Тест получения',
                    body: `Проверьте, получили ли вы это уведомление в ${new Date().toLocaleTimeString()}`,
                    data: {
                        type: 'RECEIVE_TEST',
                        timestamp: Date.now(),
                        test: true,
                        url: 'iceberg://test/receive'
                    }
                })
            });
            
            const result = await response.json();
            addLog(`📋 Ответ сервера: ${JSON.stringify(result)}`, 'info');
            
            if (response.ok) {
                addLog('✅ Push-уведомление отправлено на сервер', 'success');
                Alert.alert(
                    'Уведомление отправлено',
                    'Проверьте, получили ли вы push-уведомление на устройстве.\n\n' +
                    'Если уведомление не пришло:\n' +
                    '1. Проверьте настройки уведомлений\n' +
                    '2. Убедитесь, что приложение не в фоне\n' +
                    '3. Попробуйте перезапустить приложение',
                    [{ text: 'OK' }]
                );
            } else {
                addLog(`❌ Ошибка сервера: ${result.message || 'Неизвестная ошибка'}`, 'error');
                Alert.alert('Ошибка', `Ошибка сервера: ${result.message || 'Неизвестная ошибка'}`);
            }
            
        } catch (error) {
            addLog(`❌ Ошибка отправки push-уведомления: ${error.message}`, 'error');
            Alert.alert('Ошибка', error.message);
        }
    };

    // НОВАЯ ФУНКЦИЯ: Проверка получения push-уведомлений
    const checkPushNotificationReceiving = async () => {
        addLog('🔍 Проверка получения push-уведомлений', 'info');
        
        try {
            const pushService = pushNotificationService;
            await pushService.initialize();
            
            const status = pushService.getServiceStatus();
            addLog(`📊 Статус сервиса: ${JSON.stringify(status)}`, 'info');
            
            // Проверяем обработчики
            if (status.isInitialized && status.hasToken) {
                addLog('✅ Сервис инициализирован и имеет токен', 'success');
                
                if (status.navigationReady) {
                    addLog('✅ Навигация готова к работе', 'success');
                } else {
                    addLog('⚠️ Навигация не готова', 'warning');
                }
                
                // Показываем локальное уведомление для проверки обработчиков
                await pushService.showLocalNotification({
                    title: '🔍 Проверка обработчиков',
                    body: 'Если вы видите это уведомление, обработчики работают',
                    data: {
                        type: 'CHECK_HANDLERS',
                        timestamp: Date.now(),
                        test: true
                    }
                });
                
                addLog('✅ Локальное уведомление отправлено для проверки обработчиков', 'success');
                
                Alert.alert(
                    'Проверка обработчиков',
                    '1. Локальное уведомление должно появиться\n' +
                    '2. Если уведомление появилось, обработчики работают\n' +
                    '3. Теперь попробуйте получить push-уведомление с сервера',
                    [
                        { text: 'OK' },
                        { 
                            text: 'Тест с сервера', 
                            onPress: () => {
                                testReceivePushNotification();
                            }
                        }
                    ]
                );
            } else {
                addLog('❌ Сервис не инициализирован или нет токена', 'error');
                Alert.alert('Ошибка', 'Сервис не инициализирован или нет токена.');
            }
            
        } catch (error) {
            addLog(`❌ Ошибка проверки: ${error.message}`, 'error');
        }
    };

    // НОВАЯ ФУНКЦИЯ: Проверка состояния навигации
    const checkNavigationState = async () => {
        addLog('🧭 Проверка состояния навигации', 'info');
        
        try {
            const pushService = pushNotificationService; // ИСПРАВЛЕНО: Используем синглтон
            await pushService.initialize();
            
            const status = pushService.getServiceStatus();
            addLog(`📊 Статус навигации: ${JSON.stringify({
                navigationReady: status.navigationReady,
                pendingNavigationsCount: status.pendingNavigationsCount,
                isInitialized: status.isInitialized,
                hasToken: status.hasToken
            })}`, 'info');
            
            if (status.navigationReady) {
                addLog('✅ Навигация готова к работе', 'success');
            } else {
                addLog('⚠️ Навигация не готова', 'warning');
                addLog('💡 Попробуйте нажать кнопку "🔧 Навигация" для исправления', 'info');
            }
            
            if (status.pendingNavigationsCount > 0) {
                addLog(`📋 Ожидающих навигаций: ${status.pendingNavigationsCount}`, 'info');
            }
            
            Alert.alert(
                'Состояние навигации',
                `Готова: ${status.navigationReady ? '✅ Да' : '❌ Нет'}\n` +
                `Ожидающих: ${status.pendingNavigationsCount}\n` +
                `Инициализирован: ${status.isInitialized ? '✅ Да' : '❌ Нет'}\n` +
                `Есть токен: ${status.hasToken ? '✅ Да' : '❌ Нет'}`,
                [{ text: 'OK' }]
            );
            
        } catch (error) {
            addLog(`❌ Ошибка проверки навигации: ${error.message}`, 'error');
        }
    };

    // НОВАЯ ФУНКЦИЯ: Принудительная установка навигации
    const forceSetNavigationReady = async () => {
        addLog('🔧 Принудительная установка навигации', 'info');
        
        try {
            const pushService = pushNotificationService; // ИСПРАВЛЕНО: Используем синглтон
            await pushService.initialize();
            
            // Принудительно устанавливаем навигацию как готовую
            pushService.setNavigationReady();
            
            // Проверяем результат
            const status = pushService.getServiceStatus();
            addLog(`📊 Статус после принудительной установки: ${JSON.stringify({
                navigationReady: status.navigationReady,
                pendingNavigationsCount: status.pendingNavigationsCount
            })}`, 'info');
            
            if (status.navigationReady) {
                addLog('✅ Навигация успешно установлена как готовая', 'success');
                Alert.alert('Успех', 'Навигация успешно установлена как готовая!');
            } else {
                addLog('❌ Не удалось установить навигацию', 'error');
                Alert.alert('Ошибка', 'Не удалось установить навигацию');
            }
            
        } catch (error) {
            addLog(`❌ Ошибка принудительной установки навигации: ${error.message}`, 'error');
        }
    };

    // НОВАЯ ФУНКЦИЯ: Принудительное обновление токена на сервере
    const forceUpdateTokenOnServer = async () => {
        addLog('🔄 Принудительное обновление токена на сервере', 'info');
        
        try {
            const pushService = pushNotificationService;
            await pushService.initialize();
            const currentToken = pushService.getCurrentToken();
            
            if (!currentToken) {
                addLog('❌ Нет токена для обновления', 'error');
                return;
            }
            
            addLog(`🎫 Обновляем токен: ${currentToken.substring(0, 30)}...`, 'info');
            
            // ДОБАВЛЕНО: Проверка для Expo Go
            const isExpoGo = Constants?.executionEnvironment === 'expo' || Constants?.appOwnership === 'expo';
            if (isExpoGo) {
                addLog('📱 Expo Go режим - токен обновляется только локально', 'info');
                await pushService.saveDeviceTokenLocally(currentToken);
                addLog('✅ Токен обновлен локально для Expo Go', 'success');
                Alert.alert('Expo Go режим', 'Токен обновлен локально. Для полного тестирования используйте preview сборку.');
                return;
            }
            
            addLog('🔄 Попытка сохранения токена на сервер...', 'info');
            const result = await pushService.saveTokenToServerSafe(currentToken, pushService.deviceId, Platform.OS);
            
            addLog(`📋 Результат сохранения: ${result}`, 'info');
            
            if (result) {
                addLog('✅ Токен успешно обновлен на сервере', 'success');
                Alert.alert('Успех', 'Токен успешно обновлен на сервере!');
            } else {
                addLog('❌ Не удалось обновить токен на сервере', 'error');
                Alert.alert('Ошибка', 'Не удалось обновить токен на сервере. Проверьте подключение к интернету.');
            }
        } catch (error) {
            addLog(`❌ Ошибка обновления токена: ${error.message}`, 'error');
        }
    };

    // НОВАЯ ФУНКЦИЯ: Тест preview сборки
    const testPreviewBuild = async () => {
        addLog('🚀 Тест preview сборки', 'info');
        
        try {
            const pushService = pushNotificationService;
            await pushService.initialize();
            
            // Проверяем определение типа сборки
            const isStandalone = pushService.isStandaloneBuild();
            const buildType = process.env.EXPO_PUBLIC_BUILD_TYPE;
            const isPreview = buildType === 'preview';
            
            addLog(`📱 Тип сборки: ${isStandalone ? 'Standalone' : 'Expo Go'}`, 'info');
            addLog(`🔧 Build Type: ${buildType || 'unknown'}`, 'info');
            addLog(`🎯 Preview: ${isPreview ? 'Да' : 'Нет'}`, 'info');
            
            if (isStandalone && isPreview) {
                addLog('✅ Preview сборка определена корректно', 'success');
                
                // Тестируем получение токена
                const currentToken = pushService.getCurrentToken();
                if (currentToken) {
                    addLog(`✅ Токен получен: ${currentToken.substring(0, 30)}...`, 'success');
                    
                    // Тестируем сохранение на сервер
                    addLog('🔄 Тестируем сохранение токена на сервер...', 'info');
                    const saved = await pushService.saveTokenToServerSafe(currentToken, pushService.deviceId, Platform.OS);
                    
                    if (saved) {
                        addLog('✅ Токен успешно сохранен на сервере', 'success');
                    } else {
                        addLog('❌ Не удалось сохранить токен на сервер', 'error');
                    }
                } else {
                    addLog('❌ Токен не получен', 'error');
                }
            } else {
                addLog('⚠️ Это не preview сборка', 'warning');
                addLog(`📋 Standalone: ${isStandalone}, Preview: ${isPreview}`, 'info');
            }
            
        } catch (error) {
            addLog(`❌ Ошибка тестирования preview сборки: ${error.message}`, 'error');
        }
    };

    // НОВАЯ ФУНКЦИЯ: Информация о режиме работы
    const showEnvironmentInfo = () => {
        const isExpoGo = Constants?.executionEnvironment === 'expo' || Constants?.appOwnership === 'expo';
        const isPreview = Constants?.buildType === 'preview' || Constants?.executionEnvironment === 'preview';
        const isStandalone = Constants?.appOwnership === 'standalone';
        
        let message = '';
        let title = '';
        
        if (isExpoGo) {
            title = 'Expo Go режим';
            message = 'Вы используете Expo Go.\n\n' +
                     '✅ Push-уведомления работают\n' +
                     '✅ Токен сохраняется локально\n' +
                     '⚠️ Серверные функции ограничены\n\n' +
                     'Для полного тестирования используйте preview сборку.';
        } else if (isPreview) {
            title = 'Preview режим';
            message = 'Вы используете preview сборку.\n\n' +
                     '✅ Полная функциональность\n' +
                     '✅ Push-уведомления с сервера\n' +
                     '✅ Сохранение токенов на сервере';
        } else if (isStandalone) {
            title = 'Production режим';
            message = 'Вы используете production сборку.\n\n' +
                     '✅ Полная функциональность\n' +
                     '✅ Push-уведомления с сервера\n' +
                     '✅ Сохранение токенов на сервере';
        } else {
            title = 'Неизвестный режим';
            message = 'Не удалось определить режим работы.\n\n' +
                     'Проверьте настройки приложения.';
        }
        
        Alert.alert(title, message, [{ text: 'OK' }]);
    };

    // НОВАЯ ФУНКЦИЯ: Принудительная остановка цикла
    const stopNotificationCycle = async () => {
        addLog('🛑 Принудительная остановка цикла уведомлений', 'info');
        
        try {
            const pushService = pushNotificationService;
            
            // Очищаем все уведомления
            await pushService.clearAllNotifications();
            addLog('✅ Все уведомления очищены', 'info');
            
            // Очищаем обработчики
            pushService.clearNotificationListeners();
            addLog('✅ Обработчики очищены', 'info');
            
            // Очищаем очередь навигации
            if (pushService.navigationQueue) {
                pushService.navigationQueue.length = 0;
                addLog('✅ Очередь навигации очищена', 'info');
            }
            
            addLog('✅ Цикл уведомлений остановлен', 'success');
            Alert.alert('Успех', 'Цикл уведомлений остановлен');
        } catch (error) {
            addLog(`❌ Ошибка остановки цикла: ${error.message}`, 'error');
        }
    };

    // НОВАЯ ФУНКЦИЯ: Переинициализация обработчиков
    const reinitializeHandlers = async () => {
        addLog('🔄 Переинициализация обработчиков уведомлений', 'info');
        
        try {
            const pushService = pushNotificationService;
            
            // Сначала очищаем старые обработчики
            pushService.clearNotificationListeners();
            addLog('✅ Старые обработчики очищены', 'info');
            
            // Затем настраиваем новые
            setTimeout(() => {
                pushService.setupNotificationListeners();
                addLog('✅ Новые обработчики настроены', 'success');
                Alert.alert('Успех', 'Обработчики уведомлений переинициализированы');
            }, 200);
            
        } catch (error) {
            addLog(`❌ Ошибка переинициализации: ${error.message}`, 'error');
        }
    };

    // НОВАЯ ФУНКЦИЯ: Очистка обработчиков уведомлений
    const clearNotificationHandlers = async () => {
        addLog('🧹 Очистка обработчиков уведомлений', 'info');
        
        try {
            const pushService = pushNotificationService;
            pushService.clearNotificationListeners();
            addLog('✅ Обработчики уведомлений очищены', 'success');
            Alert.alert('Успех', 'Обработчики уведомлений очищены');
        } catch (error) {
            addLog(`❌ Ошибка очистки обработчиков: ${error.message}`, 'error');
        }
    };

    // НОВАЯ ФУНКЦИЯ: Проверка соответствия токенов
    const checkTokenConsistency = async () => {
        addLog('🔍 Проверка соответствия токенов', 'info');
        
        try {
            const pushService = pushNotificationService;
            await pushService.initialize();
            const currentToken = pushService.getCurrentToken();
            
            if (!currentToken) {
                addLog('❌ Нет локального токена', 'error');
                return;
            }
            
            addLog(`🎫 Локальный токен: ${currentToken.substring(0, 30)}...`, 'info');
            
            // ДОБАВЛЕНО: Проверка для Expo Go
            const isExpoGo = Constants?.executionEnvironment === 'expo' || Constants?.appOwnership === 'expo';
            if (isExpoGo) {
                addLog('📱 Expo Go режим - токен сохранен только локально', 'info');
                Alert.alert(
                    'Expo Go режим',
                    'В Expo Go токен сохраняется только локально.\n\n' +
                    'Для полного тестирования push-уведомлений используйте preview или production сборку.',
                    [{ text: 'OK' }]
                );
                return;
            }
            
            // Получаем токены с сервера
            const serverTokensResponse = await checkServerTokens();
            const serverTokens = serverTokensResponse.data || [];
            
            if (serverTokens.length === 0) {
                addLog('❌ Нет токенов на сервере', 'error');
                Alert.alert('Предупреждение', 'На сервере нет токенов. Попробуйте обновить токен.');
                return;
            }
            
            // Проверяем соответствие
            const matchingToken = serverTokens.find(token => 
                token.token === currentToken || 
                (token.token && token.token.startsWith(currentToken.substring(0, 20)))
            );
            
            if (matchingToken) {
                addLog('✅ Токен найден на сервере', 'success');
                addLog(`📋 Серверный токен: ${matchingToken.token.substring(0, 30)}...`, 'info');
                Alert.alert('Успех', 'Токен найден на сервере!');
            } else {
                addLog('❌ Токен НЕ найден на сервере', 'error');
                addLog(`📋 Доступные токены на сервере:`, 'info');
                serverTokens.forEach((token, index) => {
                    addLog(`   ${index + 1}. ${token.token.substring(0, 30)}...`, 'info');
                });
                Alert.alert(
                    'Проблема', 
                    'Локальный токен не найден на сервере!\n\n' +
                    'Это означает, что push-уведомления не будут работать.\n\n' +
                    'Попробуйте обновить токен.',
                    [
                        { text: 'OK' },
                        { text: 'Обновить токен', onPress: forceUpdateTokenOnServer }
                    ]
                );
            }
            
        } catch (error) {
            addLog(`❌ Ошибка проверки токенов: ${error.message}`, 'error');
        }
    };

    // НОВАЯ ФУНКЦИЯ: Принудительное получение нового токена
    const forceGetNewToken = async () => {
        addLog('🔄 Принудительное получение нового токена', 'info');
        
        try {
            const pushService = pushNotificationService;
            await pushService.initialize();
            
            // Принудительно получаем новый токен
            const newToken = await pushService.registerForPushNotificationsAsync();
            
            if (newToken) {
                addLog(`✅ Новый токен получен: ${newToken.substring(0, 30)}...`, 'success');
                
                // Пытаемся сохранить на сервер
                try {
                    const saved = await pushService.saveTokenToServerSafe(newToken, pushService.deviceId, 'android');
                    if (saved) {
                        addLog('✅ Новый токен сохранен на сервере', 'success');
                        Alert.alert('Успех', 'Новый токен получен и сохранен на сервере!');
                    } else {
                        addLog('⚠️ Токен получен, но не сохранен на сервере', 'warning');
                        Alert.alert('Предупреждение', 'Новый токен получен, но не удалось сохранить на сервер.');
                    }
                } catch (saveError) {
                    addLog(`❌ Ошибка сохранения нового токена: ${saveError.message}`, 'error');
                    Alert.alert('Ошибка', `Не удалось сохранить новый токен: ${saveError.message}`);
                }
            } else {
                addLog('❌ Не удалось получить новый токен', 'error');
                Alert.alert('Ошибка', 'Не удалось получить новый токен.');
            }
            
        } catch (error) {
            addLog(`❌ Ошибка получения нового токена: ${error.message}`, 'error');
            Alert.alert('Ошибка', error.message);
        }
    };

    // ДОБАВЛЕНО: Функция для загрузки и отображения сохраненных логов
    const loadSavedLogs = async () => {
        try {
            const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
            const logFiles = files.filter(file => file.startsWith('push-diagnostic-logs-'));
            
            if (logFiles.length === 0) {
                addLog('📁 Сохраненных логов не найдено');
                return;
            }

            // Берем самый новый файл
            const latestLogFile = logFiles.sort().reverse()[0];
            const logContent = await FileSystem.readAsStringAsync(
                FileSystem.documentDirectory + latestLogFile
            );

            addLog(`📁 Загружен файл: ${latestLogFile}`);
            addLog(`📄 Размер файла: ${logContent.length} символов`);
            addLog('📋 СОДЕРЖИМОЕ ЛОГА:');
            addLog('='.repeat(50));
            
            // Разбиваем на строки и добавляем в логи
            const lines = logContent.split('\n');
            lines.forEach((line, index) => {
                if (line.trim()) {
                    addLog(`${index + 1}: ${line}`);
                }
            });
            
            addLog('='.repeat(50));
            addLog('✅ Логи загружены успешно');

        } catch (error) {
            addLog(`❌ Ошибка загрузки логов: ${error.message}`);
        }
    };

    // ДОБАВЛЕНО: Функция для очистки старых логов
    const clearOldLogs = async () => {
        try {
            const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
            const logFiles = files.filter(file => file.startsWith('push-diagnostic-logs-'));
            
            if (logFiles.length === 0) {
                addLog('📁 Старых логов не найдено');
                return;
            }

            // Удаляем все старые логи кроме самого нового
            const sortedFiles = logFiles.sort().reverse();
            const filesToDelete = sortedFiles.slice(1); // Оставляем только самый новый

            for (const file of filesToDelete) {
                await FileSystem.deleteAsync(FileSystem.documentDirectory + file);
                addLog(`🗑️ Удален файл: ${file}`);
            }

            addLog(`✅ Очищено ${filesToDelete.length} старых логов`);

        } catch (error) {
            addLog(`❌ Ошибка очистки логов: ${error.message}`);
        }
    };

    const renderValue = (value, label) => (
        <View style={styles.item}>
            <Text style={styles.label}>{label}:</Text>
            <Text style={styles.value}>
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </Text>
        </View>
    );

    const renderTestResult = (testName, result) => {
        if (!result) return null;
        
        return (
            <View style={styles.item}>
                <Text style={styles.label}>{testName}:</Text>
                <Text style={[styles.value, { color: result.success ? '#34C759' : '#FF3B30' }]}>
                    {result.success ? '✅ Успешно' : `❌ Ошибка: ${result.error}`}
                </Text>
            </View>
        );
    };

    useEffect(() => {
        runDiagnostic();
        checkServerTokens();
    }, []);

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>🔔 Push Notifications Diagnostic</Text>
            
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={runDiagnostic} disabled={loading}>
                    <Text style={styles.buttonText}>
                        {loading ? 'Проверка...' : '🔄 Обновить'}
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.button} onPress={requestPermissions}>
                    <Text style={styles.buttonText}>🔐 Разрешения</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#27AE60' }]}
                    onPress={checkNotificationSettings}
                >
                    <Text style={styles.buttonText}>⚙️ Настройки</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.testButton} onPress={checkServerTokens}>
                    <Text style={styles.buttonText}>📋 Токены</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#FF9500' }]}
                    onPress={forceGetNewToken}
                >
                    <Text style={styles.buttonText}>🔄 Новый токен</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#FF3B30' }]}
                    onPress={checkTokenConsistency}
                >
                    <Text style={styles.buttonText}>🔍 Проверить токен</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#9B59B6' }]}
                    onPress={testPreviewBuild}
                >
                    <Text style={styles.buttonText}>🚀 Preview тест</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.testButton]}
                    onPress={testLocalNotification}
                >
                    <Text style={styles.buttonText}>🧪 Локальное</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.testButton]}
                    onPress={testServerNotification}
                >
                    <Text style={styles.buttonText}>📡 Серверное</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#FF6B35' }]}
                    onPress={testServerPushNotification}
                >
                    <Text style={styles.buttonText}>🚀 Push тест</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#8E44AD' }]}
                    onPress={testNotificationHandling}
                >
                    <Text style={styles.buttonText}>🔔 Обработка</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#9B59B6' }]}
                    onPress={testRealTimeNotifications}
                >
                    <Text style={styles.buttonText}>🔔 Получение</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#3498DB' }]}
                    onPress={testReceivePushNotification}
                >
                    <Text style={styles.buttonText}>📨 Получить</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#E67E22' }]}
                    onPress={fixNavigation}
                >
                    <Text style={styles.buttonText}>🔧 Навигация</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#9B59B6' }]}
                    onPress={checkNavigationState}
                >
                    <Text style={styles.buttonText}>🧭 Навигация</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#E74C3C' }]}
                    onPress={forceSetNavigationReady}
                >
                    <Text style={styles.buttonText}>🔧 Установить</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#27AE60' }]}
                    onPress={testPreviewBuild}
                >
                    <Text style={styles.buttonText}>🚀 Preview тест</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#FF9500' }]}
                    onPress={forceUpdateTokenOnServer}
                >
                    <Text style={styles.buttonText}>🔄 Обновить токен</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#FF9500' }]}
                    onPress={loadSavedLogs}
                >
                    <Text style={styles.buttonText}>📁 Загрузить</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#FF3B30' }]}
                    onPress={clearNotificationHandlers}
                >
                    <Text style={styles.buttonText}>🧹 Очистить обработчики</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#27AE60' }]}
                    onPress={reinitializeHandlers}
                >
                    <Text style={styles.buttonText}>🔄 Переинициализировать</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#FF3B30' }]}
                    onPress={stopNotificationCycle}
                >
                    <Text style={styles.buttonText}>🛑 Остановить цикл</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#3498DB' }]}
                    onPress={showEnvironmentInfo}
                >
                    <Text style={styles.buttonText}>ℹ️ Режим работы</Text>
                </TouchableOpacity>
            </View>

            {Object.keys(diagnosticData).length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📊 Результаты диагностики:</Text>
                    
                    {diagnosticData.user && (
                        <View>
                            <Text style={styles.subTitle}>👤 Пользователь:</Text>
                            {Object.entries(diagnosticData.user).map(([key, value]) => 
                                <View key={key}>{renderValue(value, key)}</View>
                            )}
                        </View>
                    )}

                    {diagnosticData.device && (
                        <View>
                            <Text style={styles.subTitle}>📱 Устройство:</Text>
                            {Object.entries(diagnosticData.device).map(([key, value]) => 
                                <View key={key}>{renderValue(value, key)}</View>
                            )}
                        </View>
                    )}

                    {diagnosticData.constants && (
                        <View>
                            <Text style={styles.subTitle}>⚙️ Constants:</Text>
                            {Object.entries(diagnosticData.constants).map(([key, value]) => 
                                <View key={key}>{renderValue(value, key)}</View>
                            )}
                        </View>
                    )}

                    {diagnosticData.permissions && (
                        <View>
                            <Text style={styles.subTitle}>🔐 Разрешения:</Text>
                            {renderValue(diagnosticData.permissions, 'permissions')}
                        </View>
                    )}

                    {diagnosticData.permissionStatus && (
                        <View>
                            <Text style={styles.subTitle}>📋 Статус разрешений:</Text>
                            {Object.entries(diagnosticData.permissionStatus).map(([key, value]) => 
                                <View key={key}>{renderValue(value, key)}</View>
                            )}
                        </View>
                    )}

                    {diagnosticData.projectIdUsed && (
                        <View>
                            <Text style={styles.subTitle}>🔑 Project ID:</Text>
                            {renderValue(diagnosticData.projectIdUsed, 'Used Project ID')}
                        </View>
                    )}

                    {diagnosticData.expoPushToken && (
                        <View>
                            <Text style={styles.subTitle}>🎫 Expo Push Token:</Text>
                            {renderValue(diagnosticData.expoPushToken, 'Expo Token')}
                        </View>
                    )}

                    {diagnosticData.devicePushToken && (
                        <View>
                            <Text style={styles.subTitle}>📱 Device Push Token:</Text>
                            {renderValue(diagnosticData.devicePushToken, 'Device Token')}
                        </View>
                    )}

                    {diagnosticData.localStorage && (
                        <View>
                            <Text style={styles.subTitle}>💾 Локальное хранилище:</Text>
                            {renderValue(diagnosticData.localStorage, 'Local Storage')}
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🔧 Service Status:</Text>
                        <Text style={styles.infoText}>
                            {JSON.stringify(diagnosticData.serviceStatus, null, 2)}
                        </Text>
                        <TouchableOpacity 
                            style={styles.button} 
                            onPress={reinitializeService}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'Переинициализация...' : '🔄 Переинициализировать сервис'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* НОВАЯ СЕКЦИЯ: Информация о навигации */}
                    {diagnosticData.serviceStatus && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>🧭 Навигация:</Text>
                            <View style={styles.item}>
                                <Text style={styles.label}>Готова к работе:</Text>
                                <Text style={[styles.value, { 
                                    color: diagnosticData.serviceStatus.navigationReady ? '#34C759' : '#FF3B30' 
                                }]}>
                                    {diagnosticData.serviceStatus.navigationReady ? '✅ Да' : '❌ Нет'}
                                </Text>
                            </View>
                            <View style={styles.item}>
                                <Text style={styles.label}>Ожидающих навигаций:</Text>
                                <Text style={styles.value}>
                                    {diagnosticData.serviceStatus.pendingNavigationsCount || 0}
                                </Text>
                            </View>
                            <View style={styles.item}>
                                <Text style={styles.label}>Последняя ошибка:</Text>
                                <Text style={styles.value}>
                                    {diagnosticData.serviceStatus.lastError || 'Нет ошибок'}
                                </Text>
                            </View>
                        </View>
                    )}

                    {diagnosticData.notificationChannels && (
                        <View>
                            <Text style={styles.subTitle}>📢 Каналы уведомлений:</Text>
                            {renderValue(diagnosticData.notificationChannels, 'Channels')}
                        </View>
                    )}

                    {Object.keys(testResults).length > 0 && (
                        <View>
                            <Text style={styles.subTitle}>🧪 Результаты тестов:</Text>
                            {Object.entries(testResults).map(([testName, result]) => 
                                <View key={testName}>{renderTestResult(testName, result)}</View>
                            )}
                        </View>
                    )}

                    {serverTokens.length > 0 && (
                        <View>
                            <Text style={styles.subTitle}>📋 Токены на сервере:</Text>
                            {serverTokens.map((token, index) => (
                                <View key={index} style={styles.item}>
                                    <Text style={styles.label}>Токен {index + 1}:</Text>
                                    <Text style={styles.value}>
                                        {token.token?.substring(0, 50)}...
                                    </Text>
                                    <Text style={styles.value}>
                                        Активен: {token.isActive ? '✅' : '❌'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {diagnosticData.generalError && (
                        <View>
                            <Text style={styles.errorTitle}>❌ Общая ошибка:</Text>
                            {renderValue(diagnosticData.generalError, 'Error')}
                        </View>
                    )}

                    {/* НОВАЯ СЕКЦИЯ: Логи */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>📋 Логи:</Text>
                            <View style={styles.logsHeaderButtons}>
                                <TouchableOpacity
                                    style={styles.copyLogsButton}
                                    onPress={copyLogsToClipboard}
                                    disabled={logs.length === 0}
                                >
                                    <Text style={styles.copyLogsButtonText}>
                                        📋
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.clearLogsButton}
                                    onPress={clearLogs}
                                    disabled={logs.length === 0}
                                >
                                    <Text style={styles.clearLogsButtonText}>
                                        🗑️
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        <View style={styles.logsActionsContainer}>
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: '#007AFF', flex: 1, marginRight: 4 }]}
                                onPress={saveLogsToFile}
                                disabled={logs.length === 0}
                            >
                                <Text style={styles.buttonText}>
                                    💾 Сохранить
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: '#FF3B30', flex: 1, marginLeft: 4 }]}
                                onPress={clearOldLogs}
                                disabled={logs.length === 0}
                            >
                                <Text style={styles.buttonText}>
                                    🗑️ Старые
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.logCount}>
                            Записей в логе: {logs.length}
                        </Text>

                        <View style={styles.logsContainer}>
                            <ScrollView 
                                style={styles.logsScrollView} 
                                nestedScrollEnabled 
                                showsVerticalScrollIndicator={true}
                                contentContainerStyle={styles.logsContentContainer}
                            >
                                {logs.length === 0 ? (
                                    <Text style={styles.noLogsText}>
                                        Нет логов. Запустите тесты для создания логов.
                                    </Text>
                                ) : (
                                    logs.map((log, index) => (
                                        <View key={index} style={[
                                            styles.logListItem,
                                            { borderLeftColor: getLogColor(log.type) }
                                        ]}>
                                            <View style={styles.logItemHeader}>
                                                <Text style={styles.logItemTimestamp}>
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </Text>
                                                <Text style={styles.logItemType}>
                                                    {log.type.toUpperCase()}
                                                </Text>
                                            </View>
                                            <Text style={styles.logItemMessage}>
                                                {log.message}
                                            </Text>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 12,
        backgroundColor: '#f5f5f5'
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center'
    },
    buttonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 8,
        gap: 6
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 6,
        minWidth: 80,
        maxWidth: 120,
        marginBottom: 6
    },
    testButton: {
        backgroundColor: '#34C759',
        padding: 10,
        borderRadius: 6,
        minWidth: 80,
        maxWidth: 120,
        marginBottom: 6
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 10,
        lineHeight: 14
    },
    section: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    clearLogsButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4
    },
    clearLogsButtonText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold'
    },
    subTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 12,
        marginBottom: 6,
        color: '#333'
    },
    errorTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
        color: '#FF3B30'
    },
    item: {
        marginBottom: 6,
        padding: 6,
        backgroundColor: '#f8f8f8',
        borderRadius: 4
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        color: '#333',
        marginBottom: 2
    },
    value: {
        fontSize: 11,
        color: '#666',
        fontFamily: 'monospace'
    },
    infoText: {
        fontSize: 14,
        color: '#555',
        marginBottom: 10,
        fontFamily: 'monospace'
    },
    logCount: {
        fontSize: 14,
        color: '#555',
        marginTop: 8,
        marginBottom: 8,
        textAlign: 'center'
    },

    logsHeaderButtons: {
        flexDirection: 'row',
        gap: 4
    },
    copyLogsButton: {
        backgroundColor: '#34C759',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4
    },
    copyLogsButtonText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold'
    },
    logsActionsContainer: {
        flexDirection: 'row',
        marginBottom: 12
    },
    logsContainer: {
        height: 300,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        overflow: 'hidden',
        marginTop: 8
    },
    logsScrollView: {
        flex: 1,
        backgroundColor: '#ffffff'
    },
    logsContentContainer: {
        padding: 8,
        paddingBottom: 16
    },
    noLogsText: {
        textAlign: 'center',
        color: '#999',
        fontStyle: 'italic',
        padding: 20
    },
    logListItem: {
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        borderLeftWidth: 4,
        backgroundColor: '#ffffff',
        marginBottom: 2
    },
    logItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    logItemTimestamp: {
        fontSize: 10,
        color: '#666',
        fontFamily: 'monospace',
        fontWeight: '500'
    },
    logItemType: {
        fontSize: 9,
        color: '#888',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        paddingHorizontal: 4,
        paddingVertical: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 2
    },
    logItemMessage: {
        fontSize: 12,
        color: '#333',
        lineHeight: 16
    },
    logEntry: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 2,
        marginBottom: 2
    },
    logTimestamp: {
        fontSize: 10,
        color: '#888',
        marginRight: 8
    },
    logMessage: {
        fontSize: 12,
        color: '#333'
    }
});

export default PushNotificationDiagnostic; 