import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Clipboard } from 'react-native';
import * as Constants from 'expo-constants';
import * as Device from 'expo-device';
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
        console.log(`[${type.toUpperCase()}] ${message}`);
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