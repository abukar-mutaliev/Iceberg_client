import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Clipboard, Linking } from 'react-native';
import * as Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PushNotificationService } from '@shared/services/PushNotificationService';
import OneSignalService from '@shared/services/OneSignalService';
import { pushTokenApi } from '@entities/notification/api/pushTokenApi';
import { useSelector } from 'react-redux';
import { selectUser, selectTokens } from '@entities/auth';
import { Platform, AppState } from 'react-native';

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

    // Проверка версии сервисов
    const checkServicesVersion = () => {
        addLog('🔍 Проверка версии сервисов...', 'info');
        
        try {
            const oneSignalVersion = OneSignalService.getVersion ? OneSignalService.getVersion() : 'unknown';
            addLog(`📦 OneSignalService версия: ${oneSignalVersion}`, oneSignalVersion.includes('fix') ? 'success' : 'warning');
            
            if (!oneSignalVersion.includes('fix')) {
                addLog('⚠️ ВНИМАНИЕ: Код не обновился! Нужен перезапуск приложения или пересборка', 'warning');
                Alert.alert(
                    'Код не обновлен',
                    'OneSignalService имеет старую версию. Попробуйте:\n\n' +
                    '1. Закрыть и открыть приложение заново\n' +
                    '2. Удалить и переустановить приложение\n\n' +
                    'Версия: ' + oneSignalVersion
                );
            } else {
                addLog('✅ Код обновлен, используется версия с исправлениями!', 'success');
            }
        } catch (error) {
            addLog(`❌ Ошибка проверки версии: ${error.message}`, 'error');
        }
    };

    // Основная диагностика OneSignal
    const runOneSignalDiagnostic = async () => {
        setLoading(true);
        addLog('🚀 Запуск OneSignal диагностики', 'info');
        
        // Проверяем версию
        checkServicesVersion();
        
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

    // Инициализация OneSignal для пользователя с детальными логами
    const initializeOneSignalForUser = async () => {
        if (!user) {
            addLog('❌ Нет авторизованного пользователя', 'error');
            Alert.alert('Ошибка', 'Войдите в систему для инициализации OneSignal');
            return;
        }

        addLog(`👤 Начинаем инициализацию для пользователя ${user.id}`, 'info');
        
        try {
            // Проверяем что SDK загружен
            addLog('🔍 Проверка загрузки OneSignal SDK...', 'info');
            try {
                const OneSignalModule = require('react-native-onesignal');
                const oneSignal = OneSignalModule.default || OneSignalModule.OneSignal || OneSignalModule;
                
                if (oneSignal) {
                    addLog('✅ OneSignal SDK загружен', 'success');
                    addLog(`📋 API доступны: Notifications=${!!oneSignal.Notifications}, User=${!!oneSignal.User}`, 'info');
                } else {
                    addLog('❌ OneSignal SDK не загружен!', 'error');
                    return;
                }
            } catch (sdkError) {
                addLog(`❌ Ошибка загрузки SDK: ${sdkError.message}`, 'error');
                return;
            }

            // Проверяем разрешения ПЕРЕД инициализацией
            addLog('🔍 Проверка разрешений на уведомления...', 'info');
            try {
                const OneSignalModule = require('react-native-onesignal');
                const oneSignal = OneSignalModule.default || OneSignalModule.OneSignal || OneSignalModule;
                
                if (oneSignal?.Notifications?.hasPermission) {
                    const hasPermission = await oneSignal.Notifications.hasPermission();
                    addLog(`🔔 Разрешения: ${hasPermission ? 'ЕСТЬ ✅' : 'НЕТ ❌'}`, hasPermission ? 'success' : 'warning');
                    
                    if (!hasPermission) {
                        addLog('⚠️ Запрашиваем разрешения...', 'warning');
                        const granted = await oneSignal.Notifications.requestPermission(true);
                        addLog(`🔔 Разрешения ${granted ? 'предоставлены ✅' : 'отклонены ❌'}`, granted ? 'success' : 'error');
                    }
                }
            } catch (permError) {
                addLog(`⚠️ Не удалось проверить разрешения: ${permError.message}`, 'warning');
            }

            addLog('🚀 Вызываем OneSignalService.initializeForUser...', 'info');
            
            // Вместо вызова initializeForUser, делаем все шаги вручную с логированием
            try {
                // Шаг 1: Инициализация SDK
                addLog('📝 Шаг 1: Базовая инициализация OneSignal...', 'info');
                const appId = 'a1bde379-4211-4fb9-89e2-3e94530a7041';
                const baseInitResult = await OneSignalService.initialize(appId);
                
                if (!baseInitResult) {
                    addLog('❌ Базовая инициализация не удалась', 'error');
                    return;
                }
                addLog('✅ Базовая инициализация выполнена', 'success');
                
                // Шаг 2: Устанавливаем External User ID
                addLog(`📝 Шаг 2: Устанавливаем External User ID: ${user.id}`, 'info');
                try {
                    const OneSignalModule = require('react-native-onesignal');
                    const oneSignal = OneSignalModule.default || OneSignalModule.OneSignal || OneSignalModule;
                    
                    if (oneSignal?.login) {
                        await oneSignal.login(user.id.toString());
                        addLog('✅ External User ID установлен', 'success');
                    } else {
                        addLog('❌ Метод login недоступен', 'error');
                        return;
                    }
                } catch (loginError) {
                    addLog(`❌ Ошибка login: ${loginError.message}`, 'error');
                    return;
                }
                
                // Шаг 3: Ожидание регистрации устройства
                addLog('⏱️ Шаг 3: Ожидаем регистрацию устройства (5 секунд)...', 'info');
                await new Promise(resolve => setTimeout(resolve, 5000));
                addLog('✅ Ожидание завершено', 'success');
                
                // Шаг 4: Попытки получить Player ID
                addLog('📝 Шаг 4: Получаем Player ID (макс 5 попыток)...', 'info');
                
                const OneSignalModule = require('react-native-onesignal');
                const oneSignal = OneSignalModule.default || OneSignalModule.OneSignal || OneSignalModule;
                
                let subscriptionId = null;
                const maxRetries = 5;
                const delayMs = 2000;
                
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    addLog(`🔄 Попытка ${attempt}/${maxRetries}...`, 'info');
                    
                    try {
                        if (oneSignal?.User?.pushSubscription?.getIdAsync) {
                            subscriptionId = await oneSignal.User.pushSubscription.getIdAsync();
                            
                            if (subscriptionId) {
                                addLog(`✅ Player ID получен на попытке ${attempt}: ${subscriptionId.substring(0, 20)}...`, 'success');
                                break;
                            } else {
                                addLog(`⚠️ Player ID null на попытке ${attempt}`, 'warning');
                            }
                        } else {
                            addLog('❌ Метод getIdAsync недоступен', 'error');
                            break;
                        }
                    } catch (getIdError) {
                        addLog(`❌ Ошибка getIdAsync на попытке ${attempt}: ${getIdError.message}`, 'error');
                    }
                    
                    if (attempt < maxRetries) {
                        addLog(`⏱️ Ожидаем ${delayMs}ms перед следующей попыткой...`, 'info');
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                    }
                }
                
                if (!subscriptionId) {
                    addLog('❌ Player ID не получен после всех попыток', 'error');
                    
                    // Дополнительная диагностика
                    addLog('🔍 Дополнительная диагностика...', 'info');
                    
                    try {
                        // Проверяем FCM токен
                        if (oneSignal?.User?.pushSubscription?.getTokenAsync) {
                            const fcmToken = await oneSignal.User.pushSubscription.getTokenAsync();
                            addLog(`🔍 FCM Token: ${fcmToken ? fcmToken.substring(0, 30) + '...' : 'NULL ❌'}`, fcmToken ? 'success' : 'error');
                        }
                        
                        // Проверяем opted in
                        if (oneSignal?.User?.pushSubscription?.getOptedIn) {
                            const optedIn = await oneSignal.User.pushSubscription.getOptedIn();
                            addLog(`🔍 Opted In: ${optedIn ? 'TRUE ✅' : 'FALSE ❌'}`, optedIn ? 'success' : 'error');
                            
                            if (!optedIn) {
                                addLog('💡 Устройство не подписано! Возможно проблема с OneSignal App ID или Firebase', 'warning');
                            }
                        }
                        
                        // Проверяем permission
                        if (oneSignal?.Notifications?.hasPermission) {
                            const hasPermission = await oneSignal.Notifications.hasPermission();
                            addLog(`🔍 Has Permission: ${hasPermission ? 'TRUE ✅' : 'FALSE ❌'}`, hasPermission ? 'success' : 'error');
                        }
                    } catch (diagError) {
                        addLog(`❌ Ошибка дополнительной диагностики: ${diagError.message}`, 'error');
                    }
                    
                    return;
                }
                
                // Шаг 5: Сохраняем токен на сервер
                addLog('📝 Шаг 5: Сохраняем токен на сервер...', 'info');
                try {
                    const { createProtectedRequest } = require('@shared/api/api');
                    const tokenData = {
                        token: subscriptionId,
                        deviceId: subscriptionId,
                        platform: Platform.OS,
                        tokenType: 'onesignal'
                    };
                    
                    const response = await createProtectedRequest('post', '/api/push-tokens', tokenData);
                    
                    if (response) {
                        addLog('✅ Токен успешно сохранен на сервер!', 'success');
                    } else {
                        addLog('⚠️ Пустой ответ от сервера', 'warning');
                    }
                } catch (saveError) {
                    addLog(`❌ Ошибка сохранения токена: ${saveError.message}`, 'error');
                }
                
                addLog('🎉 ВСЕ ШАГИ ВЫПОЛНЕНЫ УСПЕШНО!', 'success');
                
                // Обновляем диагностику
                runOneSignalDiagnostic();
                
            } catch (manualError) {
                addLog(`❌ Ошибка ручной инициализации: ${manualError.message}`, 'error');
                addLog(`📋 Stack: ${manualError.stack}`, 'error');
            }
        } catch (error) {
            addLog(`❌ Критическая ошибка: ${error.message}`, 'error');
            addLog(`📋 Stack: ${error.stack}`, 'error');
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

    // Диагностика всплывающих (heads-up) уведомлений
    const diagnoseHeadsUpNotifications = async () => {
        addLog('🔍 Запуск расширенной диагностики heads-up уведомлений', 'info');
        
        try {
            // 1. Проверка платформы и версии Android
            if (Platform.OS !== 'android') {
                addLog('⚠️ Heads-up уведомления доступны только на Android', 'warning');
                Alert.alert('Информация', 'Heads-up уведомления доступны только на Android устройствах');
                return;
            }
            
            addLog('✅ Платформа: Android', 'success');
            addLog(`📱 Версия Android: ${Platform.Version}`, 'info');
            addLog(`📱 Модель устройства: ${Device.modelName || 'Unknown'}`, 'info');
            addLog(`📱 Производитель: ${Device.brand || 'Unknown'}`, 'info');
            
            // Проверка версии Android (heads-up доступны с API 21+)
            const androidVersion = parseInt(Platform.Version, 10);
            if (androidVersion < 21) {
                addLog('❌ Версия Android слишком старая для heads-up уведомлений (нужен API 21+)', 'error');
            } else if (androidVersion >= 26) {
                addLog('✅ Версия Android поддерживает каналы уведомлений (API 26+)', 'success');
            } else {
                addLog('⚠️ Версия Android поддерживает heads-up, но не каналы (API 21-25)', 'warning');
            }
            
            // Проверка производителя (Samsung имеет дополнительные настройки)
            if (Device.brand?.toLowerCase().includes('samsung')) {
                addLog('📱 Обнаружено устройство Samsung', 'info');
                addLog('💡 Samsung имеет дополнительные настройки уведомлений', 'info');
                addLog('💡 Проверьте: Настройки → Уведомления → Стиль всплывающего уведомления', 'info');
            }
            
            // 2. Проверка разрешений на уведомления
            addLog('🔍 Проверка разрешений на уведомления...', 'info');
            try {
                const OneSignalModule = require('react-native-onesignal');
                const oneSignal = OneSignalModule.default || OneSignalModule.OneSignal || OneSignalModule;
                
                if (oneSignal?.Notifications?.hasPermission) {
                    const hasPermission = await oneSignal.Notifications.hasPermission();
                    addLog(`🔔 Разрешения на уведомления: ${hasPermission ? 'ЕСТЬ ✅' : 'НЕТ ❌'}`, hasPermission ? 'success' : 'error');
                    
                    if (!hasPermission) {
                        addLog('⚠️ ВАЖНО: Нет разрешений на уведомления! Heads-up не будут работать', 'error');
                        Alert.alert(
                            'Нет разрешений',
                            'Для работы heads-up уведомлений необходимо предоставить разрешения на уведомления.\n\n' +
                            'Перейдите в настройки устройства и включите уведомления для приложения.'
                        );
                    }
                } else {
                    addLog('⚠️ Не удалось проверить разрешения OneSignal', 'warning');
                }
            } catch (permError) {
                addLog(`❌ Ошибка проверки разрешений: ${permError.message}`, 'error');
            }
            
            // 3. Проверка состояния приложения
            addLog('🔍 Проверка состояния приложения...', 'info');
            const appState = AppState.currentState;
            addLog(`📱 Состояние приложения: ${appState}`, 'info');
            if (appState === 'active') {
                addLog('⚠️ Приложение в foreground - heads-up могут не показываться', 'warning');
                addLog('💡 Для тестирования heads-up сверните приложение или заблокируйте экран', 'info');
            } else if (appState === 'background') {
                addLog('✅ Приложение в background - heads-up должны показываться', 'success');
            }
            
            // 4. Проверка канала уведомлений через Expo Notifications
            addLog('🔍 Проверка канала уведомлений...', 'info');
            try {
                const channels = await Notifications.getNotificationChannelsAsync();
                addLog(`📋 Найдено каналов: ${channels?.length || 0}`, 'info');
                
                const onesignalChannel = channels?.find(ch => ch.id === 'onesignal_default_channel');
                if (onesignalChannel) {
                    addLog(`✅ Канал 'onesignal_default_channel' найден`, 'success');
                    addLog(`   - Имя: ${onesignalChannel.name}`, 'info');
                    addLog(`   - Важность: ${onesignalChannel.importance}`, 'info');
                    
                    // IMPORTANCE_HIGH = 4, IMPORTANCE_MAX = 5
                    const importance = onesignalChannel.importance;
                    if (importance >= 4) {
                        addLog(`✅ Важность канала достаточна для heads-up (${importance} >= 4)`, 'success');
                    } else {
                        addLog(`❌ Важность канала НЕДОСТАТОЧНА для heads-up (${importance} < 4)`, 'error');
                        addLog('💡 Нужна IMPORTANCE_HIGH (4) или IMPORTANCE_MAX (5)', 'warning');
                    }
                    
                    addLog(`   - Звук: ${onesignalChannel.sound ? 'включен' : 'выключен'}`, onesignalChannel.sound ? 'success' : 'warning');
                    addLog(`   - Вибрация: ${onesignalChannel.vibrationPattern ? 'включена' : 'выключена'}`, onesignalChannel.vibrationPattern ? 'success' : 'warning');
                    addLog(`   - Свет: ${onesignalChannel.lightColor ? 'включен' : 'выключен'}`, onesignalChannel.lightColor ? 'success' : 'warning');
                    addLog(`   - Видимость на заблокированном экране: ${onesignalChannel.lockscreenVisibility || 'не указано'}`, 'info');
                } else {
                    addLog(`⚠️ Канал 'onesignal_default_channel' НЕ найден`, 'warning');
                    addLog('💡 Канал должен быть создан в MainApplication.kt при запуске приложения', 'info');
                    addLog('💡 Или OneSignal создаст его автоматически при первом уведомлении с priority=10', 'info');
                    addLog('💡 ПРОБЛЕМА: Если канал не найден, OneSignal может использовать fallback канал', 'error');
                    addLog('💡 Решение: Перезапустите приложение после создания канала в MainApplication.kt', 'warning');
                }
                
                // Проверяем другие каналы OneSignal
                const oneSignalChannels = channels?.filter(ch => 
                    ch.id.includes('onesignal') || 
                    ch.id.includes('fcm') || 
                    ch.id.includes('notification')
                );
                if (oneSignalChannels && oneSignalChannels.length > 0) {
                    addLog(`📋 Найдено каналов OneSignal/FCM: ${oneSignalChannels.length}`, 'info');
                    oneSignalChannels.forEach(ch => {
                        const canHeadsUp = ch.importance >= 4;
                        addLog(`   - ${ch.id}: важность=${ch.importance} ${canHeadsUp ? '✅' : '❌'}, звук=${ch.sound ? 'да' : 'нет'}`, canHeadsUp ? 'success' : 'warning');
                        
                        // Если найден канал с высокой важностью, но не тот что нужен
                        if (canHeadsUp && ch.id !== 'onesignal_default_channel') {
                            addLog(`   ⚠️ Найден канал с высокой важностью, но ID не совпадает!`, 'warning');
                            addLog(`   💡 OneSignal может использовать этот канал вместо 'onesignal_default_channel'`, 'info');
                        }
                    });
                    
                    // Проверяем, есть ли канал с достаточной важностью
                    const highImportanceChannel = oneSignalChannels.find(ch => ch.importance >= 4);
                    if (highImportanceChannel && highImportanceChannel.id !== 'onesignal_default_channel') {
                        addLog(`💡 РЕШЕНИЕ: Используйте канал '${highImportanceChannel.id}' вместо 'onesignal_default_channel'`, 'warning');
                        addLog(`💡 Или переименуйте канал в MainApplication.kt на '${highImportanceChannel.id}'`, 'info');
                    }
                }
            } catch (channelError) {
                addLog(`❌ Ошибка проверки каналов: ${channelError.message}`, 'error');
            }
            
            // 5. Проверка настроек OneSignal
            addLog('🔍 Проверка настроек OneSignal...', 'info');
            try {
                const oneSignalStatus = OneSignalService.getStatus();
                addLog(`   - Инициализирован: ${oneSignalStatus.isInitialized ? 'да ✅' : 'нет ❌'}`, oneSignalStatus.isInitialized ? 'success' : 'error');
                addLog(`   - Подписка: ${oneSignalStatus.hasSubscription ? 'есть ✅' : 'нет ❌'}`, oneSignalStatus.hasSubscription ? 'success' : 'error');
                addLog(`   - User ID: ${oneSignalStatus.currentUserId || 'не установлен'}`, oneSignalStatus.currentUserId ? 'success' : 'warning');
                
                if (!oneSignalStatus.isInitialized) {
                    addLog('⚠️ OneSignal не инициализирован! Heads-up не будут работать', 'error');
                }
                
                // Проверяем Player ID
                try {
                    const playerId = await OneSignalService.getSubscriptionId();
                    if (playerId) {
                        addLog(`   - Player ID: ${playerId.substring(0, 20)}... ✅`, 'success');
                    } else {
                        addLog(`   - Player ID: отсутствует ❌`, 'error');
                        addLog('💡 Нужно инициализировать OneSignal для пользователя', 'warning');
                    }
                } catch (pidError) {
                    addLog(`   - Player ID: ошибка получения - ${pidError.message}`, 'error');
                }
            } catch (statusError) {
                addLog(`❌ Ошибка проверки статуса OneSignal: ${statusError.message}`, 'error');
            }
            
            // 6. Проверка блокировки уведомлений в foreground
            addLog('🔍 Проверка обработки уведомлений в foreground...', 'info');
            try {
                // Проверяем, не блокируется ли показ уведомлений в OneSignalService
                addLog('💡 Проверяем, не блокируется ли показ уведомлений в коде...', 'info');
                addLog('💡 В OneSignalService может быть preventDefault() для активного чата', 'info');
                addLog('💡 Это нормально для активного чата, но может мешать тестированию', 'info');
            } catch (fgError) {
                addLog(`⚠️ Ошибка проверки foreground обработки: ${fgError.message}`, 'warning');
            }
            
            // 7. Проверка параметров уведомлений на сервере
            addLog('🔍 Проверка параметров уведомлений на сервере...', 'info');
            addLog('   - priority должен быть = 10 (максимальный) ✅', 'info');
            addLog('   - android_channel_id НЕ указывается (правильно!) ✅', 'success');
            addLog('   - android_visibility должен быть = 1 (Public) ✅', 'info');
            addLog('💡 OneSignal автоматически создаст канал с IMPORTANCE_MAX при priority=10', 'info');
            addLog('💡 Это гарантирует heads-up уведомления без зависимости от конкретного канала', 'success');
            
            // 8. Проверка разрешений Expo Notifications
            addLog('🔍 Проверка разрешений Expo Notifications...', 'info');
            try {
                const { status } = await Notifications.getPermissionsAsync();
                addLog(`📋 Статус разрешений Expo: ${status}`, status === 'granted' ? 'success' : 'warning');
                if (status !== 'granted') {
                    addLog('⚠️ Разрешения Expo Notifications не предоставлены', 'warning');
                }
            } catch (expoPermError) {
                addLog(`⚠️ Ошибка проверки разрешений Expo: ${expoPermError.message}`, 'warning');
            }
            
            // 9. Рекомендации и решения проблем
            addLog('📋 Рекомендации для heads-up уведомлений:', 'info');
            addLog('   1. ✅ Убедитесь что уведомления включены в настройках устройства', 'info');
            addLog('   2. ✅ Проверьте что режим "Не беспокоить" выключен', 'info');
            addLog('   3. ✅ Добавьте приложение в исключения оптимизации батареи', 'info');
            addLog('   4. ✅ Перезапустите приложение после создания канала', 'info');
            addLog('   5. ✅ Проверьте что сервер отправляет уведомления с priority=10', 'info');
            addLog('   6. ✅ Для тестирования сверните приложение или заблокируйте экран', 'info');
            addLog('   7. ✅ На Samsung: проверьте стиль всплывающих уведомлений', 'info');
            
            // 10. Вывод проблем и решений
            addLog('🔍 Анализ найденных проблем:', 'info');
            // Используем уже полученные каналы из проверки выше
            const allChannelsForAnalysis = await Notifications.getNotificationChannelsAsync();
            const onesignalChannel = allChannelsForAnalysis?.find(ch => ch.id === 'onesignal_default_channel');
            const highImpChannelsForAnalysis = allChannelsForAnalysis?.filter(ch => ch.importance >= 4);
            
            if (!onesignalChannel) {
                addLog('❌ ПРОБЛЕМА #1: Канал onesignal_default_channel не найден', 'error');
                addLog('💡 РЕШЕНИЕ #1: Перезапустите приложение (канал создается при запуске)', 'warning');
                addLog('💡 РЕШЕНИЕ #2: Проверьте MainApplication.kt - канал должен создаваться в onCreate()', 'warning');
                
                if (highImpChannelsForAnalysis && highImpChannelsForAnalysis.length > 0) {
                    addLog(`💡 РЕШЕНИЕ #3: Найден канал с высокой важностью '${highImpChannelsForAnalysis[0].id}'`, 'info');
                    addLog('💡 Но сервер НЕ указывает android_channel_id - это правильно!', 'success');
                    addLog('💡 OneSignal создаст канал автоматически с максимальной важностью', 'info');
                }
            } else if (onesignalChannel.importance < 4) {
                addLog('❌ ПРОБЛЕМА #2: Канал найден, но важность недостаточна', 'error');
                addLog('💡 РЕШЕНИЕ: Измените IMPORTANCE_HIGH на IMPORTANCE_MAX в MainApplication.kt', 'warning');
            }
            
            if (appState === 'active') {
                addLog('⚠️ ПРОБЛЕМА #3: Приложение в foreground', 'warning');
                addLog('💡 РЕШЕНИЕ: Сверните приложение или заблокируйте экран для тестирования', 'info');
            }
            
            // 11. Тест heads-up уведомления
            addLog('🧪 Готов к тестированию heads-up уведомления', 'info');
            addLog('💡 Используйте кнопку "🚀 Тест Heads-Up" для отправки тестового уведомления', 'info');
            addLog('💡 Уведомление должно всплыть на верхней части экрана', 'info');
            addLog('💡 ВАЖНО: Для тестирования сверните приложение или заблокируйте экран!', 'warning');
            
            // Формируем итоговое сообщение
            let summaryMessage = 'Диагностика завершена.\n\n';
            
            // Используем уже полученные каналы из анализа выше
            if (highImpChannelsForAnalysis && highImpChannelsForAnalysis.length > 0) {
                summaryMessage += `✅ Найдено каналов с высокой важностью: ${highImpChannelsForAnalysis.length}\n`;
                summaryMessage += `💡 OneSignal автоматически создаст канал при первом уведомлении\n\n`;
            } else {
                summaryMessage += '⚠️ Каналы с высокой важностью не найдены\n';
                summaryMessage += '💡 OneSignal создаст канал автоматически при первом уведомлении\n\n';
            }
            
            if (appState === 'active') {
                summaryMessage += '⚠️ ВАЖНО: Приложение в foreground - сверните для тестирования heads-up!\n\n';
            }
            
            summaryMessage += '✅ Сервер НЕ указывает android_channel_id - это правильно!\n';
            summaryMessage += '✅ OneSignal создаст канал автоматически с максимальной важностью.\n\n';
            summaryMessage += 'Проверьте логи для детальной информации.';
            
            Alert.alert(
                'Диагностика завершена',
                summaryMessage,
                [
                    { text: 'OK' },
                    ...(Device.brand?.toLowerCase().includes('samsung') ? [{
                        text: 'Настройки Samsung',
                        onPress: () => {
                            addLog('💡 Открываем настройки уведомлений Samsung...', 'info');
                            // Попытка открыть настройки уведомлений
                            Linking.openSettings().catch(() => {
                                addLog('⚠️ Не удалось открыть настройки', 'warning');
                            });
                        }
                    }] : [])
                ]
            );
            
        } catch (error) {
            addLog(`❌ Критическая ошибка диагностики heads-up: ${error.message}`, 'error');
            addLog(`📋 Stack: ${error.stack}`, 'error');
            Alert.alert('Ошибка', `Ошибка диагностики: ${error.message}`);
        }
    };

    // Тест heads-up уведомления с максимальным приоритетом
    const testHeadsUpNotification = async () => {
        addLog('🚀 Тест heads-up уведомления', 'info');
        
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

            // Получаем Player ID
            addLog('🔍 Получаем Player ID...', 'info');
            const playerId = await OneSignalService.getSubscriptionId();
            
            if (!playerId) {
                addLog('❌ Нет OneSignal Player ID', 'error');
                Alert.alert('Ошибка', 'Сначала получите OneSignal Player ID');
                return;
            }
            
            addLog(`✅ Player ID получен: ${playerId.substring(0, 20)}...`, 'success');
            
            // Проверяем состояние приложения перед отправкой
            const appStateBefore = AppState.currentState;
            if (appStateBefore === 'active') {
                addLog('⏱️ Приложение в foreground - добавляем задержку 2 секунды для тестирования', 'info');
                addLog('💡 У вас есть 2 секунды чтобы СВЕРНУТЬ приложение или ЗАБЛОКИРОВАТЬ экран!', 'warning');
                addLog('⏳ Ожидание 2 секунды...', 'info');
                await new Promise(resolve => setTimeout(resolve, 2000));
                addLog('✅ Задержка завершена', 'success');
                
                // Проверяем состояние после задержки
                const appStateAfter = AppState.currentState;
                if (appStateAfter === 'active') {
                    addLog('⚠️ Приложение все еще в foreground!', 'warning');
                    addLog('💡 СВЕРНИТЕ приложение или ЗАБЛОКИРУЙТЕ экран для тестирования heads-up!', 'error');
                } else {
                    addLog('✅ Приложение свернуто или экран заблокирован - отлично для тестирования!', 'success');
                }
            }
            
            addLog('📤 Отправляем тестовое heads-up уведомление...', 'info');
            addLog('   - priority = 10 (максимальный) ✅', 'info');
            addLog('   - android_channel_id НЕ указывается (OneSignal создаст автоматически) ✅', 'success');
            addLog('   - android_visibility = 1 (Public) ✅', 'info');
            addLog('💡 OneSignal автоматически создаст канал с IMPORTANCE_MAX', 'info');
            
            const response = await fetch('http://212.67.11.134:5000/api/push-tokens/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    token: playerId,
                    title: '🔔 Heads-Up Test',
                    message: `Тест всплывающего уведомления от ${new Date().toLocaleTimeString()}`,
                    data: {
                        type: 'HEADS_UP_TEST',
                        timestamp: Date.now(),
                        source: 'diagnostic_screen',
                        priority: 10,
                        channelId: 'onesignal_default_channel'
                    }
                })
            });
            
            const result = await response.json();
            addLog(`📋 Ответ сервера: ${JSON.stringify(result)}`, 'info');
            
            if (response.ok && result.success) {
                addLog('✅ Heads-up уведомление отправлено успешно', 'success');
                addLog('💡 OneSignal создаст канал автоматически при первом уведомлении', 'info');
                addLog('💡 Уведомление должно всплыть на верхней части экрана', 'info');
                
                // Проверяем состояние приложения
                const appState = AppState.currentState;
                if (appState === 'active') {
                    addLog('⚠️ ВАЖНО: Приложение в foreground!', 'warning');
                    addLog('💡 Для тестирования heads-up СВЕРНИТЕ приложение или заблокируйте экран!', 'error');
                }
                
                addLog('💡 Если уведомление не всплыло, проверьте:', 'warning');
                addLog('   1. Разрешения на уведомления включены ✅', 'info');
                addLog('   2. Режим "Не беспокоить" выключен', 'warning');
                addLog('   3. Приложение СВЕРНУТО или экран ЗАБЛОКИРОВАН (для тестирования)', 'error');
                addLog('   4. Приложение не в режиме оптимизации батареи', 'warning');
                addLog('   5. На Samsung: проверьте стиль всплывающих уведомлений', 'warning');
                
                // Используем уже полученное состояние приложения
                const currentAppState = AppState.currentState;
                let alertMessage = 'Heads-up уведомление отправлено!\n\n';
                
                if (currentAppState === 'active') {
                    alertMessage += '⚠️ ВАЖНО: Приложение в foreground!\n';
                    alertMessage += '💡 Для тестирования heads-up СВЕРНИТЕ приложение или заблокируйте экран!\n\n';
                }
                
                alertMessage += '✅ OneSignal создаст канал автоматически с максимальной важностью.\n\n';
                alertMessage += 'Уведомление должно всплыть на верхней части экрана.\n\n';
                alertMessage += 'Если не всплыло:\n';
                alertMessage += '1. Сверните приложение\n';
                alertMessage += '2. Проверьте настройки устройства\n';
                alertMessage += '3. Проверьте логи';
                
                Alert.alert('Успех', alertMessage);
            } else {
                addLog(`❌ Ошибка отправки: ${result.message || 'Неизвестная ошибка'}`, 'error');
                Alert.alert('Ошибка', `Ошибка: ${result.message || 'Неизвестная ошибка'}`);
            }
        } catch (error) {
            addLog(`❌ Ошибка отправки heads-up уведомления: ${error.message}`, 'error');
            addLog(`📋 Stack: ${error.stack}`, 'error');
            Alert.alert('Ошибка', error.message);
        }
    };

    // Тест локального push-уведомления
    const testLocalPushNotification = async () => {
        addLog('📱 Тест локального push-уведомления', 'info');
        
        try {
            // Настраиваем обработчик для показа уведомлений в foreground (важно для Expo Go)
            addLog('⚙️ Настройка обработчика уведомлений для foreground...', 'info');
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,  // Показывать уведомление даже когда приложение активно
                    shouldPlaySound: true,  // Воспроизводить звук
                    shouldSetBadge: true,   // Устанавливать badge
                }),
            });
            addLog('✅ Обработчик уведомлений настроен для foreground', 'success');
            
            // Проверяем разрешения
            addLog('🔍 Проверка разрешений...', 'info');
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            
            if (existingStatus !== 'granted') {
                addLog('⚠️ Разрешения не предоставлены, запрашиваем...', 'warning');
                const { status } = await Notifications.requestPermissionsAsync({
                    ios: {
                        allowAlert: true,
                        allowBadge: true,
                        allowSound: true,
                        allowAnnouncements: false,
                    },
                });
                finalStatus = status;
            }
            
            if (finalStatus !== 'granted') {
                addLog('❌ Разрешения на уведомления не предоставлены', 'error');
                Alert.alert('Ошибка', 'Необходимо предоставить разрешения на уведомления в настройках устройства');
                return;
            }
            
            addLog('✅ Разрешения получены', 'success');
            
            // Для Android настраиваем канал уведомлений (если нужно)
            if (Platform.OS === 'android') {
                addLog('📱 Настройка канала уведомлений для Android...', 'info');
                try {
                    await Notifications.setNotificationChannelAsync('test-channel', {
                        name: 'Test Notifications',
                        importance: Notifications.AndroidImportance.MAX,
                        vibrationPattern: [0, 250, 250, 250],
                        lightColor: '#FF231F7C',
                        sound: 'default',
                        enableVibrate: true,
                        showBadge: true,
                    });
                    addLog('✅ Канал уведомлений настроен', 'success');
                } catch (channelError) {
                    addLog(`⚠️ Ошибка настройки канала (не критично): ${channelError.message}`, 'warning');
                }
            }
            
            // Показываем локальное уведомление
            addLog('📤 Отправка локального уведомления...', 'info');
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '🧪 Тест локального уведомления',
                    body: `Тестовое уведомление от ${new Date().toLocaleTimeString()}`,
                    data: {
                        type: 'LOCAL_TEST',
                        timestamp: Date.now(),
                        source: 'diagnostic_screen'
                    },
                    sound: true,
                    ...(Platform.OS === 'android' && { channelId: 'test-channel' }),
                },
                trigger: null, // Показать немедленно
            });
            
            addLog(`✅ Локальное уведомление отправлено (ID: ${notificationId})`, 'success');
            addLog('💡 Уведомление должно появиться даже если приложение активно (Expo Go)', 'info');
            Alert.alert('Успех', 'Локальное уведомление отправлено! Проверьте получение на устройстве.\n\nУведомление должно появиться даже когда приложение активно.');
        } catch (error) {
            addLog(`❌ Ошибка отправки локального уведомления: ${error.message}`, 'error');
            addLog(`📋 Stack: ${error.stack}`, 'error');
            Alert.alert('Ошибка', `Не удалось отправить локальное уведомление: ${error.message}`);
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
                <TouchableOpacity style={[styles.button, { backgroundColor: '#FF6B35' }]} onPress={checkServicesVersion}>
                    <Text style={styles.buttonText}>📦 Версия кода</Text>
                </TouchableOpacity>

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

                <TouchableOpacity style={[styles.button, { backgroundColor: '#16A085' }]} onPress={testLocalPushNotification}>
                    <Text style={styles.buttonText}>📱 Локальный Push</Text>
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

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, { backgroundColor: '#FF6B6B' }]} onPress={diagnoseHeadsUpNotifications}>
                    <Text style={styles.buttonText}>🔍 Heads-Up</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, { backgroundColor: '#4ECDC4' }]} onPress={testHeadsUpNotification}>
                    <Text style={styles.buttonText}>🚀 Тест Heads-Up</Text>
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
    }
});

export default PushNotificationDiagnostic;