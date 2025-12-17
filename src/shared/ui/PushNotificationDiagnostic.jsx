import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Clipboard, AppState } from 'react-native';
import * as Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PushNotificationService } from '@shared/services/PushNotificationService';
import OneSignalService from '@shared/services/OneSignalService';
import { pushTokenApi } from '@entities/notification/api/pushTokenApi';
import { useSelector } from 'react-redux';
import { selectUser, selectTokens } from '@entities/auth';
import { Platform } from 'react-native';

export const PushNotificationDiagnostic = () => {
    const [diagnosticData, setDiagnosticData] = useState({});
    const [loading, setLoading] = useState(false);
    const [serverTokens, setServerTokens] = useState([]);
    const [logs, setLogs] = useState([]);
    
    const user = useSelector(selectUser);
    const tokens = useSelector(selectTokens); 

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message, type };
        setLogs(prev => [...prev, logEntry]);
        // Временно отключены логи OneSignal
        // console.log(`[${type.toUpperCase()}] ${message}`);
    };

    // Копирование логов в буфер обмена
    const copyLogsToClipboard = async () => {
        try {
            const logsText = logs.map(log => 
                `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
            ).join('\n');
            
            if (logsText.trim()) {
                await Clipboard.setString(logsText);
                addLog('Логи скопированы в буфер обмена', 'success');
                Alert.alert('Успех', 'Логи скопированы в буфер обмена!');
            } else {
                Alert.alert('Предупреждение', 'Нет логов для копирования');
            }
        } catch (error) {
            addLog(`Ошибка копирования логов: ${error.message}`, 'error');
            Alert.alert('Ошибка', `Не удалось скопировать логи: ${error.message}`);
        }
    };

    // Очистка логов
    const clearLogs = () => {
        setLogs([]);
        addLog('Логи очищены', 'info');
    };

    // Определение цвета логов
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

    // Основная диагностика OneSignal
    const runOneSignalDiagnostic = async () => {
        setLoading(true);
        addLog('🚀 Запуск OneSignal диагностики', 'info');
        const data = {};

        try {
            // Device info
            data.device = {
                isDevice: Device.isDevice,
                platform: Device.osName,
                osVersion: Device.osVersion,
                model: Device.modelName,
                brand: Device.brand,
            };
            addLog(`📱 Устройство: ${Device.modelName} (${Device.osName} ${Device.osVersion})`, 'info');

            // App info
            data.app = {
                expoVersion: Constants.expoVersion || 'Not available',
                executionEnvironment: Constants.executionEnvironment || 'Not available',
                buildType: process.env.EXPO_PUBLIC_BUILD_TYPE || 'Not available',
                isStandalone: Constants.appOwnership === 'standalone',
            };
            addLog(`🏗️ Build Type: ${data.app.buildType}`, 'info');
            addLog(`📦 Environment: ${data.app.executionEnvironment}`, 'info');

            // User info
            data.user = {
                id: user?.id,
                role: user?.role,
                email: user?.email,
                isAuthenticated: !!user,
            };
            addLog(`👤 Пользователь: ${user?.email} (ID: ${user?.id})`, user ? 'success' : 'warning');

            // OneSignal Service Status
            try {
                const oneSignalStatus = OneSignalService.getStatus();
                data.oneSignalService = oneSignalStatus;
                addLog(`🔔 OneSignal инициализирован: ${oneSignalStatus.isInitialized}`, oneSignalStatus.isInitialized ? 'success' : 'warning');
                addLog(`🎫 OneSignal Player ID: ${oneSignalStatus.hasSubscription ? 'есть' : 'нет'}`, oneSignalStatus.hasSubscription ? 'success' : 'warning');
                if (oneSignalStatus.currentUserId) {
                    addLog(`👤 OneSignal User ID: ${oneSignalStatus.currentUserId}`, 'info');
                }
            } catch (error) {
                data.oneSignalService = { error: error.message };
                addLog(`❌ Ошибка OneSignal Service: ${error.message}`, 'error');
            }

            // Push Notification Service Status
            try {
                const pushServiceStatus = PushNotificationService.getServiceStatus();
                data.pushService = pushServiceStatus;
                addLog(`📬 Push Service инициализирован: ${pushServiceStatus.isInitialized}`, pushServiceStatus.isInitialized ? 'success' : 'warning');
                addLog(`🧭 Навигация готова: ${pushServiceStatus.navigationReady}`, pushServiceStatus.navigationReady ? 'success' : 'warning');

                // Расширенная диагностика FCM и подписки
                try {
                    const extendedDiag = await PushNotificationService.diagnostics(user);
                    data.extendedDiagnostics = extendedDiag;
                    addLog(`🔍 Расширенная диагностика FCM завершена`, 'info');
                } catch (diagError) {
                    addLog(`⚠️ Ошибка расширенной диагностики: ${diagError.message}`, 'warning');
                }
            } catch (error) {
                data.pushService = { error: error.message };
                addLog(`❌ Ошибка Push Service: ${error.message}`, 'error');
            }

        } catch (error) {
            data.generalError = error.message;
            addLog(`❌ Общая ошибка диагностики: ${error.message}`, 'error');
        }

        setDiagnosticData(data);
        setLoading(false);
        addLog('✅ Диагностика завершена', 'success');
    };

    // Инициализация OneSignal
    const initializeOneSignal = async () => {
        addLog('🚀 Инициализация OneSignal', 'info');
        
        try {
            const appId = 'a1bde379-4211-4fb9-89e2-3e94530a7041';
            const result = await OneSignalService.initialize(appId);
            
            if (result) {
                addLog('✅ OneSignal инициализирован успешно', 'success');
                
                // Проверяем статус после инициализации
                const status = OneSignalService.getStatus();
                addLog(`📊 Статус после инициализации: ${JSON.stringify(status)}`, 'info');
            } else {
                addLog('❌ Не удалось инициализировать OneSignal', 'error');
            }
        } catch (error) {
            addLog(`❌ Ошибка инициализации OneSignal: ${error.message}`, 'error');
        }
    };

    // Инициализация OneSignal для пользователя
    const initializeOneSignalForUser = async () => {
        if (!user) {
            addLog('❌ Нет авторизованного пользователя', 'error');
            Alert.alert('Ошибка', 'Войдите в систему для инициализации OneSignal');
            return;
        }

        addLog(`👤 Инициализация OneSignal для пользователя ${user.id}`, 'info');
        
        try {
            const result = await OneSignalService.initializeForUser(user);
            
            if (result) {
                addLog('✅ OneSignal настроен для пользователя', 'success');
                
                // Получаем Player ID
                const playerId = OneSignalService.getCurrentSubscriptionId();
                if (playerId) {
                    addLog(`🎫 OneSignal Player ID: ${playerId}`, 'success');
                } else {
                    addLog('⚠️ Player ID не получен', 'warning');
                }
                
                // Обновляем диагностику
                runOneSignalDiagnostic();
            } else {
                addLog('❌ Не удалось настроить OneSignal для пользователя', 'error');
            }
        } catch (error) {
            addLog(`❌ Ошибка настройки OneSignal для пользователя: ${error.message}`, 'error');
        }
    };

    // Получение Player ID
    const getOneSignalPlayerId = async () => {
        addLog('🎫 Получение OneSignal Player ID', 'info');
        
        try {
            const playerId = await OneSignalService.getSubscriptionId();
            
            if (playerId) {
                addLog(`✅ Player ID получен: ${playerId}`, 'success');
                Alert.alert('Player ID получен', `Player ID: ${playerId}`);
                
                // Копируем в буфер обмена
                await Clipboard.setString(playerId);
                addLog('📋 Player ID скопирован в буфер обмена', 'info');
            } else {
                addLog('❌ Player ID не получен', 'error');
                Alert.alert('Ошибка', 'Player ID не получен. Убедитесь что OneSignal инициализирован.');
            }
        } catch (error) {
            addLog(`❌ Ошибка получения Player ID: ${error.message}`, 'error');
        }
    };

    // Проверка токенов на сервере
    const checkServerTokens = async () => {
        addLog('📋 Проверка токенов на сервере', 'info');
        
        try {
            const response = await pushTokenApi.getUserPushTokens();
            if (response.status === 'success') {
                const tokens = response.data || [];
                setServerTokens(tokens);
                
                addLog(`📊 Найдено токенов на сервере: ${tokens.length}`, tokens.length > 0 ? 'success' : 'warning');
                
                if (Array.isArray(tokens)) {
                    tokens.forEach((token, index) => {
                        addLog(`  ${index + 1}. ${token.tokenType || 'unknown'}: ${token.token ? token.token.substring(0, 40) + '...' : 'no token'}`, 'info');
                    });
                    
                    // Проверяем OneSignal токены
                    const oneSignalTokens = tokens.filter(t => t.tokenType === 'onesignal');
                    if (oneSignalTokens.length > 0) {
                        addLog(`✅ OneSignal токенов: ${oneSignalTokens.length}`, 'success');
                    } else {
                        addLog('⚠️ OneSignal токенов не найдено', 'warning');
                    }
                } else {
                    addLog('⚠️ Токены не являются массивом', 'warning');
                }
                
                return response;
            } else {
                addLog(`❌ Ошибка получения токенов: ${response.message}`, 'error');
                return { data: [] };
            }
        } catch (error) {
            addLog(`❌ Ошибка запроса токенов: ${error.message}`, 'error');
            return { data: [] };
        }
    };

    // Отправка тестового push уведомления
    const sendTestPushNotification = async () => {
        addLog('📨 Отправка тестового push-уведомления', 'info');
        
        try {
            if (!user) {
                addLog('❌ Нет авторизованного пользователя', 'error');
                Alert.alert('Ошибка', 'Войдите в систему');
                return;
            }

            const authToken = tokens?.accessToken || user?.token || user?.accessToken;
            if (!authToken) {
                addLog('❌ Нет токена авторизации', 'error');
                Alert.alert('Ошибка', 'Нет токена авторизации');
                return;
            }

            // Получаем Player ID для тестового уведомления
            addLog('🔍 Получаем Player ID для тестового уведомления...', 'info');
            const playerId = await OneSignalService.getSubscriptionId(); // Используем асинхронный метод
            
            addLog(`🎫 Player ID из сервиса: ${playerId || 'null/undefined'}`, playerId ? 'success' : 'warning');
            
            if (!playerId) {
                addLog('❌ Нет OneSignal Player ID для тестового уведомления', 'error');
                addLog('💡 Попробуйте сначала нажать "🎫 Player ID" или "👤 Для пользователя"', 'info');
                Alert.alert('Ошибка', 'Сначала получите OneSignal Player ID через кнопку "🎫 Player ID"');
                return;
            }

            addLog(`📤 Отправляем запрос на сервер с Player ID: ${playerId}...`, 'info');
            
            const response = await fetch('http://212.67.11.134:5000/api/push-tokens/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    token: playerId, // Передаем OneSignal Player ID
                    title: '🧪 OneSignal Test',
                    message: `Тест OneSignal от ${new Date().toLocaleTimeString()}`,
                    data: {
                        type: 'ONESIGNAL_TEST',
                        timestamp: Date.now(),
                        source: 'diagnostic_screen'
                    }
                })
            });
            
            const result = await response.json();
            addLog(`📋 Ответ сервера: ${JSON.stringify(result)}`, 'info');
            
            if (response.ok && result.success) {
                addLog('✅ Тестовое уведомление отправлено успешно', 'success');
                Alert.alert('Успех', 'Тестовое уведомление отправлено! Проверьте получение на устройстве.');
            } else {
                addLog(`❌ Ошибка отправки: ${result.message || 'Неизвестная ошибка'}`, 'error');
                Alert.alert('Ошибка', `Ошибка: ${result.message || 'Неизвестная ошибка'}`);
            }
        } catch (error) {
            addLog(`❌ Ошибка отправки push-уведомления: ${error.message}`, 'error');
            Alert.alert('Ошибка', error.message);
        }
    };

    // Установка тегов пользователя
    const setUserTags = async () => {
        addLog('🏷️ Установка пользовательских тегов', 'info');
        
        try {
            const tags = {
                user_id: user?.id?.toString() || 'unknown',
                user_role: user?.role || 'unknown',
                platform: Platform.OS,
                app_version: Constants.expoVersion || '1.0.0',
                test_user: 'true'
            };
            
            await OneSignalService.setUserTags(tags);
            addLog(`✅ Теги установлены: ${JSON.stringify(tags)}`, 'success');
            Alert.alert('Успех', 'Пользовательские теги установлены!');
        } catch (error) {
            addLog(`❌ Ошибка установки тегов: ${error.message}`, 'error');
        }
    };

    // Очистка контекста OneSignal
    const clearOneSignalContext = async () => {
        addLog('🧹 Очистка контекста OneSignal', 'info');
        
        try {
            await OneSignalService.clearUserContext();
            addLog('✅ Контекст OneSignal очищен', 'success');
            Alert.alert('Успех', 'Контекст OneSignal очищен');
            
            // Обновляем диагностику
            runOneSignalDiagnostic();
        } catch (error) {
            addLog(`❌ Ошибка очистки контекста: ${error.message}`, 'error');
        }
    };

    // Принудительная регистрация токена
    const forceTokenRegistration = async () => {
        addLog('🔄 Принудительная регистрация OneSignal токена', 'info');
        
        try {
            if (!user) {
                addLog('❌ Нет авторизованного пользователя', 'error');
                Alert.alert('Ошибка', 'Войдите в систему');
                return;
            }

            // Инициализируем Push Service для пользователя
            const result = await PushNotificationService.initializeForUser(user);
            
            if (result) {
                addLog('✅ Push Service инициализирован для пользователя', 'success');
                
                // Проверяем что токен сохранился на сервере
                setTimeout(async () => {
                    await checkServerTokens();
                }, 1000);
            } else {
                addLog('❌ Не удалось инициализировать Push Service', 'error');
            }
        } catch (error) {
            addLog(`❌ Ошибка принудительной регистрации: ${error.message}`, 'error');
        }
    };

    // Тест отправки сообщения в чат (для проверки уведомлений)
    const testChatMessage = async () => {
        addLog('💬 Тест уведомлений чата', 'info');
        
        try {
            Alert.alert(
                'Тест чата',
                'Для проверки OneSignal уведомлений:\n\n' +
                '1. Убедитесь что у вас есть OneSignal Player ID\n' +
                '2. Зайдите в любой чат\n' +
                '3. Попросите кого-то отправить вам сообщение\n' +
                '4. Проверьте получение уведомления\n\n' +
                'Или используйте кнопку "📨 Тест Push"',
                [{ text: 'OK' }]
            );
            
            addLog('💡 Показана инструкция для тестирования чата', 'info');
        } catch (error) {
            addLog(`❌ Ошибка: ${error.message}`, 'error');
        }
    };

    // ========== НОВЫЕ РАСШИРЕННЫЕ ТЕСТЫ ==========

    // Тест локального уведомления (через Expo Notifications)
    const testLocalNotification = async () => {
        addLog('🔔 Тест ЛОКАЛЬНОГО уведомления (Expo)', 'info');
        
        try {
            // Проверяем разрешения
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            addLog(`📋 Текущие разрешения: ${existingStatus}`, existingStatus === 'granted' ? 'success' : 'warning');
            
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                addLog('🔐 Запрашиваем разрешения...', 'info');
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
                addLog(`📋 Новый статус разрешений: ${finalStatus}`, finalStatus === 'granted' ? 'success' : 'error');
            }
            
            if (finalStatus !== 'granted') {
                addLog('❌ Разрешения на уведомления не предоставлены', 'error');
                Alert.alert('Ошибка', 'Разрешения на уведомления не предоставлены');
                return;
            }

            // Отправляем локальное уведомление
            addLog('📤 Отправляем локальное уведомление...', 'info');
            
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '🧪 Локальный тест',
                    body: `Это локальное уведомление от ${new Date().toLocaleTimeString()}`,
                    data: { 
                        type: 'LOCAL_TEST',
                        timestamp: Date.now(),
                        source: 'diagnostic_local'
                    },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.MAX,
                },
                trigger: null, // Немедленно
            });
            
            addLog(`✅ Локальное уведомление отправлено! ID: ${notificationId}`, 'success');
            addLog('💡 Если уведомление появилось - Expo Notifications работает', 'info');
            addLog('💡 Если не появилось - проблема с системными разрешениями', 'warning');
            
        } catch (error) {
            addLog(`❌ Ошибка локального уведомления: ${error.message}`, 'error');
        }
    };

    // Расширенная диагностика OneSignal
    const runExtendedOneSignalDiagnostic = async () => {
        addLog('🔬 Запуск РАСШИРЕННОЙ диагностики OneSignal', 'info');
        addLog('=' .repeat(50), 'info');
        
        try {
            // 1. Проверка SDK
            addLog('1️⃣ Проверка OneSignal SDK...', 'info');
            let oneSignal = null;
            try {
                const OneSignalModule = require('react-native-onesignal');
                oneSignal = OneSignalModule.default || OneSignalModule.OneSignal || OneSignalModule;
                addLog(`✅ OneSignal SDK загружен: ${typeof oneSignal}`, 'success');
            } catch (e) {
                addLog(`❌ OneSignal SDK НЕ загружен: ${e.message}`, 'error');
                return;
            }

            // 2. Проверка App ID
            addLog('2️⃣ Проверка App ID...', 'info');
            const appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || 
                          Constants?.expoConfig?.extra?.oneSignalAppId || 
                          'a1bde379-4211-4fb9-89e2-3e94530a7041';
            addLog(`📱 App ID: ${appId}`, appId ? 'success' : 'error');

            // 3. Проверка разрешений
            addLog('3️⃣ Проверка разрешений уведомлений...', 'info');
            try {
                const hasPermission = await oneSignal.Notifications.getPermissionAsync();
                addLog(`🔔 Разрешения OneSignal: ${hasPermission ? 'GRANTED' : 'DENIED'}`, hasPermission ? 'success' : 'error');
            } catch (e) {
                addLog(`⚠️ Не удалось проверить разрешения: ${e.message}`, 'warning');
            }

            // 4. Проверка подписки (opt-in)
            addLog('4️⃣ Проверка статуса подписки (opt-in)...', 'info');
            try {
                if (oneSignal.User?.pushSubscription) {
                    const optedIn = await oneSignal.User.pushSubscription.getOptedInAsync();
                    addLog(`📬 Opt-In статус: ${optedIn ? 'ПОДПИСАН' : 'НЕ ПОДПИСАН'}`, optedIn ? 'success' : 'error');
                    
                    if (!optedIn) {
                        addLog('💡 Попробуйте нажать "✅ Принудительный Opt-In"', 'warning');
                    }
                } else {
                    addLog('⚠️ pushSubscription недоступен', 'warning');
                }
            } catch (e) {
                addLog(`⚠️ Ошибка проверки opt-in: ${e.message}`, 'warning');
            }

            // 5. Проверка Player ID
            addLog('5️⃣ Проверка Player ID (Subscription ID)...', 'info');
            try {
                if (oneSignal.User?.pushSubscription?.getIdAsync) {
                    const playerId = await oneSignal.User.pushSubscription.getIdAsync();
                    addLog(`🎫 Player ID: ${playerId || 'НЕ ПОЛУЧЕН'}`, playerId ? 'success' : 'error');
                    
                    if (!playerId) {
                        addLog('💡 Player ID отсутствует - уведомления не будут доставлены!', 'error');
                    }
                } else {
                    addLog('⚠️ getIdAsync недоступен', 'warning');
                }
            } catch (e) {
                addLog(`⚠️ Ошибка получения Player ID: ${e.message}`, 'warning');
            }

            // 6. Проверка FCM/Push Token
            addLog('6️⃣ Проверка FCM/Push Token...', 'info');
            try {
                if (oneSignal.User?.pushSubscription?.getTokenAsync) {
                    const token = await oneSignal.User.pushSubscription.getTokenAsync();
                    if (token) {
                        addLog(`🔑 FCM Token: ${token.substring(0, 50)}...`, 'success');
                        addLog(`📏 Длина токена: ${token.length} символов`, 'info');
                    } else {
                        addLog('❌ FCM Token: НЕ ПОЛУЧЕН', 'error');
                        addLog('💡 Это критическая проблема! Проверьте google-services.json', 'error');
                    }
                } else {
                    addLog('⚠️ getTokenAsync недоступен', 'warning');
                }
            } catch (e) {
                addLog(`⚠️ Ошибка получения FCM Token: ${e.message}`, 'warning');
            }

            // 7. Проверка External User ID
            addLog('7️⃣ Проверка External User ID...', 'info');
            try {
                const externalId = OneSignalService.currentUserId;
                addLog(`👤 External User ID: ${externalId || 'НЕ УСТАНОВЛЕН'}`, externalId ? 'success' : 'warning');
            } catch (e) {
                addLog(`⚠️ Ошибка: ${e.message}`, 'warning');
            }

            // 8. Состояние приложения
            addLog('8️⃣ Состояние приложения...', 'info');
            const appState = AppState.currentState;
            addLog(`📱 App State: ${appState}`, appState === 'active' ? 'success' : 'warning');
            if (appState === 'active') {
                addLog('💡 Приложение активно - heads-up уведомления должны показываться', 'info');
            }

            // 9. Проверка сервиса
            addLog('9️⃣ Статус OneSignalService...', 'info');
            const serviceStatus = OneSignalService.getStatus();
            addLog(`📊 isInitialized: ${serviceStatus.isInitialized}`, serviceStatus.isInitialized ? 'success' : 'error');
            addLog(`📊 hasSubscription: ${serviceStatus.hasSubscription}`, serviceStatus.hasSubscription ? 'success' : 'error');
            addLog(`📊 currentUserId: ${serviceStatus.currentUserId || 'нет'}`, serviceStatus.currentUserId ? 'success' : 'warning');

            addLog('=' .repeat(50), 'info');
            addLog('✅ Расширенная диагностика завершена', 'success');
            
        } catch (error) {
            addLog(`❌ Ошибка расширенной диагностики: ${error.message}`, 'error');
        }
    };

    // Принудительный Opt-In
    const forceOptIn = async () => {
        addLog('✅ Принудительный Opt-In...', 'info');
        
        try {
            const OneSignalModule = require('react-native-onesignal');
            const oneSignal = OneSignalModule.default || OneSignalModule.OneSignal || OneSignalModule;
            
            if (oneSignal?.User?.pushSubscription?.optIn) {
                addLog('📤 Вызываем optIn()...', 'info');
                await oneSignal.User.pushSubscription.optIn();
                addLog('✅ optIn() выполнен успешно', 'success');
                
                // Проверяем результат
                setTimeout(async () => {
                    try {
                        const optedIn = await oneSignal.User.pushSubscription.getOptedInAsync();
                        addLog(`📬 Новый Opt-In статус: ${optedIn ? 'ПОДПИСАН' : 'НЕ ПОДПИСАН'}`, optedIn ? 'success' : 'error');
                        
                        const playerId = await oneSignal.User.pushSubscription.getIdAsync();
                        addLog(`🎫 Player ID после optIn: ${playerId || 'НЕ ПОЛУЧЕН'}`, playerId ? 'success' : 'error');
                    } catch (e) {
                        addLog(`⚠️ Ошибка проверки: ${e.message}`, 'warning');
                    }
                }, 2000);
                
            } else {
                addLog('❌ optIn() недоступен', 'error');
            }
        } catch (error) {
            addLog(`❌ Ошибка Opt-In: ${error.message}`, 'error');
        }
    };

    // Проверка каналов уведомлений Android
    const checkNotificationChannels = async () => {
        addLog('📢 Проверка каналов уведомлений Android...', 'info');
        
        if (Platform.OS !== 'android') {
            addLog('⚠️ Каналы уведомлений только для Android', 'warning');
            return;
        }
        
        try {
            // Получаем все каналы
            const channels = await Notifications.getNotificationChannelsAsync();
            addLog(`📊 Найдено каналов: ${channels?.length || 0}`, 'info');
            
            if (channels && channels.length > 0) {
                channels.forEach((channel, index) => {
                    addLog(`--- Канал ${index + 1} ---`, 'info');
                    addLog(`  ID: ${channel.id}`, 'info');
                    addLog(`  Имя: ${channel.name}`, 'info');
                    addLog(`  Важность: ${channel.importance} (4=HIGH, 5=MAX)`, 
                        channel.importance >= 4 ? 'success' : 'warning');
                    addLog(`  Звук: ${channel.sound ? 'ДА' : 'НЕТ'}`, channel.sound ? 'success' : 'warning');
                    addLog(`  Вибрация: ${channel.enableVibrate ? 'ДА' : 'НЕТ'}`, 'info');
                    addLog(`  Lights: ${channel.enableLights ? 'ДА' : 'НЕТ'}`, 'info');
                });
            } else {
                addLog('⚠️ Каналы не найдены или пустой список', 'warning');
            }
            
            // Проверяем канал OneSignal по умолчанию
            addLog('🔍 Ищем OneSignal каналы...', 'info');
            const onesignalChannels = channels?.filter(c => 
                c.id?.toLowerCase().includes('onesignal') || 
                c.name?.toLowerCase().includes('onesignal')
            );
            
            if (onesignalChannels && onesignalChannels.length > 0) {
                addLog(`✅ Найдено OneSignal каналов: ${onesignalChannels.length}`, 'success');
            } else {
                addLog('⚠️ OneSignal каналы не найдены - будет создан автоматически', 'warning');
            }
            
        } catch (error) {
            addLog(`❌ Ошибка проверки каналов: ${error.message}`, 'error');
        }
    };

    // Создание канала с МАКСИМАЛЬНОЙ важностью для Samsung
    const createHighPriorityChannel = async () => {
        addLog('🔊 Создание канала с МАКСИМАЛЬНОЙ важностью...', 'info');
        
        if (Platform.OS !== 'android') {
            addLog('⚠️ Только для Android', 'warning');
            return;
        }
        
        try {
            // Удаляем старый канал если есть
            try {
                await Notifications.deleteNotificationChannelAsync('iceberg-high-priority');
                addLog('🗑️ Старый канал удален', 'info');
            } catch (e) {
                // Игнорируем если канала не было
            }
            
            // Создаем новый канал с МАКСИМАЛЬНОЙ важностью
            await Notifications.setNotificationChannelAsync('iceberg-high-priority', {
                name: 'Iceberg Уведомления',
                importance: Notifications.AndroidImportance.MAX, // 5 - максимальная
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
                sound: 'default',
                enableVibrate: true,
                enableLights: true,
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                bypassDnd: true, // Обходить режим "Не беспокоить"
            });
            
            addLog('✅ Канал "iceberg-high-priority" создан с IMPORTANCE_MAX', 'success');
            addLog('💡 Теперь тестируем уведомление через этот канал...', 'info');
            
            // Тестируем через новый канал
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '🔊 Тест HIGH PRIORITY канала',
                    body: `Samsung тест - ${new Date().toLocaleTimeString()}`,
                    data: { type: 'HIGH_PRIORITY_TEST' },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.MAX,
                },
                trigger: null,
            });
            
            addLog(`✅ Уведомление отправлено через HIGH PRIORITY канал! ID: ${notificationId}`, 'success');
            
            // Проверяем что канал создан
            const channels = await Notifications.getNotificationChannelsAsync();
            const newChannel = channels?.find(c => c.id === 'iceberg-high-priority');
            if (newChannel) {
                addLog(`📊 Канал создан с важностью: ${newChannel.importance}`, 
                    newChannel.importance >= 4 ? 'success' : 'warning');
            }
            
        } catch (error) {
            addLog(`❌ Ошибка создания канала: ${error.message}`, 'error');
        }
    };

    // Тест уведомления через OneSignal REST API напрямую
    const testOneSignalDirectAPI = async () => {
        addLog('📡 Тест через OneSignal REST API напрямую...', 'info');
        
        try {
            const playerId = await OneSignalService.getSubscriptionId();
            if (!playerId) {
                addLog('❌ Нет Player ID', 'error');
                return;
            }
            
            addLog(`🎫 Player ID: ${playerId}`, 'info');
            addLog('📤 Отправляем через сервер...', 'info');
            
            const authToken = tokens?.accessToken || user?.token || user?.accessToken;
            if (!authToken) {
                addLog('❌ Нет токена авторизации', 'error');
                return;
            }
            
            // Отправляем через наш сервер
            const response = await fetch('http://212.67.11.134:5000/api/notifications/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    token: playerId,
                    title: '🧪 Direct API Test',
                    body: `Тест ${new Date().toLocaleTimeString()}`,
                    data: {
                        type: 'CHAT_MESSAGE', // Важно! Использует heads-up параметры
                        roomId: 'test_room',
                        timestamp: Date.now()
                    }
                })
            });
            
            const result = await response.json();
            addLog(`📋 Ответ сервера: ${JSON.stringify(result)}`, result.success ? 'success' : 'error');
            
            if (result.success) {
                addLog('✅ Уведомление отправлено через OneSignal API', 'success');
                addLog('⏱️ Ожидайте 3-5 секунд для получения...', 'info');
            } else {
                addLog(`❌ Ошибка: ${result.message || result.error}`, 'error');
                if (result.details) {
                    addLog(`📋 Детали: ${JSON.stringify(result.details)}`, 'warning');
                }
            }
            
        } catch (error) {
            addLog(`❌ Ошибка API: ${error.message}`, 'error');
        }
    };

    // Проверка настроек Samsung
    const checkSamsungSettings = () => {
        addLog('📱 Инструкция для Samsung...', 'info');
        addLog('=' .repeat(50), 'info');
        
        addLog('🔹 ШАГ 1: Настройки → Уведомления', 'warning');
        addLog('   → Дополнительные настройки', 'info');
        addLog('   → "Всплывающие уведомления" → ВКЛ', 'info');
        
        addLog('🔹 ШАГ 2: Настройки → Приложения → Iceberg', 'warning');
        addLog('   → Уведомления → ВСЕ категории ВКЛ', 'info');
        addLog('   → Важность: "Срочные"', 'info');
        addLog('   → Всплывающие → ВКЛ', 'info');
        
        addLog('🔹 ШАГ 3: Стиль всплывающих уведомлений', 'warning');
        addLog('   → "Краткий" или "Подробный"', 'info');
        
        addLog('🔹 ШАГ 4: Режим энергосбережения', 'warning');
        addLog('   → Убедитесь что Iceberg НЕ ограничен', 'info');
        addLog('   → Настройки → Батарея → Iceberg → Не ограничивать', 'info');
        
        addLog('=' .repeat(50), 'info');
        
        Alert.alert(
            '📱 Настройки Samsung',
            '1. Настройки → Уведомления → Дополнительные → Всплывающие → ВКЛ\n\n' +
            '2. Настройки → Приложения → Iceberg → Уведомления → Все ВКЛ + Важность: Срочные\n\n' +
            '3. Настройки → Батарея → Iceberg → Не ограничивать\n\n' +
            '4. После настроек нажмите "🔊 HIGH канал"',
            [{ text: 'OK' }]
        );
    };

    // Тест с задержкой (для foreground)
    const testDelayedNotification = async () => {
        addLog('⏱️ Тест с задержкой 5 секунд...', 'info');
        addLog('💡 Сверните приложение в течение 5 секунд!', 'warning');
        
        try {
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '⏱️ Отложенный тест',
                    body: `Уведомление с задержкой 5 сек - ${new Date().toLocaleTimeString()}`,
                    data: { type: 'DELAYED_TEST' },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.MAX,
                },
                trigger: {
                    seconds: 5,
                },
            });
            
            addLog(`✅ Уведомление запланировано через 5 сек! ID: ${notificationId}`, 'success');
            
            // Обратный отсчёт
            for (let i = 5; i > 0; i--) {
                setTimeout(() => {
                    addLog(`⏱️ ${i}...`, 'info');
                }, (5 - i) * 1000);
            }
            
        } catch (error) {
            addLog(`❌ Ошибка: ${error.message}`, 'error');
        }
    };

    // Полный сброс и переинициализация
    const fullReset = async () => {
        addLog('🔄 Полный сброс и переинициализация...', 'info');
        
        try {
            // 1. Очистка контекста
            addLog('1️⃣ Очистка контекста OneSignal...', 'info');
            await OneSignalService.clearUserContext();
            addLog('✅ Контекст очищен', 'success');
            
            // 2. Переинициализация
            addLog('2️⃣ Переинициализация OneSignal...', 'info');
            const appId = 'a1bde379-4211-4fb9-89e2-3e94530a7041';
            const initResult = await OneSignalService.initialize(appId);
            addLog(`📱 Инициализация: ${initResult ? 'УСПЕХ' : 'ОШИБКА'}`, initResult ? 'success' : 'error');
            
            // 3. Настройка для пользователя
            if (user) {
                addLog('3️⃣ Настройка для пользователя...', 'info');
                const userResult = await OneSignalService.initializeForUser(user);
                addLog(`👤 Настройка для пользователя: ${userResult ? 'УСПЕХ' : 'ОШИБКА'}`, userResult ? 'success' : 'error');
            }
            
            // 4. Проверка результата
            addLog('4️⃣ Проверка результата...', 'info');
            await runExtendedOneSignalDiagnostic();
            
        } catch (error) {
            addLog(`❌ Ошибка сброса: ${error.message}`, 'error');
        }
    };

    // Проверка настроек системных уведомлений
    const checkSystemNotificationSettings = async () => {
        addLog('⚙️ Проверка системных настроек уведомлений...', 'info');
        
        try {
            // Expo Notifications permissions
            const { status, canAskAgain, ios, android } = await Notifications.getPermissionsAsync();
            
            addLog(`📋 Статус разрешений: ${status}`, status === 'granted' ? 'success' : 'error');
            addLog(`🔄 Можно запросить снова: ${canAskAgain ? 'ДА' : 'НЕТ'}`, 'info');
            
            if (Platform.OS === 'android' && android) {
                addLog('--- Android настройки ---', 'info');
                addLog(`  Importance: ${android.importance}`, android.importance >= 3 ? 'success' : 'warning');
            }
            
            if (Platform.OS === 'ios' && ios) {
                addLog('--- iOS настройки ---', 'info');
                addLog(`  Alert: ${ios.allowsAlert ? 'ДА' : 'НЕТ'}`, ios.allowsAlert ? 'success' : 'warning');
                addLog(`  Sound: ${ios.allowsSound ? 'ДА' : 'НЕТ'}`, ios.allowsSound ? 'success' : 'warning');
                addLog(`  Badge: ${ios.allowsBadge ? 'ДА' : 'НЕТ'}`, 'info');
            }
            
            // Device info
            addLog('--- Устройство ---', 'info');
            addLog(`  Физическое устройство: ${Device.isDevice ? 'ДА' : 'НЕТ (эмулятор)'}`, Device.isDevice ? 'success' : 'warning');
            addLog(`  Бренд: ${Device.brand}`, 'info');
            addLog(`  Модель: ${Device.modelName}`, 'info');
            addLog(`  OS: ${Device.osName} ${Device.osVersion}`, 'info');
            
            if (!Device.isDevice) {
                addLog('⚠️ Push-уведомления могут не работать на эмуляторе!', 'warning');
            }
            
            if (Device.brand?.toLowerCase().includes('samsung')) {
                addLog('💡 Samsung: Проверьте Settings → Notifications → Advanced → Floating notifications', 'warning');
            }
            
        } catch (error) {
            addLog(`❌ Ошибка: ${error.message}`, 'error');
        }
    };

    // Экспорт всех логов для отправки
    const exportAllLogs = async () => {
        addLog('📤 Экспорт всех логов...', 'info');
        
        try {
            // Добавляем системную информацию
            const systemInfo = {
                timestamp: new Date().toISOString(),
                device: {
                    brand: Device.brand,
                    model: Device.modelName,
                    os: `${Device.osName} ${Device.osVersion}`,
                    isDevice: Device.isDevice,
                },
                user: {
                    id: user?.id,
                    email: user?.email,
                    role: user?.role,
                },
                oneSignal: OneSignalService.getStatus(),
            };
            
            const fullExport = `
=== PUSH NOTIFICATION DIAGNOSTIC EXPORT ===
Дата: ${systemInfo.timestamp}

=== СИСТЕМНАЯ ИНФОРМАЦИЯ ===
${JSON.stringify(systemInfo, null, 2)}

=== ЛОГИ ===
${logs.map(log => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`).join('\n')}

=== КОНЕЦ ЭКСПОРТА ===
`;
            
            await Clipboard.setString(fullExport);
            addLog('✅ Полный экспорт скопирован в буфер обмена!', 'success');
            Alert.alert('Экспорт готов', 'Логи скопированы в буфер обмена. Вставьте их в чат для анализа.');
            
        } catch (error) {
            addLog(`❌ Ошибка экспорта: ${error.message}`, 'error');
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

    useEffect(() => {
        runOneSignalDiagnostic();
        checkServerTokens();
    }, []);

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>🔔 OneSignal Diagnostic</Text>
            
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={runOneSignalDiagnostic} disabled={loading}>
                    <Text style={styles.buttonText}>
                        {loading ? 'Проверка...' : '🔄 Диагностика'}
                    </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.button, { backgroundColor: '#34C759' }]} onPress={initializeOneSignal}>
                    <Text style={styles.buttonText}>🚀 Инициализация</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#FF9500' }]} onPress={initializeOneSignalForUser}>
                    <Text style={styles.buttonText}>👤 Для пользователя</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#9B59B6' }]} onPress={getOneSignalPlayerId}>
                    <Text style={styles.buttonText}>🎫 Player ID</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#3498DB' }]} onPress={forceTokenRegistration}>
                    <Text style={styles.buttonText}>🔄 Регистрация</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#E74C3C' }]} onPress={sendTestPushNotification}>
                    <Text style={styles.buttonText}>📨 Тест Push</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, { backgroundColor: '#27AE60' }]} onPress={setUserTags}>
                    <Text style={styles.buttonText}>🏷️ Теги</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#F39C12' }]} onPress={checkServerTokens}>
                    <Text style={styles.buttonText}>📋 Токены сервера</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#8E44AD' }]} onPress={testChatMessage}>
                    <Text style={styles.buttonText}>💬 Тест чата</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#E67E22' }]} onPress={clearOneSignalContext}>
                    <Text style={styles.buttonText}>🧹 Очистить</Text>
                </TouchableOpacity>
            </View>

            {/* Новые расширенные тесты */}
            <Text style={styles.sectionDivider}>🔬 Расширенные тесты</Text>
            
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, { backgroundColor: '#00BCD4' }]} onPress={testLocalNotification}>
                    <Text style={styles.buttonText}>🔔 Локальный тест</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#673AB7' }]} onPress={runExtendedOneSignalDiagnostic}>
                    <Text style={styles.buttonText}>🔬 Полная диагн.</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#4CAF50' }]} onPress={forceOptIn}>
                    <Text style={styles.buttonText}>✅ Opt-In</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#FF5722' }]} onPress={checkNotificationChannels}>
                    <Text style={styles.buttonText}>📢 Каналы</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, { backgroundColor: '#795548' }]} onPress={testDelayedNotification}>
                    <Text style={styles.buttonText}>⏱️ Тест 5 сек</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#607D8B' }]} onPress={checkSystemNotificationSettings}>
                    <Text style={styles.buttonText}>⚙️ Системные</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#F44336' }]} onPress={fullReset}>
                    <Text style={styles.buttonText}>🔄 Полный сброс</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#2196F3' }]} onPress={exportAllLogs}>
                    <Text style={styles.buttonText}>📤 Экспорт</Text>
                </TouchableOpacity>
            </View>

            {/* Samsung специфичные тесты */}
            <Text style={styles.sectionDivider}>📱 Samsung / Android 16</Text>
            
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, { backgroundColor: '#1565C0' }]} onPress={checkSamsungSettings}>
                    <Text style={styles.buttonText}>📱 Samsung инстр.</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#D32F2F' }]} onPress={createHighPriorityChannel}>
                    <Text style={styles.buttonText}>🔊 HIGH канал</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#7B1FA2' }]} onPress={testOneSignalDirectAPI}>
                    <Text style={styles.buttonText}>📡 API тест</Text>
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

                    {diagnosticData.app && (
                        <View>
                            <Text style={styles.subTitle}>🏗️ Приложение:</Text>
                            {Object.entries(diagnosticData.app).map(([key, value]) => 
                                <View key={key}>{renderValue(value, key)}</View>
                            )}
                        </View>
                    )}

                    {diagnosticData.oneSignalService && (
                        <View>
                            <Text style={styles.subTitle}>🔔 OneSignal Service:</Text>
                            {renderValue(diagnosticData.oneSignalService, 'OneSignal Status')}
                        </View>
                    )}

                    {diagnosticData.pushService && (
                        <View>
                            <Text style={styles.subTitle}>📬 Push Service:</Text>
                            {renderValue(diagnosticData.pushService, 'Push Service Status')}
                        </View>
                    )}

                    {serverTokens.length > 0 && (
                        <View>
                            <Text style={styles.subTitle}>📋 Токены на сервере:</Text>
                            {serverTokens.map((token, index) => (
                                <View key={index} style={styles.item}>
                                    <Text style={styles.label}>Токен {index + 1}:</Text>
                                    <Text style={styles.value}>
                                        Тип: {token.tokenType || 'unknown'}
                                    </Text>
                                    <Text style={styles.value}>
                                        Токен: {token.token?.substring(0, 50)}...
                                    </Text>
                                    <Text style={[styles.value, { color: token.isActive ? '#34C759' : '#FF3B30' }]}>
                                        Активен: {token.isActive ? '✅' : '❌'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {diagnosticData.generalError && (
                        <View>
                            <Text style={styles.errorTitle}>❌ Ошибка:</Text>
                            {renderValue(diagnosticData.generalError, 'Error')}
                        </View>
                    )}
                </View>
            )}

            {/* Логи */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>📋 Логи:</Text>
                    <View style={styles.logsHeaderButtons}>
                        <TouchableOpacity
                            style={styles.copyLogsButton}
                            onPress={copyLogsToClipboard}
                            disabled={logs.length === 0}
                        >
                            <Text style={styles.copyLogsButtonText}>📋</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.clearLogsButton}
                            onPress={clearLogs}
                            disabled={logs.length === 0}
                        >
                            <Text style={styles.clearLogsButtonText}>🗑️</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                
                <Text style={styles.logCount}>
                    Записей в логе: {logs.length}
                </Text>

                <View style={styles.logsContainer}>
                    <ScrollView 
                        style={styles.logsScrollView} 
                        nestedScrollEnabled 
                        showsVerticalScrollIndicator={true}
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
    sectionDivider: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 12,
        marginBottom: 8,
        textAlign: 'center',
        backgroundColor: '#e0e0e0',
        paddingVertical: 6,
        borderRadius: 4
    }
});

export default PushNotificationDiagnostic;